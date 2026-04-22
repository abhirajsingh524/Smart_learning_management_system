
/*
<!-- ══════════════════════════════════════════════
     static/js/community.js
══════════════════════════════════════════════ -->
*/
function like(btn) {
  const parts = btn.textContent.split(" ");
  const count = parseInt(parts[1]) + 1;
  btn.textContent = `❤️ ${count}`;
  btn.style.color = "#EF4444";
}

