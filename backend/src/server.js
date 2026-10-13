const env = require("./config/env");
const app = require("./app");
const pool = require("./database/pool");

const server = app.listen(env.port, "127.0.0.1", () => {
    console.log(`Zovro Community API listening at http://127.0.0.1:${env.port}`);
    console.log(`Health endpoint: http://127.0.0.1:${env.port}/api/health`);
});

async function shutdown(signal) {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        try {
            await pool.end();
            process.exit(0);
        } catch (error) {
            console.error("Error closing PostgreSQL pool:", error.message);
            process.exit(1);
        }
    });

    setTimeout(() => {
        console.error("Graceful shutdown timed out.");
        process.exit(1);
    }, 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
    shutdown("unhandledRejection");
});
