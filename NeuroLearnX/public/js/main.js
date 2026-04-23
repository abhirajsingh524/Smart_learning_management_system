/* ══════════════════════════════════════════════
   static/js/main.js  —  Global init
══════════════════════════════════════════════ */

// Mobile navbar toggle
function toggleMenu() {
    document.getElementById("navLinks").classList.toggle("open");
  }
  
  // Close menu on outside click
  document.addEventListener("click", (e) => {
    const nav = document.getElementById("navLinks");
    const ham = document.getElementById("hamburger");
    if (nav && !nav.contains(e.target) && !ham.contains(e.target)) {
      nav.classList.remove("open");
    }
  });
  
  // Navbar scroll shadow
  window.addEventListener("scroll", () => {
    const nb = document.getElementById("navbar");
    if (nb) nb.style.boxShadow = window.scrollY > 10 ? "0 2px 24px rgba(0,0,0,0.5)" : "none";
  });
  
  
