import Redis from 'ioredis';

export interface RateLimitPolicy {
  windowSeconds: number;
  maxRequests: number;
  failClosed?: boolean; // If true and Redis is down, blocks request (recommended for high-risk endpoints)
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in seconds
}

export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  // Authentication & Session creation: 10 requests / minute
  auth_session: { windowSeconds: 60, maxRequests: 10, failClosed: true },
  auth_register: { windowSeconds: 60, maxRequests: 5, failClosed: true },
  recruiter_access_request: { windowSeconds: 300, maxRequests: 5, failClosed: true },

  // AI & Inference: 15 requests / minute
  resume_parse: { windowSeconds: 60, maxRequests: 15, failClosed: false },
  interview_evaluate: { windowSeconds: 60, maxRequests: 20, failClosed: false },
  matching_recommend: { windowSeconds: 60, maxRequests: 20, failClosed: false },

  // Code Execution Sandbox: 10 requests / minute
  sandbox_execute: { windowSeconds: 60, maxRequests: 10, failClosed: true },

  // Default API policy
  default: { windowSeconds: 60, maxRequests: 60, failClosed: false },
};

class DistributedRateLimiter {
  private redis: Redis | null = null;
  private inMemoryFallback: Map<string, { count: number; resetTime: number }> = new Map();
  private redisAvailable = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && process.env.NODE_ENV !== 'test') {
      try {
        this.redis = new Redis(redisUrl, {
          password: process.env.REDIS_PASSWORD || undefined,
          connectTimeout: 2000,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
        });

        this.redis.on('connect', () => {
          this.redisAvailable = true;
        });

        this.redis.on('error', (err) => {
          console.warn('[DistributedRateLimiter] Redis connection warning:', err.message);
          this.redisAvailable = false;
        });
      } catch (err) {
        console.warn('[DistributedRateLimiter] Failed to initialize Redis client:', err);
        this.redisAvailable = false;
      }
    }
  }

  /**
   * Evaluates rate limiting for an identifier (e.g. user UID or IP) against a named policy.
   * Uses an atomic sliding window counter with TTL in Redis.
   */
  public async checkRateLimit(
    policyName: string,
    identifier: string
  ): Promise<RateLimitResult> {
    const policy = RATE_LIMIT_POLICIES[policyName] || RATE_LIMIT_POLICIES.default;
    const now = Math.floor(Date.now() / 1000);
    const key = `rate_limit:${policyName}:${identifier}`;

    // Path A: Redis is configured and connected
    if (this.redis && this.redisAvailable) {
      try {
        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);

        const results = await pipeline.exec();
        if (results && results[0] && results[1]) {
          const count = results[0][1] as number;
          let ttl = results[1][1] as number;

          // If key is fresh (no TTL), set expiration
          if (ttl < 0) {
            await this.redis.expire(key, policy.windowSeconds);
            ttl = policy.windowSeconds;
          }

          const resetTime = now + ttl;
          const allowed = count <= policy.maxRequests;
          const remaining = Math.max(0, policy.maxRequests - count);

          return {
            allowed,
            limit: policy.maxRequests,
            remaining,
            resetTime,
          };
        }
      } catch (redisErr) {
        console.warn('[DistributedRateLimiter] Redis execution error, evaluating fail policy:', redisErr);
        if (policy.failClosed) {
          return {
            allowed: false,
            limit: policy.maxRequests,
            remaining: 0,
            resetTime: now + policy.windowSeconds,
          };
        }
      }
    }

    // Fail-Closed Enforcement: If the policy explicitly requires fail-closed behavior
    // and Redis is either configured but currently unreachable, or running in production without Redis
    if (
      policy.failClosed &&
      !this.redisAvailable &&
      (this.redis !== null || process.env.NODE_ENV === 'production')
    ) {
      return {
        allowed: false,
        limit: policy.maxRequests,
        remaining: 0,
        resetTime: now + policy.windowSeconds,
      };
    }

    // Path B: In-Memory Fallback (Local Development & Test Environments)
    const entry = this.inMemoryFallback.get(key);
    if (!entry || now > entry.resetTime) {
      this.inMemoryFallback.set(key, { count: 1, resetTime: now + policy.windowSeconds });
      return {
        allowed: true,
        limit: policy.maxRequests,
        remaining: policy.maxRequests - 1,
        resetTime: now + policy.windowSeconds,
      };
    }

    if (entry.count >= policy.maxRequests) {
      return {
        allowed: false,
        limit: policy.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count++;
    return {
      allowed: true,
      limit: policy.maxRequests,
      remaining: policy.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  public async ping(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      const res = await this.redis.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}

export const rateLimiter = new DistributedRateLimiter();
