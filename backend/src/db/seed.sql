insert into corridors (id, label, city, direction, start_landmark, end_landmark)
values
  ('delhi_cp_noida', 'Connaught Place -> East Delhi / Noida', 'Delhi-NCR', 'eastbound', 'Connaught Place', 'Noida Sector 15'),
  ('gurgaon_cp_central', 'Gurgaon -> Central Delhi', 'Delhi-NCR', 'northbound', 'Cyber Hub', 'Connaught Place')
on conflict (id) do nothing;

insert into users (id, full_name, phone, email, role, rating, gender, date_of_birth, profile_completed_at)
values
  ('11111111-1111-1111-1111-111111111111', 'Rajesh Kumar', '+919999900001', 'rajesh@rideshare.in', 'driver', 4.90, 'male', '1988-04-12', now()),
  ('22222222-2222-2222-2222-222222222222', 'Priya Malhotra', '+919999900002', 'priya@rideshare.in', 'driver', 4.80, 'female', '1991-09-22', now()),
  ('33333333-3333-3333-3333-333333333333', 'Amit Sharma', '+919999900003', 'amit@rideshare.in', 'driver', 4.70, 'male', '1986-01-18', now())
on conflict (id) do nothing;

update users
set
  gender = case id
    when '11111111-1111-1111-1111-111111111111' then 'male'
    when '22222222-2222-2222-2222-222222222222' then 'female'
    when '33333333-3333-3333-3333-333333333333' then 'male'
    else gender
  end,
  profile_completed_at = coalesce(profile_completed_at, now())
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

insert into drivers (id, user_id, full_name, rating, trip_count, commission_percent, streak_count, return_trip_available)
values
  ('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'Rajesh K.', 4.90, 1250, 12.50, 4, true),
  ('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', 'Priya M.', 4.80, 860, 12.50, 5, true),
  ('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '33333333-3333-3333-3333-333333333333', 'Amit S.', 4.70, 900, 11.00, 3, false)
on conflict (id) do nothing;

insert into vehicles (id, driver_id, display_name, vehicle_type, category, seat_capacity, rate_per_km, eta_minutes, is_ev)
values
  ('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Maruti Suzuki Swift', 'Economy', 'economy', 3, 8, 3, false),
  ('bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Tata Nexon EV', 'ECO', 'eco', 3, 9, 4, true),
  ('bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Hyundai i20', 'Comfort', 'comfort', 3, 10, 5, false)
on conflict (id) do nothing;

insert into active_trips (
  id,
  driver_id,
  vehicle_id,
  corridor_id,
  status,
  origin_label,
  destination_label,
  origin_km,
  destination_km,
  departure_window_start,
  departure_window_end,
  available_seats,
  allow_mid_trip_join,
  base_solo_fare
)
values
  (
    'trip_corridor_1',
    'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'delhi_cp_noida',
    'open',
    'Rajiv Chowk Metro',
    'Noida Sector 15',
    1.5,
    16.5,
    now() - interval '5 minutes',
    now() + interval '20 minutes',
    2,
    true,
    500
  ),
  (
    'trip_corridor_2',
    'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'delhi_cp_noida',
    'open',
    'India Gate',
    'Akshardham',
    4.5,
    13.5,
    now() - interval '8 minutes',
    now() + interval '22 minutes',
    3,
    true,
    470
  ),
  (
    'trip_corridor_3',
    'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    'gurgaon_cp_central',
    'open',
    'Cyber Hub',
    'Connaught Place',
    0,
    24,
    now() - interval '12 minutes',
    now() + interval '28 minutes',
    1,
    false,
    620
  )
on conflict (id) do nothing;
