const express = require("express");
const pool = require("../../database/pool");
const { requireAuth } = require("../auth/auth.middleware");

const router = express.Router();

const JOURNEY_COLUMNS = `
    id,
    driver_id,
    origin_name,
    origin_lat,
    origin_lng,
    destination_name,
    destination_lat,
    destination_lng,
    departure_at,
    seats_offered,
    seats_booked,
    contribution_per_seat_lkr,
    notes,
    status,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    originName: "origin_name",
    originLat: "origin_lat",
    originLng: "origin_lng",
    destinationName: "destination_name",
    destinationLat: "destination_lat",
    destinationLng: "destination_lng",
    departureAt: "departure_at",
    seatsOffered: "seats_offered",
    contributionPerSeatLkr: "contribution_per_seat_lkr",
    notes: "notes",
};

function publicJourney(row) {
    return {
        id: String(row.id),
        driverId: String(row.driver_id),
        originName: row.origin_name,
        originLat: Number(row.origin_lat),
        originLng: Number(row.origin_lng),
        destinationName: row.destination_name,
        destinationLat: Number(row.destination_lat),
        destinationLng: Number(row.destination_lng),
        departureAt: row.departure_at,
        seatsOffered: row.seats_offered,
        seatsBooked: row.seats_booked,
        seatsAvailable: row.seats_offered - row.seats_booked,
        contributionPerSeatLkr: row.contribution_per_seat_lkr === null
            ? null
            : Number(row.contribution_per_seat_lkr),
        notes: row.notes,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function sendError(res, status, code, message) {
    return res.status(status).json({
        error: { code, message },
    });
}

function validateJourney(data) {
    const errors = [];

    function textField(field, label, maxLength) {
        if (
            typeof data[field] !== "string"
            || data[field].trim().length === 0
            || data[field].trim().length > maxLength
        ) {
            errors.push(`${label} must be a non-empty string of at most ${maxLength} characters.`);
        }
    }

    function coordinate(field, label, min, max) {
        if (
            typeof data[field] !== "number"
            || !Number.isFinite(data[field])
            || data[field] < min
            || data[field] > max
        ) {
            errors.push(`${label} must be a number between ${min} and ${max}.`);
        }
    }

    textField("originName", "Origin name", 255);
    coordinate("originLat", "Origin latitude", -90, 90);
    coordinate("originLng", "Origin longitude", -180, 180);
    textField("destinationName", "Destination name", 255);
    coordinate("destinationLat", "Destination latitude", -90, 90);
    coordinate("destinationLng", "Destination longitude", -180, 180);

    const departureTime = typeof data.departureAt === "string"
        ? Date.parse(data.departureAt)
        : NaN;

    if (!Number.isFinite(departureTime) || departureTime <= Date.now()) {
        errors.push("Departure time must be a valid future date and time.");
    }

    if (
        !Number.isInteger(data.seatsOffered)
        || data.seatsOffered < 1
        || data.seatsOffered > 8
    ) {
        errors.push("Seats offered must be an integer between 1 and 8.");
    }

    if (
        data.contributionPerSeatLkr !== null
        && (
            typeof data.contributionPerSeatLkr !== "number"
            || !Number.isFinite(data.contributionPerSeatLkr)
            || data.contributionPerSeatLkr < 0
            || data.contributionPerSeatLkr > 99999999.99
            || Math.round(data.contributionPerSeatLkr * 100)
                !== data.contributionPerSeatLkr * 100
        )
    ) {
        errors.push("Contribution must be a non-negative LKR amount with at most two decimal places, or null.");
    }

    if (
        data.notes !== null
        && (
            typeof data.notes !== "string"
            || data.notes.length > 500
        )
    ) {
        errors.push("Notes must be a string of at most 500 characters, or null.");
    }

    if (
        typeof data.originName === "string"
        && typeof data.destinationName === "string"
        && data.originName.trim().toLowerCase()
            === data.destinationName.trim().toLowerCase()
        && typeof data.originLat === "number"
        && typeof data.originLng === "number"
        && typeof data.destinationLat === "number"
        && typeof data.destinationLng === "number"
        && data.originLat === data.destinationLat
        && data.originLng === data.destinationLng
    ) {
        errors.push("Origin and destination must be different locations.");
    }

    return errors;
}

router.use(requireAuth);

// Publish a planned journey.
router.post("/", async (req, res, next) => {
    try {
        const body = req.body;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return sendError(res, 400, "VALIDATION_ERROR", "A JSON object is required.");
        }

        const allowedFields = new Set(Object.keys(FIELD_MAP));
        const unknownFields = Object.keys(body).filter(
            (field) => !allowedFields.has(field),
        );

        if (unknownFields.length > 0) {
            return sendError(
                res,
                400,
                "VALIDATION_ERROR",
                `Unknown field(s): ${unknownFields.join(", ")}.`,
            );
        }

        const requiredFields = [
            "originName",
            "originLat",
            "originLng",
            "destinationName",
            "destinationLat",
            "destinationLng",
            "departureAt",
            "seatsOffered",
        ];

        if (requiredFields.some((field) => !Object.hasOwn(body, field))) {
            return sendError(
                res,
                400,
                "VALIDATION_ERROR",
                "Origin, destination, departure time, and seats offered are required.",
            );
        }

        const journey = {
            originName: body.originName,
            originLat: body.originLat,
            originLng: body.originLng,
            destinationName: body.destinationName,
            destinationLat: body.destinationLat,
            destinationLng: body.destinationLng,
            departureAt: body.departureAt,
            seatsOffered: body.seatsOffered,
            contributionPerSeatLkr: Object.hasOwn(body, "contributionPerSeatLkr")
                ? body.contributionPerSeatLkr
                : null,
            notes: Object.hasOwn(body, "notes") ? body.notes : null,
        };

        const errors = validateJourney(journey);

        if (errors.length > 0) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Please correct the journey details.",
                    details: errors,
                },
            });
        }

        const result = await pool.query(
            `INSERT INTO journeys (
                driver_id,
                origin_name,
                origin_lat,
                origin_lng,
                destination_name,
                destination_lat,
                destination_lng,
                departure_at,
                seats_offered,
                contribution_per_seat_lkr,
                notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING ${JOURNEY_COLUMNS}`,
            [
                req.auth.userId,
                journey.originName.trim(),
                journey.originLat,
                journey.originLng,
                journey.destinationName.trim(),
                journey.destinationLat,
                journey.destinationLng,
                new Date(Date.parse(journey.departureAt)).toISOString(),
                journey.seatsOffered,
                journey.contributionPerSeatLkr,
                journey.notes === null ? null : journey.notes.trim(),
            ],
        );

        return res.status(201).json({
            journey: publicJourney(result.rows[0]),
        });
    } catch (error) {
        return next(error);
    }
});

// List the authenticated driver's journeys.
router.get("/mine", async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT ${JOURNEY_COLUMNS}
             FROM journeys
             WHERE driver_id = $1
             ORDER BY departure_at DESC, id DESC
             LIMIT 100`,
            [req.auth.userId],
        );

        return res.status(200).json({
            journeys: result.rows.map(publicJourney),
        });
    } catch (error) {
        return next(error);
    }
});

// View an individual journey.
router.get("/:id", async (req, res, next) => {
    try {
        if (!/^\d+$/.test(req.params.id) || /^0+$/.test(req.params.id)) {
            return sendError(res, 400, "INVALID_JOURNEY_ID", "Journey ID must be a positive integer.");
        }

        const result = await pool.query(
            `SELECT ${JOURNEY_COLUMNS}
             FROM journeys
             WHERE id = $1`,
            [req.params.id],
        );

        if (result.rowCount === 0) {
            return sendError(res, 404, "JOURNEY_NOT_FOUND", "Journey not found.");
        }

        return res.status(200).json({
            journey: publicJourney(result.rows[0]),
        });
    } catch (error) {
        return next(error);
    }
});

// Update a journey owned by the authenticated driver.
router.patch("/:id", async (req, res, next) => {
    let client;
    let transactionOpen = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionOpen = true;

        if (!/^\d+$/.test(req.params.id) || /^0+$/.test(req.params.id)) {
            return sendError(res, 400, "INVALID_JOURNEY_ID", "Journey ID must be a positive integer.");
        }

        const body = req.body;

        if (
            !body
            || typeof body !== "object"
            || Array.isArray(body)
            || Object.keys(body).length === 0
        ) {
            return sendError(res, 400, "VALIDATION_ERROR", "Provide at least one journey field to update.");
        }

        const fields = Object.keys(body);

        if (fields.some((field) => !Object.hasOwn(FIELD_MAP, field))) {
            return sendError(
                res,
                400,
                "VALIDATION_ERROR",
                "The request contains an unsupported journey field.",
            );
        }

        const existingResult = await client.query(
            `SELECT ${JOURNEY_COLUMNS}
             FROM journeys
             WHERE id = $1 AND driver_id = $2
             FOR UPDATE`,
            [req.params.id, req.auth.userId],
        );

        if (existingResult.rowCount === 0) {
            const exists = await client.query(
                "SELECT 1 FROM journeys WHERE id = $1",
                [req.params.id],
            );

            if (exists.rowCount > 0) {
                return sendError(
                    res,
                    403,
                    "JOURNEY_ACCESS_DENIED",
                    "You can only update your own journeys.",
                );
            }

            return sendError(res, 404, "JOURNEY_NOT_FOUND", "Journey not found.");
        }

        const existing = existingResult.rows[0];

        if (existing.status !== "scheduled" || new Date(existing.departure_at) <= new Date()) {
            return sendError(
                res,
                409,
                "JOURNEY_NOT_EDITABLE",
                "Only scheduled journeys that have not departed can be updated.",
            );
        }

        const merged = {
            originName: existing.origin_name,
            originLat: Number(existing.origin_lat),
            originLng: Number(existing.origin_lng),
            destinationName: existing.destination_name,
            destinationLat: Number(existing.destination_lat),
            destinationLng: Number(existing.destination_lng),
            departureAt: new Date(existing.departure_at).toISOString(),
            seatsOffered: existing.seats_offered,
            contributionPerSeatLkr: existing.contribution_per_seat_lkr === null
                ? null
                : Number(existing.contribution_per_seat_lkr),
            notes: existing.notes,
        };

        for (const field of fields) {
            merged[field] = body[field];
        }

        const errors = validateJourney(merged);

        if (errors.length > 0) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Please correct the journey details.",
                    details: errors,
                },
            });
        }

        if (merged.seatsOffered < existing.seats_booked) {
            return sendError(
                res,
                409,
                "SEAT_COUNT_TOO_LOW",
                "Seats offered cannot be lower than seats already booked.",
            );
        }

        const values = [];
        const assignments = [];

        for (const field of fields) {
            values.push(
                field === "departureAt"
                    ? new Date(Date.parse(merged[field])).toISOString()
                    : typeof merged[field] === "string"
                        && field !== "notes"
                        ? merged[field].trim()
                        : merged[field],
            );
            assignments.push(`${FIELD_MAP[field]} = $${values.length}`);
        }

        values.push(req.params.id, req.auth.userId);

        const result = await client.query(
            `UPDATE journeys
             SET ${assignments.join(", ")}, updated_at = NOW()
             WHERE id = $${values.length - 1}
               AND driver_id = $${values.length}
               AND status = 'scheduled'
               AND departure_at > NOW()
             RETURNING ${JOURNEY_COLUMNS}`,
            values,
        );

        if (result.rowCount === 0) {
            return sendError(
                res,
                409,
                "JOURNEY_NOT_EDITABLE",
                "The journey can no longer be updated.",
            );
        }

        await client.query("COMMIT");
        transactionOpen = false;

        return res.status(200).json({
            journey: publicJourney(result.rows[0]),
        });
    } catch (error) {
        return next(error);
    } finally {
        if (client) {
            if (transactionOpen) {
                try {
                    await client.query("ROLLBACK");
                } catch {
                    // Preserve the original response/error if rollback fails.
                }
            }

            client.release();
        }
    }
});

// Cancel rather than physically delete a journey.
router.delete("/:id", async (req, res, next) => {
    try {
        if (!/^\d+$/.test(req.params.id) || /^0+$/.test(req.params.id)) {
            return sendError(res, 400, "INVALID_JOURNEY_ID", "Journey ID must be a positive integer.");
        }

        const result = await pool.query(
            `UPDATE journeys
             SET status = 'cancelled', updated_at = NOW()
             WHERE id = $1
               AND driver_id = $2
               AND status = 'scheduled'
               AND departure_at > NOW()
             RETURNING id`,
            [req.params.id, req.auth.userId],
        );

        if (result.rowCount === 1) {
            return res.status(200).json({
                message: "Journey cancelled successfully.",
                journeyId: String(result.rows[0].id),
                status: "cancelled",
            });
        }

        const existing = await pool.query(
            "SELECT driver_id, status FROM journeys WHERE id = $1",
            [req.params.id],
        );

        if (existing.rowCount === 0) {
            return sendError(res, 404, "JOURNEY_NOT_FOUND", "Journey not found.");
        }

        if (String(existing.rows[0].driver_id) !== String(req.auth.userId)) {
            return sendError(
                res,
                403,
                "JOURNEY_ACCESS_DENIED",
                "You can only cancel your own journeys.",
            );
        }

        return sendError(
            res,
            409,
            "JOURNEY_NOT_CANCELLABLE",
            "Only scheduled journeys that have not departed can be cancelled.",
        );
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
