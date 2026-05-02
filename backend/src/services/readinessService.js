const env = require('../config/env');

function getReadinessStatus() {
  const issues = [];

  if (!env.databaseUrl) {
    issues.push('DATABASE_URL is not configured.');
  }

  if (env.isProduction && env.authExposeDevOtp) {
    issues.push('AUTH_EXPOSE_DEV_OTP must be false in production.');
  }

  if (env.isProduction && env.allowedOrigin === '*') {
    issues.push('ALLOWED_ORIGIN must be restricted in production.');
  }

  if (!env.authExposeDevOtp) {
    if (!env.twilioAccountSid) {
      issues.push('TWILIO_ACCOUNT_SID is not configured.');
    }

    if (!env.twilioAuthToken) {
      issues.push('TWILIO_AUTH_TOKEN is not configured.');
    }

    if (!env.twilioVerifyServiceSid) {
      issues.push('TWILIO_VERIFY_SERVICE_SID is not configured.');
    }
  }

  if (!env.peliasBaseUrl) {
    issues.push('PELIAS_BASE_URL is not configured.');
  }

  if (!env.valhallaBaseUrl) {
    issues.push('VALHALLA_BASE_URL is not configured.');
  }

  if (env.isProduction && env.allowMappingFallbacks) {
    issues.push('ALLOW_MAPPING_FALLBACKS must be false in production.');
  }

  return {
    ok: issues.length === 0,
    allowMappingFallbacks: env.allowMappingFallbacks,
    databaseConfigured: Boolean(env.databaseUrl),
    peliasConfigured: Boolean(env.peliasBaseUrl),
    twilioConfigured: Boolean(
      env.twilioAccountSid && env.twilioAuthToken && env.twilioVerifyServiceSid
    ),
    usingDevOtp: env.authExposeDevOtp,
    valhallaConfigured: Boolean(env.valhallaBaseUrl),
    issues,
  };
}

function assertStartupReadiness() {
  const readiness = getReadinessStatus();

  if (readiness.ok) {
    return readiness;
  }

  if (env.nodeEnv === 'production') {
    throw new Error(`Startup readiness failed: ${readiness.issues.join(' ')}`);
  }

  console.warn(`Startup readiness warnings: ${readiness.issues.join(' ')}`);
  return readiness;
}

module.exports = {
  assertStartupReadiness,
  getReadinessStatus,
};
