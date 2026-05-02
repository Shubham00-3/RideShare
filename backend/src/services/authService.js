const crypto = require('crypto');
const db = require('../config/db');
const env = require('../config/env');
const { checkVerification, startVerification } = require('./twilioVerifyService');

const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const REQUEST_LIMIT = 3;
const VERIFY_LIMIT = 5;
const ALLOWED_GENDERS = new Set(['female', 'male', 'non_binary', 'prefer_not_to_say']);
const ALLOWED_PROFILE_ROLES = new Set(['rider', 'driver']);
const requestRateLimitStore = new Map();
const verifyRateLimitStore = new Map();

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  throw new Error('Please enter a valid phone number.');
}

function maskPhone(phone) {
  const normalized = normalizePhone(phone);
  return `${normalized.slice(0, 3)} ${normalized.slice(3, 8)} ${normalized.slice(-4)}`;
}

function serializeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function publicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone,
    email: row.email || null,
    dateOfBirth: serializeDate(row.date_of_birth),
    gender: row.gender || null,
    profileComplete: Boolean(row.profile_completed_at),
    role: row.role,
    rating: Number(row.rating || 5),
  };
}

function normalizeName(name) {
  const value = String(name || '').trim().replace(/\s+/g, ' ');

  if (value.length < 2) {
    throw validationError('Please enter your name.');
  }

  if (value.length > 80) {
    throw validationError('Name must be 80 characters or less.');
  }

  return value;
}

function normalizeGender(gender) {
  const value = String(gender || '').trim().toLowerCase();

  if (!ALLOWED_GENDERS.has(value)) {
    throw validationError('Please choose a valid gender option.');
  }

  return value;
}

function normalizeProfileRole(role) {
  const value = String(role || 'rider').trim().toLowerCase();

  if (!ALLOWED_PROFILE_ROLES.has(value)) {
    throw validationError('Please choose rider or driver account type.');
  }

  return value;
}

function normalizeDateOfBirth(dateOfBirth) {
  const value = String(dateOfBirth || '').trim();
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime())) {
    throw validationError('Please enter date of birth as YYYY-MM-DD.');
  }

  const today = new Date();
  const minimumAgeDate = new Date(Date.UTC(
    today.getUTCFullYear() - 18,
    today.getUTCMonth(),
    today.getUTCDate()
  ));

  if (parsed > minimumAgeDate) {
    throw validationError('You must be at least 18 years old to use RideShare.');
  }

  return value;
}

function buildSessionPayload({ token, expiresAt, user, devOtp }) {
  return {
    token,
    expiresAt,
    user: publicUser(user),
    devOtp,
  };
}

function enforceRateLimit(store, key, limit, windowMs, message) {
  const now = Date.now();
  const storeKey = hashValue(key);
  const current = store.get(storeKey);

  if (!current || current.expiresAt <= now) {
    store.set(storeKey, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return;
  }

  if (current.count >= limit) {
    throw new Error(message);
  }

  current.count += 1;
  store.set(storeKey, current);
}

function resetRateLimit(store, key) {
  store.delete(hashValue(key));
}

function pruneRateLimitStore(store) {
  const now = Date.now();

  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(key);
    }
  }
}

async function ensureRiderUser(client, phone) {
  const existingUser = await client.query(
    `
      select
        id,
        full_name,
        phone,
        email,
        role,
        rating,
        date_of_birth,
        gender,
        profile_completed_at
      from users
      where phone = $1
      limit 1
    `,
    [phone]
  );

  if (existingUser.rows[0]) {
    return existingUser.rows[0];
  }

  const suffix = phone.slice(-4);
  const createdUser = await client.query(
    `
      insert into users (
        full_name,
        phone,
        role
      )
      values ($1, $2, 'rider')
      returning id, full_name, phone, email, role, rating, date_of_birth, gender, profile_completed_at
    `,
    [`RideShare Rider ${suffix}`, phone]
  );

  return createdUser.rows[0];
}

async function createSessionForUser(client, userId) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.authSessionDays * 24 * 60 * 60 * 1000);

  await client.query(
    `
      insert into user_sessions (
        user_id,
        token_hash,
        expires_at
      )
      values ($1, $2, $3)
    `,
    [userId, hashValue(token), expiresAt.toISOString()]
  );

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

async function updateUserProfile(userId, payload = {}) {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('Database is required for profile updates.');
  }

  if (!userId) {
    throw new Error('Authentication is required.');
  }

  const fullName = normalizeName(payload.name);
  const dateOfBirth = normalizeDateOfBirth(payload.dateOfBirth);
  const gender = normalizeGender(payload.gender);
  const role = normalizeProfileRole(payload.role);
  const client = await pool.connect();

  try {
    await client.query('begin');

    const result = await client.query(
      `
        update users
        set
          full_name = $2,
          date_of_birth = $3,
          gender = $4,
          role = $5,
          profile_completed_at = now()
        where id = $1
        returning id, full_name, phone, email, role, rating, date_of_birth, gender, profile_completed_at
      `,
      [userId, fullName, dateOfBirth, gender, role]
    );

    if (!result.rows[0]) {
      throw new Error('User profile not found.');
    }

    if (role === 'driver') {
      await client.query(
        `
          update drivers
          set full_name = $2
          where user_id = $1
        `,
        [userId, fullName]
      );
      await client.query(
        `
          insert into drivers (
            user_id,
            full_name,
            is_online
          )
          select $1, $2, false
          where not exists (
            select 1
            from drivers
            where user_id = $1
          )
        `,
        [userId, fullName]
      );
    }

    await client.query('commit');

    return {
      user: publicUser(result.rows[0]),
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function requestOtp(phone) {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('Database is required for authentication.');
  }

  const normalizedPhone = normalizePhone(phone);
  pruneRateLimitStore(requestRateLimitStore);
  enforceRateLimit(
    requestRateLimitStore,
    normalizedPhone,
    REQUEST_LIMIT,
    REQUEST_WINDOW_MS,
    'Too many OTP requests. Please wait a few minutes before trying again.'
  );

  const client = await pool.connect();

  try {
    await client.query('begin');

    const user = await ensureRiderUser(client, normalizedPhone);

    if (env.authExposeDevOtp) {
      const code = String(crypto.randomInt(100000, 1000000));
      const expiresAt = new Date(Date.now() + env.authOtpTtlMinutes * 60 * 1000);

      await client.query(
        `
          update auth_otps
          set consumed_at = now()
          where phone = $1
            and consumed_at is null
        `,
        [normalizedPhone]
      );

      await client.query(
        `
          insert into auth_otps (
            user_id,
            phone,
            code_hash,
            expires_at
          )
          values ($1, $2, $3, $4)
        `,
        [user.id, normalizedPhone, hashValue(code), expiresAt.toISOString()]
      );

      await client.query('commit');

      return {
        ok: true,
        phone: normalizedPhone,
        maskedPhone: maskPhone(normalizedPhone),
        expiresAt: expiresAt.toISOString(),
        devOtp: code,
        user: publicUser(user),
      };
    }

    await startVerification(normalizedPhone);
    await client.query('commit');

    return {
      ok: true,
      phone: normalizedPhone,
      maskedPhone: maskPhone(normalizedPhone),
      expiresAt: new Date(Date.now() + env.authOtpTtlMinutes * 60 * 1000).toISOString(),
      user: publicUser(user),
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function verifyOtp(phone, code) {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('Database is required for authentication.');
  }

  const normalizedPhone = normalizePhone(phone);
  pruneRateLimitStore(verifyRateLimitStore);
  enforceRateLimit(
    verifyRateLimitStore,
    normalizedPhone,
    VERIFY_LIMIT,
    VERIFY_WINDOW_MS,
    'Too many OTP verification attempts. Please request a new code and try again.'
  );

  const client = await pool.connect();

  try {
    await client.query('begin');

    const user = await ensureRiderUser(client, normalizedPhone);

    if (env.authExposeDevOtp) {
      const otpResult = await client.query(
        `
          select
            o.id,
            o.user_id,
            o.phone,
            o.code_hash,
            o.expires_at,
            u.id as user_id_value,
            u.full_name,
            u.phone as user_phone,
            u.email,
            u.role,
            u.rating,
            u.date_of_birth,
            u.gender,
            u.profile_completed_at
          from auth_otps o
          join users u on u.id = o.user_id
          where o.phone = $1
            and o.consumed_at is null
            and o.expires_at > now()
          order by o.created_at desc
          limit 1
        `,
        [normalizedPhone]
      );

      const otpRow = otpResult.rows[0];

      if (!otpRow) {
        throw new Error('OTP expired or not found. Please request a new code.');
      }

      if (otpRow.code_hash !== hashValue(code)) {
        throw new Error('Incorrect OTP. Please try again.');
      }

      await client.query(
        `
          update auth_otps
          set consumed_at = now()
          where id = $1
        `,
        [otpRow.id]
      );
    } else {
      const verification = await checkVerification(normalizedPhone, code);

      if (String(verification.status || '').toLowerCase() !== 'approved') {
        throw new Error('Incorrect OTP. Please try again.');
      }
    }

    const session = await createSessionForUser(client, user.id);
    await client.query('commit');
    resetRateLimit(verifyRateLimitStore, normalizedPhone);

    return buildSessionPayload({
      token: session.token,
      expiresAt: session.expiresAt,
      user,
    });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function getSessionFromToken(token, options = {}) {
  const pool = db.getPool();

  if (!pool || !token) {
    return null;
  }

  const { touch = true } = options;
  const result = await db.query(
    `
      select
        s.id as session_id,
        s.user_id,
        s.expires_at,
        u.id,
        u.full_name,
        u.phone,
        u.email,
        u.role,
        u.rating,
        u.date_of_birth,
        u.gender,
        u.profile_completed_at
      from user_sessions s
      join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
      limit 1
    `,
    [hashValue(token)]
  );

  const session = result.rows[0];

  if (!session) {
    return null;
  }

  if (touch) {
    await db.query(
      `
        update user_sessions
        set last_seen_at = now()
        where id = $1
      `,
      [session.session_id]
    );
  }

  return {
    token,
    expiresAt: session.expires_at,
    user: publicUser(session),
  };
}

async function revokeSession(token) {
  const pool = db.getPool();

  if (!pool || !token) {
    return;
  }

  await db.query(
    `
      update user_sessions
      set revoked_at = now()
      where token_hash = $1
        and revoked_at is null
    `,
    [hashValue(token)]
  );
}

module.exports = {
  getSessionFromToken,
  normalizePhone,
  requestOtp,
  revokeSession,
  updateUserProfile,
  verifyOtp,
};
