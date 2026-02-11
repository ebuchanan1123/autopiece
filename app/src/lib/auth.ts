import { clearToken } from "@/src/lib/token";

export async function logout() {
  await clearToken();
}
