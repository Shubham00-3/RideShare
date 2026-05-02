const { getSessionFromToken } = require('../services/authService');

function readAuthToken(req) {
  const header = req.headers.authorization || '';

  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }

  return req.headers['x-session-token'] || req.query?.access_token || null;
}

async function optionalAuth(req, _res, next) {
  try {
    const token = readAuthToken(req);

    if (!token) {
      return next();
    }

    const session = await getSessionFromToken(token);

    if (!session) {
      return next();
    }

    req.auth = session;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAuth(req, res, next) {
  try {
    const token = readAuthToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication is required.',
      });
    }

    const session = await getSessionFromToken(token);

    if (!session) {
      return res.status(401).json({
        error: 'invalid_session',
        message: 'Your session has expired. Please sign in again.',
      });
    }

    req.auth = session;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  optionalAuth,
  readAuthToken,
  requireAuth,
};
