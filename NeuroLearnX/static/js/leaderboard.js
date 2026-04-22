/*

<!-- ══════════════════════════════════════════════
     static/js/leaderboard.js
══════════════════════════════════════════════ -->
*/
const AVATAR_COLORS = ["#6C63FF","#00D4AA","#F59E0B","#EC4899","#8B5CF6","#06B6D4","#EF4444"];

async function loadLeaderboard() {
  const res  = await fetch("/api/leaderboard");
  const data = await res.json();
  const list = document.getElementById("lbList");
  list.innerHTML = data.map((l, i) => {
    const initials = l.name.split(" ").map(n=>n[0]).join("");
    const xpColor  = l.rank===1 ? "#F59E0B" : l.rank===2 ? "#94A3B8" : l.rank===3 ? "#6C63FF" : "#E2E8F0";
    return `
      <div class="lb-row ${l.rank<=3?"top3":""} ${l.rank===1?"rank1":""}">
        <span class="lb-badge">${l.badge}</span>
        <div class="lb-avatar" style="background:${AVATAR_COLORS[i%AVATAR_COLORS.length]}">${initials}</div>
        <div class="lb-info">
          <div class="lb-name">${l.name}</div>
          <div class="lb-sub">🔥 ${l.streak} day streak · ${l.courses} courses</div>
        </div>
        <div class="lb-xp" style="color:${xpColor}">${l.points.toLocaleString()} XP</div>
      </div>`;
  }).join("");
}
loadLeaderboard();
