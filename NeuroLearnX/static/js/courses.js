/* ══════════════════════════════════════════════
   static/js/courses.js
══════════════════════════════════════════════ */

function toggleSyllabus(id, btn) {
  var syl = document.getElementById(id);
  var open = syl.classList.toggle("open");
  btn.textContent = open ? "Hide Syllabus ▲" : "View Syllabus ▼";
}

// Set CSS var for border color from data-color
document.querySelectorAll(".course-card").forEach(function (card) {
  card.style.setProperty("--c", card.dataset.color || "#6C63FF");
});

/* ── Fetch enrolled courses from MongoDB after login ─────────────────── */
(function () {
  var token = window.NLXAuth && window.NLXAuth.getToken();
  var user  = window.NLXAuth && window.NLXAuth.getUser();
  if (!token || !user) return; // not logged in — static cards are shown

  var banner = document.getElementById("enrolledBanner");
  var grid   = document.getElementById("courseGrid");

  // Show enrolled banner
  if (banner) {
    banner.style.display = "flex";
    banner.querySelector(".eb-name").textContent = (user.name || "").split(" ")[0] || "there";
  }

  // Fetch enrolled courses from MongoDB
  fetch("/api/courses/enrolled", {
    headers: window.NLXAuth.authHeaders(),
    credentials: "include",
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var courses = data.courses || [];
      if (!courses.length || !grid) return;

      // Inject a "Your Enrolled Courses" section at the top
      var section = document.createElement("div");
      section.className = "enrolled-section";
      section.innerHTML =
        '<h2 class="section-h2" style="margin-bottom:14px">📌 Your Enrolled Courses</h2>' +
        '<div class="enrolled-grid" id="enrolledGrid"></div>';
      grid.parentNode.insertBefore(section, grid);

      var enrolledGrid = document.getElementById("enrolledGrid");
      courses.forEach(function (c) {
        var card = document.createElement("div");
        card.className = "enrolled-card";
        var modCount = (c.modules || []).length;
        var quizCount = c.quizCount || 0;
        card.innerHTML =
          '<div class="ec-title">' + (c.title || "Course") + "</div>" +
          '<div class="ec-desc">' + (c.description || "") + "</div>" +
          '<div class="ec-meta">' +
          '<span>📖 ' + modCount + " modules</span>" +
          '<span>📝 ' + quizCount + " quizzes</span>" +
          "</div>" +
          '<a href="/lms/student/courses" class="btn btn-primary btn-sm" style="margin-top:12px">Open in LMS →</a>';
        enrolledGrid.appendChild(card);
      });
    })
    .catch(function () {
      /* silently ignore — static cards remain */
    });
})();
