/* ══════════════════════════════════════════════
static/js/home.js
══════════════════════════════════════════════ */

// Animated counter for hero stats
function animateCounters() {
  document.querySelectorAll("[data-target]").forEach((el) => {
    const target = +el.dataset.target;
    let current = 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 24);
  });
}

// Intersection observer — animate when hero visible (once)
const heroStats = document.querySelector(".hero-stats");
if (heroStats) {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    },
    { threshold: 0.5 }
  );
  observer.observe(heroStats);
}

// Feature card hover glow
document.querySelectorAll(".feature-card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    card.style.background = `radial-gradient(circle at ${x.toFixed(1)}% ${y.toFixed(
      1
    )}%, rgba(34, 211, 238, 0.18), var(--surface) 62%)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.background = "var(--surface)";
  });
});