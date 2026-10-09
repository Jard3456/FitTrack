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

import {
  assignTrainerUser,
  getTrainerUsers,
  removeTrainerUser,
  TrainerUser,
} from "../services/trainerUsersApi";
import { getCustomExercises } from "../services/customExercisesApi";
import {
  createRoutineForUser,
  getTraineeProgress,
  TraineeProgress,
} from "../services/routinesApi";
import { Exercise } from "../types/exercise";

type UserFilter = "todos" | "disponibles" | "mios";

const filters: Array<{
  value: UserFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "todos", label: "Todos", icon: "people-outline" },
  { value: "disponibles", label: "Disponibles", icon: "checkmark-circle-outline" },
  { value: "mios", label: "Mis usuarios", icon: "person-outline" },
];

export default function TrainerUsersScreen() {
  const [users, setUsers] = useState<TrainerUser[]>([]);
  const [activeFilter, setActiveFilter] = useState<UserFilter>("todos");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [routineUser, setRoutineUser] = useState<TrainerUser | null>(null);
  const [trainerExercises, setTrainerExercises] = useState<Exercise[]>([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineLevel, setRoutineLevel] = useState("Intermedio");
  const [routineDuration, setRoutineDuration] = useState("45");
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [progressUser, setProgressUser] = useState<TrainerUser | null>(null);
  const [progressEntries, setProgressEntries] = useState<TraineeProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const loadUsers = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      setUsers(await getTrainerUsers());
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

  const visibleUsers = useMemo(() => {
    if (activeFilter === "disponibles") {
      return users.filter((user) => user.isAvailable);
    }

    if (activeFilter === "mios") {
      return users.filter((user) => user.assignedToMe);
    }

    return users;
  }, [activeFilter, users]);

  const getCount = (filter: UserFilter) => {
    if (filter === "disponibles") return users.filter((user) => user.isAvailable).length;
    if (filter === "mios") return users.filter((user) => user.assignedToMe).length;
    return users.length;
  };

  const assignUser = async (user: TrainerUser) => {
    setProcessingId(user.id);
    try {
      await assignTrainerUser(user.id);
      await loadUsers(true);
      Alert.alert("Usuario agregado", `${user.name} ahora está bajo tu entrenamiento.`);
    } catch (assignError) {
      Alert.alert(
        "No se pudo agregar",
        assignError instanceof Error
          ? assignError.message
          : "El usuario puede estar siendo entrenado por alguien más."
      );
      await loadUsers(true);
    } finally {
      setProcessingId(null);
    }
  };

  const releaseUser = (user: TrainerUser) => {
    Alert.alert(
      "Dejar de entrenar",
      `¿Quieres liberar a ${user.name} para que pueda ser asignado a otro entrenador?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Liberar",
          style: "destructive",
          onPress: async () => {
            setProcessingId(user.id);
            try {
              await removeTrainerUser(user.id);
              await loadUsers(true);
            } catch (removeError) {
              Alert.alert(
                "No se pudo liberar",
                removeError instanceof Error
                  ? removeError.message
                  : "No se pudo liberar el usuario."
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const openRoutineModal = async (user: TrainerUser) => {
    setRoutineUser(user);
    setRoutineTitle(`Rutina para ${user.name}`);
    setRoutineLevel("Intermedio");
    setRoutineDuration("45");
    setSelectedExerciseIds([]);
    setLoadingExercises(true);

    try {
      setTrainerExercises(await getCustomExercises());
    } catch (exerciseError) {
      setTrainerExercises([]);
      Alert.alert(
        "No se pudieron cargar los ejercicios",
        exerciseError instanceof Error
          ? exerciseError.message
          : "Crea o registra ejercicios antes de asignar una rutina."
      );
    } finally {
      setLoadingExercises(false);
    }
  };

  const closeRoutineModal = () => {
    if (!savingRoutine) setRoutineUser(null);
  };

  const toggleExercise = (exerciseId: number) => {
    setSelectedExerciseIds((currentIds) =>
      currentIds.includes(exerciseId)
        ? currentIds.filter((id) => id !== exerciseId)
        : [...currentIds, exerciseId]
    );
  };

  const saveRoutine = async () => {
    if (!routineUser) return;

    const durationMinutes = Number(routineDuration);
    if (!routineTitle.trim() || !selectedExerciseIds.length || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      Alert.alert(
        "Datos incompletos",
        "Escribe un título, una duración válida y selecciona al menos un ejercicio."
      );
      return;
    }

    setSavingRoutine(true);
    try {
      await createRoutineForUser(routineUser.id, {
        title: routineTitle.trim(),
        level: routineLevel,
        durationMinutes,
        exerciseIds: selectedExerciseIds,
      });
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === routineUser.id
            ? { ...user, routineCount: user.routineCount + 1 }
            : user
        )
      );
      setRoutineUser(null);
      Alert.alert("Rutina asignada", `La rutina fue asignada a ${routineUser.name}.`);
    } catch (routineError) {
      Alert.alert(
        "No se pudo asignar la rutina",
        routineError instanceof Error
          ? routineError.message
          : "No se pudo guardar la rutina."
      );
    } finally {
      setSavingRoutine(false);
    }
  };

  const openProgressModal = async (user: TrainerUser) => {
    setProgressUser(user);
    setProgressEntries([]);
    setLoadingProgress(true);

    try {
      setProgressEntries(await getTraineeProgress(user.id));
    } catch (progressError) {
      setProgressUser(null);
      Alert.alert(
        "No se pudo consultar el progreso",
        progressError instanceof Error
          ? progressError.message
          : "No se pudo cargar el progreso del usuario."
      );
    } finally {
      setLoadingProgress(false);
    }
  };

  const closeProgressModal = () => {
    if (!loadingProgress) setProgressUser(null);
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
            <Text style={styles.title}>Usuarios para entrenar</Text>
            <Text style={styles.subtitle}>
              Consulta quién está disponible y administra tus usuarios asignados.
            </Text>

            <View style={styles.tabs}>
              {filters.map((filter) => {
                const selected = filter.value === activeFilter;
                return (
                  <TouchableOpacity
                    key={filter.value}
                    style={[styles.tab, selected && styles.selectedTab]}
                    onPress={() => setActiveFilter(filter.value)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={filter.icon}
                      size={19}
                      color={selected ? "#FFFFFF" : "#64748B"}
                    />
                    <Text style={[styles.tabLabel, selected && styles.selectedTabLabel]}>
                      {filter.label}
                    </Text>
                    <Text style={[styles.count, selected && styles.selectedCount]}>
                      {getCount(filter.value)}
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
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={42} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No hay usuarios en este grupo</Text>
            <Text style={styles.emptyText}>
              Los usuarios registrados con rol Usuario aparecerán aquí.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const processing = processingId === item.id;
          const statusColor = item.assignedToMe
            ? "#166534"
            : item.isAvailable
              ? "#1D4ED8"
              : "#B45309";
          const statusBackground = item.assignedToMe
            ? "#DCFCE7"
            : item.isAvailable
              ? "#DBEAFE"
              : "#FEF3C7";

          return (
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name.trim().charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {item.assignedToMe
                    ? "Lo entrenas tú"
                    : item.isAvailable
                      ? "Disponible"
                      : `Entrenado por ${item.trainerName || "otro entrenador"}`}
                </Text>
                {item.routineCount > 0 ? (
                  <Text style={styles.routineCount}>
                    {item.routineCount} {item.routineCount === 1 ? "rutina" : "rutinas"} asignadas
                  </Text>
                ) : null}
              </View>

              {item.assignedToMe ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.progressButton}
                    onPress={() => openProgressModal(item)}
                    disabled={processingId !== null}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.progressButtonText}>Progreso</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.routineButton}
                    onPress={() => openRoutineModal(item)}
                    disabled={processingId !== null}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.routineButtonText}>Rutina</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.releaseButton}
                    onPress={() => releaseUser(item)}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    {processing ? (
                      <ActivityIndicator color="#B91C1C" size="small" />
                    ) : (
                      <Text style={styles.releaseText}>Liberar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : item.isAvailable ? (
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={() => assignUser(item)}
                  disabled={processingId !== null}
                  activeOpacity={0.8}
                >
                  {processing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.assignText}>Agregar</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={[styles.busyBadge, { backgroundColor: statusBackground }]}>
                  <Text style={[styles.busyText, { color: statusColor }]}>Ocupado</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal
        visible={Boolean(routineUser)}
        transparent
        animationType="slide"
        onRequestClose={closeRoutineModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingContent}>
                <Text style={styles.modalTitle}>Asignar rutina</Text>
                <Text style={styles.modalSubtitle}>{routineUser?.name}</Text>
              </View>
              <TouchableOpacity onPress={closeRoutineModal} disabled={savingRoutine}>
                <Ionicons name="close" size={27} color="#334155" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Nombre de la rutina</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej. Rutina de fuerza"
                value={routineTitle}
                onChangeText={setRoutineTitle}
                editable={!savingRoutine}
              />

              <Text style={styles.formLabel}>Nivel</Text>
              <View style={styles.levelOptions}>
                {["Principiante", "Intermedio", "Avanzado"].map((level) => {
                  const selected = level === routineLevel;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[styles.levelOption, selected && styles.selectedLevelOption]}
                      onPress={() => setRoutineLevel(level)}
                      disabled={savingRoutine}
                    >
                      <Text style={[styles.levelOptionText, selected && styles.selectedLevelText]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.formLabel}>Duración en minutos</Text>
              <TextInput
                style={styles.formInput}
                placeholder="45"
                value={routineDuration}
                onChangeText={setRoutineDuration}
                keyboardType="number-pad"
                editable={!savingRoutine}
              />

              <Text style={styles.formLabel}>
                Ejercicios registrados por ti ({selectedExerciseIds.length} seleccionados)
              </Text>
              {loadingExercises ? (
                <View style={styles.exerciseLoading}>
                  <ActivityIndicator color="#2563EB" />
                  <Text style={styles.exerciseLoadingText}>Cargando tus ejercicios...</Text>
                </View>
              ) : trainerExercises.length ? (
                trainerExercises.map((exercise) => {
                  if (!exercise.customId) return null;
                  const selected = selectedExerciseIds.includes(exercise.customId);
                  return (
                    <TouchableOpacity
                      key={exercise.customId}
                      style={[styles.exerciseOption, selected && styles.selectedExerciseOption]}
                      onPress={() => toggleExercise(exercise.customId!)}
                      disabled={savingRoutine}
                      activeOpacity={0.8}
                    >
                      <View style={styles.exerciseOptionInfo}>
                        <Text style={styles.exerciseOptionName}>{exercise.name}</Text>
                        <Text style={styles.exerciseOptionDetails}>
                          {exercise.type} • {exercise.difficulty}
                        </Text>
                      </View>
                      <Ionicons
                        name={selected ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={selected ? "#2563EB" : "#94A3B8"}
                      />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noExercisesCard}>
                  <Text style={styles.noExercisesText}>
                    No tienes ejercicios personalizados registrados. Créelos desde la Biblioteca.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.saveRoutineButton}
                onPress={saveRoutine}
                disabled={savingRoutine || loadingExercises}
                activeOpacity={0.85}
              >
                {savingRoutine ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveRoutineText}>Guardar y asignar rutina</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(progressUser)}
        transparent
        animationType="slide"
        onRequestClose={closeProgressModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingContent}>
                <Text style={styles.modalTitle}>Progreso del usuario</Text>
                <Text style={styles.modalSubtitle}>{progressUser?.name}</Text>
              </View>
              <TouchableOpacity onPress={closeProgressModal} disabled={loadingProgress}>
                <Ionicons name="close" size={27} color="#334155" />
              </TouchableOpacity>
            </View>

            {loadingProgress ? (
              <View style={styles.progressLoading}>
                <ActivityIndicator color="#2563EB" />
                <Text style={styles.exerciseLoadingText}>Cargando progreso...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {!progressEntries.length ? (
                  <View style={styles.noExercisesCard}>
                    <Text style={styles.noExercisesText}>
                      Este usuario todavía no ha completado una rutina.
                    </Text>
                  </View>
                ) : (
                  progressEntries.map((entry) => (
                    <View key={entry.id} style={styles.progressCard}>
                      <Text style={styles.progressRoutine}>{entry.routineTitle}</Text>
                      <Text style={styles.progressDate}>
                        {new Date(entry.completedAt).toLocaleString("es-GT")}
                      </Text>
                      <Text style={styles.progressSummary}>
                        {entry.totalExercises} ejercicios completados
                      </Text>
                      {entry.exercises.map((exercise, index) => (
                        <View key={`${entry.id}-${index}`} style={styles.progressExercise}>
                          <Text style={styles.progressExerciseName}>{exercise.name}</Text>
                          <Text style={styles.progressExerciseValue}>
                            {exercise.type.toLowerCase().includes("cardio")
                              ? `${exercise.durationMinutes ?? 0} minutos`
                              : exercise.weightKg !== null
                                ? `${exercise.weightKg} kg`
                                : "Completado"}
                          </Text>
                          {exercise.notes ? (
                            <Text style={styles.progressNotes}>{exercise.notes}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </ScrollView>
            )}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#1D4ED8", fontSize: 19, fontWeight: "bold" },
  userInfo: { flex: 1, marginHorizontal: 11 },
  userName: { color: "#111827", fontSize: 16, fontWeight: "bold" },
  userEmail: { color: "#64748B", fontSize: 12, marginTop: 3 },
  statusText: { fontSize: 12, fontWeight: "700", marginTop: 5 },
  routineCount: { color: "#64748B", fontSize: 11, marginTop: 3 },
  actions: { alignItems: "flex-end", gap: 7 },
  progressButton: {
    backgroundColor: "#F0FDFA",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  progressButtonText: { color: "#0F766E", fontSize: 11, fontWeight: "bold" },
  routineButton: {
    backgroundColor: "#E0E7FF",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  routineButtonText: { color: "#4338CA", fontSize: 11, fontWeight: "bold" },
  assignButton: {
    backgroundColor: "#2563EB",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  assignText: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },
  releaseButton: {
    backgroundColor: "#FEF2F2",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  releaseText: { color: "#B91C1C", fontSize: 12, fontWeight: "bold" },
  busyBadge: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8 },
  busyText: { fontSize: 11, fontWeight: "bold" },
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
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "92%",
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  modalHeadingContent: { flex: 1 },
  modalTitle: { color: "#111827", fontSize: 24, fontWeight: "bold" },
  modalSubtitle: { color: "#64748B", fontSize: 15, marginTop: 4 },
  formLabel: { color: "#374151", fontWeight: "600", marginTop: 12, marginBottom: 7 },
  formInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 13,
    color: "#111827",
    fontSize: 16,
  },
  levelOptions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  levelOption: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    justifyContent: "center",
  },
  selectedLevelOption: { backgroundColor: "#DBEAFE", borderColor: "#2563EB" },
  levelOptionText: { color: "#475569", fontWeight: "600" },
  selectedLevelText: { color: "#1D4ED8" },
  exerciseLoading: { alignItems: "center", padding: 18 },
  exerciseLoadingText: { color: "#64748B", marginTop: 8 },
  exerciseOption: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  selectedExerciseOption: { borderColor: "#60A5FA", backgroundColor: "#EFF6FF" },
  exerciseOptionInfo: { flex: 1, marginRight: 10 },
  exerciseOptionName: { color: "#1E293B", fontWeight: "700" },
  exerciseOptionDetails: { color: "#64748B", fontSize: 12, marginTop: 4 },
  noExercisesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
  },
  noExercisesText: { color: "#64748B", lineHeight: 19 },
  saveRoutineButton: {
    backgroundColor: "#2563EB",
    minHeight: 54,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 10,
  },
  saveRoutineText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  progressLoading: { alignItems: "center", padding: 24 },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  progressRoutine: { color: "#1E293B", fontSize: 16, fontWeight: "bold" },
  progressDate: { color: "#64748B", fontSize: 12, marginTop: 4 },
  progressSummary: { color: "#2563EB", fontSize: 12, fontWeight: "600", marginTop: 7 },
  progressExercise: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 9,
    marginTop: 9,
  },
  progressExerciseName: { color: "#334155", fontWeight: "600" },
  progressExerciseValue: { color: "#16A34A", fontWeight: "bold", marginTop: 3 },
  progressNotes: { color: "#64748B", fontSize: 12, marginTop: 3 },
});
