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


/* =========================================
   SKATEBOARD MOUSE CURSOR
========================================= */

if (window.matchMedia("(pointer: fine)").matches) {

  const skateCursor = document.createElement("div");

  skateCursor.className = "skate-cursor";

  skateCursor.innerHTML = `
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >

      <!-- Board -->
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

      <!-- Board highlight -->
      <path
        d="M25 43
           C37 41 62 41 75 43"
        fill="none"
        stroke="#f2f2f2"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.8"
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

      <!-- Wheel details -->
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

  document.body.appendChild(skateCursor);


  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  let cursorX = mouseX;
  let cursorY = mouseY;


  /* =========================================
     SMOOTH MOUSE MOVEMENT
  ========================================= */

  document.addEventListener("mousemove", (event) => {

    mouseX = event.clientX;
    mouseY = event.clientY;

    skateCursor.classList.remove("hidden");

  });


  function animateCursor() {

    cursorX += (mouseX - cursorX) * 0.18;
    cursorY += (mouseY - cursorY) * 0.18;

    skateCursor.style.transform =
      `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%) rotate(-8deg)`;

    requestAnimationFrame(animateCursor);

  }

  animateCursor();


  /* =========================================
     HOVER EFFECT
  ========================================= */

  const hoverElements = document.querySelectorAll(
    "a, button, .image-box, .video-preview, .play-button"
  );

  hoverElements.forEach((element) => {

    element.addEventListener("mouseenter", () => {
      skateCursor.classList.add("hover");
    });

    element.addEventListener("mouseleave", () => {
      skateCursor.classList.remove("hover");
    });

  });


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
     HIDE WHEN LEAVING THE WEBSITE
  ========================================= */

  document.addEventListener("mouseleave", () => {

    skateCursor.classList.add("hidden");

  });


  document.addEventListener("mouseenter", () => {

    skateCursor.classList.remove("hidden");

  });

}
