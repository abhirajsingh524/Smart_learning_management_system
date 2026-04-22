/*

<!-- ══════════════════════════════════════════════
     static/js/tutor.js
══════════════════════════════════════════════ -->
*/
let history = [];

function setInput(text) {
  document.getElementById("chatInput").value = text;
  document.getElementById("chatInput").focus();
}

function appendMsg(role, text, cls = "") {
  const win = document.getElementById("chatWindow");
  const div = document.createElement("div");
  div.className = `msg ${role} ${cls}`.trim();
  div.innerHTML = `<div class="bubble">${text}</div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const btn   = document.getElementById("sendBtn");
  const msg   = input.value.trim();
  if (!msg) return;

  input.value = ""; btn.disabled = true;
  appendMsg("user", msg);
  const thinking = appendMsg("ai", "NeuroBot is thinking... 🤔", "thinking");

  const msgs = history.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
  msgs.push({ role: "user", content: msg });

  try {
    const res  = await fetch("/api/tutor", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ message: msg, history })
    });
    const data = await res.json();
    thinking.querySelector(".bubble").textContent = data.reply;
    thinking.classList.remove("thinking");
    history.push({ role:"user", text:msg });
    history.push({ role:"ai",   text:data.reply });
  } catch {
    thinking.querySelector(".bubble").textContent = "Connection error. Please try again.";
  }
  btn.disabled = false;
  document.getElementById("chatWindow").scrollTop = 9999;
}

document.getElementById("chatInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
