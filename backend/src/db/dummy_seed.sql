insert into users (id, full_name, phone, email, role, rating)
values
  ('44444444-4444-4444-4444-444444444444', 'Shubham Gangwar', '+919876543210', 'shubham@rideshare.in', 'rider', 4.80),
  ('55555555-5555-5555-5555-555555555555', 'Riya Verma', '+919876543211', 'riya@rideshare.in', 'rider', 4.90),
  ('66666666-6666-6666-6666-666666666666', 'Neha Arora', '+919876543212', 'neha@rideshare.in', 'rider', 4.70),
  ('77777777-7777-7777-7777-777777777777', 'Vikram Patel', '+919999900004', 'vikram@rideshare.in', 'driver', 4.85),
  ('88888888-8888-8888-8888-888888888888', 'Sonal Mehta', '+919999900005', 'sonal@rideshare.in', 'driver', 4.92)
on conflict (id) do nothing;

insert into drivers (id, user_id, full_name, rating, trip_count, commission_percent, streak_count, return_trip_available)
values
  ('aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '77777777-7777-7777-7777-777777777777', 'Vikram P.', 4.85, 1540, 11.50, 6, true),
  ('aaaaaaa5-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '88888888-8888-8888-8888-888888888888', 'Sonal M.', 4.92, 1325, 12.00, 7, true)
on conflict (id) do nothing;

insert into vehicles (id, driver_id, display_name, vehicle_type, category, seat_capacity, rate_per_km, eta_minutes, is_ev)
values
  ('bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 'aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'Toyota Innova Crysta', 'Comfort Plus', 'comfort', 5, 12, 6, false),
  ('bbbbbbb5-bbbb-bbbb-bbbb-bbbbbbbbbbb5', 'aaaaaaa5-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'MG ZS EV', 'ECO Premium', 'eco', 4, 11, 5, true)
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
    'trip_corridor_4',
    'aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    'delhi_cp_noida',
    'open',
    'Barakhamba Road',
    'Noida Sector 18',
    0.8,
    18.5,
    now() - interval '10 minutes',
    now() + interval '25 minutes',
    3,
    true,
    540
  ),
  (
    'trip_corridor_5',
    'aaaaaaa5-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    'bbbbbbb5-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
    'delhi_cp_noida',
    'open',
    'Mandi House',
    'Mayur Vihar Phase 1',
    2.2,
    11.8,
    now() - interval '6 minutes',
    now() + interval '18 minutes',
    2,
    true,
    430
  ),
  (
    'trip_corridor_6',
    'aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    'gurgaon_cp_central',
    'open',
    'DLF Cyber City',
    'Patel Chowk',
    0.5,
    22.5,
    now() - interval '9 minutes',
    now() + interval '24 minutes',
    2,
    true,
    650
  ),
  (
    'trip_corridor_7',
    'aaaaaaa5-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    'bbbbbbb5-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
    'gurgaon_cp_central',
    'open',
    'Udyog Vihar Phase 2',
    'Barakhamba Road',
    1.0,
    23.0,
    now() - interval '7 minutes',
    now() + interval '26 minutes',
    3,
    false,
    610
  )
on conflict (id) do nothing;

insert into ride_requests (
  id,
  rider_id,
  corridor_id,
  pickup_label,
  dropoff_label,
  origin_km,
  destination_km,
  ride_type,
  seats_required,
  allow_mid_trip_pickup,
  departure_time,
  status
)
values
  (
    '99999999-1111-4444-8888-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'delhi_cp_noida',
    'Connaught Place, New Delhi',
    'Akshardham Temple, Delhi',
    0.0,
    15.0,
    'shared',
    1,
    true,
    now() - interval '1 day',
    'booked'
  ),
  (
    '99999999-2222-4444-8888-222222222222',
    '55555555-5555-5555-5555-555555555555',
    'delhi_cp_noida',
    'India Gate, New Delhi',
    'Noida Sector 15',
    4.0,
    16.0,
    'shared',
    1,
    true,
    now() - interval '10 hours',
    'completed'
  ),
  (
    '99999999-3333-4444-8888-333333333333',
    '66666666-6666-6666-6666-666666666666',
    'gurgaon_cp_central',
    'Cyber Hub, Gurgaon',
    'Connaught Place, New Delhi',
    0.0,
    24.0,
    'solo',
    1,
    false,
    now() - interval '5 hours',
    'completed'
  )
on conflict (id) do nothing;

insert into bookings (
  id,
  ride_request_id,
  active_trip_id,
  quoted_total,
  shared_savings,
  payment_method,
  booking_status
)
values
  (
    'cccccccc-1111-4444-8888-111111111111',
    '99999999-1111-4444-8888-111111111111',
    'trip_corridor_2',
    340,
    140,
    'upi',
    'confirmed'
  ),
  (
    'cccccccc-2222-4444-8888-222222222222',
    '99999999-2222-4444-8888-222222222222',
    'trip_corridor_4',
    365,
    155,
    'card',
    'completed'
  ),
  (
    'cccccccc-3333-4444-8888-333333333333',
    '99999999-3333-4444-8888-333333333333',
    'trip_corridor_6',
    590,
    0,
    'wallet',
    'completed'
  )
on conflict (id) do nothing;
