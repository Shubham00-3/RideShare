create extension if not exists "pgcrypto";

create table if not exists corridors (
  id text primary key,
  label text not null,
  city text not null,
  direction text not null,
  start_landmark text not null,
  end_landmark text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text unique,
  role text not null check (role in ('rider', 'driver', 'admin')),
  rating numeric(3,2) not null default 5.0,
  created_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null,
  rating numeric(3,2) not null default 5.0,
  trip_count integer not null default 0,
  commission_percent numeric(5,2) not null default 12.5,
  streak_count integer not null default 0,
  return_trip_available boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  display_name text not null,
  vehicle_type text not null,
  category text not null,
  seat_capacity integer not null,
  rate_per_km numeric(8,2) not null,
  eta_minutes integer not null default 5,
  is_ev boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists ride_requests (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references users(id),
  corridor_id text references corridors(id),
  pickup_label text not null,
  dropoff_label text not null,
  origin_km numeric(8,2) not null,
  destination_km numeric(8,2) not null,
  ride_type text not null,
  seats_required integer not null default 1,
  allow_mid_trip_pickup boolean not null default true,
  departure_time timestamptz not null,
  status text not null default 'searching',
  created_at timestamptz not null default now()
);

create table if not exists active_trips (
  id text primary key,
  driver_id uuid not null references drivers(id),
  vehicle_id uuid not null references vehicles(id),
  corridor_id text not null references corridors(id),
  status text not null default 'open',
  origin_label text not null,
  destination_label text not null,
  origin_km numeric(8,2) not null,
  destination_km numeric(8,2) not null,
  departure_window_start timestamptz not null,
  departure_window_end timestamptz not null,
  available_seats integer not null,
  allow_mid_trip_join boolean not null default true,
  base_solo_fare numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid references ride_requests(id),
  active_trip_id text references active_trips(id),
  quoted_total numeric(10,2) not null,
  shared_savings numeric(10,2) not null default 0,
  payment_method text not null,
  booking_status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create table if not exists auth_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
