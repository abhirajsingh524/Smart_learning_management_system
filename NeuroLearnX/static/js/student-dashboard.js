/**
 * Student dashboard — fetches all data from MongoDB via JWT-protected APIs.
 * Seed credentials: student@neuroxlearn.com / Student@123
 */
(function () {
  // ── Auth guard ────────────────────────────────────────────────────────
  if (!window.NLXAuth || !window.NLXAuth.guardPage("student", "/student/login")) return;

  var user    = window.NLXAuth.getUser();
  var titleEl = document.getElementById("studentWelcomeTitle");
  var subEl   = document.getElementById("studentSubtitle");
  var banner  = document.getElementById("studentDashBanner");

  function showBanner(msg, isError) {
    if (!banner) return;
    banner.textContent = msg || "";
    banner.style.display = msg ? "block" : "none";
    banner.style.color = isError ? "var(--danger)" : "var(--success, #10b981)";
  }

  // Set name immediately from localStorage (before API responds)
  if (titleEl && user && user.name) {
    titleEl.textContent = "Welcome back, " + user.name + " 👋";
  }

  // ── System status check ───────────────────────────────────────────────
  (async function checkStatus() {
    var dot   = document.getElementById("sysStatusDot");
    var txt   = document.getElementById("sysStatusText");
    var mongo = document.getElementById("sysMongoStatus");
    var auth  = document.getElementById("sysAuthStatus");

    async function poll(attempt) {
      try {
        var r = await fetch("/api/health");
        var d = await r.json();

        // Handle both Node.js format (mongoReadyState) and Flask format (mongo: bool)
        var mongoOk = (d.mongoReadyState === 1) || (d.mongo === true);
        var isConnecting = d.mongoReadyState === 2;

        if (dot)   dot.className   = "status-dot " + (mongoOk ? "status-ok" : (isConnecting ? "status-checking" : "status-warn"));
        if (txt)   txt.textContent = mongoOk
          ? "System OK — MongoDB connected"
          : (isConnecting ? "MongoDB connecting… retrying" : "MongoDB not connected (auth/data APIs unavailable)");
        if (mongo) {
          mongo.textContent = "MongoDB: " + (mongoOk ? "✅ Connected" : (isConnecting ? "⏳ Connecting" : "❌ Disconnected"));
          mongo.className   = "status-chip " + (mongoOk ? "chip-ok" : "chip-err");
        }
        if (auth)  { auth.textContent = "Auth: ✅ JWT active"; auth.className = "status-chip chip-ok"; }

        // If still connecting, retry after 2s (up to 5 times)
        if (!mongoOk && attempt < 5) {
          setTimeout(function() { poll(attempt + 1); }, 2000);
        }
      } catch (e) {
        if (dot) dot.className = "status-dot status-err";
        if (txt) txt.textContent = "Cannot reach server";
        if (attempt < 3) setTimeout(function() { poll(attempt + 1); }, 3000);
      }
    }
    poll(0);
  })();

  // ── Profile ───────────────────────────────────────────────────────────
  var profileForm = document.getElementById("studentProfileForm");
  var profileMsg  = document.getElementById("studentProfileMsg");

  // Populate profile form from any user data object (avoids separate API call)
  function populateProfileForm(p) {
    if (!p || !profileForm) return;
    if (profileForm.elements.name)   profileForm.elements.name.value   = p.name   || "";
    if (profileForm.elements.email)  profileForm.elements.email.value  = p.email  || "";
    if (profileForm.elements.phone)  profileForm.elements.phone.value  = p.phone  || "";
    if (profileForm.elements.course) profileForm.elements.course.value = p.course || "";
  }

  // Pre-populate from localStorage immediately (zero latency)
  if (user) populateProfileForm(user);

  if (profileForm) {
    profileForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (profileMsg) { profileMsg.style.display = "none"; }
      var fd = new FormData(profileForm);
      var body = {
        name:   (fd.get("name")   || "").toString().trim(),
        phone:  (fd.get("phone")  || "").toString().trim(),
        course: (fd.get("course") || "").toString().trim(),
      };
      try {
        var r = await fetch("/api/student/profile", {
          method: "PUT", headers: window.NLXAuth.authHeaders(), credentials: "include",
          body: JSON.stringify(body),
        });
        var d = await r.json();
        if (!r.ok) {
          if (profileMsg) { profileMsg.textContent = d.message || "Update failed."; profileMsg.style.display = "block"; profileMsg.style.color = "var(--danger)"; }
          return;
        }
        if (d.profile) window.NLXAuth.setSession(window.NLXAuth.getToken(), d.profile);
        if (titleEl && d.profile && d.profile.name) titleEl.textContent = "Welcome back, " + d.profile.name + " 👋";
        if (profileMsg) { profileMsg.textContent = "✅ Profile saved to MongoDB."; profileMsg.style.display = "block"; profileMsg.style.color = "var(--success, #10b981)"; }
      } catch (err) {
        if (profileMsg) { profileMsg.textContent = "Network error."; profileMsg.style.display = "block"; profileMsg.style.color = "var(--danger)"; }
      }
    });
  }

  // ── Dashboard stats + enrolled courses from MongoDB ───────────────────
  async function loadDashboard(retryCount) {
    retryCount = retryCount || 0;
    try {
      var r = await fetch("/api/student/dashboard", { headers: window.NLXAuth.authHeaders(), credentials: "include" });
      var d = await r.json();

      // DB still starting up → retry
      if (r.status === 503 && retryCount < 6) {
        showBanner("⏳ Database starting… retrying (" + (retryCount + 1) + "/6)", false);
        setTimeout(function() { loadDashboard(retryCount + 1); }, 2000);
        return;
      }

      // "User not found" on first few attempts = DB race condition → retry
      if (r.status === 401 && d.message && d.message.toLowerCase().includes("not found") && retryCount < 4) {
        showBanner("⏳ Connecting to database… retrying (" + (retryCount + 1) + "/4)", false);
        setTimeout(function() { loadDashboard(retryCount + 1); }, 2000);
        return;
      }

      if (!r.ok) { showBanner(d.message || "Could not load dashboard.", true); return; }
      showBanner("");

      var st = d.student || {};
      if (st.name && titleEl) titleEl.textContent = "Welcome back, " + st.name + " 👋";
      if (subEl) subEl.textContent = "Logged in as " + (st.email || "") + " · Role: student · Data from MongoDB";

      // Populate profile form from dashboard data — no separate /profile call needed
      populateProfileForm(st);

      // Update localStorage with fresh server data
      if (st.name) window.NLXAuth.setSession(null, st);

      var stats = d.stats || {};
      var elE = document.getElementById("stuStatEnrolled");
      var elA = document.getElementById("stuStatAttempts");
      var elAvg = document.getElementById("stuStatAvg");
      var elAct = document.getElementById("stuStatActivity");
      if (elE)   elE.textContent   = stats.enrolledCount  != null ? String(stats.enrolledCount)  : "0";
      if (elA)   elA.textContent   = stats.quizAttempts   != null ? String(stats.quizAttempts)   : "0";
      if (elAvg) elAvg.textContent = stats.avgScorePct    != null ? stats.avgScorePct + "%" : "—";
      if (elAct) elAct.textContent = st.lastActiveAt ? new Date(st.lastActiveAt).toLocaleString() : "—";

      // Enrolled courses
      var coursesList = document.getElementById("enrolledCoursesList");
      var coursesCount = document.getElementById("enrolledCoursesCount");
      var enrolled = st.enrolledCourses || [];
      if (coursesCount) coursesCount.textContent = "(" + enrolled.length + " from MongoDB)";
      if (coursesList) {
        if (enrolled.length) {
          coursesList.innerHTML = enrolled.map(function (c) {
            return '<div class="enrolled-course-card">' +
              '<div class="ec-title">📘 ' + (c.title || c.slug || String(c)) + '</div>' +
              '<a href="/lms/student/courses" class="btn btn-primary btn-sm" style="margin-top:8px">Open in LMS →</a>' +
              '</div>';
          }).join("");
        } else {
          coursesList.innerHTML = '<div class="small-hint">No courses enrolled yet. <a href="/courses" style="color:var(--primary)">Browse courses →</a></div>';
        }
      }

      // Recent quiz attempts
      var recentEl = document.getElementById("recentQuizList");
      if (recentEl) {
        if (d.recentAttempts && d.recentAttempts.length) {
          recentEl.innerHTML = d.recentAttempts.map(function (a) {
            return '<div class="flex justify-between" style="margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:8px">' +
              '<span>' + (a.quizTitle || "Quiz") + '</span>' +
              '<span style="color:var(--muted)">' +
              (a.score != null && a.maxScore != null ? a.score + "/" + a.maxScore : "") +
              " · " + new Date(a.createdAt).toLocaleString() + '</span></div>';
          }).join("");
        } else {
          recentEl.textContent = "No quiz attempts yet. Open Courses in NeuroX LMS to take weekly tests.";
        }
      }
    } catch (e) { showBanner("Network error loading dashboard.", true); }
  }

  // ── Logout ────────────────────────────────────────────────────────────
  var logoutBtn = document.getElementById("studentLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      await window.NLXAuth.logout();
      window.location.href = "/student/login";
    });
  }

  // ── Charts ────────────────────────────────────────────────────────────
  var FALLBACK_MODULES   = [
    { title: "Python & Math Foundations", topics: 6, done: 6, color: "#00D4AA" },
    { title: "Classical ML Algorithms",   topics: 8, done: 7, color: "#6C63FF" },
    { title: "Deep Learning & CNNs",      topics: 10, done: 5, color: "#F59E0B" },
    { title: "NLP & Transformers",        topics: 9, done: 2, color: "#EC4899" },
    { title: "MLOps & Deployment",        topics: 7, done: 0, color: "#64748B" },
  ];

  function buildCharts(weeks, scores, radarLabels, radarValues) {
    var pc = document.getElementById("progressChart");
    var rc = document.getElementById("radarChart");
    if (pc) new Chart(pc, {
      type: "line",
      data: { labels: weeks, datasets: [{ data: scores, borderColor: "#6C63FF", borderWidth: 2.5, pointBackgroundColor: "#6C63FF", pointRadius: 3, fill: false, tension: 0.4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { grid: { color: "rgba(108,99,255,0.1)" }, ticks: { color: "#94A3B8", font: { size: 11 } } },
                  y: { min: 30, max: 100, grid: { color: "rgba(108,99,255,0.1)" }, ticks: { color: "#94A3B8", font: { size: 11 } } } } }
    });
    if (rc) new Chart(rc, {
      type: "radar",
      data: { labels: radarLabels, datasets: [{ data: radarValues, borderColor: "#00D4AA", backgroundColor: "rgba(0,212,170,0.2)", borderWidth: 2, pointBackgroundColor: "#00D4AA" }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { r: { grid: { color: "rgba(108,99,255,0.15)" }, ticks: { display: false }, pointLabels: { color: "#94A3B8", font: { size: 11 } } } } }
    });
  }

  function renderModules(modules) {
    var list = document.getElementById("moduleList");
    if (!list) return;
    list.innerHTML = "";
    modules.forEach(function (m) {
      var pct = Math.round((m.done / m.topics) * 100);
      list.innerHTML += '<div><div class="flex justify-between mb-4"><span style="font-size:13px">' + m.title +
        '</span><span style="font-size:12px;color:var(--muted)">' + m.done + "/" + m.topics + ' topics</span></div>' +
        '<div class="progress-wrap"><div class="progress-fill" style="width:' + pct + '%;background:' + m.color + '"></div></div></div>';
    });
  }

  (async function initCharts() {
    var weeks = ["W1","W2","W3","W4","W5","W6","W7"];
    var scores = [42,55,61,70,74,83,88];
    var radarLabels = ["Math","Coding","Theory","NLP","CV","MLOps"];
    var radarValues = [85,78,65,45,72,30];
    var modules = FALLBACK_MODULES;
    try {
      var r = await fetch("/api/dashboard");
      if (r.ok) {
        var d = await r.json();
        if (d.progress && d.progress.length) { weeks = d.progress.map(function(p){return p.week;}); scores = d.progress.map(function(p){return p.score;}); }
        if (d.skills  && d.skills.length)   { radarLabels = d.skills.map(function(s){return s.skill;}); radarValues = d.skills.map(function(s){return s.val;}); }
        if (d.modules  && d.modules.length)  modules = d.modules;
      }
    } catch (_) {}
    buildCharts(weeks, scores, radarLabels, radarValues);
    renderModules(modules);
  })();

  // ── Wait for MongoDB to be ready, then load all data ─────────────────
  async function waitForMongo(maxAttempts) {
    maxAttempts = maxAttempts || 10;
    for (var i = 0; i < maxAttempts; i++) {
      try {
        var r = await fetch("/api/health");
        var d = await r.json();
        var ok = (d.mongoReadyState === 1) || (d.mongo === true);
        if (ok) return true;
      } catch (_) {}
      await new Promise(function(res) { setTimeout(res, 1500); });
    }
    return false;
  }

  // ── Init — wait for DB then load everything ───────────────────────────
  (async function init() {
    var mongoReady = await waitForMongo(10);
    if (!mongoReady) {
      showBanner("⚠️ Could not connect to database. Please refresh the page.", true);
    }
    // Single API call: dashboard returns profile + stats + courses
    loadDashboard();
  })();
})();
