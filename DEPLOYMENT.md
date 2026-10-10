# Despliegue de FitTrack

La solución de producción queda separada en cuatro piezas:

- **Amazon RDS for MySQL**: base de datos de `server/`.
- **AWS App Runner**: API Express de `server/`, construida con `Dockerfile`.
- **AWS Amplify Hosting**: versión web estática generada por `npm run web:build`.
- **EAS Build/Submit**: binarios Android/iOS de la app Expo para las tiendas.

## 1. Preparar el repositorio

Usa Node.js 22.13.x o superior para Expo SDK 57. Instala y verifica:

```bash
npm ci
npm --prefix server ci
npx expo-doctor
npm run web:build
```

No subas `.env`. El archivo está ignorado por Git. El repositorio ya incluye `eas.json`, `amplify.yml` y `Dockerfile`.

## 2. Crear RDS MySQL

En la misma región de AWS que utilizarás para el backend:

1. Crea una instancia MySQL llamada `fittrack`.
2. Usa subredes privadas y desactiva el acceso público cuando sea posible.
3. Permite TCP `3306` únicamente desde el security group/VPC connector que utilizará App Runner.
4. Conserva el endpoint, usuario, contraseña, puerto y nombre de base de datos.

Inicializa el esquema desde una máquina autorizada para conectarse a RDS. Configura temporalmente esas variables en `.env` local y ejecuta:

```bash
npm run db:init
```

Después elimina cualquier copia local que contenga la contraseña de RDS si ya no la necesitas.

## 3. Publicar la API en App Runner

Conecta el repositorio de GitHub `Jard3456/FitTrack`, rama `master`, y selecciona despliegue desde código fuente/Dockerfile. Configura:

- Puerto: `3000`
- Health check: `GET /api/health`
- `NODE_ENV=production`
- `PORT=3000`
- `DB_HOST=<endpoint-de-rds>`
- `DB_PORT=3306`
- `DB_NAME=fittrack`
- `DB_USER=<usuario-rds>`
- `DB_PASSWORD=<contraseña-rds>`
- `JWT_SECRET=<secreto-aleatorio-de-al-menos-32-caracteres>`
- `CORS_ORIGINS=https://<dominio-de-amplify>`

Si RDS no es público, configura un VPC connector en App Runner y permite su security group en el de RDS. Cuando App Runner termine, prueba:

```text
https://<dominio-app-runner>/api/health
```

La respuesta esperada es `{"status":"ok","database":"connected"}`.

## 4. Publicar la web en Amplify Hosting

En Amplify Hosting crea una aplicación conectada al repositorio y rama `master`. El archivo `amplify.yml` ya indica cómo construir `dist/` con Node 22.13.

Define en las variables de entorno de la rama de producción:

- `EXPO_PUBLIC_DATABASE_API_URL=https://<dominio-app-runner>/api`
- `EXPO_PUBLIC_API_NINJAS_KEY=<clave-de-api-ninjas>`

La segunda variable queda incluida en el JavaScript público porque tiene prefijo `EXPO_PUBLIC_`. No la trates como secreto. Si debe permanecer privada, mueve la consulta de API Ninjas al backend y elimina esa variable del cliente.

Amplify desplegará la web en un dominio `amplifyapp.com`; después puedes conectar un dominio propio. Actualiza `CORS_ORIGINS` en App Runner con el dominio definitivo.

## 5. Crear los binarios móviles

Instala y autentica EAS:

```bash
npm install --global eas-cli
eas login
eas init
```

Antes del primer build, confirma que `com.fittrack.app` no esté ocupado. Si ya existe una app publicada con otro identificador, conserva ese identificador en `app.json` para que la tienda reconozca la actualización.

Configura las variables públicas de producción en EAS:

```bash
eas env:set --name EXPO_PUBLIC_DATABASE_API_URL --value https://<dominio-app-runner>/api --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_API_NINJAS_KEY --value <clave-de-api-ninjas> --environment production --visibility sensitive
```

Genera los binarios:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Finalmente, sube Android a Google Play y iOS a App Store Connect/TestFlight:

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

Las tiendas requieren sus cuentas, datos de la aplicación, privacidad y credenciales de firma. EAS puede crear o administrar las credenciales de firma cuando se solicite.

## Operación posterior

Cada push a `master` puede desplegar automáticamente la web mediante Amplify y la API mediante App Runner. Un cambio JavaScript móvil requiere un nuevo build o una configuración posterior de EAS Update; un cambio nativo siempre requiere nuevo binario.
