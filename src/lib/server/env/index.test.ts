import { describe, it, expect } from 'vitest';
import { envSchema } from './schema.js';

describe('env validation schema', () => {
  it('rejects missing DATABASE_URL', () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('DATABASE_URL');
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
