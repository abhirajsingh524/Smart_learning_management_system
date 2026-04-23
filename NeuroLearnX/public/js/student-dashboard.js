/**
 * NeuroXLearn student dashboard: API stats + charts (public /api/dashboard) + profile.
 */
(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("student", "/login")) {
    return;
  }

  var user = window.NLXAuth.getUser();
  var titleEl = document.getElementById("studentWelcomeTitle");
  var banner = document.getElementById("studentDashBanner");

  function showBanner(msg) {
    if (!banner) return;
    if (msg) {
      banner.textContent = msg;
      banner.style.display = "block";
    } else {
      banner.textContent = "";
      banner.style.display = "none";
    }
  }

  if (titleEl && user && user.name) {
    titleEl.textContent = "Welcome back, " + user.name + " 👋";
  }

  var avatarEl = document.getElementById("navAvatar");
  if (avatarEl && user && user.name) {
    var parts = user.name.trim().split(/\s+/);
    var ini = (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
    avatarEl.textContent = ini.slice(0, 2);
  }

  var profileForm = document.getElementById("studentProfileForm");
  var profileMsg = document.getElementById("studentProfileMsg");

  async function loadProfile() {
    try {
      var res = await fetch("/api/student/profile", {
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) {
        showBanner(data.message || "Could not load profile.");
        return;
      }
      var p = data.profile;
      if (!p || !profileForm) return;
      if (profileForm.elements.name) profileForm.elements.name.value = p.name || "";
      if (profileForm.elements.email) profileForm.elements.email.value = p.email || "";
      if (profileForm.elements.phone) profileForm.elements.phone.value = p.phone || "";
      if (profileForm.elements.course) profileForm.elements.course.value = p.course || "";
    } catch (e) {
      showBanner("Network error loading profile.");
    }
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (profileMsg) {
        profileMsg.style.display = "none";
        profileMsg.textContent = "";
      }
      var fd = new FormData(profileForm);
      var body = {
        name: (fd.get("name") || "").toString().trim(),
        phone: (fd.get("phone") || "").toString().trim(),
        course: (fd.get("course") || "").toString().trim(),
      };
      try {
        var res = await fetch("/api/student/profile", {
          method: "PUT",
          headers: window.NLXAuth.authHeaders(),
          credentials: "include",
          body: JSON.stringify(body),
        });
        var data = await res.json();
        if (!res.ok) {
          if (profileMsg) {
            profileMsg.textContent = data.message || "Update failed.";
            profileMsg.style.display = "block";
            profileMsg.style.color = "var(--danger)";
          }
          return;
        }
        if (data.profile && window.NLXAuth.getToken()) {
          window.NLXAuth.setSession(window.NLXAuth.getToken(), data.profile);
        }
        if (titleEl && data.profile && data.profile.name) {
          titleEl.textContent = "Welcome back, " + data.profile.name + " 👋";
        }
        if (profileMsg) {
          profileMsg.textContent = "Profile saved.";
          profileMsg.style.display = "block";
          profileMsg.style.color = "var(--accent)";
        }
      } catch (err) {
        if (profileMsg) {
          profileMsg.textContent = "Network error.";
          profileMsg.style.display = "block";
          profileMsg.style.color = "var(--danger)";
        }
      }
    });
  }

  var logoutBtn = document.getElementById("studentLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      await window.NLXAuth.logout();
      window.location.href = "/login";
    });
  }

  async function loadStudentOverview() {
    try {
      var res = await fetch("/api/student/dashboard", {
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) {
        showBanner(data.message || "Could not load dashboard data.");
        return;
      }
      showBanner("");

      var st = data.student;
      if (st && st.name && titleEl) {
        titleEl.textContent = "Welcome back, " + st.name + " 👋";
      }

      var stats = data.stats || {};
      var elE = document.getElementById("stuStatEnrolled");
      var elA = document.getElementById("stuStatAttempts");
      var elAvg = document.getElementById("stuStatAvg");
      var elAct = document.getElementById("stuStatActivity");
      if (elE) elE.textContent = stats.enrolledCount != null ? String(stats.enrolledCount) : "0";
      if (elA) elA.textContent = stats.quizAttempts != null ? String(stats.quizAttempts) : "0";
      if (elAvg) {
        elAvg.textContent = stats.avgScorePct != null ? stats.avgScorePct + "%" : "—";
      }
      if (elAct) {
        if (st && st.lastActiveAt) {
          elAct.textContent = new Date(st.lastActiveAt).toLocaleString();
        } else {
          elAct.textContent = "—";
        }
      }

      var recentEl = document.getElementById("recentQuizList");
      if (recentEl) {
        if (data.recentAttempts && data.recentAttempts.length) {
          recentEl.innerHTML = data.recentAttempts
            .map(function (a) {
              return (
                "<div class='flex justify-between' style='margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:8px'>" +
                "<span>" +
                (a.quizTitle || "Quiz") +
                "</span><span style='color:var(--muted)'>" +
                (a.score != null && a.maxScore != null ? a.score + "/" + a.maxScore : "") +
                " · " +
                new Date(a.createdAt).toLocaleString() +
                "</span></div>"
              );
            })
            .join("");
        } else {
          recentEl.textContent = "No quiz attempts yet. Open Courses in NeuroX LMS to take weekly tests.";
        }
      }
    } catch (e) {
      showBanner("Network error while loading dashboard.");
    }
  }

  loadProfile();
  loadStudentOverview();

  var FALLBACK_MODULES = [
    { title: "Python & Math Foundations", topics: 6, done: 6, color: "#00D4AA" },
    { title: "Classical ML Algorithms", topics: 8, done: 7, color: "#6C63FF" },
    { title: "Deep Learning & CNNs", topics: 10, done: 5, color: "#F59E0B" },
    { title: "NLP & Transformers", topics: 9, done: 2, color: "#EC4899" },
    { title: "MLOps & Deployment", topics: 7, done: 0, color: "#64748B" },
  ];
  var FALLBACK_PROGRESS_DATA = [42, 55, 61, 70, 74, 83, 88];
  var FALLBACK_WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7"];
  var FALLBACK_RADAR = [85, 78, 65, 45, 72, 30];
  var FALLBACK_LABELS = ["Math", "Coding", "Theory", "NLP", "CV", "MLOps"];

  function buildProgressCharts(weeks, scores, radarLabels, radarValues) {
    new Chart(document.getElementById("progressChart"), {
      type: "line",
      data: {
        labels: weeks,
        datasets: [
          {
            data: scores,
            borderColor: "#6C63FF",
            borderWidth: 2.5,
            pointBackgroundColor: "#6C63FF",
            pointRadius: 3,
            fill: false,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: "rgba(108,99,255,0.1)" },
            ticks: { color: "#94A3B8", font: { size: 11 } },
          },
          y: {
            min: 30,
            max: 100,
            grid: { color: "rgba(108,99,255,0.1)" },
            ticks: { color: "#94A3B8", font: { size: 11 } },
          },
        },
      },
    });

    new Chart(document.getElementById("radarChart"), {
      type: "radar",
      data: {
        labels: radarLabels,
        datasets: [
          {
            data: radarValues,
            borderColor: "#00D4AA",
            backgroundColor: "rgba(0,212,170,0.2)",
            borderWidth: 2,
            pointBackgroundColor: "#00D4AA",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            grid: { color: "rgba(108,99,255,0.15)" },
            ticks: { display: false },
            pointLabels: { color: "#94A3B8", font: { size: 11 } },
          },
        },
      },
    });
  }

  function renderModuleList(modules) {
    var list = document.getElementById("moduleList");
    if (!list) return;
    modules.forEach(function (m) {
      var pct = Math.round((m.done / m.topics) * 100);
      list.innerHTML +=
        "<div>" +
        '<div class="flex justify-between mb-4">' +
        '<span style="font-size:13px">' +
        m.title +
        "</span>" +
        '<span style="font-size:12px;color:var(--muted)">' +
        m.done +
        "/" +
        m.topics +
        " topics</span>" +
        "</div>" +
        '<div class="progress-wrap">' +
        '<div class="progress-fill" style="width:' +
        pct +
        "%;background:" +
        m.color +
        '"></div>' +
        "</div>" +
        "</div>";
    });
  }

  (async function initCharts() {
    var weeks = FALLBACK_WEEKS;
    var scores = FALLBACK_PROGRESS_DATA;
    var radarLabels = FALLBACK_LABELS;
    var radarValues = FALLBACK_RADAR;
    var modules = FALLBACK_MODULES;

    try {
      var res = await fetch("/api/dashboard");
      if (res.ok) {
        var d = await res.json();
        if (d.progress && d.progress.length) {
          weeks = d.progress.map(function (p) {
            return p.week;
          });
          scores = d.progress.map(function (p) {
            return p.score;
          });
        }
        if (d.skills && d.skills.length) {
          radarLabels = d.skills.map(function (s) {
            return s.skill;
          });
          radarValues = d.skills.map(function (s) {
            return s.val;
          });
        }
        if (d.modules && d.modules.length) modules = d.modules;
      }
    } catch (_) {}

    if (document.getElementById("progressChart")) {
      buildProgressCharts(weeks, scores, radarLabels, radarValues);
    }
    renderModuleList(modules);
  })();
})();
