const { Pool } = require('pg');
const env = require('./env');

let pool = null;

function getPool() {
  if (!env.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
    });
  }

  return pool;
}

async function query(text, params = []) {
  const activePool = getPool();

  if (!activePool) {
    return { rows: [] };
  }

  return activePool.query(text, params);
}

module.exports = {
  getPool,
  query,
};
