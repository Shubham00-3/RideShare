const crypto = require('crypto');
const db = require('../config/db');
const env = require('../config/env');
const { checkVerification, startVerification } = require('./twilioVerifyService');

const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const REQUEST_LIMIT = 3;
const VERIFY_LIMIT = 5;
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

function publicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone,
    email: row.email || null,
    gender: row.gender || 'unspecified',
    role: row.role,
    rating: Number(row.rating || 5),
  };
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
  const current = store.get(key);

  if (!current || current.expiresAt <= now) {
    store.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return;
  }

  if (current.count >= limit) {
    throw new Error(message);
  }

  current.count += 1;
  store.set(key, current);
}

function resetRateLimit(store, key) {
  store.delete(key);
}

async function enforcePersistentRateLimit(client, action, subject, limit, windowMs, message) {
  const result = await client.query(
    `
      select
        action,
        subject,
        attempt_count,
        window_started_at,
        blocked_until
      from auth_rate_limits
      where action = $1
        and subject = $2
      for update
    `,
    [action, subject]
  );

  const now = new Date();
  const row = result.rows[0];

  if (!row) {
    await client.query(
      `
        insert into auth_rate_limits (
          action,
          subject,
          attempt_count,
          window_started_at,
          last_attempt_at
        )
        values ($1, $2, 1, now(), now())
      `,
      [action, subject]
    );
    return;
  }

  if (row.blocked_until && new Date(row.blocked_until) > now) {
    throw new Error(message);
  }

  const windowStartedAt = row.window_started_at ? new Date(row.window_started_at) : now;
  const isExpiredWindow = now.getTime() - windowStartedAt.getTime() > windowMs;

  if (isExpiredWindow) {
    await client.query(
      `
        update auth_rate_limits
        set
          attempt_count = 1,
          window_started_at = now(),
          blocked_until = null,
          last_attempt_at = now()
        where action = $1
          and subject = $2
      `,
      [action, subject]
    );
    return;
  }

  if (Number(row.attempt_count || 0) >= limit) {
    await client.query(
      `
        update auth_rate_limits
        set
          blocked_until = now() + ($3 || ' milliseconds')::interval,
          last_attempt_at = now()
        where action = $1
          and subject = $2
      `,
      [action, subject, String(windowMs)]
    );
    throw new Error(message);
  }

  await client.query(
    `
      update auth_rate_limits
      set
        attempt_count = attempt_count + 1,
        last_attempt_at = now()
      where action = $1
        and subject = $2
    `,
    [action, subject]
  );
}

async function resetPersistentRateLimit(client, action, subject) {
  await client.query(
    `
      delete from auth_rate_limits
      where action = $1
        and subject = $2
    `,
    [action, subject]
  );
}

async function ensureRiderUser(client, phone) {
  const existingUser = await client.query(
    `
      select
        id,
        full_name,
        phone,
        email,
        gender,
        role,
        rating
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
      returning id, full_name, phone, email, gender, role, rating
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

async function requestOtp(phone) {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('Database is required for authentication.');
  }

  const normalizedPhone = normalizePhone(phone);
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
    await enforcePersistentRateLimit(
      client,
      'otp_request',
      normalizedPhone,
      REQUEST_LIMIT,
      REQUEST_WINDOW_MS,
      'Too many OTP requests. Please wait a few minutes before trying again.'
    );

    const user = await ensureRiderUser(client, normalizedPhone);

    if (env.authExposeDevOtp) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
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
    await enforcePersistentRateLimit(
      client,
      'otp_verify',
      normalizedPhone,
      VERIFY_LIMIT,
      VERIFY_WINDOW_MS,
      'Too many OTP verification attempts. Please request a new code and try again.'
    );

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
            u.gender,
            u.role,
            u.rating
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
    await resetPersistentRateLimit(client, 'otp_verify', normalizedPhone);
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
        u.gender,
        u.role,
        u.rating
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
  verifyOtp,
};
