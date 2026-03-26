# RideShare — System Architecture

> A detailed technical reference covering the complete flow from both the **Rider** and **Driver** perspectives, along with an explanation of every major feature, component, service, and data model.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Technology Stack](#2-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Frontend Architecture (React Native / Expo)](#4-frontend-architecture-react-native--expo)
   - 4.1 [Entry Points](#41-entry-points)
   - 4.2 [Navigation System](#42-navigation-system)
   - 4.3 [Global State — Contexts](#43-global-state--contexts)
   - 4.4 [Service Layer (Frontend)](#44-service-layer-frontend)
   - 4.5 [Screen Catalogue](#45-screen-catalogue)
5. [Backend Architecture (Node.js / Express)](#5-backend-architecture-nodejs--express)
   - 5.1 [Server Setup & Middleware](#51-server-setup--middleware)
   - 5.2 [REST API Endpoints](#52-rest-api-endpoints)
   - 5.3 [Service Layer (Backend)](#53-service-layer-backend)
6. [Database Schema (PostgreSQL)](#6-database-schema-postgresql)
7. [End-to-End Feature Flows](#7-end-to-end-feature-flows)
   - 7.1 [Authentication — OTP Login](#71-authentication--otp-login)
   - 7.2 [Rider Flow — Booking a Ride](#72-rider-flow--booking-a-ride)
   - 7.3 [Rider Flow — Active Trip Tracking](#73-rider-flow--active-trip-tracking)
   - 7.4 [Rider Flow — Trip History & Cancellation](#74-rider-flow--trip-history--cancellation)
   - 7.5 [Driver Flow — Going Online & Dashboard](#75-driver-flow--going-online--dashboard)
   - 7.6 [Driver Flow — Accepting an Incoming Request](#76-driver-flow--accepting-an-incoming-request)
   - 7.7 [Driver Flow — Managing Trip Lifecycle](#77-driver-flow--managing-trip-lifecycle)
8. [Key Features Deep-Dive](#8-key-features-deep-dive)
   - 8.1 [Shared / Pool Ride Matching](#81-shared--pool-ride-matching)
   - 8.2 [Fare Calculation](#82-fare-calculation)
   - 8.3 [Mid-Trip Pickup (Dynamic Pooling)](#83-mid-trip-pickup-dynamic-pooling)
   - 8.4 [Live Trip State Machine](#84-live-trip-state-machine)
   - 8.5 [Mapping & Route Preview](#85-mapping--route-preview)
   - 8.6 [Mock / Offline Backend](#86-mock--offline-backend)
   - 8.7 [SOS Screen](#87-sos-screen)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Environment Configuration](#10-environment-configuration)

---

## 1. High-Level Overview

RideShare is a **cross-platform mobile application** (Android & iOS) built with **React Native / Expo**. It connects riders who want affordable shared rides with drivers who have active trips on predefined urban corridors.

```
┌─────────────────────────────────────────────────┐
│              Mobile App (React Native)           │
│  Rider UI ◄──────────────► Driver UI            │
└────────────────────┬────────────────────────────┘
                     │ REST / JSON  (Bearer token)
                     ▼
┌─────────────────────────────────────────────────┐
│         RideShare Connect API  (Node.js)         │
│  Express Server  │  Auth  │  Booking  │  Match   │
└────────────────────┬────────────────────────────┘
                     │ pg Pool
                     ▼
┌─────────────────────────────────────────────────┐
│              PostgreSQL Database                 │
│  users · drivers · vehicles · corridors          │
│  active_trips · ride_requests · bookings         │
│  auth_otps · user_sessions                       │
└─────────────────────────────────────────────────┘
                     │ optional
                     ▼
┌────────────────────────────────────────────────┐
│  External Services                              │
│  Pelias (geocoding/places autocomplete)         │
│  Valhalla (routing / turn-by-turn geometry)     │
└────────────────────────────────────────────────┘
```

If the backend is **not configured** (no `EXPO_PUBLIC_API_BASE_URL`), the app switches seamlessly to a built-in **mock backend** so that development and demos can proceed entirely offline.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native, Expo SDK |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| State Management | React Context API (`AuthContext`, `RideContext`) |
| Maps / Route | `react-native-maps`, `expo-location`, Valhalla, Pelias |
| Icons | `lucide-react-native` |
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| Database | PostgreSQL (via `pg` connection pool) |
| Authentication | OTP via phone number, SHA-256 token hashing, UUID session tokens |
| Geocoding | Pelias (self-hosted or cloud) |
| Routing | Valhalla (self-hosted or cloud) |

---

## 3. Repository Structure

```
RideShare/
├── App.js                  # Root component — mounts AuthProvider + AppNavigator
├── index.js                # Expo registerRootComponent entry point
├── app.json                # Expo app config (name, slug, icon, splash)
├── package.json            # Frontend dependencies
│
├── src/
│   ├── components/
│   │   └── RouteMap.js         # Reusable map polyline component
│   ├── constants/
│   │   └── theme.js            # COLORS, FONTS, SIZES design tokens
│   ├── context/
│   │   ├── AuthContext.js      # Authentication state & actions
│   │   └── RideContext.js      # Active ride / real-time trip state
│   ├── navigation/
│   │   └── AppNavigator.js     # Stack + Tab navigator, auth guard, active ride banner
│   ├── screens/                # All app screens (see §4.5)
│   └── services/
│       ├── api.js              # All HTTP API calls (with mock fallbacks)
│       ├── mockBackend.js      # Deterministic mock data for offline use
│       ├── sessionStorage.js   # AsyncStorage token persistence
│       └── calendarService.js  # Scheduled ride calendar integration helper
│
├── backend/
│   ├── package.json
│   ├── nodemon.json
│   └── src/
│       ├── server.js           # Express app — all route definitions
│       ├── config/
│       │   ├── env.js          # Environment variable loader
│       │   └── db.js           # pg Pool factory
│       ├── middleware/
│       │   └── auth.js         # readAuthToken, requireAuth, optionalAuth
│       ├── services/
│       │   ├── authService.js          # OTP request/verify, session mgmt
│       │   ├── bookingService.js       # Quotes, confirmBooking, cancellation, status updates
│       │   ├── matchingService.js      # Ride request persistence + candidate matching
│       │   ├── driverDispatchService.js # Driver dashboard, incoming requests, accept flow
│       │   └── mappingService.js       # Places autocomplete, Valhalla route preview
│       ├── data/
│       │   └── seedCandidates.js       # Offline candidate trips for matching
│       └── db/
│           ├── schema.sql      # Full DDL for all tables
│           ├── seed.sql        # Driver/vehicle/corridor seed data
│           └── dummy_seed.sql  # Additional demo data
│
├── docs/
│   ├── architecture.md         # ← This file
│   ├── IMPLEMENTATION_STATUS.md
│   └── PROJECT_AI_HANDOFF.md
└── assets/                     # App icons, splash screens, fonts
```

---

## 4. Frontend Architecture (React Native / Expo)

### 4.1 Entry Points

**`index.js`** — Calls `registerRootComponent(App)`, making `App` the Expo root.

**`App.js`** — Wraps everything in `AuthProvider` (and `RideProvider` inside the navigation tree) before rendering `AppNavigator`.

```
App.js
 └── AuthProvider          (session hydration, login/logout actions)
      └── AppNavigator
           └── RideProvider (active trip polling, ride state)
                └── Screens…
```

### 4.2 Navigation System

**File:** `src/navigation/AppNavigator.js`

The navigator uses two layers:

#### Auth-Guard Stack
On startup `AppNavigator` reads `hydrated` and `isAuthenticated` from `AuthContext`:
- **Not hydrated** → shows a loading spinner (token restoration phase).
- **Not authenticated** → renders the **Unauthenticated Stack** (`Onboarding` → `Login`).
- **Authenticated** → renders the **Authenticated Stack**.

#### Authenticated Stack (Stack.Navigator)
| Screen Name | Component | Notes |
|---|---|---|
| `MainTabs` | Bottom Tab wrapper | Contains Home, Activity, (Drive), Profile |
| `RideMatch` | `RideMatchScreen` | Shows matched shared trips |
| `VehicleSelect` | `VehicleSelectScreen` | Choose vehicle variant |
| `Checkout` | `CheckoutScreen` | Review & confirm booking |
| `ActiveTrip` | `ActiveTripScreen` | Real-time trip status |
| `BookingDetail` | `BookingDetailScreen` | Past booking detail |
| `SOS` | `SOSScreen` | Emergency contacts & help |

#### Bottom Tab Navigator
| Tab | Screen | Shown To |
|---|---|---|
| Home | `HomeScreen` | Riders & Drivers |
| Activity | `TripHistoryScreen` | Riders & Drivers |
| Drive | `DriverDashboardScreen` | **Drivers only** (role === 'driver') |
| Profile | `ProfileScreen` | Riders & Drivers |

#### Active Ride Banner
A custom `ActiveRideTabBar` component sits **above** the standard tab bar. If `RideContext` reports an active (non-completed, non-cancelled) trip, it renders a live banner showing ETA and route label. Tapping it navigates to `ActiveTrip`.

---

### 4.3 Global State — Contexts

#### AuthContext (`src/context/AuthContext.js`)

Manages user identity across the entire app.

| State | Type | Description |
|---|---|---|
| `session` | Object/null | Full session payload `{ token, expiresAt, user }` |
| `loading` | boolean | True during any async auth operation |
| `hydrated` | boolean | True once stored token restoration attempt completes |
| `error` | string/null | Last auth error message |

**Session Restoration (on mount):**
1. Reads stored token from `AsyncStorage` via `sessionStorage.readSessionToken()`.
2. If found, calls `GET /api/auth/session` (bearer auth) to validate it.
3. If valid → persists the refreshed session in memory and `AsyncStorage`.
4. If invalid → clears local token (user will see login screen).

**Exposed Actions:**
- `requestOtp(phone)` — triggers `POST /api/auth/request-otp`
- `verifyOtp(phone, code)` — triggers `POST /api/auth/verify-otp`, stores returned token
- `refreshSession()` — re-validates the current token
- `signOut()` — clears local session then calls `POST /api/auth/logout`

#### RideContext (`src/context/RideContext.js`)

Manages the rider's current active trip so that any screen in the app can observe live status.

- Polls booking details from the API periodically.
- Exposes `activeTrip` (the current trip object) and `setActiveTrip`.
- The `ActiveRideTabBar` and `ActiveTripScreen` consume this context.

---

### 4.4 Service Layer (Frontend)

#### `src/services/api.js`
The single HTTP client for all backend calls.

- **Base URL** is read from `EXPO_PUBLIC_API_BASE_URL` (Expo env var). On Android emulators, `localhost` is automatically rewritten to `10.0.2.2`.
- All requests time out after **8 seconds** (via `AbortController`).
- Every non-2xx response is parsed for a JSON `.message` field and thrown as an `Error`.
- If `API_BASE_URL` is empty, most functions fall back to `mockBackend` equivalents.

| Exported Function | Method | Endpoint | Auth |
|---|---|---|---|
| `requestOtp(phone)` | POST | `/api/auth/request-otp` | None |
| `verifyOtp(phone, code)` | POST | `/api/auth/verify-otp` | None |
| `fetchSession(token)` | GET | `/api/auth/session` | Bearer |
| `logoutSession(token)` | POST | `/api/auth/logout` | Bearer |
| `searchPlaces(query, opts)` | GET | `/api/maps/autocomplete` | None |
| `fetchRoutePreview(payload)` | POST | `/api/maps/route` | None |
| `previewRideMatches(payload, token)` | POST | `/api/ride-requests/preview-match` | Optional Bearer |
| `fetchBookingQuote(payload, token)` | POST | `/api/bookings/quote` | Optional Bearer |
| `confirmRideBooking(payload, token)` | POST | `/api/bookings` | Optional Bearer |
| `fetchBookingDetails(id, token)` | GET | `/api/bookings/:id` | Optional Bearer |
| `fetchMyBookings(token)` | GET | `/api/me/bookings` | Bearer |
| `cancelRideBooking(id, token)` | PATCH | `/api/bookings/:id/cancel` | Bearer |
| `fetchDriverTrips(token)` | GET | `/api/driver/me/trips` | Bearer (driver) |
| `updateDriverSettings(payload, token)` | PATCH | `/api/driver/me/settings` | Bearer (driver) |
| `updateDriverTripStatus(id, status, token)` | PATCH | `/api/driver/bookings/:id/status` | Bearer (driver) |
| `acceptDriverRequest(requestId, token)` | POST | `/api/driver/requests/:id/accept` | Bearer (driver) |

#### `src/services/mockBackend.js`
Provides mock data generators for all ride-related API calls:
- `buildMockPlaceResults(query)` — returns plausible place suggestions
- `buildMockRoutePreview(payload)` — returns a route with geometry, distance, duration
- `buildMockMatchResponse(payload)` — generates match candidates with vehicles, fares, savings
- `buildMockQuote(payload)` — computes a realistic fare breakdown
- `buildMockBooking(payload)` — creates an ephemeral booking object

#### `src/services/sessionStorage.js`
Thin wrapper over `AsyncStorage` for persisting the session token:
- `persistSessionToken(token)` — saves to key `rideshare_session_token`
- `readSessionToken()` — retrieves the stored token
- `clearSessionToken()` — removes the stored token

#### `src/services/calendarService.js`
Utility to add a scheduled ride as a calendar event using `expo-calendar`, used from `CheckoutScreen` and `BookingDetailScreen` for scheduled rides.

---

### 4.5 Screen Catalogue

#### Unauthenticated Screens

**`OnboardingScreen`**
- Shown on first launch.
- Describes the app value proposition with illustrated slides.
- A "Get Started" button navigates to `LoginScreen`.

**`LoginScreen`**
- **Phase 1 — Phone number entry:** Validates and calls `requestOtp(phone)`. The backend returns a masked phone number and (in dev mode) the OTP in plain text.
- **Phase 2 — OTP entry:** The user enters the 6-digit code. Calls `verifyOtp(phone, code)`. On success the session is stored and the navigator switches to the authenticated stack.
- Handles re-send OTP and error display.

---

#### Authenticated — Rider Screens

**`HomeScreen`** _(largest screen — ~1,660 lines)_
The central hub for riders. Features:
- **Location permission** — requested on mount via `expo-location`. If granted, the current location is used as the default pickup point.
- **Map view** — renders a full-screen map (`react-native-maps`) with the current location marker.
- **Pickup / Dropoff search** — each field opens a search input. Typing debounces calls to `searchPlaces()`, returning autocomplete suggestions. Selecting a place reverse-geocodes to get precise coordinates.
- **Route preview** — once both pickup and dropoff are selected, calls `fetchRoutePreview()` to get distance, duration, and a polyline geometry which is drawn on the map via `RouteMap`.
- **Ride type selection** — the user can choose between `shared` (pooled with other riders) and `solo` (private).
- **Schedule ride** — optionally picks a future departure time.
- **"Find Rides" CTA** — navigates to `RideMatchScreen`, passing the complete ride request payload.

**`RideMatchScreen`**
- Calls `previewRideMatches(payload)` with the ride details from `HomeScreen`.
- Displays a list of matched **shared trips** (other riders on the same corridor), each showing:
  - Overlap percentage, route label, ETA, savings vs. solo fare
  - Passenger card (verified status, rating)
- Selecting a match navigates to `VehicleSelectScreen`.

**`VehicleSelectScreen`**
- Displays vehicle variants for the selected match: Economy and Comfort Plus options.
- Shows fare, ETA, driver info for each variant.
- Optionally toggles **mid-trip pickup** (allows more riders to join en route; unlocks an additional discount).
- Calls `fetchBookingQuote()` when the selection changes to get a live fare breakdown.
- "Book Now" navigates to `CheckoutScreen`.

**`CheckoutScreen`**
- Shows the full fare breakdown (base fare, distance fare, platform fee, insurance, pooling discount, mid-trip discount, total).
- Payment method selection (Cash, UPI).
- Insurance opt-in toggle.
- Scheduled ride opt-in + calendar event creation.
- "Confirm Booking" calls `confirmRideBooking()`. On success, stores the resulting booking in `RideContext` and navigates to `ActiveTripScreen`.

**`ActiveTripScreen`**
- Displays the live status of the current trip.
- The trip status cycles through: `scheduled` → `driver_arriving` → `on_trip` → `arriving_soon` → `completed`.
- Shows:
  - A progress bar and phase label
  - ETA and remaining distance
  - Driver name, rating, trip count, phone
  - Vehicle name, type, plate number
  - Route on map with pickup/dropoff markers
  - **Mid-trip offer banner** (if a second rider is joining and a discount is offered)
- SOS button navigates to `SOSScreen`.
- "Cancel Ride" calls `cancelRideBooking()`.

**`BookingDetailScreen`**
- Shows full details of a past or scheduled booking (same layout as `ActiveTripScreen` but read-only).
- Option to add the ride to device calendar if it is a scheduled ride.

**`TripHistoryScreen`**
- Lists all past bookings for the authenticated rider via `fetchMyBookings()`.
- Each item shows route, date, fare, and status badge.
- Tapping an item navigates to `BookingDetailScreen`.

**`SOSScreen`**
- Emergency contact information.
- Option to call a safety helpline.
- Share live location.

**`ProfileScreen`**
- Displays the authenticated user's name, phone, email, role, and rating.
- Sign-out button calls `signOut()`.

---

#### Authenticated — Driver Screens

**`DriverDashboardScreen`** _(~820 lines)_
The primary hub for drivers. Features:
- **Online/Offline toggle** — calls `updateDriverSettings({ isOnline })` to flip `drivers.is_online` in the database.
- **Return trip toggle** — marks the driver as willing to drive back.
- **Stats summary** — shows active trips count, completed trips today, and earnings today.
- **Incoming Requests panel** — lists ride requests on the driver's active corridors that are still in `searching` state. Each card shows:
  - Rider name, route, overlap %, ETA, estimated fare, savings
  - "Accept" button → calls `acceptDriverRequest(requestId)` which creates a booking and links the rider to the driver's active trip.
- **My Trips panel** — lists all bookings assigned to this driver with live status badges.
- Tapping a booking navigates to `BookingDetailScreen` with driver status controls.
- Status update buttons (Arrive / Start Trip / Complete Trip) call `updateDriverTripStatus(id, status)`.

---

### `components/RouteMap.js`
A standalone component that receives a GeoJSON/Encoded polyline geometry and renders it as a `Polyline` overlay on a `MapView`. Used in `HomeScreen`, `ActiveTripScreen`, and `BookingDetailScreen`.

---

## 5. Backend Architecture (Node.js / Express)

### 5.1 Server Setup & Middleware

**`backend/src/server.js`** is the monolithic Express application:

1. `cors` with `allowedOrigin` from env.
2. `express.json()` body parser.
3. `readAuthToken` — extracts the raw Bearer token from `Authorization` header.
4. `requireAuth` — middleware that validates the token via `getSessionFromToken()`. Attaches `req.auth` (`{ token, expiresAt, user }`) to the request. Returns 401 if invalid.
5. `optionalAuth` — same but proceeds even if no token is provided (`req.auth` may be null).

**`backend/src/middleware/auth.js`**
- `readAuthToken(req)` — parses `Authorization: Bearer <token>`.
- `requireAuth` — calls `getSessionFromToken` and rejects unauthenticated requests.
- `optionalAuth` — attaches auth if present, otherwise sets `req.auth = null`.

**Global Error Handler:**
Any unhandled thrown error is caught by Express's 4-argument error handler. It infers the HTTP status from the error message keywords (`otp`, `phone`, `session`, `authentication` → 400) and formats a consistent `{ error, message }` JSON response.

---

### 5.2 REST API Endpoints

#### Public / Health
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service health check, shows DB & mapping config status |

#### Maps
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/maps/autocomplete?q=…&lat=…&lng=…` | None | Place search with optional focus point via Pelias |
| POST | `/api/maps/route` | None | Route preview between two coordinates via Valhalla |

#### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/request-otp` | None | Generate & store OTP for a phone number |
| POST | `/api/auth/verify-otp` | None | Validate OTP, create session, return token |
| GET | `/api/auth/session` | Required | Return current session info |
| POST | `/api/auth/logout` | Required | Revoke session token |

#### Ride Matching
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/ride-requests/preview-match` | Optional | Persist ride request, find matching active trips |

#### Bookings
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings/quote` | None | Calculate fare quote without persisting |
| POST | `/api/bookings` | Optional | Confirm booking (persists ride request + booking row) |
| GET | `/api/bookings/:id` | Optional | Fetch a single booking with live state |
| GET | `/api/me/bookings` | Required | All bookings for the authenticated rider |
| PATCH | `/api/bookings/:id/cancel` | Required | Cancel a booking (rider) |

#### Driver
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/driver/me/trips` | Required (driver) | Driver dashboard data |
| PATCH | `/api/driver/me/settings` | Required (driver) | Toggle online/offline, return trip flag |
| PATCH | `/api/driver/bookings/:id/status` | Required (driver) | Update trip status (`on_trip`, `arriving_soon`, `completed`, etc.) |
| POST | `/api/driver/requests/:id/accept` | Required (driver) | Accept an incoming rider request |

---

### 5.3 Service Layer (Backend)

#### `authService.js`
Handles the full authentication lifecycle:

1. **`requestOtp(phone)`**
   - Normalizes phone (handles 10-digit Indian numbers, adds `+91`).
   - Calls `ensureRiderUser` — finds or creates a `users` row with role `rider`.
   - Invalidates any prior unconsumed OTPs for this phone.
   - Generates a 6-digit code, stores its SHA-256 hash in `auth_otps`, sets expiry.
   - Returns `{ phone, maskedPhone, expiresAt, devOtp? }`.

2. **`verifyOtp(phone, code)`**
   - Finds the latest valid (non-expired, non-consumed) OTP for the phone.
   - Compares `sha256(code)` to stored `code_hash`.
   - On match, marks OTP as consumed, creates a UUID session token, stores `sha256(token)` in `user_sessions`.
   - Returns `{ token, expiresAt, user }`.

3. **`getSessionFromToken(token)`**
   - Looks up `user_sessions` by `sha256(token)`, checks not revoked and not expired.
   - Touches `last_seen_at`.
   - Returns the session payload.

4. **`revokeSession(token)`**
   - Sets `revoked_at = now()` on the matching session row.

---

#### `matchingService.js`
Core ride-pooling engine:

1. **`buildRideRequest(payload)`** — constructs a ride request object from the frontend payload. Detects the corridor using heuristics (Connaught Place → Noida, Gurgaon, etc.) and fills in estimated distance/duration if route data is not provided.

2. **`persistRideRequest(request, options)`** — inserts a `ride_requests` row with status `searching`, linking to `rider_id` if authenticated.

3. **`fetchCandidateRows(request)`** — queries `active_trips` joined with `corridors`, `drivers`, `vehicles` WHERE:
   - `status = 'open'`
   - `corridor_id` matches the request
   - `direction` matches
   - `available_seats >= seatsRequired`
   Falls back to seed candidates if no DB rows are found.

4. **`overlapScore(request, candidate)`** — computes how much of the rider's journey overlaps with the driver's active trip corridor. Produces `overlapKm`, `overlapRatio`, `detourMinutes` and a composite `score`.

5. **`buildMatch(request, candidate)`** — constructs a match object with shared fare (discounted by overlap ratio), savings, vehicle variants, and driver info.

6. **`previewMatches(payload)`** — orchestrates the full flow: build → persist → fetch candidates → filter (overlap ≥ 35%) → sort by score → return.

---

#### `bookingService.js`
Handles everything after a match is chosen:

1. **`calculateQuote({ request, match, vehicle, options })`**
   - `baseFare = max(distanceKm * 8, 100)`
   - `distanceFare = max(vehicle.fareValue * 0.64, 120)`
   - Plus `platformFee (20)` + `insuranceFee (15 or 0)`
   - Minus `poolingDiscount` (based on match savings) and `midTripPickupDiscount (18 or 0)`
   - Returns a detailed breakdown with `totals.total` and `totals.estimatedSavings`.

2. **`confirmBooking({ request, match, vehicle, quote, options })`**
   - If no DB pool → returns an **ephemeral** in-memory booking (mock mode).
   - Checks for existing booking on the same `ride_request_id` (idempotent).
   - Reserves seats on `active_trips` (decrements `available_seats`; marks full if 0 remain).
   - Inserts a `bookings` row with status `confirmed`.
   - Updates `ride_requests.status = 'booked'`.
   - Returns the normalized booking.

3. **`cancelBookingForUser({ bookingId, userId })`**
   - Verifies rider ownership.
   - Sets `bookings.booking_status = 'cancelled'`.
   - Sets `ride_requests.status = 'cancelled'`.
   - **Restores one seat** on `active_trips` and reopens the trip if it was `full`.

4. **`updateDriverBookingStatus({ bookingId, status, userId })`**
   - Verifies driver ownership.
   - Updates `bookings.booking_status`.
   - Propagates status to `ride_requests` (booked/completed/cancelled).
   - Propagates status to `active_trips` (open/in_progress/completed/cancelled).
   - All three updates run inside a single PostgreSQL **transaction**.

5. **`getBookingById(id)`** / **`getBookingsForUser(userId)`** / **`getDriverBookings(userId)`**
   - Complex JOIN queries across `bookings`, `ride_requests`, `active_trips`, `vehicles`, `drivers`, `users`.
   - Every row is passed through `normalizeBookingRow()` which runs the **Live Trip State Machine** (see §8.4).

6. **`buildLiveTripState(...)`** — see §8.4 for complete explanation.

---

#### `driverDispatchService.js`
Powers the driver-side of the dispatch loop:

1. **`getDriverRecord(userId)`** — fetches driver + user record.
2. **`getDriverOpenTrips(userId)`** — returns the driver's `open` or `in_progress` active trips.
3. **`getIncomingRequestsForDriver(userId)`** — if driver is online, fetches `searching` ride requests from the last 30 minutes on matching corridors, computes overlap scores, and returns ranked compatible requests.
4. **`getDriverDashboard(userId)`** — aggregates driver record, trip list, pending requests, and a summary (active count, completed count, today's earnings).
5. **`updateDriverAvailability(userId, payload)`** — flips `is_online` and `return_trip_available` on the `drivers` table.
6. **`acceptIncomingRequest({ requestId, userId })`** — full transactional accept flow:
   - Validates driver is online.
   - Validates request is still in `searching` state.
   - Finds the best matching active trip (overlap ≥ 35%).
   - Decrements `available_seats` on `active_trips`.
   - Inserts a `bookings` row (or returns existing).
   - Updates `ride_requests.status = 'booked'`.
   - Commits and returns the normalized booking.

---

#### `mappingService.js`
Thin wrappers around external mapping APIs:
- **`autocompletePlaces(query, { focusPoint })`** — calls Pelias `/v1/autocomplete` and transforms results to a simple `[{ label, coordinates }]` array.
- **`buildRoutePreview({ pickup, dropoff })`** — calls Valhalla `/route` with `auto` costing, extracts distance, duration, and geometry.
- If Pelias/Valhalla URLs are not configured, returns empty / fallback data.

---

## 6. Database Schema (PostgreSQL)

```
corridors
  └─ id (text PK), label, city, direction, start_landmark, end_landmark

users
  └─ id (uuid PK), full_name, phone (unique), email, role (rider|driver|admin), rating

drivers
  └─ id (uuid PK), user_id → users.id
     full_name, is_online (bool), rating, trip_count,
     commission_percent, streak_count, return_trip_available

vehicles
  └─ id (uuid PK), driver_id → drivers.id
     display_name, vehicle_type, category, seat_capacity,
     rate_per_km, eta_minutes, is_ev

active_trips
  └─ id (text PK), driver_id → drivers.id, vehicle_id → vehicles.id,
     corridor_id → corridors.id
     status (open|in_progress|full|completed|cancelled)
     origin_label, destination_label, origin_km, destination_km
     departure_window_start, departure_window_end
     available_seats, allow_mid_trip_join, base_solo_fare

ride_requests
  └─ id (uuid PK), rider_id → users.id, corridor_id → corridors.id
     pickup_label, dropoff_label, pickup_lat/lng, dropoff_lat/lng
     origin_km, destination_km
     route_distance_meters, route_duration_seconds, route_geometry (jsonb)
     ride_type, seats_required, allow_mid_trip_pickup, departure_time
     status (searching|booked|completed|cancelled)

bookings
  └─ id (uuid PK), ride_request_id → ride_requests.id,
     active_trip_id → active_trips.id
     quoted_total, shared_savings, payment_method
     booking_status (confirmed|on_trip|arriving_soon|completed|cancelled)

auth_otps
  └─ id (uuid PK), user_id → users.id, phone
     code_hash (sha256), expires_at, consumed_at

user_sessions
  └─ id (uuid PK), user_id → users.id
     token_hash (sha256, unique), expires_at, revoked_at, last_seen_at
```

---

## 7. End-to-End Feature Flows

### 7.1 Authentication — OTP Login

```
User                App                      Backend               DB
 │                   │                           │                   │
 │── enters phone ──►│  POST /auth/request-otp   │                   │
 │                   │──────────────────────────►│  normalizePhone   │
 │                   │                           │  ensureRiderUser──►─ INSERT users (if new)
 │                   │                           │  generate code    │
 │                   │                           │  hash(code)───────►─ INSERT auth_otps
 │◄─ "Code sent" ────│◄─ { maskedPhone, devOtp? }│                   │
 │                   │                           │                   │
 │── enters OTP ────►│  POST /auth/verify-otp    │                   │
 │                   │──────────────────────────►│  lookup OTP ──────►─ SELECT auth_otps
 │                   │                           │  compare hash     │
 │                   │                           │  mark consumed ───►─ UPDATE auth_otps
 │                   │                           │  gen UUID token   │
 │                   │                           │  hash(token) ─────►─ INSERT user_sessions
 │◄─ Logged in ──────│◄─ { token, user }         │                   │
 │                   │  persistSessionToken()    │                   │
```

### 7.2 Rider Flow — Booking a Ride

```
HomeScreen                    RideMatchScreen        VehicleSelectScreen    CheckoutScreen
│ searchPlaces(pickup)             │                       │                      │
│ searchPlaces(dropoff)            │                       │                      │
│ fetchRoutePreview()              │                       │                      │
│ ── navigate("RideMatch") ──────► │                       │                      │
│                                  │ previewRideMatches()  │                      │
│                          Backend persists ride_request    │                      │
│                          Finds active_trip candidates     │                      │
│                          Ranks by overlap score           │                      │
│                                  │ ── select match ────► │                      │
│                                  │                       │ fetchBookingQuote()   │
│                                  │                       │ ── "Book Now" ──────► │
│                                  │                       │                      │ confirmRideBooking()
│                                  │                       │               Backend:
│                                  │                       │               - INSERT bookings
│                                  │                       │               - UPDATE active_trips.available_seats
│                                  │                       │               - UPDATE ride_requests.status='booked'
│                                  │                       │                      │
│                                  │ ◄─────────── booking created ───────────────►│
│                                  │                                   navigate("ActiveTrip")
```

### 7.3 Rider Flow — Active Trip Tracking

```
ActiveTripScreen
│ On mount: fetchBookingDetails(bookingId)
│ Backend: buildLiveTripState() computes status from timestamps
│
│ Status progression (computed server-side, driven by booking_status + elapsed time):
│  scheduled ──► driver_arriving ──► on_trip ──► arriving_soon ──► completed
│
│ Screen polls or re-fetches to update:
│  - Progress bar (0→1)
│  - Phase label ("Driver arriving", "Ride in progress", etc.)
│  - Remaining minutes / distance
│  - Mid-trip offer banner (if allowMidTripPickup and rideProgress 25%–68%)
│
│ User actions:
│  - SOS button → navigate("SOS")
│  - Cancel → cancelRideBooking() → navigate back
```

### 7.4 Rider Flow — Trip History & Cancellation

```
TripHistoryScreen
│ fetchMyBookings(token)
│   Backend: SELECT bookings JOIN ride_requests WHERE rider_id = userId
│ Lists trips sorted by created_at desc
│
│ Tap a trip → BookingDetailScreen
│   fetchBookingDetails(bookingId)
│   If active: "Cancel Ride" → PATCH /bookings/:id/cancel
│     Backend (transaction):
│       UPDATE bookings.booking_status = 'cancelled'
│       UPDATE ride_requests.status = 'cancelled'
│       UPDATE active_trips.available_seats += 1  (seat returned)
```

### 7.5 Driver Flow — Going Online & Dashboard

```
DriverDashboardScreen
│ On mount: fetchDriverTrips(token)
│   Backend: getDriverDashboard(userId)
│     getDriverRecord()         → SELECT drivers JOIN users
│     getDriverBookings()       → SELECT bookings JOIN active_trips WHERE driver.user_id = userId
│     getIncomingRequestsForDriver()
│       → Only if driver.is_online = true
│       → getDriverOpenTrips()  → SELECT active_trips WHERE driver and status open/in_progress
│       → SELECT ride_requests  WHERE status='searching' AND corridor IN (driver corridors)
│       → overlapScore() for each pair
│       → filter overlap >= 0.35, rank by score
│
│ "Go Online" toggle → PATCH /api/driver/me/settings { isOnline: true }
│   Backend: UPDATE drivers SET is_online=true WHERE user_id=userId
│   Returns refreshed dashboard data
```

### 7.6 Driver Flow — Accepting an Incoming Request

```
DriverDashboardScreen
│ "Accept" button on an incoming request card
│ → POST /api/driver/requests/:requestId/accept
│
│ Backend (transaction):
│   1. Validate driver is_online=true
│   2. SELECT ride_requests WHERE id=requestId AND status='searching'
│   3. SELECT active_trips WHERE driver=me AND corridor matches AND available_seats >= required
│   4. overlapScore() → pick best candidate (overlap >= 35%)
│   5. UPDATE active_trips SET available_seats -= seatsRequired
│      (marks 'full' if seats reach 0, else 'in_progress')
│   6. INSERT bookings (quoted_total, shared_savings, payment_method='dispatch', status='confirmed')
│   7. UPDATE ride_requests.status = 'booked'
│   8. COMMIT
│   9. Return normalizeBookingRow() with live state
```

### 7.7 Driver Flow — Managing Trip Lifecycle

```
BookingDetailScreen (driver view)
│ Status buttons: [Arrive] [Start Trip] [Complete Trip]
│ Each calls: PATCH /api/driver/bookings/:id/status { status }
│
│ Backend (transaction):
│  booking_status →  ride_request status  → active_trip status
│  'confirmed'    →  'booked'             → 'open'
│  'on_trip'      →  'booked'             → 'in_progress'
│  'arriving_soon'→  'booked'             → 'in_progress'
│  'completed'    →  'completed'          → 'completed'
│  'cancelled'    →  'cancelled'          → 'cancelled'
```

---

## 8. Key Features Deep-Dive

### 8.1 Shared / Pool Ride Matching

RideShare is fundamentally a **corridor-based pooling system**. Rides are matched on pre-defined urban corridors (e.g., `delhi_cp_noida`, `gurgaon_cp_central`) rather than arbitrary point-to-point routes.

**How it works:**
1. When a rider submits a request, the system classifies the pickup/dropoff pair into a corridor using keyword heuristics on place labels.
2. `fetchCandidateRows` finds drivers whose `active_trips` are on the same corridor, heading in the same direction, with enough seats.
3. For each candidate, `overlapScore` computes:
   - `overlapKm` — how many km of the rider's journey the driver already covers
   - `overlapRatio` — `overlapKm / riderDistance` (0 to 1)
   - `detourMinutes` — extra time the driver must spend picking up/dropping off
   - `score = overlapRatio * 100 - detourMinutes`
4. Only matches with **overlap ≥ 35%** are returned, sorted by score descending.

### 8.2 Fare Calculation

```
Rider Fare = baseFare + distanceFare + platformFee + insuranceFee
             - poolingDiscount - midTripPickupDiscount

baseFare          = max(distanceKm * 8, ₹100)
distanceFare      = max(vehicle.fareValue * 0.64, ₹120)
platformFee       = ₹20
insuranceFee      = ₹15 (if opted in)
poolingDiscount   = max(match.savingsValue * 0.2, ₹35)
midTripDiscount   = ₹18 (if allowMidTripPickup enabled)

estimatedSavings  = soloReferenceFare - total
```

The **solo reference fare** (`match.soloFareValue`) is the driver's `base_solo_fare`, representing what the ride would cost with no pooling.

### 8.3 Mid-Trip Pickup (Dynamic Pooling)

If a rider enables **Allow Mid-Trip Pickup**, they:
- Get an additional ₹18 discount.
- Allow the driver to pick up a second rider mid-journey if one is found on the same corridor.
- During the trip, when `rideProgress` is between 25% and 68%, the backend returns a `midTripOffer` banner: `{ title: "Another rider can join nearby", discount: 40 }`.
- The `ActiveTripScreen` renders this offer as a dismissible card.

### 8.4 Live Trip State Machine

`buildLiveTripState()` in `bookingService.js` computes the **real-time trip status** purely from:
- `bookingStatus` (stored in DB)
- `bookingCreatedAt` (or `departureTime` for scheduled rides)
- `distanceKm`, `durationMinutes`, `vehicleEtaMinutes`

It simulates time-based progression:
```
totalTimelineMinutes = arrivalMinutes (2–8) + demoDriveMinutes (35% of durationMinutes)
elapsedMinutes       = now() - timelineStart
totalProgress        = clamp(elapsedMinutes / totalTimelineMinutes, 0, 1)
rideProgress         = (elapsedMinutes - arrivalMinutes) / demoDriveMinutes
```

Status mapping:
| Condition | tripStatus |
|---|---|
| Scheduled future departure | `scheduled` |
| `booking_status = 'cancelled'` | `cancelled` |
| `totalProgress >= 1` or `booking_status = 'completed'` | `completed` |
| `booking_status = 'arriving_soon'` | `arriving_soon` |
| `booking_status = 'on_trip'` | `on_trip` |
| `elapsed < arrivalMinutes` | `driver_arriving` |
| `rideProgress < 0.72` | `on_trip` |
| else | `arriving_soon` |

The database status (`booking_status`) can override the computed status (e.g., a driver manually marking a trip as `on_trip` will force `rideProgress >= 0.2`).

### 8.5 Mapping & Route Preview

Two external services are supported, both optional:

**Pelias** (Places Autocomplete):
- Called by `HomeScreen` as the rider types in the pickup/dropoff fields.
- `GET /v1/autocomplete?text=…&focus.point.lat=…&focus.point.lon=…`
- Results are ranked by proximity to the focus point.

**Valhalla** (Routing):
- Called once pickup and dropoff coordinates are confirmed.
- `POST /route` with `auto` costing, returns distance, duration in seconds, and an encoded polyline geometry.
- The geometry is decoded and rendered on the map via `RouteMap.js`.

If either service is unavailable, the `api.js` layer falls back to mock data seamlessly.

### 8.6 Mock / Offline Backend

When `EXPO_PUBLIC_API_BASE_URL` is not set, the app operates in **mock mode**:
- `previewRideMatches` → `buildMockMatchResponse` — generates 3–4 realistic match objects.
- `fetchRoutePreview` → `buildMockRoutePreview` — provides a route with hardcoded geometry and estimated distance/duration.
- `searchPlaces` → `buildMockPlaceResults` — returns well-known Delhi landmarks filtered by the query string.
- `fetchBookingQuote` → `buildMockQuote` — computes a realistic fare.
- `confirmRideBooking` → `buildMockBooking` — creates an in-memory booking with a `driver_arriving` status.

Auth operations (`requestOtp`, `verifyOtp`) **always require** the backend because they need a database.

### 8.7 SOS Screen

Accessible from the `ActiveTripScreen` via the SOS button (also linked in `AppNavigator`). Provides:
- Emergency helpline contact (one-tap call).
- Option to share the rider's live GPS coordinates.
- Safety tips and trusted contacts list.

This screen is deliberately kept simple and always accessible even during an active trip.

---

## 9. Data Flow Diagrams

### Ride Request to Booking

```
ride_requests (status: searching)
       │
       │ matchingService.previewMatches()
       ▼
active_trips (status: open, corridor match, seats available)
       │
       │ bookingService.confirmBooking()
       ▼
bookings (status: confirmed) ──────────► active_trips.available_seats -= 1
       │
       │ driverDispatchService.acceptIncomingRequest()  [alternative driver-pull path]
       ▼
bookings (status: confirmed, payment_method: 'dispatch')
```

### Status Propagation on Driver Action

```
Driver PATCH /api/driver/bookings/:id/status { status: "on_trip" }
       │
       ├── UPDATE bookings SET booking_status = 'on_trip'
       ├── UPDATE ride_requests SET status = 'booked'
       └── UPDATE active_trips SET status = 'in_progress'
```

---

## 10. Environment Configuration

### Frontend (`e:\Yavish\sdp\RideShare\.env`)
| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Base URL of the RideShare backend (e.g., `http://localhost:4000`). If empty, mock mode is used. |

### Backend (`e:\Yavish\sdp\RideShare\backend\.env`)
| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on (default: `4000`) |
| `DATABASE_URL` | PostgreSQL connection string (e.g., `postgres://user:pass@localhost/rideshare`) |
| `ALLOWED_ORIGIN` | CORS allowed origin for the mobile app |
| `PELIAS_BASE_URL` | Base URL for the Pelias geocoding service |
| `VALHALLA_BASE_URL` | Base URL for the Valhalla routing service |
| `AUTH_OTP_TTL_MINUTES` | How long an OTP is valid (default: `10`) |
| `AUTH_SESSION_DAYS` | How long a user session lasts (default: `30`) |
| `AUTH_EXPOSE_DEV_OTP` | If `true`, the OTP is returned in plaintext in the `requestOtp` response (dev only) |

---

*Last updated: March 2026*
