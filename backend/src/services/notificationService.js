const db = require('../config/db');

async function getNotifiableUsers(userIds = [], preferenceColumn = 'trip_updates_enabled') {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const result = await db.query(
    `
      select distinct
        dpt.expo_push_token
      from device_push_tokens dpt
      left join notification_preferences np on np.user_id = dpt.user_id
      where dpt.user_id = any($1::uuid[])
        and dpt.revoked_at is null
        and coalesce(np.push_enabled, true) = true
        and coalesce(np.${preferenceColumn}, true) = true
    `,
    [userIds]
  );

  return result.rows.map((row) => row.expo_push_token).filter(Boolean);
}

async function sendPushNotifications(tokens, payload) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return {
      sent: 0,
    };
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      body: JSON.stringify(
        tokens.map((token) => ({
          body: payload.body,
          data: payload.data || {},
          sound: 'default',
          title: payload.title,
          to: token,
        }))
      ),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      return {
        sent: 0,
      };
    }
  } catch (_error) {
    return {
      sent: 0,
    };
  }

  return {
    sent: tokens.length,
  };
}

async function notifyUsers(userIds, payload, options = {}) {
  const tokens = await getNotifiableUsers(userIds, options.preferenceColumn || 'trip_updates_enabled');
  return sendPushNotifications(tokens, payload);
}

module.exports = {
  notifyUsers,
};
