(function () {
  if (!window.NLXAuth || !window.NLXAuth.guardPage("student", "/login", true)) return;

  var lo = document.getElementById("lmsStudentLogout");
  if (lo) {
    lo.addEventListener("click", async function () {
      await window.NLXAuth.logout();
      window.location.href = "/login";
    });
  }

  var qid = window.__QUIZ_ID__;
  var started = Date.now();
  var form = document.getElementById("quizForm");

  (async function load() {
    try {
      var res = await fetch("/api/student/quizzes/" + encodeURIComponent(qid), {
        headers: window.NLXAuth.authHeaders(),
        credentials: "include",
      });
      var data = await res.json();
      if (!res.ok) {
        document.getElementById("quizErr").textContent = data.message || "Could not load quiz";
        return;
      }
      var q = data.quiz;
      document.getElementById("quizTitle").textContent = q.title || "Quiz";
      document.getElementById("quizMeta").textContent =
        "Week " + (q.weekNumber || "?") + " · " + (q.questions ? q.questions.length : 0) + " questions";

      form.innerHTML = (q.questions || [])
        .map(function (quest, idx) {
          var opts = (quest.options || [])
            .map(function (o, j) {
              return (
                "<label style='display:flex;gap:8px;align-items:flex-start;margin:6px 0;cursor:pointer'>" +
                "<input type='radio' name='q" +
                idx +
                "' value='" +
                j +
                "' required />" +
                "<span>" +
                o +
                "</span></label>"
              );
            })
            .join("");
          return (
            '<div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.06)">' +
            "<strong>Q" +
            (idx + 1) +
            ".</strong> " +
            quest.text +
            "<div style='margin-top:8px'>" +
            opts +
            "</div></div>"
          );
        })
        .join("");

      var submitRow = document.createElement("div");
      submitRow.style.marginTop = "14px";
      var btn = document.createElement("button");
      btn.type = "submit";
      btn.className = "lms-btn";
      btn.style.maxWidth = "240px";
      btn.textContent = "Submit answers";
      submitRow.appendChild(btn);
      form.appendChild(submitRow);

      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        document.getElementById("quizErr").textContent = "";
        var answers = [];
        for (var i = 0; i < (q.questions || []).length; i++) {
          var sel = form.querySelector("input[name='q" + i + "']:checked");
          answers.push(sel ? Number(sel.value) : 0);
        }
        try {
          var res2 = await fetch("/api/student/quiz/attempt", {
            method: "POST",
            headers: window.NLXAuth.authHeaders(),
            credentials: "include",
            body: JSON.stringify({
              quizId: qid,
              answers: answers,
              durationMs: Date.now() - started,
            }),
          });
          var data2 = await res2.json();
          if (!res2.ok) {
            document.getElementById("quizErr").textContent = data2.message || "Submit failed";
            return;
          }
          var rr = document.getElementById("quizResult");
          rr.style.display = "block";
          rr.innerHTML =
            "<strong>Submitted!</strong><div style='margin-top:8px'>Score: " +
            data2.attempt.score +
            "/" +
            data2.attempt.maxScore +
            " (" +
            data2.attempt.percent +
            "%)</div>" +
            '<a href="/lms/student/courses" style="color:var(--nx-accent);margin-top:10px;display:inline-block">Back to courses</a>';
        } catch (err) {
          document.getElementById("quizErr").textContent = "Network error";
        }
      });
    } catch (e) {
      document.getElementById("quizErr").textContent = "Network error";
    }
  })();
})();
