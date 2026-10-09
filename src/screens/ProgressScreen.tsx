import React, { useEffect, useMemo, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getUserProgress,
  isDatabaseConfigured,
  saveUserProgress,
  UserProgress,
} from "../services/databaseApi";
import {
  calculateBmi,
  calculateWeightProgress,
  formatBmi,
  normalizeHeightInMeters,
  parseMeasurement,
} from "../utils/fitness";

const PROGRESS_STORAGE_KEY = "userProgress";

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

export default function ProgressScreen() {
  const [weight, setWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [startingWeight, setStartingWeight] = useState("");
  const [height, setHeight] = useState("");
  const [objective, setObjective] = useState("Ganar masa muscular");
  const [weightHistory, setWeightHistory] = useState<UserProgress["weightHistory"]>([]);
  const [canRecordWeight, setCanRecordWeight] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = formatLocalDate();

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const localData = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
        const localProgress = localData
          ? (JSON.parse(localData) as UserProgress)
          : null;

        if (localProgress) {
          setWeight(localProgress.weight ?? "");
          setTargetWeight(localProgress.targetWeight ?? "");
          setStartingWeight(localProgress.startingWeight ?? localProgress.weight ?? "");
          setHeight(localProgress.height ?? "");
          setObjective(localProgress.objective ?? "Ganar masa muscular");
          setWeightHistory(localProgress.weightHistory ?? []);
          setCanRecordWeight(
            localProgress.canRecordWeight ?? localProgress.lastWeightDate !== today
          );
        }

        if (isDatabaseConfigured) {
          const remoteProgress = await getUserProgress();

          if (remoteProgress) {
            setWeight(remoteProgress.weight ?? "");
            setTargetWeight(remoteProgress.targetWeight ?? "");
            setStartingWeight(
              remoteProgress.startingWeight ?? remoteProgress.weight ?? ""
            );
            setHeight(remoteProgress.height ?? "");
            setObjective(remoteProgress.objective ?? "Ganar masa muscular");
            setWeightHistory(remoteProgress.weightHistory ?? []);
            setCanRecordWeight(remoteProgress.canRecordWeight ?? true);
            await AsyncStorage.setItem(
              PROGRESS_STORAGE_KEY,
              JSON.stringify({ ...localProgress, ...remoteProgress })
            );
          }
        }
      } catch (error) {
        console.warn("No se pudo cargar el progreso", error);
      }
    };

    void loadProgress();
  }, [today]);

  const bmi = formatBmi(weight, height);
  const weightProgress = calculateWeightProgress(weight, targetWeight, startingWeight);
  const progressPercentage = weightProgress === null
    ? null
    : Math.round(weightProgress * 100);

  const historyForDisplay = useMemo(
    () => (weightHistory ?? []).slice(0, 7),
    [weightHistory]
  );

  const saveProgress = async () => {
    const parsedWeight = parseMeasurement(weight);
    const parsedTargetWeight = parseMeasurement(targetWeight);
    const heightInMeters = normalizeHeightInMeters(height);

    if (
      parsedWeight === null ||
      parsedWeight <= 0 ||
      heightInMeters === null
    ) {
      Alert.alert(
        "Datos incompletos",
        "Ingresa un peso válido y una altura válida en metros o centímetros."
      );
      return;
    }

    if (parsedTargetWeight === null || parsedTargetWeight <= 0) {
      Alert.alert("Meta inválida", "Ingresa una meta de peso mayor que cero.");
      return;
    }

    const normalizedWeight = parsedWeight.toFixed(2);
    const normalizedTargetWeight = parsedTargetWeight.toFixed(2);
    const normalizedHeight = heightInMeters.toFixed(2);
    const shouldAddLocalEntry = canRecordWeight;
    const nextHistory = shouldAddLocalEntry
      ? [
          { weight: normalizedWeight, recordedDate: today },
          ...(weightHistory ?? []).filter((entry) => entry.recordedDate !== today),
        ]
      : weightHistory ?? [];
    const data: UserProgress = {
      weight: normalizedWeight,
      targetWeight: normalizedTargetWeight,
      startingWeight: startingWeight || normalizedWeight,
      height: normalizedHeight,
      objective,
      lastWeightDate: today,
      canRecordWeight: false,
      weightHistory: nextHistory,
    };

    setSaving(true);
    setWeight(normalizedWeight);
    setTargetWeight(normalizedTargetWeight);
    setHeight(normalizedHeight);
    if (!startingWeight) setStartingWeight(normalizedWeight);
    if (shouldAddLocalEntry) setWeightHistory(nextHistory);

    try {
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      setSaving(false);
      Alert.alert("Error", "No se pudo guardar la información localmente.");
      return;
    }

    if (!isDatabaseConfigured) {
      setCanRecordWeight(false);
      setSaving(false);
      Alert.alert(
        "Guardado local",
        "El progreso se guardó en el dispositivo, pero el backend no está configurado."
      );
      return;
    }

    try {
      await saveUserProgress(data);
      setCanRecordWeight(false);
      Alert.alert("Éxito", "Progreso y meta guardados en la base de datos.");
    } catch (error) {
      Alert.alert(
        "Guardado local",
        error instanceof Error
          ? `${error.message} El progreso quedó guardado localmente.`
          : "No se pudo sincronizar con la base de datos. El progreso quedó guardado localmente."
      );
    } finally {
      setSaving(false);
    }
  };

  const getStatus = () => {
    const value = calculateBmi(weight, height);
    if (value === null) return "";
    if (value < 18.5) return "Bajo peso";
    if (value < 25) return "Peso normal";
    if (value < 30) return "Sobrepeso";
    return "Obesidad";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi Progreso</Text>
      <Text style={styles.subtitle}>
        Registra tu peso una vez al día y monitorea tu avance hacia la meta.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Peso de hoy (kg)</Text>
        <TextInput
          placeholder="Ej. 72"
          keyboardType="decimal-pad"
          style={[styles.input, !canRecordWeight && styles.disabledInput]}
          value={weight}
          onChangeText={setWeight}
          editable={canRecordWeight && !saving}
        />
        <Text style={canRecordWeight ? styles.helper : styles.lockedHelper}>
          {canRecordWeight
            ? "Puedes registrar tu peso de hoy."
            : "Ya registraste tu peso de hoy. Podrás actualizarlo mañana."}
        </Text>

        <Text style={styles.label}>Meta de peso (kg)</Text>
        <TextInput
          placeholder="Ej. 68"
          keyboardType="decimal-pad"
          style={styles.input}
          value={targetWeight}
          onChangeText={setTargetWeight}
          editable={!saving}
        />

        <Text style={styles.label}>Altura (m o cm)</Text>
        <TextInput
          placeholder="Ej. 1.75 o 175"
          keyboardType="decimal-pad"
          style={styles.input}
          value={height}
          onChangeText={setHeight}
          editable={!saving}
        />

        <Text style={styles.label}>Objetivo</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={objective} onValueChange={setObjective}>
            <Picker.Item label="💪 Ganar masa muscular" value="Ganar masa muscular" />
            <Picker.Item label="🔥 Perder grasa" value="Perder grasa" />
            <Picker.Item label="⚖️ Mantener peso" value="Mantener peso" />
            <Picker.Item label="🏃 Mejorar resistencia" value="Mejorar resistencia" />
            <Picker.Item label="🏋️ Aumentar fuerza" value="Aumentar fuerza" />
          </Picker>
        </View>
      </View>

      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>Progreso hacia tu meta</Text>
          <Text style={styles.goalPercentage}>
            {progressPercentage === null ? "--" : `${progressPercentage}%`}
          </Text>
        </View>
        {weightProgress === null ? (
          <Text style={styles.goalEmpty}>
            Registra tu peso actual, tu peso inicial y una meta para activar la barra.
          </Text>
        ) : (
          <>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPercentage ?? 0}%` }]}
              />
            </View>
            <View style={styles.goalValues}>
              <Text style={styles.goalValue}>Inicio: {startingWeight} kg</Text>
              <Text style={styles.goalValue}>Actual: {weight} kg</Text>
              <Text style={styles.goalValue}>Meta: {targetWeight} kg</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>Índice de Masa Corporal</Text>
        <Text style={styles.bmi}>{bmi ?? "--"}</Text>
        <Text style={styles.status}>{getStatus()}</Text>
      </View>

      {historyForDisplay.length ? (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Historial de peso</Text>
          {historyForDisplay.map((entry) => (
            <View key={entry.recordedDate} style={styles.historyRow}>
              <Text style={styles.historyDate}>{formatDisplayDate(entry.recordedDate)}</Text>
              <Text style={styles.historyWeight}>{entry.weight} kg</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, saving && styles.disabledButton]}
        onPress={saveProgress}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Guardando..." : canRecordWeight ? "Guardar progreso" : "Guardar meta y datos"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 34, fontWeight: "bold", color: "#111827", marginTop: 20 },
  subtitle: { color: "#6B7280", marginBottom: 25, fontSize: 16, lineHeight: 22 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, elevation: 4 },
  label: { fontWeight: "600", marginBottom: 8, color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 7,
    fontSize: 16,
    color: "#111827",
  },
  disabledInput: { backgroundColor: "#F1F5F9", color: "#64748B" },
  helper: { color: "#64748B", fontSize: 12, marginBottom: 18 },
  lockedHelper: { color: "#B45309", fontSize: 12, marginBottom: 18 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    marginBottom: 4,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  goalCard: {
    backgroundColor: "#FFFFFF",
    marginTop: 18,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
  },
  goalHeader: { flexDirection: "row", alignItems: "center" },
  goalTitle: { flex: 1, color: "#111827", fontSize: 18, fontWeight: "bold" },
  goalPercentage: { color: "#2563EB", fontSize: 22, fontWeight: "bold" },
  progressTrack: {
    height: 14,
    backgroundColor: "#DBEAFE",
    borderRadius: 7,
    overflow: "hidden",
    marginTop: 18,
  },
  progressFill: { height: "100%", backgroundColor: "#2563EB", borderRadius: 7 },
  goalValues: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  goalValue: { color: "#64748B", fontSize: 11 },
  goalEmpty: { color: "#64748B", lineHeight: 20, marginTop: 12 },
  resultCard: {
    backgroundColor: "#FFFFFF",
    marginTop: 18,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    elevation: 4,
  },
  resultTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  bmi: { fontSize: 48, fontWeight: "bold", color: "#2563EB", marginVertical: 10 },
  status: { fontSize: 18, color: "#16A34A", fontWeight: "600" },
  historyCard: {
    backgroundColor: "#FFFFFF",
    marginTop: 18,
    borderRadius: 20,
    padding: 20,
    elevation: 3,
  },
  historyTitle: { color: "#111827", fontSize: 18, fontWeight: "bold", marginBottom: 9 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingVertical: 10,
  },
  historyDate: { color: "#64748B" },
  historyWeight: { color: "#1D4ED8", fontWeight: "bold" },
  button: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 25,
    marginBottom: 10,
  },
  disabledButton: { backgroundColor: "#94A3B8" },
  buttonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 17 },
});
