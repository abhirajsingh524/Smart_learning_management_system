/**
 * CLI: seed default admin without starting the web server.
 * Usage (from project root): node server/utils/runSeedAdmin.js
 */
require("dotenv").config();
const connectDb = require("../config/db");
const seedAdmin = require("./seedAdmin");

(async () => {
  await connectDb();
  await seedAdmin();
  // eslint-disable-next-line no-console
  console.log("Done.");
  process.exit(0);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
