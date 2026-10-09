import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AuthUser } from "../services/authApi";
import {
  getUsersForAdmin,
  updateUserRole,
  UserRole,
} from "../services/adminUsersApi";

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
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("usuario");
  const [savingRole, setSavingRole] = useState(false);

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

  const openRoleModal = (user: AuthUser) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
  };

  const closeRoleModal = () => {
    if (!savingRole) setSelectedUser(null);
  };

  const saveRole = async () => {
    if (!selectedUser) return;

    setSavingRole(true);
    try {
      await updateUserRole(selectedUser.id, selectedRole);
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === selectedUser.id ? { ...user, role: selectedRole } : user
        )
      );
      setSelectedUser(null);
      Alert.alert("Rol actualizado", "El cambio se guardó correctamente.");
    } catch (saveError) {
      Alert.alert(
        "No se pudo actualizar",
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el nuevo rol."
      );
    } finally {
      setSavingRole(false);
    }
  };

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
            <TouchableOpacity
              style={styles.changeRoleButton}
              onPress={() => openRoleModal(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.changeRoleText}>Cambiar rol</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal
        visible={Boolean(selectedUser)}
        transparent
        animationType="fade"
        onRequestClose={closeRoleModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingContent}>
                <Text style={styles.modalTitle}>Cambiar rol</Text>
                <Text style={styles.modalUserName}>{selectedUser?.name}</Text>
                <Text style={styles.modalUserEmail}>{selectedUser?.email}</Text>
              </View>
              <TouchableOpacity onPress={closeRoleModal} disabled={savingRole}>
                <Ionicons name="close" size={26} color="#334155" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Selecciona el nuevo rol</Text>
            {roleOptions.map((option) => {
              const selected = option.value === selectedRole;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.roleOption, selected && styles.selectedRoleOption]}
                  onPress={() => setSelectedRole(option.value)}
                  disabled={savingRole}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={selected ? "#1D4ED8" : "#64748B"}
                  />
                  <Text
                    style={[styles.roleOptionText, selected && styles.selectedRoleOptionText]}
                  >
                    {roleLabels[option.value]}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                  ) : null}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.saveRoleButton}
              onPress={saveRole}
              disabled={savingRole}
              activeOpacity={0.85}
            >
              {savingRole ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveRoleText}>Guardar cambio</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  changeRoleButton: {
    backgroundColor: "#EFF6FF",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  changeRoleText: { color: "#1D4ED8", fontSize: 11, fontWeight: "bold" },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  modalHeadingContent: { flex: 1 },
  modalTitle: { color: "#111827", fontSize: 23, fontWeight: "bold" },
  modalUserName: { color: "#334155", fontSize: 16, fontWeight: "600", marginTop: 8 },
  modalUserEmail: { color: "#64748B", fontSize: 13, marginTop: 3 },
  modalLabel: { color: "#475569", fontWeight: "600", marginBottom: 9 },
  roleOption: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 9,
  },
  selectedRoleOption: { backgroundColor: "#EFF6FF", borderColor: "#93C5FD" },
  roleOptionText: { flex: 1, color: "#475569", fontWeight: "600", marginLeft: 10 },
  selectedRoleOptionText: { color: "#1D4ED8" },
  saveRoleButton: {
    backgroundColor: "#2563EB",
    minHeight: 52,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveRoleText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
