/**
 * Authentication: student register, student login, admin login, logout, current user.
 * JWT payload shape: { userId, email, role } — expires in 1 day by default.
 */
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Course = require("../models/Course");

/** Basic email check (intentionally simple for learning projects). */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  return jwt.sign(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
}

/** Optional HTTP-only cookie (browser clients can still use localStorage from JSON). */
function setAuthCookie(res, token) {
  const cookieName = process.env.COOKIE_NAME || "token";
  const secure = String(process.env.COOKIE_SECURE || "false") === "true";
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 24 * 60 * 60 * 1000, // 1 day (matches default JWT expiry)
  });
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

async function touchActivity(userId) {
  await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });
}

/** POST /api/auth/login — unified login (student or admin) */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const ok = await user.comparePassword(String(password));
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    await touchActivity(user._id);

    const token = signToken(user);
    setAuthCookie(res, token);

    const fresh = await User.findById(user._id).populate("enrolledCourses", "title slug");

    return res.json({
      message: "Logged in successfully.",
      token,
      role: fresh.role,
      user: userPublicJson(fresh),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
}

/** POST /api/auth/student/register */
async function registerStudent(req, res) {
  try {
    const { name, email, password, phone, course } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ message: "This email is already registered." });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: String(password),
      role: "student",
      phone: phone ? String(phone).trim() : undefined,
      course: course ? String(course).trim() : undefined,
    });

    const openCourses = await Course.find({ isPublished: true }).select("_id").lean();
    if (openCourses.length) {
      await User.findByIdAndUpdate(user._id, {
        $set: { enrolledCourses: openCourses.map((c) => c._id) },
      });
    }

    await touchActivity(user._id);

    const token = signToken(user);
    setAuthCookie(res, token);

    const fresh = await User.findById(user._id).populate("enrolledCourses", "title slug");

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      role: fresh.role,
      user: userPublicJson(fresh),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Registration failed. Please try again." });
  }
}

/** POST /api/auth/student/login — only accounts with role `student` */
async function loginStudent(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (user.role !== "student") {
      return res.status(403).json({ message: "This login is for students only. Use the admin portal." });
    }

    const ok = await user.comparePassword(String(password));
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    await touchActivity(user._id);

    const token = signToken(user);
    setAuthCookie(res, token);

    const fresh = await User.findById(user._id).populate("enrolledCourses", "title slug");

    return res.json({
      message: "Logged in successfully.",
      token,
      user: userPublicJson(fresh),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
}

/** POST /api/auth/admin/login — only accounts with role `admin` */
async function loginAdmin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "This login is for administrators only." });
    }

    const ok = await user.comparePassword(String(password));
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    await touchActivity(user._id);

    const token = signToken(user);
    setAuthCookie(res, token);

    const fresh = await User.findById(user._id).populate("enrolledCourses", "title slug");

    return res.json({
      message: "Admin logged in successfully.",
      token,
      user: userPublicJson(fresh),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
}

/** GET /api/auth/me — requires valid JWT */
async function me(req, res) {
  const u = await User.findById(req.user._id).populate("enrolledCourses", "title slug").select("-password");
  return res.json({ user: userPublicJson(u) });
}

/** POST /api/auth/logout — clears cookie; client should clear localStorage too */
async function logout(req, res) {
  const cookieName = process.env.COOKIE_NAME || "token";
  res.clearCookie(cookieName);
  return res.json({ message: "Logged out successfully." });
}

module.exports = {
  registerStudent,
  login,
  loginStudent,
  loginAdmin,
  me,
  logout,
};
