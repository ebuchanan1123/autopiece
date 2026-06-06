import { Stack } from "expo-router";
import { MenuProvider } from "react-native-popup-menu";
import { LangProvider } from "@/src/features/i18n/lang.context";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <LangProvider>
      <SafeAreaProvider>
        <MenuProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </MenuProvider>
      </SafeAreaProvider>
    </LangProvider>
  );
}
