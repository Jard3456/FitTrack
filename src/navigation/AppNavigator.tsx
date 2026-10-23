import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, useWindowDimensions } from "react-native";

import HomeScreen from "../screens/HomeScreen";
import RoutinesScreen from "../screens/RoutinesScreen";
import ProgressScreen from "../screens/ProgressScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ApiResourcesScreen from "../screens/ApiResourcesScreen";
import AdminUsersScreen from "../screens/AdminUsersScreen";
import TrainerUsersScreen from "../screens/TrainerUsersScreen";
import AdminTripsScreen from "../screens/AdminTripsScreen";
import AdminMoviesScreen from "../screens/AdminMoviesScreen";
import ExerciseNavigator from "./ExerciseNavigator";
import { AuthUser } from "../services/authApi";
import ResponsiveScreen from "../components/ResponsiveScreen";

const Tab = createBottomTabNavigator<AppTabParamList>();

export type AppTabParamList = {
  Inicio: undefined;
  Rutinas: undefined;
  Progreso: undefined;
  Ejercicios: undefined;
  Recursos: undefined;
  Perfil: undefined;
  Administracion: undefined;
  Entrenamiento: undefined;
  Viajes: undefined;
  Peliculas: undefined;
};

type Props = {
  onLogout: () => void;
  userRole: AuthUser["role"];
};

export default function AppNavigator({ onLogout, userRole }: Props) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= 1100;
  const isCompactWeb = isWeb && width < 760;
  const [sidebarVisible, setSidebarVisible] = useState(true);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarPosition: isDesktopWeb ? "left" : "bottom",
          tabBarVariant: isDesktopWeb ? "material" : "uikit",
          tabBarLabelPosition: isDesktopWeb ? "beside-icon" : "below-icon",
          tabBarShowLabel: !isCompactWeb,
          tabBarStyle: isDesktopWeb
            ? [styles.desktopTabBar, !sidebarVisible && styles.hiddenTabBar]
            : undefined,
          tabBarLabelStyle: isDesktopWeb
            ? styles.desktopTabLabel
            : isWeb && width < 1100
              ? styles.tabletTabLabel
              : undefined,
          sceneStyle: styles.scene,
          headerStyle: {
            backgroundColor: "#2563EB",
          },
          headerTintColor: "#fff",
          headerLeft: isDesktopWeb
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={sidebarVisible ? "Ocultar menú" : "Mostrar menú"}
                  onPress={() => setSidebarVisible((visible) => !visible)}
                  style={styles.menuButton}
                >
                  <Ionicons
                    name={sidebarVisible ? "menu" : "menu-outline"}
                    size={25}
                    color="#FFFFFF"
                  />
                </Pressable>
              )
            : undefined,

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
              case "Administracion":
                icon = "people";
                break;
              case "Entrenamiento":
                icon = "people-circle";
                break;
              case "Viajes":
                icon = "airplane";
                break;
              case "Peliculas":
                icon = "film";
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
        <Tab.Screen name="Inicio">
          {() => <ResponsiveScreen><HomeScreen /></ResponsiveScreen>}
        </Tab.Screen>
        <Tab.Screen name="Rutinas">
          {() => <ResponsiveScreen><RoutinesScreen userRole={userRole} /></ResponsiveScreen>}
        </Tab.Screen>
        <Tab.Screen name="Progreso">
          {() => <ResponsiveScreen><ProgressScreen /></ResponsiveScreen>}
        </Tab.Screen>
        <Tab.Screen
          name="Ejercicios"
          children={() => <ResponsiveScreen><ExerciseNavigator /></ResponsiveScreen>}
          options={{ headerShown: false, title: "Biblioteca" }}
        />
        <Tab.Screen
          name="Recursos"
          children={() => <ResponsiveScreen><ApiResourcesScreen /></ResponsiveScreen>}
          options={{ title: "Recursos API" }}
        />
        {userRole === "administrador" ? (
          <Tab.Screen
            name="Administracion"
            children={() => <ResponsiveScreen><AdminUsersScreen /></ResponsiveScreen>}
            options={{ title: "Usuarios" }}
          />
        ) : null}
        {userRole === "entrenador" || userRole === "administrador" ? (
          <Tab.Screen
            name="Entrenamiento"
            options={{ title: userRole === "administrador" ? "Gestión global" : "Mis usuarios" }}
          >
            {() => <ResponsiveScreen><TrainerUsersScreen userRole={userRole} /></ResponsiveScreen>}
          </Tab.Screen>
        ) : null}
        {userRole === "administrador" ? (
          <>
            <Tab.Screen
              name="Viajes"
              children={() => <ResponsiveScreen><AdminTripsScreen /></ResponsiveScreen>}
              options={{ title: "Viajes" }}
            />
            <Tab.Screen
              name="Peliculas"
              children={() => <ResponsiveScreen><AdminMoviesScreen /></ResponsiveScreen>}
              options={{ title: "Películas" }}
            />
          </>
        ) : null}
        <Tab.Screen name="Perfil">
          {() => <ResponsiveScreen><ProfileScreen onLogout={onLogout} userRole={userRole} /></ResponsiveScreen>}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  scene: { backgroundColor: "#F4F6F9" },
  desktopTabBar: {
    width: 232,
    backgroundColor: "#FFFFFF",
    borderRightColor: "#E2E8F0",
    borderRightWidth: 1,
    paddingTop: 10,
  },
  hiddenTabBar: { display: "none" },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginRight: 8,
    cursor: "pointer",
  },
  desktopTabLabel: { fontSize: 13, fontWeight: "600" },
  tabletTabLabel: { fontSize: 10, lineHeight: 12 },
});
