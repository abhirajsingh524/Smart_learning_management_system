  
  /* ══════════════════════════════════════════════
     static/js/courses.js
  ══════════════════════════════════════════════*/
  
  function toggleSyllabus(id, btn) {
    const syl = document.getElementById(id);
    const open = syl.classList.toggle("open");
    btn.textContent = open ? "Hide Syllabus ▲" : "View Syllabus ▼";
  }
  
  // Set CSS var for border color from data-color
  document.querySelectorAll(".course-card").forEach(card => {
    card.style.setProperty("--c", card.dataset.color || "#6C63FF");
  });
