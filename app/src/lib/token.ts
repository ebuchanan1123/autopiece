import * as SecureStore from "expo-secure-store";

const KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export async function setToken(token: string) {
  await SecureStore.setItemAsync(KEY, token);
}

export async function setRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
