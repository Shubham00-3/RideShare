# RideShare Connect

RideShare Connect is a mobile-first smart carpooling app focused on partial-route matching for dense city corridors. Instead of only matching riders with identical destinations, it tries to match riders whose routes overlap, then improves economics with pooled pricing, scheduled rides, driver dispatch, and live trip status updates.

This repository contains:

- an Expo / React Native mobile app
- a Node.js / Express backend
- a PostgreSQL database schema with seed and dummy data
- a working rider flow from login to booking to active trip
- a working driver flow for assigned trips and incoming requests

## Current status

The project is beyond prototype stage and is very close to a usable MVP.

What is already working:

- phone login flow with backend sessions and OTP verification
- persisted rider search and booking flow
- trip history backed by the database
- scheduled rides with calendar sync
- rider cancellation flow
- driver dashboard with trip controls, request acceptance, and live location updates
- map autocomplete and route preview through backend mapping services
- route-aware matching when request and trip geometry are available
- active trip sockets with polling fallback
- backend-backed profile, saved places, emergency contacts, support, SOS, ratings, and admin tools
- native Android development build support

What is still not fully production-ready:

- real SMS OTP delivery depends on Twilio Verify configuration
- payment processing is still UI-only
- automated coverage is now in place for the backend, but is still not exhaustive
- deployed sharing/push requires `PUBLIC_APP_URL` and `EXPO_PROJECT_ID`

## Core product idea

RideShare Connect is built around three ideas:

1. Match partial route overlap, not only exact destination overlap.
2. Make shared rides attractive to riders through visible savings.
3. Make shared rides worthwhile for drivers through better trip utilization.

## Key features implemented

### Rider features

- onboarding flow
- login with phone + OTP UI
- pickup/dropoff search
- shared / solo / scheduled ride modes
- schedule date and time selection
- upcoming scheduled rides section on Home
- route preview and smart match search
- vehicle and driver selection
- fare quote with insurance and mid-trip pickup toggles
- booking confirmation
- active trip screen with live polling
- trip history and booking drill-down
- cancel ride actions
- scheduled ride calendar handoff
- SOS screen

### Driver features

- driver-only Drive tab
- assigned trip list
- incoming ride request list
- accept request into booking flow
- driver online/offline availability
- return-trip toggle
- trip status updates like `on_trip`, `arriving_soon`, and `completed`

### Backend features

- auth session endpoints
- match preview endpoint
- quote generation endpoint
- booking creation and booking fetch
- rider booking history endpoint
- rider booking cancellation
- driver dashboard APIs
- driver live location update API
- driver trip status update APIs
- driver request acceptance APIs
- map autocomplete and route preview endpoints

## Tech stack

### Mobile

- Expo SDK 55
- React 19
- React Native 0.83
- React Navigation
- lucide-react-native
- expo-secure-store
- expo-calendar
- MapLibre React Native

### Backend

- Node.js
- Express
- pg
- dotenv
- cors

### Database

- PostgreSQL

### Mapping

- MapLibre React Native for map rendering
- Pelias / Geocode Earth-compatible autocomplete through backend proxy
- Valhalla-compatible route preview through backend proxy

## Architecture overview

### Mobile app

The app is driven by shared context state:

- [`src\context\AuthContext.js`](./src/context/AuthContext.js)
- [`src\context\RideContext.js`](./src/context/RideContext.js)

`AuthContext` manages session state.  
`RideContext` manages search state, selected match, selected vehicle, quote, active booking, active trip, and booking history.

### Backend

The backend is an Express API centered around:

- [`backend\src\server.js`](./backend/src/server.js)
- [`backend\src\services\matchingService.js`](./backend/src/services/matchingService.js)
- [`backend\src\services\bookingService.js`](./backend/src/services/bookingService.js)
- [`backend\src\services\driverDispatchService.js`](./backend/src/services/driverDispatchService.js)
- [`backend\src\services\mappingService.js`](./backend/src/services/mappingService.js)

### Database

The main schema lives in:

- [`backend\src\db\schema.sql`](./backend/src/db/schema.sql)

The DB currently stores:

- users
- auth/session-related records
- drivers
- vehicles
- corridors
- ride requests
- active trips
- bookings

## Project structure

```text
RideShare/
  assets/                  Static assets
  backend/                 Express API + PostgreSQL scripts
  docs/                    Project docs and handoff notes
  src/
    components/            Shared UI components like RouteMap
    constants/             Theme and static values
    context/               Auth and ride state
    navigation/            Navigation container and tab/stack setup
    screens/               App screens
    services/              API clients, session storage, mock backend
  android/                 Native Android project for dev build
  App.js                   App root
  app.json                 Expo config
  package.json             Frontend scripts and dependencies
```

## Local setup

### Prerequisites

- Node.js installed
- npm installed
- PostgreSQL installed locally
- Android Studio and Android SDK if you want native Android builds

### 1. Install dependencies

From the repo root:

```bash
npm install
```

For backend dependencies:

```bash
cd backend
npm install
cd ..
```

### 2. Configure environment variables

Create the frontend env file from [`.env.example`](./.env.example):

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
```

Create the backend env file from [`backend\.env.example`](./backend/.env.example):

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/rideshare_connect
ALLOWED_ORIGIN=*
AUTH_EXPOSE_DEV_OTP=true
AUTH_OTP_TTL_MINUTES=5
AUTH_SESSION_DAYS=30
PELIAS_BASE_URL=https://api.geocode.earth/v1/search
PELIAS_API_KEY=
VALHALLA_BASE_URL=https://valhalla1.openstreetmap.de/route
```

Notes:

- `AUTH_EXPOSE_DEV_OTP=true` is useful for development because the OTP can be surfaced without a real SMS provider.
- On a physical device, `EXPO_PUBLIC_API_BASE_URL` should use your computer LAN IP instead of `127.0.0.1`.
- `PELIAS_BASE_URL` and `VALHALLA_BASE_URL` are backend proxy targets.

### 3. Initialize the database

Create the database:

```sql
CREATE DATABASE rideshare_connect;
```

Apply the schema:

```bash
psql -U postgres -d rideshare_connect -f backend/src/db/schema.sql
```

Load seed data:

```bash
psql -U postgres -d rideshare_connect -f backend/src/db/seed.sql
```

Optional richer dummy data:

```bash
npm run api:seed-dummy
```

Reset seeded trip windows and seat counts:

```bash
npm run api:reset-demo
```

## Running the project

### Backend

Run the backend with nodemon:

```bash
npm run api:dev
```

Or inside `backend/`:

```bash
npm run dev
```

### Frontend

For normal Expo start:

```bash
npm start
```

### Native Android dev build

Because MapLibre is a native dependency, the best workflow is a dev build, not Expo Go.

First build/install:

```bash
npx expo run:android
```

After the dev build is installed, daily workflow is usually:

```bash
npx expo start --dev-client
```

### Expo Go note

The app includes an Expo Go-safe fallback for maps, but real MapLibre rendering requires a development build or standalone app.

## Useful commands

### Root commands

```bash
npm start
npx expo run:android
npx expo start --dev-client
npm run api:dev
npm run api:health
npm run api:smoke
npm run api:seed-dummy
npm run api:reset-demo
```

### Backend-only commands

```bash
cd backend
npm run dev
npm run healthcheck
npm run smoke
npm run seed:dummy
npm run reset:demo
```

## API overview

### Auth

- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/session`
- `POST /api/auth/logout`

### Maps

- `GET /api/maps/autocomplete`
- `POST /api/maps/route`

### Rider flow

- `POST /api/ride-requests/preview-match`
- `POST /api/bookings/quote`
- `POST /api/bookings`
- `GET /api/bookings/:id`
- `GET /api/me/bookings`
- `PATCH /api/bookings/:id/cancel`

### Driver flow

- `GET /api/driver/me/trips`
- `PATCH /api/driver/me/settings`
- `PATCH /api/driver/bookings/:id/status`
- `POST /api/driver/requests/:id/accept`

### Health

- `GET /health`

## Main user flows

### Rider flow

1. Enter phone number.
2. Request OTP and verify session.
3. Search pickup and dropoff.
4. Choose ride mode:
   - shared
   - solo
   - schedule
5. Review smart matches.
6. Choose a driver and vehicle.
7. Review quote and confirm booking.
8. Track active or scheduled trip.
9. View booking history and details.
10. Cancel if needed.

### Scheduled ride flow

1. Open `Schedule` on Home.
2. Pick date and time or use a preset.
3. Search and book a scheduled ride.
4. Optionally add it to device calendar.
5. View it later in:
   - Home > `Already scheduled`
   - Activity > booking details

### Driver flow

1. Sign in as a driver account.
2. Open the `Drive` tab.
3. Toggle availability if needed.
4. Review incoming requests or assigned trips.
5. Accept a request or update trip status.

## Testing and smoke checks

### API health

```bash
npm run api:health
```

### API smoke test

```bash
npm run api:smoke
```

To exercise the authenticated rider and driver flow as well:

```bash
SMOKE_BOOKING_WRITE=true npm run api:smoke
```

The authenticated smoke flow expects `AUTH_EXPOSE_DEV_OTP=true` for local development.

### Backend automated tests

```bash
npm --prefix backend test
```

### Manual rider test

1. Start the backend.
2. Start the app.
3. Sign in with a test number.
4. Search a ride.
5. Book it.
6. Confirm it appears in Activity.
7. Confirm active trip polling works.
8. Try scheduled booking flow.
9. Try cancellation flow.

### Manual rider + driver test

1. Book a rider trip.
2. Open the assigned driver account.
3. Update driver trip status in the `Drive` tab.
4. Confirm rider trip status changes on polling.

## Mapping notes

The app uses a backend mapping layer instead of calling providers directly from the client.

Current behavior:

- autocomplete goes through the backend
- route preview goes through the backend
- the backend can use Pelias-compatible and Valhalla-compatible providers
- local known-place fallbacks exist for reliability

Important note:

- MapLibre needs the native dev build
- Expo Go will show a fallback map experience instead

## Current limitations

These are the main gaps still remaining before production:

- real SMS OTP delivery
- payment gateway integration
- broader automated coverage beyond the current backend suite
- deployment and ops setup

## MVP assessment

Current assessment:

- demo / internal MVP: ready
- small pilot MVP: nearly ready
- production-ready product: not yet

The current app already supports a meaningful end-to-end workflow, but should still get one final hardening pass before being treated as a complete MVP for outside users.

## Important files

If you are new to the project, start here:

- [`App.js`](./App.js)
- [`src\navigation\AppNavigator.js`](./src/navigation/AppNavigator.js)
- [`src\context\AuthContext.js`](./src/context/AuthContext.js)
- [`src\context\RideContext.js`](./src/context/RideContext.js)
- [`src\screens\HomeScreen.js`](./src/screens/HomeScreen.js)
- [`src\screens\VehicleSelectScreen.js`](./src/screens/VehicleSelectScreen.js)
- [`src\screens\CheckoutScreen.js`](./src/screens/CheckoutScreen.js)
- [`src\screens\ActiveTripScreen.js`](./src/screens/ActiveTripScreen.js)
- [`src\screens\DriverDashboardScreen.js`](./src/screens/DriverDashboardScreen.js)
- [`backend\src\server.js`](./backend/src/server.js)
- [`backend\src\services\matchingService.js`](./backend/src/services/matchingService.js)
- [`backend\src\services\bookingService.js`](./backend/src/services/bookingService.js)
- [`backend\src\services\driverDispatchService.js`](./backend/src/services/driverDispatchService.js)
- [`backend\src\services\mappingService.js`](./backend/src/services/mappingService.js)
- [`backend\src\db\schema.sql`](./backend/src/db/schema.sql)

## Documentation

Additional project notes live in:

- [`docs\PROJECT_AI_HANDOFF.md`](./docs/PROJECT_AI_HANDOFF.md)
- [`docs\IMPLEMENTATION_STATUS.md`](./docs/IMPLEMENTATION_STATUS.md)

Note: those docs were written earlier in the project and may lag behind the latest implementation. This `README.md` is intended to reflect the current repo more accurately.
