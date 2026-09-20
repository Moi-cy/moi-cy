/* =========================================================
   MOI-CY
   Main JavaScript
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =======================================================
     MOBILE MENU
  ======================================================== */

  const menuButton = document.getElementById("menuButton");
  const mobileMenu = document.getElementById("mobileMenu");

  if (menuButton && mobileMenu) {

    menuButton.addEventListener("click", () => {

      const isOpen = mobileMenu.classList.toggle("active");

      menuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

    });


    const mobileLinks =
      mobileMenu.querySelectorAll("a");

    mobileLinks.forEach((link) => {

      link.addEventListener("click", () => {

        mobileMenu.classList.remove("active");

        menuButton.setAttribute(
          "aria-expanded",
          "false"
        );

      });

    });

  }


  /* =======================================================
     GRAFFITI SPRAY ANIMATION
  ======================================================== */

  const logo = document.getElementById("graffitiLogo");
  const sprayCloud = document.getElementById("sprayCloud");

  const revealRect =
    document.getElementById("revealRect");

  const revealStart =
    document.getElementById("revealStart");

  const revealEdge =
    document.getElementById("revealEdge");

  const revealEnd =
    document.getElementById("revealEnd");

  const revealFinish =
    document.getElementById("revealFinish");

  const sprayDots =
    document.querySelectorAll(".spray-dot");


  if (
    logo &&
    sprayCloud &&
    revealRect &&
    revealStart &&
    revealEdge &&
    revealEnd &&
    revealFinish
  ) {

    /*
      Dauer des Aufsprühens.

      0 = noch nicht sichtbar
      1000 = komplett sichtbar
    */

    const duration = 2400;

    const startTime = performance.now();


    /*
      Kleine Spritzer werden bewusst
      nacheinander aktiviert.
    */

    const activateDots = () => {

      sprayDots.forEach((dot, index) => {

        const delay =
          350 + index * 135;

        window.setTimeout(() => {

          dot.classList.add("active");

        }, delay);

      });

    };


    activateDots();


    /*
      Spraywolke einschalten.
    */

    sprayCloud.classList.add("spraying");


    /*
      Position der Spraywolke.

      Die Wolke wandert exakt mit der
      Aufsprühkante von links nach rechts.
    */

    const updateCloudPosition = (progress) => {

      const clamped =
        Math.max(
          0,
          Math.min(1, progress)
        );

      /*
        4% -> 96%

        Dadurch sitzt die Wolke
        nicht außerhalb des Logos.
      */

      const left =
        4 + clamped * 92;

      sprayCloud.style.left =
        `${left}%`;

    };


    /*
      Das eigentliche Aufsprühen.

      Der sichtbare Bereich wächst
      kontinuierlich von links nach rechts.
    */

    const animateSpray = (currentTime) => {

      const elapsed =
        currentTime - startTime;

      const rawProgress =
        elapsed / duration;

      const progress =
        Math.max(
          0,
          Math.min(1, rawProgress)
        );


      /*
        Leichte Beschleunigung,
        damit der Anfang etwas
        kontrollierter wirkt.
      */

      const eased =
        1 - Math.pow(1 - progress, 2);


      /*
        SVG-Reveal.
      */

      const revealWidth =
        eased * 1000;


      revealRect.setAttribute(
        "width",
        String(revealWidth)
      );


      /*
        Der harte Übergang der Maske
        bleibt direkt an der Spraykante.
      */

      const edge =
        Math.max(
          0,
          eased * 100
        );

      revealStart.setAttribute(
        "offset",
        `${Math.max(0, edge - 2.2)}%`
      );

      revealEdge.setAttribute(
        "offset",
        `${edge}%`
      );

      revealEnd.setAttribute(
        "offset",
        `${Math.min(100, edge + 0.2)}%`
      );

      revealFinish.setAttribute(
        "offset",
        `${Math.min(100, edge + 0.4)}%`
      );


      /*
        Spraywolke mitführen.
      */

      updateCloudPosition(eased);


      /*
        Solange noch gesprüht wird:
        weiter animieren.
      */

      if (progress < 1) {

        requestAnimationFrame(
          animateSpray
        );

        return;

      }


      /*
        Am Ende:
        Logo komplett sichtbar.
      */

      revealRect.setAttribute(
        "width",
        "1000"
      );

      updateCloudPosition(1);


      /*
        Spraywolke noch kurz nachziehen lassen,
        damit es nicht wie ein harter
        Animationsstopp aussieht.
      */

      window.setTimeout(() => {

        sprayCloud.classList.remove(
          "spraying"
        );

        sprayCloud.style.opacity = "0";

      }, 450);

    };


    /*
      Animation starten.
    */

    requestAnimationFrame(
      animateSpray
    );

  }

});
