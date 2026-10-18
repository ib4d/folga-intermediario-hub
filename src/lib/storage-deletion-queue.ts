import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getStorageProvider,
  getStorageProviderConfigurationFingerprint,
  resolveStoredObjectPathsForUrls,
} from "@/lib/providers/storage";

const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const LOCK_RENEW_INTERVAL_MS = 60 * 1000;
const FIRST_RETRY_MS = 60 * 1000;
const MAX_RETRY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 25;

export type StorageCleanupStatus = "complete" | "pending";

export async function enqueueStoredObjectDeletion(
  tx: Prisma.TransactionClient,
  organizationId: string,
  publicUrls: string[]
): Promise<string | null> {
  const objectPaths = resolveStoredObjectPathsForUrls(publicUrls);
  if (objectPaths.length === 0) return null;

  const job = await tx.storageDeletionJob.create({
    data: {
      organizationId,
      objectPaths,
      storageConfigFingerprint: getStorageProviderConfigurationFingerprint(),
    },
    select: { id: true },
  });

  return job.id;
}

function parseObjectPaths(value: Prisma.JsonValue): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((path) => typeof path !== "string" || path.trim().length === 0)
  ) {
    throw new Error("INVALID_OBJECT_PATHS");
  }

  return [...new Set(value as string[])];
}

async function claimStorageDeletionJob(jobId: string) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.storageDeletionJob.updateMany({
      where: {
        id: jobId,
        nextAttemptAt: { lte: now },
        OR: [{ lockedAt: null }, { lockedAt: { lte: staleBefore } }],
      },
      data: {
        lockedAt: now,
        attempts: { increment: 1 },
      },
    });

    if (updated.count !== 1) return null;

    const job = await tx.storageDeletionJob.findUnique({ where: { id: jobId } });
    return job ? { job, lockAt: now } : null;
  });
}

function startStorageDeletionLeaseHeartbeat(jobId: string, initialLockAt: Date) {
  let lockAt = initialLockAt;
  let stopped = false;
  let leaseLost = false;
  let renewalInFlight: Promise<void> | null = null;

  const timer = setInterval(() => {
    if (stopped || leaseLost || renewalInFlight) return;

    const expectedLockAt = lockAt;
    const renewedAt = new Date();
    renewalInFlight = prisma.storageDeletionJob.updateMany({
      where: { id: jobId, lockedAt: expectedLockAt },
      data: { lockedAt: renewedAt },
    }).then(({ count }) => {
      if (count === 1) {
        lockAt = renewedAt;
        return;
      }

      leaseLost = true;
      console.warn("[storage-deletion] lease renewal lost", { jobId });
    }).catch((error) => {
      leaseLost = true;
      console.error("[storage-deletion] lease renewal failed", {
        jobId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }).finally(() => {
      renewalInFlight = null;
    });
  }, LOCK_RENEW_INTERVAL_MS);

  return {
    getLockAt: () => lockAt,
    async stop() {
      stopped = true;
      clearInterval(timer);
      await renewalInFlight;
    },
  };
}

async function getStorageDeletionJobStatus(jobId: string): Promise<StorageCleanupStatus> {
  try {
    const job = await prisma.storageDeletionJob.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    return job ? "pending" : "complete";
  } catch {
    return "pending";
  }
}

export async function processStorageDeletionJob(jobId: string): Promise<StorageCleanupStatus> {
  let claim: Awaited<ReturnType<typeof claimStorageDeletionJob>>;
  try {
    claim = await claimStorageDeletionJob(jobId);
  } catch (error) {
    console.error("[storage-deletion] claim failed", { jobId, errorName: error instanceof Error ? error.name : "UnknownError" });
    return "pending";
  }

  if (!claim) return getStorageDeletionJobStatus(jobId);

  const lease = startStorageDeletionLeaseHeartbeat(claim.job.id, claim.lockAt);
  let errorCode: string | null = null;
  try {
    if (claim.job.storageConfigFingerprint !== getStorageProviderConfigurationFingerprint()) {
      throw new Error("STORAGE_CONFIGURATION_CHANGED");
    }

    const paths = parseObjectPaths(claim.job.objectPaths);
    await getStorageProvider().removeObjects(paths);
    await lease.stop();

    const removed = await prisma.storageDeletionJob.deleteMany({
      where: { id: claim.job.id, lockedAt: lease.getLockAt() },
    });
    return removed.count === 1 ? "complete" : getStorageDeletionJobStatus(jobId);
  } catch (error) {
    await lease.stop();
    errorCode = error instanceof Error && [
      "STORAGE_CONFIGURATION_CHANGED",
      "INVALID_OBJECT_PATHS",
      "STORAGE_OBJECTS_STILL_EXIST",
    ].includes(error.message)
      ? error.message
      : "STORAGE_REMOVE_FAILED";
  }

  const attempts = Math.max(1, claim.job.attempts);
  const retryDelay = Math.min(FIRST_RETRY_MS * 2 ** Math.min(attempts - 1, 11), MAX_RETRY_MS);
  try {
    await prisma.storageDeletionJob.updateMany({
      where: { id: claim.job.id, lockedAt: lease.getLockAt() },
      data: {
        lockedAt: null,
        nextAttemptAt: new Date(Date.now() + retryDelay),
        lastErrorCode: errorCode,
      },
    });
  } catch (error) {
    // The claim lock expires so the scheduled worker can recover this job.
    console.error("[storage-deletion] retry scheduling failed", {
      jobId: claim.job.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }

  console.error("[storage-deletion] cleanup remains pending", { jobId: claim.job.id, errorCode });
  return "pending";
}

export async function processDueStorageDeletionJobs(limit = DEFAULT_BATCH_SIZE) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const dueJobs = await prisma.storageDeletionJob.findMany({
    where: {
      nextAttemptAt: { lte: now },
      OR: [{ lockedAt: null }, { lockedAt: { lte: staleBefore } }],
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: Math.max(1, Math.min(limit, 100)),
    select: { id: true },
  });

  let completed = 0;
  for (const { id } of dueJobs) {
    if (await processStorageDeletionJob(id) === "complete") completed += 1;
  }

  const backlog = await getStorageDeletionQueueBacklog();

  return {
    attempted: dueJobs.length,
    completed,
    ...backlog,
  };
}

export async function getStorageDeletionQueueBacklog() {
  const [pending, oldestPending] = await Promise.all([
    prisma.storageDeletionJob.count(),
    prisma.storageDeletionJob.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    pending,
    oldestPendingAt: oldestPending?.createdAt.toISOString() ?? null,
  };
}
