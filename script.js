document.addEventListener(
  "DOMContentLoaded",
  () => {


    /* =========================
       MOBILE MENU
    ========================= */

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

          const open =
            mobileMenu.classList.toggle(
              "active"
            );

          menuButton.setAttribute(
            "aria-expanded",
            String(open)
          );

        }
      );


      mobileMenu
        .querySelectorAll("a")
        .forEach(
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



    /* =========================
       SPRAY LOGO
    ========================= */

    const logo =
      document.getElementById(
        "graffitiLogo"
      );

    const letters =
      document.querySelectorAll(
        ".graffiti-letter"
      );

    const sprayHead =
      document.getElementById(
        "sprayHead"
      );

    const splashes =
      document.querySelectorAll(
        ".paint-splash"
      );


    if (
      !logo ||
      !letters.length ||
      !sprayHead
    ) {

      return;

    }



    /*
      Die Buchstaben werden bewusst
      einzeln angesprüht.

      Dadurch gibt es keine Maske,
      keinen SVG-Fehler und keinen
      Links-nach-Rechts-Wipe.
    */


    const totalLetters =
      letters.length;


    /*
      Geschwindigkeit:

      2,7 Sekunden für das komplette
      Logo.
    */

    const duration =
      2700;


    /*
      Der Mittelpunkt jedes
      Buchstabens wird automatisch
      aus dem echten DOM berechnet.
    */

    function getLetterCenter(
      letter
    ) {

      const logoRect =
        logo.getBoundingClientRect();


      const rect =
        letter.getBoundingClientRect();


      return {

        x:
          rect.left -
          logoRect.left +
          rect.width / 2,

        y:
          rect.top -
          logoRect.top +
          rect.height / 2

      };

    }



    /*
      Kleine zufällige Reihenfolge,
      damit es nicht wie eine simple
      Schreibanimation wirkt.

      M -> o -> i -> -
      -> c -> y bleibt grundsätzlich
      die Leserichtung, aber die
      Übergänge überschneiden sich.
    */

    const sequence = [

      0,
      1,
      2,
      3,
      4,
      5

    ];



    /*
      Alle Buchstaben zuerst
      unsichtbar.
    */

    letters.forEach(
      (letter) => {

        letter.classList.remove(
          "sprayed"
        );

      }
    );



    /*
      Spraykopf aktivieren.
    */

    sprayHead.classList.add(
      "active"
    );



    const startTime =
      performance.now();



    function animate(
      now
    ) {

      const elapsed =
        now -
        startTime;


      let progress =
        elapsed /
        duration;


      progress =
        Math.max(
          0,
          Math.min(
            1,
            progress
          )
        );


      /*
        Weiches Timing.
      */

      const eased =
        progress *
        progress *
        (
          3 -
          2 *
          progress
        );



      /*
        Position des Spraykopfes.

        Er bewegt sich über die
        tatsächlichen Buchstaben,
        nicht über eine künstliche
        Gesamtbreite.
      */

      const floating =
        eased *
        sequence.length;


      const currentIndex =
        Math.min(
          sequence.length - 1,
          Math.floor(
            floating
          )
        );


      const currentLetter =
        letters[
          sequence[
            currentIndex
          ]
        ];


      if (
        currentLetter
      ) {

        const position =
          getLetterCenter(
            currentLetter
          );


        sprayHead.style.left =
          `${position.x}px`;


        sprayHead.style.top =
          `${position.y}px`;

      }



      /*
        Buchstaben erscheinen
        nacheinander, aber mit
        leichter Überlappung.

        So wirkt es wie Sprühen
        statt wie Tippen.
      */

      letters.forEach(
        (
          letter,
          index
        ) => {

          const start =
            (
              index /
              totalLetters
            ) *
            0.78;


          const end =
            start +
            0.24;


          let local =
            (
              eased -
              start
            ) /
            (
              end -
              start
            );


          local =
            Math.max(
              0,
              Math.min(
                1,
                local
              )
            );


          if (
            local > 0
          ) {

            letter.classList.add(
              "sprayed"
            );

          }

        }
      );



      /*
        Kleine Spritzer werden
        entlang der Animation
        eingeblendet.
      */

      splashes.forEach(
        (
          splash,
          index
        ) => {

          const threshold =
            0.12 +
            index *
            0.13;


          if (
            progress >
            threshold
          ) {

            splash.classList.add(
              "active"
            );

          }

        }
      );



      if (
        progress <
        1
      ) {

        requestAnimationFrame(
          animate
        );

      } else {

        /*
          Sicherstellen, dass
          am Ende wirklich
          "Moi-cy" vollständig
          sichtbar ist.
        */

        letters.forEach(
          (letter) => {

            letter.classList.add(
              "sprayed"
            );

          }
        );


        /*
          Spraywolke noch einen
          kurzen Moment stehen lassen.
        */

        window.setTimeout(
          () => {

            sprayHead.classList.remove(
              "active"
            );

          },
          350
        );

      }

    }


    requestAnimationFrame(
      animate
    );

  }
);
