const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  authExposeDevOtp: process.env.AUTH_EXPOSE_DEV_OTP !== 'false',
  authOtpTtlMinutes: Number(process.env.AUTH_OTP_TTL_MINUTES || 5),
  authSessionDays: Number(process.env.AUTH_SESSION_DAYS || 30),
  databaseUrl: process.env.DATABASE_URL || '',
  peliasApiKey: process.env.PELIAS_API_KEY || '',
  peliasBaseUrl: process.env.PELIAS_BASE_URL || '',
  port: Number(process.env.PORT || 4000),
  valhallaBaseUrl: process.env.VALHALLA_BASE_URL || '',
};
