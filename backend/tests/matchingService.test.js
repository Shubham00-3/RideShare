jest.mock('../src/config/db', () => ({
  getPool: jest.fn(),
  query: jest.fn(),
}));

const db = require('../src/config/db');
const { previewMatches } = require('../src/services/matchingService');

const requestGeometry = {
  type: 'LineString',
  coordinates: [
    [77.2167, 28.6315],
    [77.245, 28.622],
    [77.2773, 28.6127],
  ],
};

describe('matchingService', () => {
  beforeEach(() => {
    db.getPool.mockReturnValue({});
    db.query.mockReset();
  });

  test('prefers geometry overlap when both routes are available', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'ride-request-1' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'trip_corridor_2',
            corridor_id: 'delhi_cp_noida',
            corridor_label: 'Connaught Place -> East Delhi / Noida',
            direction: 'eastbound',
            origin_label: 'India Gate, New Delhi',
            destination_label: 'Akshardham Temple, Delhi',
            origin_km: 0,
            destination_km: 15,
            departure_window_start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            departure_window_end: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            base_solo_fare: 500,
            available_seats: 2,
            allow_mid_trip_join: true,
            route_geometry: requestGeometry,
            vehicle_eta_minutes: 4,
            driver_name: 'Priya',
            driver_rating: 4.9,
            driver_trip_count: 900,
            vehicle_name: 'Tata Nexon EV',
            vehicle_type: 'ECO',
            vehicle_category: 'eco',
            vehicle_rate_per_km: 9,
          },
        ],
      });

    const result = await previewMatches(
      {
        pickup: 'Connaught Place, New Delhi',
        dropoff: 'Akshardham Temple, Delhi',
        pickupLocation: {
          label: 'Connaught Place, New Delhi',
          coordinates: {
            latitude: 28.6315,
            longitude: 77.2167,
          },
        },
        dropoffLocation: {
          label: 'Akshardham Temple, Delhi',
          coordinates: {
            latitude: 28.6127,
            longitude: 77.2773,
          },
        },
        route: {
          distanceKm: 9.4,
          durationSeconds: 1100,
          geometry: requestGeometry,
        },
      },
      {
        userId: 'rider-1',
      }
    );

    expect(result.matches[0].overlapSource).toBe('geometry');
  });

  test('falls back to corridor overlap when candidate route geometry is missing', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'ride-request-2' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'trip_corridor_3',
            corridor_id: 'gurgaon_cp_central',
            corridor_label: 'Gurgaon -> Central Delhi',
            direction: 'northbound',
            origin_label: 'DLF Cyber City, Gurgaon',
            destination_label: 'Connaught Place, New Delhi',
            origin_km: 0,
            destination_km: 24,
            departure_window_start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            departure_window_end: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            base_solo_fare: 620,
            available_seats: 2,
            allow_mid_trip_join: false,
            route_geometry: null,
            vehicle_eta_minutes: 5,
            driver_name: 'Amit',
            driver_rating: 4.7,
            driver_trip_count: 800,
            vehicle_name: 'Hyundai i20',
            vehicle_type: 'Comfort',
            vehicle_category: 'comfort',
            vehicle_rate_per_km: 10,
          },
        ],
      });

    const result = await previewMatches({
      pickup: 'Cyber Hub, Gurgaon',
      dropoff: 'Connaught Place, New Delhi',
      pickupLocation: {
        label: 'DLF Cyber City, Gurgaon',
        coordinates: {
          latitude: 28.4959,
          longitude: 77.0891,
        },
      },
      dropoffLocation: {
        label: 'Connaught Place, New Delhi',
        coordinates: {
          latitude: 28.6315,
          longitude: 77.2167,
        },
      },
      route: {
        distanceKm: 24,
        durationSeconds: 3000,
        geometry: requestGeometry,
      },
    });

    expect(result.matches[0].overlapSource).toBe('corridor');
  });

  test('women-only searches require a female rider and female driver matches', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ gender: 'female' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ride-request-3' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'trip_corridor_2',
            corridor_id: 'delhi_cp_noida',
            corridor_label: 'Connaught Place -> East Delhi / Noida',
            direction: 'eastbound',
            origin_label: 'India Gate, New Delhi',
            destination_label: 'Akshardham Temple, Delhi',
            origin_km: 0,
            destination_km: 15,
            departure_window_start: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            departure_window_end: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            base_solo_fare: 500,
            available_seats: 2,
            allow_mid_trip_join: true,
            driver_gender: 'female',
            driver_name: 'Priya',
            driver_rating: 4.9,
            driver_trip_count: 900,
            route_geometry: requestGeometry,
            vehicle_category: 'eco',
            vehicle_eta_minutes: 4,
            vehicle_name: 'Tata Nexon EV',
            vehicle_rate_per_km: 9,
            vehicle_type: 'ECO',
          },
        ],
      });

    const result = await previewMatches(
      {
        dropoff: 'Akshardham Temple, Delhi',
        pickup: 'Connaught Place, New Delhi',
        route: {
          distanceKm: 9.4,
          durationSeconds: 1100,
          geometry: requestGeometry,
        },
        womenOnly: true,
      },
      {
        userId: 'rider-1',
      }
    );

    expect(result.request.womenOnly).toBe(true);
    expect(result.matches[0].vehicles[0].driver.gender).toBe('female');
  });

  test('rejects women-only searches for non-female rider profiles', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ gender: 'male' }] });

    await expect(
      previewMatches(
        {
          dropoff: 'Akshardham Temple, Delhi',
          pickup: 'Connaught Place, New Delhi',
          womenOnly: true,
        },
        {
          userId: 'rider-1',
        }
      )
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
