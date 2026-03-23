const crypto = require('crypto');
const db = require('../config/db');
const env = require('../config/env');

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

async function ensureRiderUser(client, phone) {
  const existingUser = await client.query(
    `
      select
        id,
        full_name,
        phone,
        email,
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
      returning id, full_name, phone, email, role, rating
    `,
    [`RideShare Rider ${suffix}`, phone]
  );

  return createdUser.rows[0];
}

async function requestOtp(phone) {
  const pool = db.getPool();

  if (!pool) {
    throw new Error('Database is required for authentication.');
  }

  const normalizedPhone = normalizePhone(phone);
  const client = await pool.connect();

  try {
    await client.query('begin');

    const user = await ensureRiderUser(client, normalizedPhone);
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
      devOtp: env.authExposeDevOtp ? code : undefined,
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
  const client = await pool.connect();

  try {
    await client.query('begin');

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
      [otpRow.user_id, hashValue(token), expiresAt.toISOString()]
    );

    await client.query('commit');

    return buildSessionPayload({
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: otpRow.user_id_value,
        full_name: otpRow.full_name,
        phone: otpRow.user_phone,
        email: otpRow.email,
        role: otpRow.role,
        rating: otpRow.rating,
      },
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
