import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";
import { getMyProfile, updateMyProfile } from "@/src/features/profile/profile.api";
import {
  getProfileSettings,
  type NotificationSettings,
  type ProfileSettings,
} from "@/src/features/profile/profile.store";

type NotificationItem = {
  key: keyof NotificationSettings;
  title: string;
  description: string;
};

const PUSH_ITEMS: NotificationItem[] = [
  {
    key: "importantUpdates",
    title: "Important updates",
    description: "Receive updates related to your reserved Surprise Bags and other essential app notifications.",
  },
  {
    key: "announcements",
    title: "Announcements and promotions",
    description: "Be the first to hear about new stores joining the app, competitions, promotions in your area, and more.",
  },
  {
    key: "surpriseBagAlerts",
    title: "Surprise Bag alerts",
    description: "Receive personalized Surprise Bag recommendations and alerts.",
  },
];

export default function NotificationsScreen() {
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const local = await getProfileSettings();
      setProfile(local);
      try {
        await getMyProfile();
        const refreshed = await getProfileSettings();
        setProfile(refreshed);
      } catch {}
    })();
  }, []);

  const notifications = useMemo(() => profile?.notifications, [profile]);

  if (!profile || !notifications) {
    return (
      <>
        <ScreenHeader title="Notifications" showBack />
        <ScreenBody>
          <View style={styles.center}>
            <Text style={styles.loading}>Loading...</Text>
          </View>
        </ScreenBody>
      </>
    );
  }

  function patch(next: Partial<NotificationSettings>) {
    setProfile({
      ...profile,
      notifications: {
        ...profile.notifications,
        ...next,
      },
    });
  }

  async function save() {
    try {
      setSaving(true);
      await updateMyProfile({
        notificationSettings: profile.notifications,
      });
      const refreshed = await getProfileSettings();
      setProfile(refreshed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ScreenHeader title="Notifications" showBack />
      <ScreenBody>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.block}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>Calendar reminders</Text>
              <Switch
                value={notifications.calendarReminders}
                onValueChange={(value) => patch({ calendarReminders: value })}
                trackColor={{ false: "#BEC6C8", true: "#0C766F" }}
              />
            </View>
            <Text style={styles.rowDescription}>
              Automatically add pickup times to your calendar to receive reminders.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.block}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>Email</Text>
              <Switch
                value={notifications.emailUpdates}
                onValueChange={(value) => patch({ emailUpdates: value })}
                trackColor={{ false: "#BEC6C8", true: "#0C766F" }}
              />
            </View>
            <Text style={styles.rowDescription}>
              Be the first to learn about new stores, great tips, updates, and even a food pun or two.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.block}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>Push notifications</Text>
              <Switch
                value={notifications.pushNotifications}
                onValueChange={(value) => patch({ pushNotifications: value })}
                trackColor={{ false: "#BEC6C8", true: "#0C766F" }}
              />
            </View>
            <Text style={styles.rowDescription}>
              Get notified about availability, feature updates, promotions, and more.
            </Text>
          </View>

          {PUSH_ITEMS.map((item) => (
            <View key={item.key} style={styles.pushOption}>
              <View style={styles.pushText}>
                <Text style={styles.pushTitle}>{item.title}</Text>
                <Text style={styles.pushDescription}>{item.description}</Text>
              </View>
              <Pressable
                style={[styles.checkbox, notifications[item.key] ? styles.checkboxActive : null]}
                onPress={() => patch({ [item.key]: !notifications[item.key] })}
              >
                {notifications[item.key] ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </Pressable>
            </View>
          ))}

          <Pressable
            style={[styles.saveBtn, saving ? styles.saveBtnDisabled : null]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save changes"}</Text>
          </Pressable>
        </ScrollView>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 36, backgroundColor: "#FFFDF8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { color: "#72817F", fontWeight: "700" },
  block: { paddingVertical: 10 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowTitle: { fontSize: 18, fontWeight: "900", color: "#1F2C2B", flex: 1, paddingRight: 16 },
  rowDescription: { marginTop: 10, fontSize: 17, lineHeight: 28, color: "#2F3A38" },
  divider: { height: 1, backgroundColor: "#DCE3E0", marginVertical: 12 },
  pushOption: { flexDirection: "row", alignItems: "flex-start", gap: 18, marginTop: 18 },
  pushText: { flex: 1 },
  pushTitle: { fontSize: 18, fontWeight: "900", color: "#1F2C2B" },
  pushDescription: { marginTop: 10, fontSize: 17, lineHeight: 28, color: "#2F3A38" },
  checkbox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C9D6D2",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  checkboxActive: { backgroundColor: "#0C766F", borderColor: "#0C766F" },
  checkboxMark: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  saveBtn: {
    marginTop: 28,
    backgroundColor: "#D3DBD9",
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 18,
  },
  saveBtnDisabled: { opacity: 1 },
  saveBtnText: { color: "#81918E", fontWeight: "800", fontSize: 16 },
});
