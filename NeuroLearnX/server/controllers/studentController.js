/**
 * Student LMS: dashboard, courses, quizzes, profile.
 */
const User = require("../models/User");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");

function userPublicJson(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    course: user.course,
    enrolledCourses: user.enrolledCourses || [],
    lastActiveAt: user.lastActiveAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function stripQuizForClient(quizDoc) {
  const o = quizDoc.toObject ? quizDoc.toObject() : quizDoc;
  const questions = (o.questions || []).map((q) => ({
    id: q._id,
    text: q.text,
    options: q.options,
  }));
  return {
    id: o._id,
    courseId: o.courseId,
    title: o.title,
    weekNumber: o.weekNumber,
    kind: o.kind,
    timeLimitMinutes: o.timeLimitMinutes,
    questions,
  };
}

/** GET /api/student/dashboard */
async function getDashboard(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .populate("enrolledCourses", "title slug description")
      .select("-password");

    const attemptCount = await QuizAttempt.countDocuments({ userId: user._id });
    const allAttempts = await QuizAttempt.find({ userId: user._id }).lean();
    let avgScorePct = null;
    if (allAttempts.length) {
      const sumPct = allAttempts.reduce(
        (s, a) => s + (a.maxScore ? (a.score / a.maxScore) * 100 : 0),
        0
      );
      avgScorePct = Math.round((sumPct / allAttempts.length) * 10) / 10;
    }

    const recent = await QuizAttempt.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("quizId", "title weekNumber")
      .populate("courseId", "title")
      .lean();

    return res.json({
      message: "Student dashboard",
      student: userPublicJson(user),
      stats: {
        enrolledCount: user.enrolledCourses?.length || 0,
        quizAttempts: attemptCount,
        avgScorePct,
      },
      recentAttempts: recent.map((r) => ({
        id: r._id,
        score: r.score,
        maxScore: r.maxScore,
        durationMs: r.durationMs,
        createdAt: r.createdAt,
        quizTitle: r.quizId?.title,
        courseTitle: r.courseId?.title,
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Could not load dashboard." });
  }
}

/** GET /api/student/courses */
async function listCourses(req, res) {
  try {
    const user = await User.findById(req.user._id).select("enrolledCourses");
    const ids = user.enrolledCourses || [];
    const courses = await Course.find({ _id: { $in: ids }, isPublished: true })
      .select("title slug description modules quizIds createdAt")
      .lean();

    const withMeta = await Promise.all(
      courses.map(async (c) => {
        const quizCount = await Quiz.countDocuments({ courseId: c._id });
        return { ...c, quizCount };
      })
    );

    return res.json({ courses: withMeta });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Could not load courses." });
  }
}

/** GET /api/student/courses/:courseId */
async function getCourse(req, res) {
  try {
    const user = await User.findById(req.user._id).select("enrolledCourses");
    const cid = req.params.courseId;
    if (!user.enrolledCourses?.some((id) => String(id) === String(cid))) {
      return res.status(403).json({ message: "You are not enrolled in this course." });
    }

    const course = await Course.findById(cid).lean();
    if (!course || !course.isPublished) {
      return res.status(404).json({ message: "Course not found." });
    }

    const quizzes = await Quiz.find({ courseId: cid })
      .select("title weekNumber kind timeLimitMinutes createdAt")
      .sort({ weekNumber: 1 })
      .lean();

    const attempts = await QuizAttempt.find({ userId: user._id, courseId: cid }).lean();
    const bestByQuiz = {};
    attempts.forEach((a) => {
      const key = String(a.quizId);
      const pct = a.maxScore ? (a.score / a.maxScore) * 100 : 0;
      if (!bestByQuiz[key] || pct > bestByQuiz[key].pct) {
        bestByQuiz[key] = { pct, score: a.score, maxScore: a.maxScore, at: a.createdAt };
      }
    });

    const quizzesOut = quizzes.map((q) => ({
      ...q,
      bestAttempt: bestByQuiz[String(q._id)] || null,
    }));

    return res.json({ course, quizzes: quizzesOut });
  } catch (err) {
    return res.status(400).json({ message: "Invalid course." });
  }
}

/** GET /api/student/quizzes/:quizId — questions only (no correct answers) */
async function getQuizForAttempt(req, res) {
  try {
    const user = await User.findById(req.user._id).select("enrolledCourses");
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });

    const cid = String(quiz.courseId);
    if (!user.enrolledCourses?.some((id) => String(id) === cid)) {
      return res.status(403).json({ message: "Not enrolled in this course." });
    }

    return res.json({ quiz: stripQuizForClient(quiz) });
  } catch (err) {
    return res.status(400).json({ message: "Invalid quiz." });
  }
}

/** POST /api/student/quiz/attempt */
async function submitQuizAttempt(req, res) {
  try {
    const { quizId, answers, durationMs } = req.body;
    if (!quizId || !Array.isArray(answers)) {
      return res.status(400).json({ message: "quizId and answers[] are required." });
    }

    const user = await User.findById(req.user._id).select("enrolledCourses");
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });

    const cid = String(quiz.courseId);
    if (!user.enrolledCourses?.some((id) => String(id) === cid)) {
      return res.status(403).json({ message: "Not enrolled in this course." });
    }

    const qs = quiz.questions || [];
    let score = 0;
    qs.forEach((q, i) => {
      if (Number(answers[i]) === Number(q.correctAnswer)) score += 1;
    });
    const maxScore = qs.length;

    const prev = await QuizAttempt.countDocuments({ userId: user._id, quizId: quiz._id });
    const attempt = await QuizAttempt.create({
      userId: user._id,
      quizId: quiz._id,
      courseId: quiz.courseId,
      score,
      maxScore,
      answers: answers.map((a) => Number(a)),
      durationMs: Number(durationMs) || 0,
      attemptNumber: prev + 1,
    });

    await User.findByIdAndUpdate(user._id, { lastActiveAt: new Date() });

    return res.status(201).json({
      message: "Attempt recorded.",
      attempt: {
        id: attempt._id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percent: maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0,
        durationMs: attempt.durationMs,
        attemptNumber: attempt.attemptNumber,
        createdAt: attempt.createdAt,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Could not save attempt." });
  }
}

/** GET /api/student/profile */
async function getProfile(req, res) {
  const user = await User.findById(req.user._id).populate("enrolledCourses", "title").select("-password");
  return res.json({ profile: userPublicJson(user) });
}

/** PUT /api/student/profile */
async function updateProfile(req, res) {
  try {
    const { name, phone, course } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (course !== undefined) updates.course = String(course).trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update (name, phone, course)." });
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.json({ message: "Profile updated successfully.", profile: userPublicJson(updated) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Could not update profile." });
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
