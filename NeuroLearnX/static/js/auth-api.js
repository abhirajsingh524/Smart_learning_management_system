/**
 * NeuroXLearn — JWT helpers (localStorage + optional HTTP-only cookie).
 * Primary key: `token` (per project spec). Legacy `nlx_token` is kept in sync.
 */
(function () {
  var TOKEN_KEY = "token";
  var TOKEN_LEGACY = "nlx_token";
  var USER_KEY = "nlx_user";

  function readToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_LEGACY);
  }

  window.NLXAuth = {
    TOKEN_KEY: TOKEN_KEY,
    USER_KEY: USER_KEY,

    getToken: function () {
      return readToken();
    },

    getUser: function () {
      try {
        var raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    setSession: function (token, user) {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_LEGACY, token);
      }
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    },

    clearSession: function () {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_LEGACY);
      localStorage.removeItem(USER_KEY);
    },

    authHeaders: function () {
      var t = readToken();
      var h = { "Content-Type": "application/json" };
      if (t) {
        h.Authorization = "Bearer " + t;
      }
      return h;
    },

    logout: async function () {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: this.authHeaders(),
          credentials: "include",
        });
      } catch (e) {
        /* ignore */
      }
      this.clearSession();
    },

    /**
     * Wrong role → classic dashboards or LMS (prefer classic paths).
     */
    guardPage: function (expectedRole, loginPath) {
      var token = this.getToken();
      var user = this.getUser();
      if (!token || !user) {
        window.location.href = loginPath;
        return false;
      }
      if (user.role !== expectedRole) {
        window.location.href =
          user.role === "admin" ? "/admin-dashboard.html" : "/student-dashboard.html";
        return false;
      }
      return true;
    },
  };
})();
