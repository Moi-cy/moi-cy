// ============================================================
// MOI-CY MAP
// ============================================================

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


// ============================================================
// KARTEN
// ============================================================

const osmLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri"
    }
);

L.control.zoom({
    position: "bottomright"
}).addTo(map);


// ============================================================
// LAYER
// ============================================================

const skateparkLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const searchMarkerLayer = L.layerGroup().addTo(map);


// ============================================================
// ZUSTAND
// ============================================================

let lastSearchLocation = null;
let currentRoute = null;


// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function distanceKm(lat1, lng1, lat2, lng2) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) * Math.PI / 180;

    const dLng =
        (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    return R * 2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );
}


function setStatus(text, type = "") {

    const statusText =
        document.getElementById("mapStatusText");

    const status =
        document.getElementById("mapStatus");

    if (statusText) {
        statusText.textContent = text;
    }

    if (status) {

        status.classList.remove(
            "loading",
            "success",
            "error"
        );

        if (type) {
            status.classList.add(type);
        }
    }
}


function showResults() {

    const results =
        document.getElementById("mapResults");

    if (results) {
        results.hidden = false;
    }
}


function clearResults() {

    const resultsList =
        document.getElementById("resultsList");

    if (resultsList) {
        resultsList.innerHTML = "";
    }

    const results =
        document.getElementById("mapResults");

    if (results) {
        results.hidden = true;
    }

    const count =
        document.getElementById("resultsCount");

    if (count) {
        count.textContent = "0";
    }
}


// ============================================================
// MARKER
// ============================================================

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

    const marker =
        L.marker(
            [park.lat, park.lng],
            { icon }
        );

    let popup = `
        <div class="map-skatepark-popup">

            <div class="map-skatepark-popup-title">
                ${escapeHtml(park.name)}
            </div>
    `;

    if (park.city || park.country) {

        popup += `
            <div class="map-skatepark-popup-meta">
                ${escapeHtml(
                    [park.city, park.country]
                        .filter(Boolean)
                        .join(", ")
                )}
            </div>
        `;
    }

    if (park.distance != null) {

        popup += `
            <div class="map-skatepark-popup-meta">
                ${park.distance.toFixed(1)} km entfernt
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

        const button =
            document.querySelector(
                `.map-skatepark-directions[data-lat="${park.lat}"][data-lng="${park.lng}"]`
            );

        if (!button) {
            return;
        }

        button.onclick = () => {

            const url =
                `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`;

            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );
        };
    });

    return marker;
}


// ============================================================
// OVERPASS
// ============================================================

const OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
];


async function fetchOverpass(query) {

    let lastError = null;

    for (const server of OVERPASS_SERVERS) {

        try {

            const controller =
                new AbortController();

            const timeout =
                setTimeout(
                    () => controller.abort(),
                    30000
                );

            const response =
                await fetch(
                    server,
                    {
                        method: "POST",
                        body: query,
                        signal: controller.signal,
                        headers: {
                            "Content-Type":
                                "text/plain;charset=UTF-8"
                        }
                    }
                );

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(
                    `Overpass HTTP ${response.status}`
                );
            }

            return await response.json();

        } catch (error) {

            lastError = error;
            console.warn(
                "Overpass Server fehlgeschlagen:",
                server,
                error
            );
        }
    }

    throw (
        lastError ||
        new Error(
            "Kein Overpass-Server erreichbar."
        )
    );
}


// ============================================================
// ORTSSUCHE
// ============================================================

async function geocode(query) {

    const cleanQuery =
        query.trim();

    if (!cleanQuery) {
        return [];
    }

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
                return data;
            }
        }

    } catch (error) {

        console.warn(
            "Ortssuche fehlgeschlagen:",
            error
        );
    }

    return [];
}


// ============================================================
// ORT AUSWÄHLEN
// ============================================================

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

    const marker =
        L.marker([lat, lng])
            .addTo(searchMarkerLayer);

    marker.bindPopup(
        escapeHtml(
            result.display_name ||
            "Suchort"
        )
    );

    marker.openPopup();

    map.flyTo(
        [lat, lng],
        12,
        {
            duration: 0.8
        }
    );

    const suggestions =
        document.getElementById(
            "searchSuggestions"
        );

    if (suggestions) {
        suggestions.innerHTML = "";
        suggestions.hidden = true;
    }

    setStatus(
        "Ort gefunden. Du kannst jetzt Skateparks suchen.",
        "success"
    );
}


// ============================================================
// HAUPTSUCHE
// ============================================================

const mainSearch =
    document.getElementById("mainSearch");

const mainSearchButton =
    document.getElementById(
        "mainSearchButton"
    );

const searchSuggestions =
    document.getElementById(
        "searchSuggestions"
    );


async function performMainSearch() {

    const value =
        mainSearch?.value.trim();

    if (!value) {

        setStatus(
            "Bitte einen Ort eingeben.",
            "error"
        );

        return;
    }

    setStatus(
        "Ort wird gesucht …",
        "loading"
    );

    const results =
        await geocode(value);

    if (!results.length) {

        setStatus(
            "Ort wurde nicht gefunden.",
            "error"
        );

        return;
    }

    if (results.length === 1) {

        selectSearchResult(
            results[0]
        );

        return;
    }

    if (searchSuggestions) {

        searchSuggestions.innerHTML =
            results.map(
                (result, index) => `
                    <button
                        type="button"
                        class="map-search-suggestion"
                        data-index="${index}"
                    >
                        ${escapeHtml(
                            result.display_name
                        )}
                    </button>
                `
            ).join("");

        searchSuggestions.hidden = false;

        searchSuggestions
            .querySelectorAll(
                ".map-search-suggestion"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                button.dataset.index
                            );

                        selectSearchResult(
                            results[index]
                        );
                    }
                );
            });
    }

    setStatus(
        "Bitte einen Ort aus den Vorschlägen auswählen.",
        ""
    );
}


if (mainSearchButton) {

    mainSearchButton.addEventListener(
        "click",
        performMainSearch
    );
}


if (mainSearch) {

    mainSearch.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                performMainSearch();
            }
        }
    );
}


// ============================================================
// SKATEPARK-SUCHE
// ============================================================

async function searchSkateparks() {

    if (!lastSearchLocation) {

        // Falls noch kein Ort ausgewählt wurde,
        // versuchen wir automatisch die Hauptsuche.

        await performMainSearch();

        if (!lastSearchLocation) {
            return;
        }
    }

    const radius =
        Math.min(
            Number(
                document.getElementById(
                    "skateparkRadius"
                )?.value || 15
            ),
            25
        );

    const limit =
        Math.min(
            Number(
                document.getElementById(
                    "skateparkLimit"
                )?.value || 20
            ),
            30
        );

    skateparkLayer.clearLayers();
    clearResults();

    setStatus(
        "Skateparks werden gesucht …",
        "loading"
    );

    const query = `
[out:json][timeout:25];

(
    node["leisure"="skatepark"]
        (around:${radius * 1000},${lastSearchLocation.lat},${lastSearchLocation.lng});

    way["leisure"="skatepark"]
        (around:${radius * 1000},${lastSearchLocation.lat},${lastSearchLocation.lng});

    relation["leisure"="skatepark"]
        (around:${radius * 1000},${lastSearchLocation.lat},${lastSearchLocation.lng});

    node["leisure"="skate_park"]
        (around:${radius * 1000},${lastSearchLocation.lat},${lastSearchLocation.lng});

    way["leisure"="skate_park"]
        (around:${radius * 1000},${lastSearchLocation.lat},${lastSearchLocation.lng});

    relation["leisure"="skate_park"]
        (around:${radius * 1000},${lastSearchLocation.lat},${lastSearchLocation.lng});
);

out center tags;
`;

    try {

        const data =
            await fetchOverpass(query);

        const unique =
            new Map();

        for (
            const element
            of data.elements || []
        ) {

            let lat =
                element.lat;

            let lng =
                element.lon;

            if (
                (lat == null || lng == null) &&
                element.center
            ) {

                lat =
                    element.center.lat;

                lng =
                    element.center.lon;
            }

            if (
                lat == null ||
                lng == null
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

                lat,
                lng,

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
                    "",

                distance:
                    distanceKm(
                        lastSearchLocation.lat,
                        lastSearchLocation.lng,
                        lat,
                        lng
                    )
            };

            const key =
                `${park.name.toLowerCase()}|` +
                `${park.lat.toFixed(5)}|` +
                `${park.lng.toFixed(5)}`;

            if (!unique.has(key)) {
                unique.set(key, park);
            }
        }

        let parks =
            [...unique.values()];

        parks.sort(
            (a, b) =>
                a.distance - b.distance
        );

        parks =
            parks.slice(0, limit);

        displaySkateparks(parks);

    } catch (error) {

        console.error(error);

        setStatus(
            "Skateparks konnten gerade nicht geladen werden.",
            "error"
        );
    }
}


function displaySkateparks(parks) {

    const resultsList =
        document.getElementById(
            "resultsList"
        );

    const resultsCount =
        document.getElementById(
            "resultsCount"
        );

    showResults();

    if (resultsCount) {
        resultsCount.textContent =
            String(parks.length);
    }

    if (!parks.length) {

        if (resultsList) {

            resultsList.innerHTML = `
                <div class="map-skatepark-empty">
                    Keine Skateparks im gewählten Radius gefunden.
                </div>
            `;
        }

        setStatus(
            "Keine Skateparks gefunden.",
            ""
        );

        return;
    }

    if (resultsList) {

        resultsList.innerHTML =
            parks.map(
                (park, index) => `
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
                `
            ).join("");

        resultsList
            .querySelectorAll(
                ".map-skatepark-result"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const park =
                            parks[
                                Number(
                                    button.dataset.index
                                )
                            ];

                        map.flyTo(
                            [park.lat, park.lng],
                            16,
                            {
                                duration: 0.8
                            }
                        );

                        skateparkLayer.eachLayer(
                            layer => {

                                const position =
                                    layer.getLatLng();

                                if (
                                    Math.abs(
                                        position.lat -
                                        park.lat
                                    ) < 0.00001 &&
                                    Math.abs(
                                        position.lng -
                                        park.lng
                                    ) < 0.00001
                                ) {

                                    layer.openPopup();
                                }
                            }
                        );
                    }
                );
            });
    }

    for (const park of parks) {

        createSkateparkMarker(park)
            .addTo(skateparkLayer);
    }

    setStatus(
        `${parks.length} Skateparks gefunden.`,
        "success"
    );
}


const searchSkateparksButton =
    document.getElementById(
        "searchSkateparks"
    );

if (searchSkateparksButton) {

    searchSkateparksButton.addEventListener(
        "click",
        searchSkateparks
    );
}


// ============================================================
// FILTER ÄNDERN
// ============================================================

document
    .getElementById("skateparkRadius")
    ?.addEventListener(
        "change",
        () => {

            if (lastSearchLocation) {
                searchSkateparks();
            }
        }
    );


document
    .getElementById("skateparkLimit")
    ?.addEventListener(
        "change",
        () => {

            if (lastSearchLocation) {
                searchSkateparks();
            }
        }
    );


// ============================================================
// SATELLIT
// ============================================================

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

                satelliteToggle
                    .setAttribute(
                        "aria-pressed",
                        "true"
                    );

                satelliteToggle
                    .querySelector("span:last-child")
                    .textContent =
                    "KARTE";

            } else {

                map.removeLayer(
                    satelliteLayer
                );

                osmLayer.addTo(map);

                satelliteToggle
                    .setAttribute(
                        "aria-pressed",
                        "false"
                    );

                satelliteToggle
                    .querySelector("span:last-child")
                    .textContent =
                    "SATELLIT";
            }
        }
    );
}


// ============================================================
// MEINE POSITION
// ============================================================

const locateMe =
    document.getElementById(
        "locateMe"
    );

if (locateMe) {

    locateMe.addEventListener(
        "click",
        () => {

            if (!navigator.geolocation) {

                setStatus(
                    "Standort wird von diesem Browser nicht unterstützt.",
                    "error"
                );

                return;
            }

            setStatus(
                "Standort wird ermittelt …",
                "loading"
            );

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

                    searchMarkerLayer.clearLayers();

                    const marker =
                        L.marker([lat, lng])
                            .addTo(
                                searchMarkerLayer
                            );

                    marker
                        .bindPopup(
                            "Dein Standort"
                        )
                        .openPopup();

                    map.flyTo(
                        [lat, lng],
                        14,
                        {
                            duration: 0.8
                        }
                    );

                    setStatus(
                        "Standort gefunden.",
                        "success"
                    );
                },

                () => {

                    setStatus(
                        "Standort konnte nicht ermittelt werden.",
                        "error"
                    );
                }
            );
        }
    );
}


// ============================================================
// PANEL EIN-/AUSBLENDEN
// ============================================================

const panel =
    document.getElementById(
        "mapPanel"
    );

const panelOpen =
    document.getElementById(
        "mapPanelOpen"
    );

const panelToggle =
    document.getElementById(
        "mapPanelToggle"
    );


function closePanel() {

    if (panel) {
        panel.classList.add(
            "is-collapsed"
        );
    }

    if (panelOpen) {
        panelOpen.hidden = false;
    }

    if (panelToggle) {
        panelToggle.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    setTimeout(
        () => map.invalidateSize(),
        250
    );
}


function openPanel() {

    if (panel) {
        panel.classList.remove(
            "is-collapsed"
        );
    }

    if (panelOpen) {
        panelOpen.hidden = true;
    }

    if (panelToggle) {
        panelToggle.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    setTimeout(
        () => map.invalidateSize(),
        250
    );
}


panelToggle?.addEventListener(
    "click",
    closePanel
);

panelOpen?.addEventListener(
    "click",
    openPanel
);


// ============================================================
// ROUTE EIN-/AUSBLENDEN
// ============================================================

const routeToggle =
    document.getElementById(
        "routeToggle"
    );

const routeContent =
    document.getElementById(
        "routeContent"
    );


routeToggle?.addEventListener(
    "click",
    () => {

        const collapsed =
            routeContent.classList.toggle(
                "is-collapsed"
            );

        routeToggle
            .setAttribute(
                "aria-expanded",
                String(!collapsed)
            );

        routeToggle.textContent =
            collapsed
                ? "EINBLENDEN"
                : "AUSBLENDEN";
    }
);


// ============================================================
// SKATEPARK-BEREICH EIN-/AUSBLENDEN
// ============================================================

const skateparkToggle =
    document.getElementById(
        "skateparkToggle"
    );

const skateparkContent =
    document.getElementById(
        "skateparkContent"
    );


skateparkToggle?.addEventListener(
    "click",
    () => {

        const collapsed =
            skateparkContent.classList.toggle(
                "is-collapsed"
            );

        skateparkToggle
            .setAttribute(
                "aria-expanded",
                String(!collapsed)
            );

        skateparkToggle.textContent =
            collapsed
                ? "EINBLENDEN"
                : "AUSBLENDEN";
    }
);


// ============================================================
// ZWISCHENSTOPP
// ============================================================

const addRouteStop =
    document.getElementById(
        "addRouteStop"
    );

const routePoints =
    document.getElementById(
        "routePoints"
    );


let stopNumber = 1;


addRouteStop?.addEventListener(
    "click",
    () => {

        const existingStops =
            routePoints.querySelectorAll(
                ".route-point"
            ).length;

        if (existingStops >= 8) {

            setStatus(
                "Maximal 8 Routenpunkte möglich.",
                "error"
            );

            return;
        }

        const point =
            document.createElement("div");

        point.className =
            "route-point";

        point.dataset.routeIndex =
            existingStops;

        point.innerHTML = `

            <span class="route-point-marker">
                ${existingStops}
            </span>

            <input
                class="route-input"
                type="text"
                placeholder="Zwischenstopp"
                autocomplete="off"
                spellcheck="false"
            >

            <button
                class="route-remove-point"
                type="button"
                aria-label="Zwischenstopp entfernen"
            >
                ×
            </button>
        `;

        routePoints.insertBefore(
            point,
            routePoints.lastElementChild
        );

        point
            .querySelector(
                ".route-remove-point"
            )
            .addEventListener(
                "click",
                () => {

                    point.remove();
                }
            );
    }
);


// ============================================================
// ROUTE BERECHNEN
// ============================================================

async function calculateRoute() {

    const inputs =
        Array.from(
            document.querySelectorAll(
                ".route-input"
            )
        );

    const values =
        inputs
            .map(input =>
                input.value.trim()
            )
            .filter(Boolean);

    if (values.length < 2) {

        setStatus(
            "Bitte Start und Ziel eingeben.",
            "error"
        );

        return;
    }

    setStatus(
        "Route wird berechnet …",
        "loading"
    );

    const points = [];

    for (const value of values) {

        const results =
            await geocode(value);

        if (!results.length) {

            setStatus(
                `Ort nicht gefunden: ${value}`,
                "error"
            );

            return;
        }

        points.push({
            lat:
                Number(results[0].lat),

            lng:
                Number(results[0].lon)
        });
    }

    const coordinates =
        points
            .map(
                point =>
                    `${point.lng},${point.lat}`
            )
            .join(";");

    const url =
        `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
        "?overview=full&geometries=geojson";

    try {

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                "OSRM Fehler"
            );
        }

        const data =
            await response.json();

        if (
            data.code !== "Ok" ||
            !data.routes?.length
        ) {

            throw new Error(
                "Keine Route gefunden"
            );
        }

        currentRoute =
            data.routes[0];

        routeLayer.clearLayers();

        const routeGeoJson =
            L.geoJSON(
                currentRoute.geometry,
                {
                    style: {
                        weight: 5,
                        opacity: 0.85
                    }
                }
            ).addTo(routeLayer);

        map.fitBounds(
            routeGeoJson.getBounds(),
            {
                padding: [40, 40]
            }
        );

        setStatus(
            `Route: ${(currentRoute.distance / 1000).toFixed(1)} km · ` +
            `${Math.round(currentRoute.duration / 60)} min`,
            "success"
        );

    } catch (error) {

        console.error(error);

        setStatus(
            "Route konnte nicht berechnet werden.",
            "error"
        );
    }
}


document
    .getElementById("calculateRoute")
    ?.addEventListener(
        "click",
        calculateRoute
    );


// ============================================================
// ROUTE ZURÜCKSETZEN
// ============================================================

document
    .getElementById("clearRoute")
    ?.addEventListener(
        "click",
        () => {

            routeLayer.clearLayers();
            skateparkLayer.clearLayers();

            currentRoute = null;

            document
                .querySelectorAll(
                    ".route-input"
                )
                .forEach(input => {
                    input.value = "";
                });

            clearResults();

            setStatus(
                "Bereit.",
                ""
            );
        }
    );


// ============================================================
// START
// ============================================================

console.log(
    "MOI-CY Karte erfolgreich geladen."
);
