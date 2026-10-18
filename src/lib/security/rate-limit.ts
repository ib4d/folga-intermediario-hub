import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Shared PostgreSQL rate limiter for the self-hosted Node.js deployment.
 * Client identifiers are HMACed before they are stored; raw IP addresses are
 * never written to the rate-limit table.
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

type RateLimitRecord = {
  count: number;
  resetAt: Date;
};

function hashIdentifier(identifier: string) {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error("RATE_LIMIT_HASH_SECRET_MISSING");

  return createHmac("sha256", secret)
    .update(`ori-cruit-rate-limit:v1\0${identifier}`)
    .digest("hex");
}

/**
 * Atomically increments one shared counter. The database clock controls the
 * window, and the count is capped at max + 1 so repeated blocked requests do
 * not cause an integer counter to grow without bound.
 */
export async function checkRateLimit(identifier: string, config: RateLimitConfig) {
  if (
    !Number.isSafeInteger(config.windowMs) || config.windowMs <= 0 ||
    config.windowMs > 2_147_483_647 ||
    !Number.isSafeInteger(config.max) || config.max <= 0 || config.max > 2_147_483_646
  ) {
    throw new Error("RATE_LIMIT_CONFIG_INVALID");
  }

  const key = hashIdentifier(identifier);
  const rows = await prisma.$queryRaw<RateLimitRecord[]>`
    INSERT INTO "RequestRateLimitBucket" AS existing
      ("key", "count", "resetAt", "updatedAt")
    VALUES (
      ${key},
      1,
      NOW() + (${config.windowMs}::double precision * INTERVAL '1 millisecond'),
      NOW()
    )
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN existing."resetAt" <= NOW() THEN 1
        ELSE LEAST(existing."count" + 1, ${config.max + 1})
      END,
      "resetAt" = CASE
        WHEN existing."resetAt" <= NOW()
          THEN NOW() + (${config.windowMs}::double precision * INTERVAL '1 millisecond')
        ELSE existing."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `;

  const record = rows[0];
  if (!record) throw new Error("RATE_LIMIT_RECORD_MISSING");

  const blocked = record.count > config.max;
  return {
    blocked,
    remaining: blocked ? 0 : config.max - record.count,
    resetAt: record.resetAt.getTime(),
  };
}

export async function resetRateLimit(identifier: string) {
  const key = hashIdentifier(identifier);
  await prisma.$executeRaw`DELETE FROM "RequestRateLimitBucket" WHERE "key" = ${key}`;
}

export const LIMITS = {
  API_GLOBAL: { windowMs: 60 * 1000, max: 100 },
  AI_DOCUMENTS: { windowMs: 60 * 60 * 1000, max: 20 },
  AUTH_ATTEMPTS: { windowMs: 15 * 60 * 1000, max: 5 },
};
