(function () {
  // ── Register toggle ───────────────────────────────────────────────────
  var showReg = document.getElementById("showRegister");
  var formReg = document.getElementById("formStudentRegister");
  if (showReg && formReg) {
    showReg.addEventListener("click", function () {
      formReg.style.display = formReg.style.display === "none" ? "block" : "none";
    });
  }

  function err(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg || "";
  }

  // Read ?next= param so /lms → /login?next=/lms → back to /lms after login
  function getNextUrl(role) {
    var params = new URLSearchParams(window.location.search);
    var next = params.get("next");
    if (next && next.startsWith("/")) return next;
    // Default: role-based LMS dashboard
    return role === "admin" ? "/lms/admin/dashboard" : "/lms/student/dashboard";
  }

  // ── Unified login form ────────────────────────────────────────────────
  var ful = document.getElementById("formUnifiedLogin");
  if (ful) {
    ful.addEventListener("submit", async function (e) {
      e.preventDefault();
      err("errLogin", "");

      var submitBtn = ful.querySelector("button[type=submit]");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Signing in…"; }

      var fd = new FormData(e.target);
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
          err("errLogin", data.message || "Login failed");
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Login"; }
          return;
        }

        var role = data.role || (data.user && data.user.role);
        if (!role) {
          err("errLogin", "Login succeeded but role is missing. Please try again.");
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Login"; }
          return;
        }

        window.NLXAuth.setSession(data.token, data.user || { role: role });
        window.location.href = getNextUrl(role);
      } catch (x) {
        err("errLogin", "Network error. Please try again.");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Login"; }
      }
    });
  }

  // ── Student register form ─────────────────────────────────────────────
  var fsr = document.getElementById("formStudentRegister");
  if (fsr) {
    fsr.addEventListener("submit", async function (e) {
      e.preventDefault();
      err("errRegister", "");

      var submitBtn = fsr.querySelector("button[type=submit]");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Creating…"; }

      var fd = new FormData(e.target);
      var body = {
        name:     fd.get("name"),
        email:    fd.get("email"),
        password: fd.get("password"),
      };
      try {
        var res = await fetch("/api/auth/student/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
          err("errRegister", data.message || "Registration failed");
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Register"; }
          return;
        }
        window.NLXAuth.setSession(data.token, data.user);
        window.location.href = "/lms/student/dashboard";
      } catch (x) {
        err("errRegister", "Network error. Please try again.");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Register"; }
      }
    });
  }
})();
