const env = require('../config/env');

function getBasicAuthHeader() {
  const token = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64');
  return `Basic ${token}`;
}

function buildTwilioUrl(path) {
  return `https://verify.twilio.com/v2/Services/${env.twilioVerifyServiceSid}${path}`;
}

async function requestTwilioVerify(path, body) {
  const response = await fetch(buildTwilioUrl(path), {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || 'Twilio Verify request failed.');
  }

  return payload;
}

async function startVerification(phone) {
  return requestTwilioVerify('/Verifications', {
    Channel: 'sms',
    To: phone,
  });
}

async function checkVerification(phone, code) {
  return requestTwilioVerify('/VerificationCheck', {
    Code: String(code || ''),
    To: phone,
  });
}

module.exports = {
  checkVerification,
  startVerification,
};
