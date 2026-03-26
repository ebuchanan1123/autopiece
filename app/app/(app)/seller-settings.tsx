import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";
import { getMySellerProfile, updateMySellerProfile, type SellerProfile } from "@/src/features/sellers/sellers.api";
import { pickImageDataUrl } from "@/src/lib/image-picker";

export default function SellerSettingsScreen() {
  const [form, setForm] = useState<SellerProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMySellerProfile();
        setForm(profile);
      } catch (e: any) {
        Alert.alert("Could not load seller settings", e?.message ?? "Please try again.");
      }
    })();
  }, []);

  async function uploadLogo() {
    try {
      setUploading(true);
      const next = await pickImageDataUrl({ aspect: [1, 1], quality: 0.35 });
      if (!next || !form) return;
      setForm({ ...form, logoUrl: next });
    } catch (e: any) {
      Alert.alert("Could not use that image", e?.message ?? "Please try another one.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form) return;

    try {
      setSaving(true);
      const seller = await updateMySellerProfile({
        storeName: form.storeName,
        businessType: form.businessType ?? "",
        address: form.address,
        city: form.city,
        wilaya: form.wilaya,
        phone: form.phone,
        logoUrl: form.logoUrl ?? null,
        lat: form.lat ?? null,
        lng: form.lng ?? null,
      });
      setForm(seller);
      Alert.alert("Saved", "Your business settings were updated.");
    } catch (e: any) {
      Alert.alert("Could not save", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <>
        <ScreenHeader title="Seller settings" showBack />
        <ScreenBody>
          <View style={styles.center}>
            <Text style={styles.loading}>Loading...</Text>
          </View>
        </ScreenBody>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Seller settings" showBack />
      <ScreenBody>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.logoCard}>
            <View style={styles.logoPreview}>
              {form.logoUrl ? (
                <Image source={{ uri: form.logoUrl }} style={styles.logoImage} />
              ) : (
                <Text style={styles.logoFallback}>
                  {form.storeName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("") || "SB"}
                </Text>
              )}
            </View>

            <View style={styles.logoContent}>
              <Text style={styles.logoTitle}>Business logo</Text>
              <Text style={styles.logoText}>This logo will appear on listing cards and map pins.</Text>
            </View>

            <Pressable style={styles.logoButton} onPress={uploadLogo} disabled={uploading}>
              <Text style={styles.logoButtonText}>{uploading ? "Uploading..." : "Change"}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Business name</Text>
            <TextInput style={styles.input} value={form.storeName} onChangeText={(storeName) => setForm({ ...form, storeName })} />

            <Text style={styles.label}>Store type</Text>
            <TextInput style={styles.input} value={form.businessType ?? ""} onChangeText={(businessType) => setForm({ ...form, businessType })} placeholder="Bakery, grocery, meals..." placeholderTextColor="#6F7D7B" />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} keyboardType="phone-pad" />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={form.address} onChangeText={(address) => setForm({ ...form, address })} />

            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={(city) => setForm({ ...form, city })} />

            <Text style={styles.label}>Wilaya</Text>
            <TextInput style={styles.input} value={form.wilaya} onChangeText={(wilaya) => setForm({ ...form, wilaya })} />
          </View>

          <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save changes"}</Text>
          </Pressable>
        </ScrollView>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 34, backgroundColor: "#FFFDF8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { color: "#72817F", fontWeight: "700" },
  logoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  logoPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F3EF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: { width: "100%", height: "100%" },
  logoFallback: { color: "#116B62", fontWeight: "900", fontSize: 26 },
  logoContent: { flex: 1 },
  logoTitle: { color: "#1F2C2B", fontWeight: "900", fontSize: 18 },
  logoText: { marginTop: 6, color: "#6F7D7B", lineHeight: 22, fontWeight: "600" },
  logoButton: {
    borderRadius: 999,
    backgroundColor: "#EAF5F0",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  logoButtonText: { color: "#116B62", fontWeight: "800" },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  label: { marginTop: 10, marginBottom: 8, fontSize: 14, fontWeight: "800", color: "#43514F" },
  input: {
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2C2B",
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: "#116B62",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 16,
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
});
