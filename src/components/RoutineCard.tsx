import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  title: string;
  level: string;
  exercises: number;
  duration: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function RoutineCard({
  title,
  level,
  exercises,
  duration,
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

        <TouchableOpacity>
          <Text style={styles.button}>
            Ver rutina →
          </Text>
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

  button:{
    marginTop:10,
    color:"#2563EB",
    fontWeight:"bold",
    fontSize:15,
  }

});