(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("student", "/login")) return;

  var lo = document.getElementById("lmsStudentLogout");
  if (lo) {
    lo.addEventListener("click", async function () {
    await window.NLXAuth.logout();
      window.location.href = "/login";
    });
  }

  var cid = window.__COURSE_ID__;
  (async function () {
    try {
      var res = await fetch("/api/student/courses/" + encodeURIComponent(cid), {
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) {
        document.getElementById("courseTitle").textContent = "Error";
        document.getElementById("courseDesc").textContent = data.message || "";
        return;
      }
      var c = data.course;
      document.getElementById("courseTitle").textContent = c.title || "Course";
      document.getElementById("courseDesc").textContent = c.description || "";

      var ml = document.getElementById("moduleList");
      ml.innerHTML = (c.modules || [])
        .map(function (m) {
          return "<div style='margin-bottom:8px'><strong>" + m.title + "</strong> — " + (m.summary || "") + "</div>";
        })
        .join("");

      var ql = document.getElementById("quizList");
      ql.innerHTML = (data.quizzes || [])
        .map(function (q) {
          var best = q.bestAttempt
            ? "Best: " + Math.round(q.bestAttempt.pct) + "%"
            : "Not attempted";
          return (
            '<div class="glass" style="padding:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
            "<div><strong>" +
            (q.title || "Quiz") +
            '</strong><div style="font-size:0.78rem;color:var(--nx-muted)">Week ' +
            (q.weekNumber || "") +
            " · " +
            best +
            "</div></div>" +
            '<a class="lms-btn-sm" href="/lms/student/quiz/' +
            q._id +
            '">Start</a>' +
            "</div>"
          );
        })
        .join("");
    } catch (e) {
      document.getElementById("courseDesc").textContent = "Could not load course.";
    }
  })();
})();
