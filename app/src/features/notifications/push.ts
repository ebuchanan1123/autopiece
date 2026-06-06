import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { registerPushToken, unregisterPushToken } from "@/src/features/notifications/push.api";

const PUSH_TOKEN_KEY = "expo_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId() {
  return (
    process.env.EXPO_PUBLIC_EXPO_PROJECT_ID ||
    (Constants.expoConfig as any)?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    null
  );
}

export async function getStoredPushToken() {
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

async function setStoredPushToken(token: string) {
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

export async function clearStoredPushToken() {
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

export async function syncPushTokenWithServer() {
  if (Platform.OS === "web" || !Device.isDevice) return null;

  const projectId = getProjectId();
  if (!projectId) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;
  if (finalStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }
  if (finalStatus !== "granted") return null;

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResponse.data;
  if (!token) return null;

  await registerPushToken({
    token,
    platform:
      Platform.OS === "ios"
        ? "ios"
        : Platform.OS === "android"
          ? "android"
          : "unknown",
  });
  await setStoredPushToken(token);
  return token;
}

export async function unregisterStoredPushTokenFromServer() {
  const token = await getStoredPushToken();
  if (!token) return;

  try {
    await unregisterPushToken(token);
  } catch {
    // Best effort during logout.
  } finally {
    await clearStoredPushToken();
  }
}
