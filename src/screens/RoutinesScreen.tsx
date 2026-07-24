import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

import { routines } from "../data/exercises";
import RoutineCard from "../components/RoutineCard";

export default function RoutinesScreen() {

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Rutinas
      </Text>

      <Text style={styles.subtitle}>
        ¿Qué entrenaremos hoy?
      </Text>

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <RoutineCard
            title={item.title}
            level={item.level}
            exercises={item.exercises}
            duration={item.duration}
            icon={item.icon as any}
          />
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#F4F6F9",
    padding:20,
  },

  title:{
    fontSize:34,
    fontWeight:"bold",
    color:"#111827",
    marginTop:20,
  },

  subtitle:{
    fontSize:17,
    color:"#6B7280",
    marginBottom:25,
  },

});