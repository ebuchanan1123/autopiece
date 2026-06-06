import { apiFetch } from "@/src/lib/api";

export async function registerPushToken(payload: {
  token: string;
  platform?: "ios" | "android" | "web" | "unknown";
}) {
  return apiFetch<{ ok: boolean }>("/users/me/push-token", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function unregisterPushToken(token: string) {
  return apiFetch<{ ok: boolean }>("/users/me/push-token/remove", {
    method: "PATCH",
    body: JSON.stringify({ token }),
  });
}
