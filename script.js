/* =========================================================
   MOI-CY
   Main JavaScript
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {


    /* =====================================================
       MOBILE MENU
    ====================================================== */

    const menuButton =
      document.getElementById(
        "menuButton"
      );

    const mobileMenu =
      document.getElementById(
        "mobileMenu"
      );


    if (
      menuButton &&
      mobileMenu
    ) {

      menuButton.addEventListener(
        "click",
        () => {

          const isOpen =
            mobileMenu.classList.toggle(
              "active"
            );


          menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
          );

        }
      );


      const mobileLinks =
        mobileMenu.querySelectorAll(
          "a"
        );


      mobileLinks.forEach(
        (link) => {

          link.addEventListener(
            "click",
            () => {

              mobileMenu.classList.remove(
                "active"
              );


              menuButton.setAttribute(
                "aria-expanded",
                "false"
              );

            }
          );

        }
      );

    }


    /* =====================================================
       GRAFFITI SPRAY
    ====================================================== */

    const logo =
      document.getElementById(
        "graffitiLogo"
      );

    const sprayCloud =
      document.getElementById(
        "sprayCloud"
      );

    const revealRect =
      document.getElementById(
        "logoRevealRect"
      );

    const sprayDots =
      document.querySelectorAll(
        ".spray-dot"
      );


    /*
      Nur starten, wenn wirklich
      alle benötigten Elemente existieren.
    */

    if (
      !logo ||
      !sprayCloud ||
      !revealRect
    ) {

      return;

    }


    /* =====================================================
       EINSTELLUNGEN
    ====================================================== */

    const animationDuration = 2700;

    const startWidth = 0;

    const endWidth = 1000;


    /*
      Startzustand:
      Das Logo ist KOMPLETT unsichtbar.
    */

    revealRect.setAttribute(
      "width",
      String(startWidth)
    );


    /*
      Spraywolke einschalten.
    */

    sprayCloud.classList.add(
      "spraying"
    );


    /* =====================================================
       SPRAY-PARTIKEL
    ====================================================== */

    sprayDots.forEach(
      (dot, index) => {

        /*
          Nicht alle Punkte gleichzeitig.

          Dadurch wirkt es eher wie
          echter Overspray.
        */

        const delay =
          250 +
          index * 150 +
          Math.random() * 350;


        window.setTimeout(
          () => {

            dot.classList.add(
              "active"
            );

          },
          delay
        );

      }
    );


    /* =====================================================
       SPRAYWOLKE POSITIONIEREN
    ====================================================== */

    const moveSprayCloud =
      (progress) => {

        /*
          Die Wolke bewegt sich von
          3% bis 97% des Logos.
        */

        const position =
          3 +
          progress * 94;


        sprayCloud.style.left =
          `${position}%`;

      };


    /* =====================================================
       ANIMATION
    ====================================================== */

    const animationStart =
      performance.now();


    const animate =
      (currentTime) => {

        const elapsed =
          currentTime -
          animationStart;


        let progress =
          elapsed /
          animationDuration;


        /*
          Auf 0–1 begrenzen.
        */

        progress =
          Math.max(
            0,
            Math.min(
              1,
              progress
            )
          );


        /*
          Leichtes Anfahren.

          Am Anfang langsam,
          danach wird schneller gesprüht.
        */

        const easedProgress =
          1 -
          Math.pow(
            1 - progress,
            2
          );


        /*
          Breite des sichtbaren
          Bereichs im SVG.
        */

        const currentWidth =
          startWidth +
          (
            endWidth -
            startWidth
          ) *
          easedProgress;


        /*
          DAS IST DER EIGENTLICHE REVEAL.

          Die blaue Schrift wird
          entlang ihrer tatsächlichen
          Buchstabenform sichtbar,
          sobald die Spraykante
          darüber läuft.
        */

        revealRect.setAttribute(
          "width",
          String(currentWidth)
        );


        /*
          Spraywolke exakt mitführen.
        */

        moveSprayCloud(
          easedProgress
        );


        /*
          Noch nicht fertig?
          Weiter animieren.
        */

        if (
          progress <
          1
        ) {

          requestAnimationFrame(
            animate
          );

          return;

        }


        /* =================================================
           ANIMATION FERTIG
        ================================================== */

        revealRect.setAttribute(
          "width",
          "1000"
        );


        moveSprayCloud(
          1
        );


        /*
          Wolke noch einen kurzen
          Moment stehen lassen.
        */

        window.setTimeout(
          () => {

            sprayCloud.classList.remove(
              "spraying"
            );

            sprayCloud.style.opacity =
              "0";

          },
          500
        );

      };


    /*
      LOS.
    */

    requestAnimationFrame(
      animate
    );

  }
);
