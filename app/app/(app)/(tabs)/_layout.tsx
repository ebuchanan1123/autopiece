import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLang } from "@/src/features/i18n/lang.context";

export default function TabsLayout() {
  const { t, lang } = useLang();

  return (
    <Tabs
      key={lang} // force remount so labels don't snap back
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#116B62",
        tabBarInactiveTintColor: "#8C9694",
        tabBarStyle: {
          height: 88,
          paddingTop: 10,
          paddingBottom: 14,
          backgroundColor: "#FFFCF6",
          borderTopColor: "#D9E3DF",
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t("tabs.discover"),
          tabBarLabel: t("tabs.discover"),
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: t("tabs.browse"),
          tabBarLabel: t("tabs.browse"),
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          title: t("tabs.favourites"),
          tabBarLabel: t("tabs.favourites"),
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarLabel: t("tabs.profile"),
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size + 3}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
