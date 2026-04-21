/**
 * Server entrypoint.
 * - loads env
 * - connects MongoDB
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
    console.error("MongoDB connection failed. Starting server anyway (auth/admin/student APIs will fail until DB works).");
    // eslint-disable-next-line no-console
    console.error(err?.message || err);
  }

  const app = createApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${port}`);
    // eslint-disable-next-line no-console
    if (!dbConnected) console.log("Warning: MongoDB is not connected. Fix MONGO_URI to enable auth/admin/student features.");
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

