(function () {
  var form = document.getElementById("studentRegisterForm");
  var errEl = document.getElementById("studentRegisterErr");
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
      name: (fd.get("name") || "").toString().trim(),
      email: (fd.get("email") || "").toString().trim(),
      password: (fd.get("password") || "").toString(),
      phone: (fd.get("phone") || "").toString().trim() || undefined,
      course: (fd.get("course") || "").toString().trim() || undefined,
    };

    try {
      var res = await fetch("/api/auth/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        showErr(data.message || "Registration failed.");
        return;
      }
      window.NLXAuth.setSession(data.token, data.user);
      window.location.href = "/student-dashboard.html";
    } catch (err) {
      showErr("Network error. Please try again.");
    }
  });
})();
