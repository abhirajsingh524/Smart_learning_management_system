(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("admin", "/login", true)) return;

  var lo = document.getElementById("lmsAdminLogout");
  if (lo) {
    lo.addEventListener("click", async function () {
      await window.NLXAuth.logout();
      window.location.href = "/login";
    });
  }

  var tbody = document.getElementById("admStuBody");
  var form = document.getElementById("admEditForm");
  var errEl = document.getElementById("admEditErr");

  async function load(q) {
    var url = "/api/admin/students";
    if (q) url += "?q=" + encodeURIComponent(q);
    var res = await fetch(url, {
      headers: window.NLXAuth.authHeaders(),
      credentials: "include",
    });
    var data = await res.json();
    if (!res.ok) {
      tbody.innerHTML = "<tr><td colspan='4'>Failed to load</td></tr>";
      return;
    }
    tbody.innerHTML = (data.students || [])
      .map(function (s) {
        var en = Array.isArray(s.enrolledCourses)
          ? s.enrolledCourses
              .map(function (c) {
                return c.title || c.slug || c._id || c;
              })
              .join(", ")
          : "—";
        return (
          "<tr><td>" +
          (s.name || "") +
          "</td><td>" +
          (s.email || "") +
          "</td><td style='font-size:0.78rem'>" +
          en +
          "</td><td><button type='button' class='lms-btn-sm adm-pick' data-id='" +
          s.id +
          "'>Edit</button> <button type='button' class='lms-btn-sm danger adm-del' data-id='" +
          s.id +
          "'>Delete</button></td></tr>"
        );
      })
      .join("");

    tbody.querySelectorAll(".adm-pick").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var st = (data.students || []).find(function (x) {
          return String(x.id) === String(id);
        });
        if (!st || !form) return;
        form.elements.id.value = st.id;
        form.elements.name.value = st.name || "";
        form.elements.email.value = st.email || "";
        form.elements.phone.value = st.phone || "";
        form.elements.course.value = st.course || "";
        var ids = Array.isArray(st.enrolledCourses)
          ? st.enrolledCourses
              .map(function (c) {
                return typeof c === "object" && c._id ? c._id : c;
              })
              .join(",")
          : "";
        form.elements.enrolledCourses.value = ids;
        errEl.textContent = "";
      });
    });

    tbody.querySelectorAll(".adm-del").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Delete this student?")) return;
        var id = btn.getAttribute("data-id");
        var res = await fetch("/api/admin/students/" + id, {
          method: "DELETE",
          headers: window.NLXAuth.authHeaders(),
          credentials: "include",
        });
        if (res.ok) load(document.getElementById("admSearch").value.trim());
      });
    });
  }

  document.getElementById("admSearchBtn").addEventListener("click", function () {
    load(document.getElementById("admSearch").value.trim());
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errEl.textContent = "";
    var id = form.elements.id.value;
    if (!id) {
      errEl.textContent = "Pick a student with Edit first.";
      return;
    }
    var raw = form.elements.enrolledCourses.value.trim();
    var enrolledCourses = raw
      ? raw.split(",").map(function (s) {
          return s.trim();
        })
      : [];
    var body = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      course: form.elements.course.value.trim(),
      enrolledCourses: enrolledCourses,
    };
    var res = await fetch("/api/admin/students/" + id, {
      method: "PUT",
      headers: window.NLXAuth.authHeaders(),
      credentials: "include",
      body: JSON.stringify(body),
    });
    var data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.message || "Update failed";
      return;
    }
    errEl.textContent = "Saved.";
    load(document.getElementById("admSearch").value.trim());
  });

  load("");
})();
