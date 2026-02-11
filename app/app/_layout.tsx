import { Stack } from "expo-router";
import { MenuProvider } from "react-native-popup-menu";

export default function RootLayout() {
  return (
    <MenuProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </MenuProvider>
  );
}
