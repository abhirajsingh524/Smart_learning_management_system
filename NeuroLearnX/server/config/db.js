/**
 * MongoDB connection (Mongoose).
 * - Long timeouts for Atlas cold-start
 * - Auto-reconnect on drop
 * - bufferCommands: false so we get immediate errors instead of silent queuing
 */
const mongoose = require("mongoose");

async function connectDb() {
  const primaryUri  = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_URI_FALLBACK;

  if (!primaryUri && !fallbackUri) {
    throw new Error("MONGO_URI is not set in .env");
  }

  mongoose.set("strictQuery", true);

  // Log connection lifecycle events
  mongoose.connection.on("connected",     () => console.log("[MongoDB] ✅ Connected"));
  mongoose.connection.on("disconnected",  () => console.warn("[MongoDB] ⚠️  Disconnected"));
  mongoose.connection.on("reconnected",   () => console.log("[MongoDB] 🔄 Reconnected"));
  mongoose.connection.on("error",   (err) => console.error("[MongoDB] ❌ Error:", err.message));

  const uris    = [primaryUri, fallbackUri].filter(Boolean);
  let   lastErr = null;

  for (const uri of uris) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 20000,   // 20s — generous for Atlas cold-start
        connectTimeoutMS:         20000,
        socketTimeoutMS:          60000,
        maxPoolSize:              10,
        minPoolSize:              2,       // keep 2 connections warm
        heartbeatFrequencyMS:     10000,   // check every 10s
        // Do NOT buffer commands — fail fast so we can retry properly
        bufferCommands:           false,
      });
      console.log("[MongoDB] ✅ Connected");
      return;
    } catch (err) {
      lastErr = err;
      console.warn("[MongoDB] Connect attempt failed:", err?.message || err);
    }
  }

  throw lastErr || new Error("MongoDB connection failed");
}

module.exports = connectDb;
