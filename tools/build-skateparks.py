#!/usr/bin/env python3

"""
MOI-CY Skatepark Database Builder

Erstellt:
    ../map/skateparks.json

Die Website selbst fragt später NICHT Overpass ab.
Overpass wird nur einmal beim Erstellen/Aktualisieren
der lokalen Datenbank verwendet.

Benötigt:
    Python 3.10+
    requests

Installation:
    pip install requests

Start:
    python tools/build-skateparks.py
"""

from pathlib import Path
import json
import math
import time
import sys

import requests


# ============================================================
# PFADE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

OUTPUT_FILE = BASE_DIR / "map" / "skateparks.json"


# ============================================================
# EINSTELLUNGEN
# ============================================================

# Overpass-Server.
# Wir benutzen mehrere Server als Ausweichmöglichkeiten.

OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]


# Zwischen Anfragen warten.
REQUEST_DELAY = 3


# Timeout pro Anfrage.
REQUEST_TIMEOUT = 180


# ============================================================
# REGIONEN
# ============================================================

# Die Welt wird in größere Regionen aufgeteilt.
#
# Dadurch versuchen wir nicht, die komplette Welt
# in einer einzigen Overpass-Anfrage zu laden.
#
# Format:
# name: (west, south, east, north)

REGIONS = {

    # --------------------------------------------------------
    # EUROPA
    # --------------------------------------------------------

    "europe": (
        -31.0,
        34.0,
        45.0,
        72.0,
    ),

    # --------------------------------------------------------
    # NORDAMERIKA
    # --------------------------------------------------------

    "north-america": (
        -170.0,
        5.0,
        -50.0,
        85.0,
    ),

    # --------------------------------------------------------
    # SÜDAMERIKA
    # --------------------------------------------------------

    "south-america": (
        -82.0,
        -56.0,
        -34.0,
        13.0,
    ),

    # --------------------------------------------------------
    # ASIEN
    # --------------------------------------------------------

    "asia": (
        25.0,
        -10.0,
        180.0,
        78.0,
    ),

    # --------------------------------------------------------
    # AFRIKA
    # --------------------------------------------------------

    "africa": (
        -20.0,
        -36.0,
        55.0,
        38.0,
    ),

    # --------------------------------------------------------
    # OZEANIEN
    # --------------------------------------------------------

    "oceania": (
        110.0,
        -50.0,
        180.0,
        5.0,
    ),

    # --------------------------------------------------------
    # MITTELAMERIKA / KARIBIK
    # --------------------------------------------------------

    "central-america": (
        -120.0,
        5.0,
        -55.0,
        25.0,
    ),
}


# ============================================================
# HTTP SESSION
# ============================================================

session = requests.Session()

session.headers.update({
    "User-Agent": (
        "MOI-CY-Skatepark-Map/1.0 "
        "(local skatepark database builder)"
    )
})


# ============================================================
# AUSGABE
# ============================================================

def header():

    print()
    print("=" * 65)
    print(" MOI-CY SKATEPARK DATABASE BUILDER")
    print("=" * 65)
    print()


# ============================================================
# HILFSFUNKTIONEN
# ============================================================

def clean(value):

    if value is None:
        return None

    if isinstance(value, str):

        value = value.strip()

        if not value:
            return None

        return value

    return value


def parse_bool(value):

    if value is None:
        return None

    value = str(value).lower().strip()

    if value in (
        "yes",
        "true",
        "1",
        "on",
    ):
        return True

    if value in (
        "no",
        "false",
        "0",
        "off",
    ):
        return False

    return None


def parse_number(value):

    if value is None:
        return None

    try:

        value = str(value)
        value = value.replace(",", ".")

        return float(value)

    except (
        ValueError,
        TypeError,
    ):
        return None


# ============================================================
# OSM ELEMENT → KOORDINATEN
# ============================================================

def get_coordinates(element):

    element_type = element.get("type")

    # --------------------------------------------------------
    # NODE
    # --------------------------------------------------------

    if element_type == "node":

        lat = element.get("lat")
        lon = element.get("lon")

        if lat is None or lon is None:
            return None

        return float(lat), float(lon)

    # --------------------------------------------------------
    # WAY
    # --------------------------------------------------------

    if element_type == "way":

        geometry = element.get(
            "geometry",
            [],
        )

        if not geometry:
            return None

        points = []

        for point in geometry:

            lat = point.get("lat")
            lon = point.get("lon")

            if lat is None or lon is None:
                continue

            points.append(
                (
                    float(lat),
                    float(lon),
                )
            )

        if not points:
            return None

        lat = sum(
            point[0]
            for point in points
        ) / len(points)

        lon = sum(
            point[1]
            for point in points
        ) / len(points)

        return lat, lon

    # --------------------------------------------------------
    # RELATION
    # --------------------------------------------------------

    if element_type == "relation":

        center = element.get("center")

        if center:

            lat = center.get("lat")
            lon = center.get("lon")

            if lat is not None and lon is not None:
                return float(lat), float(lon)

    return None


# ============================================================
# TAGS
# ============================================================

RELEVANT_TAGS = {
    "leisure",
    "sport",

    "surface",
    "lit",

    "access",
    "fee",

    "opening_hours",

    "operator",
    "owner",

    "website",
    "contact:website",

    "phone",
    "contact:phone",

    "email",
    "contact:email",

    "description",
    "description:de",
    "description:en",
    "description:fr",

    "skatepark:type",
    "skatepark:surface",
    "skatepark:size",

    "size",
    "area",

    "covered",
    "indoor",

    "wheelchair",

    "addr:street",
    "addr:housenumber",
    "addr:postcode",
    "addr:city",
    "addr:country",

    "start_date",
}


def relevant_tags(tags):

    result = {}

    for key in RELEVANT_TAGS:

        value = tags.get(key)

        if value is None:
            continue

        if isinstance(value, str):

            value = value.strip()

            if not value:
                continue

        result[key] = value

    return result


# ============================================================
# OSM ELEMENT → UNSERE DATEN
# ============================================================

def convert_element(element):

    tags = element.get(
        "tags",
        {},
    )

    if not tags:
        return None

    # --------------------------------------------------------
    # Nur Skateparks
    # --------------------------------------------------------

    leisure = tags.get(
        "leisure"
    )

    if leisure not in (
        "skatepark",
        "skate_park",
    ):
        return None

    # --------------------------------------------------------
    # Koordinaten
    # --------------------------------------------------------

    coordinates = get_coordinates(
        element
    )

    if coordinates is None:
        return None

    lat, lon = coordinates

    # --------------------------------------------------------
    # OSM ID
    # --------------------------------------------------------

    osm_id = (
        f"{element.get('type')}-"
        f"{element.get('id')}"
    )

    # --------------------------------------------------------
    # Name
    # --------------------------------------------------------

    name = (
        tags.get("name")
        or tags.get("name:de")
        or tags.get("name:en")
        or tags.get("name:fr")
        or "Skatepark"
    )

    # --------------------------------------------------------
    # Stadt
    # --------------------------------------------------------

    city = (
        tags.get("addr:city")
        or tags.get("city")
        or tags.get("town")
        or tags.get("village")
    )

    # --------------------------------------------------------
    # Land
    # --------------------------------------------------------

    country = (
        tags.get("addr:country")
        or tags.get("country")
    )

    # --------------------------------------------------------
    # Oberfläche
    # --------------------------------------------------------

    surface = (
        tags.get("surface")
        or tags.get("skatepark:surface")
    )

    # --------------------------------------------------------
    # Website
    # --------------------------------------------------------

    website = (
        tags.get("website")
        or tags.get("contact:website")
    )

    # --------------------------------------------------------
    # Betreiber
    # --------------------------------------------------------

    operator = (
        tags.get("operator")
        or tags.get("owner")
    )

    # --------------------------------------------------------
    # Beschreibung
    # --------------------------------------------------------

    description = (
        tags.get("description:de")
        or tags.get("description:en")
        or tags.get("description:fr")
        or tags.get("description")
    )

    # --------------------------------------------------------
    # Beleuchtung
    # --------------------------------------------------------

    lit = parse_bool(
        tags.get("lit")
    )

    # --------------------------------------------------------
    # Größe
    # --------------------------------------------------------

    size = (
        tags.get("size")
        or tags.get("skatepark:size")
    )

    # --------------------------------------------------------
    # Fläche
    # --------------------------------------------------------

    area = parse_number(
        tags.get("area")
    )

    # --------------------------------------------------------
    # Park
    # --------------------------------------------------------

    park = {
        "id": osm_id,
        "name": str(name),
        "lat": round(
            lat,
            6,
        ),
        "lng": round(
            lon,
            6,
        ),
    }

    optional = {
        "city": clean(city),
        "country": clean(country),
        "surface": clean(surface),
        "lit": lit,
        "size": clean(size),
        "area": area,
        "website": clean(website),
        "operator": clean(operator),
        "description": clean(description),
    }

    for key, value in optional.items():

        if value is not None:
            park[key] = value

    extra = relevant_tags(
        tags
    )

    if extra:
        park["tags"] = extra

    return park


# ============================================================
# OVERPASS QUERY
# ============================================================

def build_query(
    west,
    south,
    east,
    north,
):

    bbox = (
        f"{south},"
        f"{west},"
        f"{north},"
        f"{east}"
    )

    return f"""
[out:json][timeout:120];

(
  node["leisure"="skatepark"]({bbox});
  way["leisure"="skatepark"]({bbox});
  relation["leisure"="skatepark"]({bbox});

  node["leisure"="skate_park"]({bbox});
  way["leisure"="skate_park"]({bbox});
  relation["leisure"="skate_park"]({bbox});
);

out center;
"""


# ============================================================
# OVERPASS ANFRAGE
# ============================================================

def query_overpass(
    query,
    region_name,
):

    for server in OVERPASS_SERVERS:

        print()
        print(
            f"Server: {server}"
        )

        try:

            response = session.post(
                server,
                data={
                    "data": query
                },
                timeout=REQUEST_TIMEOUT,
            )

            if response.status_code != 200:

                print(
                    f"HTTP {response.status_code}"
                )

                continue

            data = response.json()

            elements = data.get(
                "elements",
                [],
            )

            print(
                f"Gefunden: "
                f"{len(elements):,}"
            )

            return elements

        except (
            requests.RequestException,
            ValueError,
        ) as error:

            print(
                "Fehler:",
                error,
            )

            continue

    print()
    print(
        f"Keine Antwort für {region_name}."
    )

    return []


# ============================================================
# DUPLIKATE
# ============================================================

def deduplicate(parks):

    result = []

    seen_ids = set()
    seen_locations = set()

    for park in parks:

        park_id = park["id"]

        if park_id in seen_ids:
            continue

        location_key = (
            park["name"]
            .strip()
            .lower(),

            round(
                park["lat"],
                5,
            ),

            round(
                park["lng"],
                5,
            ),
        )

        if location_key in seen_locations:
            continue

        seen_ids.add(
            park_id
        )

        seen_locations.add(
            location_key
        )

        result.append(
            park
        )

    return result


# ============================================================
# SORTIERUNG
# ============================================================

def sort_parks(parks):

    return sorted(
        parks,
        key=lambda park: (
            str(
                park.get(
                    "country",
                    "",
                )
            ).lower(),

            str(
                park.get(
                    "city",
                    "",
                )
            ).lower(),

            str(
                park.get(
                    "name",
                    "",
                )
            ).lower(),
        ),
    )


# ============================================================
# JSON SCHREIBEN
# ============================================================

def save_json(parks):

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            parks,
            file,
            ensure_ascii=False,
            separators=(
                ",",
                ":",
            ),
        )

    print()
    print(
        f"JSON gespeichert:"
    )

    print(
        OUTPUT_FILE
    )

    print()
    print(
        f"Skateparks: "
        f"{len(parks):,}"
    )


# ============================================================
# HAUPTPROGRAMM
# ============================================================

def main():

    header()

    print(
        "Dieser Vorgang kann abhängig von"
    )

    print(
        "den Overpass-Servern einige Zeit dauern."
    )

    print()
    print(
        "Die fertige Website wird später"
    )

    print(
        "KEINE Overpass-Anfragen durchführen."
    )

    print()

    all_parks = []

    region_items = list(
        REGIONS.items()
    )

    for index, (
        region_name,
        bbox,
    ) in enumerate(
        region_items,
        start=1,
    ):

        west, south, east, north = bbox

        print()
        print("=" * 65)

        print(
            f"REGION {index}/"
            f"{len(region_items)}: "
            f"{region_name.upper()}"
        )

        print("=" * 65)

        query = build_query(
            west,
            south,
            east,
            north,
        )

        elements = query_overpass(
            query,
            region_name,
        )

        region_parks = []

        for element in elements:

            park = convert_element(
                element
            )

            if park:
                region_parks.append(
                    park
                )

        print(
            f"Verwertbare Skateparks: "
            f"{len(region_parks):,}"
        )

        all_parks.extend(
            region_parks
        )

        # Server nicht mit mehreren
        # direkten Anfragen hintereinander belasten.

        if index < len(region_items):

            print()
            print(
                f"Warte {REQUEST_DELAY} Sekunden ..."
            )

            time.sleep(
                REQUEST_DELAY
            )

    # --------------------------------------------------------
    # DUPLIKATE
    # --------------------------------------------------------

    print()
    print("=" * 65)
    print("DUPLIKATE")
    print("=" * 65)

    print(
        f"Vorher: "
        f"{len(all_parks):,}"
    )

    all_parks = deduplicate(
        all_parks
    )

    print(
        f"Nachher: "
        f"{len(all_parks):,}"
    )

    # --------------------------------------------------------
    # SORTIEREN
    # --------------------------------------------------------

    all_parks = sort_parks(
        all_parks
    )

    # --------------------------------------------------------
    # SPEICHERN
    # --------------------------------------------------------

    save_json(
        all_parks
    )

    print()
    print("=" * 65)
    print("FERTIG")
    print("=" * 65)
    print()


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    try:
        main()

    except KeyboardInterrupt:

        print()
        print(
            "Abgebrochen."
        )

        sys.exit(1)
