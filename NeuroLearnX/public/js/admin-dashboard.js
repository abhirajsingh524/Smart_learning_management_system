/**
 * NeuroXLearn admin dashboard — fetches all data from MongoDB via JWT-protected APIs.
 * Seed credentials: admin@neuroxlearn.com / Admin@123
 */
(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("admin", "/admin/login")) return;

  var user   = window.NLXAuth.getUser();
  var titleEl = document.getElementById("adminWelcomeTitle");
  var subEl   = document.getElementById("adminDashSubtitle");
  if (titleEl && user && user.name) titleEl.textContent = "NeuroXLearn Admin · " + user.name;

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
        // Handle both Node.js (mongoReadyState) and Flask (mongo: bool) formats
        var mongoOk = (d.mongoReadyState === 1) || (d.mongo === true);
        var isConnecting = d.mongoReadyState === 2;

        if (dot)   dot.className   = "status-dot " + (mongoOk ? "status-ok" : (isConnecting ? "status-checking" : "status-warn"));
        if (txt)   txt.textContent = mongoOk ? "System OK — MongoDB connected" : (isConnecting ? "MongoDB connecting…" : "MongoDB not connected");
        if (mongo) { mongo.textContent = "MongoDB: " + (mongoOk ? "✅ Connected" : (isConnecting ? "⏳ Connecting" : "❌ Disconnected")); mongo.className = "status-chip " + (mongoOk ? "chip-ok" : "chip-err"); }
        if (auth)  { auth.textContent  = "Auth: ✅ JWT active"; auth.className = "status-chip chip-ok"; }

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

  async function loadOverview(retryCount) {
    retryCount = retryCount || 0;
    try {
      var r = await fetch("/api/admin/dashboard", { headers: window.NLXAuth.authHeaders(), credentials: "include" });
      var d = await r.json();
      // Retry on DB startup race condition
      if ((r.status === 503 || (r.status === 401 && d.message && d.message.toLowerCase().includes("not found"))) && retryCount < 4) {
        if (subEl) subEl.textContent = "⏳ Connecting to database… retrying (" + (retryCount + 1) + "/4)";
        setTimeout(function() { loadOverview(retryCount + 1); }, 2000);
        return;
      }
      if (!r.ok) { if (subEl) subEl.textContent = d.message || "Could not load overview."; return; }
      var n = d.stats && d.stats.totalStudents != null ? d.stats.totalStudents : "—";
      if (subEl) subEl.textContent = "Logged in as " + (user && user.email || "") + " · Total students: " + n + " · Data from MongoDB";
      var elTotal = document.getElementById("adminStatTotal");
      if (elTotal) elTotal.textContent = String(n);
    } catch (e) { if (subEl) subEl.textContent = "Overview unavailable (network)."; }

    // Also load analytics for extra stats
    try {
      var ra = await fetch("/api/admin/analytics", { headers: window.NLXAuth.authHeaders(), credentials: "include" });
      var da = await ra.json();
      if (ra.ok && da.overview) {
        var ov = da.overview;
        var elActive   = document.getElementById("adminStatActive");
        var elAttempts = document.getElementById("adminStatAttempts");
        var elAvg      = document.getElementById("adminStatAvgScore");
        if (elActive)   elActive.textContent   = ov.activeUsersLast7Days   != null ? String(ov.activeUsersLast7Days)   : "—";
        if (elAttempts) elAttempts.textContent = ov.totalQuizAttempts      != null ? String(ov.totalQuizAttempts)      : "—";
        if (elAvg)      elAvg.textContent      = ov.avgQuizScorePct        != null ? ov.avgQuizScorePct + "%" : "—";
      }
    } catch (_) {}
  }

  loadOverview();

  var tbody = document.getElementById("adminStudentTbody");
  var searchInput = document.getElementById("adminStudentSearch");
  var searchBtn = document.getElementById("adminSearchBtn");
  var statEl = document.getElementById("adminStatStudents");
  var form = document.getElementById("adminEditForm");
  var editMsg = document.getElementById("adminEditMsg");
  var editingId = null;

  function showEditMsg(text, ok) {
    if (!editMsg) return;
    editMsg.textContent = text || "";
    editMsg.style.display = text ? "block" : "none";
    editMsg.style.color = ok ? "var(--accent)" : "var(--danger)";
  }

  async function fetchStudents(q) {
    var url = "/api/admin/students";
    if (q) url += "?q=" + encodeURIComponent(q);
    var res = await fetch(url, {
      headers: window.NLXAuth.authHeaders(),
      credentials: "include",
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load students");
    return data.students || [];
  }

  function renderRows(students) {
    if (!tbody) return;
    tbody.innerHTML = "";
    if (statEl) statEl.textContent = String(students.length);

    students.forEach(function (s) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (s.name || "") +
        "</td><td>" + (s.email || "") +
        "</td><td>" + (s.phone || "—") +
        "</td><td>" + (s.course || "—") +
        "</td><td>" + (s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—") +
        '</td><td><button type="button" class="btn btn-primary admin-edit" data-id="' + s.id +
        '" style="padding:6px 12px;font-size:12px">Edit</button> ' +
        '<button type="button" class="btn btn-muted admin-del" data-id="' + s.id +
        '" style="padding:6px 12px;font-size:12px;margin-left:6px">Delete</button></td>';
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".admin-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var st = students.find(function (x) {
          return String(x.id) === String(id);
        });
        if (!st || !form) return;
        editingId = st.id;
        form.elements.name.value = st.name || "";
        form.elements.email.value = st.email || "";
        form.elements.phone.value = st.phone || "";
        form.elements.course.value = st.course || "";
        showEditMsg("", true);
      });
    });

    tbody.querySelectorAll(".admin-del").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var id = btn.getAttribute("data-id");
        if (!confirm("Delete this student account?")) return;
        try {
          var res = await fetch("/api/admin/students/" + id, {
            method: "DELETE",
            headers: window.NLXAuth.authHeaders(),
            credentials: "include",
          });
          var data = await res.json();
          if (!res.ok) {
            showEditMsg(data.message || "Delete failed", false);
            return;
          }
          if (editingId && String(editingId) === String(id)) {
            editingId = null;
            form.reset();
          }
          await refresh();
          loadOverview();
        } catch (e) {
          showEditMsg("Network error", false);
        }
      });
    });
  }

  async function refresh() {
    var q = searchInput ? searchInput.value.trim() : "";
    try {
      var list = await fetchStudents(q);
      renderRows(list);
    } catch (e) {
      if (tbody) tbody.innerHTML = "<tr><td colspan='5'>Could not load students.</td></tr>";
    }
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      refresh();
    });
  }
  if (searchInput) {
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        refresh();
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!editingId) {
        showEditMsg("Select a student with Edit first.", false);
        return;
      }
      showEditMsg("");
      var fd = new FormData(form);
      var body = {
        name: (fd.get("name") || "").toString().trim(),
        email: (fd.get("email") || "").toString().trim(),
        phone: (fd.get("phone") || "").toString().trim(),
        course: (fd.get("course") || "").toString().trim(),
      };
      try {
        var res = await fetch("/api/admin/students/" + editingId, {
          method: "PUT",
          headers: window.NLXAuth.authHeaders(),
          credentials: "include",
          body: JSON.stringify(body),
        });
        var data = await res.json();
        if (!res.ok) {
          showEditMsg(data.message || "Update failed", false);
          return;
        }
        showEditMsg("Saved.", true);
        await refresh();
        loadOverview();
      } catch (err) {
        showEditMsg("Network error", false);
      }
    });
  }

  var logoutBtn = document.getElementById("adminLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      await window.NLXAuth.logout();
      window.location.href = "/admin/login";
    });
  }

  refresh();
})();
