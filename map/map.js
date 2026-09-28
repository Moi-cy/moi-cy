/* =========================================================
   MOI-CY MAP
   map/map.js
   ========================================================= */

const CONFIG = {
    dataUrl: "./skateparks.json",

    // Kartenstart
    initialCenter: [51.2, 10.5],
    initialZoom: 5.5,

    // Weltgrenzen
    maxBounds: [
        [-85, -180],
        [85, 180]
    ],

    // Geocoder
    nominatimUrl: "https://nominatim.openstreetmap.org/search",
    photonUrl: "https://photon.komoot.io/api/",

    // Routing
    osrmUrl: "https://router.project-osrm.org/route/v1/driving",

    // Sicherheit / Timeouts
    geocoderTimeout: 8000,
    routeTimeout: 15000,
    overallRouteTimeout: 45000,

    // Suche
    searchDebounce: 450,

    // Lokaler Spatial Index
    gridSize: 0.25,

    // Skatepark-Suche
    maxRadius: 25,
    maxResults: 30,

    // Route
    maxRoutePoints: 8
};


/* =========================================================
   DOM
   ========================================================= */

const mapElement = document.getElementById("map");

const mapPanel = document.getElementById("mapPanel");
const mapPanelContent = document.getElementById("mapPanelContent");
const mapPanelToggle = document.getElementById("mapPanelToggle");
const mapPanelOpen = document.getElementById("mapPanelOpen");

const mainSearch = document.getElementById("mainSearch");
const mainSearchButton = document.getElementById("mainSearchButton");
const searchSuggestions = document.getElementById("searchSuggestions");

const routeToggle = document.getElementById("routeToggle");
const routeContent = document.getElementById("routeContent");
const routePoints = document.getElementById("routePoints");
const addRouteStopButton = document.getElementById("addRouteStop");
const calculateRouteButton = document.getElementById("calculateRoute");
const clearRouteButton = document.getElementById("clearRoute");

const skateparkToggle = document.getElementById("skateparkToggle");
const skateparkContent = document.getElementById("skateparkContent");
const skateparkRadius = document.getElementById("skateparkRadius");
const skateparkLimit = document.getElementById("skateparkLimit");
const skateparkSort = document.getElementById("skateparkSort");
const searchSkateparksButton = document.getElementById("searchSkateparks");

const mapStatus = document.getElementById("mapStatus");
const mapStatusDot = document.getElementById("mapStatusDot");
const mapStatusText = document.getElementById("mapStatusText");

const mapResults = document.getElementById("mapResults");
const resultsTitle = document.getElementById("resultsTitle");
const resultsCount = document.getElementById("resultsCount");
const resultsList = document.getElementById("resultsList");

const satelliteToggle = document.getElementById("satelliteToggle");
const locateMeButton = document.getElementById("locateMe");


/* =========================================================
   MAP
   ========================================================= */

const map = L.map("map", {
    zoomControl: false,
    minZoom: 2,
    maxZoom: 19,
    maxBounds: CONFIG.maxBounds,
    maxBoundsViscosity: 1,
    worldCopyJump: false,
    preferCanvas: true
}).setView(CONFIG.initialCenter, CONFIG.initialZoom);

L.control.zoom({
    position: "bottomright"
}).addTo(map);


/* =========================================================
   TILE LAYERS
   ========================================================= */

const standardLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap-Mitwirkende"
    }
);

const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri"
    }
);

standardLayer.addTo(map);


/* =========================================================
   LAYER GROUPS
   ========================================================= */

const skateparkLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const searchMarkerLayer = L.layerGroup().addTo(map);


/* =========================================================
   STATE
   ========================================================= */

let skateparks = [];
let skateparkIndex = new Map();

let lastSearchLocation = null;
let currentRoute = null;

let searchMarker = null;

let searchDebounceTimer = null;
let geocoderRequestRunning = false;

let lastNominatimRequest = 0;


/* =========================================================
   HELPER
   ========================================================= */

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}


function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function withTimeout(promise, timeoutMs, message = "Zeitüberschreitung") {
    let timer;

    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(message));
        }, timeoutMs);
    });

    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        timeout
    ]);
}


function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9äöüß\s]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function haversineDistance(lat1, lng1, lat2, lng2) {
    const earthRadius = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    return earthRadius * 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );
}


function formatDistance(distance) {
    if (distance < 1) {
        return `${Math.round(distance * 1000)} m`;
    }

    if (distance < 10) {
        return `${distance.toFixed(1).replace(".", ",")} km`;
    }

    return `${Math.round(distance)} km`;
}


function getGridKey(lat, lng) {
    const latCell = Math.floor(lat / CONFIG.gridSize);
    const lngCell = Math.floor(lng / CONFIG.gridSize);

    return `${latCell}:${lngCell}`;
}


function getGridCandidates(lat, lng, radiusKm) {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / Math.max(
        111 * Math.cos(lat * Math.PI / 180),
        1
    );

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    const minLatCell = Math.floor(minLat / CONFIG.gridSize);
    const maxLatCell = Math.floor(maxLat / CONFIG.gridSize);

    const minLngCell = Math.floor(minLng / CONFIG.gridSize);
    const maxLngCell = Math.floor(maxLng / CONFIG.gridSize);

    const candidates = [];

    for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
        for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell++) {
            const key = `${latCell}:${lngCell}`;
            const bucket = skateparkIndex.get(key);

            if (bucket) {
                candidates.push(...bucket);
            }
        }
    }

    return candidates;
}


function setStatus(text, type = "") {
    if (!mapStatusText) {
        return;
    }

    mapStatusText.textContent = text;

    mapStatus.classList.remove(
        "loading",
        "success",
        "error"
    );

    if (type) {
        mapStatus.classList.add(type);
    }

    if (mapStatusDot) {
        mapStatusDot.className = "map-status-dot";

        if (type) {
            mapStatusDot.classList.add(type);
        }
    }
}


/* =========================================================
   LOCAL STORAGE CACHE
   ========================================================= */

const GEO_CACHE_KEY = "moiCyMapGeoCacheV1";


function getGeoCache() {
    try {
        return JSON.parse(
            localStorage.getItem(GEO_CACHE_KEY) || "{}"
        );
    } catch {
        return {};
    }
}


function setGeoCache(cache) {
    try {
        localStorage.setItem(
            GEO_CACHE_KEY,
            JSON.stringify(cache)
        );
    } catch {
        // LocalStorage kann blockiert sein.
    }
}


function getCachedGeocode(query) {
    const cache = getGeoCache();
    const key = normalizeText(query);

    return cache[key] || null;
}


function cacheGeocode(query, results) {
    const cache = getGeoCache();
    const key = normalizeText(query);

    cache[key] = results;

    const keys = Object.keys(cache);

    if (keys.length > 100) {
        delete cache[keys[0]];
    }

    setGeoCache(cache);
}


/* =========================================================
   FUZZY SEARCH
   ========================================================= */

function levenshtein(a, b) {
    a = normalizeText(a);
    b = normalizeText(b);

    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            matrix[i][j] =
                b.charAt(i - 1) === a.charAt(j - 1)
                    ? matrix[i - 1][j - 1]
                    : Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
        }
    }

    return matrix[b.length][a.length];
}


function fuzzyScore(query, text) {
    const q = normalizeText(query);
    const t = normalizeText(text);

    if (!q || !t) {
        return 0;
    }

    if (t === q) {
        return 1;
    }

    if (t.includes(q)) {
        return 0.9;
    }

    const queryWords = q.split(" ");
    const textWords = t.split(" ");

    let matchedWords = 0;

    for (const word of queryWords) {
        if (!word) continue;

        let best = 0;

        for (const textWord of textWords) {
            const distance = levenshtein(word, textWord);
            const maxLength = Math.max(word.length, textWord.length);

            if (!maxLength) continue;

            const similarity = 1 - distance / maxLength;
            best = Math.max(best, similarity);
        }

        if (best >= 0.65) {
            matchedWords++;
        }
    }

    return matchedWords / Math.max(queryWords.length, 1);
}


function rankGeocoderResults(query, results) {
    return [...results]
        .map(result => {
            const searchable = [
                result.name,
                result.display_name,
                result.address?.city,
                result.address?.town,
                result.address?.village,
                result.address?.municipality,
                result.address?.state,
                result.address?.country
            ]
                .filter(Boolean)
                .join(" ");

            return {
                ...result,
                _score: fuzzyScore(query, searchable)
            };
        })
        .sort((a, b) => b._score - a._score);
}


/* =========================================================
   GEOCODING
   ========================================================= */

async function waitForNominatim() {
    const now = Date.now();
    const difference = now - lastNominatimRequest;

    if (difference < 1100) {
        await sleep(1100 - difference);
    }

    lastNominatimRequest = Date.now();
}


async function fetchNominatim(query) {
    await waitForNominatim();

    const params = new URLSearchParams({
        format: "jsonv2",
        limit: "5",
        addressdetails: "1",
        "accept-language": "de",
        q: query
    });

    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        CONFIG.geocoderTimeout
    );

    try {
        const response = await fetch(
            `${CONFIG.nominatimUrl}?${params}`,
            {
                signal: controller.signal,
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Nominatim HTTP ${response.status}`
            );
        }

        return await response.json();

    } finally {
        clearTimeout(timer);
    }
}


async function fetchPhoton(query) {
    const params = new URLSearchParams({
        q: query,
        limit: "5",
        lang: "de"
    });

    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        CONFIG.geocoderTimeout
    );

    try {
        const response = await fetch(
            `${CONFIG.photonUrl}?${params}`,
            {
                signal: controller.signal
            }
        );

        if (!response.ok) {
            throw new Error(
                `Photon HTTP ${response.status}`
            );
        }

        const data = await response.json();

        return (data.features || []).map(feature => {
            const coordinates = feature.geometry?.coordinates || [];
            const properties = feature.properties || {};

            return {
                lat: String(coordinates[1] || ""),
                lon: String(coordinates[0] || ""),
                display_name: [
                    properties.name,
                    properties.city,
                    properties.state,
                    properties.country
                ]
                    .filter(Boolean)
                    .join(", "),
                name: properties.name || "",
                address: {
                    city: properties.city,
                    town: properties.town,
                    village: properties.village,
                    municipality: properties.municipality,
                    state: properties.state,
                    country: properties.country
                }
            };
        });

    } finally {
        clearTimeout(timer);
    }
}


async function geocode(query) {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
        return [];
    }

    const cached = getCachedGeocode(cleanQuery);

    if (cached) {
        return cached;
    }

    let results = [];

    try {
        results = await fetchNominatim(cleanQuery);
    } catch {
        results = [];
    }

    if (!results.length) {
        try {
            results = await fetchPhoton(cleanQuery);
        } catch {
            results = [];
        }
    }

    results = rankGeocoderResults(
        cleanQuery,
        results
    );

    cacheGeocode(
        cleanQuery,
        results
    );

    return results;
}


function getGeocoderResultName(result) {
    if (result.name) {
        return result.name;
    }

    if (result.address?.city) {
        return result.address.city;
    }

    if (result.address?.town) {
        return result.address.town;
    }

    if (result.address?.village) {
        return result.address.village;
    }

    return result.display_name || "Ort";
}


/* =========================================================
   MAIN SEARCH
   ========================================================= */

async function performMainSearch(query = mainSearch.value) {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
        return;
    }

    setStatus(
        "Ort wird gesucht …",
        "loading"
    );

    hideSuggestions();

    try {
        const results = await geocode(cleanQuery);

        if (!results.length) {
            setStatus(
                "Ort wurde nicht gefunden.",
                "error"
            );

            return;
        }

        const result = results[0];

        const lat = Number(result.lat);
        const lng = Number(
            result.lon ?? result.lng
        );

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw new Error("Ungültige Koordinaten");
        }

        lastSearchLocation = {
            lat,
            lng,
            name: getGeocoderResultName(result),
            displayName: result.display_name || ""
        };

        searchMarkerLayer.clearLayers();

        searchMarker = L.marker([lat, lng])
            .addTo(searchMarkerLayer);

        searchMarker.bindPopup(`
            <div class="map-popup">
                <div class="map-popup-title">
                    ${escapeHtml(
                        getGeocoderResultName(result)
                    )}
                </div>

                <div class="map-popup-meta">
                    ${escapeHtml(
                        result.display_name || ""
                    )}
                </div>
            </div>
        `);

        searchMarker.openPopup();

        map.flyTo(
            [lat, lng],
            Math.max(map.getZoom(), 12),
            {
                duration: 0.8
            }
        );

        setStatus(
            `${getGeocoderResultName(result)} gefunden.`,
            "success"
        );

    } catch (error) {
        console.error(error);

        setStatus(
            "Die Ortssuche ist gerade nicht verfügbar.",
            "error"
        );
    }
}


async function updateSearchSuggestions(query) {
    if (query.trim().length < 3) {
        hideSuggestions();
        return;
    }

    if (geocoderRequestRunning) {
        return;
    }

    geocoderRequestRunning = true;

    try {
        const results = await geocode(query);

        if (!results.length) {
            hideSuggestions();
            return;
        }

        searchSuggestions.innerHTML = results
            .slice(0, 5)
            .map((result, index) => `
                <button
                    type="button"
                    class="map-search-suggestion"
                    data-suggestion-index="${index}"
                >
                    <span class="map-search-suggestion-main">
                        ${escapeHtml(
                            getGeocoderResultName(result)
                        )}
                    </span>

                    <span class="map-search-suggestion-sub">
                        ${escapeHtml(
                            result.display_name || ""
                        )}
                    </span>
                </button>
            `)
            .join("");

        searchSuggestions.hidden = false;

        searchSuggestions
            .querySelectorAll(
                ".map-search-suggestion"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    async () => {
                        const index = Number(
                            button.dataset.suggestionIndex
                        );

                        const selected = results[index];

                        if (!selected) {
                            return;
                        }

                        mainSearch.value =
                            getGeocoderResultName(selected);

                        hideSuggestions();

                        await performMainSearch(
                            mainSearch.value
                        );
                    }
                );
            });

    } catch {
        hideSuggestions();
    } finally {
        geocoderRequestRunning = false;
    }
}


function hideSuggestions() {
    if (!searchSuggestions) {
        return;
    }

    searchSuggestions.hidden = true;
    searchSuggestions.innerHTML = "";
}


/* =========================================================
   NORMAL SEARCH EVENTS
   ========================================================= */

mainSearchButton?.addEventListener(
    "click",
    () => performMainSearch()
);

mainSearch?.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            event.preventDefault();
            performMainSearch();
        }

        if (event.key === "Escape") {
            hideSuggestions();
        }
    }
);


mainSearch?.addEventListener(
    "input",
    () => {
        clearTimeout(searchDebounceTimer);

        searchDebounceTimer = setTimeout(
            () => updateSearchSuggestions(
                mainSearch.value
            ),
            CONFIG.searchDebounce
        );
    }
);


document.addEventListener(
    "click",
    event => {
        if (
            !event.target.closest(
                ".map-main-search"
            ) &&
            !event.target.closest(
                "#searchSuggestions"
            )
        ) {
            hideSuggestions();
        }
    }
);


/* =========================================================
   SKATEPARK DATA
   ========================================================= */

function normalizeSkatepark(raw, index) {
    if (!raw) {
        return null;
    }

    const lat = Number(
        raw.lat ?? raw.latitude
    );

    const lng = Number(
        raw.lng ??
        raw.lon ??
        raw.longitude
    );

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {
        return null;
    }

    const tags =
        raw.tags &&
        typeof raw.tags === "object"
            ? raw.tags
            : {};

    const name =
        raw.name ||
        tags.name ||
        "Skatepark";

    return {
        id: String(
            raw.id ||
            `park-${index}-${lat}-${lng}`
        ),

        name,

        lat,
        lng,

        city:
            raw.city ||
            raw.town ||
            raw.village ||
            tags.city ||
            "",

        country:
            raw.country ||
            tags.country ||
            "",

        size:
            raw.size ||
            tags.size ||
            "",

        sizeScore: Number(
            raw.size_score ??
            raw.sizeScore ??
            0
        ),

        area: Number(
            raw.area || 0
        ),

        website:
            raw.website ||
            tags.website ||
            "",

        surface:
            raw.surface ||
            tags.surface ||
            "",

        lit:
            raw.lit === true ||
            raw.lit === "yes" ||
            tags.lit === true ||
            tags.lit === "yes",

        operator:
            raw.operator ||
            tags.operator ||
            "",

        description:
            raw.description ||
            tags.description ||
            "",

        tags
    };
}


async function loadSkateparks() {
    setStatus(
        "Skatepark-Daten werden geladen …",
        "loading"
    );

    try {
        const response = await fetch(
            CONFIG.dataUrl,
            {
                cache: "default"
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "skateparks.json muss ein Array enthalten."
            );
        }

        skateparks = data
            .map(normalizeSkatepark)
            .filter(Boolean);

        buildSkateparkIndex();

        setStatus(
            `${skateparks.length.toLocaleString("de-DE")} Skateparks geladen.`,
            "success"
        );

    } catch (error) {
        console.error(
            "Skatepark-Daten konnten nicht geladen werden:",
            error
        );

        skateparks = [];
        skateparkIndex.clear();

        setStatus(
            "skateparks.json konnte nicht geladen werden.",
            "error"
        );
    }
}


function buildSkateparkIndex() {
    skateparkIndex.clear();

    for (const park of skateparks) {
        const key = getGridKey(
            park.lat,
            park.lng
        );

        if (!skateparkIndex.has(key)) {
            skateparkIndex.set(
                key,
                []
            );
        }

        skateparkIndex
            .get(key)
            .push(park);
    }
}


/* =========================================================
   SKATEPARK RELEVANCE
   ========================================================= */

function getParkRelevance(park) {
    let score = 0;

    const name = normalizeText(
        park.name
    );

    const tagText = normalizeText(
        Object.values(park.tags || {})
            .filter(value =>
                typeof value === "string"
            )
            .join(" ")
    );

    const combined =
        `${name} ${tagText}`;

    if (
        park.tags?.leisure === "skatepark"
    ) {
        score += 100;
    }

    if (
        combined.includes("skatepark")
    ) {
        score += 40;
    }

    if (
        combined.includes("skate")
    ) {
        score += 15;
    }

    if (
        combined.includes("bmx")
    ) {
        score += 8;
    }

    if (park.website) {
        score += 8;
    }

    if (park.operator) {
        score += 4;
    }

    if (park.description) {
        score += 4;
    }

    if (park.surface) {
        score += 3;
    }

    if (park.lit) {
        score += 2;
    }

    if (park.sizeScore > 0) {
        score += park.sizeScore * 5;
    }

    if (park.area > 0) {
        score += Math.min(
            park.area / 1000,
            15
        );
    }

    return score;
}


/* =========================================================
   ROUTE DISTANCE
   ========================================================= */

function distancePointToSegment(
    pointLat,
    pointLng,
    aLat,
    aLng,
    bLat,
    bLng
) {
    const latFactor =
        Math.cos(
            pointLat * Math.PI / 180
        );

    const x =
        pointLng * latFactor;

    const y =
        pointLat;

    const ax =
        aLng * latFactor;

    const ay =
        aLat;

    const bx =
        bLng * latFactor;

    const by =
        bLat;

    const dx = bx - ax;
    const dy = by - ay;

    if (dx === 0 && dy === 0) {
        return haversineDistance(
            pointLat,
            pointLng,
            aLat,
            aLng
        );
    }

    const t = clamp(
        (
            (x - ax) * dx +
            (y - ay) * dy
        ) /
        (dx * dx + dy * dy),
        0,
        1
    );

    const closestX =
        ax + t * dx;

    const closestY =
        ay + t * dy;

    const closestLng =
        closestX / latFactor;

    return haversineDistance(
        pointLat,
        pointLng,
        closestY,
        closestLng
    );
}


function distancePointToRoute(
    park,
    routeLatLngs
) {
    let minimum = Infinity;

    for (
        let i = 0;
        i < routeLatLngs.length - 1;
        i++
    ) {
        const a = routeLatLngs[i];
        const b = routeLatLngs[i + 1];

        const distance =
            distancePointToSegment(
                park.lat,
                park.lng,
                a.lat,
                a.lng,
                b.lat,
                b.lng
            );

        if (distance < minimum) {
            minimum = distance;
        }
    }

    return minimum;
}


/* =========================================================
   SKATEPARK SEARCH
   ========================================================= */

function searchSkateparksAroundLocation(
    center,
    radiusKm,
    limit,
    sortMode
) {
    const candidates =
        getGridCandidates(
            center.lat,
            center.lng,
            radiusKm
        );

    const unique = new Map();

    for (const park of candidates) {
        unique.set(
            park.id,
            park
        );
    }

    const results = [];

    for (const park of unique.values()) {
        const distance =
            haversineDistance(
                center.lat,
                center.lng,
                park.lat,
                park.lng
            );

        if (distance <= radiusKm) {
            results.push({
                park,
                distance,
                relevance:
                    getParkRelevance(park)
            });
        }
    }

    sortParkResults(
        results,
        sortMode
    );

    return results.slice(
        0,
        limit
    );
}


function searchSkateparksAlongRoute(
    routeLatLngs,
    radiusKm,
    limit,
    sortMode
) {
    if (
        !routeLatLngs ||
        routeLatLngs.length < 2
    ) {
        return [];
    }

    const lats =
        routeLatLngs.map(point => point.lat);

    const lngs =
        routeLatLngs.map(point => point.lng);

    const latPadding =
        radiusKm / 111;

    const averageLat =
        lats.reduce(
            (sum, value) => sum + value,
            0
        ) / lats.length;

    const lngPadding =
        radiusKm /
        Math.max(
            111 *
            Math.cos(
                averageLat * Math.PI / 180
            ),
            1
        );

    const minLat =
        Math.min(...lats) -
        latPadding;

    const maxLat =
        Math.max(...lats) +
        latPadding;

    const minLng =
        Math.min(...lngs) -
        lngPadding;

    const maxLng =
        Math.max(...lngs) +
        lngPadding;

    const minLatCell =
        Math.floor(
            minLat / CONFIG.gridSize
        );

    const maxLatCell =
        Math.floor(
            maxLat / CONFIG.gridSize
        );

    const minLngCell =
        Math.floor(
            minLng / CONFIG.gridSize
        );

    const maxLngCell =
        Math.floor(
            maxLng / CONFIG.gridSize
        );

    const candidates = new Map();

    for (
        let latCell = minLatCell;
        latCell <= maxLatCell;
        latCell++
    ) {
        for (
            let lngCell = minLngCell;
            lngCell <= maxLngCell;
            lngCell++
        ) {
            const bucket =
                skateparkIndex.get(
                    `${latCell}:${lngCell}`
                );

            if (!bucket) {
                continue;
            }

            for (const park of bucket) {
                candidates.set(
                    park.id,
                    park
                );
            }
        }
    }

    const results = [];

    for (const park of candidates.values()) {
        const distance =
            distancePointToRoute(
                park,
                routeLatLngs
            );

        if (distance <= radiusKm) {
            results.push({
                park,
                distance,
                relevance:
                    getParkRelevance(park)
            });
        }
    }

    sortParkResults(
        results,
        sortMode
    );

    return results.slice(
        0,
        limit
    );
}


function sortParkResults(
    results,
    sortMode
) {
    if (sortMode === "size") {
        results.sort(
            (a, b) => {
                const aSize =
                    a.park.sizeScore ||
                    a.park.area ||
                    0;

                const bSize =
                    b.park.sizeScore ||
                    b.park.area ||
                    0;

                if (bSize !== aSize) {
                    return bSize - aSize;
                }

                return (
                    a.distance -
                    b.distance
                );
            }
        );

        return;
    }

    if (sortMode === "quality") {
        results.sort(
            (a, b) => {
                if (
                    b.relevance !==
                    a.relevance
                ) {
                    return (
                        b.relevance -
                        a.relevance
                    );
                }

                return (
                    a.distance -
                    b.distance
                );
            }
        );

        return;
    }

    results.sort(
        (a, b) => {
            if (
                a.distance !==
                b.distance
            ) {
                return (
                    a.distance -
                    b.distance
                );
            }

            return (
                b.relevance -
                a.relevance
            );
        }
    );
}


async function performSkateparkSearch() {
    if (!skateparks.length) {
        setStatus(
            "Die Skatepark-Daten sind noch nicht verfügbar.",
            "error"
        );

        return;
    }

    const radius = clamp(
        Number(
            skateparkRadius?.value || 15
        ),
        1,
        CONFIG.maxRadius
    );

    const limit = clamp(
        Number(
            skateparkLimit?.value || 20
        ),
        1,
        CONFIG.maxResults
    );

    const sortMode =
        skateparkSort?.value ||
        "distance";

    skateparkLayer.clearLayers();

    let results = [];

    if (
        currentRoute &&
        currentRoute.latLngs?.length >= 2
    ) {
        results =
            searchSkateparksAlongRoute(
                currentRoute.latLngs,
                radius,
                limit,
                sortMode
            );

        resultsTitle.textContent =
            "Skateparks entlang der Route";

    } else {
        const center =
            lastSearchLocation ||
            (() => {
                const center =
                    map.getCenter();

                return {
                    lat: center.lat,
                    lng: center.lng,
                    name: "Kartenmitte"
                };
            })();

        results =
            searchSkateparksAroundLocation(
                center,
                radius,
                limit,
                sortMode
            );

        resultsTitle.textContent =
            "Skateparks in der Nähe";
    }

    renderSkateparkResults(
        results
    );

    if (results.length) {
        setStatus(
            `${results.length} Skateparks gefunden.`,
            "success"
        );
    } else {
        setStatus(
            `Keine Skateparks im Radius von ${radius} km gefunden.`,
            "error"
        );
    }
}


/* =========================================================
   SKATEPARK MARKERS
   ========================================================= */

function createSkateparkIcon() {
    return L.divIcon({
        className: "map-skatepark-marker-wrap",
        html: `
            <div class="map-skatepark-marker">
                <span>▰</span>
            </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
    });
}


function renderSkateparkMarkers(
    results
) {
    skateparkLayer.clearLayers();

    for (const item of results) {
        const park = item.park;

        const marker =
            L.marker(
                [park.lat, park.lng],
                {
                    icon:
                        createSkateparkIcon()
                }
            );

        const locationText = [
            park.city,
            park.country
        ]
            .filter(Boolean)
            .join(", ");

        const googleMapsUrl =
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${park.lat},${park.lng}`
            )}`;

        const metadata = [
            locationText,
            item.distance !== undefined
                ? `${formatDistance(item.distance)} entfernt`
                : "",
            park.surface
                ? `Belag: ${park.surface}`
                : "",
            park.lit
                ? "Beleuchtet"
                : ""
        ]
            .filter(Boolean)
            .join(" · ");

        marker.bindPopup(`
            <div class="map-popup">
                <div class="map-popup-title">
                    ${escapeHtml(park.name)}
                </div>

                ${
                    metadata
                        ? `
                            <div class="map-popup-meta">
                                ${escapeHtml(metadata)}
                            </div>
                        `
                        : ""
                }

                <a
                    class="map-popup-button"
                    href="${googleMapsUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Route mit Google Maps
                </a>
            </div>
        `);

        marker.addTo(skateparkLayer);

        marker.on(
            "click",
            () => {
                highlightResult(
                    park.id
                );
            }
        );
    }
}


/* =========================================================
   SKATEPARK RESULT LIST
   ========================================================= */

function renderSkateparkResults(
    results
) {
    renderSkateparkMarkers(
        results
    );

    if (!mapResults || !resultsList) {
        return;
    }

    mapResults.hidden = false;

    resultsCount.textContent =
        String(results.length);

    if (!results.length) {
        resultsList.innerHTML = `
            <div class="map-results-empty">
                Keine passenden Skateparks gefunden.
            </div>
        `;

        return;
    }

    resultsList.innerHTML =
        results
            .map((item, index) => {
                const park = item.park;

                const locationText = [
                    park.city,
                    park.country
                ]
                    .filter(Boolean)
                    .join(", ");

                const details = [
                    locationText,
                    formatDistance(
                        item.distance
                    )
                ]
                    .filter(Boolean)
                    .join(" · ");

                return `
                    <button
                        type="button"
                        class="map-result-item"
                        data-park-id="${escapeHtml(
                            park.id
                        )}"
                    >
                        <span class="map-result-number">
                            ${index + 1}
                        </span>

                        <span class="map-result-content">
                            <strong>
                                ${escapeHtml(
                                    park.name
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    details
                                )}
                            </span>
                        </span>

                        <span class="map-result-arrow">
                            →
                        </span>
                    </button>
                `;
            })
            .join("");

    resultsList
        .querySelectorAll(
            ".map-result-item"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const park =
                        skateparks.find(
                            item =>
                                item.id ===
                                button.dataset.parkId
                        );

                    if (!park) {
                        return;
                    }

                    focusSkatepark(
                        park
                    );
                }
            );
        });
}


function highlightResult(id) {
    resultsList
        ?.querySelectorAll(
            ".map-result-item"
        )
        .forEach(item => {
            item.classList.toggle(
                "is-active",
                item.dataset.parkId === id
            );
        });
}


function focusSkatepark(park) {
    highlightResult(
        park.id
    );

    map.flyTo(
        [park.lat, park.lng],
        Math.max(
            map.getZoom(),
            16
        ),
        {
            duration: 0.6
        }
    );

    skateparkLayer.eachLayer(
        marker => {
            const latLng =
                marker.getLatLng();

            if (
                Math.abs(
                    latLng.lat -
                    park.lat
                ) < 0.00001 &&
                Math.abs(
                    latLng.lng -
                    park.lng
                ) < 0.00001
            ) {
                marker.openPopup();
            }
        }
    );
}


/* =========================================================
   ROUTE POINTS
   ========================================================= */

function getRouteInputs() {
    return [
        ...routePoints.querySelectorAll(
            "[data-route-input]"
        )
    ];
}


function updateRoutePointLabels() {
    const points =
        getRouteInputs();

    points.forEach(
        (input, index) => {
            const wrapper =
                input.closest(
                    ".map-route-point"
                );

            if (!wrapper) {
                return;
            }

            const label =
                wrapper.querySelector(
                    ".map-route-point-label"
                );

            if (label) {
                label.textContent =
                    String.fromCharCode(
                        65 + index
                    );
            }

            const removeButton =
                wrapper.querySelector(
                    ".map-route-remove"
                );

            if (removeButton) {
                removeButton.disabled =
                    points.length <= 2;
            }
        }
    );
}


function createRoutePoint(
    value = ""
) {
    const index =
        getRouteInputs().length;

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "map-route-point";

    wrapper.innerHTML = `
        <span class="map-route-point-label">
            ${String.fromCharCode(
                65 + index
            )}
        </span>

        <input
            type="text"
            class="map-route-input"
            data-route-input="${index}"
            placeholder="Zwischenstopp eingeben"
            autocomplete="off"
            value="${escapeHtml(value)}"
        >

        <button
            type="button"
            class="map-route-remove"
            aria-label="Zwischenstopp entfernen"
        >
            ×
        </button>
    `;

    const removeButton =
        wrapper.querySelector(
            ".map-route-remove"
        );

    removeButton.addEventListener(
        "click",
        () => {
            wrapper.remove();
            updateRoutePointLabels();
        }
    );

    routePoints.insertBefore(
        wrapper,
        routePoints.lastElementChild
    );

    updateRoutePointLabels();

    return wrapper;
}


addRouteStopButton?.addEventListener(
    "click",
    () => {
        if (
            getRouteInputs().length >=
            CONFIG.maxRoutePoints
        ) {
            setStatus(
                `Maximal ${CONFIG.maxRoutePoints} Punkte möglich.`,
                "error"
            );

            return;
        }

        const wrapper =
            createRoutePoint();

        wrapper
            .querySelector("input")
            ?.focus();
    }
);


/* =========================================================
   ROUTE GEOCODING
   ========================================================= */

async function geocodeRoutePoints(
    values
) {
    const locations = [];

    for (
        let i = 0;
        i < values.length;
        i++
    ) {
        const value =
            values[i].trim();

        if (!value) {
            throw new Error(
                `Routenpunkt ${String.fromCharCode(
                    65 + i
                )} fehlt.`
            );
        }

        setStatus(
            `Routenpunkt ${String.fromCharCode(
                65 + i
            )} wird gesucht …`,
            "loading"
        );

        const results =
            await geocode(value);

        if (!results.length) {
            throw new Error(
                `"${value}" wurde nicht gefunden.`
            );
        }

        const result =
            results[0];

        const lat =
            Number(result.lat);

        const lng =
            Number(
                result.lon ??
                result.lng
            );

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {
            throw new Error(
                `"${value}" hat keine gültigen Koordinaten.`
            );
        }

        locations.push({
            lat,
            lng,
            name:
                getGeocoderResultName(
                    result
                ),
            displayName:
                result.display_name ||
                ""
        });
    }

    return locations;
}


/* =========================================================
   ROUTING
   ========================================================= */

async function requestRoute(
    locations
) {
    const coordinates =
        locations
            .map(
                location =>
                    `${location.lng},${location.lat}`
            )
            .join(";");

    const url =
        `${CONFIG.osrmUrl}/${coordinates}?overview=full&geometries=geojson&steps=false`;

    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => controller.abort(),
            CONFIG.routeTimeout
        );

    try {
        const response =
            await fetch(
                url,
                {
                    signal:
                        controller.signal
                }
            );

        if (!response.ok) {
            throw new Error(
                `Routing HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        if (
            data.code !== "Ok" ||
            !data.routes?.length
        ) {
            throw new Error(
                "Keine Route gefunden."
            );
        }

        return data.routes[0];

    } finally {
        clearTimeout(timer);
    }
}


async function performRouteCalculation() {
    const inputs =
        getRouteInputs();

    if (inputs.length < 2) {
        return;
    }

    const values =
        inputs.map(
            input =>
                input.value.trim()
        );

    clearRouteDisplay();

    setStatus(
        "Route wird berechnet …",
        "loading"
    );

    try {
        const routePromise =
            (async () => {
                const locations =
                    await geocodeRoutePoints(
                        values
                    );

                setStatus(
                    "Route wird berechnet …",
                    "loading"
                );

                const route =
                    await requestRoute(
                        locations
                    );

                return {
                    locations,
                    route
                };
            })();

        const {
            locations,
            route
        } = await withTimeout(
            routePromise,
            CONFIG.overallRouteTimeout,
            "Die Routenberechnung dauert zu lange."
        );

        const geometry =
            route.geometry;

        if (
            !geometry ||
            geometry.type !== "LineString"
        ) {
            throw new Error(
                "Keine gültige Routengeometrie erhalten."
            );
        }

        const latLngs =
            geometry.coordinates.map(
                coordinate => ({
                    lat: coordinate[1],
                    lng: coordinate[0]
                })
            );

        currentRoute = {
            locations,
            latLngs,
            distanceKm:
                route.distance / 1000,
            durationMinutes:
                route.duration / 60
        };

        const line =
            L.geoJSON(
                geometry,
                {
                    style: {
                        className:
                            "map-route-line",
                        weight: 5
                    }
                }
            );

        line.addTo(
            routeLayer
        );

        locations.forEach(
            (location, index) => {
                const marker =
                    L.circleMarker(
                        [
                            location.lat,
                            location.lng
                        ],
                        {
                            radius: 9,
                            className:
                                "map-route-marker"
                        }
                    );

                marker.bindTooltip(
                    String.fromCharCode(
                        65 + index
                    ),
                    {
                        permanent: true,
                        direction: "center",
                        className:
                            "map-route-marker-label"
                    }
                );

                marker.addTo(
                    routeLayer
                );
            }
        );

        const bounds =
            line.getBounds();

        if (bounds.isValid()) {
            map.fitBounds(
                bounds.pad(0.12),
                {
                    maxZoom: 12,
                    duration: 0.8
                }
            );
        }

        const distanceText =
            currentRoute.distanceKm < 10
                ? `${currentRoute.distanceKm
                    .toFixed(1)
                    .replace(".", ",")} km`
                : `${Math.round(
                    currentRoute.distanceKm
                )} km`;

        const hours =
            Math.floor(
                currentRoute.durationMinutes /
                60
            );

        const minutes =
            Math.round(
                currentRoute.durationMinutes %
                60
            );

        let durationText;

        if (hours > 0) {
            durationText =
                `${hours} Std. ${minutes} Min.`;
        } else {
            durationText =
                `${minutes} Min.`;
        }

        setStatus(
            `Route: ${distanceText} · ${durationText}`,
            "success"
        );

    } catch (error) {
        console.error(
            "Route:",
            error
        );

        currentRoute = null;

        setStatus(
            error.message ||
            "Die Route konnte nicht berechnet werden.",
            "error"
        );
    }
}


calculateRouteButton?.addEventListener(
    "click",
    performRouteCalculation
);


/* =========================================================
   CLEAR ROUTE
   ========================================================= */

function clearRouteDisplay() {
    routeLayer.clearLayers();
    currentRoute = null;
}


clearRouteButton?.addEventListener(
    "click",
    () => {
        clearRouteDisplay();

        getRouteInputs()
            .forEach(
                input => {
                    input.value = "";
                }
            );

        setStatus(
            "Route gelöscht.",
            "success"
        );
    }
);


/* =========================================================
   COLLAPSIBLE SECTIONS
   ========================================================= */

function setupSectionToggle(
    button,
    content
) {
    if (!button || !content) {
        return;
    }

    button.addEventListener(
        "click",
        () => {
            const isOpen =
                button.getAttribute(
                    "aria-expanded"
                ) === "true";

            button.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

            content.hidden = isOpen;
        }
    );
}


setupSectionToggle(
    routeToggle,
    routeContent
);

setupSectionToggle(
    skateparkToggle,
    skateparkContent
);


/* =========================================================
   MAP PANEL
   ========================================================= */

function collapseMapPanel() {
    mapPanel?.classList.add(
        "is-collapsed"
    );

    mapPanelOpen?.classList.remove(
        "is-hidden"
    );

    setTimeout(
        () => map.invalidateSize(),
        250
    );
}


function openMapPanel() {
    mapPanel?.classList.remove(
        "is-collapsed"
    );

    mapPanelOpen?.classList.add(
        "is-hidden"
    );

    setTimeout(
        () => map.invalidateSize(),
        250
    );
}


mapPanelToggle?.addEventListener(
    "click",
    collapseMapPanel
);


mapPanelOpen?.addEventListener(
    "click",
    openMapPanel
);


/* =========================================================
   SATELLITE
   ========================================================= */

satelliteToggle?.addEventListener(
    "click",
    () => {
        const active =
            map.hasLayer(
                satelliteLayer
            );

        if (active) {
            map.removeLayer(
                satelliteLayer
            );

            standardLayer.addTo(
                map
            );

            satelliteToggle.setAttribute(
                "aria-pressed",
                "false"
            );

        } else {
            map.removeLayer(
                standardLayer
            );

            satelliteLayer.addTo(
                map
            );

            satelliteToggle.setAttribute(
                "aria-pressed",
                "true"
            );
        }
    }
);


/* =========================================================
   LOCATE USER
   ========================================================= */

locateMeButton?.addEventListener(
    "click",
    () => {
        if (
            !navigator.geolocation
        ) {
            setStatus(
                "Dein Browser unterstützt keine Standortbestimmung.",
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
                    lng,
                    name: "Mein Standort"
                };

                searchMarkerLayer.clearLayers();

                searchMarker =
                    L.marker(
                        [lat, lng]
                    ).addTo(
                        searchMarkerLayer
                    );

                searchMarker.bindPopup(
                    `
                        <div class="map-popup">
                            <div class="map-popup-title">
                                Mein Standort
                            </div>
                        </div>
                    `
                );

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

            error => {
                console.warn(
                    "Geolocation:",
                    error
                );

                setStatus(
                    "Standort konnte nicht ermittelt werden.",
                    "error"
                );
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }
);


/* =========================================================
   SKATEPARK SEARCH BUTTON
   ========================================================= */

searchSkateparksButton?.addEventListener(
    "click",
    performSkateparkSearch
);


/* =========================================================
   ENTER IN ROUTE INPUTS
   ========================================================= */

routePoints?.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter" &&
            event.target.matches(
                "[data-route-input]"
            )
        ) {
            event.preventDefault();

            performRouteCalculation();
        }
    }
);


/* =========================================================
   MAP MOVE
   ========================================================= */

map.on(
    "moveend",
    () => {
        /*
         * Die normale Ortssuche bleibt bewusst
         * unabhängig von der Skatepark-Suche.
         *
         * Daher wird beim Verschieben der Karte
         * NICHT automatisch nach Skateparks gesucht.
         */
    }
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

updateRoutePointLabels();

if (mapResults) {
    mapResults.hidden = true;
}

if (searchSuggestions) {
    searchSuggestions.hidden = true;
}

loadSkateparks();


/* =========================================================
   DEBUG / OPTIONAL GLOBAL ACCESS
   ========================================================= */

window.MOICYMap = {
    map,
    get skateparks() {
        return skateparks;
    },
    get route() {
        return currentRoute;
    },
    searchPlace: performMainSearch,
    searchSkateparks: performSkateparkSearch
};
