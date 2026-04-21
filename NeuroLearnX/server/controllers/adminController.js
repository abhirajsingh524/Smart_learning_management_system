/**
 * Admin-only endpoints: dashboard stats, list/search students, CRUD, analytics.
 */
const User = require("../models/User");
const QuizAttempt = require("../models/QuizAttempt");
const Course = require("../models/Course");
const { fetchPythonAnalytics } = require("../services/pythonAnalytics");

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

/** GET /api/admin/dashboard */
async function getDashboard(req, res) {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    return res.json({
      message: "Admin dashboard",
      admin: userPublicJson(req.user),
      stats: { totalStudents },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Could not load dashboard." });
  }
}

/** GET /api/admin/students — optional ?q= or ?search= to filter by name/email */
async function listStudents(req, res) {
  try {
    const raw = (req.query.q || req.query.search || "").trim();
    const query = { role: "student" };

    if (raw) {
      const safe = escapeRegex(raw);
      query.$or = [{ name: new RegExp(safe, "i") }, { email: new RegExp(safe, "i") }];
    }

    const students = await User.find(query)
      .select("-password")
      .populate("enrolledCourses", "title slug")
      .sort({ createdAt: -1 });
    return res.json({ students: students.map(userPublicJson) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Could not load students." });
  }
}

/** GET /api/admin/students/:id */
async function getStudentById(req, res) {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "student" })
      .select("-password")
      .populate("enrolledCourses", "title slug");
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }
    return res.json({ student: userPublicJson(student) });
  } catch (err) {
    return res.status(400).json({ message: "Invalid student id." });
  }
}

/** PUT /api/admin/students/:id */
async function updateStudent(req, res) {
  try {
    const { name, email, phone, course, enrolledCourses } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (email !== undefined) {
      const nextEmail = String(email).toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      const taken = await User.findOne({
        email: nextEmail,
        _id: { $ne: req.params.id },
      });
      if (taken) {
        return res.status(409).json({ message: "Another user already uses this email." });
      }
      updates.email = nextEmail;
    }
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (course !== undefined) updates.course = String(course).trim();
    if (Array.isArray(enrolledCourses)) {
      updates.enrolledCourses = enrolledCourses;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    const updated = await User.findOneAndUpdate({ _id: req.params.id, role: "student" }, updates, {
      new: true,
      runValidators: true,
    })
      .select("-password")
      .populate("enrolledCourses", "title slug");

    if (!updated) {
      return res.status(404).json({ message: "Student not found." });
    }

    return res.json({ message: "Student updated successfully.", student: userPublicJson(updated) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Could not update student." });
  }
}

/** DELETE /api/admin/students/:id */
async function deleteStudent(req, res) {
  try {
    const deleted = await User.findOneAndDelete({ _id: req.params.id, role: "student" });
    if (!deleted) {
      return res.status(404).json({ message: "Student not found." });
    }
    return res.json({ message: "Student deleted successfully." });
  } catch (err) {
    return res.status(400).json({ message: "Invalid student id." });
  }
}

/** GET /api/admin/analytics — aggregates + optional Python service enrichment */
async function getAnalytics(req, res) {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({
      role: "student",
      lastActiveAt: { $gte: sevenDaysAgo },
    });

    const attempts = await QuizAttempt.find().lean();
    const totalAttempts = attempts.length;
    let avgQuizScorePct = 0;
    if (totalAttempts) {
      const sum = attempts.reduce(
        (s, a) => s + (a.maxScore ? (a.score / a.maxScore) * 100 : 0),
        0
      );
      avgQuizScorePct = Math.round((sum / totalAttempts) * 10) / 10;
    }

    const courseTitles = await Course.find().select("title").lean();
    const perCourse = await Promise.all(
      courseTitles.map(async (c) => {
        const atts = await QuizAttempt.find({ courseId: c._id }).lean();
        let avg = 0;
        if (atts.length) {
          const sm = atts.reduce(
            (s, a) => s + (a.maxScore ? (a.score / a.maxScore) * 100 : 0),
            0
          );
          avg = Math.round((sm / atts.length) * 10) / 10;
        }
        return { courseId: c._id, title: c.title, attempts: atts.length, avgScorePct: avg };
      })
    );

    const payload = {
      overview: {
        totalStudents,
        activeUsersLast7Days: activeUsers,
        totalQuizAttempts: totalAttempts,
        avgQuizScorePct,
      },
      coursePerformance: perCourse,
      generatedAt: new Date().toISOString(),
    };

    const py = await fetchPythonAnalytics();
    if (py) {
      payload.pythonService = py;
    }

    return res.json(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Could not load analytics." });
  }
}

module.exports = {
  getDashboard,
  listStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getAnalytics,
};
