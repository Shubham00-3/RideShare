# RideShare Connect AI Handoff

## 1. Project Summary

RideShare Connect is a mobile-first smart carpooling platform for India. The core product idea is better-than-Uber-Pool matching:

- match riders with partially overlapping routes, not only exact destination matches
- support dynamic mid-trip pickup if a new compatible rider appears after a trip starts
- make shared rides attractive for drivers through better earnings, lower commission, and route-focused supply

This repository currently contains:

- an Expo / React Native mobile app
- a Node.js / Express backend
- a PostgreSQL schema plus seed data for MVP testing
- a connected rider flow from search to booking to active trip

## 2. Product Vision

### Passenger-side differentiators

- partial-route matching on dense commuter corridors
- lower fares through shared overlap
- option to allow mid-trip pickups for extra savings

### Driver-side differentiators

- better shared-ride economics than solo rides
- future support for return-trip monetization
- lower platform commission than mainstream ride apps
- future streak/reward logic for quality and route priority

## 3. Current State of the Codebase

The project has moved beyond a pure UI prototype. It now has a working MVP skeleton with a real backend and database.

### What is implemented

- onboarding screens
- phone + OTP-style login UI
- rider home screen
- ride match list
- vehicle selection
- fare quote / checkout
- active trip view
- Express API for match preview, quote, and booking
- PostgreSQL schema and seed data
- app-side state and API integration via context

### What is still mocked or incomplete

- OTP is not real; login is demo-only
- no SMS provider integration
- no real auth/session handling
- no maps SDK integration in the booking flow
- no geocoding or routing engine
- no payments integration
- no live driver location updates
- no real push notifications
- no true dynamic mid-trip orchestration yet
- no production deployment

## 4. Tech Stack

### Mobile app

- Expo SDK 55
- React 19
- React Native 0.83
- React Navigation
- lucide-react-native

### Backend

- Node.js
- Express
- pg
- dotenv
- cors

### Database

- PostgreSQL

## 5. High-Level Architecture

### Mobile layer

The mobile app is a stateful client. It uses a shared `RideContext` to hold the current ride search, selected match, selected vehicle, fare quote, and active trip.

Important files:

- `App.js`
- `src/navigation/AppNavigator.js`
- `src/context/RideContext.js`
- `src/services/api.js`
- `src/services/mockBackend.js`

### Backend layer

The backend currently exposes three main endpoints:

- `GET /health`
- `POST /api/ride-requests/preview-match`
- `POST /api/bookings/quote`
- `POST /api/bookings`

Important files:

- `backend/src/server.js`
- `backend/src/services/matchingService.js`
- `backend/src/services/bookingService.js`

### Database layer

The database models corridors, users, drivers, vehicles, ride requests, active trips, and bookings.

Important files:

- `backend/src/db/schema.sql`
- `backend/src/db/seed.sql`

## 6. Core Mobile Flow

The current rider journey works like this:

1. User logs in through a demo phone/OTP screen.
2. User enters pickup, dropoff, and ride type on the Home screen.
3. App calls `previewRideMatches()` through `RideContext`.
4. Backend returns compatible route matches.
5. User selects a match, then chooses a vehicle option.
6. App requests a fare quote.
7. User books the ride.
8. App shows an active trip screen with a simulated trip state and optional mid-trip rider alert.

Important screens:

- `src/screens/LoginScreen.js`
- `src/screens/HomeScreen.js`
- `src/screens/RideMatchScreen.js`
- `src/screens/VehicleSelectScreen.js`
- `src/screens/CheckoutScreen.js`
- `src/screens/ActiveTripScreen.js`

## 7. Matching Logic

The matching logic is corridor-first, not full GIS routing yet.

Current algorithm in `backend/src/services/matchingService.js`:

- infer a named corridor from pickup/dropoff text
- normalize request defaults
- fetch active trips from PostgreSQL
- compute overlap in kilometers between rider request and active trip
- compute a detour penalty
- derive a score from overlap and detour
- filter out weak overlaps
- generate vehicle options and pricing estimates

This is a practical MVP heuristic, not a production routing system.

### Current corridors in seed data

- `delhi_cp_noida`
- `gurgaon_cp_central`

## 8. Database Model

Current tables:

- `corridors`
- `users`
- `drivers`
- `vehicles`
- `ride_requests`
- `active_trips`
- `bookings`

The schema is good enough for MVP experiments, but not yet complete for production needs such as:

- auth tokens / refresh tokens
- payment transactions
- driver live locations
- trip events / telemetry
- notification records
- surge pricing rules
- corporate account models

## 9. Environment and Local Setup

### App env

The mobile app expects:

- `.env`
- `EXPO_PUBLIC_API_BASE_URL=http://<host-ip>:4000`

### Backend env

The backend expects:

- `backend/.env`
- `PORT=4000`
- `DATABASE_URL=postgres://...`
- `ALLOWED_ORIGIN=*`

### Useful commands

From repo root:

```bash
npm install
npm run start
npm run api:dev
```

From backend:

```bash
npm install
node src/server.js
```

## 10. Verified Working Areas

These were explicitly verified during development:

- Android bundle export succeeded
- iOS bundle export succeeded
- Web bundle export succeeded after adding web dependencies
- backend health endpoint works
- backend quote endpoint works
- backend booking endpoint works
- PostgreSQL database was created and seeded
- backend runs with `databaseConfigured: true`
- match preview returns Postgres-backed trip matches

## 11. Known Problems / Caveats

### OTP / login

`src/screens/LoginScreen.js` is still a demo login.

- it pretends to send OTP
- any 6 digits effectively let the user continue
- there is no SMS gateway

### Expo Go testing

There were repeated network issues with Expo Go transport:

- local LAN access from phone to Mac was blocked on the tested network
- ngrok / Expo tunnel was unstable and sometimes offline
- this is a transport/network problem, not a core app-code problem

### Web UI

The app can render on web, but it is clearly mobile-first and looks stretched on desktop. Web is only useful as a debug surface, not a polished target.

### Feature gaps

- no real routing engine
- no driver dispatch engine
- no real-time updates
- no push notifications
- no payment processing
- no true auth

## 12. Best Next Steps

### Product / engineering priorities

1. Replace demo OTP with real auth:
   - Firebase Auth, Clerk, Supabase Auth, or Twilio Verify
2. Add proper map + geocoding + route calculations:
   - Google Maps, Mapbox, or another routing provider
3. Replace text corridor inference with route polyline overlap
4. Persist actual booking writes to the database
5. Add booking creation for `ride_requests` and `bookings` tables
6. Add driver app or driver mode with live supply
7. Add websocket or polling updates for active trips
8. Add payment integration
9. Fix Expo Go transport by using simulator, Android Studio emulator, or EAS dev build

### Suggested technical next milestone

Build a real write path:

- create `ride_requests` row when search starts
- store selected booking in `bookings`
- connect `ActiveTripScreen` to a `GET /api/bookings/:id` or `GET /api/trips/:id` endpoint

## 13. Guidance for Another AI

If another AI is picking this project up, it should understand:

- this repo is not a blank prototype anymore
- the core rider booking flow is connected through app state and backend APIs
- the matching logic is heuristic corridor-based MVP logic
- the database exists and seed data is already set up
- authentication and transport are the biggest missing pieces for a realistic demo

The most important files to read first are:

- `src/context/RideContext.js`
- `src/services/api.js`
- `src/screens/HomeScreen.js`
- `src/screens/RideMatchScreen.js`
- `src/screens/CheckoutScreen.js`
- `backend/src/server.js`
- `backend/src/services/matchingService.js`
- `backend/src/services/bookingService.js`
- `backend/src/db/schema.sql`
- `backend/src/db/seed.sql`

## 14. Short Project Pitch

RideShare Connect is a smart carpooling app for India that increases shared-ride match rates by matching partially overlapping routes instead of only identical destinations, then extends savings further with dynamic mid-trip pickups and better driver economics.
