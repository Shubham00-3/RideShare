const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  authExposeDevOtp: process.env.AUTH_EXPOSE_DEV_OTP !== 'false',
  authOtpTtlMinutes: Number(process.env.AUTH_OTP_TTL_MINUTES || 5),
  authSessionDays: Number(process.env.AUTH_SESSION_DAYS || 30),
  appBaseUrl: process.env.PUBLIC_APP_URL || '',
  databaseUrl: process.env.DATABASE_URL || '',
  expoProjectId: process.env.EXPO_PROJECT_ID || process.env.EXPO_PUBLIC_EXPO_PROJECT_ID || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  peliasApiKey: process.env.PELIAS_API_KEY || '',
  peliasBaseUrl: process.env.PELIAS_BASE_URL || '',
  port: Number(process.env.PORT || 4000),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
  valhallaBaseUrl: process.env.VALHALLA_BASE_URL || '',
};
