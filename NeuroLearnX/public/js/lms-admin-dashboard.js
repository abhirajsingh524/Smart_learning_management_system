(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("admin", "/login", true)) return;

  var lo = document.getElementById("lmsAdminLogout");
  if (lo) {
    lo.addEventListener("click", async function () {
      await window.NLXAuth.logout();
      window.location.href = "/login";
    });
  }

  (async function () {
    try {
      var res = await fetch("/api/admin/dashboard", {
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) {
        window.location.href = "/login";
        return;
      }
      var ts = data.stats && data.stats.totalStudents != null ? data.stats.totalStudents : "0";
      document.getElementById("admTotalStudents").textContent = String(ts);
      var nm = data.admin && data.admin.name ? data.admin.name : "—";
      document.getElementById("admName").textContent = nm;
    } catch (e) {
      window.location.href = "/login";
    }
  })();
})();
