import { describe, it, expect } from 'vitest';
import { validateServerEnvironment, ServerEnvSchema } from '@/lib/env/server';

describe('Server Environment & Credentials Validation (src/lib/env/server.ts)', () => {
  it('parses valid environment configurations and reports correct health diagnostics', () => {
    const diag = validateServerEnvironment();
    expect(diag).toHaveProperty('isValid');
    expect(diag).toHaveProperty('environment');
    expect(diag).toHaveProperty('geminiConfigured');
    expect(diag).toHaveProperty('firebaseAdminConfigured');
    expect(diag).toHaveProperty('redisConfigured');
    expect(diag).toHaveProperty('sandboxConfigured');
    expect(Array.isArray(diag.warnings)).toBe(true);
    expect(Array.isArray(diag.errors)).toBe(true);
  });

  it('validates server environment schema with default models', () => {
    const parsed = ServerEnvSchema.safeParse({
      NODE_ENV: 'test',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.GEMINI_MODEL_PRIMARY).toBe('gemini-2.5-flash');
      expect(parsed.data.GEMINI_MODEL_REASONING).toBe('gemini-2.5-pro');
      expect(parsed.data.GEMINI_MODEL_FAST).toBe('gemini-2.0-flash');
      expect(parsed.data.GEMINI_MODEL_FALLBACK).toBe('gemini-1.5-flash');
      expect(parsed.data.CODE_EXECUTION_TIMEOUT_MS).toBe(3000);
      expect(parsed.data.ALLOW_LOCAL_SUBPROCESS_SANDBOX).toBe(false);
    }
  });

  it('detects invalid email format in FIREBASE_CLIENT_EMAIL', () => {
    const parsed = ServerEnvSchema.safeParse({
      FIREBASE_CLIENT_EMAIL: 'invalid-not-an-email',
    });
    expect(parsed.success).toBe(false);
  });

  it('detects invalid URL format in REDIS_URL', () => {
    const parsed = ServerEnvSchema.safeParse({
      REDIS_URL: 'not-a-valid-url',
    });
    expect(parsed.success).toBe(false);
  });
});
