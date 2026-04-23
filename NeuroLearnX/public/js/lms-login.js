(function () {
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

  var ful = document.getElementById("formUnifiedLogin");
  if (ful) {
    ful.addEventListener("submit", async function (e) {
      e.preventDefault();
      err("errLogin", "");

      var fd = new FormData(e.target);
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
          err("errLogin", data.message || "Login failed");
          return;
        }

        var role = data.role || (data.user && data.user.role);
        if (!role) {
          err("errLogin", "Login succeeded but role is missing. Please try again.");
          return;
        }

        window.NLXAuth.setSession(data.token, data.user || { role: role });

        if (role === "admin") {
          window.location.href = "/admin-dashboard.html";
        } else {
          window.location.href = "/student-dashboard.html";
        }
      } catch (x) {
        err("errLogin", "Network error");
      }
    });
  }

  var fsr = document.getElementById("formStudentRegister");
  if (fsr) {
    fsr.addEventListener("submit", async function (e) {
      e.preventDefault();
      err("errRegister", "");
      var fd = new FormData(e.target);
      var body = {
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
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
          err("errRegister", data.message || "Registration failed");
          return;
        }
        window.NLXAuth.setSession(data.token, data.user);
        window.location.href = "/student-dashboard.html";
      } catch (x) {
        err("errRegister", "Network error");
      }
    });
  }
})();
