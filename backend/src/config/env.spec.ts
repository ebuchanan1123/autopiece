import { loadEnv } from "./env";

const originalEnv = process.env;

function applyEnv(overrides: NodeJS.ProcessEnv = {}) {
  process.env = {
    NODE_ENV: "test",
    JWT_SECRET: "a".repeat(64),
    SESSION_FINGERPRINT_SECRET: "b".repeat(64),
    ...overrides,
  };
}

describe("loadEnv", () => {
  beforeEach(() => {
    applyEnv();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  it("loads safe defaults for tests", () => {
    const env = loadEnv();

    expect(env.NODE_ENV).toBe("test");
    expect(env.PAYMENTS_PROVIDER).toBe("mock");
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it("rejects mock payments in production", () => {
    applyEnv({
      NODE_ENV: "production",
      COOKIE_SECURE: "true",
      CORS_ORIGINS: "https://app.example.com",
      PAYMENTS_PROVIDER: "mock",
    });

    expect(() => loadEnv()).toThrow("Invalid environment variables");
  });

  it("rejects localhost production CORS origins", () => {
    applyEnv({
      NODE_ENV: "production",
      COOKIE_SECURE: "true",
      CORS_ORIGINS: "http://localhost:19006",
      PAYMENTS_PROVIDER: "satim",
      SATIM_MERCHANT_ID: "merchant_123",
      SATIM_TERMINAL_ID: "terminal_123",
      SATIM_API_KEY: "satim_api_key_123",
      SATIM_CALLBACK_SECRET: "c".repeat(64),
      SATIM_RETURN_URL: "https://api.example.com/payments/satim/return",
      SATIM_CALLBACK_URL: "https://api.example.com/payments/satim/callback",
    });

    expect(() => loadEnv()).toThrow("Invalid environment variables");
  });

  it("accepts a complete SATIM production environment", () => {
    applyEnv({
      NODE_ENV: "production",
      COOKIE_SECURE: "true",
      CORS_ORIGINS: "https://app.toogooddz.com,https://admin.toogooddz.com",
      PAYMENTS_PROVIDER: "satim",
      SATIM_MODE: "production",
      SATIM_MERCHANT_ID: "merchant_123",
      SATIM_TERMINAL_ID: "terminal_123",
      SATIM_API_KEY: "satim_api_key_123",
      SATIM_CALLBACK_SECRET: "c".repeat(64),
      SATIM_RETURN_URL: "https://api.toogooddz.com/payments/satim/return",
      SATIM_CALLBACK_URL: "https://api.toogooddz.com/payments/satim/callback",
    });

    const env = loadEnv();

    expect(env.NODE_ENV).toBe("production");
    expect(env.PAYMENTS_PROVIDER).toBe("satim");
  });
});
