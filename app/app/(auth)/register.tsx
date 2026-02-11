import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router, Link } from "expo-router";
import { registerClient } from "@/src/features/auth/auth.api";
import { setToken } from "@/src/lib/token";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPassword(v: string) {
  // >= 6 chars, 1 upper, 1 lower, 1 number
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(v);
}

export default function RegisterScreen() {
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
    const e = email.trim();
    const p = password;

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

      const res = await registerClient(e, p, phone.trim() || undefined);
      await setToken(res.accessToken);

      router.replace("/(app)/discover");
    } catch (err: any) {
      setError(err?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <Text style={styles.subtitle}>Client account only</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="Create a password"
      />
      <Text style={styles.hint}>{passwordHint}</Text>

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone (optional)"
        keyboardType="phone-pad"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "..." : "Create account"}</Text>
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Link href="/(auth)/login" style={styles.link}>
          Login
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#555", marginBottom: 18 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  hint: {
    color: "#555",
    marginBottom: 12,
    marginTop: -6,
    fontSize: 12,
  },
  button: {
    backgroundColor: "black",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  buttonText: { color: "white", fontWeight: "700" },
  error: { color: "red", marginBottom: 12 },
  footerRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: { color: "#444" },
  link: { fontWeight: "700" },
});
