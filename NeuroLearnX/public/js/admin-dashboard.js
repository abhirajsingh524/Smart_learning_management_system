/**
 * NeuroXLearn admin dashboard: overview API + student CRUD.
 */
(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("admin", "/login")) {
    return;
  }

  var user = window.NLXAuth.getUser();
  var titleEl = document.getElementById("adminWelcomeTitle");
  var subEl = document.getElementById("adminDashSubtitle");
  if (titleEl && user && user.name) {
    titleEl.textContent = "NeuroXLearn Admin · " + user.name;
  }

  var avatarEl = document.getElementById("navAvatar");
  if (avatarEl && user && user.name) {
    var parts = user.name.trim().split(/\s+/);
    var ini = (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
    avatarEl.textContent = ini.slice(0, 2);
  }

  async function loadOverview() {
    try {
      var res = await fetch("/api/admin/dashboard", {
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) {
        if (subEl) subEl.textContent = data.message || "Could not load overview.";
        return;
      }
      var n = data.stats && data.stats.totalStudents != null ? data.stats.totalStudents : "—";
      if (subEl) {
        subEl.textContent = "Total students: " + n + " · Search and edit records below.";
      }
    } catch (e) {
      if (subEl) subEl.textContent = "Overview unavailable (network).";
    }
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
        "<td>" +
        (s.name || "") +
        "</td><td>" +
        (s.email || "") +
        "</td><td>" +
        (s.phone || "—") +
        "</td><td>" +
        (s.course || "—") +
        '</td><td><button type="button" class="btn btn-primary admin-edit" data-id="' +
        s.id +
        '" style="padding:6px 12px;font-size:12px">Edit</button> ' +
        '<button type="button" class="btn btn-muted admin-del" data-id="' +
        s.id +
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
      window.location.href = "/login";
    });
  }

  refresh();
})();
