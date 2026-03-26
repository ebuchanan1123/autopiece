import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";
import { getMyListings, updateListing, type Listing } from "@/src/features/listings/listings.api";
import { pickImageDataUrl } from "@/src/lib/image-picker";

const CATEGORY_OPTIONS = ["Meals", "Bread & pastries", "Groceries", "Desserts", "Prepared foods", "Beverages"];

type ListingForm = {
  title: string;
  description: string;
  category: string;
  priceDzd: string;
  originalValueDzd: string;
  quantityAvailable: string;
  pickupStartAt: string;
  pickupEndAt: string;
  address: string;
  city: string;
  wilaya: string;
  pickupInstructions: string;
  ingredientsAndAllergens: string;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
};

function toForm(item: Listing): ListingForm {
  return {
    title: item.title ?? "",
    description: item.description ?? "",
    category: item.category ?? "Meals",
    priceDzd: String(item.priceDzd ?? ""),
    originalValueDzd: item.originalValueDzd ? String(item.originalValueDzd) : "",
    quantityAvailable: item.quantityAvailable ? String(item.quantityAvailable) : "1",
    pickupStartAt: item.pickupStartAt ?? "",
    pickupEndAt: item.pickupEndAt ?? "",
    address: item.address ?? "",
    city: item.city ?? "",
    wilaya: item.wilaya ?? "",
    pickupInstructions: item.pickupInstructions ?? "",
    ingredientsAndAllergens: item.ingredientsAndAllergens ?? "",
    imageUrl: item.imageUrl ?? null,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
  };
}

export default function SellerListingEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = Number(params.id);
  const [form, setForm] = useState<ListingForm>({
    title: "",
    description: "",
    category: "Meals",
    priceDzd: "",
    originalValueDzd: "",
    quantityAvailable: "1",
    pickupStartAt: "",
    pickupEndAt: "",
    address: "",
    city: "",
    wilaya: "",
    pickupInstructions: "",
    ingredientsAndAllergens: "",
    imageUrl: null,
    lat: null,
    lng: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerField, setPickerField] = useState<"pickupStartAt" | "pickupEndAt" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const listings = await getMyListings();
        const item = listings.find((entry) => entry.id === listingId);
        if (!item) {
          Alert.alert("Listing not found", "We couldn't find that listing in your account.");
          router.back();
          return;
        }
        setForm(toForm(item));
      } catch (e: any) {
        Alert.alert("Could not load listing", e?.message ?? "Please try again.");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId]);

  const pickerDate = useMemo(() => {
    if (!pickerField) return new Date();
    const raw = form[pickerField];
    return raw ? new Date(raw) : new Date();
  }, [form, pickerField]);

  const canSubmit = useMemo(
    () =>
      !!form.title.trim() &&
      !!form.description.trim() &&
      !!form.category.trim() &&
      !!form.priceDzd.trim() &&
      !!form.address.trim() &&
      !!form.city.trim() &&
      !!form.wilaya.trim(),
    [form]
  );

  async function uploadBanner() {
    try {
      setUploading(true);
      const next = await pickImageDataUrl({ aspect: [16, 9], quality: 0.45 });
      if (!next) return;
      setForm((current) => ({ ...current, imageUrl: next }));
    } catch (e: any) {
      Alert.alert("Could not use that image", e?.message ?? "Please try another one.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!canSubmit) {
      Alert.alert("Missing details", "Please fill in the listing basics before saving.");
      return;
    }

    try {
      setSaving(true);
      await updateListing(listingId, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        priceDzd: Number(form.priceDzd),
        originalValueDzd: form.originalValueDzd ? Number(form.originalValueDzd) : undefined,
        quantityAvailable: form.quantityAvailable ? Number(form.quantityAvailable) : 1,
        pickupStartAt: form.pickupStartAt.trim() || null,
        pickupEndAt: form.pickupEndAt.trim() || null,
        address: form.address.trim(),
        city: form.city.trim(),
        wilaya: form.wilaya.trim(),
        pickupInstructions: form.pickupInstructions.trim() || null,
        ingredientsAndAllergens: form.ingredientsAndAllergens.trim() || null,
        imageUrl: form.imageUrl,
        lat: form.lat,
        lng: form.lng,
      });
      Alert.alert("Listing updated", "Your changes have been saved.");
      router.replace("/(app)/seller-listings");
    } catch (e: any) {
      Alert.alert("Could not update listing", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function formatDateTime(value: string) {
    if (!value) return "Select date and time";
    const date = new Date(value);
    return date.toLocaleString("en-CA", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function onChangePicker(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === "dismissed") {
      setPickerField(null);
      return;
    }
    if (!pickerField || !selected) return;
    setForm((current) => ({ ...current, [pickerField]: selected.toISOString() }));
    if (Platform.OS !== "ios") {
      setPickerField(null);
    }
  }

  return (
    <>
      <ScreenHeader title="Edit listing" showBack />
      <ScreenBody>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            {form.imageUrl ? (
              <Image source={{ uri: form.imageUrl }} style={styles.heroImage} />
            ) : (
              <View style={styles.heroFallback}>
                <Text style={styles.heroFallbackText}>Listing banner</Text>
              </View>
            )}
            <Pressable style={styles.heroButton} onPress={uploadBanner} disabled={uploading || loading}>
              <Text style={styles.heroButtonText}>{uploading ? "Uploading..." : "Change banner image"}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Listing title</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(title) => setForm({ ...form, title })} placeholder="Surprise bakery bag" placeholderTextColor="#6F7D7B" />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(description) => setForm({ ...form, description })}
              placeholder="Tell customers what kind of food they can expect."
              placeholderTextColor="#6F7D7B"
              multiline
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.chipsWrap}>
              {CATEGORY_OPTIONS.map((option) => {
                const active = form.category === option;
                return (
                  <Pressable key={option} style={[styles.chip, active ? styles.chipActive : styles.chipInactive]} onPress={() => setForm({ ...form, category: option })}>
                    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Price (DZD)</Text>
            <TextInput style={styles.input} value={form.priceDzd} onChangeText={(priceDzd) => setForm({ ...form, priceDzd })} keyboardType="number-pad" placeholder="900" placeholderTextColor="#6F7D7B" />

            <Text style={styles.label}>Original value (DZD)</Text>
            <TextInput style={styles.input} value={form.originalValueDzd} onChangeText={(originalValueDzd) => setForm({ ...form, originalValueDzd })} keyboardType="number-pad" placeholder="2000" placeholderTextColor="#6F7D7B" />

            <Text style={styles.label}>Quantity available</Text>
            <TextInput style={styles.input} value={form.quantityAvailable} onChangeText={(quantityAvailable) => setForm({ ...form, quantityAvailable })} keyboardType="number-pad" placeholder="4" placeholderTextColor="#6F7D7B" />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Pickup start</Text>
            <Pressable style={styles.pickerField} onPress={() => setPickerField("pickupStartAt")}>
              <Text style={[styles.pickerValue, !form.pickupStartAt ? styles.pickerPlaceholder : null]}>
                {formatDateTime(form.pickupStartAt)}
              </Text>
            </Pressable>

            <Text style={styles.label}>Pickup end</Text>
            <Pressable style={styles.pickerField} onPress={() => setPickerField("pickupEndAt")}>
              <Text style={[styles.pickerValue, !form.pickupEndAt ? styles.pickerPlaceholder : null]}>
                {formatDateTime(form.pickupEndAt)}
              </Text>
            </Pressable>

            {pickerField ? (
              <View style={styles.pickerCard}>
                <DateTimePicker
                  value={pickerDate}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onChangePicker}
                  minimumDate={new Date()}
                  textColor="#1F2C2B"
                />
                {Platform.OS === "ios" ? (
                  <View style={styles.pickerActions}>
                    <Pressable style={styles.pickerActionGhost} onPress={() => setPickerField(null)}>
                      <Text style={styles.pickerActionGhostText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={styles.pickerActionSolid} onPress={() => setPickerField(null)}>
                      <Text style={styles.pickerActionSolidText}>Done</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.label}>Pickup instructions</Text>
            <TextInput style={[styles.input, styles.textArea]} value={form.pickupInstructions} onChangeText={(pickupInstructions) => setForm({ ...form, pickupInstructions })} placeholder="Ring the side doorbell and mention your order number." placeholderTextColor="#6F7D7B" multiline />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={form.address} onChangeText={(address) => setForm({ ...form, address })} />

            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={(city) => setForm({ ...form, city })} />

            <Text style={styles.label}>Wilaya</Text>
            <TextInput style={styles.input} value={form.wilaya} onChangeText={(wilaya) => setForm({ ...form, wilaya })} />
          </View>

          <Pressable style={[styles.saveBtn, (!canSubmit || loading) ? styles.saveBtnDisabled : null]} onPress={save} disabled={saving || !canSubmit || loading}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save changes"}</Text>
          </Pressable>
        </ScrollView>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 34, backgroundColor: "#FFFDF8" },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
  },
  heroImage: { width: "100%", height: 180 },
  heroFallback: { height: 180, backgroundColor: "#C7D8D7", alignItems: "center", justifyContent: "center" },
  heroFallbackText: { color: "#285C59", fontWeight: "900", fontSize: 24 },
  heroButton: { padding: 16, alignItems: "center" },
  heroButtonText: { color: "#116B62", fontWeight: "900", fontSize: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  label: { marginBottom: 8, marginTop: 10, color: "#43514F", fontWeight: "800", fontSize: 14 },
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
  pickerField: {
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  pickerValue: { fontSize: 16, color: "#1F2C2B", fontWeight: "700" },
  pickerPlaceholder: { color: "#8A9794", fontWeight: "600" },
  pickerCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    backgroundColor: "#F9FBFA",
    overflow: "hidden",
  },
  pickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  pickerActionGhost: { paddingHorizontal: 14, paddingVertical: 10 },
  pickerActionGhostText: { color: "#6F7D7B", fontWeight: "800" },
  pickerActionSolid: {
    backgroundColor: "#116B62",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  pickerActionSolidText: { color: "#FFFFFF", fontWeight: "900" },
  textArea: { minHeight: 112, textAlignVertical: "top" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  chip: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  chipActive: { backgroundColor: "#116B62", borderColor: "#116B62" },
  chipInactive: { backgroundColor: "#F6F9F7", borderColor: "#E1EAE6" },
  chipText: { fontWeight: "800" },
  chipTextActive: { color: "#FFFFFF" },
  chipTextInactive: { color: "#116B62" },
  saveBtn: {
    marginTop: 8,
    backgroundColor: "#116B62",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
});
