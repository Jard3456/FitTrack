import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getExercises } from "../services/exercisesApi";
import {
  createCustomExercise,
  CustomExerciseInput,
  getCustomExercises,
} from "../services/customExercisesApi";
import { Exercise, ExerciseStackParamList } from "../types/exercise";
import {
  translateDifficulty,
  translateMuscle,
  translateType,
} from "../utils/exerciseTranslations";

type Props = NativeStackScreenProps<ExerciseStackParamList, "ListaEjercicios">;

const emptyCustomExercise: CustomExerciseInput = {
  name: "",
  type: "Fuerza",
  muscle: "General",
  difficulty: "Intermedio",
  equipment: "Sin equipo",
  instructions: "",
  safetyInfo: "Usa una técnica controlada y detente si sientes dolor.",
};

const translateExercise = (exercise: Exercise) => ({
  ...exercise,
  type: translateType(exercise.type),
  muscle: translateMuscle(exercise.muscle),
  difficulty: translateDifficulty(exercise.difficulty),
});

export default function ExerciseListScreen({ navigation }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
  const [error, setError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [customExercise, setCustomExercise] =
    useState<CustomExerciseInput>(emptyCustomExercise);

  const loadExercises = useCallback(async (value = "", isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    const [apiResult, customResult] = await Promise.allSettled([
      getExercises(value),
      getCustomExercises(),
    ]);
    const apiExercises =
      apiResult.status === "fulfilled"
        ? apiResult.value.map(translateExercise)
        : [];
    const customExercises =
      customResult.status === "fulfilled"
        ? customResult.value
            .filter((item) => {
              const query = value.trim().toLowerCase();
              return (
                !query ||
                `${item.name} ${item.muscle} ${item.equipment}`
                  .toLowerCase()
                  .includes(query)
              );
            })
            .map(translateExercise)
        : [];

    if (!apiExercises.length && !customExercises.length) {
      const failedResult =
        apiResult.status === "rejected" ? apiResult : customResult;
      if (failedResult.status === "rejected") {
        setError(
          failedResult.reason instanceof Error
            ? failedResult.reason.message
            : "No se pudieron cargar los ejercicios."
        );
      }
    }

    setExercises([...customExercises, ...apiExercises]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadExercises("");
  }, [loadExercises]);

  const updateCustomField = (
    field: keyof CustomExerciseInput,
    value: string
  ) => {
    setCustomExercise((current) => ({ ...current, [field]: value }));
  };

  const saveCustomExercise = async () => {
    if (!customExercise.name.trim() || !customExercise.instructions.trim()) {
      setError("El nombre y las instrucciones son obligatorios.");
      return;
    }

    setSavingCustom(true);
    setError("");

    try {
      await createCustomExercise({
        ...customExercise,
        name: customExercise.name.trim(),
        muscle: customExercise.muscle.trim() || "General",
        equipment: customExercise.equipment.trim() || "Sin equipo",
        instructions: customExercise.instructions.trim(),
        safetyInfo: customExercise.safetyInfo.trim(),
      });
      setCustomExercise(emptyCustomExercise);
      setModalVisible(false);
      await loadExercises(search, true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar el ejercicio personalizado."
      );
    } finally {
      setSavingCustom(false);
    }
  };

  const renderItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => navigation.navigate("DetalleEjercicio", { exercise: item })}
    >
      <View style={styles.iconCircle}>
        <Ionicons
          name={item.isCustom ? "person" : "fitness"}
          size={28}
          color="#2563EB"
        />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.exerciseName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.isCustom ? (
            <Text style={styles.customBadge}>Mío</Text>
          ) : null}
        </View>
        <Text style={styles.muscle}>{item.muscle}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{item.type}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{item.difficulty}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Biblioteca</Text>
      <Text style={styles.subtitle}>
        Explora ejercicios y crea los tuyos para tu cuenta.
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

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setError("");
          setModalVisible(true);
        }}
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Agregar ejercicio personalizado</Text>
      </TouchableOpacity>

      <View style={styles.apiStatus}>
        <Ionicons name="language" size={17} color="#15803D" />
        <Text style={styles.apiStatusText}>
          Información y categorías mostradas en español
        </Text>
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

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuevo ejercicio</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#334155" />
            </TouchableOpacity>
          </View>

          <Text style={styles.formLabel}>Nombre *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Ej. Zancada lateral"
            value={customExercise.name}
            onChangeText={(value) => updateCustomField("name", value)}
          />

          <Text style={styles.formLabel}>Tipo</Text>
          <View style={styles.formPicker}>
            <Picker
              selectedValue={customExercise.type}
              onValueChange={(value) => updateCustomField("type", value)}
            >
              <Picker.Item label="Fuerza" value="Fuerza" />
              <Picker.Item label="Cardio" value="Cardio" />
              <Picker.Item label="Estiramiento" value="Estiramiento" />
              <Picker.Item label="Pliometría" value="Pliometría" />
            </Picker>
          </View>

          <Text style={styles.formLabel}>Músculo</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Ej. Piernas"
            value={customExercise.muscle}
            onChangeText={(value) => updateCustomField("muscle", value)}
          />

          <Text style={styles.formLabel}>Dificultad</Text>
          <View style={styles.formPicker}>
            <Picker
              selectedValue={customExercise.difficulty}
              onValueChange={(value) => updateCustomField("difficulty", value)}
            >
              <Picker.Item label="Principiante" value="Principiante" />
              <Picker.Item label="Intermedio" value="Intermedio" />
              <Picker.Item label="Avanzado" value="Avanzado" />
            </Picker>
          </View>

          <Text style={styles.formLabel}>Equipo</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Ej. Mancuernas"
            value={customExercise.equipment}
            onChangeText={(value) => updateCustomField("equipment", value)}
          />

          <Text style={styles.formLabel}>Instrucciones *</Text>
          <TextInput
            style={[styles.formInput, styles.multilineInput]}
            placeholder="Describe cómo realizarlo"
            value={customExercise.instructions}
            onChangeText={(value) => updateCustomField("instructions", value)}
            multiline
          />

          <Text style={styles.formLabel}>Recomendación de seguridad</Text>
          <TextInput
            style={[styles.formInput, styles.multilineInput]}
            placeholder="Indica una recomendación"
            value={customExercise.safetyInfo}
            onChangeText={(value) => updateCustomField("safetyInfo", value)}
            multiline
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveCustomExercise}
            disabled={savingCustom}
          >
            {savingCustom ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar ejercicio</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
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
  addButton: {
    backgroundColor: "#0F766E",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  addButtonText: { color: "#FFFFFF", fontWeight: "bold", marginLeft: 7 },
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
  nameRow: { flexDirection: "row", alignItems: "center" },
  exerciseName: { color: "#111827", fontSize: 17, fontWeight: "bold", flex: 1 },
  customBadge: {
    color: "#0F766E",
    backgroundColor: "#CCFBF1",
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 5,
  },
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
  modalContainer: { flex: 1, backgroundColor: "#F4F6F9" },
  modalContent: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  modalTitle: { flex: 1, color: "#111827", fontSize: 28, fontWeight: "bold" },
  formLabel: { color: "#374151", fontWeight: "600", marginBottom: 7, marginTop: 12 },
  formInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 14,
    color: "#111827",
    fontSize: 16,
  },
  formPicker: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    overflow: "hidden",
  },
  multilineInput: { minHeight: 100, textAlignVertical: "top" },
  saveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 17 },
});
