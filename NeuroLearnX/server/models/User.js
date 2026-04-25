/**
 * Users collection — admin & student roles, optional enrollments.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, unique: true, required: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "student"], default: "student", index: true },
    phone: { type: String, trim: true },
    /** Legacy single "track" label; use enrolledCourses for LMS courses */
    course: { type: String, trim: true },
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course", index: true }],
    lastActiveAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(plain) {
  const stored = this.password || "";

  // bcrypt hash — created by Node.js (bcryptjs) or create_admin.py (bcrypt)
  if (stored.startsWith("$2")) {
    return bcrypt.compare(plain, stored);
  }

  // pbkdf2 hash — created by Flask/Python (werkzeug)
  // Format: pbkdf2:sha256:<iterations>$<salt>$<hash>
  if (stored.startsWith("pbkdf2:")) {
    try {
      const crypto = require("crypto");
      // Parse werkzeug pbkdf2 format: pbkdf2:sha256:iterations$salt$hash
      const dollarIdx = stored.indexOf("$");
      if (dollarIdx === -1) return false;
      const methodPart = stored.slice(0, dollarIdx);
      const rest       = stored.slice(dollarIdx + 1);
      const saltIdx    = rest.indexOf("$");
      if (saltIdx === -1) return false;
      const salt       = rest.slice(0, saltIdx);
      const storedHash = rest.slice(saltIdx + 1);

      const [, algorithm, iterStr] = methodPart.split(":");
      const iterations = parseInt(iterStr, 10);
      const algo       = (algorithm || "sha256").replace("-", "");
      const keyLen     = storedHash.length / 2;   // hex string → bytes

      const derived = crypto
        .pbkdf2Sync(plain, salt, iterations, keyLen, algo)
        .toString("hex");

      // Timing-safe comparison
      const a = Buffer.from(derived,     "hex");
      const b = Buffer.from(storedHash,  "hex");
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch (_) {
      return false;
    }
  }

  // Unknown hash format
  return false;
};

module.exports = mongoose.model("User", userSchema);
