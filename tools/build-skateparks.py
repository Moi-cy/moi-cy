from pathlib import Path
import json
import subprocess
import tempfile
import shutil


# ============================================================
# EINSTELLUNGEN
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "osm-data"
OUTPUT_FILE = BASE_DIR / "map" / "skateparks.json"

# Nur echte Skateparks:
OSM_FILTER = "nwr/leisure=skatepark"


# ============================================================
# HILFSFUNKTIONEN
# ============================================================

def clean(value):
    """Entfernt leere Werte und unnötige Leerzeichen."""
    if value is None:
        return None

    if isinstance(value, str):
        value = value.strip()
        return value if value else None

    return value


def get_center(geometry):
    """
    Ermittelt ungefähr den Mittelpunkt einer GeoJSON-Geometrie.
    Für Skateparks reicht dieser Punkt für die Kartensuche.
    """

    if not geometry:
        return None

    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")

    if not coords:
        return None

    points = []

    def collect(value):
        if (
            isinstance(value, list)
            and len(value) >= 2
            and isinstance(value[0], (int, float))
            and isinstance(value[1], (int, float))
        ):
            points.append(value)
            return

        if isinstance(value, list):
            for item in value:
                collect(item)

    collect(coords)

    if not points:
        return None

    lng = sum(p[0] for p in points) / len(points)
    lat = sum(p[1] for p in points) / len(points)

    return lat, lng


def parse_bool(value):
    if value is None:
        return None

    value = str(value).lower().strip()

    if value in ("yes", "true", "1"):
        return True

    if value in ("no", "false", "0"):
        return False

    return None


def parse_number(value):
    if value is None:
        return None

    try:
        return float(str(value).replace(",", "."))
    except (ValueError, TypeError):
        return None


# ============================================================
# OSM → SKATEPARK
# ============================================================

def convert_feature(feature):
    properties = feature.get("properties", {})
    geometry = feature.get("geometry")

    center = get_center(geometry)

    if center is None:
        return None

    lat, lng = center

    # OSM-ID
    osm_id = (
        properties.get("@id")
        or properties.get("id")
        or properties.get("osm_id")
    )

    if not osm_id:
        return None

    # Name
    name = (
        properties.get("name")
        or properties.get("name:de")
        or properties.get("name:en")
        or "Skatepark"
    )

    # Adresse / Ort
    city = (
        properties.get("addr:city")
        or properties.get("city")
        or properties.get("place")
    )

    country = (
        properties.get("addr:country")
        or properties.get("country")
    )

    # Oberfläche
    surface = (
        properties.get("surface")
        or properties.get("skatepark:surface")
    )

    # Website
    website = (
        properties.get("website")
        or properties.get("contact:website")
    )

    # Betreiber
    operator = properties.get("operator")

    # Beschreibung
    description = (
        properties.get("description")
        or properties.get("description:de")
        or properties.get("description:en")
    )

    # Beleuchtung
    lit = parse_bool(properties.get("lit"))

    # Größe
    size = properties.get("size") or properties.get("skatepark:size")

    # Fläche – nur wenn OSM tatsächlich eine Fläche angibt
    area = parse_number(
        properties.get("area")
        or properties.get("skatepark:area")
    )

    # Nur sinnvolle Skatepark-Tags behalten.
    relevant_tags = {}

    allowed_tags = [
        "leisure",
        "sport",
        "surface",
        "lit",
        "access",
        "fee",
        "opening_hours",
        "operator",
        "website",
        "contact:website",
        "phone",
        "email",
        "description",
        "skatepark:type",
        "skatepark:surface",
        "skatepark:size",
        "size",
        "wheelchair",
        "covered",
        "indoor",
    ]

    for key in allowed_tags:
        value = properties.get(key)

        if value not in (None, ""):
            relevant_tags[key] = value

    park = {
        "id": str(osm_id),
        "name": str(name),
        "lat": round(lat, 6),
        "lng": round(lng, 6),
    }

    # Nur vorhandene Daten speichern.
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

    if relevant_tags:
        park["tags"] = relevant_tags

    return park


# ============================================================
# GEOJSON EINLESEN
# ============================================================

def read_geojson(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])

    parks = []

    for feature in features:
        park = convert_feature(feature)

        if park:
            parks.append(park)

    return parks


# ============================================================
# OSM-DATEI VERARBEITEN
# ============================================================

def process_pbf(pbf_file, temp_dir):
    print(f"Verarbeite: {pbf_file.name}")

    filtered_pbf = temp_dir / f"{pbf_file.stem}-skateparks.osm.pbf"
    geojson_file = temp_dir / f"{pbf_file.stem}-skateparks.geojson"

    # Nur leisure=skatepark aus OSM herausfiltern.
    subprocess.run(
        [
            "osmium",
            "tags-filter",
            str(pbf_file),
            OSM_FILTER,
            "-o",
            str(filtered_pbf),
            "--overwrite",
        ],
        check=True,
    )

    # In GeoJSON umwandeln.
    subprocess.run(
        [
            "osmium",
            "export",
            str(filtered_pbf),
            "-o",
            str(geojson_file),
            "--overwrite",
        ],
        check=True,
    )

    return read_geojson(geojson_file)


# ============================================================
# DUPLIKATE ENTFERNEN
# ============================================================

def deduplicate(parks):
    result = []
    seen_ids = set()
    seen_locations = set()

    for park in parks:
        park_id = park["id"]

        location_key = (
            park["name"].lower().strip(),
            round(park["lat"], 5),
            round(park["lng"], 5),
        )

        if park_id in seen_ids:
            continue

        if location_key in seen_locations:
            continue

        seen_ids.add(park_id)
        seen_locations.add(location_key)

        result.append(park)

    return result


# ============================================================
# SORTIERUNG
# ============================================================

def sort_parks(parks):
    return sorted(
        parks,
        key=lambda park: (
            park.get("country", ""),
            park.get("city", ""),
            park.get("name", ""),
        ),
    )


# ============================================================
# HAUPTPROGRAMM
# ============================================================

def main():

    print()
    print("==============================================")
    print(" MOI-CY Skatepark Datenbank Generator")
    print("==============================================")
    print()

    if shutil.which("osmium") is None:
        print("FEHLER:")
        print("osmium-tool wurde nicht gefunden.")
        print()
        print("Installiere zuerst osmium-tool.")
        return

    if not DATA_DIR.exists():
        print(f"FEHLER: Ordner fehlt: {DATA_DIR}")
        print()
        print("Lege deine OSM-PBF-Dateien dort hinein.")
        return

    pbf_files = sorted(DATA_DIR.glob("*.osm.pbf"))

    if not pbf_files:
        print(f"FEHLER: Keine .osm.pbf-Dateien gefunden in:")
        print(DATA_DIR)
        return

    print(f"{len(pbf_files)} OSM-Datei(en) gefunden.")
    print()

    all_parks = []

    with tempfile.TemporaryDirectory(prefix="moicy-skateparks-") as temp:
        temp_dir = Path(temp)

        for pbf_file in pbf_files:
            parks = process_pbf(pbf_file, temp_dir)

            print(f"  → {len(parks):,} Skateparks gefunden")
            all_parks.extend(parks)

    print()
    print(f"Vor Duplikatbereinigung: {len(all_parks):,}")

    all_parks = deduplicate(all_parks)

    print(f"Nach Duplikatbereinigung: {len(all_parks):,}")

    all_parks = sort_parks(all_parks)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(
            all_parks,
            f,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    print()
    print("==============================================")
    print(" FERTIG")
    print("==============================================")
    print()
    print(f"Ausgabe:")
    print(OUTPUT_FILE)
    print()
    print(f"Skateparks: {len(all_parks):,}")
    print()


if __name__ == "__main__":
    main()
