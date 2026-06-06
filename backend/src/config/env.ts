import { z } from "zod";

const boolFromString = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => v === "true" || v === "false", 'Expected "true" or "false"')
  .transform((v) => v === "true");

const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

// Strong secret rule: 32+ chars (recommend 64+ in prod)
const secretSchema = z
  .string()
  .min(32, "Must be at least 32 characters")
  .refine((s) => !/\s/.test(s), "Must not contain spaces");

function isLocalOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  } catch {
    return true;
  }
}

function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  return /replace|placeholder|changeme|example|test_secret/i.test(value);
}

const schema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    // DB (prefer DATABASE_URL; keep pieces for flexibility)
    DATABASE_URL: z.string().min(1).optional(),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().int().default(5432),
    DB_USER: z.string().default("postgres"),
    DB_PASSWORD: z.string().default("password"),
    DB_NAME: z.string().default("autoparts"),
    DB_SSL: boolFromString.default(false),
    DB_SSL_REJECT_UNAUTHORIZED: boolFromString.default(true),

    // JWT (unified)
    JWT_SECRET: secretSchema,
    JWT_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
    SESSION_FINGERPRINT_SECRET: secretSchema,

    // Cookies
    COOKIE_SECURE: boolFromString.default(false),
    COOKIE_DOMAIN: z.string().optional().default(""),
    COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

    // CORS
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:3000,http://localhost:3001"),

    // Payments
    PAYMENTS_PROVIDER: z.enum(["mock", "satim"]).default("mock"),
    SATIM_MODE: z.enum(["test", "production"]).default("test"),
    SATIM_MERCHANT_ID: z.string().optional(),
    SATIM_TERMINAL_ID: z.string().optional(),
    SATIM_API_KEY: z.string().optional(),
    SATIM_CALLBACK_SECRET: z.string().optional(),
    SATIM_RETURN_URL: z.string().url().optional(),
    SATIM_CALLBACK_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["COOKIE_SECURE"],
          message: "Must be true in production",
        });
      }

      if (env.COOKIE_SAMESITE === "none" && !env.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["COOKIE_SAMESITE"],
          message: "SameSite=none requires COOKIE_SECURE=true",
        });
      }

      if (env.JWT_SECRET.toLowerCase().includes("dev")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message:
            "JWT_SECRET looks like a dev secret. Use a long random value in production.",
        });
      }

      if (env.SESSION_FINGERPRINT_SECRET.toLowerCase().includes("dev")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SESSION_FINGERPRINT_SECRET"],
          message:
            "SESSION_FINGERPRINT_SECRET looks like a dev secret. Use a long random value in production.",
        });
      }

      if (!env.CORS_ORIGINS.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ORIGINS"],
          message: "Must list explicit production origins",
        });
      }

      const origins = env.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

      for (const origin of origins) {
        if (origin === "*" || isLocalOrigin(origin)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["CORS_ORIGINS"],
            message:
              "Production CORS origins must be real HTTPS app/admin domains, not localhost or wildcards.",
          });
          break;
        }
      }

      if (env.PAYMENTS_PROVIDER === "mock") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PAYMENTS_PROVIDER"],
          message: "Mock payments are not allowed in production",
        });
      }
    }

    if (env.NODE_ENV === "production" || env.PAYMENTS_PROVIDER === "satim") {
      const requiredSatimFields: Array<keyof typeof env> = [
        "SATIM_MERCHANT_ID",
        "SATIM_TERMINAL_ID",
        "SATIM_API_KEY",
        "SATIM_CALLBACK_SECRET",
        "SATIM_RETURN_URL",
        "SATIM_CALLBACK_URL",
      ];

      for (const field of requiredSatimFields) {
        if (isPlaceholder(String(env[field] ?? ""))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message:
              "Required when using SATIM payments or running in production",
          });
        }
      }
    }
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}
