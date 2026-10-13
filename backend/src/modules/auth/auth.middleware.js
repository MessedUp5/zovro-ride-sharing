const jwt = require("jsonwebtoken");
const env = require("../../config/env");

const TOKEN_ISSUER = "zovro-community-api";
const TOKEN_AUDIENCE = "zovro-community";

function requireAuth(req, res, next) {
    const authorization = req.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            error: {
                code: "AUTHENTICATION_REQUIRED",
                message: "A valid access token is required.",
            },
        });
    }

    const token = authorization.slice("Bearer ".length).trim();

    if (!token) {
        return res.status(401).json({
            error: {
                code: "INVALID_TOKEN",
                message: "The access token is invalid or expired.",
            },
        });
    }

    try {
        const payload = jwt.verify(token, env.jwtSecret, {
            issuer: TOKEN_ISSUER,
            audience: TOKEN_AUDIENCE,
            algorithms: ["HS256"],
        });

        if (typeof payload.sub !== "string" || !/^\d+$/.test(payload.sub)) {
            throw new Error("Invalid token subject.");
        }

        req.auth = { userId: payload.sub };
        return next();
    } catch {
        return res.status(401).json({
            error: {
                code: "INVALID_TOKEN",
                message: "The access token is invalid or expired.",
            },
        });
    }
}

module.exports = { requireAuth, TOKEN_ISSUER, TOKEN_AUDIENCE };
