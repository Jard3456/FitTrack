import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ExerciseStackParamList } from "../types/exercise";

type Props = NativeStackScreenProps<
  ExerciseStackParamList,
  "DetalleEjercicio"
>;

const formatLabel = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export default function ExerciseDetailScreen({ route }: Props) {
  const { exercise } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="fitness" size={46} color="#2563EB" />
        </View>
        <Text style={styles.title}>{exercise.name}</Text>
        <Text style={styles.muscle}>{formatLabel(exercise.muscle)}</Text>
      </View>

      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Ionicons name="barbell-outline" size={17} color="#2563EB" />
          <Text style={styles.chipText}>{formatLabel(exercise.type)}</Text>
        </View>
        <View style={styles.chip}>
          <Ionicons name="trending-up-outline" size={17} color="#2563EB" />
          <Text style={styles.chipText}>{formatLabel(exercise.difficulty)}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Equipo</Text>
        <Text style={styles.body}>{formatLabel(exercise.equipment)}</Text>
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
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, marginBottom: 14, elevation: 2 },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "bold", marginBottom: 9 },
  body: { color: "#475569", fontSize: 16, lineHeight: 25 },
  safetyCard: { backgroundColor: "#F0FDF4", borderRadius: 18, padding: 18 },
  safetyTitleRow: { flexDirection: "row", alignItems: "center" },
  safetyTitle: { color: "#166534", fontSize: 17, fontWeight: "bold", marginLeft: 8 },
  safetyBody: { color: "#166534", fontSize: 15, lineHeight: 23, marginTop: 10 },
});
