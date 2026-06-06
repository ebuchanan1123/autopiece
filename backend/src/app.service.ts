import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): string {
    return "Too Good To Go DZ API";
  }

  health() {
    return {
      ok: true,
      service: "tgtg-api",
      timestamp: new Date().toISOString(),
    };
  }

  openapi() {
    return {
      openapi: "3.0.0",
      info: {
        title: "TGTG DZ API",
        version: "1.0.0",
      },
      paths: {
        "/health": { get: { summary: "Health check" } },
        "/auth/register-client": { post: { summary: "Register client" } },
        "/auth/register-seller": { post: { summary: "Register seller" } },
        "/auth/login": { post: { summary: "Login" } },
        "/auth/refresh": { post: { summary: "Rotate refresh session" } },
        "/users/me": {
          get: { summary: "Get current user profile" },
          patch: { summary: "Update current user profile" },
        },
        "/sellers/me": {
          get: { summary: "Get current seller profile" },
          patch: { summary: "Update current seller profile" },
        },
        "/listings": {
          get: { summary: "List public listings" },
          post: { summary: "Create seller listing" },
        },
        "/listings/{id}": {
          get: { summary: "Get public listing" },
          patch: { summary: "Update seller listing" },
          delete: { summary: "Remove seller listing" },
        },
        "/orders/reserve": { post: { summary: "Reserve or start checkout" } },
        "/orders/me": { get: { summary: "List current customer orders" } },
        "/orders/seller": { get: { summary: "List seller order items" } },
        "/orders/{id}": { get: { summary: "Get order details" } },
        "/payments/satim/callback": {
          post: { summary: "SATIM payment callback" },
        },
        "/admin/users": { get: { summary: "Admin: list users" } },
        "/admin/sellers": { get: { summary: "Admin: list sellers" } },
        "/admin/listings": { get: { summary: "Admin: list listings" } },
        "/admin/orders": { get: { summary: "Admin: list orders" } },
        "/admin/audit": { get: { summary: "Admin: audit log" } },
      },
    };
  }
}
