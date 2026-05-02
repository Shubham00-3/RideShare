const request = require('supertest');

jest.mock('../src/services/readinessService', () => ({
  assertStartupReadiness: jest.fn(),
  getReadinessStatus: jest.fn(() => ({
    ok: true,
  })),
}));

jest.mock('../src/services/authService', () => ({
  getSessionFromToken: jest.fn(),
  requestOtp: jest.fn(),
  revokeSession: jest.fn(),
  updateUserProfile: jest.fn(),
  verifyOtp: jest.fn(),
}));

jest.mock('../src/services/mappingService', () => ({
  autocompletePlaces: jest.fn(),
  buildRoutePreview: jest.fn(),
}));

jest.mock('../src/services/matchingService', () => ({
  previewMatches: jest.fn(),
}));

jest.mock('../src/services/bookingService', () => ({
  cancelBookingForUser: jest.fn(),
  calculateQuote: jest.fn(() => ({ totals: { total: 250 } })),
  confirmBooking: jest.fn(),
  getBookingById: jest.fn(),
  getBookingsForUser: jest.fn(),
  updateDriverBookingStatus: jest.fn(),
}));

jest.mock('../src/services/driverDispatchService', () => ({
  acceptIncomingRequest: jest.fn(),
  getDriverDashboard: jest.fn(),
  updateDriverAvailability: jest.fn(),
  updateDriverLocation: jest.fn(),
}));

jest.mock('../src/services/userDataService', () => ({
  createEmergencyContact: jest.fn(),
  createPaymentMethod: jest.fn(),
  createSavedPlace: jest.fn(),
  deleteEmergencyContact: jest.fn(),
  deletePaymentMethod: jest.fn(),
  deleteSavedPlace: jest.fn(),
  getProfileSummary: jest.fn(),
  listEmergencyContacts: jest.fn(),
  listPaymentMethods: jest.fn(),
  listSavedPlaces: jest.fn(),
  updateEmergencyContact: jest.fn(),
  updatePaymentMethod: jest.fn(),
  updateSavedPlace: jest.fn(),
}));

const { app } = require('../src/server');
const authService = require('../src/services/authService');
const bookingService = require('../src/services/bookingService');
const driverDispatchService = require('../src/services/driverDispatchService');
const userDataService = require('../src/services/userDataService');

function buildSession(role = 'rider') {
  return {
    token: 'session-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    user: {
      id: role === 'driver' ? 'driver-1' : 'rider-1',
      role,
    },
  };
}

describe('API server routes', () => {
  beforeEach(() => {
    authService.getSessionFromToken.mockResolvedValue(null);
  });

  test('requests OTP through the auth service', async () => {
    authService.requestOtp.mockResolvedValue({
      ok: true,
      phone: '+919999900001',
    });

    const response = await request(app)
      .post('/api/auth/request-otp')
      .send({ phone: '9999900001' });

    expect(response.status).toBe(201);
    expect(authService.requestOtp).toHaveBeenCalledWith('9999900001');
    expect(response.body.ok).toBe(true);
  });

  test('verifies OTP and returns a session payload', async () => {
    authService.verifyOtp.mockResolvedValue({
      token: 'session-token',
      user: {
        id: 'rider-1',
      },
    });

    const response = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: '9999900001', code: '123456' });

    expect(response.status).toBe(200);
    expect(authService.verifyOtp).toHaveBeenCalledWith('9999900001', '123456');
    expect(response.body.token).toBe('session-token');
  });

  test('restores the current session for authenticated users', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));

    const response = await request(app)
      .get('/api/auth/session')
      .set('Authorization', 'Bearer session-token');

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe('rider-1');
  });

  test('accepts a query session token for event stream clients', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));

    const response = await request(app)
      .get('/api/auth/session?access_token=session-token');

    expect(response.status).toBe(200);
    expect(authService.getSessionFromToken).toHaveBeenCalledWith('session-token');
    expect(response.body.user.id).toBe('rider-1');
  });

  test('sets baseline hardening headers', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });

  test('logs out authenticated users', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer session-token');

    expect(response.status).toBe(204);
    expect(authService.revokeSession).toHaveBeenCalledWith('session-token');
  });

  test('updates the authenticated user profile', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));
    authService.updateUserProfile.mockResolvedValue({
      user: {
        id: 'rider-1',
        name: 'Ananya Rao',
        dateOfBirth: '1998-06-15',
        gender: 'female',
        profileComplete: true,
        role: 'driver',
      },
    });

    const response = await request(app)
      .patch('/api/me/profile')
      .set('Authorization', 'Bearer session-token')
      .send({
        name: 'Ananya Rao',
        dateOfBirth: '1998-06-15',
        gender: 'female',
        role: 'driver',
      });

    expect(response.status).toBe(200);
    expect(authService.updateUserProfile).toHaveBeenCalledWith('rider-1', {
      name: 'Ananya Rao',
      dateOfBirth: '1998-06-15',
      gender: 'female',
      role: 'driver',
    });
    expect(response.body.user.profileComplete).toBe(true);
  });

  test('requires authentication for booking creation', async () => {
    const response = await request(app).post('/api/bookings').send({});

    expect(response.status).toBe(401);
    expect(bookingService.confirmBooking).not.toHaveBeenCalled();
  });

  test('returns saved places for the authenticated user', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));
    userDataService.listSavedPlaces.mockResolvedValue({
      items: [
        {
          id: 'place-1',
          label: 'Home',
          address: 'Sector 62, Noida',
        },
      ],
    });

    const response = await request(app)
      .get('/api/me/saved-places')
      .set('Authorization', 'Bearer session-token');

    expect(response.status).toBe(200);
    expect(userDataService.listSavedPlaces).toHaveBeenCalledWith('rider-1');
    expect(response.body.items).toHaveLength(1);
  });

  test('creates payment methods scoped to the authenticated user', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));
    userDataService.createPaymentMethod.mockResolvedValue({
      id: 'payment-1',
      type: 'UPI',
      label: 'GPay',
      isPrimary: true,
    });

    const response = await request(app)
      .post('/api/me/payment-methods')
      .set('Authorization', 'Bearer session-token')
      .send({
        type: 'UPI',
        label: 'GPay',
        isPrimary: true,
      });

    expect(response.status).toBe(201);
    expect(userDataService.createPaymentMethod).toHaveBeenCalledWith('rider-1', {
      type: 'UPI',
      label: 'GPay',
      isPrimary: true,
    });
    expect(response.body.id).toBe('payment-1');
  });

  test('returns dynamic profile summary for the authenticated user', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));
    userDataService.getProfileSummary.mockResolvedValue({
      role: 'rider',
      rating: 4.9,
      totalRides: 3,
      totalSavings: 420,
      savedPlacesCount: 1,
      paymentMethodsCount: 1,
      emergencyContactsCount: 2,
      primaryPaymentMethod: 'GPay',
    });

    const response = await request(app)
      .get('/api/me/profile-summary')
      .set('Authorization', 'Bearer session-token');

    expect(response.status).toBe(200);
    expect(userDataService.getProfileSummary).toHaveBeenCalledWith('rider-1');
    expect(response.body.totalRides).toBe(3);
  });

  test('passes viewer ownership info to booking fetch', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));
    bookingService.getBookingById.mockResolvedValue({
      bookingId: 'booking-1',
      trip: {},
    });

    const response = await request(app)
      .get('/api/bookings/booking-1')
      .set('Authorization', 'Bearer session-token');

    expect(response.status).toBe(200);
    expect(bookingService.getBookingById).toHaveBeenCalledWith('booking-1', {
      userId: 'rider-1',
      userRole: 'rider',
    });
  });

  test('returns booking authorization errors explicitly', async () => {
    const forbiddenError = new Error('Forbidden booking access.');
    forbiddenError.statusCode = 403;
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));
    bookingService.getBookingById.mockRejectedValue(forbiddenError);

    const response = await request(app)
      .get('/api/bookings/booking-1')
      .set('Authorization', 'Bearer session-token');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Forbidden booking access.');
  });

  test('blocks rider sessions from driver-only routes', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('rider'));

    const response = await request(app)
      .get('/api/driver/me/trips')
      .set('Authorization', 'Bearer session-token');

    expect(response.status).toBe(403);
    expect(driverDispatchService.getDriverDashboard).not.toHaveBeenCalled();
  });

  test('updates driver location for authenticated driver sessions', async () => {
    authService.getSessionFromToken.mockResolvedValue(buildSession('driver'));
    driverDispatchService.updateDriverLocation.mockResolvedValue({
      bookingId: 'booking-1',
    });

    const response = await request(app)
      .patch('/api/driver/me/location')
      .set('Authorization', 'Bearer session-token')
      .send({
        bookingId: 'booking-1',
        latitude: 28.63,
        longitude: 77.22,
      });

    expect(response.status).toBe(200);
    expect(driverDispatchService.updateDriverLocation).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      latitude: 28.63,
      longitude: 77.22,
      userId: 'driver-1',
    });
  });
});
