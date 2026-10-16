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
  requestRegistrationCode,
  verifyRegistrationCode,
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
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [registrationStep, setRegistrationStep] = useState<"details" | "code">(
    "details"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegistering = mode === "register";
  const passwordRequirements = [
    { label: "Al menos 8 caracteres", valid: password.length >= 8 },
    { label: "Al menos una letra mayúscula", valid: /[A-Z]/.test(password) },
    {
      label: "Al menos un carácter especial",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const submit = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (isRegistering && registrationStep === "code") {
      const normalizedCode = verificationCode.trim();
      if (!/^\d{6}$/.test(normalizedCode)) {
        setError("Escribe el código de 6 dígitos que recibiste.");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const session = await verifyRegistrationCode(
          normalizedEmail,
          normalizedCode
        );
        onAuthenticated(session);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo verificar el correo."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isRegistering && !normalizedName) {
      setError("Escribe tu nombre.");
      return;
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Escribe un correo válido.");
      return;
    }

    if (isRegistering && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (isRegistering && !/[A-Z]/.test(password)) {
      setError("La contraseña debe incluir al menos una letra mayúscula.");
      return;
    }

    if (isRegistering && !/[^A-Za-z0-9]/.test(password)) {
      setError("La contraseña debe incluir al menos un carácter especial.");
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
      if (isRegistering) {
        await requestRegistrationCode(normalizedName, normalizedEmail, password);
        setRegistrationStep("code");
        return;
      }

      const session = await login(normalizedEmail, password);
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
              ? registrationStep === "code"
                ? "Escribe el código que enviamos a tu correo."
                : "Registra tus datos para guardar tu progreso."
              : "Accede a tu progreso y tus rutinas."}
          </Text>

          {isRegistering && registrationStep === "details" && (
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
              editable={!isRegistering || registrationStep === "details"}
            />
          </View>

          {isRegistering && registrationStep === "code" && (
            <View style={styles.inputWrapper}>
              <Ionicons name="keypad-outline" size={20} color="#64748B" />
              <TextInput
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Código de 6 dígitos"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                keyboardType="number-pad"
                maxLength={6}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {(!isRegistering || registrationStep === "details") && (
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#64748B" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((visible) => !visible)}
              style={styles.eyeButton}
              accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
          )}

          {isRegistering && registrationStep === "details" && (
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>
                La contraseña debe contener:
              </Text>
              {passwordRequirements.map((requirement) => (
                <Text
                  key={requirement.label}
                  style={
                    requirement.valid
                      ? styles.requirementValid
                      : styles.requirementInvalid
                  }
                >
                  {requirement.valid ? "✓" : "○"} {requirement.label}
                </Text>
              ))}
            </View>
          )}

          {isRegistering && registrationStep === "details" && (
            <View style={styles.inputWrapper}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#64748B" />
              <TextInput
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                placeholder="Confirmar contraseña"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                secureTextEntry={!showPasswordConfirmation}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() =>
                  setShowPasswordConfirmation((visible) => !visible)
                }
                style={styles.eyeButton}
                accessibilityLabel={
                  showPasswordConfirmation
                    ? "Ocultar confirmación de contraseña"
                    : "Mostrar confirmación de contraseña"
                }
              >
                <Ionicons
                  name={
                    showPasswordConfirmation
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
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
                {isRegistering
                  ? registrationStep === "code"
                    ? "Verificar y crear cuenta"
                    : "Enviar código"
                  : "Entrar"}
              </Text>
            )}
          </TouchableOpacity>

          {isRegistering && registrationStep === "code" && (
            <TouchableOpacity
              onPress={() => {
                setRegistrationStep("details");
                setVerificationCode("");
                setError("");
              }}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>Cambiar datos de registro</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => {
              setMode(isRegistering ? "login" : "register");
              setRegistrationStep("details");
              setVerificationCode("");
              setShowPassword(false);
              setShowPasswordConfirmation(false);
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
  eyeButton: {
    padding: 6,
    marginLeft: 6,
  },
  passwordRequirements: {
    marginTop: -4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  requirementsTitle: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  requirementValid: {
    color: "#15803D",
    fontSize: 13,
    lineHeight: 19,
  },
  requirementInvalid: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
  },
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
