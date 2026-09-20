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
       GRAFFITI SPRAY
    ========================= */

    const logo =
      document.getElementById(
        "graffitiLogo"
      );

    const svg =
      logo?.querySelector(
        ".graffiti-svg"
      );

    const text =
      document.getElementById(
        "logoText"
      );

    const maskLetters =
      document.getElementById(
        "maskLetters"
      );

    const sprayHead =
      document.getElementById(
        "sprayHead"
      );

    const paintDrops =
      document.querySelectorAll(
        ".paint-drop"
      );


    if (
      !logo ||
      !svg ||
      !text ||
      !maskLetters ||
      !sprayHead
    ) {
      return;
    }



    /*
      WICHTIG:

      Wir lesen jetzt die tatsächliche
      Breite des Textes aus dem Browser.

      Dadurch liegen die Spraypunkte
      wirklich auf "Moi-cy" und nicht
      irgendwo daneben.
    */


    const letters =
      Array.from(
        "Moi-cy"
      );


    const textLength =
      text.getComputedTextLength();


    const startX =
      500 -
      textLength / 2;


    /*
      Abstand der einzelnen Buchstaben.
    */

    let currentX =
      startX;



    /*
      Jeder Buchstabe bekommt eine
      eigene Spraymaske.

      Die Maske wächst vom Zentrum
      des jeweiligen Buchstabens aus.

      Dadurch entsteht nicht mehr
      der langweilige Links-nach-Rechts-
      Effekt.
    */

    const letterData = [];


    letters.forEach(
      (
        letter,
        index
      ) => {


        const temp =
          document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
          );


        temp.textContent =
          letter;


        temp.setAttribute(
          "x",
          String(currentX)
        );


        temp.setAttribute(
          "y",
          "205"
        );


        temp.setAttribute(
          "class",
          "graffiti-text"
        );


        temp.setAttribute(
          "font-size",
          "190"
        );


        temp.setAttribute(
          "font-family",
          "Rubik Dirt"
        );


        temp.setAttribute(
          "font-weight",
          "900"
        );


        temp.setAttribute(
          "fill",
          "white"
        );


        /*
          Damit wir die exakte Breite
          dieses Buchstabens bekommen.
        */

        svg.appendChild(
          temp
        );


        const width =
          temp.getComputedTextLength();


        svg.removeChild(
          temp
        );


        const centerX =
          currentX +
          width / 2;


        letterData.push(
          {
            letter,
            x: centerX,
            y: 155,
            width
          }
        );


        currentX +=
          width;

      }
    );



    /*
      Für jeden Buchstaben wird eine
      weiche Sprayfläche erzeugt.
    */

    letterData.forEach(
      (
        item,
        index
      ) => {

        const group =
          document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
          );


        const circle =
          document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );


        circle.setAttribute(
          "cx",
          String(item.x)
        );


        circle.setAttribute(
          "cy",
          String(item.y)
        );


        circle.setAttribute(
          "r",
          "0"
        );


        circle.setAttribute(
          "fill",
          "white"
        );


        group.appendChild(
          circle
        );


        maskLetters.appendChild(
          group
        );


        letterData[
          index
        ].circle =
          circle;

      }
    );



    /*
      Das ursprüngliche Text-Element
      bleibt für die eigentliche Schrift
      zuständig.

      Die Kreise bestimmen nur,
      welche Bereiche bereits sichtbar
      sind.
    */


    const duration =
      2800;


    const startTime =
      performance.now();


    sprayHead.classList.add(
      "active"
    );



    /*
      Kleine Farbspritzer werden
      nacheinander ausgelöst.
    */

    paintDrops.forEach(
      (
        drop,
        index
      ) => {

        window.setTimeout(
          () => {

            drop.classList.add(
              "active"
            );

          },
          180 +
          index * 145
        );

      }
    );



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
        Sehr weiches Timing.
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
        Aktueller Buchstabe.
      */

      const total =
        letterData.length;


      const floatingIndex =
        eased *
        total;


      const currentIndex =
        Math.min(
          total - 1,
          Math.floor(
            floatingIndex
          )
        );


      const current =
        letterData[
          currentIndex
        ];


      /*
        Der Sprühkopf sitzt direkt
        am aktuellen Buchstaben.
      */

      if (current) {

        const logoRect =
          logo.getBoundingClientRect();


        const x =
          (
            current.x /
            1000
          ) *
          logoRect.width;


        const y =
          (
            current.y /
            300
          ) *
          logoRect.height;


        sprayHead.style.left =
          `${x}px`;


        sprayHead.style.top =
          `${y}px`;

      }



      /*
        Jeder Buchstabe wird mit
        einer runden Spraybewegung
        aufgebaut.
      */

      letterData.forEach(
        (
          item,
          index
        ) => {

          const begin =
            index /
            total;


          const end =
            (
              index + 1
            ) /
            total;


          let localProgress =
            (
              eased -
              begin
            ) /
            (
              end -
              begin
            );


          localProgress =
            Math.max(
              0,
              Math.min(
                1,
                localProgress
              )
            );


          /*
            Weiches Wachstum der
            Sprayfläche.
          */

          const radius =
            localProgress *
            (
              item.width *
              0.72 +
              90
            );


          item.circle.setAttribute(
            "r",
            String(radius)
          );

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
          Sicherheit:
          am Ende ist das komplette
          Logo sichtbar.
        */

        letterData.forEach(
          (
            item
          ) => {

            item.circle.setAttribute(
              "r",
              "500"
            );

          }
        );


        /*
          Spraykopf noch kurz stehen
          lassen und dann verschwinden.
        */

        window.setTimeout(
          () => {

            sprayHead.classList.remove(
              "active"
            );

          },
          220
        );

      }

    }


    requestAnimationFrame(
      animate
    );

  }
);
