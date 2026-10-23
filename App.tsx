import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import AppNavigator from "./src/navigation/AppNavigator";
import AuthScreen from "./src/screens/AuthScreen";
import {
  AuthSession,
  getStoredSession,
  logout,
} from "./src/services/authApi";

export default function App() {
  const [session, setSession] = useState<AuthSession | null | undefined>(
    undefined
  );

  useEffect(() => {
    getStoredSession()
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setSession(null);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || !session) return;

    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        void handleLogout();
      }, INACTIVITY_LIMIT_MS);
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "pointerdown",
      "wheel",
    ] as const;

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, resetInactivityTimer, { passive: true })
    );
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, resetInactivityTimer)
      );
    };
  }, [handleLogout, session]);

  if (session === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} />;
  }

  return <AppNavigator onLogout={handleLogout} userRole={session.user.role} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F9",
  },
});
