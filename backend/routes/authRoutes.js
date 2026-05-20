const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 🟢 Bypassing the import caching issue by defining the Pool connection directly:
const { Pool } = require('pg');
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for your live Aiven cloud database
      }
    })
  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'zovro_db',
      password: '1234',
      port: 5432,
    });

    // ⚠️ TEMPORARY MAINTENANCE ROUTE: Delete this after running it once!
router.get("/clear-database-users-completely-now", async (req, res) => {
  try {
    // This executes the database truncation cleanly over the backend's secure connection
    await pool.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE;");
    
    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #10b981;">🚀 Success!</h1>
        <p style="font-size: 18px; color: #4b5563;">The users table has been completely wiped clean and rows have been removed.</p>
      </div>
    `);
  } catch (err) {
    res.status(500).send("Database cleanup error: " + err.message);
  }
});

// ==========================================
// REGISTER
// ==========================================
router.post("/register", async (req, res) => {
  const { name, lastName, email, password, user_type, phone_number, firebase_uid } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (first_name, last_name, email, password, user_type, phone_number, firebase_uid) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, first_name, last_name, email, user_type, firebase_uid;
    `;

    const values = [
      name, 
      lastName || "", 
      email || `${firebase_uid}@zovro.com`, 
      hashedPassword, 
      user_type || 'rider', 
      phone_number, 
      firebase_uid
    ];

    const result = await pool.query(sql, values);
    const registeredUser = result.rows[0];

    const token = jwt.sign(
      { id: registeredUser.id, role: registeredUser.user_type },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({ 
      message: "User registered successfully", 
      token: token,
      user: { 
        id: registeredUser.id,
        uid: registeredUser.firebase_uid,
        first_name: registeredUser.first_name,
        last_name: registeredUser.last_name,
        email: registeredUser.email,
        user_type: registeredUser.user_type
      }
    });

  } catch (err) {
    console.error("DETAILED DATABASE ERROR:", err.message);
    res.status(500).json({ error: "Database error during registration", details: err.message });
  }
});

// ==========================================
// STANDARD LOGIN
// ==========================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.user_type },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({ 
      token, 
      user: {
        id: user.id,
        uid: user.firebase_uid,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type 
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ==========================================
// FIREBASE LOGIN & AUTO-REGISTRATION
// ==========================================
router.post("/login-firebase", async (req, res) => {
  // 🟢 FIX 1: Pull phone_number and name directly out of req.body if the frontend passes them
  const { firebase_uid, phone_number, name } = req.body;

  console.log("DEBUG POOL OBJECT TYPE:", typeof pool, "Is pool.query present?:", !!pool?.query);

  try {
    const result = await pool.query(
      "SELECT id, first_name, last_name, email, user_type, firebase_uid FROM users WHERE firebase_uid = $1",
      [firebase_uid]
    );

    let user;

    if (result.rows.length === 0) {
      console.log(`User ${firebase_uid} not found. Creating a new profile record...`);
      
      const insertSql = `
        INSERT INTO users (first_name, last_name, email, password, user_type, phone_number, firebase_uid) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING id, first_name, last_name, email, user_type, firebase_uid;
      `;

      // 🟢 FIX 2: Uses the fallback properties safely without crashing Node
      const insertValues = [
        name || "Zovro User", 
        "", 
        `${firebase_uid}@zovro.com`, 
        "firebase_auth_managed", 
        'rider', 
        phone_number || "", 
        firebase_uid
      ];

      const createResult = await pool.query(insertSql, insertValues);
      user = createResult.rows[0];
    } else {
      user = result.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, role: user.user_type },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({ 
      token, 
      user: {
        id: user.id,
        uid: user.firebase_uid,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type 
      }
    });

  } catch (err) {
    console.error("Firebase Login Error:", err.message);
    res.status(500).json({ error: "Server error during Firebase login", details: err.message });
  }
});

module.exports = router;