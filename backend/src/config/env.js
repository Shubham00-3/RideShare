const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL || '',
  port: Number(process.env.PORT || 4000),
};
