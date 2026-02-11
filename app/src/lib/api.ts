import Constants from "expo-constants";

const getBaseUrl = () => {
  // Expo dev server host (your laptop IP on LAN)
  const host =
    (Constants.expoConfig as any)?.hostUri?.split(":")?.[0] ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri?.split(":")?.[0];

  // Physical device: use laptop IP. Simulator fallback: localhost.
  return host ? `http://${host}:3002` : "http://192.168.0.198:3002";
};

// Priority:
// 1) EXPO_PUBLIC_API_URL (if you set it in .env)
// 2) auto-detected Expo host IP (good for phones)
// 3) localhost (good for simulator)
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? getBaseUrl();

export async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const url = `${API_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch (err: any) {
    // This is the key: it tells us exactly what URL your phone tried to reach
    throw new Error(`Network error. Tried: ${url}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "message" in data
        ? (data as any).message
        : null) ?? "Request failed";

    const human =
      Array.isArray(msg) ? msg[0] : typeof msg === "string" ? msg : "Request failed";

    throw new Error(human);
  }

  return data as T;
}
