# RideShare Connect Setup Guide

This guide explains how to set up RideShare Connect from scratch on a local machine.

It covers:

- prerequisites
- dependency installation
- PostgreSQL setup
- environment variables
- backend setup
- frontend setup
- Android native development build setup
- smoke checks
- common troubleshooting steps

## 1. Overview

RideShare Connect has two main runtime parts:

- a React Native / Expo mobile app
- a Node.js / Express backend backed by PostgreSQL

For the best experience, especially because the project uses MapLibre, you should run the app as a native Expo development build on Android instead of relying only on Expo Go.

## 2. Prerequisites

Install these first:

- Node.js
- npm
- PostgreSQL
- Android Studio
- Android SDK
- Java JDK through Android Studio's bundled JBR

Recommended versions:

- Node 18+ or newer
- PostgreSQL 14+ or newer
- Android Studio with a working emulator or physical Android device

## 3. Clone and open the project

Open the repository:

```bash
cd RideShare
```

## 4. Install dependencies

### Root dependencies

From the project root:

```bash
npm install
```

### Backend dependencies

The backend has its own `package.json`, so install those too:

```bash
cd backend
npm install
cd ..
```

## 5. Create environment files

### Frontend env

Create `.env` in the repo root using [`.env.example`](./.env.example):

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
EXPO_PUBLIC_ALLOW_DEV_MOCK_FALLBACKS=false
EXPO_PUBLIC_EXPO_PROJECT_ID=
```

Important:

- if you test on an Android emulator, `127.0.0.1` is fine because the app code rewrites it to `10.0.2.2`
- if you test on a physical phone, replace `127.0.0.1` with your computer's LAN IP, for example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:4000
```

### Backend env

Create `backend/.env` using [`backend\.env.example`](./backend/.env.example):

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/rideshare_connect
ALLOWED_ORIGIN=*
AUTH_EXPOSE_DEV_OTP=true
AUTH_OTP_TTL_MINUTES=5
AUTH_SESSION_DAYS=30
PUBLIC_APP_URL=http://127.0.0.1:4000
EXPO_PROJECT_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
PELIAS_BASE_URL=https://api.geocode.earth/v1/search
PELIAS_API_KEY=
VALHALLA_BASE_URL=https://valhalla1.openstreetmap.de/route
```

Field notes:

- `DATABASE_URL`: local PostgreSQL connection string
- `AUTH_EXPOSE_DEV_OTP=true`: useful for development because OTP can be shown without a real SMS provider
- `PUBLIC_APP_URL`: used when generating trip-sharing links from the backend
- `EXPO_PROJECT_ID`: needed to register Expo push tokens from the mobile app
- `TWILIO_*`: required only when you disable dev OTP mode and want real SMS verification
- `PELIAS_BASE_URL`: backend autocomplete provider endpoint
- `PELIAS_API_KEY`: needed if your Pelias-compatible provider requires auth
- `VALHALLA_BASE_URL`: backend route-preview provider endpoint
- `EXPO_PUBLIC_ALLOW_DEV_MOCK_FALLBACKS=false`: recommended so booking/auth/driver flows fail loudly if the backend is unreachable

## 6. Set up PostgreSQL

### 6.1 Create the database

Open `psql` and create the DB:

```sql
CREATE DATABASE rideshare_connect;
```

Or directly from terminal:

```bash
psql -U postgres -c "CREATE DATABASE rideshare_connect;"
```

### 6.2 Apply the schema

From the repo root:

```bash
psql -U postgres -d rideshare_connect -f backend/src/db/schema.sql
```

### 6.3 Load base seed data

```bash
psql -U postgres -d rideshare_connect -f backend/src/db/seed.sql
```

### 6.4 Load richer dummy data

This is recommended for testing more flows:

```bash
npm run api:seed-dummy
```

### 6.5 Reset demo trip windows and seats

If repeated testing consumes seats or seeded trip times become stale:

```bash
npm run api:reset-demo
```

## 7. Start the backend

From the project root:

```bash
npm run api:dev
```

Or from `backend/`:

```bash
cd backend
npm run dev
```

The backend should start on:

```text
http://127.0.0.1:4000
```

### Health check

Test the API:

```bash
curl http://127.0.0.1:4000/health
```

Expected shape:

```json
{
  "ok": true,
  "service": "rideshare-connect-api",
  "databaseConfigured": true
}
```

You can also use:

```bash
npm run api:health
```

## 8. Start the frontend

From the repo root:

```bash
npm start
```

That starts Expo.

## 9. Recommended Android workflow

Because the app uses `@maplibre/maplibre-react-native`, the recommended workflow is a native development build.

### 9.1 First-time Android build

```bash
npx expo run:android
```

This will:

- generate or update native Android files
- build the app with Gradle
- install it on the emulator/device
- start Metro

The first run can take a long time.

### 9.2 Daily workflow after the dev build is installed

Usually this is enough:

```bash
npx expo start --dev-client
```

Then open the installed app on your emulator or device.

### 9.3 If you only changed JS code

You usually do not need to rebuild native Android every time.
Just use:

```bash
npx expo start --dev-client
```

### 9.4 If you changed native dependencies or plugin config

Rebuild with:

```bash
npx expo run:android
```

## 10. Expo Go note

The app includes an Expo Go-safe fallback for maps, but:

- real MapLibre rendering needs a native dev build
- Expo Go is not the recommended final test path for this project

If you open it in Expo Go, the map-related screens may degrade to fallback UI.

## 11. Physical phone setup

If you want to test on a real phone:

1. Ensure phone and computer are on the same Wi-Fi.
2. Set root `.env` to use your computer LAN IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:4000
```

3. Restart Expo after changing `.env`.
4. Keep the backend running.

For a dev build on a real Android device:

```bash
npx expo run:android --device
```

Then start Metro:

```bash
npx expo start --dev-client --host lan
```

If LAN mode is unreliable:

```bash
npx expo start --dev-client --host tunnel
```

## 12. Test accounts

The database includes seeded test users.

### Rider examples

- `9876543210`
- `9876543211`
- `9876543212`

### Driver examples

- `9999900004`
- `9999900005`

If `AUTH_EXPOSE_DEV_OTP=true`, the OTP can be surfaced during development instead of requiring a real SMS provider.

## 13. Useful commands

### Root

```bash
npm start
npx expo run:android
npx expo start --dev-client
npm run api:dev
npm run api:health
npm run api:smoke
npm run api:seed-dummy
npm run api:reset-demo
npm --prefix backend test
```

### Backend

```bash
cd backend
npm run dev
npm run healthcheck
npm run smoke
npm run seed:dummy
npm run reset:demo
npm run sync:routes
npm test
```

## 14. Smoke test flow

After setup, run this minimum check:

1. Start backend with `npm run api:dev`
2. Run `npm run api:health`
3. Run `npm run api:smoke`
4. Run `SMOKE_BOOKING_WRITE=true npm run api:smoke` for the authenticated rider + driver check
5. Start the app
6. Sign in with a test rider
7. Search and book a ride
8. Open Activity and verify the booking appears
9. Open Active Trip and verify it loads
10. Test scheduled ride flow
11. Test cancellation flow

## 15. Common troubleshooting

### `psql` not found

If `psql` is installed but not found:

- add PostgreSQL `bin` directory to your system `PATH`
- restart the terminal

Example path:

```text
C:\Program Files\PostgreSQL\18\bin
```

### Backend health works locally but not on phone

Likely causes:

- `EXPO_PUBLIC_API_BASE_URL` still points to `127.0.0.1`
- Windows firewall is blocking port `4000`
- phone and laptop are not on the same network

Fix:

- set `.env` to your LAN IP
- restart Expo
- verify on phone browser:

```text
http://<your-lan-ip>:4000/health
```

### MapLibre error in Expo Go

If you see a native-module registration error:

- use a dev build instead of Expo Go

Run:

```bash
npx expo run:android
```

### Gradle / Android build issues

This project previously needed these fixes in the native Android setup:

- Gradle pinned to `8.14.3`
- `org.gradle.java.home` pointed to Android Studio JBR
- `android/local.properties` pointed to Android SDK path

If Android builds fail, check:

- [`android\gradle\wrapper\gradle-wrapper.properties`](./android/gradle/wrapper/gradle-wrapper.properties)
- [`android\gradle.properties`](./android/gradle.properties)
- [`android\local.properties`](./android/local.properties)

### Dev build QR opens localhost on phone

That usually means:

- you are using a dev-client QR on a phone without the dev build installed, or
- Metro is not advertising a reachable address

Fix:

1. install the dev build on the phone
2. use `npx expo start --dev-client --host lan`

### API timeouts in app

Check:

- backend is running
- `.env` has the right IP
- firewall allows backend traffic
- health endpoint works in device browser

## 16. Recommended first files to inspect after setup

- [`README.md`](./README.md)
- [`App.js`](./App.js)
- [`src\navigation\AppNavigator.js`](./src/navigation/AppNavigator.js)
- [`src\context\AuthContext.js`](./src/context/AuthContext.js)
- [`src\context\RideContext.js`](./src/context/RideContext.js)
- [`backend\src\server.js`](./backend/src/server.js)
- [`backend\src\db\schema.sql`](./backend/src/db/schema.sql)

## 17. After setup is complete

When everything is working, you should be able to:

- start the backend successfully
- pass health and smoke checks
- sign in as a rider
- search and book rides
- see bookings in Activity
- test scheduled rides
- sign in as a driver
- accept and update trips in the Drive tab

If you want a higher-level project summary, see [`README.md`](./README.md).
