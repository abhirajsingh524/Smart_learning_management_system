(function () {
  var form  = document.getElementById("studentLoginForm");
  var errEl = document.getElementById("studentLoginErr");
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
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign in →"; }
        return;
      }
      if (!data.user || data.user.role !== "student") {
        showErr("This account is not a student. Use the admin sign-in page.");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign in →"; }
        return;
      }

      window.NLXAuth.setSession(data.token, data.user);
      // Redirect to student dashboard — data from MongoDB
      window.location.href = "/student/dashboard";
    } catch (err) {
      showErr("Network error. Please try again.");
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign in →"; }
    }
  });
})();
