import { useState } from "react";
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
import { login } from "@/src/features/auth/auth.api";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPassword(v: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(v);
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("test@gmail.com");
  const [password, setPassword] = useState("Test123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    const e = email.trim();

    if (!isValidEmail(e)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!isValidPassword(password)) {
      setError("Password must be at least 6 characters and include upper, lower, and a number.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const auth = await login(e, password);
      router.replace(auth.user.role === "seller" ? "/(app)/seller-dashboard" : "/(app)/(tabs)/discover");
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
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
            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSubtitle}>
              Rescue surprise bags from nearby spots and keep good food in circulation.
            </Text>
          </View>

          <View style={styles.sheet}>
            <Text style={styles.formTitle}>Sign in</Text>

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
              placeholder="Enter your password"
              placeholderTextColor="#6F7D7B"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign in"}</Text>
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don’t have an account?</Text>
              <Link href="/(auth)/register" style={styles.link}>
                Create one
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
    backgroundColor: "#DCEDE7",
    overflow: "hidden",
  },
  heroOrbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.34)",
    right: -24,
    top: 34,
  },
  heroOrbTwo: {
    position: "absolute",
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: "rgba(17,107,98,0.10)",
    left: -20,
    bottom: -12,
  },
  eyebrow: {
    color: "#116B62",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  heroTitle: { fontSize: 38, lineHeight: 42, fontWeight: "800", color: "#1F2C2B" },
  heroSubtitle: {
    marginTop: 10,
    maxWidth: 290,
    fontSize: 16,
    lineHeight: 24,
    color: "#52615F",
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
    marginBottom: 14,
    color: "#1F2C2B",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#116B62",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 6,
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
  footerText: { color: "#657472", fontWeight: "600" },
  link: { fontWeight: "800", color: "#116B62" },
});
