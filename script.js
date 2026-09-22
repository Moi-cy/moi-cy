document.addEventListener("DOMContentLoaded", async () => {

  /* =========================================
     MOI-CY — GLOBAL JAVASCRIPT
     DE / EN / FR
  ========================================= */

  /* =========================================
     SHARED COMPONENTS
  ========================================= */

  async function loadComponent(id, file) {
    const container = document.getElementById(id);

    if (!container) {
      return false;
    }

    try {
      const response = await fetch(file, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} beim Laden von ${file}`
        );
      }

      container.innerHTML = await response.text();

      return true;

    } catch (error) {

      console.error(
        `Moi-cy: ${file} konnte nicht geladen werden.`,
        error
      );

      return false;
    }
  }


  /*
     Header und Footer zuerst laden.
     Erst danach werden Menü, Sprache usw.
     eingerichtet.
  */

  await Promise.all([
    loadComponent("site-header", "header.html"),
    loadComponent("site-footer", "footer.html")
  ]);


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

      document.body.classList.toggle(
        "menu-open",
        open
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

          document.body.classList.remove(
            "menu-open"
          );
        });

      });

  }


  /* =========================================
     LANGUAGE
  ========================================= */

  const LANGUAGE_KEY = "moiCyLanguage";

  const supportedLanguages = [
    "de",
    "en",
    "fr"
  ];


  /* =========================================
     TRANSLATIONS
  ========================================= */

  const translations = {

    de: {

      nav_home: "HOME",
      nav_images: "BILDER",
      nav_videos: "VIDEOS",
      nav_skateparks: "SKATEPLÄTZE",
      nav_contact: "KONTAKT",
      nav_shop: "SHOP",

      language_switcher: "Sprache",
      menu_open: "Menü öffnen",

      what_is_moicy: "WHAT IS Moi-cy?",
      about_moicy: "ABOUT Moi-cy",

      the_story: "THE STORY",

      story_text_1:
        "Skateboarding ist mehr als nur ein Sport.",

      story_text_2:
        "Es geht um Bewegung, Kreativität, Freiheit und darum, immer wieder neue Wege zu finden.",

      story_text_3:
        "Moi-cy entstand aus der Leidenschaft für Skateboarding und dem Wunsch, diese Begeisterung mit anderen zu teilen.",

      story_text_4:
        "Seit März 2023 geht es um Skateboarding, kreative Projekte, neue Spots und die Menschen dahinter.",

      story_text_5:
        "Street, Pool oder Bowl – am Ende geht es darum, rauszugehen, zu skaten und neue Dinge zu entdecken.",

      story_intro:
        "Ein kleiner Einblick in die Welt von Moi-cy.",

      visual_archive: "VISUAL ARCHIVE",
      moments: "MOMENTS.",
      watch: "WATCH",
      on_the_move: "ON THE MOVE.",
      skate_session: "SKATE SESSION #01",

      current: "CURRENT",
      current_moicy: "Moi-cy",
      keep_moving: "keep moving.",

      find_your_line: "FIND YOUR LINE.",

      skate: "SKATE",
      create: "CREATE",
      explore: "EXPLORE",

      from_streets:
        "FROM THE streets TO EVERYWHERE.",

      skatepark_reviews:
        "SKATEPLATZ-BEWERTUNGEN",

      skatepark_reviews_text:
        "Skateplätze entdecken, ansehen und bewerten.",

      discover_skateparks:
        "SKATEPLÄTZE ENTDECKEN",

      images_page_title:
        "Bilder – Moi-cy",

      images_meta_description:
        "Bilder von Moi-cy – Skateboarding, Sessions und Skateparks.",

      images_label:
        "MOI-CY / BILDER",

      images_title:
        "Bilder",

      images_close:
        "Bild schließen",

      images_previous:
        "Vorheriges Bild",

      images_next:
        "Nächstes Bild",

      images_gallery:
        "ZUR BILDERGALERIE",

      view_all_images:
        "ALLE BILDER ANSEHEN",

      videos_page_title:
        "Videos – Moi-cy",

      videos_meta_description:
        "Videos von Moi-cy – Skate Sessions, Clips und mehr.",

      videos_label:
        "MOI-CY / VIDEOS",

      videos_title:
        "Videos",

      video_watch:
        "VIDEO ANSEHEN",

      all_videos:
        "ALLE VIDEOS",

      skateparks_page_title:
        "Skateplätze – Moi-cy",

      skateparks_meta_description:
        "Skateplätze von Moi-cy – Bewertungen, Bilder und Standorte.",

      skateparks_label:
        "MOI-CY / SKATEPLÄTZE",

      skateparks_title:
        "Skateplätze",

      search_skatepark:
        "SKATEPARK SUCHEN",

      search_placeholder:
        "Name, Stadt oder Land...",

      country:
        "LAND",

      all_countries:
        "Alle Länder",

      sort:
        "SORTIEREN",

      city_az:
        "Stadt A–Z",

      city_za:
        "Stadt Z–A",

      rating_high_low:
        "Bewertung hoch → niedrig",

      rating_low_high:
        "Bewertung niedrig → hoch",

      images_count:
        "4 BILDER",

      no_skatepark:
        "KEIN SKATEPLATZ GEFUNDEN.",

      gallery_close:
        "Galerie schließen",

      previous_image:
        "Vorheriges Bild",

      next_image:
        "Nächstes Bild",

      image_number:
        "Bild",

      france:
        "FRANKREICH",

      germany:
        "DEUTSCHLAND",

      valence_location:
        "VALENCE · FRANKREICH",

      valence_description:
        "Dieser Skateplatz hat nicht viel zu bieten – im Grunde besteht er nur aus einem Pool. Dafür ist dieser Pool wirklich stark. Man kann richtig gut Schwung holen, und durch seine Größe macht er besonders viel Spaß. Genau mein Ding.",

      karlsruhe_location:
        "KARLSRUHE · DEUTSCHLAND",

      karlsruhe_description:
        "Dieser Skateplatz verfügt über einen Pool und bietet außerdem eine Beleuchtung bis 22:00 Uhr. Dazu kommt ein guter, glatter Boden, der sich sehr angenehm fahren lässt.",

      heidelberg_location:
        "HEIDELBERG · DEUTSCHLAND",

      heidelberg_description:
        "In Heidelberg ist 24 Stunden am Tag Licht vorhanden. Außerdem liegt der Skateplatz unter einer Brücke und ist dadurch überdacht. So kann man dort praktisch jederzeit fahren.",

      heidelberg_bowl_location:
        "HEIDELBERG BOWL · DEUTSCHLAND",

      heidelberg_bowl_description:
        "Eine sehr tolle Bowl mit einem glatten und gut fahrbaren Untergrund. Man bekommt hier sehr gut Schwung und kann die Bowl richtig gut fahren. Äußerst empfehlenswert.",

      perpignan_location:
        "PERPIGNAN · FRANKREICH",

      perpignan_description:
        "Ein unfassbar großer Park mit Beleuchtung bis 22 Uhr. Neben den riesigen Bowls gibt es dort auch einen großen Pumptrack. Besonders in den Bowls kann man sehr gut das Fahren üben.",

      muenchen_location:
        "MÜNCHEN HIRSCHGARTEN · DEUTSCHLAND",

      muenchen_description:
        "Ein Park, der aus zwei großen Bowls besteht: einer kleineren Anfänger-Bowl und einer größeren Bowl. Zusätzlich gibt es eine 360-Grad-Röhre.",

      shop_page_title:
        "Shop – Moi-cy",

      shop_meta_description:
        "Moi-cy Shop – Kleidung und Produkte.",

      shop_label:
        "MOI-CY / SHOP",

      shop_title:
        "Shop",

      zazzle_shop_open:
        "Zazzle Shop öffnen",

      zazzle_shop_alt:
        "Moi-cy Produkte im Zazzle Shop",

      zazzle_shop_button:
        "ZAZZLE SHOP ÖFFNEN",

      teamshirts_shop_open:
        "TeamShirts Shop öffnen",

      teamshirts_shop_alt:
        "Moi-cy Produkte im TeamShirts Shop",

      teamshirts_shop_button:
        "TEAMSHIRTS SHOP ÖFFNEN",

      contact_page_title:
        "Kontakt – Moi-cy",

      contact_meta_description:
        "Kontakt zu Moi-cy.",

      contact_label:
        "MOI-CY / KONTAKT",

      contact_title:
        "Kontakt",

      contact_name_label:
        "NAME",

      contact_name_placeholder:
        "Dein Name",

      contact_email_label:
        "E-MAIL",

      contact_email_placeholder:
        "deine@email.de",

      contact_message_label:
        "NACHRICHT",

      contact_message_placeholder:
        "Deine Nachricht...",

      contact_submit:
        "NACHRICHT SENDEN",

      contact_subject:
        "Neue Nachricht über Moi-cy"
    },


    en: {

      nav_home: "HOME",
      nav_images: "IMAGES",
      nav_videos: "VIDEOS",
      nav_skateparks: "SKATEPARKS",
      nav_contact: "CONTACT",
      nav_shop: "SHOP",

      language_switcher: "Language",
      menu_open: "Open menu",

      what_is_moicy: "WHAT IS Moi-cy?",
      about_moicy: "ABOUT Moi-cy",

      the_story: "THE STORY",

      story_text_1:
        "Skateboarding is more than just a sport.",

      story_text_2:
        "It’s about movement, creativity, freedom, and finding new ways to move.",

      story_text_3:
        "Moi-cy grew out of a passion for skateboarding and the desire to share that passion with others.",

      story_text_4:
        "Since March 2023, it has been about skateboarding, creative projects, new spots and the people behind them.",

      story_text_5:
        "Street, pool or bowl – in the end, it’s about getting out, skating and discovering new things.",

      story_intro:
        "A small glimpse into the world of Moi-cy.",

      visual_archive:
        "VISUAL ARCHIVE",

      moments:
        "MOMENTS.",

      watch:
        "WATCH",

      on_the_move:
        "ON THE MOVE.",

      skate_session:
        "SKATE SESSION #01",

      current:
        "CURRENT",

      current_moicy:
        "Moi-cy",

      keep_moving:
        "keep moving.",

      find_your_line:
        "FIND YOUR LINE.",

      skate:
        "SKATE",

      create:
        "CREATE",

      explore:
        "EXPLORE",

      from_streets:
        "FROM THE streets TO EVERYWHERE.",

      skatepark_reviews:
        "SKATEPARK REVIEWS",

      skatepark_reviews_text:
        "Discover, explore and rate skateparks.",

      discover_skateparks:
        "DISCOVER SKATEPARKS",

      images_page_title:
        "Images – Moi-cy",

      images_meta_description:
        "Images from Moi-cy – skateboarding, sessions and skateparks.",

      images_label:
        "MOI-CY / IMAGES",

      images_title:
        "Images",

      images_close:
        "Close image",

      images_previous:
        "Previous image",

      images_next:
        "Next image",

      images_gallery:
        "TO THE PHOTO GALLERY",

      view_all_images:
        "VIEW ALL IMAGES",

      videos_page_title:
        "Videos – Moi-cy",

      videos_meta_description:
        "Videos from Moi-cy – skate sessions, clips and more.",

      videos_label:
        "MOI-CY / VIDEOS",

      videos_title:
        "Videos",

      video_watch:
        "WATCH VIDEO",

      all_videos:
        "ALL VIDEOS",

      skateparks_page_title:
        "Skateparks – Moi-cy",

      skateparks_meta_description:
        "Skateparks from Moi-cy – reviews, images and locations.",

      skateparks_label:
        "MOI-CY / SKATEPARKS",

      skateparks_title:
        "Skateparks",

      search_skatepark:
        "SEARCH SKATEPARK",

      search_placeholder:
        "Name, city or country...",

      country:
        "COUNTRY",

      all_countries:
        "All countries",

      sort:
        "SORT",

      city_az:
        "City A–Z",

      city_za:
        "City Z–A",

      rating_high_low:
        "Rating high → low",

      rating_low_high:
        "Rating low → high",

      images_count:
        "4 IMAGES",

      no_skatepark:
        "NO SKATEPARK FOUND.",

      gallery_close:
        "Close gallery",

      previous_image:
        "Previous image",

      next_image:
        "Next image",

      image_number:
        "Image",

      france:
        "FRANCE",

      germany:
        "GERMANY",

      valence_location:
        "VALENCE · FRANCE",

      valence_description:
        "This skatepark doesn’t offer much – basically, it consists of a single pool. But that pool is seriously good. You can build up speed really well, and its size makes it especially fun. Exactly my kind of spot.",

      karlsruhe_location:
        "KARLSRUHE · GERMANY",

      karlsruhe_description:
        "This skatepark has a pool and is also lit until 10:00 PM. It also has a good, smooth surface that feels great to ride.",

      heidelberg_location:
        "HEIDELBERG · GERMANY",

      heidelberg_description:
        "In Heidelberg, the lights are on 24 hours a day. The skatepark is also located under a bridge, so it is covered. That means you can ride there practically anytime.",

      heidelberg_bowl_location:
        "HEIDELBERG BOWL · GERMANY",

      heidelberg_bowl_description:
        "A really great bowl with a smooth, rideable surface. You can build up speed very well here and ride the bowl really well. Highly recommended.",

      perpignan_location:
        "PERPIGNAN · FRANCE",

      perpignan_description:
        "An unbelievably large park with lights until 10:00 PM. Besides the huge bowls, there is also a large pump track. The bowls are especially good for practicing.",

      muenchen_location:
        "MUNICH HIRSCHGARTEN · GERMANY",

      muenchen_description:
        "A park made up of two large bowls: a smaller beginner bowl and a larger bowl. There is also a 360-degree tube.",

      shop_page_title:
        "Shop – Moi-cy",

      shop_meta_description:
        "Moi-cy Shop – clothing and products.",

      shop_label:
        "MOI-CY / SHOP",

      shop_title:
        "Shop",

      zazzle_shop_open:
        "Open Zazzle Shop",

      zazzle_shop_alt:
        "Moi-cy products in the Zazzle Shop",

      zazzle_shop_button:
        "OPEN ZAZZLE SHOP",

      teamshirts_shop_open:
        "Open TeamShirts Shop",

      teamshirts_shop_alt:
        "Moi-cy products in the TeamShirts Shop",

      teamshirts_shop_button:
        "OPEN TEAMSHIRTS SHOP",

      contact_page_title:
        "Contact – Moi-cy",

      contact_meta_description:
        "Contact Moi-cy.",

      contact_label:
        "MOI-CY / CONTACT",

      contact_title:
        "Contact",

      contact_name_label:
        "NAME",

      contact_name_placeholder:
        "Your name",

      contact_email_label:
        "E-MAIL",

      contact_email_placeholder:
        "your@email.com",

      contact_message_label:
        "MESSAGE",

      contact_message_placeholder:
        "Your message...",

      contact_submit:
        "SEND MESSAGE",

      contact_subject:
        "New message via Moi-cy"
    },


    fr: {

      nav_home: "ACCUEIL",
      nav_images: "PHOTOS",
      nav_videos: "VIDÉOS",
      nav_skateparks: "SKATEPARKS",
      nav_contact: "CONTACT",
      nav_shop: "SHOP",

      language_switcher: "Langue",
      menu_open: "Ouvrir le menu",

      what_is_moicy:
        "WHAT IS Moi-cy?",

      about_moicy:
        "ABOUT Moi-cy",

      the_story:
        "THE STORY",

      story_text_1:
        "Le skateboard, c’est plus qu’un sport.",

      story_text_2:
        "C’est une question de mouvement, de créativité, de liberté et de nouvelles façons d’avancer.",

      story_text_3:
        "Moi-cy est né d’une passion pour le skateboard et de l’envie de partager cette passion avec les autres.",

      story_text_4:
        "Depuis mars 2023, il s’agit de skateboard, de projets créatifs, de nouveaux spots et des personnes qui les font vivre.",

      story_text_5:
        "Street, pool ou bowl – au final, l’essentiel est de sortir, de skater et de découvrir de nouvelles choses.",

      story_intro:
        "Un petit aperçu de l’univers de Moi-cy.",

      visual_archive:
        "VISUAL ARCHIVE",

      moments:
        "MOMENTS.",

      watch:
        "WATCH",

      on_the_move:
        "ON THE MOVE.",

      skate_session:
        "SKATE SESSION #01",

      current:
        "CURRENT",

      current_moicy:
        "Moi-cy",

      keep_moving:
        "keep moving.",

      find_your_line:
        "FIND YOUR LINE.",

      skate:
        "SKATE",

      create:
        "CREATE",

      explore:
        "EXPLORE",

      from_streets:
        "FROM THE streets TO EVERYWHERE.",

      skatepark_reviews:
        "ÉVALUATIONS DES SKATEPARKS",

      skatepark_reviews_text:
        "Découvrez, explorez et évaluez les skateparks.",

      discover_skateparks:
        "DÉCOUVRIR LES SKATEPARKS",

      images_page_title:
        "Photos – Moi-cy",

      images_meta_description:
        "Photos de Moi-cy – skateboard, sessions et skateparks.",

      images_label:
        "MOI-CY / PHOTOS",

      images_title:
        "Photos",

      images_close:
        "Fermer l’image",

      images_previous:
        "Image précédente",

      images_next:
        "Image suivante",

      images_gallery:
        "VERS LA GALERIE PHOTO",

      view_all_images:
        "VOIR TOUTES LES PHOTOS",

      videos_page_title:
        "Vidéos – Moi-cy",

      videos_meta_description:
        "Vidéos de Moi-cy – sessions de skate, clips et plus encore.",

      videos_label:
        "MOI-CY / VIDÉOS",

      videos_title:
        "Vidéos",

      video_watch:
        "REGARDER LA VIDÉO",

      all_videos:
        "TOUTES LES VIDÉOS",

      skateparks_page_title:
        "Skateparks – Moi-cy",

      skateparks_meta_description:
        "Skateparks de Moi-cy – évaluations, photos et emplacements.",

      skateparks_label:
        "MOI-CY / SKATEPARKS",

      skateparks_title:
        "Skateparks",

      search_skatepark:
        "RECHERCHER UN SKATEPARK",

      search_placeholder:
        "Nom, ville ou pays...",

      country:
        "PAYS",

      all_countries:
        "Tous les pays",

      sort:
        "TRIER",

      city_az:
        "Ville A–Z",

      city_za:
        "Ville Z–A",

      rating_high_low:
        "Note haute → basse",

      rating_low_high:
        "Note basse → haute",

      images_count:
        "4 PHOTOS",

      no_skatepark:
        "AUCUN SKATEPARK TROUVÉ.",

      gallery_close:
        "Fermer la galerie",

      previous_image:
        "Image précédente",

      next_image:
        "Image suivante",

      image_number:
        "Image",

      france:
        "FRANCE",

      germany:
        "ALLEMAGNE",

      valence_location:
        "VALENCE · FRANCE",

      valence_description:
        "Ce skatepark n’offre pas grand-chose – il se compose essentiellement d’un seul pool. Mais ce pool est vraiment excellent. On peut très bien prendre de la vitesse et sa taille le rend particulièrement agréable à rider. Exactement le genre de spot que j’aime.",

      karlsruhe_location:
        "KARLSRUHE · ALLEMAGNE",

      karlsruhe_description:
        "Ce skatepark dispose d’un pool et est éclairé jusqu’à 22 h. Il offre également un sol lisse et agréable à rider.",

      heidelberg_location:
        "HEIDELBERG · ALLEMAGNE",

      heidelberg_description:
        "À Heidelberg, les lumières sont allumées 24 heures sur 24. Le skatepark se trouve également sous un pont, il est donc couvert. On peut ainsi y rider pratiquement à tout moment.",

      heidelberg_bowl_location:
        "HEIDELBERG BOWL · ALLEMAGNE",

      heidelberg_bowl_description:
        "Un super bowl avec une surface lisse et agréable à rider. On peut très bien prendre de la vitesse et profiter pleinement du bowl. Je le recommande vivement.",

      perpignan_location:
        "PERPIGNAN · FRANCE",

      perpignan_description:
        "Un skatepark immense avec un éclairage jusqu’à 22 h. En plus des énormes bowls, il y a aussi un grand pumptrack. Les bowls sont particulièrement adaptés pour s’entraîner.",

      muenchen_location:
        "MUNICH HIRSCHGARTEN · ALLEMAGNE",

      muenchen_description:
        "Un park composé de deux grands bowls : un bowl plus petit pour les débutants et un bowl plus grand. Il y a également un tube à 360 degrés.",

      shop_page_title:
        "Shop – Moi-cy",

      shop_meta_description:
        "Shop Moi-cy – vêtements et produits.",

      shop_label:
        "MOI-CY / SHOP",

      shop_title:
        "Shop",

      zazzle_shop_open:
        "Ouvrir la boutique Zazzle",

      zazzle_shop_alt:
        "Produits Moi-cy dans la boutique Zazzle",

      zazzle_shop_button:
        "OUVRIR LA BOUTIQUE ZAZZLE",

      teamshirts_shop_open:
        "Ouvrir la boutique TeamShirts",

      teamshirts_shop_alt:
        "Produits Moi-cy dans la boutique TeamShirts",

      teamshirts_shop_button:
        "OUVRIR LA BOUTIQUE TEAMSHIRTS",

      contact_page_title:
        "Contact – Moi-cy",

      contact_meta_description:
        "Contacter Moi-cy.",

      contact_label:
        "MOI-CY / CONTACT",

      contact_title:
        "Contact",

      contact_name_label:
        "NOM",

      contact_name_placeholder:
        "Votre nom",

      contact_email_label:
        "E-MAIL",

      contact_email_placeholder:
        "votre@email.com",

      contact_message_label:
        "MESSAGE",

      contact_message_placeholder:
        "Votre message...",

      contact_submit:
        "ENVOYER LE MESSAGE",

      contact_subject:
        "Nouveau message via Moi-cy"
    }

  };


  /* =========================================
     LANGUAGE STORAGE
  ========================================= */

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


  /* =========================================
     TRANSLATION HELPERS
  ========================================= */

  function getTranslation(language, key) {

    if (
      translations[language] &&
      translations[language][key]
    ) {
      return translations[language][key];
    }

    return null;
  }


  function translateCountryOptions(language) {

    const countryFilter =
      document.getElementById("countryFilter");

    if (!countryFilter) {
      return;
    }

    countryFilter
      .querySelectorAll("option")
      .forEach((option) => {

        const value =
          option.value;


        if (
          value === "Deutschland"
        ) {

          const translated =
            getTranslation(
              language,
              "germany"
            );

          if (translated) {
            option.textContent =
              translated;
          }

        }


        if (
          value === "Frankreich"
        ) {

          const translated =
            getTranslation(
              language,
              "france"
            );

          if (translated) {
            option.textContent =
              translated;
          }

        }


        if (
          value === "" ||
          value === "all"
        ) {

          const translated =
            getTranslation(
              language,
              "all_countries"
            );

          if (translated) {
            option.textContent =
              translated;
          }

        }

      });

  }


  /* =========================================
     TRANSLATE PAGE
  ========================================= */

  function translatePage(language) {

    const dictionary =
      translations[language];

    if (!dictionary) {
      return;
    }


    /* normale Texte */

    document
      .querySelectorAll("[data-i18n]")
      .forEach((element) => {

        const key =
          element.dataset.i18n;

        const translated =
          getTranslation(
            language,
            key
          );

        if (translated !== null) {
          element.textContent =
            translated;
        }

      });


    /* Placeholder */

    document
      .querySelectorAll("[data-i18n-placeholder]")
      .forEach((element) => {

        const key =
          element.dataset.i18nPlaceholder;

        const translated =
          getTranslation(
            language,
            key
          );

        if (translated !== null) {
          element.placeholder =
            translated;
        }

      });


    /* Value */

    document
      .querySelectorAll("[data-i18n-value]")
      .forEach((element) => {

        const key =
          element.dataset.i18nValue;

        const translated =
          getTranslation(
            language,
            key
          );

        if (translated !== null) {
          element.value =
            translated;
        }

      });


    /* Title */

    document
      .querySelectorAll("[data-i18n-title-attr]")
      .forEach((element) => {

        const key =
          element.dataset.i18nTitleAttr;

        const translated =
          getTranslation(
            language,
            key
          );

        if (translated !== null) {
          element.title =
            translated;
        }

      });


    /* ARIA */

    document
      .querySelectorAll("[data-i18n-aria]")
      .forEach((element) => {

        const key =
          element.dataset.i18nAria;

        const translated =
          getTranslation(
            language,
            key
          );

        if (translated !== null) {

          element.setAttribute(
            "aria-label",
            translated
          );

        }

      });


    /* ALT */

    document
      .querySelectorAll("[data-i18n-alt]")
      .forEach((element) => {

        const key =
          element.dataset.i18nAlt;

        const translated =
          getTranslation(
            language,
            key
          );

        if (translated !== null) {
          element.alt =
            translated;
        }

      });


    /* Page Title */

    const titleElement =
      document.querySelector(
        "[data-i18n-title]"
      );

    if (titleElement) {

      const key =
        titleElement.dataset.i18nTitle;

      const translated =
        getTranslation(
          language,
          key
        );

      if (translated !== null) {

        document.title =
          translated;

      }

    }


    /* Meta Description */

    const descriptionElement =
      document.querySelector(
        'meta[data-i18n-description]'
      );

    if (descriptionElement) {

      const key =
        descriptionElement.dataset.i18nDescription;

      const translated =
        getTranslation(
          language,
          key
        );

      if (translated !== null) {

        descriptionElement.setAttribute(
          "content",
          translated
        );

      }

    }


    /* HTML Language */

    document.documentElement.lang =
      language;


    /* Language Buttons */

    document
      .querySelectorAll(
        "[data-lang], [data-language]"
      )
      .forEach((button) => {

        const buttonLanguage =
          button.dataset.lang ||
          button.dataset.language;

        const active =
          buttonLanguage === language;


        button.classList.toggle(
          "active",
          active
        );


        button.setAttribute(
          "aria-pressed",
          String(active)
        );

      });


    /* Country Filter */

    translateCountryOptions(
      language
    );


    /* Counts */

    document
      .querySelectorAll("[data-i18n-count]")
      .forEach((element) => {

        const key =
          element.dataset.i18nCount;

        const translated =
          getTranslation(
            language,
            key
          );

        if (translated !== null) {

          element.textContent =
            translated;

        }

      });

  }


  /* =========================================
     LANGUAGE BUTTONS
  ========================================= */

  document
    .querySelectorAll(
      "[data-lang], [data-language]"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const language =
            button.dataset.lang ||
            button.dataset.language;


          if (
            !supportedLanguages.includes(
              language
            )
          ) {
            return;
          }


          saveLanguage(
            language
          );


          translatePage(
            language
          );


          if (window.MoiCy) {

            window.MoiCy.language =
              language;

          }

        }
      );

    });


  /* =========================================
     INITIAL LANGUAGE
  ========================================= */

  const currentLanguage =
    getSavedLanguage();


  translatePage(
    currentLanguage
  );


  /* =========================================
     ACTIVE NAVIGATION
  ========================================= */

  const currentPage =
    window.location.pathname
      .split("/")
      .pop() || "index.html";


  document
    .querySelectorAll(
      ".main-nav a, .mobile-menu nav a, .footer-links a"
    )
    .forEach((link) => {

      const href =
        link.getAttribute("href");

      if (!href) {
        return;
      }


      const linkPage =
        href.split("#")[0]
          .split("/")
          .pop();


      if (
        linkPage === currentPage
      ) {

        link.classList.add("active");

      }

    });


  /* =========================================
     GRAFFITI ANIMATION
  ========================================= */

  const letters =
    document.querySelectorAll(
      ".graffiti-letter"
    );


  if (letters.length) {

    letters.forEach(
      (letter, index) => {

        setTimeout(
          () => {

            letter.classList.add(
              "sprayed"
            );

          },
          180 + index * 90
        );

      }
    );

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


  if (slides.length) {

    let currentSlide = 0;

    let sliderTimer;


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


      currentSlide =
        index;

    }


    function nextSlide() {

      const next =
        (currentSlide + 1) %
        slides.length;

      showSlide(
        next
      );

    }


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


    function stopSlider() {

      clearInterval(
        sliderTimer
      );

    }


    dots.forEach(
      (dot, index) => {

        dot.addEventListener(
          "click",
          () => {

            showSlide(
              index
            );

            startSlider();

          }
        );

      }
    );


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


    showSlide(
      0
    );


    startSlider();

  }


  /* =========================================
     GLOBAL MOI-CY API
  ========================================= */

  window.MoiCy = {

    language:
      currentLanguage,

    translations:
      translations,


    setLanguage(language) {

      if (
        !supportedLanguages.includes(
          language
        )
      ) {
        return;
      }


      saveLanguage(
        language
      );


      translatePage(
        language
      );


      this.language =
        language;

    }

  };

});
