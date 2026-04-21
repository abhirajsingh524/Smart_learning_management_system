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
  nunjucks.configure(templatesDir, {
    autoescape: true,
    express: app,
    watch: process.env.NODE_ENV !== "production",
  });
  app.set("view engine", "html");
  app.set("views", templatesDir);

  // Frontend pages (render existing templates)
  app.get("/", (req, res) => res.render("dashboard.html"));
  app.get("/learning", (req, res) => res.render("learning.html"));
  app.get("/lab", (req, res) => res.render("lab.html"));
  app.get("/analytics", (req, res) => res.render("analytics.html"));
  app.get("/tutor", (req, res) => res.render("tutor.html"));
  app.get("/quiz", (req, res) => res.render("quiz.html"));

  // Auth pages (same UI theme; wired to /api/auth/*)
  app.get("/student/login", (req, res) => res.render("student-login.html"));
  app.get("/student/register", (req, res) => res.render("student-register.html"));
  app.get("/student/dashboard", (req, res) => res.render("student-dashboard.html"));
  app.get("/admin/login", (req, res) => res.render("admin-login.html"));
  app.get("/admin/dashboard", (req, res) => res.render("admin-dashboard.html"));

  /* ── NeuroX LMS (modern UI) ───────────────────────── */
  app.get("/login", (req, res) => res.render("lms_login.html"));
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

  // Health/status (helps debug Mongo connection)
  app.get("/api/health", (req, res) => {
    // 1 = connected, 2 = connecting, 0 = disconnected, 3 = disconnecting
    const mongooseState = require("mongoose").connection.readyState;
    res.json({
      ok: true,
      mongoReadyState: mongooseState,
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

