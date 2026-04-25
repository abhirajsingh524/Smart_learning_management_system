/**
 * Server entrypoint.
 * - loads env
 * - connects MongoDB (waits up to 15s, then starts anyway)
 * - seeds default admin
 * - starts Express
 */
require("dotenv").config();

const createApp = require("./app");
const connectDb = require("./config/db");
const seedAdmin = require("./utils/seedAdmin");
const seedContent = require("./utils/seedContent");

async function start() {
  const port = process.env.PORT || 5000;

  let dbConnected = false;
  try {
    await connectDb();
    dbConnected = true;
    await seedAdmin();
    await seedContent();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection failed. Starting server anyway.");
    // eslint-disable-next-line no-console
    console.error(err?.message || err);
  }

  const app = createApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`\n========================================`);
    // eslint-disable-next-line no-console
    console.log(`  Node.js server: http://localhost:${port}`);
    // eslint-disable-next-line no-console
    console.log(`  MongoDB: ${dbConnected ? "✅ Connected" : "❌ Not connected"}`);
    // eslint-disable-next-line no-console
    console.log(`  Flask:   run 'python app.py' on port 5001`);
    // eslint-disable-next-line no-console
    console.log(`========================================\n`);
    if (!dbConnected) {
      // eslint-disable-next-line no-console
      console.log("⚠️  Fix MONGO_URI in .env to enable auth/student/admin APIs.");
    }
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

