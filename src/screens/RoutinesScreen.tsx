import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RoutineCard from "../components/RoutineCard";
import {
  AssignedRoutine,
  completeRoutine,
  ExerciseCompletionInput,
  getAssignedRoutines,
} from "../services/routinesApi";

type ExerciseDraft = {
  weightKg: string;
  durationMinutes: string;
  notes: string;
};

type RoutineFilter = "today" | "future" | "past";

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default function RoutinesScreen() {
  const [routines, setRoutines] = useState<AssignedRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<RoutineFilter>("today");
  const [selectedRoutine, setSelectedRoutine] = useState<AssignedRoutine | null>(null);
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraft>>({});
  const [savingCompletion, setSavingCompletion] = useState(false);

  const today = formatLocalDate();

  const visibleRoutines = useMemo(() => {
    return routines.filter((routine) => {
      if (activeFilter === "today") return routine.scheduledDate === today;
      if (activeFilter === "future") return routine.scheduledDate > today;
      return routine.scheduledDate < today;
    });
  }, [activeFilter, routines, today]);

  const getRoutineCount = (filter: RoutineFilter) => {
    return routines.filter((routine) => {
      if (filter === "today") return routine.scheduledDate === today;
      if (filter === "future") return routine.scheduledDate > today;
      return routine.scheduledDate < today;
    }).length;
  };

  const loadRoutines = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      setRoutines(await getAssignedRoutines());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron consultar las rutinas."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const openRoutine = (routine: AssignedRoutine) => {
    const drafts: Record<string, ExerciseDraft> = {};
    for (const exercise of routine.exercises) {
      drafts[exercise.id] = { weightKg: "", durationMinutes: "", notes: "" };
    }
    setExerciseDrafts(drafts);
    setSelectedRoutine(routine);
  };

  const closeRoutine = () => {
    if (!savingCompletion) setSelectedRoutine(null);
  };

  const canCompleteSelectedRoutine =
    selectedRoutine?.scheduledDate === today && selectedRoutine.completedCount === 0;

  const updateExerciseDraft = (
    exerciseId: string,
    field: keyof ExerciseDraft,
    value: string
  ) => {
    setExerciseDrafts((currentDrafts) => ({
      ...currentDrafts,
      [exerciseId]: {
        ...(currentDrafts[exerciseId] ?? {
          weightKg: "",
          durationMinutes: "",
          notes: "",
        }),
        [field]: value,
      },
    }));
  };

  const saveCompletion = async () => {
    if (!selectedRoutine) return;

    if (selectedRoutine.scheduledDate !== today) {
      Alert.alert(
        "Rutina fuera de fecha",
        "Solo puedes completar la rutina programada para el día actual."
      );
      return;
    }

    if (selectedRoutine.completedCount > 0) {
      Alert.alert("Rutina ya completada", "Esta rutina ya fue registrada como completada.");
      return;
    }

    const exercises: ExerciseCompletionInput[] = selectedRoutine.exercises.map((exercise) => {
      const draft = exerciseDrafts[exercise.id] ?? {
        weightKg: "",
        durationMinutes: "",
        notes: "",
      };
      return {
        exerciseId: exercise.id,
        weightKg: draft.weightKg,
        durationMinutes: draft.durationMinutes,
        notes: draft.notes,
      };
    });

    setSavingCompletion(true);
    try {
      await completeRoutine(selectedRoutine.id, exercises);
      const routineName = selectedRoutine.title;
      setSelectedRoutine(null);
      await loadRoutines(true);
      Alert.alert("Rutina completada", `El progreso de ${routineName} fue guardado.`);
    } catch (completionError) {
      Alert.alert(
        "No se pudo completar",
        completionError instanceof Error
          ? completionError.message
          : "No se pudo guardar el progreso."
      );
    } finally {
      setSavingCompletion(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando rutinas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rutinas</Text>
      <Text style={styles.subtitle}>
        Aquí encontrarás las rutinas asignadas por tu entrenador.
      </Text>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={22} color="#B91C1C" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.tabs}>
        {([
          ["today", "Hoy"],
          ["future", "Próximas"],
          ["past", "Pasadas"],
        ] as Array<[RoutineFilter, string]>).map(([filter, label]) => {
          const selected = filter === activeFilter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.tab, selected && styles.selectedTab]}
              onPress={() => setActiveFilter(filter)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabLabel, selected && styles.selectedTabLabel]}>
                {label}
              </Text>
              <Text style={[styles.tabCount, selected && styles.selectedTabCount]}>
                {getRoutineCount(filter)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={visibleRoutines}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRoutines(true)}
            tintColor="#2563EB"
          />
        }
        contentContainerStyle={visibleRoutines.length ? styles.list : styles.emptyList}
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyCard}>
              <Ionicons name="barbell-outline" size={46} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {activeFilter === "today"
                  ? "No tienes una rutina para hoy"
                  : activeFilter === "future"
                    ? "No tienes rutinas futuras"
                    : "No tienes rutinas pasadas"}
              </Text>
              <Text style={styles.emptyText}>
                Tu entrenador podrá programar rutinas con ejercicios personalizados.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RoutineCard
            title={item.title}
            level={item.level}
            exercises={item.exercises.length}
            exerciseNames={item.exercises.map((exercise) => exercise.name)}
            duration={`${item.durationMinutes} min`}
            scheduledDate={formatDisplayDate(item.scheduledDate)}
            completedCount={item.completedCount}
            onPress={() => openRoutine(item)}
            icon="barbell"
          />
        )}
      />

      <Modal
        visible={Boolean(selectedRoutine)}
        transparent
        animationType="slide"
        onRequestClose={closeRoutine}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingContent}>
                <Text style={styles.modalTitle}>{selectedRoutine?.title}</Text>
                <Text style={styles.modalSubtitle}>
                  {canCompleteSelectedRoutine
                    ? "Registra los datos y marca la rutina como completada."
                    : selectedRoutine?.completedCount
                      ? "Esta rutina ya está registrada como completada."
                      : (selectedRoutine?.scheduledDate ?? "") > today
                        ? "Esta rutina es futura y solo está disponible para consulta."
                        : "Esta rutina pasada solo está disponible para consulta."}
                </Text>
              </View>
              <TouchableOpacity onPress={closeRoutine} disabled={savingCompletion}>
                <Ionicons name="close" size={27} color="#334155" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedRoutine?.exercises.map((exercise, index) => {
                const draft = exerciseDrafts[exercise.id] ?? {
                  weightKg: "",
                  durationMinutes: "",
                  notes: "",
                };
                const normalizedType = exercise.type.toLowerCase();
                const isCardio = normalizedType.includes("cardio");
                const isStrength =
                  normalizedType.includes("fuerza") || normalizedType.includes("strength");

                return (
                  <View key={exercise.id} style={styles.exerciseLogCard}>
                    <Text style={styles.exerciseLogTitle}>
                      {index + 1}. {exercise.name}
                    </Text>
                    <Text style={styles.exerciseLogType}>{exercise.type}</Text>

                    {canCompleteSelectedRoutine ? (
                      <>
                        {isStrength ? (
                          <>
                            <Text style={styles.inputLabel}>Peso utilizado (kg) *</Text>
                            <TextInput
                              style={styles.modalInput}
                              value={draft.weightKg}
                              onChangeText={(value) =>
                                updateExerciseDraft(exercise.id, "weightKg", value)
                              }
                              placeholder="Ej. 20"
                              keyboardType="decimal-pad"
                              editable={!savingCompletion}
                            />
                          </>
                        ) : null}

                        {isCardio ? (
                          <>
                            <Text style={styles.inputLabel}>Tiempo realizado (minutos) *</Text>
                            <TextInput
                              style={styles.modalInput}
                              value={draft.durationMinutes}
                              onChangeText={(value) =>
                                updateExerciseDraft(exercise.id, "durationMinutes", value)
                              }
                              placeholder="Ej. 30"
                              keyboardType="decimal-pad"
                              editable={!savingCompletion}
                            />
                          </>
                        ) : null}

                        {!isStrength && !isCardio ? (
                          <Text style={styles.optionalInfo}>
                            Registra una nota opcional sobre este ejercicio.
                          </Text>
                        ) : null}

                        <Text style={styles.inputLabel}>Notas</Text>
                        <TextInput
                          style={[styles.modalInput, styles.notesInput]}
                          value={draft.notes}
                          onChangeText={(value) =>
                            updateExerciseDraft(exercise.id, "notes", value)
                          }
                          placeholder="Ej. Me sentí bien"
                          multiline
                          editable={!savingCompletion}
                        />
                      </>
                    ) : (
                      <Text style={styles.readOnlyNotice}>
                        {selectedRoutine?.completedCount
                          ? "Esta rutina ya fue completada."
                          : (selectedRoutine?.scheduledDate ?? "") > today
                            ? "Esta rutina es futura y no puede completarse todavía."
                            : "Esta rutina es pasada y ya no puede marcarse como completada."}
                      </Text>
                    )}
                  </View>
                );
              })}

              {canCompleteSelectedRoutine ? (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={saveCompletion}
                  disabled={savingCompletion}
                  activeOpacity={0.85}
                >
                  {savingCompletion ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.completeButtonText}>Marcar rutina como completada</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9", padding: 20 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F9",
  },
  loadingText: { color: "#64748B", marginTop: 12 },
  title: { fontSize: 34, fontWeight: "bold", color: "#111827", marginTop: 20 },
  subtitle: { fontSize: 17, color: "#6B7280", marginBottom: 18, marginTop: 4 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 50,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedTab: { backgroundColor: "#2563EB" },
  tabLabel: { color: "#475569", fontSize: 12, fontWeight: "700" },
  selectedTabLabel: { color: "#FFFFFF" },
  tabCount: { color: "#64748B", fontSize: 12, fontWeight: "bold", marginTop: 2 },
  selectedTabCount: { color: "#DBEAFE" },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, paddingBottom: 24 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginTop: 8,
  },
  emptyTitle: { color: "#334155", fontSize: 17, fontWeight: "bold", marginTop: 12 },
  emptyText: { color: "#64748B", textAlign: "center", lineHeight: 20, marginTop: 6 },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: { color: "#991B1B", flex: 1, marginLeft: 8, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "94%",
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  modalHeadingContent: { flex: 1 },
  modalTitle: { color: "#111827", fontSize: 24, fontWeight: "bold" },
  modalSubtitle: { color: "#64748B", fontSize: 14, lineHeight: 20, marginTop: 5 },
  exerciseLogCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  exerciseLogTitle: { color: "#1E293B", fontSize: 16, fontWeight: "bold" },
  exerciseLogType: { color: "#2563EB", fontSize: 12, fontWeight: "600", marginTop: 4 },
  inputLabel: { color: "#475569", fontSize: 13, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 11,
    color: "#111827",
    fontSize: 15,
  },
  notesInput: { minHeight: 62, textAlignVertical: "top" },
  optionalInfo: { color: "#64748B", fontSize: 13, marginTop: 12 },
  readOnlyNotice: {
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    borderRadius: 9,
    padding: 10,
    marginTop: 12,
    lineHeight: 18,
  },
  completeButton: {
    backgroundColor: "#16A34A",
    minHeight: 54,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  completeButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
