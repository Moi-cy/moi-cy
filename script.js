/* =========================================
   MOI-CY — JAVASCRIPT
========================================= */


/* =========================================
   MOBILE MENU
========================================= */

const menuButton = document.getElementById("menuButton");
const navigation = document.querySelector(".navigation");

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


/* =========================================
   SKATEBOARD MOUSE CURSOR
========================================= */

const finePointer = window.matchMedia("(pointer: fine)");

if (finePointer.matches) {

  const skateCursor = document.createElement("div");

  skateCursor.className = "skate-cursor";

  skateCursor.innerHTML = `
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >

      <!-- Skateboard deck -->
      <path
        d="M18 43
           C19 39 23 37 28 38
           L72 38
           C77 37 81 39 82 43
           L80 48
           C79 51 76 53 72 53
           L28 53
           C24 53 21 51 20 48
           Z"
        fill="#00a8ff"
        stroke="#050505"
        stroke-width="3"
      />

      <!-- Deck highlight -->
      <path
        d="M25 43
           C38 41 62 41 75 43"
        fill="none"
        stroke="#f2f2f2"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.85"
      />

      <!-- Front wheel -->
      <circle
        cx="28"
        cy="59"
        r="5"
        fill="#00a8ff"
        stroke="#050505"
        stroke-width="3"
      />

      <!-- Back wheel -->
      <circle
        cx="72"
        cy="59"
        r="5"
        fill="#00a8ff"
        stroke="#050505"
        stroke-width="3"
      />

      <!-- Wheel centers -->
      <circle
        cx="28"
        cy="59"
        r="1.5"
        fill="#f2f2f2"
      />

      <circle
        cx="72"
        cy="59"
        r="1.5"
        fill="#f2f2f2"
      />

    </svg>
  `;


  /* Cursor erst jetzt aktivieren */

  document.body.classList.add("skate-cursor-enabled");

  document.body.appendChild(skateCursor);


  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  let cursorX = mouseX;
  let cursorY = mouseY;

  let mouseInside = false;


  /* =========================================
     MOUSE MOVEMENT
  ========================================= */

  document.addEventListener("mousemove", (event) => {

    mouseX = event.clientX;
    mouseY = event.clientY;

    mouseInside = true;

    skateCursor.classList.add("visible");

  });


  /* =========================================
     SMOOTH FOLLOW
  ========================================= */

  function moveCursor() {

    cursorX += (mouseX - cursorX) * 0.22;
    cursorY += (mouseY - cursorY) * 0.22;

    skateCursor.style.left = `${cursorX}px`;
    skateCursor.style.top = `${cursorY}px`;

    requestAnimationFrame(moveCursor);

  }

  moveCursor();


  /* =========================================
     HOVER EFFECT
  ========================================= */

  function setupHoverElements() {

    const hoverElements = document.querySelectorAll(
      "a, button, input, textarea, select, .image-box, .video-preview, .play-button"
    );

    hoverElements.forEach((element) => {

      element.addEventListener("mouseenter", () => {
        skateCursor.classList.add("hover");
      });

      element.addEventListener("mouseleave", () => {
        skateCursor.classList.remove("hover");
      });

    });

  }

  setupHoverElements();


  /* =========================================
     CLICK EFFECT
  ========================================= */

  document.addEventListener("mousedown", () => {

    skateCursor.classList.add("click");

  });

  document.addEventListener("mouseup", () => {

    skateCursor.classList.remove("click");

  });


  /* =========================================
     HIDE OUTSIDE WINDOW
  ========================================= */

  document.addEventListener("mouseleave", () => {

    mouseInside = false;

    skateCursor.classList.remove("visible");

  });

  document.addEventListener("mouseenter", () => {

    mouseInside = true;

  });


  /* =========================================
     TAB / KEYBOARD FOCUS
  ========================================= */

  document.addEventListener("keydown", (event) => {

    if (event.key === "Tab") {
      skateCursor.classList.remove("visible");
    }

  });


  /* =========================================
     RESTORE AFTER MOUSE MOVEMENT
  ========================================= */

  document.addEventListener("mousemove", () => {

    if (mouseInside) {
      skateCursor.classList.add("visible");
    }

  });

}
