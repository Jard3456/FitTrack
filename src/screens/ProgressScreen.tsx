import React, { useEffect, useState } from "react";
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
  formatBmi,
  normalizeHeightInMeters,
  parseMeasurement,
} from "../utils/fitness";

const PROGRESS_STORAGE_KEY = "userProgress";

export default function ProgressScreen() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [objective, setObjective] = useState("Ganar masa muscular");

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const localData = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
        const localProgress = localData
          ? (JSON.parse(localData) as UserProgress)
          : null;

        if (localProgress) {
          setWeight(localProgress.weight ?? "");
          setHeight(localProgress.height ?? "");
          setObjective(localProgress.objective ?? "Ganar masa muscular");
        }

        if (isDatabaseConfigured) {
          const remoteProgress = await getUserProgress();

          if (remoteProgress) {
            setWeight(remoteProgress.weight ?? "");
            setHeight(remoteProgress.height ?? "");
            setObjective(remoteProgress.objective ?? "Ganar masa muscular");
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
  }, []);

  const bmi = formatBmi(weight, height);

  const saveProgress = async () => {
    const parsedWeight = parseMeasurement(weight);
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

    const normalizedWeight = parsedWeight.toFixed(2);
    const normalizedHeight = heightInMeters.toFixed(2);
    const data: UserProgress = {
      weight: normalizedWeight,
      height: normalizedHeight,
      objective,
    };

    // Keep the displayed value consistent with the value stored in MySQL.
    setWeight(normalizedWeight);
    setHeight(normalizedHeight);

    try {
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      Alert.alert("Error", "No se pudo guardar la información localmente.");
      return;
    }

    if (!isDatabaseConfigured) {
      Alert.alert(
        "Guardado local",
        "El progreso se guardó en el dispositivo, pero el backend no está configurado."
      );
      return;
    }

    try {
      await saveUserProgress(data);
      Alert.alert("Éxito", "Progreso guardado en la base de datos.");
    } catch (error) {
      Alert.alert(
        "Guardado local",
        error instanceof Error
          ? `${error.message} El progreso quedó guardado localmente.`
          : "No se pudo sincronizar con la base de datos. El progreso quedó guardado localmente."
      );
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mi Progreso</Text>
      <Text style={styles.subtitle}>
        Registra tus datos para monitorear tu avance.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Peso (kg)</Text>
        <TextInput
          placeholder="Ej. 72"
          keyboardType="decimal-pad"
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
        />

        <Text style={styles.label}>Altura (m o cm)</Text>
        <TextInput
          placeholder="Ej. 1.75 o 175"
          keyboardType="decimal-pad"
          style={styles.input}
          value={height}
          onChangeText={setHeight}
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

      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>Índice de Masa Corporal</Text>
        <Text style={styles.bmi}>{bmi ?? "--"}</Text>
        <Text style={styles.status}>{getStatus()}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={saveProgress}>
        <Text style={styles.buttonText}>Guardar progreso</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9", padding: 20 },
  title: { fontSize: 34, fontWeight: "bold", color: "#111827", marginTop: 20 },
  subtitle: { color: "#6B7280", marginBottom: 25, fontSize: 16 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, elevation: 4 },
  label: { fontWeight: "600", marginBottom: 8, color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    marginBottom: 18,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    marginTop: 25,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    elevation: 4,
  },
  resultTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  bmi: { fontSize: 48, fontWeight: "bold", color: "#2563EB", marginVertical: 10 },
  status: { fontSize: 18, color: "#16A34A", fontWeight: "600" },
  button: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 18 },
});
