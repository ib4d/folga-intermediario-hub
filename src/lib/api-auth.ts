import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ApiKeyWithOrganization = Prisma.ApiKeyGetPayload<{
  include: {
    organization: {
      select: {
        id: true;
        name: true;
        plan: true;
        isActive: true;
      };
    };
  };
}>;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 120;

const rateLimitStore = globalThis as typeof globalThis & {
  __oriApiRateLimitStore?: Map<string, RateLimitBucket>;
};

function getRateLimitStore() {
  if (!rateLimitStore.__oriApiRateLimitStore) {
    rateLimitStore.__oriApiRateLimitStore = new Map<string, RateLimitBucket>();
  }

  return rateLimitStore.__oriApiRateLimitStore;
}

function hashKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function getRawApiKey(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return req.headers.get("x-api-key")?.trim() ?? "";
}

function buildRateLimitResponse(bucket: RateLimitBucket, limit: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));

  return NextResponse.json(
    {
      error: "Rate limit excedido",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(bucket.resetAt).toISOString(),
      },
    }
  );
}

function enforceRateLimit(apiKeyId: string, pathname: string, limit = DEFAULT_RATE_LIMIT) {
  const store = getRateLimitStore();
  const now = Date.now();
  const key = `${apiKeyId}:${pathname}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  current.count += 1;

  if (current.count > limit) {
    return buildRateLimitResponse(current, limit);
  }

  return null;
}

export async function authenticateApiKey(
  req: NextRequest,
  options: { rateLimit?: number } = {}
): Promise<{ apiKey: ApiKeyWithOrganization | null; response: NextResponse | null }> {
  const rawKey = getRawApiKey(req);

  if (!rawKey) {
    return {
      apiKey: null,
      response: NextResponse.json({ error: "API key requerida" }, { status: 401 }),
    };
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash: hashKey(rawKey),
      revokedAt: null,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          plan: true,
          isActive: true,
        },
      },
    },
  });

  if (!apiKey) {
    return {
      apiKey: null,
      response: NextResponse.json({ error: "API key invalida o revocada" }, { status: 401 }),
    };
  }

  if (!apiKey.organization.isActive) {
    return {
      apiKey: null,
      response: NextResponse.json({ error: "Organizacion inactiva" }, { status: 403 }),
    };
  }

  const rateLimitExceeded = enforceRateLimit(apiKey.id, req.nextUrl.pathname, options.rateLimit);
  if (rateLimitExceeded) {
    return { apiKey: null, response: rateLimitExceeded };
  }

  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { apiKey, response: null };
}
