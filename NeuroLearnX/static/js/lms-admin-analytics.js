(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("admin", "/login")) return;

  var lo = document.getElementById("lmsAdminLogout");
  if (lo) {
    lo.addEventListener("click", async function () {
      await window.NLXAuth.logout();
      window.location.href = "/login";
    });
  }

  (async function () {
    try {
      var res = await fetch("/api/admin/analytics", {
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) {
        document.getElementById("anTot").textContent = "?";
        return;
      }
      var ov = data.overview || {};
      document.getElementById("anTot").textContent = String(ov.totalStudents != null ? ov.totalStudents : "0");
      document.getElementById("anAct").textContent = String(
        ov.activeUsersLast7Days != null ? ov.activeUsersLast7Days : "0"
      );
      document.getElementById("anAvg").textContent =
        ov.avgQuizScorePct != null ? ov.avgQuizScorePct + "%" : "—";

      var cc = document.getElementById("anCourses");
      cc.innerHTML = (data.coursePerformance || [])
        .map(function (c) {
          return (
            "<div style='margin-bottom:8px'><strong>" +
            (c.title || "") +
            "</strong> — attempts: " +
            (c.attempts || 0) +
            ", avg: " +
            (c.avgScorePct != null ? c.avgScorePct + "%" : "—") +
            "</div>"
          );
        })
        .join("");

      document.getElementById("anPy").textContent = data.pythonService
        ? JSON.stringify(data.pythonService, null, 2)
        : "Python service not configured or unreachable (optional).";
    } catch (e) {
      document.getElementById("anCourses").textContent = "Failed to load.";
    }
  })();
})();
