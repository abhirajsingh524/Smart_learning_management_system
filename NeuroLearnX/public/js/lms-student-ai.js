(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("student", "/login", true)) return;

  var lo = document.getElementById("lmsStudentLogout");
  if (lo) {
    lo.addEventListener("click", async function () {
      await window.NLXAuth.logout();
      window.location.href = "/login";
    });
  }

  function bubble(text, who) {
    var log = document.getElementById("chatLog");
    var d = document.createElement("div");
    d.className = "lms-bubble " + (who || "bot");
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  async function send() {
    var input = document.getElementById("chatInput");
    var err = document.getElementById("chatErr");
    err.textContent = "";
    var msg = (input.value || "").trim();
    if (!msg) return;
    bubble(msg, "user");
    input.value = "";
    try {
      var res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
        body: JSON.stringify({ message: msg, context: {} }),
      });
      var data = await res.json();
      if (!res.ok) {
        err.textContent = data.message || "Request failed";
        return;
      }
      bubble(data.reply || "…", "bot");
    } catch (e) {
      err.textContent = "Network error";
    }
  }

  document.getElementById("chatSend").addEventListener("click", send);
  document.getElementById("chatInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  });
})();
