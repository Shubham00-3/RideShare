const db = require('../config/db');

function buildStatusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizePlace(row) {
  return {
    address: row.address,
    coordinates:
      row.latitude != null && row.longitude != null
        ? {
            latitude: toNumber(row.latitude),
            longitude: toNumber(row.longitude),
          }
        : null,
    id: row.id,
    isDefault: Boolean(row.is_default),
    label: row.label,
    updatedAt: row.updated_at,
  };
}

function normalizeEmergencyContact(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    relationship: row.relationship || '',
    updatedAt: row.updated_at,
  };
}

function normalizePreferences(row) {
  return {
    marketingEnabled: Boolean(row.marketing_enabled),
    pushEnabled: Boolean(row.push_enabled),
    safetyAlertsEnabled: Boolean(row.safety_alerts_enabled),
    smsEnabled: Boolean(row.sms_enabled),
    tripUpdatesEnabled: Boolean(row.trip_updates_enabled),
    updatedAt: row.updated_at,
  };
}

async function ensureNotificationPreferences(userId) {
  await db.query(
    `
      insert into notification_preferences (user_id)
      values ($1)
      on conflict (user_id) do nothing
    `,
    [userId]
  );
}

async function getProfile(userId) {
  if (!userId) {
    throw buildStatusError('Authentication is required.', 401);
  }

  await ensureNotificationPreferences(userId);

  const [userResult, statsResult, savedPlacesResult, contactsResult, preferencesResult, supportResult] =
    await Promise.all([
      db.query(
        `
          select
            id,
            full_name,
            phone,
            email,
            role,
            rating
          from users
          where id = $1
          limit 1
        `,
        [userId]
      ),
      db.query(
        `
          select
            count(b.id) as total_rides,
            coalesce(sum(b.shared_savings), 0) as total_savings
          from bookings b
          join ride_requests rr on rr.id = b.ride_request_id
          where rr.rider_id = $1
        `,
        [userId]
      ),
      db.query(
        `
          select *
          from saved_places
          where user_id = $1
          order by is_default desc, updated_at desc
        `,
        [userId]
      ),
      db.query(
        `
          select *
          from emergency_contacts
          where user_id = $1
          order by updated_at desc
        `,
        [userId]
      ),
      db.query(
        `
          select *
          from notification_preferences
          where user_id = $1
          limit 1
        `,
        [userId]
      ),
      db.query(
        `
          select count(*) as open_tickets
          from support_tickets
          where user_id = $1
            and status not in ('resolved', 'closed')
        `,
        [userId]
      ),
    ]);

  const user = userResult.rows[0];

  if (!user) {
    throw buildStatusError('User profile not found.', 404);
  }

  const stats = statsResult.rows[0] || {};

  return {
    notificationPreferences: normalizePreferences(preferencesResult.rows[0] || {}),
    savedPlaces: savedPlacesResult.rows.map(normalizePlace),
    stats: {
      openSupportTickets: toNumber(supportResult.rows[0]?.open_tickets),
      totalRides: toNumber(stats.total_rides),
      totalSavings: Math.round(toNumber(stats.total_savings)),
    },
    user: {
      email: user.email || '',
      id: user.id,
      name: user.full_name,
      phone: user.phone,
      rating: toNumber(user.rating, 5),
      role: user.role,
    },
    emergencyContacts: contactsResult.rows.map(normalizeEmergencyContact),
  };
}

async function updateProfile(userId, payload = {}) {
  if (!userId) {
    throw buildStatusError('Authentication is required.', 401);
  }

  const fullName = String(payload.name || '').trim();
  const email = payload.email == null ? null : String(payload.email).trim();

  if (!fullName) {
    throw buildStatusError('A profile name is required.', 400);
  }

  await db.query(
    `
      update users
      set
        full_name = $2,
        email = $3
      where id = $1
    `,
    [userId, fullName, email || null]
  );

  return getProfile(userId);
}

async function listSavedPlaces(userId) {
  const result = await db.query(
    `
      select *
      from saved_places
      where user_id = $1
      order by is_default desc, updated_at desc
    `,
    [userId]
  );

  return result.rows.map(normalizePlace);
}

async function createSavedPlace(userId, payload = {}) {
  const label = String(payload.label || '').trim();
  const address = String(payload.address || '').trim();
  const latitude =
    payload.latitude == null || payload.latitude === '' ? null : Number(payload.latitude);
  const longitude =
    payload.longitude == null || payload.longitude === '' ? null : Number(payload.longitude);
  const isDefault = Boolean(payload.isDefault);

  if (!label || !address) {
    throw buildStatusError('Saved places need both a label and address.', 400);
  }

  if ((latitude == null) !== (longitude == null)) {
    throw buildStatusError('Saved place coordinates must include both latitude and longitude.', 400);
  }

  if (isDefault) {
    await db.query(
      `
        update saved_places
        set is_default = false, updated_at = now()
        where user_id = $1
      `,
      [userId]
    );
  }

  const result = await db.query(
    `
      insert into saved_places (
        user_id,
        label,
        address,
        latitude,
        longitude,
        is_default
      )
      values ($1, $2, $3, $4, $5, $6)
      returning *
    `,
    [userId, label, address, latitude, longitude, isDefault]
  );

  return normalizePlace(result.rows[0]);
}

async function updateSavedPlace(userId, placeId, payload = {}) {
  const existing = await db.query(
    `
      select *
      from saved_places
      where id = $1
        and user_id = $2
      limit 1
    `,
    [placeId, userId]
  );

  if (!existing.rows[0]) {
    throw buildStatusError('Saved place not found.', 404);
  }

  const current = existing.rows[0];
  const label = String(payload.label ?? current.label).trim();
  const address = String(payload.address ?? current.address).trim();
  const latitude =
    payload.latitude === undefined ? current.latitude : payload.latitude == null ? null : Number(payload.latitude);
  const longitude =
    payload.longitude === undefined ? current.longitude : payload.longitude == null ? null : Number(payload.longitude);
  const isDefault = payload.isDefault === undefined ? current.is_default : Boolean(payload.isDefault);

  if (!label || !address) {
    throw buildStatusError('Saved places need both a label and address.', 400);
  }

  if ((latitude == null) !== (longitude == null)) {
    throw buildStatusError('Saved place coordinates must include both latitude and longitude.', 400);
  }

  if (isDefault) {
    await db.query(
      `
        update saved_places
        set is_default = false, updated_at = now()
        where user_id = $1
      `,
      [userId]
    );
  }

  const result = await db.query(
    `
      update saved_places
      set
        label = $3,
        address = $4,
        latitude = $5,
        longitude = $6,
        is_default = $7,
        updated_at = now()
      where id = $1
        and user_id = $2
      returning *
    `,
    [placeId, userId, label, address, latitude, longitude, isDefault]
  );

  return normalizePlace(result.rows[0]);
}

async function deleteSavedPlace(userId, placeId) {
  const result = await db.query(
    `
      delete from saved_places
      where id = $1
        and user_id = $2
      returning id
    `,
    [placeId, userId]
  );

  if (!result.rows[0]) {
    throw buildStatusError('Saved place not found.', 404);
  }

  return {
    deleted: true,
    id: placeId,
  };
}

async function listEmergencyContacts(userId) {
  const result = await db.query(
    `
      select *
      from emergency_contacts
      where user_id = $1
      order by updated_at desc
    `,
    [userId]
  );

  return result.rows.map(normalizeEmergencyContact);
}

async function createEmergencyContact(userId, payload = {}) {
  const name = String(payload.name || '').trim();
  const phone = String(payload.phone || '').trim();
  const relationship = String(payload.relationship || '').trim();

  if (!name || !phone) {
    throw buildStatusError('Emergency contacts need both a name and phone number.', 400);
  }

  const result = await db.query(
    `
      insert into emergency_contacts (
        user_id,
        name,
        phone,
        relationship
      )
      values ($1, $2, $3, $4)
      returning *
    `,
    [userId, name, phone, relationship || null]
  );

  return normalizeEmergencyContact(result.rows[0]);
}

async function updateEmergencyContact(userId, contactId, payload = {}) {
  const existing = await db.query(
    `
      select *
      from emergency_contacts
      where id = $1
        and user_id = $2
      limit 1
    `,
    [contactId, userId]
  );

  if (!existing.rows[0]) {
    throw buildStatusError('Emergency contact not found.', 404);
  }

  const current = existing.rows[0];
  const name = String(payload.name ?? current.name).trim();
  const phone = String(payload.phone ?? current.phone).trim();
  const relationship = String(payload.relationship ?? current.relationship ?? '').trim();

  if (!name || !phone) {
    throw buildStatusError('Emergency contacts need both a name and phone number.', 400);
  }

  const result = await db.query(
    `
      update emergency_contacts
      set
        name = $3,
        phone = $4,
        relationship = $5,
        updated_at = now()
      where id = $1
        and user_id = $2
      returning *
    `,
    [contactId, userId, name, phone, relationship || null]
  );

  return normalizeEmergencyContact(result.rows[0]);
}

async function deleteEmergencyContact(userId, contactId) {
  const result = await db.query(
    `
      delete from emergency_contacts
      where id = $1
        and user_id = $2
      returning id
    `,
    [contactId, userId]
  );

  if (!result.rows[0]) {
    throw buildStatusError('Emergency contact not found.', 404);
  }

  return {
    deleted: true,
    id: contactId,
  };
}

async function getNotificationPreferences(userId) {
  await ensureNotificationPreferences(userId);

  const result = await db.query(
    `
      select *
      from notification_preferences
      where user_id = $1
      limit 1
    `,
    [userId]
  );

  return normalizePreferences(result.rows[0] || {});
}

async function updateNotificationPreferences(userId, payload = {}) {
  await ensureNotificationPreferences(userId);

  const current = await getNotificationPreferences(userId);
  const next = {
    marketingEnabled:
      payload.marketingEnabled === undefined ? current.marketingEnabled : Boolean(payload.marketingEnabled),
    pushEnabled: payload.pushEnabled === undefined ? current.pushEnabled : Boolean(payload.pushEnabled),
    safetyAlertsEnabled:
      payload.safetyAlertsEnabled === undefined
        ? current.safetyAlertsEnabled
        : Boolean(payload.safetyAlertsEnabled),
    smsEnabled: payload.smsEnabled === undefined ? current.smsEnabled : Boolean(payload.smsEnabled),
    tripUpdatesEnabled:
      payload.tripUpdatesEnabled === undefined
        ? current.tripUpdatesEnabled
        : Boolean(payload.tripUpdatesEnabled),
  };

  const result = await db.query(
    `
      update notification_preferences
      set
        push_enabled = $2,
        trip_updates_enabled = $3,
        safety_alerts_enabled = $4,
        marketing_enabled = $5,
        sms_enabled = $6,
        updated_at = now()
      where user_id = $1
      returning *
    `,
    [
      userId,
      next.pushEnabled,
      next.tripUpdatesEnabled,
      next.safetyAlertsEnabled,
      next.marketingEnabled,
      next.smsEnabled,
    ]
  );

  return normalizePreferences(result.rows[0]);
}

async function registerDevicePushToken(userId, payload = {}) {
  const expoPushToken = String(payload.expoPushToken || '').trim();

  if (!expoPushToken) {
    throw buildStatusError('Expo push token is required.', 400);
  }

  await db.query(
    `
      insert into device_push_tokens (
        user_id,
        expo_push_token,
        platform,
        device_label,
        revoked_at,
        last_seen_at
      )
      values ($1, $2, $3, $4, null, now())
      on conflict (expo_push_token) do update
        set
          user_id = excluded.user_id,
          platform = excluded.platform,
          device_label = excluded.device_label,
          revoked_at = null,
          last_seen_at = now()
    `,
    [
      userId,
      expoPushToken,
      payload.platform ? String(payload.platform) : null,
      payload.deviceLabel ? String(payload.deviceLabel) : null,
    ]
  );

  return {
    ok: true,
    expoPushToken,
  };
}

async function revokeDevicePushToken(userId, expoPushToken) {
  const result = await db.query(
    `
      update device_push_tokens
      set revoked_at = now()
      where user_id = $1
        and expo_push_token = $2
        and revoked_at is null
      returning id
    `,
    [userId, expoPushToken]
  );

  if (!result.rows[0]) {
    throw buildStatusError('Push token not found.', 404);
  }

  return {
    deleted: true,
    expoPushToken,
  };
}

module.exports = {
  createEmergencyContact,
  createSavedPlace,
  deleteEmergencyContact,
  deleteSavedPlace,
  getNotificationPreferences,
  getProfile,
  listEmergencyContacts,
  listSavedPlaces,
  registerDevicePushToken,
  revokeDevicePushToken,
  updateEmergencyContact,
  updateNotificationPreferences,
  updateProfile,
  updateSavedPlace,
};
