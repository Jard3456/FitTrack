import React, { useCallback, useEffect, useState } from "react";
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

import { getExercises } from "../services/exercisesApi";
import { isDatabaseConfigured } from "../services/databaseApi";
import { Exercise } from "../types/exercise";

const ENDPOINT = "api.api-ninjas.com/v1/exercises";

const formatLabel = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export default function ApiResourcesScreen() {
  const [resources, setResources] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadResources = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      setResources(await getExercises());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los recursos de la API."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recursos API</Text>
      <Text style={styles.subtitle}>
        Consulta de los recursos recibidos desde API Ninjas.
      </Text>

      <View style={styles.databaseStatus}>
        <Ionicons
          name={isDatabaseConfigured ? "server" : "server-outline"}
          size={19}
          color={isDatabaseConfigured ? "#15803D" : "#B45309"}
        />
        <Text
          style={
            isDatabaseConfigured
              ? styles.databaseConnected
              : styles.databasePending
          }
        >
          {isDatabaseConfigured
            ? "Backend de base de datos configurado"
            : "Backend de base de datos pendiente de configurar"}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons name="cloud-download" size={28} color="#2563EB" />
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryTitle}>Exercises API</Text>
          <Text style={styles.endpoint}>{ENDPOINT}</Text>
        </View>
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#15803D" />
          <Text style={styles.secureText}>Seguro</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{resources.length}</Text>
          <Text style={styles.statLabel}>Recursos recibidos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>GET</Text>
          <Text style={styles.statLabel}>Método HTTP</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Datos consumidos</Text>
        <TouchableOpacity
          accessibilityLabel="Actualizar recursos"
          onPress={() => loadResources(true)}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando recursos…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadResources()}>
            <Text style={styles.retry}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadResources(true)}
              tintColor="#2563EB"
            />
          }
          renderItem={({ item, index }) => (
            <View style={styles.resourceCard}>
              <View style={styles.resourceIndex}>
                <Text style={styles.resourceIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.resourceContent}>
                <Text style={styles.resourceName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.resourceDetail}>
                  {formatLabel(item.muscle)} · {formatLabel(item.difficulty)}
                </Text>
                <Text style={styles.resourceEquipment} numberOfLines={1}>
                  Equipo: {item.equipment}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="file-tray-outline" size={42} color="#94A3B8" />
              <Text style={styles.emptyText}>La API no devolvió recursos.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9", padding: 20 },
  title: { fontSize: 34, fontWeight: "bold", color: "#111827", marginTop: 20 },
  subtitle: { color: "#6B7280", fontSize: 16, marginTop: 4, marginBottom: 18 },
  databaseStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  databaseConnected: {
    color: "#15803D",
    marginLeft: 7,
    fontSize: 13,
    fontWeight: "600",
  },
  databasePending: {
    color: "#B45309",
    marginLeft: 7,
    fontSize: 13,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryContent: { flex: 1 },
  summaryTitle: { color: "#111827", fontWeight: "bold", fontSize: 17 },
  endpoint: { color: "#64748B", fontSize: 12, marginTop: 4 },
  secureBadge: { alignItems: "center" },
  secureText: { color: "#15803D", fontSize: 11, fontWeight: "bold", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12, marginVertical: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    elevation: 2,
  },
  statNumber: { color: "#2563EB", fontSize: 25, fontWeight: "bold" },
  statLabel: { color: "#64748B", fontSize: 12, marginTop: 4, textAlign: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionTitle: { flex: 1, color: "#111827", fontSize: 20, fontWeight: "bold" },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingBottom: 30 },
  resourceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  resourceIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resourceIndexText: { color: "#2563EB", fontWeight: "bold" },
  resourceContent: { flex: 1 },
  resourceName: { color: "#111827", fontWeight: "bold", fontSize: 16 },
  resourceDetail: { color: "#2563EB", fontSize: 13, marginTop: 4 },
  resourceEquipment: { color: "#64748B", fontSize: 12, marginTop: 3 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  loadingText: { color: "#64748B", marginTop: 12 },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: { color: "#991B1B", flex: 1, marginHorizontal: 9, lineHeight: 19 },
  retry: { color: "#B91C1C", fontWeight: "bold" },
  emptyText: { color: "#64748B", marginTop: 10 },
});
