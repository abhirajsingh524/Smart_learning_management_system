/**
 * Role-based route protection.
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated." });
    if (req.user.role !== role) {
      return res.status(403).json({ message: "You do not have permission to access this resource." });
    }
    return next();
  };
}

module.exports = { requireRole };

