import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getExercises } from "../services/exercisesApi";
import { Exercise, ExerciseStackParamList } from "../types/exercise";

type Props = NativeStackScreenProps<ExerciseStackParamList, "ListaEjercicios">;

const formatLabel = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export default function ExerciseListScreen({ navigation }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadExercises = useCallback(async (value = "", isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      setExercises(await getExercises(value));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los ejercicios."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadExercises("");
  }, [loadExercises]);

  const renderItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => navigation.navigate("DetalleEjercicio", { exercise: item })}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="fitness" size={28} color="#2563EB" />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.muscle}>{formatLabel(item.muscle)}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatLabel(item.type)}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{formatLabel(item.difficulty)}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Biblioteca</Text>
      <Text style={styles.subtitle}>
        Explora ejercicios para complementar tus rutinas.
      </Text>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadExercises(search)}
            placeholder="Buscar ejercicio"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            style={styles.input}
          />
        </View>
        <TouchableOpacity
          accessibilityLabel="Buscar ejercicios"
          style={styles.searchButton}
          onPress={() => loadExercises(search)}
        >
          <Ionicons name="arrow-forward" size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.apiStatus}>
        <Ionicons name="shield-checkmark" size={17} color="#16A34A" />
        <Text style={styles.apiStatusText}>Datos protegidos con API key</Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadExercises(search)}>
            <Text style={styles.retry}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Consultando ejercicios…</Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={exercises.length ? styles.list : styles.emptyList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadExercises(search, true)}
              tintColor="#2563EB"
            />
          }
          ListHeaderComponent={
            exercises.length ? (
              <Text style={styles.results}>{exercises.length} resultados</Text>
            ) : null
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.centered}>
                <Ionicons name="search-outline" size={42} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No encontramos ejercicios</Text>
                <Text style={styles.emptyText}>Prueba con otro nombre.</Text>
              </View>
            ) : null
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
  searchRow: { flexDirection: "row", gap: 10 },
  searchBox: {
    flex: 1,
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  input: { flex: 1, marginLeft: 9, color: "#111827", fontSize: 16 },
  searchButton: {
    width: 52,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  apiStatus: { flexDirection: "row", alignItems: "center", marginVertical: 14 },
  apiStatusText: { color: "#15803D", marginLeft: 6, fontSize: 13, fontWeight: "600" },
  results: { color: "#64748B", marginBottom: 10, fontWeight: "600" },
  list: { paddingBottom: 30 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  cardContent: { flex: 1 },
  exerciseName: { color: "#111827", fontSize: 17, fontWeight: "bold" },
  muscle: { color: "#2563EB", marginTop: 4, fontWeight: "600" },
  metaRow: { flexDirection: "row", marginTop: 5, alignItems: "center" },
  meta: { color: "#64748B", fontSize: 13 },
  dot: { color: "#CBD5E1", marginHorizontal: 6 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  loadingText: { color: "#64748B", marginTop: 12 },
  emptyList: { flexGrow: 1 },
  emptyTitle: { color: "#334155", fontWeight: "bold", fontSize: 17, marginTop: 12 },
  emptyText: { color: "#64748B", marginTop: 5 },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  errorText: { color: "#991B1B", flex: 1, marginHorizontal: 9, lineHeight: 19 },
  retry: { color: "#B91C1C", fontWeight: "bold" },
});
