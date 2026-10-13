const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

const port = Number.parseInt(process.env.PORT || "4001", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid port number.");
}

const jwtSecret = required("JWT_SECRET");

if (jwtSecret.length < 32 || jwtSecret.startsWith("REPLACE_WITH_")) {
    throw new Error("JWT_SECRET must be a real secret of at least 32 characters.");
}

const databaseUrl = required("DATABASE_URL");

let parsedDatabaseUrl;

try {
    parsedDatabaseUrl = new URL(databaseUrl);
} catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
}

if (!["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
}

module.exports = Object.freeze({
    nodeEnv: process.env.NODE_ENV || "development",
    port,
    databaseUrl,
    jwtSecret,
    frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    databaseSsl: process.env.DATABASE_SSL === "true",
});
