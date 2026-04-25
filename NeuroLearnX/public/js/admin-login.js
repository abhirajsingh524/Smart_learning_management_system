(function () {
  var form  = document.getElementById("adminLoginForm");
  var errEl = document.getElementById("adminLoginErr");
  if (!form) return;

  function showErr(msg) {
    errEl.textContent = msg || "";
    errEl.style.display = msg ? "block" : "none";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    showErr("");

    var submitBtn = form.querySelector("button[type=submit]");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Signing in…"; }

    var fd = new FormData(form);
    var body = {
      email:    (fd.get("email")    || "").toString().trim(),
      password: (fd.get("password") || "").toString(),
    };

    try {
      var res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () { return {}; });

      if (!res.ok) {
        showErr(data.message || "Sign in failed.");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign in as admin →"; }
        return;
      }
      if (!data.user || data.user.role !== "admin") {
        showErr("This account is not an administrator. Use the student sign-in page.");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign in as admin →"; }
        return;
      }

      window.NLXAuth.setSession(data.token, data.user);
      // After login, go to LMS admin portal or ?next= param
      var params = new URLSearchParams(window.location.search);
      var next = params.get("next");
      window.location.href = (next && next.startsWith("/")) ? next : "/lms/admin/dashboard";
    } catch (err) {
      showErr("Network error. Please try again.");
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign in as admin →"; }
    }
  });
})();
