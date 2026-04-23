/*
<!-- ══════════════════════════════════════════════
     static/js/lab.js
══════════════════════════════════════════════ -->*/

let labChart = null;
const DEFAULT_CURVE = [
  {epoch:1,train:0.82,val:0.79},{epoch:2,train:0.88,val:0.85},
  {epoch:3,train:0.91,val:0.87},{epoch:4,train:0.93,val:0.88},
  {epoch:5,train:0.95,val:0.89},{epoch:6,train:0.96,val:0.89}
];

function buildChart(data) {
  const ctx = document.getElementById("labChart").getContext("2d");
  if (labChart) labChart.destroy();
  labChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => "E" + d.epoch),
      datasets: [
        { label:"Train", data: data.map(d=>d.train),
          borderColor:"#6C63FF", borderWidth:2.5, fill:false,
          tension:0.4, pointRadius:3, pointBackgroundColor:"#6C63FF" },
        { label:"Val", data: data.map(d=>d.val),
          borderColor:"#00D4AA", borderWidth:2.5, fill:false,
          tension:0.4, pointRadius:3, pointBackgroundColor:"#00D4AA",
          borderDash:[5,3] }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{color:"#64748B",fontSize:11}, grid:{color:"rgba(108,99,255,0.1)"}, axisLine:false },
        y:{ min:0.4, max:1, ticks:{color:"#64748B",fontSize:11}, grid:{color:"rgba(108,99,255,0.1)"} }
      }
    }
  });
}

async function runExperiment() {
  const btn = document.getElementById("runBtn");
  const box = document.getElementById("resultBox");
  btn.textContent = "⏳ Training..."; btn.disabled = true;
  box.style.display = "none";

  const res = await fetch("/api/lab/run", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      dataset: document.getElementById("datasetSelect").value,
      model:   document.getElementById("modelSelect").value
    })
  });
  const d = await res.json();
  buildChart(d.training_curve);

  box.style.display = "block";
  box.innerHTML = `
    <div class="result-header">✅ Training Complete — ${d.model} on ${d.dataset}</div>
    <div class="result-grid">
      <div class="result-item"><div class="r-label">Accuracy</div><div class="r-val">${(d.accuracy*100).toFixed(1)}%</div></div>
      <div class="result-item"><div class="r-label">F1 Score</div><div class="r-val">${d.f1_score}</div></div>
      <div class="result-item"><div class="r-label">Epochs</div><div class="r-val">${d.epochs}</div></div>
      <div class="result-item"><div class="r-label">Parameters</div><div class="r-val">${d.parameters.toLocaleString()}</div></div>
    </div>`;

  btn.textContent = "▶ Run Experiment"; btn.disabled = false;
}

buildChart(DEFAULT_CURVE);