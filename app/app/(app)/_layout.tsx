import { Tabs } from "expo-router";

export default function AppTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="browse" options={{ title: "Browse" }} />
      <Tabs.Screen name="favourites" options={{ title: "Favourites" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />



      {/* Hidden routes (accessible via router.push) */}
      <Tabs.Screen name="account-details" options={{ href: null, title: "Account details" }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: "Notifications" }} />
      <Tabs.Screen name="help" options={{ href: null, title: "Help" }} />
      <Tabs.Screen name="legal" options={{ href: null, title: "Legal" }} />
      <Tabs.Screen name="hidden-stores" options={{ href: null, title: "Hidden stores" }} />
      <Tabs.Screen name="invite-friends" options={{ href: null, title: "Invite friends" }} />
      <Tabs.Screen name="recommend-store" options={{ href: null, title: "Recommend a store" }} />
    </Tabs>
  );
}
