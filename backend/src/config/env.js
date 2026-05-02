const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function readBoolean(name, defaultValue) {
  const value = process.env[name];

  if (value == null || value === '') {
    return defaultValue;
  }

  return String(value).trim().toLowerCase() === 'true';
}

module.exports = {
  allowMappingFallbacks: readBoolean('ALLOW_MAPPING_FALLBACKS', !isProduction),
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  authExposeDevOtp: readBoolean('AUTH_EXPOSE_DEV_OTP', !isProduction),
  authOtpTtlMinutes: Number(process.env.AUTH_OTP_TTL_MINUTES || 5),
  authSessionDays: Number(process.env.AUTH_SESSION_DAYS || 30),
  databaseUrl: process.env.DATABASE_URL || '',
  isProduction,
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '100kb',
  nodeEnv,
  peliasApiKey: process.env.PELIAS_API_KEY || '',
  peliasBaseUrl: process.env.PELIAS_BASE_URL || '',
  port: Number(process.env.PORT || 4000),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
  valhallaBaseUrl: process.env.VALHALLA_BASE_URL || '',
};
