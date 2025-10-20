import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* 
* This module provides server-side rate limiting and unified error handling for API routes in the app.
* Feature:
* Upstash Redis Rate Limiter (Primary) 
* In-memory Fallback (Secondary) - When Redis is unavailable, a temporary in-memory rate limiter is used.
*/




// ======= Upstash Rate-limit setup =======
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(2, "10 s"), //2 requests per 10 seconds per user.
  analytics: true,
  timeout: 10000,
});

// ======= In-memory fallback =======
const memoryRateLimit: Record<string, { count: number; firstRequest: number }> = {};
const MEMORY_LIMIT = 2;
const MEMORY_WINDOW_MS = 10_000; // 10秒

function checkMemoryRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = memoryRateLimit[identifier];

  if (!record) {
    memoryRateLimit[identifier] = { count: 1, firstRequest: now };
    return true;
  }

  if (now - record.firstRequest > MEMORY_WINDOW_MS) {
    memoryRateLimit[identifier] = { count: 1, firstRequest: now };
    return true;
  }

  if (record.count >= MEMORY_LIMIT) {
    return false;
  }

  record.count += 1;
  return true;
}

// ======= Unified Rate-limit handler =======
export async function applyRateLimit(identifier: string): Promise<boolean> {
  try {
    const { success } = await ratelimit.limit(identifier);
    return success;
  } catch (err) {
    console.warn(`[RateLimit] Redis unavailable. Using memory fallback.`);
    return checkMemoryRateLimit(identifier);
  }
}

// ======= Unified error handler =======
export function handleServerError(endpoint: string, error: unknown): void {
  let logMessage = `[${endpoint}] Server Error: `;
  if (error instanceof Error) {
    logMessage += error.message;
    console.error(logMessage, { stack: error.stack });
  } else {
    logMessage += "Unknown/Non-Error object caught.";
    console.error(logMessage, error);
  }
}