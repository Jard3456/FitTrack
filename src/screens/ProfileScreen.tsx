import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

export default function ProfileScreen() {
  const [weight, setWeight] = useState("--");
  const [height, setHeight] = useState("--");
  const [objective, setObjective] = useState("--");

  const [name, setName] = useState("JARD GAMES");
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem("userProgress");

      if (data) {
        const user = JSON.parse(data);

        setWeight(user.weight || "--");
        setHeight(user.height || "--");
        setObjective(user.objective || "--");
        setName(user.name || "JARD GAMES");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const saveName = async () => {
    if (!newName.trim()) return;

    try {
      const data = await AsyncStorage.getItem("userProgress");

      const user = data ? JSON.parse(data) : {};

      user.name = newName;

      await AsyncStorage.setItem(
        "userProgress",
        JSON.stringify(user)
      );

      setName(newName);
      setEditing(false);
      setNewName("");
    } catch (error) {
      console.log(error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.profileCard}>

        <View style={styles.avatar}>
          <Ionicons
            name="person"
            size={70}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.nameRow}>

          <Text style={styles.name}>
            {name}
          </Text>

          <TouchableOpacity
            onPress={() => {
              setNewName(name);
              setEditing(true);
            }}
          >
            <Ionicons
              name="pencil"
              size={22}
              color="#2563EB"
            />
          </TouchableOpacity>

        </View>

        <Text style={styles.level}>
          Nivel: Intermedio
        </Text>

        {editing && (

          <View style={styles.editContainer}>

            <TextInput
              style={styles.input}
              value={newName}
              placeholder="Nuevo nombre"
              onChangeText={setNewName}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveName}
            >

              <Text style={styles.saveText}>
                Guardar
              </Text>

            </TouchableOpacity>

          </View>

        )}

      </View>
            {/* Información */}

      <View style={styles.infoCard}>

        <View style={styles.row}>
          <Ionicons
            name="barbell"
            size={24}
            color="#2563EB"
          />

          <Text style={styles.label}>
            Peso
          </Text>

          <Text style={styles.value}>
            {weight} kg
          </Text>

        </View>

        <View style={styles.row}>
          <Ionicons
            name="resize"
            size={24}
            color="#2563EB"
          />

          <Text style={styles.label}>
            Altura
          </Text>

          <Text style={styles.value}>
            {height} m
          </Text>

        </View>

        <View style={styles.row}>
          <Ionicons
            name="flag"
            size={24}
            color="#2563EB"
          />

          <Text style={styles.label}>
            Objetivo
          </Text>

          <Text style={styles.value}>
            {objective}
          </Text>

        </View>

      </View>

      {/* Estadísticas */}

      <View style={styles.statsContainer}>

        <View style={styles.statCard}>

          <Text style={styles.number}>
            24
          </Text>

          <Text style={styles.statText}>
            Entrenamientos
          </Text>

        </View>

        <View style={styles.statCard}>

          <Text style={styles.number}>
            18
          </Text>

          <Text style={styles.statText}>
            Rutinas completadas
          </Text>

        </View>

      </View>

      {/* Cerrar sesión */}

      <TouchableOpacity style={styles.logoutButton}>

        <Ionicons
          name="log-out-outline"
          size={22}
          color="#EF4444"
        />

        <Text style={styles.logoutText}>
          Cerrar sesión
        </Text>

      </TouchableOpacity>

    </ScrollView>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F4F6F9",
    padding: 20,
  },

  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 20,
    marginBottom: 20,
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    padding: 25,
    elevation: 5,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },

  level: {
    color: "#2563EB",
    marginTop: 5,
    fontWeight: "600",
  },

  editContainer: {
    width: "100%",
    marginTop: 20,
  },

  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  saveButton: {
    backgroundColor: "#2563EB",
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  saveText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
    row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  label: {
    flex: 1,
    marginLeft: 12,
    fontSize: 17,
    color: "#374151",
  },

  value: {
    fontWeight: "bold",
    color: "#111827",
    fontSize: 16,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  statCard: {
    backgroundColor: "#FFFFFF",
    width: "48%",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 5,
  },

  number: {
    fontSize: 32,
    color: "#2563EB",
    fontWeight: "bold",
  },

  statText: {
    marginTop: 8,
    color: "#6B7280",
    textAlign: "center",
  },

  logoutButton: {
    marginTop: 30,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    elevation: 4,
  },

  logoutText: {
    color: "#EF4444",
    marginLeft: 10,
    fontWeight: "bold",
    fontSize: 17,
  },

});