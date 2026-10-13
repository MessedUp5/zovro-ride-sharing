const { rateLimit } = require("express-rate-limit");

function createAuthRateLimiter(max) {
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: max,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        handler: (_req, res) => {
            res.status(429).json({
                error: {
                    code: "RATE_LIMIT_EXCEEDED",
                    message: "Too many attempts. Please try again later.",
                },
            });
        },
    });
}

const registrationRateLimit = createAuthRateLimiter(5);
const loginRateLimit = createAuthRateLimiter(10);

module.exports = { registrationRateLimit, loginRateLimit };
