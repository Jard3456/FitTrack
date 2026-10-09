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
  createRoutineForUser,
  ExerciseCompletionInput,
  getAssignedRoutines,
} from "../services/routinesApi";
import { getCustomExercises } from "../services/customExercisesApi";
import { getTrainerUsers, TrainerUser } from "../services/trainerUsersApi";
import { AuthUser } from "../services/authApi";
import { Exercise } from "../types/exercise";

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

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function RoutineCalendar({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const selectedDate = parseLocalDate(value);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const monthLabel = visibleMonth.toLocaleDateString("es-GT", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          style={styles.calendarArrow}
          onPress={() => setVisibleMonth(new Date(year, month - 1, 1))}
          disabled={disabled}
        >
          <Ionicons name="chevron-back" size={22} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.calendarMonth}>{monthLabel}</Text>
        <TouchableOpacity
          style={styles.calendarArrow}
          onPress={() => setVisibleMonth(new Date(year, month + 1, 1))}
          disabled={disabled}
        >
          <Ionicons name="chevron-forward" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarWeekRow}>
        {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
          <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.calendarDay} />;
          const date = new Date(year, month, day);
          const dateValue = formatLocalDate(date);
          const selected = dateValue === value;
          const isToday = dateValue === formatLocalDate();

          return (
            <TouchableOpacity
              key={dateValue}
              style={styles.calendarDay}
              onPress={() => onChange(dateValue)}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.calendarDayInner,
                  isToday && styles.calendarToday,
                  selected && styles.calendarSelected,
                ]}
              >
                <Text
                  style={[
                    styles.calendarDayText,
                    isToday && styles.calendarTodayText,
                    selected && styles.calendarSelectedText,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.calendarTodayButton}
        onPress={() => {
          const today = new Date();
          setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
          onChange(formatLocalDate(today));
        }}
        disabled={disabled}
      >
        <Text style={styles.calendarTodayButtonText}>Seleccionar hoy</Text>
      </TouchableOpacity>
    </View>
  );
}

type Props = {
  userRole?: AuthUser["role"];
};

export default function RoutinesScreen({ userRole }: Props) {
  const [routines, setRoutines] = useState<AssignedRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<RoutineFilter>("today");
  const [selectedRoutine, setSelectedRoutine] = useState<AssignedRoutine | null>(null);
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraft>>({});
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [trainerUsers, setTrainerUsers] = useState<TrainerUser[]>([]);
  const [trainerExercises, setTrainerExercises] = useState<Exercise[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineLevel, setRoutineLevel] = useState("Intermedio");
  const [routineDuration, setRoutineDuration] = useState("45");
  const [routineDate, setRoutineDate] = useState(formatLocalDate());
  const [loadingAssignmentData, setLoadingAssignmentData] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const today = formatLocalDate();
  const isTrainer = userRole === "entrenador";

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

  const openAssignModal = async () => {
    setAssignModalVisible(true);
    setLoadingAssignmentData(true);
    setSelectedExerciseIds([]);
    setRoutineTitle("");
    setRoutineLevel("Intermedio");
    setRoutineDuration("45");
    setRoutineDate(formatLocalDate());

    try {
      const [users, exercises] = await Promise.all([
        getTrainerUsers(),
        getCustomExercises(),
      ]);
      const assignedUsers = users.filter((user) => user.assignedToMe);
      setTrainerUsers(assignedUsers);
      setTrainerExercises(exercises);
      setSelectedUserId(assignedUsers[0]?.id ?? null);
    } catch (assignmentError) {
      setTrainerUsers([]);
      setTrainerExercises([]);
      Alert.alert(
        "No se pudo preparar la asignación",
        assignmentError instanceof Error
          ? assignmentError.message
          : "No se pudieron cargar tus usuarios y ejercicios."
      );
    } finally {
      setLoadingAssignmentData(false);
    }
  };

  const closeAssignModal = () => {
    if (!savingAssignment) setAssignModalVisible(false);
  };

  const toggleAssignedExercise = (exerciseId: number) => {
    setSelectedExerciseIds((currentIds) =>
      currentIds.includes(exerciseId)
        ? currentIds.filter((id) => id !== exerciseId)
        : [...currentIds, exerciseId]
    );
  };

  const saveAssignedRoutine = async () => {
    if (!selectedUserId) {
      Alert.alert("Selecciona un usuario", "Elige el usuario que recibirá la rutina.");
      return;
    }

    const durationMinutes = Number(routineDuration);
    if (
      !routineTitle.trim() ||
      !selectedExerciseIds.length ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(routineDate)
    ) {
      Alert.alert(
        "Datos incompletos",
        "Escribe un título, selecciona una fecha, indica la duración y agrega al menos un ejercicio."
      );
      return;
    }

    setSavingAssignment(true);
    try {
      await createRoutineForUser(selectedUserId, {
        title: routineTitle.trim(),
        level: routineLevel,
        durationMinutes,
        scheduledDate: routineDate,
        exerciseIds: selectedExerciseIds,
      });
      setAssignModalVisible(false);
      Alert.alert("Rutina asignada", "La rutina fue asignada correctamente.");
    } catch (assignmentError) {
      Alert.alert(
        "No se pudo asignar la rutina",
        assignmentError instanceof Error
          ? assignmentError.message
          : "No se pudo guardar la rutina."
      );
    } finally {
      setSavingAssignment(false);
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
        {isTrainer
          ? "Asigna rutinas a tus usuarios seleccionando ejercicios y una fecha."
          : "Aquí encontrarás las rutinas asignadas por tu entrenador."}
      </Text>

      {isTrainer ? (
        <TouchableOpacity
          style={styles.assignRoutineButton}
          onPress={openAssignModal}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={21} color="#FFFFFF" />
          <Text style={styles.assignRoutineButtonText}>Asignar nueva rutina</Text>
        </TouchableOpacity>
      ) : null}

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

      {isTrainer ? (
        <Modal
          visible={assignModalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeAssignModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeadingContent}>
                  <Text style={styles.modalTitle}>Asignar rutina</Text>
                  <Text style={styles.modalSubtitle}>
                    Configura la rutina para uno de tus usuarios.
                  </Text>
                </View>
                <TouchableOpacity onPress={closeAssignModal} disabled={savingAssignment}>
                  <Ionicons name="close" size={27} color="#334155" />
                </TouchableOpacity>
              </View>

              {loadingAssignmentData ? (
                <View style={styles.centeredModalContent}>
                  <ActivityIndicator color="#2563EB" />
                  <Text style={styles.loadingText}>Cargando usuarios y ejercicios...</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.formLabel}>Usuario</Text>
                  {trainerUsers.length ? (
                    <View style={styles.userOptions}>
                      {trainerUsers.map((user) => {
                        const selected = selectedUserId === user.id;
                        return (
                          <TouchableOpacity
                            key={user.id}
                            style={[styles.userOption, selected && styles.selectedUserOption]}
                            onPress={() => setSelectedUserId(user.id)}
                            disabled={savingAssignment}
                          >
                            <View style={styles.userOptionInfo}>
                              <Text style={styles.userOptionName}>{user.name}</Text>
                              <Text style={styles.userOptionEmail}>{user.email}</Text>
                            </View>
                            <Ionicons
                              name={selected ? "checkmark-circle" : "ellipse-outline"}
                              size={23}
                              color={selected ? "#2563EB" : "#94A3B8"}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.assignmentNotice}>
                      <Text style={styles.assignmentNoticeText}>
                        Primero agrega usuarios desde la pestaña Entrenamiento.
                      </Text>
                    </View>
                  )}

                  <Text style={styles.formLabel}>Nombre de la rutina</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej. Rutina de fuerza"
                    value={routineTitle}
                    onChangeText={setRoutineTitle}
                    editable={!savingAssignment}
                  />

                  <Text style={styles.formLabel}>Fecha de la rutina</Text>
                  <RoutineCalendar
                    value={routineDate}
                    onChange={setRoutineDate}
                    disabled={savingAssignment}
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
                          disabled={savingAssignment}
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
                    value={routineDuration}
                    onChangeText={setRoutineDuration}
                    keyboardType="number-pad"
                    editable={!savingAssignment}
                  />

                  <Text style={styles.formLabel}>
                    Ejercicios registrados por ti ({selectedExerciseIds.length} seleccionados)
                  </Text>
                  {trainerExercises.length ? (
                    trainerExercises.map((exercise) => {
                      if (!exercise.customId) return null;
                      const selected = selectedExerciseIds.includes(exercise.customId);
                      return (
                        <TouchableOpacity
                          key={exercise.customId}
                          style={[styles.exerciseOption, selected && styles.selectedExerciseOption]}
                          onPress={() => toggleAssignedExercise(exercise.customId!)}
                          disabled={savingAssignment}
                        >
                          <View style={styles.exerciseOptionInfo}>
                            <Text style={styles.exerciseOptionName}>{exercise.name}</Text>
                            <Text style={styles.exerciseOptionDetails}>
                              {exercise.type} · {exercise.difficulty}
                            </Text>
                          </View>
                          <Ionicons
                            name={selected ? "checkmark-circle" : "ellipse-outline"}
                            size={23}
                            color={selected ? "#2563EB" : "#94A3B8"}
                          />
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.assignmentNotice}>
                      <Text style={styles.assignmentNoticeText}>
                        No tienes ejercicios personalizados registrados para asignar.
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.saveAssignmentButton}
                    onPress={saveAssignedRoutine}
                    disabled={savingAssignment || !trainerUsers.length || !trainerExercises.length}
                    activeOpacity={0.85}
                  >
                    {savingAssignment ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveAssignmentButtonText}>Guardar y asignar rutina</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      ) : null}
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
  assignRoutineButton: {
    backgroundColor: "#2563EB",
    borderRadius: 13,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  assignRoutineButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
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
  centeredModalContent: { alignItems: "center", paddingVertical: 30 },
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
  userOptions: { gap: 8 },
  userOption: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  selectedUserOption: { borderColor: "#60A5FA", backgroundColor: "#EFF6FF" },
  userOptionInfo: { flex: 1, marginRight: 8 },
  userOptionName: { color: "#1E293B", fontWeight: "700" },
  userOptionEmail: { color: "#64748B", fontSize: 12, marginTop: 3 },
  assignmentNotice: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 12,
  },
  assignmentNoticeText: { color: "#92400E", lineHeight: 18 },
  calendar: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calendarArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  calendarMonth: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  calendarWeekRow: { flexDirection: "row", marginBottom: 4 },
  calendarWeekDay: {
    width: "14.2857%",
    textAlign: "center",
    color: "#64748B",
    fontSize: 12,
    fontWeight: "bold",
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDay: {
    width: "14.2857%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayText: { color: "#334155", fontSize: 14 },
  calendarToday: { borderWidth: 1, borderColor: "#60A5FA" },
  calendarTodayText: { color: "#2563EB", fontWeight: "bold" },
  calendarSelected: { backgroundColor: "#2563EB", borderWidth: 0 },
  calendarSelectedText: { color: "#FFFFFF", fontWeight: "bold" },
  calendarTodayButton: {
    alignSelf: "center",
    backgroundColor: "#DBEAFE",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  calendarTodayButtonText: { color: "#1D4ED8", fontSize: 12, fontWeight: "bold" },
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
  saveAssignmentButton: {
    backgroundColor: "#2563EB",
    minHeight: 54,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 10,
  },
  saveAssignmentButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
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
