import Constants from "expo-constants";
import { Platform } from "react-native";
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

  // Expo tunnel hosts are not your local API, so only trust plain LAN hosts here.
  const isLanHost =
    !!host &&
    (host === "localhost" ||
      host === "127.0.0.1" ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host));

  if (isLanHost) {
    return `http://${host}:3002`;
  }

  return Platform.OS === "web"
    ? "http://localhost:3002"
    : "http://192.168.0.198:3002";
};

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? getBaseUrl();

export type ApiErrorCode =
  | "api_config_error"
  | "network_error"
  | "http_error";

type ApiErrorOptions = {
  code: ApiErrorCode;
  status?: number;
  path?: string;
  url?: string;
};

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  path?: string;
  url?: string;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.path = options.path;
    this.url = options.url;
  }
}

function isLocalApiUrl(value: string) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  } catch {
    return true;
  }
}

function validateApiUrl() {
  if (!API_URL) {
    throw new ApiError("The app is missing its API configuration.", {
      code: "api_config_error",
    });
  }

  if (!__DEV__ && (isLocalApiUrl(API_URL) || !API_URL.startsWith("https://"))) {
    throw new ApiError("The app is not configured for production yet.", {
      code: "api_config_error",
      url: API_URL,
    });
  }

  return API_URL.replace(/\/$/, "");
}

function getApiUrl(path: string) {
  const baseUrl = validateApiUrl();
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function getErrorMessage(data: unknown) {
  if (!data || typeof data !== "object" || !("message" in data)) {
    return "Request failed. Please try again.";
  }

  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) return String(message[0] ?? "Request failed.");
  if (typeof message === "string") return message;
  return "Request failed. Please try again.";
}

type RefreshResponse = {
  accessToken: string;
  refreshCookieValue?: string;
};

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  let res: Response;
  try {
    res = await fetch(getApiUrl("/auth/refresh"), {
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

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
) {
  const url = getApiUrl(path);

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
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      {
        code: "network_error",
        path,
        url,
      },
    );
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

    throw new ApiError(getErrorMessage(data), {
      code: "http_error",
      status: res.status,
      path,
      url,
    });
  }

  return data as T;
}
