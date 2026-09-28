#!/usr/bin/env python3

"""
MOI-CY Skatepark Database Builder

Erstellt:
    map/skateparks.json

Aus:
    osm-data/*.osm.pbf

Benötigt:
    osmium-tool

Die OSM-Daten kommen z.B. von Geofabrik.
"""

from pathlib import Path
import json
import shutil
import subprocess
import tempfile
import sys


# ============================================================
# PFADE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

OSM_DATA_DIR = BASE_DIR / "osm-data"
OUTPUT_FILE = BASE_DIR / "map" / "skateparks.json"


# ============================================================
# OSM-TAGS
# ============================================================

# Moderne Schreibweise
FILTER_MODERN = "nwr/leisure=skatepark"

# Ältere / alternative Schreibweise
FILTER_OLD = "nwr/leisure=skate_park"


# ============================================================
# AUSGABE
# ============================================================

def print_header():
    print()
    print("=" * 60)
    print(" MOI-CY SKATEPARK DATABASE BUILDER")
    print("=" * 60)
    print()


# ============================================================
# HILFSFUNKTIONEN
# ============================================================

def clean(value):
    """Entfernt leere Strings."""

    if value is None:
        return None

    if isinstance(value, str):
        value = value.strip()

        if not value:
            return None

        return value

    return value


def parse_bool(value):
    """OSM yes/no Werte in Python True/False umwandeln."""

    if value is None:
        return None

    value = str(value).strip().lower()

    if value in {
        "yes",
        "true",
        "1",
        "on",
    }:
        return True

    if value in {
        "no",
        "false",
        "0",
        "off",
    }:
        return False

    return None


def parse_number(value):
    """Versucht einen Zahlenwert aus OSM-Tags zu lesen."""

    if value is None:
        return None

    try:
        value = str(value).strip()
        value = value.replace(",", ".")
        return float(value)

    except (ValueError, TypeError):
        return None


def get_osm_id(properties):
    """Ermittelt die OSM-ID."""

    candidates = [
        properties.get("@id"),
        properties.get("id"),
        properties.get("osm_id"),
    ]

    for value in candidates:
        if value:
            return str(value)

    return None


# ============================================================
# GEOMETRIE
# ============================================================

def collect_points(coords, points):
    """
    Sammelt alle Koordinaten einer GeoJSON-Geometrie.
    """

    if not isinstance(coords, list):
        return

    # Direkter Punkt [lng, lat]
    if (
        len(coords) >= 2
        and isinstance(coords[0], (int, float))
        and isinstance(coords[1], (int, float))
    ):
        points.append(coords)
        return

    for item in coords:
        collect_points(item, points)


def get_center(geometry):
    """
    Berechnet einen einfachen Mittelpunkt.
    """

    if not geometry:
        return None

    coords = geometry.get("coordinates")

    if not coords:
        return None

    points = []

    collect_points(coords, points)

    if not points:
        return None

    lng = sum(point[0] for point in points) / len(points)
    lat = sum(point[1] for point in points) / len(points)

    return lat, lng


# ============================================================
# RELEVANTE OSM-TAGS
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

    "architect",
    "start_date",

    "payment:cash",
    "payment:card",

    "bicycle",
    "motorcycle",
    "car",
}


def extract_relevant_tags(properties):
    """
    Behält nur Tags, die für einen Skatepark
    auf der Website interessant sind.
    """

    tags = {}

    for key in RELEVANT_TAGS:

        value = properties.get(key)

        if value is None:
            continue

        if isinstance(value, str):
            value = value.strip()

            if not value:
                continue

        tags[key] = value

    return tags


# ============================================================
# FEATURE → SKATEPARK
# ============================================================

def convert_feature(feature):
    """
    Wandelt ein GeoJSON-Feature in unser kompaktes
    Skatepark-Format um.
    """

    properties = feature.get("properties") or {}
    geometry = feature.get("geometry")

    # --------------------------------------------------------
    # ID
    # --------------------------------------------------------

    osm_id = get_osm_id(properties)

    if not osm_id:
        return None

    # --------------------------------------------------------
    # POSITION
    # --------------------------------------------------------

    center = get_center(geometry)

    if center is None:
        return None

    lat, lng = center

    # Weltgrenzen überprüfen
    if not -90 <= lat <= 90:
        return None

    if not -180 <= lng <= 180:
        return None

    # --------------------------------------------------------
    # NAME
    # --------------------------------------------------------

    name = (
        properties.get("name")
        or properties.get("name:de")
        or properties.get("name:en")
        or properties.get("name:fr")
        or "Skatepark"
    )

    # --------------------------------------------------------
    # ORT
    # --------------------------------------------------------

    city = (
        properties.get("addr:city")
        or properties.get("city")
        or properties.get("town")
        or properties.get("village")
    )

    country = (
        properties.get("addr:country")
        or properties.get("country")
    )

    # --------------------------------------------------------
    # SURFACE
    # --------------------------------------------------------

    surface = (
        properties.get("surface")
        or properties.get("skatepark:surface")
    )

    # --------------------------------------------------------
    # WEBSITE
    # --------------------------------------------------------

    website = (
        properties.get("website")
        or properties.get("contact:website")
    )

    # --------------------------------------------------------
    # BETREIBER
    # --------------------------------------------------------

    operator = (
        properties.get("operator")
        or properties.get("owner")
    )

    # --------------------------------------------------------
    # BESCHREIBUNG
    # --------------------------------------------------------

    description = (
        properties.get("description")
        or properties.get("description:de")
        or properties.get("description:en")
        or properties.get("description:fr")
    )

    # --------------------------------------------------------
    # BELEUCHTUNG
    # --------------------------------------------------------

    lit = parse_bool(
        properties.get("lit")
    )

    # --------------------------------------------------------
    # GRÖSSE
    # --------------------------------------------------------

    size = (
        properties.get("size")
        or properties.get("skatepark:size")
    )

    # --------------------------------------------------------
    # FLÄCHE
    # --------------------------------------------------------

    area = parse_number(
        properties.get("area")
        or properties.get("skatepark:area")
    )

    # --------------------------------------------------------
    # TAGS
    # --------------------------------------------------------

    tags = extract_relevant_tags(properties)

    # --------------------------------------------------------
    # PARK OBJEKT
    # --------------------------------------------------------

    park = {
        "id": osm_id,
        "name": str(name),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
    }

    # Nur vorhandene Informationen speichern.

    optional_fields = {
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

    for key, value in optional_fields.items():

        if value is not None:
            park[key] = value

    if tags:
        park["tags"] = tags

    return park


# ============================================================
# GEOJSON LESEN
# ============================================================

def read_geojson(filename):
    """
    Liest eine GeoJSON-Datei.
    """

    with open(
        filename,
        "r",
        encoding="utf-8"
    ) as file:

        data = json.load(file)

    features = data.get(
        "features",
        []
    )

    parks = []

    for feature in features:

        park = convert_feature(feature)

        if park:
            parks.append(park)

    return parks


# ============================================================
# OSMIUM
# ============================================================

def check_osmium():
    """
    Prüft, ob osmium installiert ist.
    """

    if shutil.which("osmium") is None:

        print("FEHLER:")
        print()
        print("Das Programm 'osmium' wurde nicht gefunden.")
        print()
        print("Du musst zuerst osmium-tool installieren.")
        print()

        return False

    return True


def run_command(command):
    """
    Führt einen Befehl aus und zeigt ihn an.
    """

    print()
    print(">", " ".join(map(str, command)))
    print()

    subprocess.run(
        command,
        check=True,
    )


# ============================================================
# EINE PBF DATEI VERARBEITEN
# ============================================================

def process_pbf(pbf_file, temp_dir):
    """
    Filtert eine OSM-PBF-Datei nach Skateparks
    und konvertiert sie anschließend nach GeoJSON.
    """

    print()
    print("-" * 60)
    print(f"Verarbeite: {pbf_file.name}")
    print("-" * 60)

    modern_pbf = (
        temp_dir /
        f"{pbf_file.stem}-modern.osm.pbf"
    )

    old_pbf = (
        temp_dir /
        f"{pbf_file.stem}-old.osm.pbf"
    )

    modern_geojson = (
        temp_dir /
        f"{pbf_file.stem}-modern.geojson"
    )

    old_geojson = (
        temp_dir /
        f"{pbf_file.stem}-old.geojson"
    )

    # --------------------------------------------------------
    # MODERNE SCHREIBWEISE
    # leisure=skatepark
    # --------------------------------------------------------

    run_command([
        "osmium",
        "tags-filter",
        str(pbf_file),
        FILTER_MODERN,
        "-o",
        str(modern_pbf),
        "--overwrite",
    ])

    run_command([
        "osmium",
        "export",
        str(modern_pbf),
        "-o",
        str(modern_geojson),
        "--overwrite",
    ])

    parks = read_geojson(
        modern_geojson
    )

    # --------------------------------------------------------
    # ALTE SCHREIBWEISE
    # leisure=skate_park
    # --------------------------------------------------------

    run_command([
        "osmium",
        "tags-filter",
        str(pbf_file),
        FILTER_OLD,
        "-o",
        str(old_pbf),
        "--overwrite",
    ])

    run_command([
        "osmium",
        "export",
        str(old_pbf),
        "-o",
        str(old_geojson),
        "--overwrite",
    ])

    parks.extend(
        read_geojson(old_geojson)
    )

    print()
    print(
        f"Skateparks in {pbf_file.name}: "
        f"{len(parks):,}"
    )

    return parks


# ============================================================
# DUPLIKATE
# ============================================================

def deduplicate(parks):
    """
    Entfernt doppelte Skateparks.

    Hauptkriterium:
        OSM-ID

    Zusätzlich:
        gleicher Name + fast identische Position
    """

    result = []

    seen_ids = set()
    seen_locations = set()

    for park in parks:

        park_id = park["id"]

        # ----------------------------------------------------
        # OSM-ID
        # ----------------------------------------------------

        if park_id in seen_ids:
            continue

        # ----------------------------------------------------
        # Position
        # ----------------------------------------------------

        location_key = (
            park["name"]
            .strip()
            .lower(),

            round(
                park["lat"],
                5
            ),

            round(
                park["lng"],
                5
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
    """
    Sortiert für eine reproduzierbare JSON-Datei.
    """

    return sorted(
        parks,
        key=lambda park: (
            str(
                park.get(
                    "country",
                    ""
                )
            ).lower(),

            str(
                park.get(
                    "city",
                    ""
                )
            ).lower(),

            str(
                park.get(
                    "name",
                    ""
                )
            ).lower(),
        ),
    )


# ============================================================
# JSON SCHREIBEN
# ============================================================

def write_json(parks):
    """
    Schreibt die fertige Skatepark-Datenbank.
    """

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            parks,
            file,
            ensure_ascii=False,
            separators=(
                ",",
                ":"
            ),
        )

    print()
    print("JSON erstellt:")
    print(
        OUTPUT_FILE
    )

    print()
    print(
        f"Anzahl Skateparks: "
        f"{len(parks):,}"
    )


# ============================================================
# HAUPTPROGRAMM
# ============================================================

def main():

    print_header()

    # --------------------------------------------------------
    # OSMIUM
    # --------------------------------------------------------

    if not check_osmium():
        sys.exit(1)

    # --------------------------------------------------------
    # OSM-DATEN ORDNER
    # --------------------------------------------------------

    if not OSM_DATA_DIR.exists():

        print(
            f"FEHLER: Ordner nicht gefunden:"
        )

        print(
            OSM_DATA_DIR
        )

        sys.exit(1)

    # --------------------------------------------------------
    # PBF DATEIEN
    # --------------------------------------------------------

    pbf_files = sorted(
        OSM_DATA_DIR.glob(
            "*.osm.pbf"
        )
    )

    if not pbf_files:

        print(
            "FEHLER:"
        )

        print(
            "Keine .osm.pbf Dateien gefunden."
        )

        print()
        print(
            "Lege deine OSM-Daten hier ab:"
        )

        print(
            OSM_DATA_DIR
        )

        sys.exit(1)

    print(
        f"{len(pbf_files)} OSM-Datei(en) gefunden:"
    )

    for file in pbf_files:
        print(
            f"  - {file.name}"
        )

    print()

    # --------------------------------------------------------
    # ALLE PARKS
    # --------------------------------------------------------

    all_parks = []

    # Temporärer Ordner.
    # Die riesigen gefilterten Zwischen-Dateien
    # werden danach automatisch gelöscht.

    with tempfile.TemporaryDirectory(
        prefix="moicy-skateparks-"
    ) as temporary:

        temp_dir = Path(
            temporary
        )

        for pbf_file in pbf_files:

            parks = process_pbf(
                pbf_file,
                temp_dir
            )

            all_parks.extend(
                parks
            )

    # --------------------------------------------------------
    # DUPLIKATE
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("DUPLIKATE ENTFERNEN")
    print("=" * 60)

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
    # JSON
    # --------------------------------------------------------

    write_json(
        all_parks
    )

    # --------------------------------------------------------
    # FERTIG
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("FERTIG!")
    print("=" * 60)
    print()

    print(
        "Deine Skatepark-Datenbank befindet sich jetzt hier:"
    )

    print(
        OUTPUT_FILE
    )

    print()


# ============================================================
# START
# ============================================================

if __name__ == "__main__":
    main()
