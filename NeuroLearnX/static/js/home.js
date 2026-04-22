/* ══════════════════════════════════════════════
static/js/home.js
══════════════════════════════════════════════ */

// Animated counter for hero stats
function animateCounters() {
    document.querySelectorAll("[data-target]").forEach(el => {
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
    
    // Intersection observer — animate when hero visible
    const heroStats = document.querySelector(".hero-stats");
    if (heroStats) {
    new IntersectionObserver((entries) => {
     if (entries[0].isIntersecting) animateCounters();
    }, { threshold: 0.5 }).observe(heroStats);
    }
    
    // Feature card hover glow
    document.querySelectorAll(".feature-card").forEach(card => {
    card.addEventListener("mousemove", (e) => {
     const r = card.getBoundingClientRect();
     const x = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
     const y = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
     card.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(108,99,255,0.06), var(--card) 60%)`;
    });
    card.addEventListener("mouseleave", () => {
     card.style.background = "var(--card)";
    });
    });