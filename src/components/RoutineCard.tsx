import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  title: string;
  level: string;
  exercises: number;
  exerciseNames: string[];
  duration: string;
  completedCount: number;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function RoutineCard({
  title,
  level,
  exercises,
  exerciseNames,
  duration,
  completedCount,
  onPress,
  icon,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon}
          size={34}
          color="#2563EB"
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>

        <Text style={styles.level}>
          {level}
        </Text>

        <Text style={styles.details}>
          {exercises} ejercicios • {duration}
        </Text>

        <Text style={styles.exerciseList} numberOfLines={2}>
          {exerciseNames.join(" • ")}
        </Text>

        <Text style={styles.completedText}>
          {completedCount > 0
            ? `Completada ${completedCount} ${completedCount === 1 ? "vez" : "veces"}`
            : "Aún no completada"}
        </Text>

        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.button}>Abrir rutina →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  card:{
    flexDirection:"row",
    backgroundColor:"#FFFFFF",
    borderRadius:22,
    padding:18,
    marginBottom:18,
    elevation:5,
  },

  iconContainer:{
    width:70,
    height:70,
    borderRadius:35,
    backgroundColor:"#EFF6FF",
    justifyContent:"center",
    alignItems:"center",
    marginRight:15,
  },

  info:{
    flex:1,
    justifyContent:"center",
  },

  title:{
    fontSize:20,
    fontWeight:"bold",
    color:"#111827",
  },

  level:{
    color:"#2563EB",
    marginTop:5,
    fontWeight:"600",
  },

  details:{
    color:"#6B7280",
    marginTop:5,
  },

  exerciseList:{
    marginTop:10,
    color:"#475569",
    fontSize:13,
    lineHeight:18,
  },
  completedText:{
    marginTop:7,
    color:"#64748B",
    fontSize:12,
  },
  button:{
    marginTop:10,
    color:"#2563EB",
    fontWeight:"bold",
    fontSize:15,
  }

});
