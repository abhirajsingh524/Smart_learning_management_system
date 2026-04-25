/* ══════════════════════════════════════════════
   static/js/main.js  —  Global init
══════════════════════════════════════════════ */

// Mobile navbar toggle
function toggleMenu() {
  const nav = document.getElementById("navLinks");
  if (nav) nav.classList.toggle("open");
}

// Close mobile menu on outside click
document.addEventListener("click", (e) => {
  const nav = document.getElementById("navLinks");
  const ham = document.getElementById("hamburger");
  if (!nav || !ham) return;
  if (!nav.contains(e.target) && !ham.contains(e.target)) {
    nav.classList.remove("open");
  }
});

// Close on ESC
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const nav = document.getElementById("navLinks");
  if (nav) nav.classList.remove("open");
});

// Navbar scroll shadow
window.addEventListener("scroll", () => {
  const nb = document.getElementById("navbar");
  if (!nb) return;
  nb.style.boxShadow = window.scrollY > 8 ? "0 2px 24px rgba(0,0,0,0.5)" : "none";
});
