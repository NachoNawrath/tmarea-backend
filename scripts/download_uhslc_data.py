#!/usr/bin/env python3
"""
Descarga series horarias de nivel del mar (UHSLC ERDDAP) para las 7
estaciones GLOSS de Chile y las guarda como CSV en
src/services/data/tide-obs/.

Fuente: https://uhslc.soest.hawaii.edu/erddap/tabledap/global_hourly_fast

Uso:
    python scripts/download_uhslc_data.py
"""
import csv
import io
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ERDDAP_BASE = "https://uhslc.soest.hawaii.edu/erddap/tabledap/global_hourly_fast.csv"
FIELDS = "time,sea_level,quality,station_name,latitude,longitude,uhslc_id,gloss_id"

OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "services" / "data" / "tide-obs"

# uhslc_id identifica la estación de forma inequívoca en el dataset.
# station_country no sirve para filtrar: Base Prat aparece como
# station_country="Antarctica" pese a ser una estación GLOSS operada
# en territorio chileno (Antártica).
STATIONS = [
    {"id": "isla_de_pascua", "name": "Isla de Pascua", "uhslc_id": 22, "gloss_id": 137},
    {"id": "antofagasta",    "name": "Antofagasta",    "uhslc_id": 80, "gloss_id": 174},
    {"id": "valparaiso",     "name": "Valparaíso",     "uhslc_id": 81, "gloss_id": 175},
    {"id": "juan_fernandez", "name": "Juan Fernández", "uhslc_id": 21, "gloss_id": 176},
    {"id": "san_felix",      "name": "San Félix",      "uhslc_id": 35, "gloss_id": 177},
    {"id": "puerto_montt",   "name": "Puerto Montt",   "uhslc_id": 684, "gloss_id": 178},
    {"id": "base_prat",      "name": "Base Prat",      "uhslc_id": 730, "gloss_id": 189},
]

TIMEOUT = 300
RETRIES = 3


def fetch_station(uhslc_id: int) -> bytes:
    url = f"{ERDDAP_BASE}?{FIELDS}&uhslc_id={uhslc_id}"
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            with urllib.request.urlopen(url, timeout=TIMEOUT) as resp:
                return resp.read()
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = e
            print(f"    intento {attempt}/{RETRIES} falló: {e}", file=sys.stderr)
            time.sleep(3)
    raise RuntimeError(f"no se pudo descargar uhslc_id={uhslc_id}: {last_err}")


def normalize_longitude(lon: float) -> float:
    # ERDDAP entrega longitud 0-360 (degrees_east); Chile va en -180..180.
    return lon - 360 if lon > 180 else lon


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    summary = []

    for st in STATIONS:
        print(f"Descargando {st['name']} (UHSLC {st['uhslc_id']}, GLOSS {st['gloss_id']})...")
        try:
            raw = fetch_station(st["uhslc_id"])
        except RuntimeError as e:
            print(f"  ERROR: {e}", file=sys.stderr)
            summary.append({**st, "status": "error", "rows": 0})
            continue

        text = raw.decode("utf-8")
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)

        if len(rows) < 3:
            print(f"  SIN DATOS para uhslc_id={st['uhslc_id']}")
            summary.append({**st, "status": "empty", "rows": 0})
            continue

        header = rows[0]
        # rows[1] son las unidades (fila estándar de ERDDAP), se descarta
        data_rows = rows[2:]

        lon_idx = header.index("longitude")
        first_time = data_rows[0][header.index("time")]
        last_time = data_rows[-1][header.index("time")]

        out_path = OUT_DIR / f"{st['id']}.csv"
        with out_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(header)
            for row in data_rows:
                if row and row[lon_idx]:
                    row[lon_idx] = f"{normalize_longitude(float(row[lon_idx])):.4f}"
                writer.writerow(row)

        size_kb = out_path.stat().st_size / 1024
        print(f"  OK: {len(data_rows)} filas, {first_time} -> {last_time}, {size_kb:.0f} KB -> {out_path}")
        summary.append({
            **st,
            "status": "ok",
            "rows": len(data_rows),
            "first_time": first_time,
            "last_time": last_time,
            "size_kb": round(size_kb),
        })

    print("\n=== Resumen ===")
    for s in summary:
        if s["status"] == "ok":
            print(f"  {s['id']:16s} {s['rows']:>7d} filas  {s['first_time'][:10]} -> {s['last_time'][:10]}  ({s['size_kb']} KB)")
        else:
            print(f"  {s['id']:16s} {s['status'].upper()}")

    n_ok = sum(1 for s in summary if s["status"] == "ok")
    print(f"\n{n_ok}/{len(STATIONS)} estaciones descargadas correctamente.")


if __name__ == "__main__":
    main()
