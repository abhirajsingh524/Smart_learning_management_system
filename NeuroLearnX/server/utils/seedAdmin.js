/**
 * Seed default users for NeuroXLearn (idempotent — skips if email exists).
 * Passwords are explicitly hashed with bcrypt before saving to guarantee
 * the pre-save hook doesn't get bypassed on first run.
 *
 * Seeded accounts:
 *  Admin  : admin@neuroxlearn.com   / Admin@123
 *  Admin  : admin@neuro.com         / admin123
 *  Student: student@neuroxlearn.com / Student@123
 *  Student: user@neuro.com          / user123
 */
const bcrypt = require("bcryptjs");
const User   = require("../models/User");

const SEED_USERS = [
  { name: "NeuroXLearn Admin",   email: "admin@neuroxlearn.com",   password: "Admin@123",   role: "admin"   },
  { name: "Neuro Admin",         email: "admin@neuro.com",         password: "admin123",    role: "admin"   },
  { name: "NeuroXLearn Student", email: "student@neuroxlearn.com", password: "Student@123", role: "student" },
  { name: "Neuro User",          email: "user@neuro.com",          password: "user123",     role: "student" },
];

async function ensureUser({ name, email, password, role }) {
  const existing = await User.findOne({ email }).select("+password");
  if (existing) {
    // Repair: if password is not a valid bcrypt hash, rehash it now
    const isHashed = existing.password &&
                     existing.password.length >= 59 &&
                     existing.password.startsWith("$2");
    if (!isHashed) {
      const hash = await bcrypt.hash(password, 10);
      await User.updateOne({ email }, { password: hash });
      console.log(`[seed] Repaired plain-text password for: ${email}`);
    }
    return false; // already existed
  }

  // Explicitly hash before insert so the pre-save hook is not the only safeguard
  const hash = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hash, role });
  return true;
}

async function seedAdmin() {
  for (const u of SEED_USERS) {
    const created = await ensureUser(u);
    if (created) {
      console.log(`[seed] Created: ${u.email} (${u.role})`);
    }
  }
}

module.exports = seedAdmin;
