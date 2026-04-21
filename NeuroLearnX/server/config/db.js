/**
 * MongoDB connection (Mongoose).
 */
const mongoose = require("mongoose");

async function connectDb() {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_URI_FALLBACK;

  if (!primaryUri && !fallbackUri) {
    throw new Error("MONGO_URI is not set in .env");
  }

  mongoose.set("strictQuery", true);
  const uris = [primaryUri, fallbackUri].filter(Boolean);
  let lastErr = null;

  for (const uri of uris) {
    try {
      // Use a short timeout so the app can still boot with limited features
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      // eslint-disable-next-line no-console
      console.log("MongoDB connected");
      return;
    } catch (err) {
      lastErr = err;
      // eslint-disable-next-line no-console
      console.warn("MongoDB connect attempt failed:", err?.message || err);
    }
  }

  throw lastErr || new Error("MongoDB connection failed");
}

module.exports = connectDb;

