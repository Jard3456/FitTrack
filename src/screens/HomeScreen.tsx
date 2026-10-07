import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AppTabParamList } from "../navigation/AppNavigator";
import {
  getUserProgress,
  isDatabaseConfigured,
  UserProgress,
} from "../services/databaseApi";
import { formatBmi } from "../utils/fitness";

const PROGRESS_STORAGE_KEY = "userProgress";

type Navigation = BottomTabNavigationProp<AppTabParamList>;
type QuickAccessTarget = keyof AppTabParamList;

const quickAccessItems: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  target: QuickAccessTarget;
}> = [
  { label: "Rutinas", icon: "barbell", target: "Rutinas" },
  { label: "Progreso", icon: "stats-chart", target: "Progreso" },
  { label: "Perfil", icon: "person", target: "Perfil" },
  { label: "Ejercicios", icon: "fitness", target: "Ejercicios" },
];

export default function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      const localData = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
      const localProgress = localData
        ? (JSON.parse(localData) as UserProgress)
        : null;
      let nextProgress = localProgress;

      if (isDatabaseConfigured) {
        try {
          const remoteProgress = await getUserProgress();
          if (remoteProgress) {
            nextProgress = { ...localProgress, ...remoteProgress };
            await AsyncStorage.setItem(
              PROGRESS_STORAGE_KEY,
              JSON.stringify(nextProgress)
            );
          }
        } catch (error) {
          console.warn("No se pudo actualizar el resumen desde la base de datos", error);
        }
      }

      setProgress(nextProgress);
    } catch (error) {
      console.warn("No se pudo cargar el resumen", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProgress();
    }, [loadProgress])
  );

  const bmi = progress
    ? formatBmi(progress.weight ?? "", progress.height ?? "")
    : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.header}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.welcome}>Hola 👋</Text>
        <Text style={styles.title}>Bienvenido a</Text>
        <Text style={styles.appName}>FITTRACK</Text>
        <Text style={styles.slogan}>Entrena · Registra · Supérate</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.quote}>
          “Cada entrenamiento te acerca a tu mejor versión.”
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("Rutinas")}
      >
        <Ionicons name="barbell" size={22} color="#FFFFFF" />
        <Text style={styles.buttonText}>Comenzar entrenamiento</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.section}>Accesos rápidos</Text>
      <View style={styles.grid}>
        {quickAccessItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.box}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(item.target)}
          >
            <Ionicons name={item.icon} size={35} color="#2563EB" />
            <Text style={styles.boxText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Resumen</Text>
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.number}>
            {progress?.weight ? `${progress.weight} kg` : "--"}
          </Text>
          <Text style={styles.statText}>Peso</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.number}>{bmi ?? "--"}</Text>
          <Text style={styles.statText}>IMC</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.objective} numberOfLines={2}>
            {progress?.objective ?? "Sin datos"}
          </Text>
          <Text style={styles.statText}>Objetivo</Text>
        </View>
      </View>

      {!progress && (
        <TouchableOpacity
          style={styles.completeDataButton}
          onPress={() => navigation.navigate("Progreso")}
        >
          <Text style={styles.completeDataText}>
            Completa tu progreso para ver tu resumen
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9" },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingBottom: 50,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logo: { width: 130, height: 130, marginBottom: 8 },
  welcome: { color: "#FFFFFF", fontSize: 22, marginTop: 5 },
  title: { color: "#FFFFFF", fontSize: 22 },
  appName: { color: "#FFFFFF", fontSize: 40, fontWeight: "bold" },
  slogan: { color: "#FFFFFF", fontSize: 16, marginTop: 5 },
  card: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    padding: 20,
    borderRadius: 18,
    elevation: 5,
  },
  quote: {
    textAlign: "center",
    fontSize: 18,
    fontStyle: "italic",
    color: "#555555",
  },
  button: {
    marginHorizontal: 20,
    backgroundColor: "#2563EB",
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  section: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 15,
    color: "#111827",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
  },
  box: {
    width: "42%",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 5,
  },
  boxText: { marginTop: 10, fontWeight: "bold", fontSize: 16, color: "#111827" },
  stats: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minHeight: 100,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  number: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2563EB",
    textAlign: "center",
  },
  objective: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563EB",
    textAlign: "center",
  },
  statText: { marginTop: 8, color: "#6B7280", textAlign: "center" },
  completeDataButton: {
    marginHorizontal: 20,
    marginBottom: 35,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
  },
  completeDataText: { color: "#1D4ED8", fontWeight: "600" },
});
