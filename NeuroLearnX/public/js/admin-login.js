(function () {
  var form = document.getElementById("adminLoginForm");
  var errEl = document.getElementById("adminLoginErr");
  if (!form) return;

  function showErr(msg) {
    errEl.textContent = msg || "";
    errEl.style.display = msg ? "block" : "none";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    showErr("");
    var fd = new FormData(form);
    var body = {
      email: (fd.get("email") || "").toString().trim(),
      password: (fd.get("password") || "").toString(),
    };

    try {
      var res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        showErr(data.message || "Sign in failed.");
        return;
      }
      if (!data.user || data.user.role !== "admin") {
        showErr("This account is not an administrator. Use the student sign-in page.");
        return;
      }
      window.NLXAuth.setSession(data.token, data.user);
      window.location.href = "/admin-dashboard.html";
    } catch (err) {
      showErr("Network error. Please try again.");
    }
  });
})();
