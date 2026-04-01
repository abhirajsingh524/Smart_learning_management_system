
let questions = [], idx = 0, score = 0, answered = false;

async function loadQuiz() {
  const res = await fetch("/api/quiz");
  questions = await res.json();
  renderQuestion();
}

function renderQuestion() {
  const q = questions[idx];
  const card = document.getElementById("quizCard");
  card.innerHTML = `
    <div class="quiz-meta">
      <span class="pill" style="background:rgba(108,99,255,0.18);color:var(--primary)">Q ${idx+1} of ${questions.length}</span>
      <span style="font-size:12px;color:var(--muted)">Score: ${score}/${idx}</span>
    </div>
    <p class="quiz-q">${q.q}</p>
    <div class="quiz-opts">
      ${q.opts.map((o,i) => `<button class="quiz-opt" onclick="answer(${i})"><strong>${String.fromCharCode(65+i)}.</strong> ${o}</button>`).join("")}
    </div>
    <div id="expBox"></div>`;
  answered = false;
}

function answer(i) {
  if (answered) return;
  answered = true;
  const q = questions[idx];
  const opts = document.querySelectorAll(".quiz-opt");
  opts[q.ans].classList.add("correct");
  if (i !== q.ans) opts[i].classList.add("wrong");
  else score++;
  document.getElementById("expBox").innerHTML = `
    <div class="quiz-exp"><strong style="color:var(--accent)">Explanation:</strong> ${q.exp}</div>
    <button class="btn btn-primary mt-12" onclick="next()">${idx+1>=questions.length?"See Results":"Next →"}</button>`;
}

function next() {
  idx++;
  if (idx >= questions.length) showResult();
  else renderQuestion();
}

function showResult() {
  const icon = score === questions.length ? "🏆" : score >= 2 ? "⭐" : "📚";
  const msg  = score === questions.length ? "Perfect score!" : score >= 2 ? "Good work! Review missed questions." : "Keep practicing — revisit the module.";
  document.getElementById("quizCard").innerHTML = `
    <div class="quiz-result">
      <div class="result-icon">${icon}</div>
      <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">Quiz Complete!</h2>
      <div class="result-score">${score}/${questions.length}</div>
      <p style="color:var(--muted);font-size:14px;margin-bottom:24px">${msg}</p>
      <button class="btn btn-primary" onclick="restart()">Retake Quiz</button>
    </div>`;
}

function restart() { idx = 0; score = 0; renderQuestion(); }

loadQuiz();