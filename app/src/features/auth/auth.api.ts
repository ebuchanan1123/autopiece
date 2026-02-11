import { apiFetch } from "@/src/lib/api";

export type AuthUser = {
  id: number;
  email: string;
  role: "client" | "seller" | "admin";
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export async function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerClient(email: string, password: string, phone?: string) {
  return apiFetch<AuthResponse>("/auth/register-client", {
    method: "POST",
    body: JSON.stringify({ email, password, phone }),
  });
}
