const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const roleMiddleware = require("../middleware/roleMiddleware");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🔹 **Admin & Employee Access**
const checkAdminOrEmployee = roleMiddleware(["admin", "employee"]);

// 🔹 **Retrieve Newly Enrolled Users (Admin & Employee)**
router.get("/newEnrollments", checkAdminOrEmployee, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    res.status(500).json({ error: "Failed to retrieve enrollments" });
  }
});

// 🔹 **Handle Customer Care Requests (Admin & Employee)**
router.get("/customerCareRequests", checkAdminOrEmployee, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM customer_care_requests");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching customer care requests:", error);
    res.status(500).json({ error: "Failed to retrieve requests" });
  }
});

module.exports = router;
