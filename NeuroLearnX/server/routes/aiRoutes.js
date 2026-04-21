/**
 * NeuroX AI — authenticated users (student or admin).
 */
const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { chat } = require("../controllers/aiController");

const router = express.Router();

router.post("/chat", requireAuth, chat);

module.exports = router;
