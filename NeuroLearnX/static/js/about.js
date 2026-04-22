/*<!-- static/js/about.js -->
*/
// Animate tech cards on scroll
const techCards = document.querySelectorAll(".tech-card");
const obs = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.style.opacity = "1", i * 80);
    }
  });
}, { threshold: 0.2 });
techCards.forEach(c => { c.style.opacity = "0"; c.style.transition = "opacity .4s ease"; obs.observe(c); });
