var history = [];

function setInput(text) {
  document.getElementById("chatInput").value = text;
}

function appendMsg(role, text) {
  var win = document.getElementById("chatWindow");
  var div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = "<div class='bubble'>" + text + "</div>";
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function replaceLastAiBubble(text) {
  var chatWin = document.getElementById("chatWindow");
  var last = chatWin.lastChild;
  if (last && last.querySelector) {
    var b = last.querySelector(".bubble");
    if (b) b.textContent = text;
  }
  chatWin.scrollTop = chatWin.scrollHeight;
}

async function sendMessage() {
  var input = document.getElementById("chatInput");
  var msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  appendMsg("user", msg);
  appendMsg("ai", "Thinking…");

  var authed = window.NLXAuth && window.NLXAuth.getToken() && window.NLXAuth.getUser();

  if (authed) {
    try {
      var res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
        body: JSON.stringify({ message: msg, context: { page: "tutor" } }),
      });
      var data = await res.json();
      if (res.ok && data.reply) {
        replaceLastAiBubble(data.reply);
        history.push({ role: "user", text: msg });
        history.push({ role: "ai", text: data.reply });
        return;
      }
    } catch (e) {
      /* fall through to demo tutor */
    }
  }

  try {
    var res2 = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    var data2 = await res2.json();
    replaceLastAiBubble(data2.reply || "No response.");
    history.push({ role: "user", text: msg });
    history.push({ role: "ai", text: data2.reply || "" });
  } catch (e) {
    replaceLastAiBubble("Network error. Please try again.");
  }
}

document.getElementById("chatInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") sendMessage();
});
