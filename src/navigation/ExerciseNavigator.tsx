import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ExerciseListScreen from "../screens/ExerciseListScreen";
import ExerciseDetailScreen from "../screens/ExerciseDetailScreen";
import { ExerciseStackParamList } from "../types/exercise";

const Stack = createNativeStackNavigator<ExerciseStackParamList>();

export default function ExerciseNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ListaEjercicios"
        component={ExerciseListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DetalleEjercicio"
        component={ExerciseDetailScreen}
        options={{ title: "Detalle del ejercicio", headerTintColor: "#2563EB" }}
      />
    </Stack.Navigator>
  );
}
