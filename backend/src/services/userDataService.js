const db = require('../config/db');

function buildStatusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireText(value, fieldName) {
  const trimmed = String(value || '').trim();

  if (!trimmed) {
    throw buildStatusError(`${fieldName} is required.`, 400);
  }

  return trimmed;
}

function normalizeSavedPlace(row) {
  return {
    id: row.id,
    label: row.label,
    address: row.address,
    coordinates:
      row.latitude != null && row.longitude != null
        ? {
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
          }
        : null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function normalizePaymentMethod(row) {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    isPrimary: Boolean(row.is_primary),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function normalizeEmergencyContact(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    relationship: row.relationship || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function listSavedPlaces(userId) {
  const result = await db.query(
    `
      select id, label, address, latitude, longitude, created_at, updated_at
      from saved_places
      where user_id = $1
      order by created_at asc
    `,
    [userId]
  );

  return {
    items: result.rows.map(normalizeSavedPlace),
  };
}

async function createSavedPlace(userId, payload = {}) {
  const label = requireText(payload.label, 'Saved place label');
  const address = requireText(payload.address, 'Saved place address');
  const coordinates = payload.coordinates || {};
  const result = await db.query(
    `
      insert into saved_places (user_id, label, address, latitude, longitude)
      values ($1, $2, $3, $4, $5)
      returning id, label, address, latitude, longitude, created_at, updated_at
    `,
    [
      userId,
      label,
      address,
      coordinates.latitude ?? payload.latitude ?? null,
      coordinates.longitude ?? payload.longitude ?? null,
    ]
  );

  return normalizeSavedPlace(result.rows[0]);
}

async function updateSavedPlace(userId, placeId, payload = {}) {
  const existing = await db.query(
    `
      select id, label, address, latitude, longitude
      from saved_places
      where id = $1 and user_id = $2
      limit 1
    `,
    [placeId, userId]
  );

  if (!existing.rows[0]) {
    throw buildStatusError('Saved place not found.', 404);
  }

  const current = existing.rows[0];
  const coordinates = payload.coordinates || {};
  const result = await db.query(
    `
      update saved_places
      set
        label = $3,
        address = $4,
        latitude = $5,
        longitude = $6,
        updated_at = now()
      where id = $1 and user_id = $2
      returning id, label, address, latitude, longitude, created_at, updated_at
    `,
    [
      placeId,
      userId,
      payload.label == null ? current.label : requireText(payload.label, 'Saved place label'),
      payload.address == null ? current.address : requireText(payload.address, 'Saved place address'),
      coordinates.latitude ?? payload.latitude ?? current.latitude,
      coordinates.longitude ?? payload.longitude ?? current.longitude,
    ]
  );

  return normalizeSavedPlace(result.rows[0]);
}

async function deleteSavedPlace(userId, placeId) {
  const result = await db.query(
    `
      delete from saved_places
      where id = $1 and user_id = $2
      returning id
    `,
    [placeId, userId]
  );

  if (!result.rows[0]) {
    throw buildStatusError('Saved place not found.', 404);
  }
}

async function listPaymentMethods(userId) {
  const result = await db.query(
    `
      select id, type, label, is_primary, created_at, updated_at
      from payment_methods
      where user_id = $1
      order by is_primary desc, created_at asc
    `,
    [userId]
  );

  return {
    items: result.rows.map(normalizePaymentMethod),
  };
}

async function createPaymentMethod(userId, payload = {}) {
  const type = requireText(payload.type, 'Payment method type');
  const label = requireText(payload.label, 'Payment method label');
  const isPrimary = Boolean(payload.isPrimary ?? payload.is_primary);
  const result = await db.query(
    `
      insert into payment_methods (user_id, type, label, is_primary)
      values ($1, $2, $3, $4)
      returning id, type, label, is_primary, created_at, updated_at
    `,
    [userId, type, label, isPrimary]
  );

  if (isPrimary) {
    await db.query(
      `
        update payment_methods
        set is_primary = false, updated_at = now()
        where user_id = $1 and id <> $2
      `,
      [userId, result.rows[0].id]
    );
  }

  return normalizePaymentMethod(result.rows[0]);
}

async function updatePaymentMethod(userId, methodId, payload = {}) {
  const existing = await db.query(
    `
      select id, type, label, is_primary
      from payment_methods
      where id = $1 and user_id = $2
      limit 1
    `,
    [methodId, userId]
  );

  if (!existing.rows[0]) {
    throw buildStatusError('Payment method not found.', 404);
  }

  const current = existing.rows[0];
  const isPrimary = payload.isPrimary ?? payload.is_primary ?? current.is_primary;
  const result = await db.query(
    `
      update payment_methods
      set
        type = $3,
        label = $4,
        is_primary = $5,
        updated_at = now()
      where id = $1 and user_id = $2
      returning id, type, label, is_primary, created_at, updated_at
    `,
    [
      methodId,
      userId,
      payload.type == null ? current.type : requireText(payload.type, 'Payment method type'),
      payload.label == null ? current.label : requireText(payload.label, 'Payment method label'),
      Boolean(isPrimary),
    ]
  );

  if (Boolean(isPrimary)) {
    await db.query(
      `
        update payment_methods
        set is_primary = false, updated_at = now()
        where user_id = $1 and id <> $2
      `,
      [userId, methodId]
    );
  }

  return normalizePaymentMethod(result.rows[0]);
}

async function deletePaymentMethod(userId, methodId) {
  const result = await db.query(
    `
      delete from payment_methods
      where id = $1 and user_id = $2
      returning id
    `,
    [methodId, userId]
  );

  if (!result.rows[0]) {
    throw buildStatusError('Payment method not found.', 404);
  }
}

async function listEmergencyContacts(userId) {
  const result = await db.query(
    `
      select id, name, phone, relationship, created_at, updated_at
      from emergency_contacts
      where user_id = $1
      order by created_at asc
    `,
    [userId]
  );

  return {
    items: result.rows.map(normalizeEmergencyContact),
  };
}

async function createEmergencyContact(userId, payload = {}) {
  const name = requireText(payload.name, 'Emergency contact name');
  const phone = requireText(payload.phone, 'Emergency contact phone');
  const relationship = String(payload.relationship || '').trim() || null;
  const result = await db.query(
    `
      insert into emergency_contacts (user_id, name, phone, relationship)
      values ($1, $2, $3, $4)
      returning id, name, phone, relationship, created_at, updated_at
    `,
    [userId, name, phone, relationship]
  );

  return normalizeEmergencyContact(result.rows[0]);
}

async function updateEmergencyContact(userId, contactId, payload = {}) {
  const existing = await db.query(
    `
      select id, name, phone, relationship
      from emergency_contacts
      where id = $1 and user_id = $2
      limit 1
    `,
    [contactId, userId]
  );

  if (!existing.rows[0]) {
    throw buildStatusError('Emergency contact not found.', 404);
  }

  const current = existing.rows[0];
  const result = await db.query(
    `
      update emergency_contacts
      set
        name = $3,
        phone = $4,
        relationship = $5,
        updated_at = now()
      where id = $1 and user_id = $2
      returning id, name, phone, relationship, created_at, updated_at
    `,
    [
      contactId,
      userId,
      payload.name == null ? current.name : requireText(payload.name, 'Emergency contact name'),
      payload.phone == null ? current.phone : requireText(payload.phone, 'Emergency contact phone'),
      payload.relationship == null
        ? current.relationship
        : String(payload.relationship || '').trim() || null,
    ]
  );

  return normalizeEmergencyContact(result.rows[0]);
}

async function deleteEmergencyContact(userId, contactId) {
  const result = await db.query(
    `
      delete from emergency_contacts
      where id = $1 and user_id = $2
      returning id
    `,
    [contactId, userId]
  );

  if (!result.rows[0]) {
    throw buildStatusError('Emergency contact not found.', 404);
  }
}

async function getProfileSummary(userId) {
  const result = await db.query(
    `
      select
        u.role,
        u.rating,
        coalesce(count(distinct b.id) filter (where b.booking_status <> 'cancelled'), 0)::int as total_rides,
        coalesce(sum(b.shared_savings) filter (where b.booking_status <> 'cancelled'), 0)::numeric as total_savings,
        (select count(*)::int from saved_places sp where sp.user_id = u.id) as saved_places_count,
        (select count(*)::int from payment_methods pm where pm.user_id = u.id) as payment_methods_count,
        (select count(*)::int from emergency_contacts ec where ec.user_id = u.id) as emergency_contacts_count,
        (
          select label
          from payment_methods pm
          where pm.user_id = u.id
          order by pm.is_primary desc, pm.created_at asc
          limit 1
        ) as primary_payment_method
      from users u
      left join ride_requests rr on rr.rider_id = u.id
      left join bookings b on b.ride_request_id = rr.id
      where u.id = $1
      group by u.id
      limit 1
    `,
    [userId]
  );

  const row = result.rows[0];

  if (!row) {
    throw buildStatusError('Profile summary not found.', 404);
  }

  return {
    role: row.role,
    rating: Number(row.rating || 5),
    totalRides: Number(row.total_rides || 0),
    totalSavings: Number(row.total_savings || 0),
    savedPlacesCount: Number(row.saved_places_count || 0),
    paymentMethodsCount: Number(row.payment_methods_count || 0),
    emergencyContactsCount: Number(row.emergency_contacts_count || 0),
    primaryPaymentMethod: row.primary_payment_method || null,
  };
}

module.exports = {
  createEmergencyContact,
  createPaymentMethod,
  createSavedPlace,
  deleteEmergencyContact,
  deletePaymentMethod,
  deleteSavedPlace,
  getProfileSummary,
  listEmergencyContacts,
  listPaymentMethods,
  listSavedPlaces,
  updateEmergencyContact,
  updatePaymentMethod,
  updateSavedPlace,
};
