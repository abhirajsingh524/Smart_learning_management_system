/**
 * Express application setup.
 *
 * Important: The frontend currently uses Flask-style Jinja templates in `templates/`.
 * We render them with Nunjucks so we can keep the HTML unchanged.
 */
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const nunjucks = require("nunjucks");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const publicRoutes = require("./routes/publicRoutes");
const aiRoutes = require("./routes/aiRoutes");

function createApp() {
  const app = express();

  // Basic middleware
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Static assets (do not modify frontend structure)
  const staticDir = path.join(process.cwd(), "static");
  app.use("/static", express.static(staticDir));

  // Make `request.path` and simple nav flags available to templates
  app.use((req, res, next) => {
    res.locals.request = { path: req.path };
    res.locals.navStudent =
      req.path.startsWith("/student") ||
      req.path.startsWith("/lms/student") ||
      req.path === "/login" ||
      req.path === "/login.html" ||
      req.path === "/student-dashboard.html";
    res.locals.navAdmin =
      req.path.startsWith("/admin") ||
      req.path.startsWith("/lms/admin") ||
      req.path === "/admin-dashboard.html";
    next();
  });

  // Template rendering (Nunjucks supports `{% extends %}` blocks)
  const templatesDir = path.join(process.cwd(), "templates");
  const env = nunjucks.configure(templatesDir, {
    autoescape: true,
    express: app,
    watch: process.env.NODE_ENV !== "production",
  });
  // Polyfill Flask's url_for('static', filename='...') for Nunjucks
  env.addGlobal("url_for", function (endpoint, kwargs) {
    if (endpoint === "static" && kwargs && kwargs.filename) {
      return "/static/" + kwargs.filename;
    }
    return "/" + endpoint;
  });
  app.set("view engine", "html");
  app.set("views", templatesDir);

  // Frontend pages (render existing templates)
  app.get("/", (req, res) => res.render("home.html"));
  app.get("/courses", (req, res) => res.render("courses.html"));
  app.get("/leaderboard", (req, res) => res.render("leaderboard.html"));
  app.get("/community", (req, res) => res.render("community.html"));
  app.get("/certifications", (req, res) => res.render("certifications.html"));
  app.get("/resources", (req, res) => res.render("resources.html"));
  app.get("/mentor", (req, res) => res.render("mentor.html"));
  app.get("/about", (req, res) => res.render("about.html"));
  app.get("/learning", (req, res) => res.render("learning.html"));
  app.get("/lab", (req, res) => res.render("lab.html"));
  app.get("/analytics", (req, res) => res.render("analytics.html"));
  app.get("/tutor", (req, res) => res.render("tutor.html"));
  app.get("/quiz", (req, res) => res.render("quiz.html"));
  app.get("/dashboard", (req, res) => res.render("dashboard.html"));

  // Auth pages (same UI theme; wired to /api/auth/*)
  app.get("/student/login", (req, res) => res.render("student-login.html"));
  app.get("/student/register", (req, res) => res.render("student-register.html"));
  app.get("/student/dashboard", (req, res) => res.render("student-dashboard.html"));
  app.get("/admin/login", (req, res) => res.render("admin-login.html"));
  app.get("/admin/dashboard", (req, res) => res.render("admin-dashboard.html"));

  /* ── NeuroX LMS (modern UI) ───────────────────────── */
  app.get("/login", (req, res) => res.render("lms_login.html"));

  // /lms — smart entry point: JS redirects based on role, or shows login
  app.get("/lms", (req, res) => res.render("lms_portal.html"));

  app.get("/lms/student/dashboard", (req, res) =>
    res.render("lms_stu_dashboard.html", { lmsPage: "dash" })
  );
  app.get("/lms/student/courses", (req, res) =>
    res.render("lms_stu_courses.html", { lmsPage: "courses" })
  );
  app.get("/lms/student/course/:courseId", (req, res) =>
    res.render("lms_stu_course.html", { lmsPage: "courses", courseId: req.params.courseId })
  );
  app.get("/lms/student/quiz/:quizId", (req, res) =>
    res.render("lms_stu_quiz.html", { lmsPage: "courses", quizId: req.params.quizId })
  );
  app.get("/lms/student/ai", (req, res) => res.render("lms_stu_ai.html", { lmsPage: "ai" }));
  app.get("/lms/admin/dashboard", (req, res) =>
    res.render("lms_adm_dashboard.html", { lmsPage: "dash" })
  );
  app.get("/lms/admin/students", (req, res) =>
    res.render("lms_adm_students.html", { lmsPage: "students" })
  );
  app.get("/lms/admin/analytics", (req, res) =>
    res.render("lms_adm_analytics.html", { lmsPage: "analytics" })
  );

  /** Friendly `.html` URLs (same templates as clean routes) */
  app.get("/student-dashboard.html", (req, res) => res.render("student-dashboard.html"));
  app.get("/admin-dashboard.html", (req, res) => res.render("admin-dashboard.html"));
  app.get("/login.html", (req, res) => res.redirect(302, "/login"));

  // Cache stats (dev only)
  app.get("/api/cache/stats", (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Not available in production." });
    }
    const { profileCache, dashboardCache, coursesCache } = require("./utils/cache");
    res.json({
      profile:   profileCache.stats(),
      dashboard: dashboardCache.stats(),
      courses:   coursesCache.stats(),
    });
  });

  // Health/status — waits for MongoDB to be ready before reporting
  app.get("/api/health", async (req, res) => {
    const mongoose = require("mongoose");
    let mongoOk = false;
    let mongoState = mongoose.connection.readyState;

    // If connecting (state 2), wait up to 8s for it to become ready
    if (mongoState === 2) {
      try {
        await new Promise((resolve, reject) => {
          const start = Date.now();
          const iv = setInterval(() => {
            const s = mongoose.connection.readyState;
            if (s === 1) { clearInterval(iv); resolve(); }
            else if (s !== 2 || Date.now() - start > 8000) { clearInterval(iv); reject(); }
          }, 200);
        });
        mongoState = mongoose.connection.readyState;
      } catch (_) { /* timed out */ }
    }

    if (mongoState === 1) {
      try {
        await mongoose.connection.db.admin().ping();
        mongoOk = true;
      } catch (_) {
        mongoOk = false;
        mongoState = 0;
      }
    }

    res.json({
      ok:              true,
      flask:           false,
      mongo:           mongoOk,
      mongoReadyState: mongoState,
      mongoStatus:     mongoOk ? "connected" : (mongoState === 2 ? "connecting" : "disconnected"),
    });
  });

  // API routes
  app.use("/api", publicRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/student", studentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/ai", aiRoutes);

  // 404 handler (API)
  app.use("/api", (req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || "Server error";
    if (process.env.NODE_ENV !== "production") {
      // Keep error shape predictable for beginners
      return res.status(status).json({
        message,
        stack: err.stack,
      });
    }
    return res.status(status).json({ message });
  });

  return app;
}

module.exports = createApp;

