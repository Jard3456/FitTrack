# FitTrack

FitTrack es una aplicacion multiplataforma para registrar el progreso fisico y administrar rutinas de entrenamiento. La interfaz se desarrolla con Expo, React Native y TypeScript; el backend REST utiliza Node.js, Express y MySQL. El cliente puede ejecutarse como web o como aplicacion Android.

La documentacion tecnica ampliada esta en [FitTrack_Documentacion_Tecnica.pdf](output/pdf/FitTrack_Documentacion_Tecnica.pdf).

## Funcionalidades

- Registro de cuenta con verificacion del correo mediante codigo y acceso con contrasena.
- Roles de usuario, entrenador y administrador.
- Registro de peso, altura, objetivo, IMC e historial de progreso.
- Consulta de rutinas por fecha y registro de ejercicios completados.
- Biblioteca de ejercicios externos y ejercicios personalizados.
- Asignacion de usuarios y rutinas por entrenadores; el administrador puede hacer gestion global.
- Pantallas administrativas para viajes programados y rankings/reviews de peliculas.
- Interfaz adaptable a web de escritorio, tablet, telefono y Android.
- Cierre automatico de sesion tras cinco minutos de inactividad en web. En la aplicacion Android la sesion permanece abierta hasta cerrarla manualmente.

## Tecnologias

- Expo SDK 57, React Native 0.86 y TypeScript.
- React Navigation y Expo Vector Icons.
- AsyncStorage para la sesion y datos locales de la app.
- Node.js 22+, Express 5, MySQL, JWT, bcryptjs y Nodemailer.
- AWS Amplify para la web y EAS Build para Android.

## Estructura

```text
FitTrack/
|-- assets/                 Logo e imagenes
|-- database/schema.sql     Esquema de MySQL
|-- scripts/start-all.js    Inicio conjunto local
|-- server/index.js         API REST
|-- server/init-db.js       Inicializacion/migraciones de base de datos
|-- src/components/         Componentes reutilizables
|-- src/navigation/         Navegacion y control de vistas
|-- src/screens/            Pantallas de la app
|-- src/services/           Acceso a APIs
|-- src/types/              Tipos TypeScript
|-- amplify.yml             Build de Amplify
|-- app.json                Configuracion Expo, web e iconos Android
|-- eas.json                Perfiles EAS
|-- README.md
```

## Requisitos

- Node.js 22.13 o posterior y npm.
- MySQL accesible para el backend.
- Git para clonar el repositorio.
- Expo Go para pruebas de desarrollo en un telefono; EAS CLI para generar builds Android.

## Inicio local

Clona el repositorio e instala las dependencias desde la raiz:

```bash
git clone https://github.com/JARD3456/FitTrack.git
cd FitTrack
npm ci
npm --prefix server ci
```

Ejecuta el esquema `database/schema.sql` en MySQL. Copia la plantilla de variables solo si aun no tienes un `.env` local, y completa sus valores:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

No reemplaces un `.env` existente: puede contener credenciales de desarrollo. Consulta [Variables de entorno](#variables-de-entorno).

Puedes iniciar la API y Expo en procesos separados:

```bash
# Terminal 1: API
npm run server

# Terminal 2: app con Expo Go
npm run start:expo
```

O inicia ambos procesos con:

```bash
npm start
```

Para abrir la version web en desarrollo:

```bash
npm run web
```

La API local usa normalmente el puerto `3000`. Configura `EXPO_PUBLIC_DATABASE_API_URL` segun donde ejecutes la app:

| Cliente | URL local de ejemplo |
| --- | --- |
| Navegador en la misma PC | `http://127.0.0.1:3000/api` |
| Emulador Android | `http://10.0.2.2:3000/api` |
| Telefono fisico en la misma red | `http://IP-LAN-DE-TU-PC:3000/api` |

En un telefono, `localhost` apunta al telefono. La PC y el movil deben estar en la misma red y el firewall debe permitir la conexion al puerto de desarrollo. Para produccion utiliza HTTPS.

## Variables de entorno

El backend carga el archivo `.env` de la raiz del proyecto. No incluyas valores reales de credenciales en Git, capturas, mensajes o documentacion.

Variables del cliente Expo:

| Variable | Uso |
| --- | --- |
| `EXPO_PUBLIC_DATABASE_API_URL` | URL base de la API FitTrack; debe terminar en `/api`. |
| `EXPO_PUBLIC_DATABASE_USER_ID` | Identificador heredado para flujos compatibles sin sesion. |
| `EXPO_PUBLIC_API_NINJAS_KEY` | Clave para buscar ejercicios en API Ninjas. |
| `EXPO_PUBLIC_TRAVEL_OAUTH_URL` | Origen del servicio OAuth de viajes. |
| `EXPO_PUBLIC_TRAVEL_API_URL` | URL base de la API de viajes. |
| `EXPO_PUBLIC_TRAVEL_CLIENT_ID` | Identificador OAuth de viajes. |
| `EXPO_PUBLIC_TRAVEL_CLIENT_SECRET` | Credencial usada para solicitar el token de viajes. |
| `EXPO_PUBLIC_MOVIES_API_URL` | URL base de CineTeca. |

Variables privadas del backend:

| Variable | Uso |
| --- | --- |
| `API_PORT` | Puerto de Express; por defecto `3000`. |
| `JWT_SECRET` | Secreto de firma de sesiones. Debe ser aleatorio y privado. |
| `DB_HOST`, `DB_PORT` | Host y puerto MySQL; puerto por defecto `3306`. |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Base de datos y credenciales MySQL. |
| `APP_TIME_ZONE` | Zona horaria de reglas de fecha; por defecto `America/Guatemala`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Configuracion del transporte de correo. |
| `SMTP_USER`, `SMTP_PASSWORD` | Cuenta y credencial SMTP. |
| `EMAIL_FROM` | Remitente del correo; si se omite se usa `SMTP_USER`. |

Las variables `EXPO_PUBLIC_` se incorporan al bundle web y a la APK: no son secretos. En especial, no es seguro incluir un client secret OAuth o claves privadas de proveedores en la app distribuida. Para produccion, las llamadas que requieren secretos deben pasar por el backend y las credenciales expuestas deben rotarse. Las variables SMTP son solo del backend y se deben configurar privadamente; actualmente no se incluyen en `.env.example`.

## Base de datos

El esquema inicial se encuentra en `database/schema.sql`. `server/init-db.js` crea/actualiza algunas columnas para instalaciones anteriores. Las tablas principales son:

- `users`, `registration_verifications`: cuentas y verificacion de correo.
- `user_progress`, `weight_history`: datos de objetivo e historial de peso.
- `custom_exercises`: ejercicios creados por cada cuenta.
- `trainer_user_assignments`: asignaciones entre entrenador y usuario.
- `routines`, `routine_exercises`: rutinas y sus ejercicios.
- `routine_completions`, `exercise_logs`: finalizaciones y detalle de entrenamiento.

El backend se conecta mediante `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`. No expongas el puerto MySQL a todo Internet; limita el acceso mediante reglas de red a los servidores autorizados.

## API FitTrack

La URL base es `EXPO_PUBLIC_DATABASE_API_URL`, por ejemplo `https://api.ejemplo.com/api`. Las rutas protegidas requieren `Authorization: Bearer <token>`.

| Metodo | Ruta (relativa a `/api`) | Acceso | Descripcion |
| --- | --- | --- | --- |
| `GET` | `/health` | Publico | Estado de la API y conexion MySQL. |
| `POST` | `/auth/register/request-code` | Publico | Solicitar codigo de verificacion por correo. |
| `POST` | `/auth/register/verify` | Publico | Verificar codigo, crear usuario e iniciar sesion. |
| `POST` | `/auth/login` | Publico | Iniciar sesion. |
| `GET` | `/users` | Administrador | Listar usuarios. |
| `PATCH` | `/users/:userId/role` | Administrador | Cambiar rol. |
| `GET` | `/admin/routines` | Administrador | Consultar todas las rutinas registradas. |
| `GET` | `/trainer/users` | Entrenador/administrador | Consultar usuarios disponibles/asignados. |
| `POST` | `/trainer/users/:userId` | Entrenador/administrador | Asignar usuario. |
| `DELETE` | `/trainer/users/:userId` | Entrenador/administrador | Liberar asignacion. |
| `POST` | `/trainer/users/:userId/routines` | Entrenador/administrador | Asignar una rutina. |
| `GET` | `/routines` | Sesion | Consultar las rutinas del usuario autenticado. |
| `POST` | `/routines/:routineId/complete` | Sesion | Registrar la rutina completada. |
| `GET` | `/trainer/users/:userId/progress` | Entrenador/administrador | Consultar actividad e historial de un usuario. |
| `GET`, `POST` | `/exercises/custom` | Sesion | Consultar o crear ejercicios propios. |
| `DELETE` | `/exercises/custom/:exerciseId` | Sesion | Eliminar un ejercicio propio. |
| `GET`, `PUT` | `/progress/:userId` | Propietario | Consultar o guardar el progreso del usuario autenticado. |

El registro crea cuentas con rol `usuario`. La contrasena debe tener 8 caracteres como minimo, una mayuscula y un caracter especial. El codigo de verificacion tiene 6 digitos, vence a los 10 minutos y permite hasta 5 intentos.

Las rutinas se asignan con `scheduledDate` en formato `YYYY-MM-DD` y una lista `exerciseIds`. Los ejercicios de fuerza requieren peso para completar la rutina; los de cardio requieren duracion. Solo se puede completar una rutina programada para el dia actual segun `APP_TIME_ZONE`. Las fechas y los permisos tambien se validan en el backend.

Para promover manualmente la primera cuenta a administrador, confirma el correo y ejecuta una sola vez en MySQL con una cuenta autorizada:

```sql
UPDATE fittrack.users
SET role = 'administrador'
WHERE email = 'correo-confirmado@ejemplo.com';
```

## Integraciones externas

- **API Ninjas:** catalogo/busqueda de ejercicios. Requiere `EXPO_PUBLIC_API_NINJAS_KEY`.
- **Agenda de Viajes:** OAuth `client_credentials`; la vista de administrador lista viajes por estado y fecha y permite registrar viajes.
- **CineTeca:** rankings por valoracion o visualizaciones y registro de reviews.

Las integraciones de viajes y peliculas se consumen desde el cliente. Su disponibilidad depende de los servicios externos y, para la web, de que sus APIs permitan el origen mediante CORS. Revisa las URLs base y credenciales del entorno correspondiente si recibes errores HTTP o de red.

## Despliegue

### Web con AWS Amplify

`amplify.yml` usa Node 22, instala con `npm ci`, ejecuta `npm run build` y publica `dist/`. Configura las variables `EXPO_PUBLIC_` en el entorno/ramificacion de Amplify y vuelve a desplegar para que los cambios queden incluidos en el bundle.

### Backend en EC2

En el entorno actual, la API se ejecuta en Windows bajo PM2. Desde PowerShell, en la carpeta del repositorio:

```powershell
git pull origin master
npm --prefix server ci
pm2.cmd restart fittrack-api --update-env
pm2.cmd status
pm2.cmd logs fittrack-api --lines 100
pm2.cmd save
```

Ejecuta `npm --prefix server ci` si cambiaron las dependencias del backend. No sobrescribas el `.env` privado de EC2 al actualizar el codigo. Verifica `GET /api/health` y los logs de PM2 despues del reinicio.

### APK Android con EAS

El perfil `preview` de `eas.json` genera un APK de distribucion interna:

```bash
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

Configura las variables del entorno EAS correspondiente antes de compilar. Descarga e instala el APK desde el enlace del build. El perfil `production` genera un Android App Bundle para distribucion de tienda, no un APK de prueba. Si cambian variables `EXPO_PUBLIC_` o codigo del cliente, hay que volver a compilar la app.

## Comprobaciones utiles

```bash
# Sintaxis del backend
node --check server/index.js

# Tipos TypeScript
npx tsc --noEmit

# Build web
npm run build
```

Para soporte, comienza comprobando `GET /api/health`, la URL base, las variables del entorno de despliegue, permisos de red a MySQL y los logs de PM2. Errores `404` suelen indicar una URL o ruta incorrecta; `401/403` apuntan a sesion o permisos; errores de correo requieren revisar SMTP en el backend.

## Licencia

Proyecto educativo. Confirma los derechos de uso de los servicios externos, datos y recursos visuales antes de redistribuirlo.
