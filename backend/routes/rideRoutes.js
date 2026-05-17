const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const getDistance = require("../utils/distance");

// =========================================================================
// 1. POST: Request a new Ride (Rider side)
// =========================================================================
router.post("/request", authMiddleware, async (req, res) => {
  const {
      pickup_address,
      drop_address,
      pickup_lat,
      pickup_lng,
      drop_lat,
      drop_lng,
      fare_lkr
  } = req.body;

  // Normalize user session identifiers to a clean string format
  const rider_uid = String(req.user?.id || req.user?.userId || ""); 

  try {
      // Fallback-safe driver spatial fetch block to protect against missing tracking layouts
      let drivers = [];
      try {
          const driversRes = await pool.query("SELECT * FROM users WHERE user_type = 'driver'");
          drivers = driversRes.rows;
      } catch (dbErr) {
          console.error("Internal fallback driver check failed:", dbErr.message);
      }

      let nearestDriver = null;
      let minDistance = Infinity;

      if (drivers.length > 0) {
          drivers.forEach(driver => {
              // Safely read coordinates favoring the correct migrated columns
              const dLat = driver.current_lat || driver.driver_current_lat || driver.lat;
              const dLng = driver.current_lng || driver.driver_current_lng || driver.lng;
              
              if (dLat !== null && dLng !== null && dLat !== undefined && dLng !== undefined) {
                  const distance = getDistance(
                      parseFloat(pickup_lat), 
                      parseFloat(pickup_lng), 
                      parseFloat(dLat), 
                      parseFloat(dLng)
                  );
                  if (distance < minDistance) {
                      minDistance = distance;
                      nearestDriver = driver;
                  }
              }
          });
      }

      // Insert using the explicit layout table columns
      const sql = `
          INSERT INTO rides 
          (rider_uid, pickup_address, drop_address, pickup_lat, pickup_lng, drop_lat, drop_lng, fare_lkr, status)
          VALUES ($1::varchar, $2, $3, $4::double precision, $5::double precision, $6::double precision, $7::double precision, $8::numeric, 'pending')
          RETURNING *`;
          
      const result = await pool.query(sql, [
          rider_uid,
          pickup_address, 
          drop_address, 
          parseFloat(pickup_lat), 
          parseFloat(pickup_lng), 
          parseFloat(drop_lat), 
          parseFloat(drop_lng), 
          parseFloat(fare_lkr)
      ]);

      res.json({
          message: "Searching for drivers...",
          ride: result.rows[0],
          // FIX: Use nearestDriver instead of undefined driver variable
          nearest_driver_estimate: nearestDriver ? {
              id: nearestDriver.id || nearestDriver.firebase_uid,
              name: `${nearestDriver.first_name || ''} ${nearestDriver.last_name || ''}`.trim()
          } : null
      });
  } catch (err) {
      console.error("====== RIDE REQUEST SERVER CRASH ======");
      console.error(err.message);
      console.error("=======================================");
      res.status(500).json({ error: "Server error during request processing.", details: err.message });
  }
});

router.put("/status/:id", authMiddleware, async (req, res) => {
  const targetRideId = req.params.id;
  const { status, lat, lng } = req.body;
  
  // Use string identifier to match character varying(255) column fields
  const driverIdentifier = req.user?.uid || String(req.user?.id || "");

  try {
    // FIX: Targets 'ride_id' and populates 'driver_current_lat' / 'driver_current_lng'
    const queryText = `
      UPDATE rides 
      SET status = $1, 
          driver_uid = $2, 
          driver_current_lat = $3::double precision, 
          driver_current_lng = $4::double precision
      WHERE ride_id = $5::integer
      RETURNING *;
    `;

    const queryValues = [
      status,
      driverIdentifier,
      parseFloat(lat || 0),
      parseFloat(lng || 0),
      parseInt(targetRideId, 10)
    ];

    const result = await pool.query(queryText, queryValues);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No ride found matching the specified ride_id tracker." });
    }

    // Wrap it beautifully so your frontend code can read it regardless of naming variations
    const updatedRideRow = result.rows[0];
    return res.json({ 
      success: true, 
      ride: {
        ...updatedRideRow,
        id: updatedRideRow.ride_id // Map ride_id to .id property dynamically for frontend safety
      }
    });

  } catch (err) {
    console.error("====== ACTIVE RIDE MATCHING CRASH ======");
    console.error(err.message);
    console.error("========================================");
    return res.status(500).json({ error: "Failed to sync ride acceptance states in DB.", details: err.message });
  }
});

// =========================================================================
// 3. GET: Fetch Nearby Pending Rides for Active Drivers (Polling Endpoint)
// =========================================================================
router.get('/pending', authMiddleware, async (req, res) => {
  const { lat, lng } = req.query;

  try {
    if (!lat || !lng) {
      return res.status(400).json({ error: "Driver location required for filtering spatial radius loops." });
    }

    const radius_km = 5; 

    const query = `
      SELECT *, (
        6371 * acos(
          cos(radians($1::double precision)) * cos(radians(pickup_lat)) *
          cos(radians(pickup_lng) - radians($2::double precision)) +
          sin(radians($1::double precision)) * sin(radians(pickup_lat))
        )
      ) AS distance_km
      FROM rides
      WHERE status = 'pending'
      AND (
        6371 * acos(
          cos(radians($1::double precision)) * cos(radians(pickup_lat)) *
          cos(radians(pickup_lng) - radians($2::double precision)) +
          sin(radians($1::double precision)) * sin(radians(pickup_lat))
        )
      ) < $3::double precision
      ORDER BY created_at DESC`;

    const result = await pool.query(query, [lat, lng, radius_km]);
    res.json(result.rows);
  } catch (err) {
    console.error("Distance filter loop processing breakdown:", err.message);
    res.status(500).json({ error: "Database error during spatial calculation." });
  }
});

router.patch('/update-driver-profile-location', authMiddleware, async (req, res) => {
  const { lat, lng } = req.body;
  const driverId = req.user.id; // From your JWT token payload

  try {
    // ALERT: Ensure these column names exist in your 'users' table!
    // If your table uses different names, change them here to match exactly.
    await pool.query(
      `UPDATE users 
       SET current_lat = $1::double precision, 
           current_lng = $2::double precision 
       WHERE id = $3::integer`, 
      [parseFloat(lat), parseFloat(lng), parseInt(driverId, 10)]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Profile location save failure:", err.message);
    return res.status(500).json({ error: "Database column mismatch tracking location." });
  }
});

router.get('/active-ride', authMiddleware, async (req, res) => {
  try {
    const passengerId = String(req.user?.id || req.user?.userId || "");
    
    if (!passengerId) {
      return res.status(401).json({ error: "User identity profile reference invalid." });
    }

    // FIX: Leveraged 'u.id' with clear type casting to align with string-based driver fields smoothly
    const activeRide = await pool.query(
      `SELECT r.*, 
              CONCAT(u.first_name, ' ', u.last_name) as driver_name, 
              u.phone_number as driver_phone
       FROM rides r 
       LEFT JOIN users u ON r.driver_uid::varchar = u.id::varchar 
       WHERE r.rider_uid = $1::varchar
         AND r.status IN ('pending', 'accepted', 'arrived', 'ongoing')
       ORDER BY r.created_at DESC 
       LIMIT 1`,
      [passengerId]
    );

    if (activeRide.rows.length > 0) {
      return res.json({ ride: activeRide.rows[0] });
    }
    
    return res.json({ ride: null });
  } catch (err) {
    console.error("====== ACTIVE RIDE DB CRASH ======");
    console.error(err.message);
    console.error("==================================");
    res.status(500).json({ error: "Database query failed", details: err.message });
  }
});

// Inside your accept ride backend route handler
router.patch("/accept", authMiddleware, async (req, res) => {
  const { ride_id } = req.body;
  const driverId = req.user.id; // Using the clean numerical ID from your new token payload

  try {
    // FIX: Ensure you are updating using correct schema columns
    // We update driver_uid with the integer string or id, and set status to 'accepted'
    const updatedRide = await pool.query(
      `UPDATE rides 
       SET status = 'accepted', 
           driver_uid = $1 
       WHERE id = $2 
       RETURNING *`,
      [String(driverId), ride_id]
    );

    res.json({ success: true, ride: updatedRide.rows[0] });
  } catch (err) {
    console.error("====== ACTIVE RIDE DB CRASH ======");
    console.error(err.message);
    console.error("==================================");
    res.status(500).json({ error: "Failed to process ride acceptance rules." });
  }
});

// =========================================================================
// 6. DELETE: Cancel/Drop Unmatched Ride Search Postings
// =========================================================================
router.delete("/cancel", authMiddleware, async (req, res) => {
    const rider_uid = String(req.user?.id || req.user?.userId || "");
  
    try {
        const sql = `DELETE FROM rides WHERE rider_uid = $1::varchar AND status = 'pending'`;
        const result = await pool.query(sql, [rider_uid]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "No unmatched pending ride configurations found." });
        }
        res.json({ message: "Ride booking post pulled down cleanly." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;