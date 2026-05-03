/**
 * Simple in-memory tracker for login attempts.
 * In a real production environment with multiple instances, use Redis.
 */

interface Attempt {
  count: number;
  lastAttempt: number;
}

const attempts = new Map<string, Attempt>();

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export function checkBruteForce(identifier: string): { blocked: boolean; remainingMs: number } {
  const attempt = attempts.get(identifier);

  if (!attempt) return { blocked: false, remainingMs: 0 };

  const now = Date.now();
  const timeSinceLast = now - attempt.lastAttempt;

  if (attempt.count >= MAX_ATTEMPTS && timeSinceLast < COOLDOWN_MS) {
    return { blocked: true, remainingMs: COOLDOWN_MS - timeSinceLast };
  }

  // Reset if cooldown has passed
  if (timeSinceLast >= COOLDOWN_MS) {
    attempts.delete(identifier);
    return { blocked: false, remainingMs: 0 };
  }

  return { blocked: false, remainingMs: 0 };
}

export function registerFailedAttempt(identifier: string) {
  const attempt = attempts.get(identifier) || { count: 0, lastAttempt: 0 };
  attempt.count += 1;
  attempt.lastAttempt = Date.now();
  attempts.set(identifier, attempt);
}

export function resetAttempts(identifier: string) {
  attempts.delete(identifier);
}
