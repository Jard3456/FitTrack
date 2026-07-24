# 💪 FitTrack

FitTrack es una aplicación móvil desarrollada con **React Native**, **Expo** y **TypeScript**, diseñada para ayudar a los usuarios a llevar un control de su progreso físico mediante el registro de peso, altura, cálculo del Índice de Masa Corporal (IMC) y seguimiento de objetivos de entrenamiento.

---

## 📱 Características

- 🏠 Pantalla principal con diseño moderno.
- 🏋️ Catálogo de rutinas de entrenamiento.
- 📊 Registro de progreso físico.
- ⚖️ Cálculo automático del IMC.
- 🎯 Selección del objetivo fitness.
- 👤 Perfil del usuario.
- 💾 Almacenamiento local utilizando AsyncStorage.
- 📱 Navegación mediante Bottom Tabs.

---

## 🛠️ Tecnologías utilizadas

- React Native
- Expo
- TypeScript
- React Navigation
- Expo Vector Icons
- AsyncStorage
- React Native Picker

---

## 📂 Estructura del proyecto

```
FitTrack
│
├── assets
│   └── images
│
├── src
│   ├── components
│   ├── data
│   ├── navigation
│   ├── screens
│   ├── styles
│   └── types
│
├── App.tsx
├── package.json
└── README.md
```

---

## 📋 Pantallas

### 🏠 Inicio

Pantalla principal donde el usuario visualiza información general de la aplicación y accesos rápidos.

---

### 🏋️ Rutinas

Lista de rutinas de entrenamiento con información como:

- Nombre
- Nivel
- Duración
- Número de ejercicios

---

### 📈 Progreso

Permite registrar:

- Peso
- Altura
- Objetivo

Además calcula automáticamente:

- Índice de Masa Corporal (IMC)
- Estado del IMC

Toda la información es almacenada localmente.

---

### 👤 Perfil

Muestra la información registrada por el usuario:

- Nombre
- Peso
- Altura
- Objetivo
- Estadísticas

Los datos son cargados automáticamente desde AsyncStorage.

---

## 🚀 Instalación

Clonar el proyecto

```bash
git clone https://github.com/JARD3456/FitTrack.git
```

Entrar a la carpeta

```bash
cd FitTrack
```

Instalar dependencias

```bash
npm install
```

Ejecutar el proyecto

```bash
npx expo start
```

---

## 📦 Dependencias principales

```bash
npm install @react-navigation/native
npm install @react-navigation/native-stack
npm install @react-navigation/bottom-tabs
npx expo install react-native-safe-area-context
npx expo install react-native-screens
npx expo install react-native-gesture-handler
npx expo install react-native-reanimated
npx expo install @react-native-async-storage/async-storage
npx expo install @react-native-picker/picker
npx expo install @expo/vector-icons
```

---

## 📸 Capturas

Agregar aquí capturas de:

- Pantalla Inicio
- Rutinas
- Progreso
- Perfil

---

## 👨‍💻 Autor

**JOSE RODRIGUEZ**

Proyecto desarrollado como práctica utilizando React Native, Expo y TypeScript.

---

## 📄 Licencia

Este proyecto es de uso educativo y puede utilizarse como base para futuros desarrollos.
## Componentes utilizados

- View
- Text
- ScrollView
- FlatList
- TextInput
- TouchableOpacity
- Image
- Picker
- Ionicons
- StyleSheet
- Alert