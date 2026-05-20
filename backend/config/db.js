const { Pool } = require('pg');

// Check if we are on Vercel (using connection string), otherwise fallback to local credentials
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required by cloud providers like Aiven/Render to allow secure connections
      }
    })
  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'zovro_db',
      password: '1234',
      port: 5432,
    });

pool.on('connect', () => {
    console.log('Connected to PostgreSQL database successfully');
});