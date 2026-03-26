import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import * as Location from "expo-location";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { registerSeller, searchSellerPlaces, type SellerPlaceResult } from "@/src/features/sellers/sellers.api";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPassword(v: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(v);
}

type Step = 1 | 2 | 3;

type ManualDetails = {
  storeName: string;
  businessType: string;
  address: string;
  postalCode: string;
  city: string;
  wilaya: string;
  country: string;
};

const DEFAULT_REGION = {
  latitude: 36.7538,
  longitude: 3.0588,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export default function RegisterSellerScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SellerPlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<SellerPlaceResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState(false);
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(null);
  const [manual, setManual] = useState<ManualDetails>({
    storeName: "",
    businessType: "",
    address: "",
    postalCode: "",
    city: "",
    wilaya: "",
    country: "Algeria",
  });

  const passwordChecks = useMemo(
    () => [
      { label: "At least 6 characters", ok: password.length >= 6 },
      { label: "At least 1 number", ok: /\d/.test(password) },
      { label: "At least 1 lowercase and 1 uppercase letter", ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    ],
    [password]
  );

  useEffect(() => {
    if (manualMode) return;
    const q = search.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        const next = await searchSellerPlaces(q);
        setResults(next);
        setError(next.length === 0 ? "No matching businesses found yet. You can add the details manually." : null);
      } catch {
        setResults([]);
        setError("Business search is unavailable right now. Add your store details manually or configure the Google Maps key.");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [search, manualMode]);

  function goBack() {
    if (step === 1) {
      router.back();
      return;
    }

    if (step === 3 && manualMode && !selectedPlace) {
      setStep(2);
      return;
    }

    setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as Step)));
  }

  async function continueFromCredentials() {
    if (!isValidEmail(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password must be at least 6 characters and include upper, lower, and a number.");
      return;
    }
    setError(null);
    setStep(2);
  }

  function applyPlace(place: SellerPlaceResult) {
    setSelectedPlace(place);
    setEditingPin(false);
    setDraftPin(place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null);
    setManual({
      storeName: place.name,
      businessType: place.businessType || "Food business",
      address: place.address,
      postalCode: parseAddress(place.address).postalCode,
      city: parseAddress(place.address).city,
      wilaya: parseAddress(place.address).wilaya,
      country: parseAddress(place.address).country,
    });
    setStep(3);
  }

  async function continueFromManual() {
    if (!manual.storeName.trim() || !manual.address.trim() || !manual.city.trim() || !manual.wilaya.trim()) {
      setError("Fill in your business name and address details to continue.");
      return;
    }
    setError(null);

    let preview: SellerPlaceResult | null = selectedPlace;
    if (!preview) {
      const addressLine = [manual.address, manual.postalCode, manual.city, manual.wilaya, manual.country]
        .filter(Boolean)
        .join(", ");
      try {
        const query = [manual.storeName, addressLine]
          .filter(Boolean)
          .join(", ");
        const matches = await searchSellerPlaces(query);
        const geocoded = await geocodeAddress(addressLine);
        preview = matches[0] ?? {
          id: "",
          name: manual.storeName,
          address: addressLine,
          businessType: manual.businessType,
          phone,
          lat: geocoded?.lat ?? DEFAULT_REGION.latitude,
          lng: geocoded?.lng ?? DEFAULT_REGION.longitude,
        };
      } catch {
        const geocoded = await geocodeAddress(addressLine);
        preview = {
          id: "",
          name: manual.storeName,
          address: addressLine,
          businessType: manual.businessType,
          phone,
          lat: geocoded?.lat ?? DEFAULT_REGION.latitude,
          lng: geocoded?.lng ?? DEFAULT_REGION.longitude,
        };
      }
    }

    setSelectedPlace(preview);
    setEditingPin(true);
    setDraftPin(preview.lat != null && preview.lng != null ? { lat: preview.lat, lng: preview.lng } : null);
    setStep(3);
  }

  async function submit() {
    const place = selectedPlace;
    if (!place) return;

    const derived = parseAddress(place.address);

    try {
      setSubmitting(true);
      setError(null);
      await registerSeller({
        email: email.trim(),
        password,
        phone: phone.trim() || place.phone || undefined,
        username: (manual.storeName || place.name).trim(),
        storeName: (manual.storeName || place.name).trim(),
        businessType: manual.businessType.trim() || place.businessType || "Food business",
        placeId: place.id || undefined,
        address: manual.address.trim() || place.address,
        city: manual.city.trim() || derived.city,
        wilaya: manual.wilaya.trim() || derived.wilaya || derived.city,
        lat: draftPin?.lat ?? place.lat,
        lng: draftPin?.lng ?? place.lng,
      });
      Alert.alert("Seller account created", "Your food business account is ready.");
      router.replace("/(app)/seller-dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Could not create seller account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 26 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable onPress={goBack} hitSlop={12}>
              <Ionicons name="arrow-back" size={34} color="#2A3433" />
            </Pressable>
            <Text style={styles.topTitle}>Sign up your food business</Text>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="close" size={32} color="#2A3433" />
            </Pressable>
          </View>

          {step === 1 ? (
            <View style={styles.stepWrap}>
              <Ionicons name="storefront-outline" size={44} color="#0C766F" />
              <Text style={styles.headline}>Create your login details</Text>
              <Text style={styles.subhead}>
                Add an email address, password, and phone number to associate with your store account.
              </Text>

              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@business.com"
                placeholderTextColor="#6F7D7B"
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Create a password"
                  placeholderTextColor="#6F7D7B"
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#75817E" />
                </Pressable>
              </View>

              <View style={styles.checkList}>
                {passwordChecks.map((item) => (
                  <View key={item.label} style={styles.checkRow}>
                    <Ionicons name={item.ok ? "checkmark" : "checkmark"} size={20} color={item.ok ? "#0C766F" : "#BAC5C2"} />
                    <Text style={[styles.checkLabel, item.ok ? styles.checkLabelActive : null]}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+213 ..."
                placeholderTextColor="#6F7D7B"
              />

              <Pressable style={styles.optInRow} onPress={() => setMarketingOptIn((v) => !v)}>
                <View style={[styles.checkbox, marketingOptIn ? styles.checkboxActive : null]}>
                  {marketingOptIn ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </View>
                <Text style={styles.optInText}>
                  I agree to receive newsletters and information by email, SMS, and push notifications. I can unsubscribe at any time.
                </Text>
              </Pressable>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.cta} onPress={continueFromCredentials}>
                <Text style={styles.ctaText}>Continue</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stepWrap}>
              <Text style={styles.headline}>Sign up your business</Text>
              <Text style={styles.subhead}>Let&apos;s find your store and get you started. It will only take a few minutes.</Text>

              {!manualMode ? (
                <>
                  <View style={styles.searchInputWrap}>
                    <Ionicons name="search-outline" size={30} color="#7A8784" />
                    <TextInput
                      style={styles.searchInput}
                      value={search}
                      onChangeText={(value) => {
                        setSearch(value);
                        setSelectedPlace(null);
                      }}
                      placeholder="Search for store name"
                      placeholderTextColor="#6F7D7B"
                    />
                    {search.length > 0 ? (
                      <Pressable onPress={() => setSearch("")}>
                        <Ionicons name="close-circle-outline" size={30} color="#6F7B78" />
                      </Pressable>
                    ) : null}
                  </View>

                  {searching ? (
                    <View style={styles.searchingRow}>
                      <ActivityIndicator color="#0C766F" />
                      <Text style={styles.searchingText}>Searching places…</Text>
                    </View>
                  ) : null}

                  {results.map((item) => (
                    <Pressable key={item.id || item.name} style={styles.resultRow} onPress={() => applyPlace(item)}>
                      <View style={styles.resultTextWrap}>
                        <Text style={styles.resultTitle}>{item.name}</Text>
                        <Text style={styles.resultAddress}>{item.address}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color="#8A9794" />
                    </Pressable>
                  ))}

                  <Pressable style={styles.manualLinkWrap} onPress={() => setManualMode(true)}>
                    <Text style={styles.manualLink}>Add store details manually</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.sectionLabel}>Business details</Text>
                  <Text style={styles.label}>Business name</Text>
                  <TextInput
                    style={styles.input}
                    value={manual.storeName}
                    onChangeText={(value) => setManual((prev) => ({ ...prev, storeName: value }))}
                  />

                  <Text style={styles.label}>Store type</Text>
                  <TextInput
                    style={styles.input}
                    value={manual.businessType}
                    onChangeText={(value) => setManual((prev) => ({ ...prev, businessType: value }))}
                    placeholder="Bakery, grocery, restaurant..."
                    placeholderTextColor="#6F7D7B"
                  />

                  <Text style={styles.sectionLabel}>Business address</Text>
                  <Text style={styles.label}>Street name and number</Text>
                  <TextInput
                    style={styles.input}
                    value={manual.address}
                    onChangeText={(value) => setManual((prev) => ({ ...prev, address: value }))}
                  />

                  <View style={styles.twoCols}>
                    <View style={styles.colSmall}>
                      <Text style={styles.label}>Postal code</Text>
                      <TextInput
                        style={styles.input}
                        value={manual.postalCode}
                        onChangeText={(value) => setManual((prev) => ({ ...prev, postalCode: value }))}
                      />
                    </View>
                    <View style={styles.colLarge}>
                      <Text style={styles.label}>City</Text>
                      <TextInput
                        style={styles.input}
                        value={manual.city}
                        onChangeText={(value) => setManual((prev) => ({ ...prev, city: value }))}
                      />
                    </View>
                  </View>

                  <View style={styles.twoCols}>
                    <View style={styles.colLarge}>
                      <Text style={styles.label}>Wilaya / region</Text>
                      <TextInput
                        style={styles.input}
                        value={manual.wilaya}
                        onChangeText={(value) => setManual((prev) => ({ ...prev, wilaya: value }))}
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Country</Text>
                  <TextInput
                    style={styles.input}
                    value={manual.country}
                    onChangeText={(value) => setManual((prev) => ({ ...prev, country: value }))}
                  />

                  <Pressable style={styles.secondaryLinkWrap} onPress={() => setManualMode(false)}>
                    <Text style={styles.secondaryLink}>Search for your business instead</Text>
                  </Pressable>
                </>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={styles.cta}
                onPress={() => {
                  if (manualMode) {
                    continueFromManual();
                    return;
                  }
                  if (selectedPlace) {
                    setError(null);
                    setStep(3);
                    return;
                  }
                  setError("Select your business from the list or add the details manually.");
                }}
              >
                <Text style={styles.ctaText}>Continue</Text>
              </Pressable>

              {!manualMode ? (
                <View style={styles.footnoteWrap}>
                  <Text style={styles.footnote}>
                    By proceeding, you agree to the Privacy Policy and Terms and Conditions.
                  </Text>
                  <Text style={styles.loginPrompt}>
                    Already have a store account?{" "}
                    <Link href="/(auth)/login" style={styles.loginLink}>
                      Log in
                    </Link>
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {step === 3 && selectedPlace ? (
            <View style={styles.stepWrap}>
              <Text style={styles.headline}>Review your store details</Text>
              <Text style={styles.subhead}>
                {editingPin
                  ? "Move the map until the pin is over your exact business location, then confirm it."
                  : "Confirm your business details and map location."}
              </Text>

              <View style={styles.reviewCard}>
                <View style={styles.mapWrap}>
                  <MapView
                    style={styles.map}
                    provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                    initialRegion={{
                      latitude: draftPin?.lat ?? selectedPlace.lat ?? DEFAULT_REGION.latitude,
                      longitude: draftPin?.lng ?? selectedPlace.lng ?? DEFAULT_REGION.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={editingPin}
                    zoomEnabled={editingPin}
                    rotateEnabled={editingPin}
                    pitchEnabled={editingPin}
                    onRegionChangeComplete={(region) => {
                      if (!editingPin) return;
                      setDraftPin({ lat: region.latitude, lng: region.longitude });
                    }}
                  >
                    {!editingPin && draftPin ? (
                      <Marker coordinate={{ latitude: draftPin.lat, longitude: draftPin.lng }} />
                    ) : null}
                  </MapView>
                  {editingPin ? (
                    <View pointerEvents="none" style={styles.crosshairWrap}>
                      <Ionicons name="location" size={38} color="#0C766F" />
                    </View>
                  ) : null}
                  <Pressable
                    style={styles.editMapBtn}
                    onPress={() => {
                      if (editingPin) {
                        setEditingPin(false);
                        return;
                      }
                      setEditingPin(true);
                    }}
                  >
                    <Ionicons name={editingPin ? "checkmark-outline" : "pencil-outline"} size={18} color="#FFFFFF" />
                    <Text style={styles.editMapText}>{editingPin ? "Use this spot" : "Edit"}</Text>
                  </Pressable>
                </View>

                <View style={styles.reviewBody}>
                  <View style={styles.reviewTopRow}>
                    <Text style={styles.reviewName}>{manual.storeName || selectedPlace.name}</Text>
                    <View style={styles.reviewTypePill}>
                      <Text style={styles.reviewTypeText}>
                        {manual.businessType || selectedPlace.businessType || "Food business"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reviewAddress}>
                    {manual.address || selectedPlace.address}
                  </Text>
                  <Text style={styles.reviewPhone}>{phone.trim() || selectedPlace.phone || "No phone provided yet"}</Text>
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={[styles.cta, submitting ? styles.ctaDisabled : null]} onPress={submit} disabled={submitting}>
                <Text style={styles.ctaText}>{submitting ? "Creating account..." : "Create account"}</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

async function geocodeAddress(address: string) {
  const query = address.trim();
  if (!query) return null;
  const matches = await Location.geocodeAsync(query);
  if (!matches.length) return null;
  return { lat: matches[0].latitude, lng: matches[0].longitude };
}

function parseAddress(address: string) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const postalMatch = address.match(/\b\d{4,6}\b/);

  return {
    city: parts[parts.length >= 3 ? parts.length - 3 : 1] ?? parts[0] ?? "",
    wilaya: parts[parts.length >= 2 ? parts.length - 2 : 1] ?? parts[1] ?? "",
    country: parts[parts.length - 1] ?? "Algeria",
    postalCode: postalMatch?.[0] ?? "",
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFDF8" },
  content: { paddingHorizontal: 22 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  topTitle: { fontSize: 20, fontWeight: "900", color: "#1F2C2B" },
  stepWrap: { paddingTop: 18 },
  headline: {
    marginTop: 8,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: "#1F2C2B",
  },
  subhead: {
    marginTop: 16,
    fontSize: 18,
    lineHeight: 30,
    color: "#394240",
  },
  label: { marginTop: 22, marginBottom: 8, fontSize: 15, fontWeight: "700", color: "#5A6865" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD8D3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: "#1F2C2B",
  },
  passwordWrap: { position: "relative" },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: "absolute",
    right: 16,
    top: 17,
  },
  checkList: { marginTop: 14, gap: 10 },
  checkRow: { flexDirection: "row", alignItems: "center" },
  checkLabel: { marginLeft: 10, color: "#8B9794", fontSize: 15 },
  checkLabelActive: { color: "#0C766F" },
  optInRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 24 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0C766F",
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: "#0C766F" },
  optInText: { flex: 1, fontSize: 15, lineHeight: 26, color: "#374240" },
  error: { marginTop: 14, color: "#B54E41", fontWeight: "800" },
  cta: {
    marginTop: 28,
    backgroundColor: "#0C766F",
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 20,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  searchInputWrap: {
    marginTop: 30,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0C766F",
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 76,
    backgroundColor: "#FFFFFF",
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 18, color: "#1F2C2B" },
  searchingRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  searchingText: { marginLeft: 10, color: "#72817F", fontWeight: "700" },
  resultRow: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EAE8",
    flexDirection: "row",
    alignItems: "center",
  },
  resultTextWrap: { flex: 1, marginRight: 14 },
  resultTitle: { fontSize: 18, fontWeight: "900", color: "#1F2C2B" },
  resultAddress: { marginTop: 4, color: "#51615E", fontSize: 16, lineHeight: 24 },
  manualLinkWrap: { alignItems: "center", marginTop: 28 },
  manualLink: { color: "#0C766F", fontSize: 17, fontWeight: "800", textDecorationLine: "underline" },
  secondaryLinkWrap: { alignItems: "center", marginTop: 18 },
  secondaryLink: { color: "#0C766F", fontSize: 16, fontWeight: "800", textDecorationLine: "underline" },
  footnoteWrap: { marginTop: 22, alignItems: "center" },
  footnote: { fontSize: 15, lineHeight: 26, color: "#677572", textAlign: "center" },
  loginPrompt: { marginTop: 22, fontSize: 17, color: "#374240", textAlign: "center" },
  loginLink: { color: "#0C766F", fontWeight: "900", textDecorationLine: "underline" },
  sectionLabel: { marginTop: 24, marginBottom: 6, fontSize: 18, fontWeight: "900", color: "#1F2C2B" },
  twoCols: { flexDirection: "row", gap: 12 },
  colSmall: { flex: 0.85 },
  colLarge: { flex: 1.15 },
  reviewCard: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  mapWrap: { height: 230, position: "relative" },
  map: { flex: 1 },
  crosshairWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  editMapBtn: {
    position: "absolute",
    right: 14,
    top: 14,
    backgroundColor: "#0C766F",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  editMapText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginLeft: 8 },
  reviewBody: { padding: 18 },
  reviewTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  reviewName: { flex: 1, fontSize: 19, fontWeight: "900", color: "#1F2C2B" },
  reviewTypePill: {
    backgroundColor: "#F2F4F3",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reviewTypeText: { color: "#394240", fontWeight: "700", fontSize: 15 },
  reviewAddress: { marginTop: 14, fontSize: 16, lineHeight: 25, color: "#394240" },
  reviewPhone: { marginTop: 8, fontSize: 16, color: "#394240" },
});
