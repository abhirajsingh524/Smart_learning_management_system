/**
 * Direct admin creation — run once, no interaction needed.
 * Usage: node fix_admin.js <email> <password> <name>
 * Example: node fix_admin.js myadmin@example.com MyPass@123 "My Admin"
 *
 * If no args given, resets the seed admin passwords to known values.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// Load all models
require("./server/models/Course");
require("./server/models/Quiz");
require("./server/models/QuizAttempt");
const User = require("./server/models/User");

const [,, emailArg, passwordArg, ...nameParts] = process.argv;
const nameArg = nameParts.join(" ");

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("Connected ✅\n");

  if (emailArg && passwordArg) {
    // ── Create / update a specific admin ──────────────────────────────────
    const email = emailArg.toLowerCase().trim();
    const name  = nameArg || email.split("@")[0];

    const existing = await User.findOne({ email }).select("+password");

    if (existing) {
      // Update password and ensure role is admin
      const hash = await bcrypt.hash(passwordArg, 10);
      await User.updateOne({ email }, { password: hash, role: "admin" });
      console.log(`✅ Updated: ${email}`);
      console.log(`   Role: admin`);
      console.log(`   Password: ${passwordArg}`);
    } else {
      // Create new admin
      const hash = await bcrypt.hash(passwordArg, 10);
      const now  = new Date().toISOString();
      await User.create({
        name,
        email,
        password: hash,
        role:     "admin",
        enrolledCourses: [],
        lastActiveAt: now,
      });
      console.log(`✅ Created admin: ${email}`);
      console.log(`   Name: ${name}`);
      console.log(`   Password: ${passwordArg}`);
    }

  } else {
    // ── No args: show all admins and fix seed passwords ───────────────────
    console.log("No args given. Showing all admins and verifying seed passwords...\n");

    const admins = await User.find({ role: "admin" }).select("+password").lean();
    console.log(`Admins in DB: ${admins.length}`);

    for (const u of admins) {
      const pw = u.password || "";
      const hashType = pw.startsWith("$2") ? "bcrypt" : pw.startsWith("pbkdf2:") ? "pbkdf2" : "unknown";
      console.log(`\n  ${u.email} | ${hashType} | len=${pw.length}`);

      // Test known passwords
      const tests = ["Admin@123", "admin123", "Admin123", "admin@123", "password", "123456"];
      for (const p of tests) {
        let ok = false;
        try { ok = await bcrypt.compare(p, pw); } catch (_) {}
        if (ok) console.log(`    ✅ Password works: "${p}"`);
      }
    }

    console.log("\n─────────────────────────────────────────");
    console.log("To create/update an admin, run:");
    console.log('  node fix_admin.js <email> <password> [name]');
    console.log('  node fix_admin.js admin@example.com MyPass@123 "Admin Name"');
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
