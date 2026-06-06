import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { router, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { registerClient } from "@/src/features/auth/auth.api";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPassword(v: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(v);
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordHint = useMemo(() => {
    if (!password) return "At least 6 characters, with upper + lower + number.";
    return isValidPassword(password)
      ? "Password looks good."
      : "At least 6 characters, with upper + lower + number.";
  }, [password]);

  async function onSubmit() {
    const u = username.trim();
    const e = email.trim();
    const p = password;

    if (u.length < 3) {
      setError("Enter a username with at least 3 characters.");
      return;
    }

    if (!isValidEmail(e)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!isValidPassword(p)) {
      setError("Password must be at least 6 characters and include upper, lower, and a number.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await registerClient(u, e, p, phone.trim() || undefined);
      router.replace("/(app)/(tabs)/discover");
    } catch (err: any) {
      setError(err?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { paddingTop: insets.top + 22 }]}>
            <View style={styles.heroOrbOne} />
            <View style={styles.heroOrbTwo} />
            <Text style={styles.eyebrow}>Too Good To Go DZ</Text>
            <Text style={styles.heroTitle}>Create your account</Text>
            <Text style={styles.heroSubtitle}>
              Save your favourite bags, reserve faster, and track the places you want to revisit.
            </Text>
          </View>

          <View style={styles.sheet}>
            <Text style={styles.formTitle}>Join as a client</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            placeholder="Choose a username"
            placeholderTextColor="#6F7D7B"
            returnKeyType="next"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#6F7D7B"
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            placeholderTextColor="#6F7D7B"
            returnKeyType="next"
          />
          <Text style={styles.hint}>{passwordHint}</Text>

            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Optional"
              placeholderTextColor="#6F7D7B"
              keyboardType="phone-pad"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "Creating account..." : "Create account"}</Text>
            </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
            </Link>
          </View>

          <View style={styles.sellerRow}>
            <Text style={styles.footerText}>Want to join as a food business?</Text>
            <Link href="/(auth)/register-seller" style={styles.link}>
              Create seller account
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFDF8" },
  scrollContent: { flexGrow: 1 },
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 34,
    backgroundColor: "#F0E2D5",
    overflow: "hidden",
  },
  heroOrbOne: {
    position: "absolute",
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: "rgba(255,255,255,0.34)",
    right: -28,
    top: 26,
  },
  heroOrbTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(192,83,67,0.08)",
    left: -16,
    bottom: -16,
  },
  eyebrow: {
    color: "#9A4E3A",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  heroTitle: { fontSize: 36, lineHeight: 40, fontWeight: "800", color: "#2C2A28" },
  heroSubtitle: {
    marginTop: 10,
    maxWidth: 300,
    fontSize: 16,
    lineHeight: 24,
    color: "#695D56",
    fontWeight: "600",
  },
  sheet: {
    marginTop: -14,
    backgroundColor: "#FFFDF8",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 40,
  },
  formTitle: { fontSize: 28, fontWeight: "800", color: "#1F2C2B", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 8, color: "#43514F" },
  input: {
    borderWidth: 1,
    borderColor: "#DCE6E2",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 10,
    color: "#1F2C2B",
    fontSize: 16,
  },
  hint: {
    color: "#72817F",
    marginBottom: 14,
    marginTop: -2,
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#116B62",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#23413C",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  error: { color: "#C05343", marginBottom: 12, fontWeight: "700" },
  footerRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  sellerRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  footerText: { color: "#657472", fontWeight: "600" },
  link: { fontWeight: "800", color: "#116B62" },
});
