// ============================================================
// MOI-CY – SKATEPARK KARTE
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("MOI-CY Map: Start");

    // ------------------------------------------------------------
    // ELEMENTE
    // ------------------------------------------------------------

    const mapElement = document.getElementById("map");

    const mainSearch = document.getElementById("mainSearch");
    const mainSearchButton = document.getElementById("mainSearchButton");
    const searchSuggestions = document.getElementById("searchSuggestions");

    const skateparkRadius = document.getElementById("skateparkRadius");
    const skateparkLimit = document.getElementById("skateparkLimit");
    const skateparkSort = document.getElementById("skateparkSort");
    const searchSkateparksButton = document.getElementById("searchSkateparks");

    const resultsTitle = document.getElementById("resultsTitle");
    const resultsCount = document.getElementById("resultsCount");
    const resultsList = document.getElementById("resultsList");

    const mapStatus = document.getElementById("mapStatus");
    const mapStatusDot = document.getElementById("mapStatusDot");
    const mapStatusText = document.getElementById("mapStatusText");

    const satelliteToggle = document.getElementById("satelliteToggle");
    const locateMe = document.getElementById("locateMe");

    const mapPanel = document.getElementById("mapPanel");
    const mapPanelToggle = document.getElementById("mapPanelToggle");
    const mapPanelOpen = document.getElementById("mapPanelOpen");

    const routeToggle = document.getElementById("routeToggle");
    const routeContent = document.getElementById("routeContent");
    const routePoints = document.getElementById("routePoints");
    const addRouteStop = document.getElementById("addRouteStop");
    const calculateRouteButton = document.getElementById("calculateRoute");
    const clearRouteButton = document.getElementById("clearRoute");

    if (!mapElement) {
        console.error("MOI-CY Map: #map wurde nicht gefunden.");
        return;
    }

    // ------------------------------------------------------------
    // KARTE
    // ------------------------------------------------------------

    const map = L.map("map", {
        zoomControl: false,
        minZoom: 2,
        maxZoom: 19,
        worldCopyJump: false,
        maxBounds: [
            [-85, -180],
            [85, 180]
        ],
        maxBoundsViscosity: 1
    }).setView([51.2, 10.5], 5.5);

    const osmLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap-Mitwirkende",
            maxZoom: 19
        }
    );

    const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            attribution: "Tiles &copy; Esri",
            maxZoom: 19
        }
    );

    osmLayer.addTo(map);

    L.control.zoom({
        position: "bottomright"
    }).addTo(map);

    const skateparkLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const searchLayer = L.layerGroup().addTo(map);

    // ------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------

    function status(text, type = "normal") {
        if (mapStatusText) {
            mapStatusText.textContent = text;
        }

        if (mapStatusDot) {
            mapStatusDot.className = "map-status-dot";

            if (type === "loading") {
                mapStatusDot.classList.add("loading");
            }

            if (type === "error") {
                mapStatusDot.classList.add("error");
            }

            if (type === "success") {
                mapStatusDot.classList.add("success");
            }
        }

        if (mapStatus) {
            mapStatus.classList.remove("is-loading", "is-error", "is-success");

            if (type === "loading") {
                mapStatus.classList.add("is-loading");
            }

            if (type === "error") {
                mapStatus.classList.add("is-error");
            }

            if (type === "success") {
                mapStatus.classList.add("is-success");
            }
        }
    }

    // ------------------------------------------------------------
    // HILFSFUNKTIONEN
    // ------------------------------------------------------------

    function escapeHtml(value) {
        if (value === null || value === undefined) return "";

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
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

    function clearSearchResults() {
        if (searchSuggestions) {
            searchSuggestions.innerHTML = "";
            searchSuggestions.hidden = true;
        }
    }

    function clearResults() {
        if (resultsList) {
            resultsList.innerHTML = "";
        }

        if (resultsCount) {
            resultsCount.textContent = "0";
        }
    }

    function googleMapsLink(lat, lon) {
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    }

    // ------------------------------------------------------------
    // AKTUELLER SUCHORT
    // ------------------------------------------------------------

    let selectedLocation = null;

    // ------------------------------------------------------------
    // NOMINATIM – ORTSSUCHE
    // ------------------------------------------------------------

    async function searchPlace(query) {
        const text = query.trim();

        if (!text) {
            status("Bitte einen Ort eingeben.", "error");
            return [];
        }

        status(`Suche nach „${text}“…`, "loading");

        const url =
            "https://nominatim.openstreetmap.org/search" +
            "?format=jsonv2" +
            "&addressdetails=1" +
            "&limit=8" +
            "&accept-language=de" +
            "&q=" +
            encodeURIComponent(text);

        try {
            const response = await fetch(url, {
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Nominatim HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                status("Kein Ort gefunden.", "error");
                return [];
            }

            status(`${data.length} Ort${data.length === 1 ? "" : "e"} gefunden.`, "success");

            return data;

        } catch (error) {
            console.error("Ortssuche Fehler:", error);
            status("Ortssuche konnte nicht geladen werden.", "error");
            return [];
        }
    }

    // ------------------------------------------------------------
    // ORT AUSWÄHLEN
    // ------------------------------------------------------------

    function selectPlace(place) {
        const lat = Number(place.lat);
        const lon = Number(place.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
        }

        const name =
            place.display_name ||
            place.name ||
            "Gesuchter Ort";

        selectedLocation = {
            lat,
            lon,
            name
        };

        searchLayer.clearLayers();

        const marker = L.marker([lat, lon]);

        marker.bindPopup(`
            <strong>${escapeHtml(place.name || name)}</strong>
            <br>
            ${escapeHtml(name)}
        `);

        marker.addTo(searchLayer);
        marker.openPopup();

        map.flyTo([lat, lon], 12, {
            duration: 1
        });

        clearSearchResults();

        status(
            `Ort ausgewählt: ${place.name || name}`,
            "success"
        );
    }

    // ------------------------------------------------------------
    // ORTSSUCHE BUTTON
    // ------------------------------------------------------------

    async function performMainSearch() {
        const query = mainSearch?.value?.trim();

        if (!query) {
            status("Bitte zuerst einen Ort eingeben.", "error");

            if (mainSearch) {
                mainSearch.focus();
            }

            return;
        }

        clearSearchResults();

        const places = await searchPlace(query);

        if (!places.length) {
            return;
        }

        // Bei genau einem Treffer direkt auswählen
        if (places.length === 1) {
            selectPlace(places[0]);
            return;
        }

        // Mehrere Treffer anzeigen
        if (searchSuggestions) {
            searchSuggestions.innerHTML = "";

            places.forEach((place) => {
                const button = document.createElement("button");

                button.type = "button";
                button.className = "map-search-suggestion";

                button.innerHTML = `
                    <strong>${escapeHtml(place.name || "Ort")}</strong>
                    <span>${escapeHtml(place.display_name || "")}</span>
                `;

                button.addEventListener("click", () => {
                    selectPlace(place);
                });

                searchSuggestions.appendChild(button);
            });

            searchSuggestions.hidden = false;
        }

        status("Bitte einen Suchtreffer auswählen.", "success");
    }

    // Button
    if (mainSearchButton) {
        mainSearchButton.addEventListener("click", (event) => {
            event.preventDefault();
            performMainSearch();
        });
    }

    // Enter
    if (mainSearch) {
        mainSearch.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                performMainSearch();
            }
        });
    }

    // ------------------------------------------------------------
    // OVERPASS
    // ------------------------------------------------------------

    const overpassServers = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.private.coffee/api/interpreter"
    ];

    async function overpassRequest(query) {
        let lastError = null;

        for (const server of overpassServers) {
            const controller = new AbortController();

            const timeout = setTimeout(() => {
                controller.abort();
            }, 30000);

            try {
                const response = await fetch(server, {
                    method: "POST",
                    body: query,
                    headers: {
                        "Content-Type": "text/plain;charset=UTF-8"
                    },
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    throw new Error(
                        `Overpass HTTP ${response.status}`
                    );
                }

                return await response.json();

            } catch (error) {
                clearTimeout(timeout);
                lastError = error;

                console.warn(
                    "Overpass Server nicht erreichbar:",
                    server,
                    error
                );
            }
        }

        throw lastError || new Error("Kein Overpass Server erreichbar.");
    }

    // ------------------------------------------------------------
    // SKATEPARK DATEN
    // ------------------------------------------------------------

    function getElementCoordinates(element) {
        if (
            element.type === "node" &&
            Number.isFinite(Number(element.lat)) &&
            Number.isFinite(Number(element.lon))
        ) {
            return {
                lat: Number(element.lat),
                lon: Number(element.lon)
            };
        }

        if (
            element.center &&
            Number.isFinite(Number(element.center.lat)) &&
            Number.isFinite(Number(element.center.lon))
        ) {
            return {
                lat: Number(element.center.lat),
                lon: Number(element.center.lon)
            };
        }

        return null;
    }

    function normalizeSkateparks(elements) {
        const parks = [];
        const seen = new Set();

        for (const element of elements) {
            const coords = getElementCoordinates(element);

            if (!coords) continue;

            const tags = element.tags || {};

            const name =
                tags.name ||
                tags["name:de"] ||
                "Skatepark";

            const key =
                `${name.toLowerCase()}_${coords.lat.toFixed(5)}_${coords.lon.toFixed(5)}`;

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);

            parks.push({
                id: `${element.type}/${element.id}`,
                name,
                lat: coords.lat,
                lon: coords.lon,
                tags
            });
        }

        return parks;
    }

    // ------------------------------------------------------------
    // SKATEPARK SUCHEN
    // ------------------------------------------------------------

    async function searchSkateparks() {
        // Falls noch kein Ort ausgewählt wurde:
        if (!selectedLocation) {
            const query = mainSearch?.value?.trim();

            if (!query) {
                status(
                    "Bitte zuerst einen Ort suchen.",
                    "error"
                );

                mainSearch?.focus();
                return;
            }

            const places = await searchPlace(query);

            if (!places.length) {
                return;
            }

            // Besten/ersten Treffer verwenden
            selectPlace(places[0]);
        }

        if (!selectedLocation) {
            status(
                "Es wurde kein Suchort ausgewählt.",
                "error"
            );
            return;
        }

        const radius = Math.min(
            Number(skateparkRadius?.value || 25),
            25
        );

        const limit = Math.min(
            Number(skateparkLimit?.value || 30),
            30
        );

        const lat = selectedLocation.lat;
        const lon = selectedLocation.lon;

        status(
            `Suche Skateparks rund um ${selectedLocation.name}…`,
            "loading"
        );

        skateparkLayer.clearLayers();
        clearResults();

        const query = `
[out:json][timeout:25];

(
  nwr["leisure"="skatepark"](around:${radius * 1000},${lat},${lon});
  nwr["leisure"="skate_park"](around:${radius * 1000},${lat},${lon});
);

out center tags;
`;

        try {
            const data = await overpassRequest(query);

            let parks = normalizeSkateparks(
                data.elements || []
            );

            // Entfernung berechnen
            parks.forEach((park) => {
                park.distance = distanceKm(
                    lat,
                    lon,
                    park.lat,
                    park.lon
                );
            });

            // Sortierung
            const sortMode = skateparkSort?.value || "distance";

            if (sortMode === "distance") {
                parks.sort((a, b) => a.distance - b.distance);
            } else {
                // Für Größe/Qualität gibt es in OSM keine
                // einheitliche weltweite Bewertung.
                // Deshalb bleibt die Entfernung als
                // nachvollziehbare Ersatzsortierung.
                parks.sort((a, b) => a.distance - b.distance);
            }

            parks = parks.slice(0, limit);

            if (!parks.length) {
                status(
                    `Keine Skateparks innerhalb von ${radius} km gefunden.`,
                    "success"
                );

                if (resultsTitle) {
                    resultsTitle.textContent = "Skateparks";
                }

                return;
            }

            // ----------------------------------------------------
            // MARKER
            // ----------------------------------------------------

            parks.forEach((park, index) => {
                const marker = L.marker(
                    [park.lat, park.lon],
                    {
                        title: park.name
                    }
                );

                const surface =
                    park.tags.surface ||
                    park.tags["surface:material"] ||
                    "Keine Angabe";

                const lit =
                    park.tags.lit === "yes"
                        ? "Ja"
                        : park.tags.lit === "no"
                            ? "Nein"
                            : "Keine Angabe";

                marker.bindPopup(`
                    <div class="map-skatepark-popup">
                        <h3>${escapeHtml(park.name)}</h3>

                        <p>
                            <strong>Entfernung:</strong>
                            ${park.distance.toFixed(1)} km
                        </p>

                        <p>
                            <strong>Untergrund:</strong>
                            ${escapeHtml(surface)}
                        </p>

                        <p>
                            <strong>Beleuchtung:</strong>
                            ${escapeHtml(lit)}
                        </p>

                        <a
                            href="${googleMapsLink(park.lat, park.lon)}"
                            target="_blank"
                            rel="noopener"
                        >
                            Route mit Google Maps
                        </a>
                    </div>
                `);

                marker.addTo(skateparkLayer);
            });

            // ----------------------------------------------------
            // ERGEBNISLISTE
            // ----------------------------------------------------

            if (resultsTitle) {
                resultsTitle.textContent =
                    `Skateparks rund um ${selectedLocation.name}`;
            }

            if (resultsCount) {
                resultsCount.textContent = parks.length;
            }

            if (resultsList) {
                resultsList.innerHTML = "";

                parks.forEach((park) => {
                    const item = document.createElement("button");

                    item.type = "button";
                    item.className = "map-skatepark-result";

                    item.innerHTML = `
                        <strong>
                            ${escapeHtml(park.name)}
                        </strong>

                        <span>
                            ${park.distance.toFixed(1)} km entfernt
                        </span>
                    `;

                    item.addEventListener("click", () => {
                        map.flyTo(
                            [park.lat, park.lon],
                            16,
                            {
                                duration: 0.8
                            }
                        );

                        // passenden Marker öffnen
                        skateparkLayer.eachLayer((layer) => {
                            if (
                                layer.getLatLng &&
                                Math.abs(layer.getLatLng().lat - park.lat) < 0.00001 &&
                                Math.abs(layer.getLatLng().lng - park.lon) < 0.00001
                            ) {
                                layer.openPopup();
                            }
                        });
                    });

                    resultsList.appendChild(item);
                });
            }

            // Karte auf Ergebnisse anpassen
            const bounds = L.latLngBounds(
                parks.map((park) => [park.lat, park.lon])
            );

            bounds.extend([lat, lon]);

            map.fitBounds(bounds, {
                padding: [60, 60],
                maxZoom: 13
            });

            status(
                `${parks.length} Skatepark${parks.length === 1 ? "" : "s"} gefunden.`,
                "success"
            );

        } catch (error) {
            console.error("Skatepark-Suche Fehler:", error);

            status(
                "Die Skatepark-Daten konnten nicht geladen werden.",
                "error"
            );

            if (resultsList) {
                resultsList.innerHTML = `
                    <div class="map-skatepark-empty">
                        <strong>Fehler beim Laden</strong>
                        <p>
                            Der OpenStreetMap-Dienst antwortet gerade nicht.
                            Bitte versuche es in ein paar Sekunden erneut.
                        </p>
                    </div>
                `;
            }
        }
    }

    if (searchSkateparksButton) {
        searchSkateparksButton.addEventListener("click", (event) => {
            event.preventDefault();
            searchSkateparks();
        });
    }

    // Änderungen an Radius / Anzahl
    if (skateparkRadius) {
        skateparkRadius.addEventListener("change", () => {
            if (selectedLocation) {
                searchSkateparks();
            }
        });
    }

    if (skateparkLimit) {
        skateparkLimit.addEventListener("change", () => {
            if (selectedLocation) {
                searchSkateparks();
            }
        });
    }

    if (skateparkSort) {
        skateparkSort.addEventListener("change", () => {
            if (selectedLocation) {
                searchSkateparks();
            }
        });
    }

    // ------------------------------------------------------------
    // ROUTE
    // ------------------------------------------------------------

    function getRouteInputs() {
        return Array.from(
            document.querySelectorAll(
                "#routePoints .route-input"
            )
        );
    }

    function addRouteInput(value = "") {
        const inputs = getRouteInputs();

        if (inputs.length >= 8) {
            status(
                "Maximal 8 Routenpunkte möglich.",
                "error"
            );
            return;
        }

        const wrapper = document.createElement("div");

        wrapper.className = "route-point";

        wrapper.innerHTML = `
            <input
                type="text"
                class="route-input"
                data-route-input
                placeholder="Zwischenstopp"
                value="${escapeHtml(value)}"
            >
            <button
                type="button"
                class="route-remove"
                aria-label="Zwischenstopp entfernen"
            >
                ×
            </button>
        `;

        // Vor den letzten Punkt setzen
        const currentInputs = getRouteInputs();

        if (currentInputs.length > 0) {
            const lastPoint =
                currentInputs[currentInputs.length - 1]
                    .closest(".route-point");

            routePoints.insertBefore(
                wrapper,
                lastPoint
            );
        } else {
            routePoints.appendChild(wrapper);
        }

        const removeButton =
            wrapper.querySelector(".route-remove");

        removeButton.addEventListener("click", () => {
            wrapper.remove();
        });
    }

    if (addRouteStop) {
        addRouteStop.addEventListener("click", (event) => {
            event.preventDefault();
            addRouteInput();
        });
    }

    async function geocodeRoutePoint(value) {
        const results = await searchPlace(value);

        if (!results.length) {
            throw new Error(
                `Ort nicht gefunden: ${value}`
            );
        }

        return {
            lat: Number(results[0].lat),
            lon: Number(results[0].lon),
            name: results[0].display_name
        };
    }

    async function calculateRoute() {
        const inputs = getRouteInputs();

        const values = inputs
            .map((input) => input.value.trim())
            .filter(Boolean);

        if (values.length < 2) {
            status(
                "Bitte mindestens Start und Ziel eingeben.",
                "error"
            );
            return;
        }

        status(
            "Route wird berechnet…",
            "loading"
        );

        routeLayer.clearLayers();

        try {
            const points = [];

            for (const value of values) {
                const point = await geocodeRoutePoint(value);
                points.push(point);
            }

            const coordinates = points
                .map((point) => `${point.lon},${point.lat}`)
                .join(";");

            const url =
                "https://router.project-osrm.org/route/v1/driving/" +
                coordinates +
                "?overview=full&geometries=geojson";

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(
                    `OSRM HTTP ${response.status}`
                );
            }

            const data = await response.json();

            if (
                data.code !== "Ok" ||
                !data.routes ||
                !data.routes.length
            ) {
                throw new Error(
                    "Keine Route gefunden."
                );
            }

            const route = data.routes[0];

            const line = L.geoJSON(
                route.geometry,
                {
                    style: {
                        weight: 6
                    }
                }
            );

            line.addTo(routeLayer);

            map.fitBounds(
                line.getBounds(),
                {
                    padding: [50, 50]
                }
            );

            const distance =
                route.distance / 1000;

            const duration =
                Math.round(route.duration / 60);

            status(
                `Route: ${distance.toFixed(1)} km · ca. ${duration} Min.`,
                "success"
            );

        } catch (error) {
            console.error("Routenfehler:", error);

            status(
                "Die Route konnte nicht berechnet werden.",
                "error"
            );
        }
    }

    if (calculateRouteButton) {
        calculateRouteButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                calculateRoute();
            }
        );
    }

    // ------------------------------------------------------------
    // ROUTE LEEREN
    // ------------------------------------------------------------

    function clearRoute() {
        routeLayer.clearLayers();

        const inputs = getRouteInputs();

        inputs.forEach((input, index) => {
            if (index === 0 || index === inputs.length - 1) {
                input.value = "";
            } else {
                input.closest(".route-point")?.remove();
            }
        });

        status(
            "Route zurückgesetzt.",
            "normal"
        );
    }

    if (clearRouteButton) {
        clearRouteButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                clearRoute();
            }
        );
    }

    // ------------------------------------------------------------
    // SATELLIT
    // ------------------------------------------------------------

    if (satelliteToggle) {
        satelliteToggle.addEventListener(
            "click",
            (event) => {
                event.preventDefault();

                if (map.hasLayer(osmLayer)) {
                    map.removeLayer(osmLayer);
                    satelliteLayer.addTo(map);

                    satelliteToggle.classList.add(
                        "active"
                    );
                } else {
                    map.removeLayer(satelliteLayer);
                    osmLayer.addTo(map);

                    satelliteToggle.classList.remove(
                        "active"
                    );
                }
            }
        );
    }

    // ------------------------------------------------------------
    // STANDORT DES BENUTZERS
    // ------------------------------------------------------------

    if (locateMe) {
        locateMe.addEventListener(
            "click",
            (event) => {
                event.preventDefault();

                if (!navigator.geolocation) {
                    status(
                        "Dein Browser unterstützt keine Standortbestimmung.",
                        "error"
                    );
                    return;
                }

                status(
                    "Standort wird ermittelt…",
                    "loading"
                );

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat =
                            position.coords.latitude;

                        const lon =
                            position.coords.longitude;

                        selectedLocation = {
                            lat,
                            lon,
                            name: "Mein Standort"
                        };

                        searchLayer.clearLayers();

                        L.marker([lat, lon])
                            .bindPopup(
                                "<strong>Mein Standort</strong>"
                            )
                            .addTo(searchLayer)
                            .openPopup();

                        map.flyTo(
                            [lat, lon],
                            14,
                            {
                                duration: 1
                            }
                        );

                        status(
                            "Dein Standort wurde gefunden.",
                            "success"
                        );
                    },
                    (error) => {
                        console.error(
                            "Geolocation:",
                            error
                        );

                        status(
                            "Dein Standort konnte nicht ermittelt werden.",
                            "error"
                        );
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    }
                );
            }
        );
    }

    // ------------------------------------------------------------
    // PANEL
    // ------------------------------------------------------------

    if (mapPanelToggle && mapPanel) {
        mapPanelToggle.addEventListener(
            "click",
            () => {
                mapPanel.classList.toggle("is-collapsed");
            }
        );
    }

    if (mapPanelOpen && mapPanel) {
        mapPanelOpen.addEventListener(
            "click",
            () => {
                mapPanel.classList.remove(
                    "is-collapsed"
                );
            }
        );
    }

    // ------------------------------------------------------------
    // ROUTE AUF-/ZUKLAPPEN
    // ------------------------------------------------------------

    if (routeToggle && routeContent) {
        routeToggle.addEventListener(
            "click",
            () => {
                routeContent.hidden =
                    !routeContent.hidden;
            }
        );
    }

    // ------------------------------------------------------------
    // SKATEPARK-BEREICH AUF-/ZUKLAPPEN
    // ------------------------------------------------------------

    const skateparkToggle =
        document.getElementById("skateparkToggle");

    const skateparkContent =
        document.getElementById("skateparkContent");

    if (skateparkToggle && skateparkContent) {
        skateparkToggle.addEventListener(
            "click",
            () => {
                skateparkContent.hidden =
                    !skateparkContent.hidden;
            }
        );
    }

    // ------------------------------------------------------------
    // START
    // ------------------------------------------------------------

    status(
        "Karte bereit.",
        "success"
    );

    console.log(
        "MOI-CY Map: vollständig geladen"
    );
});
