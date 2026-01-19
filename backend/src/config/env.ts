import { z } from 'zod';

const boolFromString = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => v === 'true' || v === 'false', 'Expected "true" or "false"')
  .transform((v) => v === 'true');

const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

// Strong secret rule: 32+ chars (recommend 64+ in prod)
const secretSchema = z
  .string()
  .min(32, 'Must be at least 32 characters')
  .refine((s) => !/\s/.test(s), 'Must not contain spaces');

const schema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    // DB (prefer DATABASE_URL; keep pieces for flexibility)
    DATABASE_URL: z.string().min(1).optional(),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().int().default(5432),
    DB_USER: z.string().default('postgres'),
    DB_PASSWORD: z.string().default('password'),
    DB_NAME: z.string().default('autoparts'),

    // JWT (unified)
    JWT_SECRET: secretSchema,
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    // Cookies
    COOKIE_SECURE: boolFromString.default(false),
    COOKIE_DOMAIN: z.string().optional().default(''),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

    // CORS
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECURE'],
          message: 'Must be true in production',
        });
      }

      if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SAMESITE'],
          message: 'SameSite=none requires COOKIE_SECURE=true',
        });
      }

      if (env.JWT_SECRET.toLowerCase().includes('dev')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET looks like a dev secret. Use a long random value in production.',
        });
      }
    }
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}
