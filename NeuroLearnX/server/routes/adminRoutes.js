/**
 * Admin routes — JWT + role `admin` required.
 */
const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const {
  getDashboard,
  listStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getAnalytics,
} = require("../controllers/adminController");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/dashboard", getDashboard);
router.get("/analytics", getAnalytics);
router.get("/students", listStudents);
router.get("/students/:id", getStudentById);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", deleteStudent);

module.exports = router;
