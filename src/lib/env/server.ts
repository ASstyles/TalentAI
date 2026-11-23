import { z } from 'zod';

/**
 * Production Environment Variable Validation Schema
 * Validates critical service credentials while maintaining graceful degradation
 * for optional integrations and development environments.
 */
export const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  // Gemini AI Service
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL_PRIMARY: z.string().default('gemini-2.5-flash'),
  GEMINI_MODEL_REASONING: z.string().default('gemini-2.5-pro'),
  GEMINI_MODEL_FAST: z.string().default('gemini-2.0-flash'),
  GEMINI_MODEL_FALLBACK: z.string().default('gemini-1.5-flash'),

  // Firebase Admin SDK
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),

  // Redis Distributed Rate Limiter
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // Secure Code Execution Sandbox
  SANDBOX_EXECUTOR_URL: z.string().url().optional(),
  CODE_EXECUTION_TIMEOUT_MS: z.coerce.number().default(3000),
  CODE_EXECUTION_MEMORY_LIMIT_MB: z.coerce.number().default(128),
  ALLOW_LOCAL_SUBPROCESS_SANDBOX: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export interface ServerEnvDiagnostic {
  isValid: boolean;
  environment: 'development' | 'production' | 'test';
  geminiConfigured: boolean;
  firebaseAdminConfigured: boolean;
  redisConfigured: boolean;
  sandboxConfigured: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validates process.env against ServerEnvSchema without leaking sensitive credentials.
 */
export function validateServerEnvironment(): ServerEnvDiagnostic {
  const result = ServerEnvSchema.safeParse(process.env);
  const warnings: string[] = [];
  const errors: string[] = [];

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const firebaseAdminConfigured = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
  const redisConfigured = Boolean(process.env.REDIS_URL);
  const sandboxConfigured = Boolean(process.env.SANDBOX_EXECUTOR_URL);

  const nodeEnv = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';

  if (!geminiConfigured) {
    warnings.push('GEMINI_API_KEY is not configured; AI assessment routes will return truthful 503 status.');
  }

  if (!firebaseAdminConfigured) {
    warnings.push('FIREBASE Admin credentials are not fully configured; fallback mock storage/database active.');
  }

  if (!redisConfigured && nodeEnv === 'production') {
    warnings.push('REDIS_URL is not configured in production; rate limiter operating in isolated in-memory mode.');
  }

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
  }

  return {
    isValid: result.success,
    environment: nodeEnv,
    geminiConfigured,
    firebaseAdminConfigured,
    redisConfigured,
    sandboxConfigured,
    warnings,
    errors,
  };
}
