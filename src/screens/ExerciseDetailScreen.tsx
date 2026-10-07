import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { deleteCustomExercise } from "../services/customExercisesApi";
import { ExerciseStackParamList } from "../types/exercise";
import {
  translateDifficulty,
  translateEquipment,
  translateMuscle,
  translateType,
} from "../utils/exerciseTranslations";

type Props = NativeStackScreenProps<ExerciseStackParamList, "DetalleEjercicio">;

export default function ExerciseDetailScreen({ route, navigation }: Props) {
  const { exercise } = route.params;
  const type = translateType(exercise.type);
  const muscle = translateMuscle(exercise.muscle);
  const difficulty = translateDifficulty(exercise.difficulty);
  const equipment = translateEquipment(exercise.equipment);

  const removeCustomExercise = () => {
    if (!exercise.isCustom || !exercise.customId) return;

    Alert.alert(
      "Eliminar ejercicio",
      "¿Quieres eliminar este ejercicio de tu biblioteca?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCustomExercise(exercise.customId!);
              navigation.goBack();
            } catch (error) {
              Alert.alert(
                "No se pudo eliminar",
                error instanceof Error ? error.message : "Intenta nuevamente."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons
            name={exercise.isCustom ? "person" : "fitness"}
            size={46}
            color="#2563EB"
          />
        </View>
        <Text style={styles.title}>{exercise.name}</Text>
        <Text style={styles.muscle}>{muscle}</Text>
        {exercise.isCustom ? (
          <Text style={styles.customLabel}>Ejercicio personalizado</Text>
        ) : null}
      </View>

      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Ionicons name="barbell-outline" size={17} color="#2563EB" />
          <Text style={styles.chipText}>{type}</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="trending-up-outline" size={17} color="#2563EB" />
          <Text style={styles.chipText}>{difficulty}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Equipo</Text>
        <Text style={styles.body}>{equipment}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Cómo realizarlo</Text>
        <Text style={styles.body}>{exercise.instructions}</Text>
      </View>

      <View style={styles.safetyCard}>
        <View style={styles.safetyTitleRow}>
          <Ionicons name="shield-checkmark" size={22} color="#15803D" />
          <Text style={styles.safetyTitle}>Recomendación de seguridad</Text>
        </View>
        <Text style={styles.safetyBody}>{exercise.safetyInfo}</Text>
      </View>

      {exercise.isCustom ? (
        <TouchableOpacity style={styles.deleteButton} onPress={removeCustomExercise}>
          <Ionicons name="trash-outline" size={20} color="#B91C1C" />
          <Text style={styles.deleteButtonText}>Eliminar de mi biblioteca</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9" },
  content: { padding: 20, paddingBottom: 35 },
  hero: {
    backgroundColor: "#2563EB",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  heroIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  title: { color: "#FFFFFF", textAlign: "center", fontSize: 26, fontWeight: "bold" },
  muscle: { color: "#DBEAFE", fontSize: 16, marginTop: 6, fontWeight: "600" },
  customLabel: { color: "#CCFBF1", fontSize: 13, marginTop: 8, fontWeight: "600" },
  chipsRow: { flexDirection: "row", gap: 10, marginVertical: 16 },
  chip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chipText: { color: "#334155", fontWeight: "600", marginLeft: 7, flexShrink: 1 },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "bold", marginBottom: 9 },
  body: { color: "#475569", fontSize: 16, lineHeight: 25 },
  safetyCard: { backgroundColor: "#F0FDF4", borderRadius: 18, padding: 18 },
  safetyTitleRow: { flexDirection: "row", alignItems: "center" },
  safetyTitle: { color: "#166534", fontSize: 17, fontWeight: "bold", marginLeft: 8 },
  safetyBody: { color: "#166534", fontSize: 15, lineHeight: 23, marginTop: 10 },
  deleteButton: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 15,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: { color: "#B91C1C", fontWeight: "bold", marginLeft: 7 },
});
