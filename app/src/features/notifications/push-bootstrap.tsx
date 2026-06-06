import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { syncPushTokenWithServer } from "@/src/features/notifications/push";

export function PushNotificationsBootstrap() {
  useEffect(() => {
    syncPushTokenWithServer().catch(() => {});

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const pathname = typeof data?.pathname === "string" ? data.pathname : null;
      const id = typeof data?.id === "string" ? data.id : null;
      if (!pathname) return;

      if (id) {
        router.push({ pathname: pathname as any, params: { id } });
      } else {
        router.push(pathname as any);
      }
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  return null;
}
