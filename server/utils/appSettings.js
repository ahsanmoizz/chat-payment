const db = require("../db/db");
async function getSetting(key) {
  const res = await db.query("SELECT value FROM app_settings WHERE key = $1", [key]);
  return res.rows[0]?.value || process.env[key] || null;
}

module.exports = { getSetting };
