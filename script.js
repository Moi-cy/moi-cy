/* =========================================
   MOI-CY — JAVASCRIPT
========================================= */

const menuButton = document.getElementById("menuButton");
const navigation = document.querySelector(".navigation");


/* =========================================
   MOBILE MENU
========================================= */

if (menuButton && navigation) {

  menuButton.addEventListener("click", () => {
    navigation.classList.toggle("active");
  });


  navigation.querySelectorAll("a").forEach((link) => {

    link.addEventListener("click", () => {
      navigation.classList.remove("active");
    });

  });

}


/* =========================================
   HEADER ON SCROLL
========================================= */

const header = document.querySelector(".header");

window.addEventListener("scroll", () => {

  if (!header) return;

  if (window.scrollY > 40) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }

});
