import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AuthUser } from "../services/authApi";
import { getUsersForAdmin, UserRole } from "../services/adminUsersApi";

const roleOptions: Array<{
  value: UserRole;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "usuario", label: "Usuarios", icon: "person-outline" },
  { value: "entrenador", label: "Entrenadores", icon: "barbell-outline" },
  { value: "administrador", label: "Administradores", icon: "shield-checkmark-outline" },
];

const roleLabels: Record<UserRole, string> = {
  usuario: "Usuario",
  entrenador: "Entrenador",
  administrador: "Administrador",
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole>("usuario");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      setUsers(await getUsersForAdmin());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron consultar los usuarios."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const visibleUsers = useMemo(
    () => users.filter((user) => user.role === activeRole),
    [activeRole, users]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleUsers}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadUsers(true)}
            tintColor="#2563EB"
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Gestión de usuarios</Text>
            <Text style={styles.subtitle}>
              Consulta las cuentas registradas y su rol dentro de FitTrack.
            </Text>

            <View style={styles.tabs}>
              {roleOptions.map((option) => {
                const selected = option.value === activeRole;
                const count = users.filter((user) => user.role === option.value).length;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.tab, selected && styles.selectedTab]}
                    onPress={() => setActiveRole(option.value)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={selected ? "#FFFFFF" : "#64748B"}
                    />
                    <Text style={[styles.tabLabel, selected && styles.selectedTabLabel]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.count, selected && styles.selectedCount]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={22} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => loadUsers()}>
                  <Text style={styles.retry}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>{roleLabels[activeRole]} registrados</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No hay cuentas en este grupo</Text>
            <Text style={styles.emptyText}>
              Los usuarios aparecerán aquí cuando tengan este rol.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.trim().charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabels[item.role]}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9" },
  content: { padding: 18, paddingBottom: 32, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F9",
  },
  loadingText: { color: "#64748B", marginTop: 12 },
  title: { color: "#111827", fontSize: 28, fontWeight: "bold" },
  subtitle: { color: "#64748B", fontSize: 15, lineHeight: 21, marginTop: 6 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 4,
    marginTop: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 76,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  selectedTab: { backgroundColor: "#2563EB" },
  tabLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  selectedTabLabel: { color: "#FFFFFF" },
  count: { color: "#64748B", fontSize: 12, fontWeight: "bold", marginTop: 2 },
  selectedCount: { color: "#DBEAFE" },
  sectionTitle: {
    color: "#334155",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 22,
    marginBottom: 10,
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#1D4ED8", fontSize: 20, fontWeight: "bold" },
  userInfo: { flex: 1, marginHorizontal: 12 },
  userName: { color: "#111827", fontSize: 16, fontWeight: "bold" },
  userEmail: { color: "#64748B", fontSize: 13, marginTop: 4 },
  roleBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  roleBadgeText: { color: "#1D4ED8", fontSize: 11, fontWeight: "bold" },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: { color: "#991B1B", flex: 1, marginHorizontal: 8, lineHeight: 18 },
  retry: { color: "#B91C1C", fontWeight: "bold" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    marginTop: 4,
  },
  emptyTitle: { color: "#334155", fontSize: 16, fontWeight: "bold", marginTop: 10 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 5 },
});
