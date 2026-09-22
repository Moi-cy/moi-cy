/* =========================================
   MOI-CY — SHARED COMPONENTS
   Header & Footer
========================================= */

document.addEventListener("DOMContentLoaded", async () => {

    /* =========================================
       LOAD HEADER
    ========================================= */

    const headerContainer =
        document.getElementById("site-header");

    if (headerContainer) {

        try {

            const response =
                await fetch("header.html");

            if (!response.ok) {
                throw new Error(
                    `Header konnte nicht geladen werden: ${response.status}`
                );
            }

            const headerHTML =
                await response.text();

            headerContainer.innerHTML =
                headerHTML;

        } catch (error) {

            console.error(
                "Moi-cy: Header konnte nicht geladen werden.",
                error
            );

        }

    }


    /* =========================================
       LOAD FOOTER
    ========================================= */

    const footerContainer =
        document.getElementById("site-footer");

    if (footerContainer) {

        try {

            const response =
                await fetch("footer.html");

            if (!response.ok) {
                throw new Error(
                    `Footer konnte nicht geladen werden: ${response.status}`
                );
            }

            const footerHTML =
                await response.text();

            footerContainer.innerHTML =
                footerHTML;

        } catch (error) {

            console.error(
                "Moi-cy: Footer konnte nicht geladen werden.",
                error
            );

        }

    }


    /* =========================================
       MOBILE MENU
    ========================================= */

    const menuButton =
        document.getElementById("menuButton");

    const mobileMenu =
        document.getElementById("mobileMenu");


    if (menuButton && mobileMenu) {

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
            .forEach((link) => {

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

            });

    }


    /* =========================================
       ACTIVE NAVIGATION
    ========================================= */

    const currentPage =
        window.location.pathname
            .split("/")
            .pop() || "index.html";


    document
        .querySelectorAll(
            ".main-nav a, .mobile-menu a"
        )
        .forEach((link) => {

            const linkPage =
                link
                    .getAttribute("href")
                    ?.split("/")
                    .pop();


            if (
                linkPage === currentPage
            ) {

                link.classList.add(
                    "active"
                );

            }

        });

});
