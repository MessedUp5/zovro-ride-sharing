const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ==========================================
// REGISTER
// ==========================================
router.post("/register", async (req, res) => {
  const { name, lastName, email, password, user_type, phone_number, firebase_uid } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Added firebase_uid to RETURNING so it can be mapped cleanly to the frontend user object
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

    // JWT payload uses database integer id
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
        uid: registeredUser.firebase_uid, // 🟢 Mapped for frontend compatibility
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
        uid: user.firebase_uid, // 🟢 Added to resolve "column uid does not exist" type errors on frontend
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
// FIREBASE LOGIN
// ==========================================
router.post("/login-firebase", async (req, res) => {
  const { firebase_uid } = req.body;

  try {
    // Included firebase_uid explicitly in the SELECT query array parameters
    const result = await pool.query(
      "SELECT id, first_name, last_name, email, user_type, firebase_uid FROM users WHERE firebase_uid = $1",
      [firebase_uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found in database" });
    }

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, role: user.user_type },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({ 
      token, 
      user: {
        id: user.id,
        uid: user.firebase_uid, // 🟢 Passed cleanly back down to storage
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type 
      }
    });
  } catch (err) {
    console.error("Firebase Login Error:", err.message);
    res.status(500).json({ error: "Server error during Firebase login" });
  }
});

module.exports = router;