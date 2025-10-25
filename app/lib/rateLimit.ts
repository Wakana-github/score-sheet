import { Ratelimit, Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/* 
* This module provides server-side rate limiting and unified error handling for API routes in the app.
* Feature:
* Upstash Redis Rate Limiter (Primary) 
* In-memory Fallback (Secondary) - When Redis is unavailable, a temporary in-memory rate limiter is used.
*/


// ======= Upstash Rate-limit setup =======
const WRITE_LIMIT = parseInt(process.env.RATE_LIMIT_WRITE_LIMIT || '2', 10);
const WRITE_WINDOW = (process.env.RATE_LIMIT_WRITE_WINDOW || "10 s") as Duration;
const READ_LIMIT = parseInt(process.env.RATE_LIMIT_READ_LIMIT || '50', 10);
const READ_WINDOW = (process.env.RATE_LIMIT_READ_WINDOW || "60 s") as Duration;;

// MEMORY RATE LIMIT
const MEMORY_WRITE_LIMIT = parseInt(process.env.RATE_LIMIT_MEMORY_WRITE_LIMIT || '2', 10); 
const MEMORY_READ_LIMIT = parseInt(process.env.RATE_LIMIT_MEMORY_READ_LIMIT || '20', 10); 
const MEMORY_WINDOW_MS = parseInt(process.env.RATE_LIMIT_MEMORY_WINDOW_MS || '10000', 10);

//POST and PUT request
const writeRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(WRITE_LIMIT, WRITE_WINDOW), 
  analytics: true,
  timeout: 50000,
});

//Reading limit
const readRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(READ_LIMIT, READ_WINDOW), 
  analytics: true,
  timeout: 50000,
});


// ======= In-memory fallback =======
const memoryRateLimit: Record<string, { 
  write: { count: number; firstRequest: number },
  read: { count: number; firstRequest: number }
}> = {};


function checkMemoryRateLimit(identifier: string, operationType: 'write' | 'read'): boolean {
  const now = Date.now();
  const limit = operationType === 'write' ? MEMORY_WRITE_LIMIT : MEMORY_READ_LIMIT;
 
  if (!memoryRateLimit[identifier]) {
     memoryRateLimit[identifier] = { 
        write: { count: 0, firstRequest: now },
        read: { count: 0, firstRequest: now }
    };
  }
  const record = memoryRateLimit[identifier][operationType];

if (now - record.firstRequest > MEMORY_WINDOW_MS) {
    // when window reset
    record.count = 1;
    record.firstRequest = now;
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

// ======= Unified Rate-limit handler =======
export async function applyRateLimit(
  identifier: string, 
  operationType: 'write' | 'read' = 'write'
): Promise<boolean> {
  try {
    const limiter = operationType === 'read' ? readRatelimit : writeRatelimit;
    const { success } = await limiter.limit(identifier);
    return success;
  } catch (err) {
    console.warn(`[RateLimit] Redis unavailable. Using memory fallback.`);
    return checkMemoryRateLimit(identifier, operationType);
  }
}

// ======= Unified error handler =======
export function handleServerError(endpoint: string, error: unknown, status: number = 500){
  let logMessage = `[${endpoint}] Server Error: `;
  let clientMessage = "An unexpected error occurred.";
  
  if (error instanceof Error) {
    console.error(logMessage, error);
  } else {
     console.error(logMessage, error);
  }

    return NextResponse.json({ message: clientMessage }, { status });
}