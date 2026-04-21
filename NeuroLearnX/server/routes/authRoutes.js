/**
 * Auth API routes (prefix: /api/auth).
 */
const express = require("express");
const {
  registerStudent,
  login,
  loginStudent,
  loginAdmin,
  logout,
  me,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/student/register", registerStudent);
router.post("/login", login);
router.post("/student/login", loginStudent);
router.post("/admin/login", loginAdmin);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

module.exports = router;
