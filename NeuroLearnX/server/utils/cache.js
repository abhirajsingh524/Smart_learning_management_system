/**
 * In-process LRU cache for user dashboard data.
 *
 * Why not Redis?
 *   Redis is better for multi-instance deployments. For a single-server
 *   Node.js app (this project), an in-process Map with TTL is zero-dependency,
 *   zero-latency, and perfectly sufficient.
 *
 * Design:
 *   - Key:   userId string
 *   - Value: { data, cachedAt, ttl }
 *   - TTL:   60 seconds for profile (changes rarely)
 *            30 seconds for dashboard stats (quiz attempts change more often)
 *   - Max:   500 entries (auto-evicts oldest on overflow)
 *   - Invalidation: explicit delete on profile update / quiz attempt
 */

const MAX_ENTRIES = 500;

class LRUCache {
  constructor() {
    // Map preserves insertion order — oldest entry is first
    this._store = new Map();
  }

  /**
   * Get a cached value. Returns null if missing or expired.
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }

    // LRU: move to end (most recently used)
    this._store.delete(key);
    this._store.set(key, entry);
    return entry.data;
  }

  /**
   * Store a value with a TTL in milliseconds.
   */
  set(key, data, ttlMs) {
    // Evict oldest entry if at capacity
    if (this._store.size >= MAX_ENTRIES) {
      const oldestKey = this._store.keys().next().value;
      this._store.delete(oldestKey);
    }

    this._store.set(key, {
      data,
      cachedAt:  Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Explicitly remove a key (call on profile update / quiz submit).
   */
  del(key) {
    this._store.delete(key);
  }

  /**
   * Remove all keys that start with a prefix.
   * e.g. invalidatePrefix("dash:") removes all dashboard entries.
   */
  invalidatePrefix(prefix) {
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) this._store.delete(key);
    }
  }

  get size() {
    return this._store.size;
  }

  stats() {
    return { entries: this._store.size, maxEntries: MAX_ENTRIES };
  }
}

// ── Singleton instances ────────────────────────────────────────────────────
const profileCache   = new LRUCache(); // GET /api/student/profile
const dashboardCache = new LRUCache(); // GET /api/student/dashboard
const coursesCache   = new LRUCache(); // GET /api/student/courses

// TTL constants
const TTL = {
  PROFILE:   60  * 1000,  // 60s  — profile changes rarely
  DASHBOARD: 30  * 1000,  // 30s  — stats update after quiz attempts
  COURSES:   120 * 1000,  // 120s — course list is very stable
};

/**
 * Invalidate ALL cached data for a user.
 * Call this after: profile update, quiz attempt, enrollment change.
 */
function invalidateUser(userId) {
  const id = String(userId);
  profileCache.del(id);
  dashboardCache.del(id);
  coursesCache.del(id);
  // eslint-disable-next-line no-console
  console.log(`[Cache] Invalidated all entries for user: ${id}`);
}

module.exports = { profileCache, dashboardCache, coursesCache, TTL, invalidateUser };
