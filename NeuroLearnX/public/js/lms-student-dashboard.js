(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("student", "/login", true)) return;

  var lo = document.getElementById("lmsStudentLogout");
  if (lo) {
    lo.addEventListener("click", async function () {
      await window.NLXAuth.logout();
      window.location.href = "/login";
    });
  }

  (async function () {
    try {
      var res = await fetch("/api/student/dashboard", {
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) {
        window.location.href = "/login";
        return;
      }
      var st = data.student;
      if (st && st.name) {
        var t = document.getElementById("stuTitle");
        if (t) t.textContent = "Hi, " + st.name.split(" ")[0] + " 👋";
      }
      var stats = data.stats || {};
      var elC = document.getElementById("statCourses");
      var elA = document.getElementById("statAttempts");
      var elV = document.getElementById("statAvg");
      if (elC) elC.textContent = stats.enrolledCount  != null ? String(stats.enrolledCount)  : "0";
      if (elA) elA.textContent = stats.quizAttempts   != null ? String(stats.quizAttempts)   : "0";
      if (elV) elV.textContent = stats.avgScorePct    != null ? stats.avgScorePct + "%"       : "—";

      var ra = document.getElementById("recentAttempts");
      if (ra) {
        if (data.recentAttempts && data.recentAttempts.length) {
          ra.innerHTML = data.recentAttempts.map(function (a) {
            return (
              "<div style='margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06)'>" +
              "<strong>" + (a.quizTitle || "Quiz") + "</strong>" +
              (a.score != null ? " · " + a.score + "/" + a.maxScore : "") +
              " · <span style='color:var(--nx-muted)'>" + new Date(a.createdAt).toLocaleString() + "</span>" +
              "</div>"
            );
          }).join("");
        } else {
          ra.innerHTML = "<p style='color:var(--nx-muted)'>No quiz attempts yet. <a href='/lms/student/courses' style='color:var(--nx-accent)'>Start a course →</a></p>";
        }
      }

      var ctx = document.getElementById("lmsDashChart");
      if (ctx && window.Chart) {
        new Chart(ctx, {
          type: "line",
          data: {
            labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
            datasets: [{
              data: [42, 48, 55, 61, 68, 74, 80],
              borderColor: "#7c5cff",
              backgroundColor: "rgba(124,92,255,0.08)",
              tension: 0.35,
              fill: true,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.06)" } },
              y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.06)" }, min: 0, max: 100 },
            },
          },
        });
      }
    } catch (e) {
      window.location.href = "/login";
    }
  })();
})();
