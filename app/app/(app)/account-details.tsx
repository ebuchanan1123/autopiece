import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";
import { getMyProfile, updateMyProfile } from "@/src/features/profile/profile.api";
import {
  getProfileSettings,
  type ProfileSettings,
} from "@/src/features/profile/profile.store";

const GENDERS = ["Male", "Female", "Prefer not to say"];
const DIETS = ["I eat everything", "Vegetarian", "Vegan", "Halal only"];
const PICKUP_TIMES = ["Morning", "Afternoon", "Evening"];

export default function AccountDetailsScreen() {
  const [form, setForm] = useState<ProfileSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const local = await getProfileSettings();
      setForm(local);
      try {
        await getMyProfile();
        const refreshed = await getProfileSettings();
        setForm(refreshed);
      } catch {}
    })();
  }, []);

  if (!form) {
    return (
      <>
        <ScreenHeader title="Account details" showBack />
        <ScreenBody>
          <View style={styles.center}>
            <Text style={styles.loading}>Loading...</Text>
          </View>
        </ScreenBody>
      </>
    );
  }

  async function save() {
    if (!form) return;
    const current = form;
    setSaving(true);
    try {
      await updateMyProfile({
        email: current.email,
        phone: current.phone,
        country: current.country,
        gender: current.gender,
        dietaryPreferences: current.dietaryPreferences,
        birthday: current.birthday,
        preferredPickupTimes: current.preferredPickupTimes,
      });
      const refreshed = await getProfileSettings();
      setForm(refreshed);
      Alert.alert("Saved", "Your account details were updated.");
    } catch (e: any) {
      Alert.alert("Could not save", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function togglePickupTime(value: string) {
    if (!form) return;
    const current = form;
    const exists = current.preferredPickupTimes.includes(value);
    setForm({
      ...current,
      preferredPickupTimes: exists
        ? current.preferredPickupTimes.filter((item) => item !== value)
        : [...current.preferredPickupTimes, value],
    });
  }

  return (
    <>
      <ScreenHeader title="Account details" showBack />
      <ScreenBody>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Personal info</Text>

          <View style={styles.lockedRow}>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.lockedValue}>{form.username || "Required at sign up"}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.rowLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(email) => setForm({ ...form, email })}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#6F7D7B"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.rowLabel}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(phone) => setForm({ ...form, phone })}
              keyboardType="phone-pad"
              placeholder="+213 ..."
              placeholderTextColor="#6F7D7B"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.rowLabel}>Country</Text>
            <TextInput
              style={styles.input}
              value={form.country}
              onChangeText={(country) => setForm({ ...form, country })}
              placeholder="Algeria"
              placeholderTextColor="#6F7D7B"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.rowLabel}>Gender</Text>
            <View style={styles.chipsWrap}>
              {GENDERS.map((gender) => {
                const active = form.gender === gender;
                return (
                  <Pressable
                    key={gender}
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                    onPress={() => setForm({ ...form, gender })}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                      {gender}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.rowLabel}>Dietary preferences</Text>
            <View style={styles.chipsWrap}>
              {DIETS.map((diet) => {
                const active = form.dietaryPreferences === diet;
                return (
                  <Pressable
                    key={diet}
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                    onPress={() => setForm({ ...form, dietaryPreferences: diet })}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                      {diet}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.rowLabel}>Birthday</Text>
            <TextInput
              style={styles.input}
              value={form.birthday}
              onChangeText={(birthday) => setForm({ ...form, birthday })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6F7D7B"
            />
          </View>

          <Text style={styles.sectionTitle}>Preferred pickup times</Text>
          <View style={styles.card}>
            <View style={styles.chipsWrap}>
              {PICKUP_TIMES.map((time) => {
                const active = form.preferredPickupTimes.includes(time);
                return (
                  <Pressable
                    key={time}
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                    onPress={() => togglePickupTime(time)}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save changes"}</Text>
          </Pressable>

          <Pressable style={styles.deleteBtn} onPress={() => Alert.alert("Delete account", "This will be handled later.")}>
            <Text style={styles.deleteBtnText}>Delete account</Text>
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
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#1F2C2B", marginBottom: 12, marginTop: 8 },
  lockedRow: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    backgroundColor: "#F7FAF9",
    padding: 18,
    marginBottom: 14,
  },
  lockedValue: { marginTop: 10, fontSize: 17, color: "#70807E", fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 18,
    marginBottom: 14,
    shadowColor: "#23413C",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowLabel: { fontSize: 16, fontWeight: "800", color: "#223130" },
  input: {
    marginTop: 10,
    fontSize: 17,
    color: "#72817F",
    paddingVertical: 2,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: "#116B62", borderColor: "#116B62" },
  chipInactive: { backgroundColor: "#F6F9F7", borderColor: "#E1EAE6" },
  chipText: { fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  chipTextInactive: { color: "#116B62" },
  saveBtn: {
    marginTop: 8,
    backgroundColor: "#116B62",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  deleteBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E9D7D7",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  deleteBtnText: { color: "#C05343", fontWeight: "800", fontSize: 16 },
});
