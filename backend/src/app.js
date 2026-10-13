const express = require("express");
const cors = require("cors");
const pool = require("./database/pool");
const env = require("./config/env");

const app = express();

app.disable("x-powered-by");

app.use(cors({
    origin: env.frontendOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", require("./modules/auth/auth.routes"));


app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            status: "ok",
            service: "zovro-community-api",
            database: "connected",
        });
    } catch (error) {
        console.error("Health check database failure:", error.message);

        res.status(503).json({
            status: "unavailable",
            service: "zovro-community-api",
            database: "disconnected",
        });
    }
});

app.use((_req, res) => {
    res.status(404).json({
        error: {
            code: "NOT_FOUND",
            message: "The requested API endpoint was not found.",
        },
    });
});

app.use((error, _req, res, _next) => {
    console.error("Unhandled request error:", error.message);

    res.status(500).json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected server error occurred.",
        },
    });
});

module.exports = app;
