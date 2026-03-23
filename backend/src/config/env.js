const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  authExposeDevOtp: process.env.AUTH_EXPOSE_DEV_OTP !== 'false',
  authOtpTtlMinutes: Number(process.env.AUTH_OTP_TTL_MINUTES || 5),
  authSessionDays: Number(process.env.AUTH_SESSION_DAYS || 30),
  databaseUrl: process.env.DATABASE_URL || '',
  port: Number(process.env.PORT || 4000),
};
