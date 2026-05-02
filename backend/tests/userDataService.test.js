jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../src/config/db');
const {
  createEmergencyContact,
  createPaymentMethod,
  deleteSavedPlace,
  getProfileSummary,
  listSavedPlaces,
} = require('../src/services/userDataService');

describe('userDataService', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('lists saved places scoped to the authenticated user', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'place-1',
          label: 'Home',
          address: 'Sector 62',
          latitude: 28.62,
          longitude: 77.37,
        },
      ],
    });

    const response = await listSavedPlaces('user-1');

    expect(db.query.mock.calls[0][1]).toEqual(['user-1']);
    expect(response.items[0]).toMatchObject({
      id: 'place-1',
      label: 'Home',
      address: 'Sector 62',
    });
  });

  test('creates user-owned payment methods and clears older primaries', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'payment-1',
            type: 'UPI',
            label: 'GPay',
            is_primary: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const response = await createPaymentMethod('user-1', {
      type: 'UPI',
      label: 'GPay',
      isPrimary: true,
    });

    expect(db.query.mock.calls[0][1]).toEqual(['user-1', 'UPI', 'GPay', true]);
    expect(db.query.mock.calls[1][1]).toEqual(['user-1', 'payment-1']);
    expect(response.isPrimary).toBe(true);
  });

  test('delete and create operations require authenticated ownership and valid fields', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'place-1' }] });

    await deleteSavedPlace('user-1', 'place-1');

    expect(db.query.mock.calls[0][1]).toEqual(['place-1', 'user-1']);
    await expect(createEmergencyContact('user-1', { name: 'Mom' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('derives profile summary from persisted rows', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          role: 'rider',
          rating: 4.8,
          total_rides: 2,
          total_savings: 380,
          saved_places_count: 1,
          payment_methods_count: 1,
          emergency_contacts_count: 2,
          primary_payment_method: 'GPay',
        },
      ],
    });

    const response = await getProfileSummary('user-1');

    expect(db.query.mock.calls[0][1]).toEqual(['user-1']);
    expect(response).toMatchObject({
      totalRides: 2,
      totalSavings: 380,
      savedPlacesCount: 1,
      primaryPaymentMethod: 'GPay',
    });
  });
});
