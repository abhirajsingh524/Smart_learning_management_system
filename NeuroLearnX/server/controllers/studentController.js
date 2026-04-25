/**
 * Student LMS: dashboard, courses, quizzes, profile.
 *
 * Caching strategy:
 *   - authMiddleware already fetches req.user from MongoDB.
 *     We reuse req.user instead of fetching again.
 *   - Profile and dashboard responses are cached in-process (LRU).
 *   - Cache is invalidated on profile update and quiz attempt.
 */
const User       = require("../models/User");
const Course     = require("../models/Course");
const Quiz       = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const { profileCache, dashboardCache, coursesCache, TTL, invalidateUser } = require("../utils/cache");

// ── Helpers ────────────────────────────────────────────────────────────────

function userPublicJson(user) {
  return {
    id:             user._id,
    name:           user.name,
    email:          user.email,
    role:           user.role,
    phone:          user.phone,
    course:         user.course,
    enrolledCourses: user.enrolledCourses || [],
    lastActiveAt:   user.lastActiveAt,
    createdAt:      user.createdAt,
    updatedAt:      user.updatedAt,
  };
}

function stripQuizForClient(quizDoc) {
  const o = quizDoc.toObject ? quizDoc.toObject() : quizDoc;
  return {
    id:              o._id,
    courseId:        o.courseId,
    title:           o.title,
    weekNumber:      o.weekNumber,
    kind:            o.kind,
    timeLimitMinutes: o.timeLimitMinutes,
    questions: (o.questions || []).map((q) => ({
      id:      q._id,
      text:    q.text,
      options: q.options,
    })),
  };
}

// ── GET /api/student/dashboard ─────────────────────────────────────────────
async function getDashboard(req, res) {
  const userId = String(req.user._id);

  // ── Cache hit ──────────────────────────────────────────────────────────
  const cached = dashboardCache.get(userId);
  if (cached) {
    // eslint-disable-next-line no-console
    console.log(`[Cache] HIT  dashboard for ${userId}`);
    return res.json({ ...cached, _cached: true });
  }

  // eslint-disable-next-line no-console
  console.log(`[Cache] MISS dashboard for ${userId} — querying MongoDB`);

  try {
    // Reuse req.user (already fetched by authMiddleware) but populate courses
    const user = await User.findById(userId)
      .populate("enrolledCourses", "title slug description")
      .select("-password")
      .lean();

    // Run quiz queries in parallel — not sequentially
    const [attemptCount, allAttempts, recent] = await Promise.all([
      QuizAttempt.countDocuments({ userId }),
      QuizAttempt.find({ userId }).lean(),
      QuizAttempt.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("quizId", "title weekNumber")
        .populate("courseId", "title")
        .lean(),
    ]);

    let avgScorePct = null;
    if (allAttempts.length) {
      const sumPct = allAttempts.reduce(
        (s, a) => s + (a.maxScore ? (a.score / a.maxScore) * 100 : 0),
        0
      );
      avgScorePct = Math.round((sumPct / allAttempts.length) * 10) / 10;
    }

    const payload = {
      message: "Student dashboard",
      student: userPublicJson(user),
      stats: {
        enrolledCount: user.enrolledCourses?.length || 0,
        quizAttempts:  attemptCount,
        avgScorePct,
      },
      recentAttempts: recent.map((r) => ({
        id:          r._id,
        score:       r.score,
        maxScore:    r.maxScore,
        durationMs:  r.durationMs,
        createdAt:   r.createdAt,
        quizTitle:   r.quizId?.title,
        courseTitle: r.courseId?.title,
      })),
    };

    // ── Store in cache ───────────────────────────────────────────────────
    dashboardCache.set(userId, payload, TTL.DASHBOARD);

    return res.json(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[getDashboard]", err);
    return res.status(500).json({ message: "Could not load dashboard." });
  }
}

// ── GET /api/student/profile ───────────────────────────────────────────────
async function getProfile(req, res) {
  const userId = String(req.user._id);

  // ── Cache hit ──────────────────────────────────────────────────────────
  const cached = profileCache.get(userId);
  if (cached) {
    // eslint-disable-next-line no-console
    console.log(`[Cache] HIT  profile for ${userId}`);
    return res.json({ profile: cached, _cached: true });
  }

  // eslint-disable-next-line no-console
  console.log(`[Cache] MISS profile for ${userId} — querying MongoDB`);

  try {
    const user = await User.findById(userId)
      .populate("enrolledCourses", "title")
      .select("-password")
      .lean();

    const profile = userPublicJson(user);
    profileCache.set(userId, profile, TTL.PROFILE);

    return res.json({ profile });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[getProfile]", err);
    return res.status(500).json({ message: "Could not load profile." });
  }
}

// ── PUT /api/student/profile ───────────────────────────────────────────────
async function updateProfile(req, res) {
  try {
    const { name, phone, course } = req.body;
    const updates = {};
    if (name   !== undefined) updates.name   = String(name).trim();
    if (phone  !== undefined) updates.phone  = String(phone).trim();
    if (course !== undefined) updates.course = String(course).trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update (name, phone, course)." });
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    // ── Invalidate cache so next request gets fresh data ─────────────────
    invalidateUser(req.user._id);

    return res.json({ message: "Profile updated successfully.", profile: userPublicJson(updated) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[updateProfile]", err);
    return res.status(500).json({ message: "Could not update profile." });
  }
}

// ── GET /api/student/courses ───────────────────────────────────────────────
async function listCourses(req, res) {
  const userId = String(req.user._id);

  const cached = coursesCache.get(userId);
  if (cached) {
    // eslint-disable-next-line no-console
    console.log(`[Cache] HIT  courses for ${userId}`);
    return res.json({ courses: cached, _cached: true });
  }

  try {
    // req.user already has enrolledCourses as ObjectId array
    const ids = req.user.enrolledCourses || [];
    const courses = await Course.find({ _id: { $in: ids }, isPublished: true })
      .select("title slug description modules quizIds createdAt")
      .lean();

    // Count quizzes per course in parallel
    const withMeta = await Promise.all(
      courses.map(async (c) => {
        const quizCount = await Quiz.countDocuments({ courseId: c._id });
        return { ...c, quizCount };
      })
    );

    coursesCache.set(userId, withMeta, TTL.COURSES);
    return res.json({ courses: withMeta });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[listCourses]", err);
    return res.status(500).json({ message: "Could not load courses." });
  }
}

// ── GET /api/student/courses/:courseId ─────────────────────────────────────
async function getCourse(req, res) {
  try {
    const cid = req.params.courseId;
    const enrolledIds = (req.user.enrolledCourses || []).map(String);

    if (!enrolledIds.includes(String(cid))) {
      return res.status(403).json({ message: "You are not enrolled in this course." });
    }

    const [course, quizzes, attempts] = await Promise.all([
      Course.findById(cid).lean(),
      Quiz.find({ courseId: cid })
        .select("title weekNumber kind timeLimitMinutes createdAt")
        .sort({ weekNumber: 1 })
        .lean(),
      QuizAttempt.find({ userId: req.user._id, courseId: cid }).lean(),
    ]);

    if (!course || !course.isPublished) {
      return res.status(404).json({ message: "Course not found." });
    }

    const bestByQuiz = {};
    attempts.forEach((a) => {
      const key = String(a.quizId);
      const pct = a.maxScore ? (a.score / a.maxScore) * 100 : 0;
      if (!bestByQuiz[key] || pct > bestByQuiz[key].pct) {
        bestByQuiz[key] = { pct, score: a.score, maxScore: a.maxScore, at: a.createdAt };
      }
    });

    return res.json({
      course,
      quizzes: quizzes.map((q) => ({ ...q, bestAttempt: bestByQuiz[String(q._id)] || null })),
    });
  } catch (err) {
    return res.status(400).json({ message: "Invalid course." });
  }
}

// ── GET /api/student/quizzes/:quizId ──────────────────────────────────────
async function getQuizForAttempt(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });

    const enrolledIds = (req.user.enrolledCourses || []).map(String);
    if (!enrolledIds.includes(String(quiz.courseId))) {
      return res.status(403).json({ message: "Not enrolled in this course." });
    }

    return res.json({ quiz: stripQuizForClient(quiz) });
  } catch (err) {
    return res.status(400).json({ message: "Invalid quiz." });
  }
}

// ── POST /api/student/quiz/attempt ────────────────────────────────────────
async function submitQuizAttempt(req, res) {
  try {
    const { quizId, answers, durationMs } = req.body;
    if (!quizId || !Array.isArray(answers)) {
      return res.status(400).json({ message: "quizId and answers[] are required." });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });

    const enrolledIds = (req.user.enrolledCourses || []).map(String);
    if (!enrolledIds.includes(String(quiz.courseId))) {
      return res.status(403).json({ message: "Not enrolled in this course." });
    }

    const qs = quiz.questions || [];
    let score = 0;
    qs.forEach((q, i) => {
      if (Number(answers[i]) === Number(q.correctAnswer)) score += 1;
    });
    const maxScore = qs.length;

    const [prev, attempt] = await Promise.all([
      QuizAttempt.countDocuments({ userId: req.user._id, quizId: quiz._id }),
      QuizAttempt.create({
        userId:        req.user._id,
        quizId:        quiz._id,
        courseId:      quiz.courseId,
        score,
        maxScore,
        answers:       answers.map((a) => Number(a)),
        durationMs:    Number(durationMs) || 0,
        attemptNumber: 0, // will be corrected below
      }),
    ]);

    // Fix attemptNumber (race-safe enough for a learning app)
    await QuizAttempt.findByIdAndUpdate(attempt._id, { attemptNumber: prev + 1 });
    await User.findByIdAndUpdate(req.user._id, { lastActiveAt: new Date() });

    // ── Invalidate dashboard cache — stats changed ───────────────────────
    invalidateUser(req.user._id);

    return res.status(201).json({
      message: "Attempt recorded.",
      attempt: {
        id:            attempt._id,
        score:         attempt.score,
        maxScore:      attempt.maxScore,
        percent:       maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0,
        durationMs:    attempt.durationMs,
        attemptNumber: prev + 1,
        createdAt:     attempt.createdAt,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[submitQuizAttempt]", err);
    return res.status(500).json({ message: "Could not save attempt." });
  }
}

module.exports = {
  getDashboard,
  listCourses,
  getCourse,
  getQuizForAttempt,
  submitQuizAttempt,
  getProfile,
  updateProfile,
};
