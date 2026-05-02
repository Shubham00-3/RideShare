describe('mappingService fallback gates', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const originalWarn = console.warn;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      ALLOW_MAPPING_FALLBACKS: 'false',
      PELIAS_BASE_URL: '',
      VALHALLA_BASE_URL: '',
    };
    console.warn = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    console.warn = originalWarn;
    jest.resetModules();
  });

  test('rejects autocomplete fallback when disabled', async () => {
    const { autocompletePlaces } = require('../src/services/mappingService');

    await expect(autocompletePlaces('Connaught Place')).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  test('rejects route fallback when disabled', async () => {
    const { buildRoutePreview } = require('../src/services/mappingService');

    await expect(
      buildRoutePreview({
        pickup: {
          label: 'Connaught Place, New Delhi',
          coordinates: {
            latitude: 28.6315,
            longitude: 77.2167,
          },
        },
        dropoff: {
          label: 'Akshardham Temple, Delhi',
          coordinates: {
            latitude: 28.6127,
            longitude: 77.2773,
          },
        },
      })
    ).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  test('uses and logs local fallback when enabled', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_MAPPING_FALLBACKS = 'true';
    process.env.PELIAS_BASE_URL = '';

    const { autocompletePlaces } = require('../src/services/mappingService');
    const places = await autocompletePlaces('Connaught Place');

    expect(places.length).toBeGreaterThan(0);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Pelias unavailable'));
  });
});
