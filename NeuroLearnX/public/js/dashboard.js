const EMPTY_PROGRESS_DATA = [0, 0, 0, 0, 0, 0, 0];
const EMPTY_WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7"];
const EMPTY_RADAR = [0, 0, 0, 0, 0, 0];
const EMPTY_LABELS = ["Math", "Coding", "Theory", "NLP", "CV", "MLOps"];

function buildProgressCharts(weeks, scores, radarLabels, radarValues) {
  new Chart(document.getElementById("progressChart"), {
    type: "line",
    data: {
      labels: weeks,
      datasets: [
        {
          data: scores,
          borderColor: "#6C63FF",
          borderWidth: 2.5,
          pointBackgroundColor: "#6C63FF",
          pointRadius: 3,
          fill: false,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: "rgba(108,99,255,0.1)" },
          ticks: { color: "#94A3B8", font: { size: 11 } },
        },
        y: {
          min: 30,
          max: 100,
          grid: { color: "rgba(108,99,255,0.1)" },
          ticks: { color: "#94A3B8", font: { size: 11 } },
        },
      },
    },
  });

  new Chart(document.getElementById("radarChart"), {
    type: "radar",
    data: {
      labels: radarLabels,
      datasets: [
        {
          data: radarValues,
          borderColor: "#00D4AA",
          backgroundColor: "rgba(0,212,170,0.2)",
          borderWidth: 2,
          pointBackgroundColor: "#00D4AA",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          grid: { color: "rgba(108,99,255,0.15)" },
          ticks: { display: false },
          pointLabels: { color: "#94A3B8", font: { size: 11 } },
        },
      },
    },
  });
}

function renderModuleList(modules) {
  const list = document.getElementById("moduleList");
  list.innerHTML = "";
  if (!modules.length) {
    list.innerHTML = '<p class="small-hint">No module data available yet.</p>';
    return;
  }
  modules.forEach((m) => {
    const pct = Math.round((m.done / m.topics) * 100);
    list.innerHTML += `
    <div>
      <div class="flex justify-between mb-4">
        <span style="font-size:13px">${m.title}</span>
        <span style="font-size:12px;color:var(--muted)">${m.done}/${m.topics} topics</span>
      </div>
      <div class="progress-wrap">
        <div class="progress-fill" style="width:${pct}%;background:${m.color}"></div>
      </div>
    </div>`;
  });
}

function setStats(modules, scores) {
  const statOverall = document.getElementById("statOverall");
  const statTopics = document.getElementById("statTopics");
  const statQuizAvg = document.getElementById("statQuizAvg");
  const statStreak = document.getElementById("statStreak");

  const totalTopics = modules.reduce((s, m) => s + (m.topics || 0), 0);
  const doneTopics = modules.reduce((s, m) => s + (m.done || 0), 0);
  const overallPct = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const streak = Math.max(1, Math.min(30, Math.round(doneTopics / 2)));

  if (statOverall) statOverall.textContent = `${overallPct}%`;
  if (statTopics) statTopics.textContent = `${doneTopics}/${totalTopics || 0}`;
  if (statQuizAvg) statQuizAvg.textContent = `${avgScore}%`;
  if (statStreak) statStreak.textContent = `${streak} days`;
}

(async function initDashboard() {
  let weeks = EMPTY_WEEKS;
  let scores = EMPTY_PROGRESS_DATA;
  let radarLabels = EMPTY_LABELS;
  let radarValues = EMPTY_RADAR;
  let modules = [];

  try {
    const res = await fetch("/api/dashboard");
    if (res.ok) {
      const d = await res.json();
      if (d.progress && d.progress.length) {
        weeks = d.progress.map((p) => p.week);
        scores = d.progress.map((p) => p.score);
      }
      if (d.skills && d.skills.length) {
        radarLabels = d.skills.map((s) => s.skill);
        radarValues = d.skills.map((s) => s.val);
      }
      if (d.modules && d.modules.length) modules = d.modules;
    }
  } catch (_) {
    /* keep empty defaults */
  }

  buildProgressCharts(weeks, scores, radarLabels, radarValues);
  setStats(modules, scores);
  renderModuleList(modules);
})();
