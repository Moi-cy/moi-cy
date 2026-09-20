document.addEventListener("DOMContentLoaded", () => {

  /* =========================================
     MOI-CY — GLOBAL JAVASCRIPT
  ========================================= */


  /* =========================================
     MOBILE MENU
  ========================================= */

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


  /* =========================================
     LANGUAGE SYSTEM
     
     DE = Deutsch
     EN = English
     FR = Français
  ========================================= */

  const LANGUAGE_KEY = "moiCyLanguage";

  const supportedLanguages = [
    "de",
    "en",
    "fr"
  ];


  /* -----------------------------------------
     GET SAVED LANGUAGE
  ----------------------------------------- */

  function getSavedLanguage() {

    try {

      const saved =
        localStorage.getItem(LANGUAGE_KEY);

      if (
        saved &&
        supportedLanguages.includes(saved)
      ) {

        return saved;

      }

    } catch (error) {

      console.warn(
        "Moi-cy: Sprache konnte nicht geladen werden.",
        error
      );

    }

    return "de";

  }


  /* -----------------------------------------
     SAVE LANGUAGE
  ----------------------------------------- */

  function saveLanguage(language) {

    try {

      localStorage.setItem(
        LANGUAGE_KEY,
        language
      );

    } catch (error) {

      console.warn(
        "Moi-cy: Sprache konnte nicht gespeichert werden.",
        error
      );

    }

  }


  /* -----------------------------------------
     TRANSLATIONS
     
     HIER KOMMEN SPÄTER ALLE TEXTE REIN.
  ----------------------------------------- */

  const translations = {

    de: {

      /*
       * Beispiel:
       *
       * nav_home: "HOME"
       *
       * nav_images: "BILDER"
       *
       * nav_videos: "VIDEOS"
       *
       */

    },


    en: {

      /*
       * Beispiel:
       *
       * nav_home: "HOME"
       *
       * nav_images: "IMAGES"
       *
       * nav_videos: "VIDEOS"
       *
       */

    },


    fr: {

      /*
       * Beispiel:
       *
       * nav_home: "ACCUEIL"
       *
       * nav_images: "PHOTOS"
       *
       * nav_videos: "VIDÉOS"
       *
       */

    }

  };


  /* -----------------------------------------
     TRANSLATE ELEMENTS
     
     HTML:
     data-i18n="nav_home"
  ----------------------------------------- */

  function translatePage(language) {

    const elements =
      document.querySelectorAll("[data-i18n]");


    elements.forEach((element) => {

      const key =
        element.dataset.i18n;

      if (
        translations[language] &&
        translations[language][key]
      ) {

        element.textContent =
          translations[language][key];

      }

    });


    /* ---------------------------------------
       PLACEHOLDER TRANSLATIONS
    --------------------------------------- */

    const placeholderElements =
      document.querySelectorAll(
        "[data-i18n-placeholder]"
      );


    placeholderElements.forEach((element) => {

      const key =
        element.dataset.i18nPlaceholder;

      if (
        translations[language] &&
        translations[language][key]
      ) {

        element.placeholder =
          translations[language][key];

      }

    });


    /* ---------------------------------------
       HTML LANG ATTRIBUTE
    --------------------------------------- */

    document.documentElement.lang =
      language;


    /* ---------------------------------------
       LANGUAGE BUTTONS
    --------------------------------------- */

    document
      .querySelectorAll("[data-language]")
      .forEach((button) => {

        const buttonLanguage =
          button.dataset.language;

        button.classList.toggle(
          "active",
          buttonLanguage === language
        );

        button.setAttribute(
          "aria-pressed",
          String(
            buttonLanguage === language
          )
        );

      });

  }


  /* -----------------------------------------
     LANGUAGE BUTTONS
  ----------------------------------------- */

  document
    .querySelectorAll("[data-language]")
    .forEach((button) => {

      button.addEventListener("click", () => {

        const language =
          button.dataset.language;

        if (
          !supportedLanguages.includes(language)
        ) {

          return;

        }


        saveLanguage(language);

        translatePage(language);

      });

    });


  /* -----------------------------------------
     START LANGUAGE SYSTEM
  ----------------------------------------- */

  const currentLanguage =
    getSavedLanguage();

  translatePage(currentLanguage);


  /* =========================================
     HERO LOGO
  ========================================= */

  const letters =
    document.querySelectorAll(
      ".graffiti-letter"
    );


  if (letters.length) {

    letters.forEach((letter, index) => {

      setTimeout(() => {

        letter.classList.add("sprayed");

      }, 180 + index * 90);

    });

  }


  /* =========================================
     PRODUCT SLIDER
  ========================================= */

  const slides =
    document.querySelectorAll(
      ".product-slide"
    );

  const dots =
    document.querySelectorAll(
      ".product-dot"
    );


  if (!slides.length) {

    return;

  }


  let currentSlide = 0;

  let sliderTimer;


  /* -----------------------------------------
     SHOW SLIDE
  ----------------------------------------- */

  function showSlide(index) {

    slides.forEach(
      (slide, slideIndex) => {

        slide.classList.toggle(
          "active",
          slideIndex === index
        );

      }
    );


    dots.forEach(
      (dot, dotIndex) => {

        dot.classList.toggle(
          "active",
          dotIndex === index
        );

      }
    );


    currentSlide = index;

  }


  /* -----------------------------------------
     NEXT SLIDE
  ----------------------------------------- */

  function nextSlide() {

    const next =
      (currentSlide + 1) %
      slides.length;

    showSlide(next);

  }


  /* -----------------------------------------
     START SLIDER
  ----------------------------------------- */

  function startSlider() {

    clearInterval(
      sliderTimer
    );


    sliderTimer =
      setInterval(
        nextSlide,
        4000
      );

  }


  /* -----------------------------------------
     STOP SLIDER
  ----------------------------------------- */

  function stopSlider() {

    clearInterval(
      sliderTimer
    );

  }


  /* -----------------------------------------
     SLIDER DOTS
  ----------------------------------------- */

  dots.forEach(
    (dot, index) => {

      dot.addEventListener(
        "click",
        () => {

          showSlide(index);

          startSlider();

        }
      );

    }
  );


  /* -----------------------------------------
     SLIDER HOVER
  ----------------------------------------- */

  const slider =
    document.getElementById(
      "productSlider"
    );


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


  /* -----------------------------------------
     START PRODUCT SLIDER
  ----------------------------------------- */

  showSlide(0);

  startSlider();

});
