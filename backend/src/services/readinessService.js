const env = require('../config/env');

function getReadinessStatus() {
  const issues = [];
  const providerIssues = [];

  if (!env.databaseUrl) {
    issues.push('DATABASE_URL is not configured.');
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
    providerIssues.push('PELIAS_BASE_URL is not configured.');
  }

  if (!env.valhallaBaseUrl) {
    providerIssues.push('VALHALLA_BASE_URL is not configured.');
  }

  if (!env.appBaseUrl) {
    issues.push('PUBLIC_APP_URL is not configured.');
  }

  if (!env.expoProjectId) {
    issues.push('EXPO_PROJECT_ID is not configured.');
  }

  const shouldRequireProviders = env.nodeEnv === 'production';

  if (shouldRequireProviders) {
    issues.push(...providerIssues);
  }

  return {
    ok: issues.length === 0,
    appBaseUrlConfigured: Boolean(env.appBaseUrl),
    databaseConfigured: Boolean(env.databaseUrl),
    expoProjectIdConfigured: Boolean(env.expoProjectId),
    peliasConfigured: Boolean(env.peliasBaseUrl),
    providerWarnings: providerIssues,
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
