import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

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

  const handleLogout = async () => {
    await logout();
    setSession(null);
  };

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
