/*
<!-- static/js/resources.js -->
*/
function filterRes(btn, cat) {
  document.querySelectorAll(".r-filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".res-card").forEach(c => {
    c.classList.toggle("hidden", cat !== "all" && c.dataset.cat !== cat);
  });
}

