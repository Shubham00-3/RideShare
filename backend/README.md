# RideShare Connect API

This backend is the current MVP backend for RideShare Connect, with persisted rider and driver flows on PostgreSQL.

## What it covers

- ride request intake
- partial-route candidate matching
- route-aware matching when geometry is available
- auth request / verify / session / logout
- fare quote generation
- booking creation, fetch, history, and cancellation
- driver dashboard, dispatch acceptance, status updates, and live location updates

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

To also test authenticated rider and driver flow:

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

If you want to resync persisted route geometry and live-location defaults on seeded trips:

```bash
npm run sync:routes
```

To load richer dummy data for testing the booking flow and larger matching sets:

```bash
npm run seed:dummy
```

## Suggested next backend steps

- configure Twilio Verify for non-dev SMS OTP delivery
- broaden automated coverage beyond the current Jest + Supertest suite
- add payment integration and transaction records
