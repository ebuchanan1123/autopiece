import { Stack } from "expo-router";
import { PushNotificationsBootstrap } from "@/src/features/notifications/push-bootstrap";

export default function AppLayout() {
  return (
    <>
      <PushNotificationsBootstrap />
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
        }}
      >
        {/* Tabs live here */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* These are stack pages (NOT tabs) */}
        <Stack.Screen name="discover-section" options={{ headerShown: false }} />
        <Stack.Screen name="seller-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="seller-settings" options={{ headerShown: false }} />
        <Stack.Screen name="seller-listings" options={{ headerShown: false }} />
        <Stack.Screen name="seller-listing-new" options={{ headerShown: false }} />
        <Stack.Screen name="seller-listing-edit/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ title: "Details", headerShown: false }} />
        <Stack.Screen name="checkout/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="order-confirmed/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ title: "My orders" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Order details" }} />
        <Stack.Screen name="account-details" options={{ headerShown: false }} />
        <Stack.Screen name="payment-cards" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="preferences" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
