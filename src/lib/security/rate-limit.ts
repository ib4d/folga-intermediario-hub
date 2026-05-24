/**
 * Robust Rate Limiter for ORI CRUIT HUB
 * Designed to protect expensive AI endpoints and prevent API abuse.
 */

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitStore>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number;      // Maximum requests per window
}

/**
 * Checks if a given identifier has exceeded its rate limit.
 * @param identifier Unique ID (e.g., IP address or User ID)
 * @param config Configuration for the specific limit
 * @returns { blocked: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig) {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetAt) {
    // Initial request or window expired
    const newRecord: RateLimitStore = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(identifier, newRecord);
    return { blocked: false, remaining: config.max - 1, resetAt: newRecord.resetAt };
  }

  if (record.count >= config.max) {
    return { blocked: true, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  store.set(identifier, record);
  return { blocked: false, remaining: config.max - record.count, resetAt: record.resetAt };
}

export function resetRateLimit(identifier: string) {
  store.delete(identifier);
}

export const LIMITS = {
  API_GLOBAL: { windowMs: 60 * 1000, max: 100 },      // 100 req/min global
  AI_DOCUMENTS: { windowMs: 60 * 60 * 1000, max: 20 }, // 20 documents/hour per user
  AUTH_ATTEMPTS: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts / 15 min
};
