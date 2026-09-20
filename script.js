const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");


/* =========================
   MOBILE MENU
========================= */

menuButton.addEventListener("click", function () {
  navLinks.classList.toggle("active");
});


/* =========================
   MENU NACH KLICK SCHLIESSEN
========================= */

document.querySelectorAll(".nav-links a").forEach(function (link) {

  link.addEventListener("click", function () {
    navLinks.classList.remove("active");
  });

});
