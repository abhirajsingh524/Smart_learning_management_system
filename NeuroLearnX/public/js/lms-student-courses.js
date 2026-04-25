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
    var box = document.getElementById("courseList");
    try {
      var res = await fetch("/api/student/courses", {
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) {
        box.textContent = data.message || "Could not load courses.";
        return;
      }
      if (!data.courses || !data.courses.length) {
        box.innerHTML = "<p style='color:var(--nx-muted)'>No enrolled courses yet.</p>";
        return;
      }
      box.innerHTML = data.courses
        .map(function (c) {
          return (
            '<a class="glass" style="display:block;padding:16px;text-decoration:none;transition:transform .15s" href="/lms/student/course/' +
            c._id +
            '">' +
            '<div style="font-weight:700;margin-bottom:6px">' +
            (c.title || "") +
            "</div>" +
            '<div style="font-size:0.82rem;color:var(--nx-muted)">' +
            (c.description || "").slice(0, 120) +
            (c.description && c.description.length > 120 ? "…" : "") +
            "</div>" +
            '<div class="lms-tag" style="margin-top:10px">' +
            (c.quizCount || 0) +
            " quizzes</div>" +
            "</a>"
          );
        })
        .join("");
    } catch (e) {
      box.textContent = "Network error.";
    }
  })();
})();
