const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',           // Your pgAdmin username
  host: 'localhost',
  database: 'zovro_db',       // The DB name we created in pgAdmin
  password: '1234',  // Your pgAdmin password
  port: 5432,                 // Standard PostgreSQL port
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL (zovro_db)');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;