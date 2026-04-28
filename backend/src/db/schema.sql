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
  gender text not null default 'unspecified' check (gender in ('female', 'male', 'non_binary', 'unspecified')),
  role text not null check (role in ('rider', 'driver', 'admin')),
  rating numeric(3,2) not null default 5.0,
  created_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null,
  is_online boolean not null default true,
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
  pickup_lat numeric(10,6),
  pickup_lng numeric(10,6),
  dropoff_lat numeric(10,6),
  dropoff_lng numeric(10,6),
  origin_km numeric(8,2) not null,
  destination_km numeric(8,2) not null,
  route_distance_meters integer,
  route_duration_seconds integer,
  route_geometry jsonb,
  ride_type text not null,
  seats_required integer not null default 1,
  allow_mid_trip_pickup boolean not null default true,
  women_only boolean not null default false,
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
  route_geometry jsonb,
  route_distance_meters integer,
  route_duration_seconds integer,
  current_lat numeric(10,6),
  current_lng numeric(10,6),
  last_location_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
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

create table if not exists saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null,
  address text not null,
  latitude numeric(10,6),
  longitude numeric(10,6),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notification_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  push_enabled boolean not null default true,
  trip_updates_enabled boolean not null default true,
  safety_alerts_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text,
  device_label text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists trip_ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  rater_user_id uuid not null references users(id) on delete cascade,
  subject_user_id uuid not null references users(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, rater_user_id)
);

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  category text not null default 'general',
  priority text not null default 'normal',
  status text not null default 'open',
  message text not null,
  resolution_notes text,
  assigned_admin_id uuid references users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sos_incidents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  user_id uuid not null references users(id) on delete cascade,
  support_ticket_id uuid references support_tickets(id) on delete set null,
  status text not null default 'open',
  summary text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  emergency_contacts_snapshot jsonb not null default '[]'::jsonb,
  resolution_notes text,
  resolved_by_admin_id uuid references users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists booking_share_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists auth_rate_limits (
  action text not null,
  subject text not null,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  last_attempt_at timestamptz not null default now(),
  primary key (action, subject)
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

alter table drivers
  add column if not exists is_online boolean not null default true;

alter table active_trips
  add column if not exists route_geometry jsonb,
  add column if not exists route_distance_meters integer,
  add column if not exists route_duration_seconds integer,
  add column if not exists current_lat numeric(10,6),
  add column if not exists current_lng numeric(10,6),
  add column if not exists last_location_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table ride_requests
  add column if not exists pickup_lat numeric(10,6),
  add column if not exists pickup_lng numeric(10,6),
  add column if not exists dropoff_lat numeric(10,6),
  add column if not exists dropoff_lng numeric(10,6),
  add column if not exists route_distance_meters integer,
  add column if not exists route_duration_seconds integer,
  add column if not exists route_geometry jsonb,
  add column if not exists women_only boolean not null default false;

alter table users
  add column if not exists gender text not null default 'unspecified';

create index if not exists idx_saved_places_user on saved_places(user_id);
create index if not exists idx_emergency_contacts_user on emergency_contacts(user_id);
create index if not exists idx_device_push_tokens_user on device_push_tokens(user_id)
  where revoked_at is null;
create index if not exists idx_trip_ratings_subject on trip_ratings(subject_user_id);
create index if not exists idx_support_tickets_user on support_tickets(user_id);
create index if not exists idx_support_tickets_status on support_tickets(status);
create index if not exists idx_sos_incidents_user on sos_incidents(user_id);
create index if not exists idx_sos_incidents_status on sos_incidents(status);
