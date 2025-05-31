// server/routes/settingsRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db/db");

// GET /api/settings
router.get("/", async (req, res) => {
  const result = await db.query("SELECT key, value FROM app_settings");
  const settings = {};
  result.rows.forEach((row) => {
    settings[row.key] = row.value;
  });
  res.json(settings);
});

// POST /api/admin/settings
router.post("/", async (req, res) => {
  const updates = req.body; // { key: value }

  try {
    for (const key in updates) {
      await db.query(
        `INSERT INTO app_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, updates[key]]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating settings");
  }
});

module.exports = router;
