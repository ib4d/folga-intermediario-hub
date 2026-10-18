import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditLogClient = {
  auditLog: {
    create: typeof prisma.auditLog.create;
  };
};

type AuditLogInput = {
  userId?: string | null;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Prisma.InputJsonValue | null;
};

export async function writeAuditLogWithClient(
  client: AuditLogClient,
  input: AuditLogInput
): Promise<boolean> {
  try {
    await client.auditLog.create({
      data: {
        userId: input.userId ?? null,
        organizationId: input.organizationId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details ?? Prisma.JsonNull,
      },
    });

    return true;
  } catch (error) {
    console.error("[audit] Audit log write failed", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    });
    return false;
  }
}

export async function writeAuditLog(input: AuditLogInput): Promise<boolean> {
  return writeAuditLogWithClient(prisma, input);
}

/** Block sensitive data disclosure when its audit record cannot be persisted. */
export async function writeAuditLogOrThrow(input: AuditLogInput): Promise<void> {
  if (!(await writeAuditLog(input))) {
    throw new Error("No se pudo registrar la operación en auditoría.");
  }
}
