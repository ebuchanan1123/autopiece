import * as SecureStore from "expo-secure-store";

export type AppLang = "en" | "fr" | "ar";

const KEY = "preferred_lang";
const DEFAULT_LANG: AppLang = "en";

export async function getPreferredLang(): Promise<AppLang> {
  const v = await SecureStore.getItemAsync(KEY);
  if (v === "en" || v === "fr" || v === "ar") return v;
  return DEFAULT_LANG;
}

export async function setPreferredLang(lang: AppLang): Promise<void> {
  await SecureStore.setItemAsync(KEY, lang);
}
