# RideShare Connect API

This backend is the first MVP slice for partial-route carpool matching using PostgreSQL.

## What it covers

- ride request intake
- partial-route candidate matching
- fare quote generation
- booking confirmation payloads for the mobile app

## Setup

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run the schema in `src/db/schema.sql`.
4. Install dependencies with `npm install` inside `backend/`.
5. Start the API with `npm run dev`.

`npm run dev` now uses `nodemon`, so backend changes under `src/` and `scripts/` restart the server automatically.

## Health checks

Quick API health check:

```bash
npm run healthcheck
```

Full API smoke check:

```bash
npm run smoke
```

By default this smoke check is read-only:

- checks `/health`
- checks preview match
- checks quote generation

To also test booking creation and booking fetch:

```bash
SMOKE_BOOKING_WRITE=true npm run smoke
```

From the repo root you can also run:

```bash
npm run api:seed-dummy
npm run api:reset-demo
npm run api:health
npm run api:smoke
```

Optional environment override:

- `API_BASE_URL=http://127.0.0.1:4000`
- `SMOKE_BOOKING_WRITE=true`

If seeded trip windows become stale or repeated bookings consume all seats, refresh the demo trip state with:

```bash
npm run reset:demo
```

To load richer dummy data for testing the booking flow and larger matching sets:

```bash
npm run seed:dummy
```

## Suggested next backend steps

- add auth and user sessions
- persist driver live locations
- swap seeded corridor candidates with driver supply from active trips
- add background jobs for mid-trip join offers and driver return-trip supply
