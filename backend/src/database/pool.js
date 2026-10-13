const { Pool } = require("pg");
const env = require("../config/env");

const pool = new Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseSsl ? { rejectUnauthorized: true } : false,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10,
});

pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL client error:", error.message);
});

module.exports = pool;
