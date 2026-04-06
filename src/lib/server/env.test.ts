import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// We test the schema directly rather than the module (which has side effects: process.exit).
// This mirrors the exact schema from env.ts.
const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .url('DATABASE_URL must be a valid connection URL (e.g. postgres://user:pass@host:5432/db)'),
});

describe('env validation schema', () => {
  it('rejects missing DATABASE_URL', () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors).toHaveProperty('DATABASE_URL');
    }
  });

  it('rejects empty DATABASE_URL', () => {
    const result = envSchema.safeParse({ DATABASE_URL: '' });
    expect(result.success).toBe(false);
  });

  it('accepts valid postgres connection URL', () => {
    const url = 'postgres://postgres:postgres@localhost:5432/app';
    const result = envSchema.safeParse({ DATABASE_URL: url });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe(url);
    }
  });
});
