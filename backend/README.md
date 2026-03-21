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

## Suggested next backend steps

- add auth and user sessions
- persist driver live locations
- swap seeded corridor candidates with driver supply from active trips
- add background jobs for mid-trip join offers and driver return-trip supply
