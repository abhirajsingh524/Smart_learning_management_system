/*
<!-- static/js/mentor.js -->
*/
let selectedMentor = "", selectedSlot = null;
function bookSession(name) {
  selectedMentor = name;
  document.getElementById("modalTitle").textContent = `Book Session — ${name}`;
  document.getElementById("bookModal").style.display = "flex";
}
function closeModal(e) {
  if (!e || e.target.id === "bookModal") document.getElementById("bookModal").style.display = "none";
}
function selectSlot(btn) {
  document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected"); selectedSlot = btn.textContent;
}
function confirmBooking() {
  if (!selectedSlot) { alert("Please select a time slot."); return; }
  alert(`✅ Session booked with ${selectedMentor} on ${selectedSlot}!`);
  document.getElementById("bookModal").style.display = "none";
}
