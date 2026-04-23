/* ══════════════════════════════════════════════
   static/js/main.js  —  Global init
══════════════════════════════════════════════ */

// Mobile navbar toggle
function toggleMenu() {
<<<<<<< HEAD
    document.getElementById("navLinks").classList.toggle("open");
    closeAccountMenu();
  }

  function closeAccountMenu() {
    const menu = document.getElementById("navAccountMenu");
    const btn = document.getElementById("navAccountBtn");
    if (menu) {
      menu.hidden = true;
    }
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
    }
  }

  function openAccountMenu() {
    const menu = document.getElementById("navAccountMenu");
    const btn = document.getElementById("navAccountBtn");
    if (menu) {
      menu.hidden = false;
    }
    if (btn) {
      btn.setAttribute("aria-expanded", "true");
    }
  }

  function toggleAccountMenu() {
    const menu = document.getElementById("navAccountMenu");
    if (!menu) return;
    if (menu.hidden) {
      openAccountMenu();
    } else {
      closeAccountMenu();
    }
  }

  (function initAccountMenu() {
    const wrap = document.getElementById("navAccount");
    const btn = document.getElementById("navAccountBtn");
    if (!wrap || !btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      toggleAccountMenu();
    });
    document.addEventListener("click", function (e) {
      if (wrap && !wrap.contains(e.target)) {
        closeAccountMenu();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeAccountMenu();
      }
    });
  })();
  
  // Close menu on outside click
  document.addEventListener("click", (e) => {
    const nav = document.getElementById("navLinks");
    const ham = document.getElementById("hamburger");
    if (nav && ham && !nav.contains(e.target) && !ham.contains(e.target)) {
      nav.classList.remove("open");
    }
  });
  
  // Navbar scroll shadow
  window.addEventListener("scroll", () => {
    const nb = document.getElementById("navbar");
    if (nb) nb.style.boxShadow = window.scrollY > 10 ? "0 2px 24px rgba(0,0,0,0.5)" : "none";
  });
  
  
=======
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
>>>>>>> 6b5d698ea15c0feb00034585642000a44d473d3b
