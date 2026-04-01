const MODULES = [
  { title: "Python & Math Foundations",  topics: 6, done: 6, color: "#00D4AA" },
  { title: "Classical ML Algorithms",    topics: 8, done: 7, color: "#6C63FF" },
  { title: "Deep Learning & CNNs",       topics:10, done: 5, color: "#F59E0B" },
  { title: "NLP & Transformers",         topics: 9, done: 2, color: "#EC4899" },
  { title: "MLOps & Deployment",         topics: 7, done: 0, color: "#64748B" },
];

const PROGRESS_DATA = [42,55,61,70,74,83,88];
const WEEKS = ["W1","W2","W3","W4","W5","W6","W7"];

// Progress Line Chart
new Chart(document.getElementById("progressChart"), {
  type: "line",
  data: {
    labels: WEEKS,
    datasets: [{ data: PROGRESS_DATA, borderColor: "#6C63FF", borderWidth: 2.5,
      pointBackgroundColor: "#6C63FF", pointRadius: 3, fill: false, tension: 0.4 }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: "rgba(108,99,255,0.1)" }, ticks: { color: "#94A3B8", font: { size: 11 } } },
      y: { min: 30, max: 100, grid: { color: "rgba(108,99,255,0.1)" }, ticks: { color: "#94A3B8", font: { size: 11 } } }
    }
  }
});

// Radar Chart
new Chart(document.getElementById("radarChart"), {
  type: "radar",
  data: {
    labels: ["Math","Coding","Theory","NLP","CV","MLOps"],
    datasets: [{ data: [85,78,65,45,72,30], borderColor: "#00D4AA",
      backgroundColor: "rgba(0,212,170,0.2)", borderWidth: 2, pointBackgroundColor: "#00D4AA" }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { r: { grid: { color: "rgba(108,99,255,0.15)" }, ticks: { display: false },
      pointLabels: { color: "#94A3B8", font: { size: 11 } } } }
  }
});

// Module progress bars
const list = document.getElementById("moduleList");
MODULES.forEach(m => {
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