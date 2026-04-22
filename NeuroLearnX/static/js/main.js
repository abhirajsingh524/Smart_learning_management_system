/* ══════════════════════════════════════════════
   static/js/main.js  —  Global init
══════════════════════════════════════════════ */

// Mobile navbar toggle
function toggleMenu() {
  const nav = document.getElementById("navLinks");
  if (nav) nav.classList.toggle("open");
}

// Close menu on outside click
document.addEventListener("click", (e) => {
  const nav = document.getElementById("navLinks");
  const ham = document.getElementById("hamburger");
  if (!nav || !ham) return;
  if (!nav.contains(e.target) && !ham.contains(e.target)) {
    nav.classList.remove("open");
  }
});

// Close menu on ESC (keyboard accessibility)
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const nav = document.getElementById("navLinks");
  if (nav) nav.classList.remove("open");
});

// Navbar scroll shadow
window.addEventListener("scroll", () => {
  const nb = document.getElementById("navbar");
  if (!nb) return;
  nb.style.boxShadow = window.scrollY > 8 ? "0 8px 20px rgba(14, 116, 190, 0.14)" : "none";
});
