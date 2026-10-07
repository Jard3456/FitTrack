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

## Conexión con la base de datos

La aplicación usa un backend REST para sincronizar el progreso del usuario. Copia `.env.example` como `.env` y configura:

```env
EXPO_PUBLIC_DATABASE_API_URL=https://tu-backend.example.com/api
EXPO_PUBLIC_DATABASE_USER_ID=usuario-demo
```

El backend debe implementar estos endpoints y aceptar JSON:

- `GET /progress/:userId`
- `PUT /progress/:userId`

- `GET /exercises/custom`
- `POST /exercises/custom`
- `DELETE /exercises/custom/:exerciseId`

El cuerpo enviado contiene `userId`, `name`, `weight`, `height` y `objective`. Si la URL no está configurada o el backend no está disponible, la app conserva el progreso en `AsyncStorage`.

Los ejercicios personalizados se guardan con el `user_id` de la sesión autenticada y solo ese usuario puede consultarlos o eliminarlos. La biblioteca traduce al español las categorías, músculos, dificultades y equipos de los ejercicios externos; los nombres e instrucciones que vienen como texto libre desde API Ninjas conservan su contenido original cuando no existe una traducción definida.

## Inicio de sesión y registro

Al abrir la aplicación se muestra el inicio de sesión. También se puede cambiar al formulario de registro. El backend debe implementar:

- `POST /auth/register` con `{ name, email, password }`
- `POST /auth/login` con `{ email, password }`

Ambos endpoints responden con `{ token, user: { id, name, email, role } }`. Los roles disponibles son `usuario`, `entrenador` y `administrador`. El registro público siempre crea cuentas con el rol `usuario`; la contraseña debe guardarse en MySQL como hash, nunca como texto plano. El esquema inicial está en `database/schema.sql`.

Para convertir una cuenta existente en el primer administrador, ejecuta una sola vez en MySQL:

```sql
UPDATE fittrack.users
SET role = 'administrador'
WHERE email = 'correo-del-administrador@ejemplo.com';
```

Los administradores pueden consultar usuarios con `GET /api/users` y cambiar roles con `PATCH /api/users/:userId/role` enviando `{ "role": "entrenador" }`.

Para levantar el backend local:

```bash
cd server
npm install
npm start
```

Antes de abrir la app, ejecuta `database/schema.sql` en MySQL y configura `EXPO_PUBLIC_DATABASE_API_URL` según el dispositivo: `http://127.0.0.1:3000/api` para web/iOS Simulator, `http://10.0.2.2:3000/api` para emulador Android o la IP local de tu PC para un teléfono físico.

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
