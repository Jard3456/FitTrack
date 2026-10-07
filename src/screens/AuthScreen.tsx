import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  AuthSession,
  login,
  register,
} from "../services/authApi";

type AuthMode = "login" | "register";

type Props = {
  onAuthenticated: (session: AuthSession) => void;
};

export default function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegistering = mode === "register";

  const submit = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (isRegistering && !normalizedName) {
      setError("Escribe tu nombre.");
      return;
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Escribe un correo válido.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (isRegistering && password !== passwordConfirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session = isRegistering
        ? await register(normalizedName, normalizedEmail, password)
        : await login(normalizedEmail, password);

      onAuthenticated(session);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo completar la operación."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandCircle}>
          <Ionicons name="barbell" size={42} color="#FFFFFF" />
        </View>
        <Text style={styles.appName}>FITTRACK</Text>
        <Text style={styles.subtitle}>
          {isRegistering ? "Crea tu cuenta" : "Entrena. Registra. Supérate."}
        </Text>

        <View style={styles.card}>
          <Text style={styles.title}>
            {isRegistering ? "Crear cuenta" : "Iniciar sesión"}
          </Text>
          <Text style={styles.description}>
            {isRegistering
              ? "Registra tus datos para guardar tu progreso."
              : "Accede a tu progreso y tus rutinas."}
          </Text>

          {isRegistering && (
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#64748B" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre completo"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#64748B" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {isRegistering && (
            <View style={styles.inputWrapper}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#64748B" />
              <TextInput
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                placeholder="Confirmar contraseña"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isRegistering ? "Registrarme" : "Entrar"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMode(isRegistering ? "login" : "register");
              setError("");
            }}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isRegistering
                ? "¿Ya tienes una cuenta? Inicia sesión"
                : "¿No tienes una cuenta? Regístrate"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F4F6F9",
  },
  brandCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    marginBottom: 12,
  },
  appName: {
    color: "#111827",
    textAlign: "center",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 1,
  },
  subtitle: {
    color: "#64748B",
    textAlign: "center",
    fontSize: 15,
    marginTop: 5,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    elevation: 4,
  },
  title: { color: "#111827", fontSize: 25, fontWeight: "bold" },
  description: { color: "#64748B", marginTop: 6, marginBottom: 20 },
  inputWrapper: {
    height: 54,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
  },
  input: { flex: 1, color: "#111827", marginLeft: 10, fontSize: 16 },
  error: { color: "#B91C1C", lineHeight: 19, marginBottom: 12 },
  primaryButton: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    marginTop: 4,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 17 },
  switchButton: { alignItems: "center", paddingTop: 19 },
  switchText: { color: "#2563EB", fontWeight: "600" },
});
