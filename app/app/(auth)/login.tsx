import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router, Link } from "expo-router";
import { login } from "@/src/features/auth/auth.api";
import { setToken } from "@/src/lib/token";
function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

function isValidPassword(v: string) {
    // >= 6 chars, 1 upper, 1 lower, 1 number
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(v);
    }



export default function LoginScreen() {
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
        const res = await login(e, password);
        await setToken(res.accessToken);
        router.replace("/(app)/discover");
    } catch (err: any) {
        setError(err?.message ?? "Login failed");
    } finally {
        setLoading(false);
    }
  }


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />

      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "..." : "Sign in"}</Text>
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Don’t have an account?</Text>
        <Link href="/(auth)/register" style={styles.link}>
          Sign Up
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
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
