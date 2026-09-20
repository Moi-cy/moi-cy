const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");


// Mobile Menü öffnen / schließen
menuButton.addEventListener("click", function () {
  navLinks.classList.toggle("active");
});


// Menü nach Klick auf einen Link schließen
document.querySelectorAll(".nav-links a").forEach(function (link) {

  link.addEventListener("click", function () {
    navLinks.classList.remove("active");
  });

});
