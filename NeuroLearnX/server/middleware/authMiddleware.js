/**
 * JWT verification middleware.
 * Accepts: Authorization: Bearer <token>, or HTTP-only cookie (COOKIE_NAME).
 *
 * Tokens must include `userId` (and may include legacy `sub` from older libs).
 */
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: "Not authenticated. Please sign in." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.userId || payload.sub;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    req.user = user;
    req.authPayload = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token. Please sign in again." });
  }
}

module.exports = { requireAuth, getTokenFromRequest };
