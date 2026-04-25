/**
 * NeuroXLearn — JWT helpers (localStorage + optional HTTP-only cookie).
 * Primary key: `token`. Legacy `nlx_token` kept in sync for backward compat.
 */
(function () {
  var TOKEN_KEY    = "token";
  var TOKEN_LEGACY = "nlx_token";
  var USER_KEY     = "nlx_user";

  function readToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_LEGACY);
  }

  window.NLXAuth = {
    TOKEN_KEY: TOKEN_KEY,
    USER_KEY:  USER_KEY,

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
        localStorage.setItem(TOKEN_KEY,    token);
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
      if (t) h.Authorization = "Bearer " + t;
      return h;
    },

    logout: async function () {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: this.authHeaders(),
          credentials: "include",
        });
      } catch (e) { /* ignore network errors on logout */ }
      this.clearSession();
    },

    /**
     * Guard a page by role.
     * - Not logged in  → redirect to loginPath
     * - Wrong role     → redirect to the correct dashboard for their actual role
     *
     * Uses clean URL paths (no .html suffixes) so Express routes always match.
     */
    guardPage: function (expectedRole, loginPath) {
      var token = this.getToken();
      var user  = this.getUser();

      if (!token || !user) {
        window.location.href = loginPath || "/student/login";
        return false;
      }

      if (user.role !== expectedRole) {
        // Send them to the right place for their actual role
        if (user.role === "admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/student/dashboard";
        }
        return false;
      }

      return true;
    },
  };
})();
