// server/db/db.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g. postgres://user:password@localhost:5432/your_db
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
