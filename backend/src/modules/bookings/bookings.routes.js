const express = require("express");
const pool = require("../../database/pool");
const { requireAuth } = require("../auth/auth.middleware");

const router = express.Router();

router.use(requireAuth);

const BOOKING_COLUMNS = `
    b.id,
    b.journey_id,
    b.passenger_id,
    b.seats_requested,
    b.status,
    b.requested_at,
    b.updated_at,
    j.driver_id,
    j.origin_name,
    j.destination_name,
    j.departure_at,
    j.seats_offered,
    j.seats_booked,
    j.status AS journey_status
`;

function sendError(res, status, code, message) {
  return res.status(status).json({
    error: { code, message },
  });
}

function publicBooking(row) {
  return {
    id: String(row.id),
    journeyId: String(row.journey_id),
    passengerId: String(row.passenger_id),
    driverId: String(row.driver_id),
    seatsRequested: row.seats_requested,
    status: row.status,
    requestedAt: row.requested_at,
    updatedAt: row.updated_at,
    journey: {
      originName: row.origin_name,
      destinationName: row.destination_name,
      departureAt: row.departure_at,
      status: row.journey_status,
    },
  };
}

function validId(value) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value);
}

// Passenger requests seats on a scheduled journey.
router.post("/", async (req, res, next) => {
  const journeyId = req.body?.journeyId;
  const seatsRequested = req.body?.seatsRequested ?? 1;

  if (
    !validId(String(journeyId ?? "")) ||
    !Number.isInteger(seatsRequested) ||
    seatsRequested < 1 ||
    seatsRequested > 8
  ) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "A valid journeyId and seatsRequested integer between 1 and 8 are required.",
    );
  }

  let client;
  let transactionOpen = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionOpen = true;

    const journeyResult = await client.query(
      `SELECT id, driver_id, departure_at, seats_offered,
              seats_booked, status
       FROM journeys
       WHERE id = $1
       FOR UPDATE`,
      [journeyId],
    );

    if (journeyResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(res, 404, "JOURNEY_NOT_FOUND", "Journey not found.");
    }

    const journey = journeyResult.rows[0];

    if (
      journey.status !== "scheduled" ||
      new Date(journey.departure_at).getTime() <= Date.now()
    ) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(
        res,
        409,
        "JOURNEY_NOT_BOOKABLE",
        "This journey is no longer accepting booking requests.",
      );
    }

    if (String(journey.driver_id) === String(req.auth.userId)) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(
        res,
        400,
        "SELF_BOOKING_NOT_ALLOWED",
        "You cannot request seats on your own journey.",
      );
    }

    const existingResult = await client.query(
      `SELECT id
       FROM bookings
       WHERE journey_id = $1
         AND passenger_id = $2
         AND status IN ('pending', 'accepted')
       LIMIT 1`,
      [journeyId, req.auth.userId],
    );

    if (existingResult.rowCount > 0) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(
        res,
        409,
        "ACTIVE_BOOKING_EXISTS",
        "You already have an active booking for this journey.",
      );
    }

    const result = await client.query(
      `INSERT INTO bookings
         (journey_id, passenger_id, seats_requested, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id, journey_id, passenger_id, seats_requested,
                 status, requested_at, updated_at`,
      [journeyId, req.auth.userId, seatsRequested],
    );

    await client.query("COMMIT");
    transactionOpen = false;

    const booking = await pool.query(
      `SELECT ${BOOKING_COLUMNS}
       FROM bookings b
       JOIN journeys j ON j.id = b.journey_id
       WHERE b.id = $1`,
      [result.rows[0].id],
    );

    return res.status(201).json({
      booking: publicBooking(booking.rows[0]),
    });
  } catch (error) {
    if (error.code === "23505") {
      return sendError(
        res,
        409,
        "ACTIVE_BOOKING_EXISTS",
        "You already have an active booking for this journey.",
      );
    }

    return next(error);
  } finally {
    if (client) {
      if (transactionOpen) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Preserve the original error.
        }
      }

      client.release();
    }
  }
});

// Passenger views their booking requests.
router.get("/mine", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${BOOKING_COLUMNS}
       FROM bookings b
       JOIN journeys j ON j.id = b.journey_id
       WHERE b.passenger_id = $1
       ORDER BY b.requested_at DESC, b.id DESC
       LIMIT 100`,
      [req.auth.userId],
    );

    return res.status(200).json({
      bookings: result.rows.map(publicBooking),
    });
  } catch (error) {
    return next(error);
  }
});

// Driver views booking requests for their journeys.
router.get("/driver", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${BOOKING_COLUMNS}
       FROM bookings b
       JOIN journeys j ON j.id = b.journey_id
       WHERE j.driver_id = $1
       ORDER BY
         CASE b.status WHEN 'pending' THEN 0 ELSE 1 END,
         b.requested_at ASC,
         b.id ASC
       LIMIT 100`,
      [req.auth.userId],
    );

    return res.status(200).json({
      bookings: result.rows.map(publicBooking),
    });
  } catch (error) {
    return next(error);
  }
});

// Driver accepts or declines a booking.
router.patch("/:id/decision", async (req, res, next) => {
  const bookingId = req.params.id;
  const decision = req.body?.decision;

  if (!validId(bookingId)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "A valid booking ID is required.",
    );
  }

  if (!["accepted", "declined"].includes(decision)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Decision must be accepted or declined.",
    );
  }

  let client;
  let transactionOpen = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionOpen = true;

    const bookingResult = await client.query(
      `SELECT b.id, b.journey_id, b.passenger_id, b.seats_requested,
              b.status, j.driver_id
       FROM bookings b
       JOIN journeys j ON j.id = b.journey_id
       WHERE b.id = $1`,
      [bookingId],
    );

    if (bookingResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(res, 404, "BOOKING_NOT_FOUND", "Booking not found.");
    }

    const booking = bookingResult.rows[0];

    if (String(booking.driver_id) !== String(req.auth.userId)) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(
        res,
        403,
        "BOOKING_ACCESS_DENIED",
        "You can only decide on bookings for your own journeys.",
      );
    }

    const journeyResult = await client.query(
      `SELECT id, driver_id, departure_at, seats_offered,
              seats_booked, status
       FROM journeys
       WHERE id = $1
       FOR UPDATE`,
      [booking.journey_id],
    );

    const journey = journeyResult.rows[0];

    const lockedBookingResult = await client.query(
      `SELECT id, journey_id, passenger_id, seats_requested, status
       FROM bookings
       WHERE id = $1
       FOR UPDATE`,
      [bookingId],
    );

    const lockedBooking = lockedBookingResult.rows[0];

    if (lockedBooking.status !== "pending") {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(
        res,
        409,
        "BOOKING_ALREADY_DECIDED",
        "Only pending bookings can be accepted or declined.",
      );
    }

    if (decision === "accepted") {
      if (
        journey.status !== "scheduled" ||
        new Date(journey.departure_at).getTime() <= Date.now()
      ) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return sendError(
          res,
          409,
          "JOURNEY_NOT_BOOKABLE",
          "This journey is no longer accepting bookings.",
        );
      }

      const availableSeats = journey.seats_offered - journey.seats_booked;

      if (lockedBooking.seats_requested > availableSeats) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return sendError(
          res,
          409,
          "INSUFFICIENT_SEATS",
          "There are not enough available seats to accept this booking.",
        );
      }

      await client.query(
        `UPDATE journeys
         SET seats_booked = seats_booked + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [lockedBooking.seats_requested, journey.id],
      );
    }

    await client.query(
      `UPDATE bookings
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [decision, bookingId],
    );

    const updatedResult = await client.query(
      `SELECT ${BOOKING_COLUMNS}
       FROM bookings b
       JOIN journeys j ON j.id = b.journey_id
       WHERE b.id = $1`,
      [bookingId],
    );

    await client.query("COMMIT");
    transactionOpen = false;

    return res.status(200).json({
      booking: publicBooking(updatedResult.rows[0]),
    });
  } catch (error) {
    return next(error);
  } finally {
    if (client) {
      if (transactionOpen) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Preserve the original error.
        }
      }

      client.release();
    }
  }
});

// Passenger cancels their pending or accepted booking.
router.patch("/:id/cancel", async (req, res, next) => {
  const bookingId = req.params.id;

  if (!validId(bookingId)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "A valid booking ID is required.",
    );
  }

  let client;
  let transactionOpen = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionOpen = true;

    const bookingResult = await client.query(
      `SELECT b.id, b.journey_id, b.passenger_id, b.seats_requested,
              b.status, j.driver_id
       FROM bookings b
       JOIN journeys j ON j.id = b.journey_id
       WHERE b.id = $1`,
      [bookingId],
    );

    if (bookingResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(res, 404, "BOOKING_NOT_FOUND", "Booking not found.");
    }

    const booking = bookingResult.rows[0];

    if (String(booking.passenger_id) !== String(req.auth.userId)) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(
        res,
        403,
        "BOOKING_ACCESS_DENIED",
        "You can only cancel your own bookings.",
      );
    }

    const journeyResult = await client.query(
      `SELECT id, departure_at, seats_booked, status
       FROM journeys
       WHERE id = $1
       FOR UPDATE`,
      [booking.journey_id],
    );

    const journey = journeyResult.rows[0];

    if (
      journey.status !== "scheduled" ||
      new Date(journey.departure_at).getTime() <= Date.now()
    ) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(
        res,
        409,
        "JOURNEY_NOT_CANCELLABLE",
        "Bookings cannot be cancelled after the journey has started or is no longer scheduled.",
      );
    }

    const lockedBookingResult = await client.query(
      `SELECT id, passenger_id, seats_requested, status
       FROM bookings
       WHERE id = $1
       FOR UPDATE`,
      [bookingId],
    );

    const lockedBooking = lockedBookingResult.rows[0];

    if (!["pending", "accepted"].includes(lockedBooking.status)) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return sendError(
        res,
        409,
        "BOOKING_NOT_CANCELLABLE",
        "Only pending or accepted bookings can be cancelled.",
      );
    }

    if (lockedBooking.status === "accepted") {
      const seatReleaseResult = await client.query(
        `UPDATE journeys
         SET seats_booked = seats_booked - $1,
             updated_at = NOW()
         WHERE id = $2
           AND seats_booked >= $1
         RETURNING id`,
        [lockedBooking.seats_requested, booking.journey_id],
      );

      if (seatReleaseResult.rowCount === 0) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return sendError(
          res,
          409,
          "SEAT_COUNT_INCONSISTENT",
          "The booking cannot be cancelled because the journey's seat count is inconsistent.",
        );
      }
    }

    await client.query(
      `UPDATE bookings
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [bookingId],
    );

    const updatedResult = await client.query(
      `SELECT ${BOOKING_COLUMNS}
       FROM bookings b
       JOIN journeys j ON j.id = b.journey_id
       WHERE b.id = $1`,
      [bookingId],
    );

    await client.query("COMMIT");
    transactionOpen = false;

    return res.status(200).json({
      booking: publicBooking(updatedResult.rows[0]),
    });
  } catch (error) {
    return next(error);
  } finally {
    if (client) {
      if (transactionOpen) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Preserve the original error.
        }
      }

      client.release();
    }
  }
});

module.exports = router;
