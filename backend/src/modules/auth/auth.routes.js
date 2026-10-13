const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../database/pool");
const env = require("../../config/env");
const {
    requireAuth,
    TOKEN_ISSUER,
    TOKEN_AUDIENCE,
} = require("./auth.middleware");

const {
    registrationRateLimit,
    loginRateLimit,
} = require("../../middleware/auth-rate-limit");

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const TOKEN_LIFETIME = "1h";

function publicUser(row) {
    return {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phoneNumber: row.phone_number,
        isVerified: row.is_verified,
        createdAt: row.created_at,
    };
}

function issueToken(user) {
    return jwt.sign(
        {},
        env.jwtSecret,
        {
            subject: String(user.id),
            issuer: TOKEN_ISSUER,
            audience: TOKEN_AUDIENCE,
            expiresIn: TOKEN_LIFETIME,
            algorithm: "HS256",
        },
    );
}

function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validEmail(email) {
    return email.length <= 254
        && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/register", registrationRateLimit, async (req, res, next) => {
    try {
        const fullName = typeof req.body?.fullName === "string"
            ? req.body.fullName.trim()
            : "";
        const email = normalizeEmail(req.body?.email);
        const password = req.body?.password;

        if (fullName.length < 2 || fullName.length > 120) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Full name must contain between 2 and 120 characters.",
                },
            });
        }

        if (!validEmail(email)) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Enter a valid email address.",
                },
            });
        }

        if (
            typeof password !== "string"
            || password.length < 8
            || Buffer.byteLength(password, "utf8") > 72
        ) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Password must be at least 8 characters and no more than 72 UTF-8 bytes.",
                },
            });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const result = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, auth_provider)
             VALUES ($1, $2, $3, NULL)
             RETURNING id, full_name, email, phone_number, is_verified, created_at`,
            [fullName, email, passwordHash],
        );

        const user = result.rows[0];

        return res.status(201).json({
            user: publicUser(user),
            token: issueToken(user),
            tokenType: "Bearer",
            expiresIn: 3600,
        });
    } catch (error) {
        if (error.code === "23505" && error.constraint === "users_email_unique_lower") {
            return res.status(409).json({
                error: {
                    code: "EMAIL_ALREADY_REGISTERED",
                    message: "An account with this email address already exists.",
                },
            });
        }

        return next(error);
    }
});

router.post("/login", loginRateLimit, async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const password = req.body?.password;

        if (!validEmail(email) || typeof password !== "string" || password.length === 0) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Enter a valid email address and password.",
                },
            });
        }

        const result = await pool.query(
            `SELECT id, full_name, email, phone_number, password_hash,
                    is_verified, created_at
             FROM users
             WHERE LOWER(email) = $1
             LIMIT 1`,
            [email],
        );

        const user = result.rows[0];

        if (
            !user
            || !user.password_hash
            || !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                error: {
                    code: "INVALID_CREDENTIALS",
                    message: "Email or password is incorrect.",
                },
            });
        }

        return res.status(200).json({
            user: publicUser(user),
            token: issueToken(user),
            tokenType: "Bearer",
            expiresIn: 3600,
        });
    } catch (error) {
        return next(error);
    }
});

router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, full_name, email, phone_number, is_verified, created_at
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [req.auth.userId],
        );

        if (result.rowCount === 0) {
            return res.status(401).json({
                error: {
                    code: "ACCOUNT_NOT_FOUND",
                    message: "The account associated with this token no longer exists.",
                },
            });
        }

        return res.status(200).json({ user: publicUser(result.rows[0]) });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
