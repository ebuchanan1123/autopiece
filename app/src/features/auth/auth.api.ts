import { apiFetch } from "@/src/lib/api";
import { setRefreshToken, setToken } from "@/src/lib/token";
import { syncProfileFromAuth } from "@/src/features/profile/profile.store";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: "client" | "seller" | "admin";
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshCookieValue?: string;
};

export async function login(email: string, password: string) {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  await setToken(data.accessToken);
  if (data.refreshCookieValue) {
    await setRefreshToken(data.refreshCookieValue);
  }
  await syncProfileFromAuth(data.user);
  return data;
}

export async function registerClient(username: string, email: string, password: string, phone?: string) {
  const data = await apiFetch<AuthResponse>("/auth/register-client", {
    method: "POST",
    body: JSON.stringify({ username, email, password, phone }),
  });

  // Optional: auto-login after registration (only if your endpoint returns accessToken)
  if (data?.accessToken) {
    await setToken(data.accessToken);
  }
  if (data?.refreshCookieValue) {
    await setRefreshToken(data.refreshCookieValue);
  }
  await syncProfileFromAuth(data.user);

  return data;
}
