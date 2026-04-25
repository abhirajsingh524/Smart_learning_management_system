/**
 * JWT verification middleware.
 * Accepts: Authorization: Bearer <token>, or HTTP-only cookie (COOKIE_NAME).
 */
const jwt      = require("jsonwebtoken");
const mongoose = require("mongoose");
const User     = require("../models/User");

function getTokenFromRequest(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length);
  }
  const cookieName = process.env.COOKIE_NAME || "token";
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }
  return null;
}

/**
 * Wait for Mongoose to reach readyState 1 (connected).
 * Polls every 200ms for up to 10 seconds before giving up.
 */
function waitForDb(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) return resolve();

    const start    = Date.now();
    const interval = setInterval(() => {
      if (mongoose.connection.readyState === 1) {
        clearInterval(interval);
        return resolve();
      }
      if (Date.now() - start >= timeoutMs) {
        clearInterval(interval);
        return reject(new Error("MongoDB not ready after " + timeoutMs + "ms"));
      }
    }, 200);
  });
}

async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: "Not authenticated. Please sign in." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId  = payload.userId || payload.sub;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    // Wait for DB to be ready (handles cold-start race condition)
    try {
      await waitForDb(10000);
    } catch (_) {
      return res.status(503).json({
        message: "Database is starting up. Please refresh in a moment.",
      });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    req.user        = user;
    req.authPayload = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token. Please sign in again." });
  }
}

module.exports = { requireAuth, getTokenFromRequest };
