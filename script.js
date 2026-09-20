document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     MOBILE MENU
  ========================= */

  const menuButton =
    document.getElementById("menuButton");

  const mobileMenu =
    document.getElementById("mobileMenu");

  if (menuButton && mobileMenu) {

    menuButton.addEventListener("click", () => {

      const open =
        mobileMenu.classList.toggle("active");

      menuButton.setAttribute(
        "aria-expanded",
        String(open)
      );

    });


    mobileMenu
      .querySelectorAll("a")
      .forEach((link) => {

        link.addEventListener("click", () => {

          mobileMenu.classList.remove("active");

          menuButton.setAttribute(
            "aria-expanded",
            "false"
          );

        });

      });

  }


  /* =========================
     HERO LOGO
  ========================= */

  const letters =
    document.querySelectorAll(".graffiti-letter");

  if (letters.length) {

    letters.forEach((letter, index) => {

      setTimeout(() => {

        letter.classList.add("sprayed");

      }, 180 + index * 90);

    });

  }


  /* =========================
     PRODUCT SLIDER
  ========================= */

  const slides =
    document.querySelectorAll(".product-slide");

  const dots =
    document.querySelectorAll(".product-dot");

  if (!slides.length) {
    return;
  }


  let currentSlide = 0;

  let sliderTimer;


  function showSlide(index) {

    slides.forEach((slide, slideIndex) => {

      slide.classList.toggle(
        "active",
        slideIndex === index
      );

    });


    dots.forEach((dot, dotIndex) => {

      dot.classList.toggle(
        "active",
        dotIndex === index
      );

    });


    currentSlide = index;

  }


  function nextSlide() {

    const next =
      (currentSlide + 1) % slides.length;

    showSlide(next);

  }


  function startSlider() {

    clearInterval(sliderTimer);

    sliderTimer =
      setInterval(
        nextSlide,
        4000
      );

  }


  function stopSlider() {

    clearInterval(sliderTimer);

  }


  dots.forEach((dot, index) => {

    dot.addEventListener("click", () => {

      showSlide(index);

      startSlider();

    });

  });


  const slider =
    document.getElementById("productSlider");


  if (slider) {

    slider.addEventListener(
      "mouseenter",
      stopSlider
    );

    slider.addEventListener(
      "mouseleave",
      startSlider
    );

  }


  showSlide(0);

  startSlider();

});
