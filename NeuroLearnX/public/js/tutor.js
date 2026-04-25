/* ══════════════════════════════════════════════
   static/js/tutor.js  —  NeuroBot AI Tutor
══════════════════════════════════════════════ */

var chatHistory = []; // [{role:"user"|"ai", text:"..."}]

function setInput(text) {
  var inp = document.getElementById("chatInput");
  if (inp) { inp.value = text; inp.focus(); }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Light markdown: **bold**, `code`, newlines → <br>
function formatReply(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code style='background:rgba(0,0,0,0.08);padding:1px 5px;border-radius:4px;font-size:0.9em'>$1</code>")
    .replace(/\n/g, "<br>");
}

function appendMsg(role, html, isHtml) {
  var win = document.getElementById("chatWindow");
  if (!win) return null;
  var div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = '<div class="bubble">' + (isHtml ? html : escapeHtml(html)) + "</div>";
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}

function setThinking(div, text) {
  if (!div) return;
  div.querySelector(".bubble").innerHTML = text;
  div.classList.remove("thinking");
  var win = document.getElementById("chatWindow");
  if (win) win.scrollTop = win.scrollHeight;
}

async function sendMessage() {
  var input   = document.getElementById("chatInput");
  var sendBtn = document.getElementById("sendBtn");
  if (!input) return;

  var msg = input.value.trim();
  if (!msg) return;

  input.value = "";
  if (sendBtn) sendBtn.disabled = true;

  // Show user bubble
  appendMsg("user", msg, false);

  // Show typing indicator
  var thinkDiv = appendMsg("ai thinking", '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>', true);

  // Build history payload for backend (role: "user"/"ai", text: "...")
  var historyPayload = chatHistory.map(function (m) {
    return { role: m.role, text: m.text };
  });

  try {
    var res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, history: historyPayload }),
    });

    var data = await res.json().catch(function () { return {}; });
    var reply = (data.reply || "Sorry, I couldn't get a response. Please try again.").trim();

    setThinking(thinkDiv, formatReply(reply));

    // Save to history
    chatHistory.push({ role: "user", text: msg });
    chatHistory.push({ role: "ai",   text: reply });

    // Keep history bounded (last 10 turns = 20 items)
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  } catch (err) {
    setThinking(thinkDiv, "⚠️ Connection error. Please check your network and try again.");
  }

  if (sendBtn) sendBtn.disabled = false;
  if (input) input.focus();
}

// Enter key to send
(function () {
  var inp = document.getElementById("chatInput");
  if (inp) {
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
})();
