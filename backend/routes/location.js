const express = require("express");
const router = express.Router();
const axios = require("axios");

const cache = new Map();

const getCacheKey = (query) => {
  return query.toLowerCase().trim();
};

const pool = require("../config/db"); // Ensure you import your DB pool
const authMiddleware = require("../middleware/authMiddleware");

// ADD THIS ROUTE to fix the 404 error
router.post("/status", authMiddleware, async (req, res) => {
    const { status } = req.body;
    const driver_uid = req.user.uid || req.user.id;

    try {
        // Update the driver's online/offline status in the drivers table
        const result = await pool.query(
            "UPDATE drivers SET status = $1 WHERE uid = $2 RETURNING *",
            [status, driver_uid]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Driver not found" });
        }

        console.log(`Driver ${driver_uid} is now ${status}`);
        res.json({ message: "Status updated", status });
    } catch (err) {
        console.error("Status update error:", err.message);
        res.status(500).json({ error: "Failed to update driver status" });
    }
});

// Add this to location.js to update the driver's position in the DB
router.post("/update-position", authMiddleware, async (req, res) => {
  const { latitude, longitude } = req.body;
  const driver_uid = req.user.uid || req.user.id;

  try {
      await pool.query(
          "UPDATE drivers SET latitude = $1, longitude = $2 WHERE uid = $3",
          [latitude, longitude, driver_uid]
      );
      res.json({ success: true });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// REVERSE
router.get("/reverse", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    console.log("Reverse request:", lat, lon);

    if (!lat || !lon) {
      return res.status(400).json({ error: "Missing lat/lon" });
    }

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          format: "json",
          lat,
          lon
        },
        headers: {
          "User-Agent": "zovro-app"
        }
      }
    );

    return res.json(response.data);
  } catch (err) {
    console.error("Reverse error:", err.message);
    return res.status(500).json({
      error: "Reverse geocode failed",
      details: err.message
    });
  }
});

// SEARCH
router.get("/search", async (req, res) => {
    try {
      const query = req.query.q;
  
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }
  
      const key = getCacheKey(query);
  
      // ✅ STEP 1: CHECK CACHE FIRST
      if (cache.has(key)) {
        console.log("Cache hit:", query);
        return res.json(cache.get(key));
      }
  
      // ❌ STEP 2: CALL EXTERNAL API IF NOT IN CACHE
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: query,
            format: "json",
            addressdetails: 1,
            limit: 5,
          },
          headers: {
            "User-Agent": "zovro-app",
          },
        }
      );
  
      const data = response.data;
  
      // ✅ STEP 3: SAVE TO CACHE
      cache.set(key, data);
  
      console.log("API hit:", query);
  
      return res.json(data);
    } catch (err) {
      console.error("Search error:", err?.response?.data || err.message);
  
      if (err?.response?.status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded. Try again later",
        });
      }
  
      return res.status(500).json({
        error: "Search failed",
      });
    }
  });

module.exports = router;