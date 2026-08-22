import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import RoutinesScreen from "../screens/RoutinesScreen";
import ProgressScreen from "../screens/ProgressScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ApiResourcesScreen from "../screens/ApiResourcesScreen";
import ExerciseNavigator from "./ExerciseNavigator";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: "#2563EB",
          },
          headerTintColor: "#fff",

          tabBarActiveTintColor: "#2563EB",

          tabBarIcon: ({ color, size }) => {
            let icon: keyof typeof Ionicons.glyphMap = "home";

            switch (route.name) {
              case "Inicio":
                icon = "home";
                break;
              case "Rutinas":
                icon = "barbell";
                break;
              case "Progreso":
                icon = "stats-chart";
                break;
              case "Perfil":
                icon = "person";
                break;
              case "Ejercicios":
                icon = "fitness";
                break;
              case "Recursos":
                icon = "cloud-download";
                break;
            }

            return (
              <Ionicons
                name={icon}
                size={size}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Rutinas" component={RoutinesScreen} />
        <Tab.Screen name="Progreso" component={ProgressScreen} />
        <Tab.Screen
          name="Ejercicios"
          component={ExerciseNavigator}
          options={{ headerShown: false, title: "Biblioteca" }}
        />
        <Tab.Screen
          name="Recursos"
          component={ApiResourcesScreen}
          options={{ title: "Recursos API" }}
        />
        <Tab.Screen name="Perfil" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
