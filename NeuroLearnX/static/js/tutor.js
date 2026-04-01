
let history = [];

function setInput(text) {
  document.getElementById("chatInput").value = text;
}

function appendMsg(role, text) {
  const win = document.getElementById("chatWindow");
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="bubble">${text}</div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  appendMsg("user", msg);
  appendMsg("ai", "NeuroBot is thinking...");

  const res = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg, history })
  });
  const data = await res.json();
  const chatWin = document.getElementById("chatWindow");
  chatWin.lastChild.querySelector(".bubble").textContent = data.reply;
  history.push({ role: "user", text: msg });
  history.push({ role: "ai",   text: data.reply });
  chatWin.scrollTop = chatWin.scrollHeight;
}

document.getElementById("chatInput").addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});