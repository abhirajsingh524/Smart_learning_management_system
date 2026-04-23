(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("student", "/login")) return;

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
        if (t) t.textContent = "Hi, " + st.name.split(" ")[0];
      }
      var stats = data.stats || {};
      document.getElementById("statCourses").textContent =
        stats.enrolledCount != null ? String(stats.enrolledCount) : "0";
      document.getElementById("statAttempts").textContent =
        stats.quizAttempts != null ? String(stats.quizAttempts) : "0";
      var avg = stats.avgScorePct;
      document.getElementById("statAvg").textContent = avg != null ? avg + "%" : "—";

      var ra = document.getElementById("recentAttempts");
      if (data.recentAttempts && data.recentAttempts.length) {
        ra.innerHTML = data.recentAttempts
          .map(function (a) {
            return (
              "<div style='margin-bottom:8px'>" +
              (a.quizTitle || "Quiz") +
              " · " +
              (a.score != null ? a.score + "/" + a.maxScore : "") +
              " · " +
              new Date(a.createdAt).toLocaleString() +
              "</div>"
            );
          })
          .join("");
      } else {
        ra.textContent = "No quiz attempts yet.";
      }

      var ctx = document.getElementById("lmsDashChart");
      if (ctx && window.Chart) {
        new Chart(ctx, {
          type: "line",
          data: {
            labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
            datasets: [
              {
                data: [42, 48, 55, 61, 68, 74, 80],
                borderColor: "#7c5cff",
                tension: 0.35,
                fill: false,
              },
            ],
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
