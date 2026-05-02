jest.mock('../src/config/db', () => ({
  getPool: jest.fn(),
  query: jest.fn(),
}));

const db = require('../src/config/db');
const { confirmBooking } = require('../src/services/bookingService');

const bookingRow = {
  booking_id: 'booking-1',
  booking_status: 'confirmed',
  quoted_total: 320,
  shared_savings: 140,
  payment_method: '22222222-2222-4222-8222-222222222222',
  booking_created_at: new Date().toISOString(),
  ride_request_id: 'ride-request-1',
  rider_id: 'rider-1',
  pickup_label: 'Connaught Place, New Delhi',
  dropoff_label: 'Akshardham Temple, Delhi',
  pickup_lat: 28.6315,
  pickup_lng: 77.2167,
  dropoff_lat: 28.6127,
  dropoff_lng: 77.2773,
  ride_type: 'shared',
  allow_mid_trip_pickup: true,
  departure_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  origin_km: 0,
  destination_km: 15,
  route_distance_meters: 9400,
  route_duration_seconds: 1100,
  route_geometry: {
    type: 'LineString',
    coordinates: [
      [77.2167, 28.6315],
      [77.245, 28.622],
      [77.2773, 28.6127],
    ],
  },
  seats_required: 1,
  request_created_at: new Date().toISOString(),
  active_trip_id: 'trip_corridor_2',
  active_trip_status: 'open',
  allow_mid_trip_join: true,
  active_route_geometry: {
    type: 'LineString',
    coordinates: [
      [77.2167, 28.6315],
      [77.245, 28.622],
      [77.2773, 28.6127],
    ],
  },
  active_route_distance_meters: 9400,
  active_route_duration_seconds: 1100,
  current_lat: 28.6315,
  current_lng: 77.2167,
  last_location_at: new Date().toISOString(),
  trip_started_at: null,
  trip_completed_at: null,
  vehicle_name: 'Tata Nexon EV',
  vehicle_type: 'ECO',
  vehicle_eta_minutes: 4,
  driver_name: 'Priya',
  driver_rating: 4.8,
  driver_trip_count: 800,
  driver_user_id: 'driver-1',
  driver_phone: '+919999900002',
  rider_name: 'Test Rider',
  rider_phone: '+919999900001',
};

describe('bookingService', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('rejects booking confirmation for a foreign ride request', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'ride-request-1',
              rider_id: 'someone-else',
              status: 'searching',
              seats_required: 1,
            },
          ],
        })
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.getPool.mockReturnValue({
      connect: jest.fn().mockResolvedValue(client),
    });

    await expect(
      confirmBooking({
        request: {
          id: '11111111-1111-4111-8111-111111111111',
          seatsRequired: 1,
        },
        match: {
          id: 'trip_corridor_2',
        },
        quote: {
          totals: {
            total: 320,
            estimatedSavings: 140,
          },
        },
        options: {
          paymentMethod: '22222222-2222-4222-8222-222222222222',
        },
        userId: 'rider-1',
      })
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('confirms a booking for the owning rider and returns the persisted booking', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'ride-request-1',
              rider_id: 'rider-1',
              status: 'searching',
              seats_required: 1,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '22222222-2222-4222-8222-222222222222',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'trip_corridor_2',
              available_seats: 2,
              allow_mid_trip_join: true,
              route_geometry: bookingRow.active_route_geometry,
              route_distance_meters: 9400,
              route_duration_seconds: 1100,
              current_lat: null,
              current_lng: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'trip_corridor_2' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'booking-1' }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.getPool.mockReturnValue({
      connect: jest.fn().mockResolvedValue(client),
    });
    db.query.mockResolvedValueOnce({
      rows: [bookingRow],
    });

    const booking = await confirmBooking({
      request: {
        id: '11111111-1111-4111-8111-111111111111',
        seatsRequired: 1,
      },
      match: {
        id: 'trip_corridor_2',
      },
        quote: {
          totals: {
            total: 320,
            estimatedSavings: 140,
          },
        },
        options: {
          paymentMethod: '22222222-2222-4222-8222-222222222222',
        },
        userId: 'rider-1',
      });

    expect(booking.bookingId).toBe('booking-1');
    expect(booking.trip.routeGeometry).toEqual(bookingRow.active_route_geometry);
  });

  test('rejects booking confirmation without a stored payment method', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'ride-request-1',
              rider_id: 'rider-1',
              status: 'searching',
              seats_required: 1,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    db.getPool.mockReturnValue({
      connect: jest.fn().mockResolvedValue(client),
    });

    await expect(
      confirmBooking({
        request: {
          id: '11111111-1111-4111-8111-111111111111',
          seatsRequired: 1,
        },
        match: {
          id: 'trip_corridor_2',
        },
        quote: {
          totals: {
            total: 320,
            estimatedSavings: 140,
          },
        },
        userId: 'rider-1',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
