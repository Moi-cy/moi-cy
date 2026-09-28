// MOI-CY Skatepark Map
// Skateparks werden bei einer Skatepark-Suche direkt aus OpenStreetMap geladen.
// Kein Python und keine skateparks.json-Datenbank notwendig.

const map = L.map("map", {
  zoomControl: false,
  minZoom: 2,
  maxZoom: 19,
  maxBounds: [
    [-85, -180],
    [85, 180]
  ],
  maxBoundsViscosity: 1,
  worldCopyJump: false,
  preferCanvas: true
}).setView([51.2, 10.5], 5.5);

L.control.zoom({
  position: "bottomright"
}).addTo(map);


// ------------------------------------------------------------
// Karten
// ------------------------------------------------------------

const osmLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }
).addTo(map);

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri"
  }
);


// ------------------------------------------------------------
// Layer
// ------------------------------------------------------------

const skateparkLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const searchMarkerLayer = L.layerGroup().addTo(map);


// ------------------------------------------------------------
// Zustand
// ------------------------------------------------------------

let lastSearchLocation = null;
let currentRoute = null;
let searchMarker = null;


// ------------------------------------------------------------
// Hilfsfunktionen
// ------------------------------------------------------------

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );
}


// ------------------------------------------------------------
// Marker
// ------------------------------------------------------------

function createSkateparkMarker(park) {

  const icon = L.divIcon({
    className: "map-skatepark-marker-wrap",
    html: `
      <div class="map-skatepark-marker">
        🛹
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20]
  });

  const marker = L.marker(
    [park.lat, park.lng],
    { icon }
  );

  let popup = `
    <div class="map-skatepark-popup">
      <div class="map-skatepark-popup-title">
        ${escapeHtml(park.name || "Skatepark")}
      </div>
  `;

  const locationParts = [];

  if (park.city) {
    locationParts.push(park.city);
  }

  if (park.country) {
    locationParts.push(park.country);
  }

  if (locationParts.length) {
    popup += `
      <div class="map-skatepark-popup-meta">
        ${escapeHtml(locationParts.join(", "))}
      </div>
    `;
  }

  if (park.surface) {
    popup += `
      <div class="map-skatepark-popup-meta">
        Untergrund: ${escapeHtml(park.surface)}
      </div>
    `;
  }

  if (park.lit) {
    popup += `
      <div class="map-skatepark-popup-meta">
        Beleuchtung: ${escapeHtml(park.lit)}
      </div>
    `;
  }

  popup += `
      <button
        type="button"
        class="map-skatepark-directions"
        data-lat="${park.lat}"
        data-lng="${park.lng}"
      >
        Route mit Google Maps
      </button>
    </div>
  `;

  marker.bindPopup(popup);

  marker.on("popupopen", () => {

    const button = document.querySelector(
      `.map-skatepark-directions[data-lat="${park.lat}"][data-lng="${park.lng}"]`
    );

    if (!button) return;

    button.addEventListener("click", () => {

      const url =
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${park.lat},${park.lng}`
        )}`;

      window.open(url, "_blank", "noopener,noreferrer");
    });
  });

  return marker;
}


// ------------------------------------------------------------
// OSM / Overpass
// ------------------------------------------------------------

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];


async function fetchOverpass(query) {

  let lastError = null;

  for (const server of OVERPASS_SERVERS) {

    try {

      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 30000);

      const response = await fetch(server, {
        method: "POST",
        body: query,
        signal: controller.signal,
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(
          `Overpass HTTP ${response.status}`
        );
      }

      return await response.json();

    } catch (error) {

      lastError = error;

    }
  }

  throw lastError || new Error("Overpass konnte nicht erreicht werden.");
}


// ------------------------------------------------------------
// Skateparks in Radius suchen
// ------------------------------------------------------------

async function searchSkateparks(
  lat,
  lng,
  radiusKm = 10,
  limit = 20
) {

  skateparkLayer.clearLayers();

  const status = document.getElementById("skateparkStatus");
  const results = document.getElementById("skateparkResults");

  if (status) {
    status.textContent = "Skateparks werden gesucht …";
    status.classList.remove("error", "success");
    status.classList.add("loading");
  }

  if (results) {
    results.innerHTML = "";
  }

  // Overpass-Radius in Metern
  const radiusMeters = radiusKm * 1000;

  const query = `
[out:json][timeout:25];

(
  node["leisure"="skatepark"](around:${radiusMeters},${lat},${lng});
  way["leisure"="skatepark"](around:${radiusMeters},${lat},${lng});
  relation["leisure"="skatepark"](around:${radiusMeters},${lat},${lng});

  node["leisure"="skate_park"](around:${radiusMeters},${lat},${lng});
  way["leisure"="skate_park"](around:${radiusMeters},${lat},${lng});
  relation["leisure"="skate_park"](around:${radiusMeters},${lat},${lng});
);

out center tags;
`;

  try {

    const data = await fetchOverpass(query);

    const parks = [];

    for (const element of data.elements || []) {

      let parkLat = element.lat;
      let parkLng = element.lon;

      if (
        (parkLat == null || parkLng == null) &&
        element.center
      ) {
        parkLat = element.center.lat;
        parkLng = element.center.lon;
      }

      if (
        parkLat == null ||
        parkLng == null
      ) {
        continue;
      }

      const tags = element.tags || {};

      const name =
        tags.name ||
        tags["name:de"] ||
        "Skatepark";

      const distance = distanceKm(
        lat,
        lng,
        parkLat,
        parkLng
      );

      parks.push({
        id: `${element.type}/${element.id}`,
        name,
        lat: parkLat,
        lng: parkLng,
        city:
          tags["addr:city"] ||
          tags["addr:place"] ||
          "",
        country:
          tags["addr:country"] ||
          "",
        surface:
          tags.surface ||
          "",
        lit:
          tags.lit ||
          "",
        website:
          tags.website ||
          tags["contact:website"] ||
          "",
        operator:
          tags.operator ||
          "",
        description:
          tags.description ||
          "",
        distance
      });
    }

    // Doppelte Einträge entfernen
    const unique = new Map();

    for (const park of parks) {

      const key =
        `${park.name.toLowerCase()}|` +
        `${park.lat.toFixed(5)}|` +
        `${park.lng.toFixed(5)}`;

      if (!unique.has(key)) {
        unique.set(key, park);
      }
    }

    const cleanParks = [...unique.values()];

    // Erst Nähe
    cleanParks.sort(
      (a, b) => a.distance - b.distance
    );

    const visibleParks =
      cleanParks.slice(0, limit);

    // Marker erzeugen
    for (const park of visibleParks) {

      const marker = createSkateparkMarker(park);

      marker.addTo(skateparkLayer);
    }

    // Ergebnisse unter der Suche
    if (results) {

      if (!visibleParks.length) {

        results.innerHTML = `
          <div class="map-skatepark-empty">
            Keine Skateparks im gewählten Radius gefunden.
          </div>
        `;

      } else {

        results.innerHTML = visibleParks.map((park, index) => {

          return `
            <button
              type="button"
              class="map-skatepark-result"
              data-index="${index}"
            >
              <span class="map-skatepark-result-name">
                ${escapeHtml(park.name)}
              </span>

              <span class="map-skatepark-result-distance">
                ${park.distance.toFixed(1)} km
              </span>
            </button>
          `;

        }).join("");

        results
          .querySelectorAll(".map-skatepark-result")
          .forEach(button => {

            button.addEventListener("click", () => {

              const index =
                Number(button.dataset.index);

              const park =
                visibleParks[index];

              map.flyTo(
                [park.lat, park.lng],
                Math.max(map.getZoom(), 15),
                {
                  duration: 0.8
                }
              );

              setTimeout(() => {

                skateparkLayer.eachLayer(layer => {

                  const position =
                    layer.getLatLng();

                  if (
                    Math.abs(position.lat - park.lat) < 0.00001 &&
                    Math.abs(position.lng - park.lng) < 0.00001
                  ) {
                    layer.openPopup();
                  }

                });

              }, 850);
            });
          });
      }
    }

    if (status) {

      status.classList.remove("loading");

      if (visibleParks.length) {

        status.textContent =
          `${visibleParks.length} Skatepark${visibleParks.length === 1 ? "" : "s"} gefunden`;

        status.classList.add("success");

      } else {

        status.textContent =
          "Keine Skateparks gefunden.";
      }
    }

    return visibleParks;

  } catch (error) {

    console.error(error);

    if (status) {

      status.classList.remove("loading");
      status.classList.add("error");

      status.textContent =
        "Skateparks konnten gerade nicht geladen werden.";
    }

    if (results) {

      results.innerHTML = `
        <div class="map-skatepark-empty">
          Die OpenStreetMap-Suche konnte gerade nicht erreicht werden.
          Bitte versuche es gleich noch einmal.
        </div>
      `;
    }

    return [];
  }
}


// ------------------------------------------------------------
// Ortssuche
// ------------------------------------------------------------

let geocodeCache = {};

try {
  geocodeCache =
    JSON.parse(
      localStorage.getItem("moiCyGeocodeCache") || "{}"
    );
} catch {
  geocodeCache = {};
}


function saveGeocodeCache() {

  try {

    localStorage.setItem(
      "moiCyGeocodeCache",
      JSON.stringify(geocodeCache)
    );

  } catch {
    // Cache ist optional
  }
}


async function geocode(query) {

  const cleanQuery =
    query.trim();

  if (!cleanQuery) {
    return null;
  }

  const cacheKey =
    cleanQuery.toLowerCase();

  if (geocodeCache[cacheKey]) {
    return geocodeCache[cacheKey];
  }

  // Nominatim
  try {

    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: cleanQuery,
        format: "jsonv2",
        limit: "5",
        addressdetails: "1"
      });

    const response =
      await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });

    if (response.ok) {

      const data =
        await response.json();

      if (data.length) {

        geocodeCache[cacheKey] =
          data;

        saveGeocodeCache();

        return data;
      }
    }

  } catch (error) {
    console.warn("Nominatim Fehler:", error);
  }


  // Photon als Fallback
  try {

    const url =
      "https://photon.komoot.io/api/?" +
      new URLSearchParams({
        q: cleanQuery,
        limit: "5"
      });

    const response =
      await fetch(url);

    if (response.ok) {

      const data =
        await response.json();

      const converted =
        (data.features || []).map(feature => {

          const coords =
            feature.geometry.coordinates;

          return {
            lat: coords[1],
            lon: coords[0],
            display_name:
              feature.properties.name ||
              cleanQuery
          };

        });

      if (converted.length) {

        geocodeCache[cacheKey] =
          converted;

        saveGeocodeCache();

        return converted;
      }
    }

  } catch (error) {
    console.warn("Photon Fehler:", error);
  }

  return null;
}


// ------------------------------------------------------------
// Hauptsuche
// ------------------------------------------------------------

const mainSearch =
  document.getElementById("mainSearch");

const searchSuggestions =
  document.getElementById("searchSuggestions");


let searchTimer = null;


if (mainSearch) {

  mainSearch.addEventListener(
    "input",
    () => {

      clearTimeout(searchTimer);

      const value =
        mainSearch.value.trim();

      if (searchSuggestions) {
        searchSuggestions.innerHTML = "";
      }

      if (value.length < 2) {
        return;
      }

      searchTimer =
        setTimeout(async () => {

          const results =
            await geocode(value);

          if (
            !results ||
            !searchSuggestions
          ) {
            return;
          }

          searchSuggestions.innerHTML =
            results.slice(0, 5).map((result, index) => {

              return `
                <button
                  type="button"
                  class="map-search-suggestion"
                  data-index="${index}"
                >
                  ${escapeHtml(
                    result.display_name ||
                    result.name ||
                    value
                  )}
                </button>
              `;

            }).join("");

          searchSuggestions
            .querySelectorAll(".map-search-suggestion")
            .forEach(button => {

              button.addEventListener(
                "click",
                () => {

                  const result =
                    results[
                      Number(button.dataset.index)
                    ];

                  selectSearchResult(result);

                }
              );
            });

        }, 350);
    }
  );


  mainSearch.addEventListener(
    "keydown",
    async event => {

      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();

      const value =
        mainSearch.value.trim();

      if (!value) {
        return;
      }

      const results =
        await geocode(value);

      if (
        results &&
        results.length
      ) {
        selectSearchResult(results[0]);
      }
    }
  );
}


function selectSearchResult(result) {

  const lat =
    Number(result.lat);

  const lng =
    Number(result.lon);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return;
  }

  lastSearchLocation = {
    lat,
    lng
  };

  searchMarkerLayer.clearLayers();

  searchMarker =
    L.marker([lat, lng])
      .addTo(searchMarkerLayer);

  searchMarker.bindPopup(
    escapeHtml(
      result.display_name ||
      result.name ||
      "Suchort"
    )
  ).openPopup();

  map.flyTo(
    [lat, lng],
    12,
    {
      duration: 0.8
    }
  );

  if (searchSuggestions) {
    searchSuggestions.innerHTML = "";
  }
}


// ------------------------------------------------------------
// Skatepark-Suche Button
// ------------------------------------------------------------

const skateparkSearchButton =
  document.getElementById("searchSkateparks");


if (skateparkSearchButton) {

  skateparkSearchButton.addEventListener(
    "click",
    async () => {

      if (!lastSearchLocation) {

        const value =
          mainSearch?.value.trim();

        if (!value) {

          const status =
            document.getElementById(
              "skateparkStatus"
            );

          if (status) {

            status.textContent =
              "Bitte zuerst einen Ort suchen.";

            status.classList.add("error");
          }

          return;
        }

        const results =
          await geocode(value);

        if (
          !results ||
          !results.length
        ) {
          return;
        }

        selectSearchResult(results[0]);
      }

      const radiusSelect =
        document.getElementById(
          "skateparkRadius"
        );

      const limitSelect =
        document.getElementById(
          "skateparkLimit"
        );

      const radius =
        Number(
          radiusSelect?.value || 10
        );

      const limit =
        Number(
          limitSelect?.value || 20
        );

      await searchSkateparks(
        lastSearchLocation.lat,
        lastSearchLocation.lng,
        Math.min(radius, 25),
        Math.min(limit, 30)
      );
    }
  );
}


// ------------------------------------------------------------
// Radius / Filter
// ------------------------------------------------------------

const radiusSelect =
  document.getElementById(
    "skateparkRadius"
  );

if (radiusSelect) {

  radiusSelect.addEventListener(
    "change",
    () => {

      if (!lastSearchLocation) {
        return;
      }

      const limit =
        Number(
          document.getElementById(
            "skateparkLimit"
          )?.value || 20
        );

      searchSkateparks(
        lastSearchLocation.lat,
        lastSearchLocation.lng,
        Math.min(
          Number(radiusSelect.value),
          25
        ),
        Math.min(limit, 30)
      );
    }
  );
}


const limitSelect =
  document.getElementById(
    "skateparkLimit"
  );

if (limitSelect) {

  limitSelect.addEventListener(
    "change",
    () => {

      if (!lastSearchLocation) {
        return;
      }

      const radius =
        Number(
          document.getElementById(
            "skateparkRadius"
          )?.value || 10
        );

      searchSkateparks(
        lastSearchLocation.lat,
        lastSearchLocation.lng,
        Math.min(radius, 25),
        Math.min(
          Number(limitSelect.value),
          30
        )
      );
    }
  );
}


// ------------------------------------------------------------
// Route
// ------------------------------------------------------------

const routeInputs = [];
let routeStopCount = 2;

function getRouteInputElements() {
  return [
    document.getElementById("routeStart"),
    ...Array.from(
      document.querySelectorAll(
        ".route-stop-input"
      )
    ),
    document.getElementById("routeEnd")
  ].filter(Boolean);
}


async function routeGeocodeInput(input) {

  const value =
    input.value.trim();

  if (!value) {
    return null;
  }

  const results =
    await geocode(value);

  if (
    !results ||
    !results.length
  ) {
    return null;
  }

  return {
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
    name:
      results[0].display_name ||
      value
  };
}


async function calculateRoute() {

  const inputs =
    getRouteInputElements();

  if (inputs.length < 2) {
    return;
  }

  const status =
    document.getElementById(
      "routeStatus"
    );

  if (status) {
    status.textContent =
      "Route wird berechnet …";
  }

  const points = [];

  for (const input of inputs) {

    const point =
      await routeGeocodeInput(input);

    if (!point) {

      if (status) {
        status.textContent =
          `Ort nicht gefunden: ${input.value}`;
        status.classList.add("error");
      }

      return;
    }

    points.push(point);
  }

  if (points.length < 2) {
    return;
  }

  const coordinates =
    points
      .map(point =>
        `${point.lng},${point.lat}`
      )
      .join(";");

  const url =
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  try {

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error("OSRM Fehler");
    }

    const data =
      await response.json();

    if (
      data.code !== "Ok" ||
      !data.routes?.length
    ) {
      throw new Error("Keine Route gefunden");
    }

    const route =
      data.routes[0];

    currentRoute =
      route;

    routeLayer.clearLayers();

    L.geoJSON(
      route.geometry,
      {
        style: {
          weight: 5,
          opacity: 0.85
        }
      }
    ).addTo(routeLayer);

    const bounds =
      L.geoJSON(route.geometry)
        .getBounds();

    map.fitBounds(
      bounds,
      {
        padding: [40, 40]
      }
    );

    if (status) {

      status.classList.remove("error");

      status.textContent =
        `${(route.distance / 1000).toFixed(1)} km · ` +
        `${Math.round(route.duration / 60)} min`;
    }

    await searchSkateparksAlongRoute(
      route.geometry
    );

  } catch (error) {

    console.error(error);

    if (status) {

      status.classList.add("error");

      status.textContent =
        "Route konnte nicht berechnet werden.";
    }
  }
}


// ------------------------------------------------------------
// Skateparks entlang der gesamten Route
// ------------------------------------------------------------

async function searchSkateparksAlongRoute(
  geometry
) {

  const coordinates =
    geometry.coordinates;

  if (!coordinates?.length) {
    return;
  }

  // Wir nehmen mehrere Punkte entlang der gesamten Route.
  // So wird nicht nur der Startpunkt durchsucht.

  const samples = [];

  const maxSamples = 25;

  const step =
    Math.max(
      1,
      Math.floor(
        coordinates.length / maxSamples
      )
    );

  for (
    let i = 0;
    i < coordinates.length;
    i += step
  ) {

    samples.push(
      coordinates[i]
    );
  }

  const unique = new Map();

  const status =
    document.getElementById(
      "skateparkStatus"
    );

  if (status) {
    status.textContent =
      "Skateparks entlang der Route werden gesucht …";
  }

  for (const coordinate of samples) {

    const lng =
      coordinate[0];

    const lat =
      coordinate[1];

    const radiusMeters =
      5000;

    const query = `
[out:json][timeout:20];

(
  node["leisure"="skatepark"](around:${radiusMeters},${lat},${lng});
  way["leisure"="skatepark"](around:${radiusMeters},${lat},${lng});
  relation["leisure"="skatepark"](around:${radiusMeters},${lat},${lng});

  node["leisure"="skate_park"](around:${radiusMeters},${lat},${lng});
  way["leisure"="skate_park"](around:${radiusMeters},${lat},${lng});
  relation["leisure"="skate_park"](around:${radiusMeters},${lat},${lng});
);

out center tags;
`;

    try {

      const data =
        await fetchOverpass(query);

      for (const element of data.elements || []) {

        let parkLat =
          element.lat;

        let parkLng =
          element.lon;

        if (
          (parkLat == null || parkLng == null) &&
          element.center
        ) {
          parkLat =
            element.center.lat;

          parkLng =
            element.center.lon;
        }

        if (
          parkLat == null ||
          parkLng == null
        ) {
          continue;
        }

        const tags =
          element.tags || {};

        const park = {
          id:
            `${element.type}/${element.id}`,

          name:
            tags.name ||
            tags["name:de"] ||
            "Skatepark",

          lat: parkLat,
          lng: parkLng,

          city:
            tags["addr:city"] ||
            "",

          country:
            tags["addr:country"] ||
            "",

          surface:
            tags.surface ||
            "",

          lit:
            tags.lit ||
            ""
        };

        unique.set(
          park.id,
          park
        );
      }

    } catch (error) {

      console.warn(
        "Routen-Skateparks:",
        error
      );
    }
  }

  const parks =
    [...unique.values()];

  parks.sort(
    (a, b) => {

      const da =
        distanceToRoute(
          a,
          coordinates
        );

      const db =
        distanceToRoute(
          b,
          coordinates
        );

      return da - db;
    }
  );

  const visible =
    parks.slice(0, 30);

  skateparkLayer.clearLayers();

  for (const park of visible) {

    createSkateparkMarker(park)
      .addTo(skateparkLayer);
  }

  if (status) {

    status.textContent =
      `${visible.length} Skateparks entlang der Route gefunden`;

    status.classList.remove("loading");
    status.classList.add("success");
  }
}


function distanceToRoute(
  park,
  coordinates
) {

  let minimum =
    Infinity;

  // Näherungsweise Entfernung zum nächsten
  // Routenpunkt. Für die Darstellung reicht das.

  for (const coordinate of coordinates) {

    const lng =
      coordinate[0];

    const lat =
      coordinate[1];

    const distance =
      distanceKm(
        park.lat,
        park.lng,
        lat,
        lng
      );

    if (distance < minimum) {
      minimum = distance;
    }

    if (minimum < 0.1) {
      break;
    }
  }

  return minimum;
}


// ------------------------------------------------------------
// Routenbuttons
// ------------------------------------------------------------

const calculateRouteButton =
  document.getElementById(
    "calculateRoute"
  );

if (calculateRouteButton) {

  calculateRouteButton.addEventListener(
    "click",
    calculateRoute
  );
}


const clearRouteButton =
  document.getElementById(
    "clearRoute"
  );

if (clearRouteButton) {

  clearRouteButton.addEventListener(
    "click",
    () => {

      routeLayer.clearLayers();
      skateparkLayer.clearLayers();

      currentRoute = null;

      const status =
        document.getElementById(
          "routeStatus"
        );

      if (status) {
        status.textContent = "";
      }

      const skateparkStatus =
        document.getElementById(
          "skateparkStatus"
        );

      if (skateparkStatus) {
        skateparkStatus.textContent = "";
      }
    }
  );
}


// ------------------------------------------------------------
// Zwischenstopp hinzufügen
// ------------------------------------------------------------

const addStopButton =
  document.getElementById(
    "addRouteStop"
  );

if (addStopButton) {

  addStopButton.addEventListener(
    "click",
    () => {

      const container =
        document.getElementById(
          "routeStops"
        );

      if (!container) {
        return;
      }

      if (
        container.querySelectorAll(
          ".route-stop-input"
        ).length >= 6
      ) {
        return;
      }

      const input =
        document.createElement("input");

      input.type = "text";
      input.className =
        "route-stop-input";

      input.placeholder =
        `Zwischenstopp ${
          container.querySelectorAll(
            ".route-stop-input"
          ).length + 1
        }`;

      container.appendChild(input);
    }
  );
}


// ------------------------------------------------------------
// Satellit
// ------------------------------------------------------------

const satelliteToggle =
  document.getElementById(
    "satelliteToggle"
  );

if (satelliteToggle) {

  satelliteToggle.addEventListener(
    "click",
    () => {

      if (map.hasLayer(osmLayer)) {

        map.removeLayer(osmLayer);
        satelliteLayer.addTo(map);

        satelliteToggle.textContent =
          "Karte";

      } else {

        map.removeLayer(satelliteLayer);
        osmLayer.addTo(map);

        satelliteToggle.textContent =
          "Satellit";
      }
    }
  );
}


// ------------------------------------------------------------
// Standort
// ------------------------------------------------------------

const locateButton =
  document.getElementById(
    "locateMe"
  );

if (locateButton) {

  locateButton.addEventListener(
    "click",
    () => {

      if (!navigator.geolocation) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {

          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;

          lastSearchLocation = {
            lat,
            lng
          };

          map.flyTo(
            [lat, lng],
            14,
            {
              duration: 0.8
            }
          );

          searchMarkerLayer.clearLayers();

          searchMarker =
            L.marker([lat, lng])
              .addTo(searchMarkerLayer)
              .bindPopup(
                "Dein Standort"
              )
              .openPopup();
        },

        error => {
          console.warn(
            "Standort konnte nicht ermittelt werden:",
            error
          );
        }
      );
    }
  );
}


// ------------------------------------------------------------
// Panel einklappen
// ------------------------------------------------------------

document
  .querySelectorAll(
    "[data-collapse]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const target =
          document.getElementById(
            button.dataset.collapse
          );

        if (!target) {
          return;
        }

        target.classList.toggle(
          "is-collapsed"
        );

        button.classList.toggle(
          "is-collapsed"
        );
      }
    );
  });


// ------------------------------------------------------------
// Start
// ------------------------------------------------------------

console.log(
  "MOI-CY Skatepark Map geladen."
);
