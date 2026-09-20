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



    /* =========================
       SPRAY LOGO
    ========================= */

    const logo =
      document.getElementById(
        "graffitiLogo"
      );

    const mask =
      document.getElementById(
        "sprayReveal"
      );

    const sprayCloud =
      document.getElementById(
        "sprayCloud"
      );

    const particles =
      document.querySelectorAll(
        ".spray-particle"
      );


    if (
      !logo ||
      !mask ||
      !sprayCloud
    ) {
      return;
    }



    /*
      Wir benutzen keine horizontale
      Reveal-Fläche mehr.

      Stattdessen wird das Logo aus
      vielen einzelnen Spray-Punkten
      aufgebaut.

      Dadurch sieht es so aus,
      als würde Farbe direkt auf die
      Buchstaben gesprüht werden.
    */


    const sprayPoints = [

      /* M */

      [305, 150],
      [320, 132],
      [335, 112],
      [350, 95],
      [365, 118],
      [380, 145],
      [395, 120],
      [410, 100],
      [425, 125],
      [440, 150],


      /* o */

      [455, 150],
      [470, 132],
      [490, 125],
      [510, 132],
      [522, 150],
      [510, 170],
      [490, 178],
      [470, 170],


      /* i */

      [540, 125],
      [540, 150],
      [540, 175],


      /* - */

      [565, 150],
      [585, 150],


      /* c */

      [615, 130],
      [635, 125],
      [650, 140],
      [640, 155],
      [625, 175],
      [610, 168],


      /* y */

      [675, 130],
      [690, 150],
      [705, 175],
      [720, 150],
      [735, 130],
      [725, 160],
      [710, 185]

    ];



    /*
      Erzeugt einen einzelnen
      unregelmäßigen Spraybereich.
    */

    function createSprayPoint(
      x,
      y,
      index
    ) {

      const group =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );


      const main =
        document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );


      main.setAttribute(
        "cx",
        x
      );

      main.setAttribute(
        "cy",
        y
      );

      main.setAttribute(
        "r",
        "20"
      );


      group.appendChild(
        main
      );


      /*
        Kleine zusätzliche Sprühpunkte
        um den Hauptpunkt herum.
      */

      for (
        let i = 0;
        i < 5;
        i++
      ) {

        const dot =
          document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );


        const angle =
          Math.random() *
          Math.PI *
          2;


        const distance =
          12 +
          Math.random() *
          25;


        dot.setAttribute(
          "cx",
          String(
            x +
            Math.cos(angle) *
            distance
          )
        );


        dot.setAttribute(
          "cy",
          String(
            y +
            Math.sin(angle) *
            distance
          )
        );


        dot.setAttribute(
          "r",
          String(
            2 +
            Math.random() *
            5
          )
        );


        group.appendChild(
          dot
        );

      }


      group.style.opacity =
        "0";


      group.dataset.index =
        String(index);


      mask.appendChild(
        group
      );


      return group;

    }



    const sprayGroups =
      sprayPoints.map(
        (
          point,
          index
        ) =>
          createSprayPoint(
            point[0],
            point[1],
            index
          )
      );



    /* =========================
       ANIMATION
    ========================= */

    const duration =
      4800;


    const start =
      performance.now();


    sprayCloud.classList.add(
      "active"
    );



    /*
      Logo bleibt am Anfang komplett
      unsichtbar.

      Die Spraypunkte werden nacheinander
      auf die Buchstaben gesetzt.
    */


    sprayGroups.forEach(
      (
        group,
        index
      ) => {

        window.setTimeout(
          () => {

            group.style.transition =
              "opacity 0.18s ease";

            group.style.opacity =
              "1";

          },
          120 +
          index * 125
        );

      }
    );



    /*
      Sprühwolke bewegt sich über die
      tatsächlich gesetzten Spraypunkte.
    */

    function animate(
      currentTime
    ) {

      const elapsed =
        currentTime -
        start;


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
        Die Wolke folgt der aktuellen
        Sprayposition.
      */

      const pointCount =
        sprayPoints.length;


      const currentIndex =
        Math.min(
          pointCount - 1,
          Math.floor(
            progress *
            pointCount
          )
        );


      const point =
        sprayPoints[
          currentIndex
        ];


      /*
        SVG-Koordinaten werden auf die
        tatsächliche Logo-Position
        umgerechnet.
      */

      const logoRect =
        logo.getBoundingClientRect();


      const x =
        (point[0] / 1000) *
        logoRect.width;


      const y =
        (point[1] / 300) *
        logoRect.height;


      sprayCloud.style.left =
        `${x}px`;


      sprayCloud.style.top =
        `${y}px`;



      /*
        Spraypunkte werden während der
        Bewegung leicht unregelmäßig
        sichtbar.
      */

      sprayGroups.forEach(
        (
          group,
          index
        ) => {

          const threshold =
            index /
            sprayGroups.length;


          if (
            progress >
            threshold
          ) {

            group.style.opacity =
              "1";

          }

        }
      );



      /*
        Partikel werden verteilt
        ausgelöst.
      */

      if (
        progress > 0.08
      ) {

        const particleIndex =
          Math.floor(
            progress *
            particles.length
          );


        if (
          particles[
            particleIndex
          ]
        ) {

          particles[
            particleIndex
          ].classList.add(
            "active"
          );

        }

      }



      if (
        progress <
        1
      ) {

        requestAnimationFrame(
          animate
        );

      } else {

        /*
          Am Ende bleibt das komplette
          Logo sichtbar.
        */

        sprayGroups.forEach(
          (group) => {

            group.style.opacity =
              "1";

          }
        );


        sprayCloud.classList.remove(
          "active"
        );


        sprayCloud.style.opacity =
          "0";

      }

    }


    requestAnimationFrame(
      animate
    );

  }
);
