import Constants from "expo-constants";
import {
  clearToken,
  getAccessToken,
  getRefreshToken,
  setRefreshToken,
  setToken,
} from "@/src/lib/token";

const getBaseUrl = () => {
  const host =
    (Constants.expoConfig as any)?.hostUri?.split(":")?.[0] ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri?.split(":")?.[0];

  return host ? `http://${host}:3002` : "http://192.168.0.198:3002";
};

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? getBaseUrl();

type RefreshResponse = {
  accessToken: string;
  refreshCookieValue?: string;
};

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Cookie: `refresh_token=${refreshToken}`,
      },
    });
  } catch {
    return null;
  }

  if (!res.ok) {
    await clearToken();
    return null;
  }

  const data = (await res.json().catch(() => null)) as RefreshResponse | null;
  if (!data?.accessToken) {
    await clearToken();
    return null;
  }

  await setToken(data.accessToken);
  if (data.refreshCookieValue) {
    await setRefreshToken(data.refreshCookieValue);
  }

  return data.accessToken;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true) {
  const url = `${API_URL}${path}`;

  const token = await getAccessToken();

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init.headers ?? {}),
        },
        });

  } catch {
    throw new Error(`Network error. Tried: ${url}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    if (res.status === 401 && retry && path !== "/auth/refresh") {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        return apiFetch<T>(path, init, false);
      }
    }

    const msg =
      (data && typeof data === "object" && "message" in data
        ? (data as any).message
        : null) ?? "Request failed";

    const human = Array.isArray(msg) ? msg[0] : typeof msg === "string" ? msg : "Request failed";
    throw new Error(human);
  }

  return data as T;
}
