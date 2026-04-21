/**
 * Seed temporary access users for NeuroXLearn.
 * - Admin:   admin@neuroxlearn.com / Admin@123
 * - Student: student@neuroxlearn.com / Student@123
 */
const User = require("../models/User");

async function ensureUser({ name, email, password, role }) {
  const exists = await User.findOne({ email });
  if (exists) return false;
  await User.create({ name, email, password, role });
  return true;
}

async function seedAdmin() {
  const seededAdmin = await ensureUser({
    name: "NeuroXLearn Admin",
    email: "admin@neuroxlearn.com",
    password: "Admin@123",
    role: "admin",
  });

  const seededStudent = await ensureUser({
    name: "NeuroXLearn Student",
    email: "student@neuroxlearn.com",
    password: "Student@123",
    role: "student",
  });

  // eslint-disable-next-line no-console
  if (seededAdmin) console.log("Seeded admin: admin@neuroxlearn.com");
  // eslint-disable-next-line no-console
  if (seededStudent) console.log("Seeded student: student@neuroxlearn.com");
}

module.exports = seedAdmin;
