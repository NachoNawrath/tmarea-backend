#!/usr/bin/env python3
"""
Descarga series minutales de nivel del mar (IOC Sea Level Monitoring
Facility) para 14 estaciones chilenas y las guarda como CSV en
src/services/data/tide-obs/.

Fuente: http://www.ioc-sealevelmonitoring.org/service.php?query=data
El servicio limita cada respuesta a ~30 días de datos aunque se pida un
rango mayor, así que se itera en ventanas mensuales. Se descargan ambos
sensores disponibles (prs, rad, etc.) sin filtrar -- la limpieza/elección
de sensor primario se hace en scripts/compute_tidal_constants.py.

Uso:
    python scripts/download_ioc_data.py [--months 24]
"""
import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path

SERVICE_URL = "http://www.ioc-sealevelmonitoring.org/service.php"
OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "services" / "data" / "tide-obs"

TIMEOUT = 120
RETRIES = 3
MAX_WORKERS = 5  # concurrencia cortés: probada sin errores contra el servicio

# Estaciones interiores (canales, requieren cobertura propia -- no
# interpolable desde GLOSS de costa abierta).
INTERIOR_STATIONS = [
    {"id": "ancud",             "name": "Ancud",             "code": "ancu", "lat": -41.867, "lon": -73.833},
    {"id": "castro",            "name": "Castro",            "code": "cstr", "lat": -42.481, "lon": -73.758},
    {"id": "puerto_melinka",    "name": "Puerto Melinka",    "code": "pmel", "lat": -43.898, "lon": -73.748},
    {"id": "puerto_chacabuco",  "name": "Puerto Chacabuco",  "code": "pcha", "lat": -45.467, "lon": -72.820},
    {"id": "puerto_aguirre",    "name": "Puerto Aguirre",    "code": "pagi", "lat": -45.165, "lon": -73.521},
]

# Estaciones IOC de costa abierta que complementan la cobertura entre las
# GLOSS/UHSLC.
COAST_STATIONS = [
    {"id": "arica",          "name": "Arica",          "code": "aric", "lat": -18.476, "lon": -70.323},
    {"id": "iquique",        "name": "Iquique",        "code": "iqui", "lat": -20.204, "lon": -70.148},
    {"id": "caldera",        "name": "Caldera",        "code": "cald", "lat": -27.065, "lon": -70.825},
    {"id": "coquimbo",       "name": "Coquimbo",       "code": "coqu", "lat": -29.950, "lon": -71.335},
    {"id": "talcahuano",     "name": "Talcahuano",     "code": "talc", "lat": -36.701, "lon": -73.106},
    {"id": "corral",         "name": "Corral",         "code": "corr", "lat": -39.887, "lon": -73.428},
    {"id": "bahia_mansa",    "name": "Bahía Mansa",    "code": "bmsa", "lat": -40.581, "lon": -73.737},
    {"id": "punta_arenas",   "name": "Punta Arenas",   "code": "ptar", "lat": -53.124, "lon": -70.862},
    {"id": "puerto_williams", "name": "Puerto Williams", "code": "pwil", "lat": -54.933, "lon": -67.608},
]

STATIONS = INTERIOR_STATIONS + COAST_STATIONS


def month_windows(n_months: int):
    """Ventanas mensuales [inicio, fin) terminando en el mes actual (UTC)."""
    now = datetime.now(timezone.utc)
    windows = []
    year, month = now.year, now.month
    for _ in range(n_months):
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            nxt_year, nxt_month = year + 1, 1
        else:
            nxt_year, nxt_month = year, month + 1
        end = datetime(nxt_year, nxt_month, 1, tzinfo=timezone.utc) - timedelta(minutes=1)
        end = min(end, now)
        windows.append((start, end))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    windows.reverse()
    return windows


def fetch_window(code: str, start: datetime, end: datetime) -> list:
    params = (
        f"query=data&code={code}"
        f"&timestart={start.strftime('%Y-%m-%dT%H:%M')}"
        f"&timestop={end.strftime('%Y-%m-%dT%H:%M')}"
    )
    url = f"{SERVICE_URL}?{params}"
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            with urllib.request.urlopen(url, timeout=TIMEOUT) as resp:
                raw = resp.read()
            if not raw.strip():
                return []
            return json.loads(raw)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last_err = e
            time.sleep(2)
    print(f"    ventana {start.date()} falló tras {RETRIES} intentos: {last_err}", file=sys.stderr)
    return []


def download_station(station: dict, n_months: int) -> dict:
    windows = month_windows(n_months)
    all_records = []
    failed_windows = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(fetch_window, station["code"], start, end): (start, end)
            for start, end in windows
        }
        for fut in as_completed(futures):
            records = fut.result()
            if not records:
                failed_windows += 1
            all_records.extend(records)

    if not all_records:
        return {**station, "status": "empty", "rows": 0}

    all_records.sort(key=lambda r: r["stime"])

    out_path = OUT_DIR / f"{station['id']}.csv"
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["time", "sea_level", "sensor", "station_name", "latitude", "longitude", "ioc_code"])
        for r in all_records:
            writer.writerow([
                r["stime"].replace(" ", "T") + "Z",
                r["slevel"],
                r["sensor"],
                station["name"],
                station["lat"],
                station["lon"],
                station["code"],
            ])

    size_kb = out_path.stat().st_size / 1024
    return {
        **station,
        "status": "ok",
        "rows": len(all_records),
        "first_time": all_records[0]["stime"],
        "last_time": all_records[-1]["stime"],
        "size_kb": round(size_kb),
        "failed_windows": failed_windows,
        "total_windows": len(windows),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--months", type=int, default=24, help="meses hacia atrás a descargar por estación (default 24 = 2 años)")
    parser.add_argument("--only", nargs="*", help="ids de estación a descargar (default: todas)")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stations = STATIONS
    if args.only:
        stations = [s for s in STATIONS if s["id"] in args.only]

    summary = []
    for st in stations:
        print(f"Descargando {st['name']} (IOC {st['code']}) -- {args.months} meses...")
        result = download_station(st, args.months)
        if result["status"] == "ok":
            print(
                f"  OK: {result['rows']} filas, {result['first_time']} -> {result['last_time']}, "
                f"{result['size_kb']} KB ({result['failed_windows']}/{result['total_windows']} ventanas fallidas)"
            )
        else:
            print(f"  SIN DATOS para {st['code']}")
        summary.append(result)

    print("\n=== Resumen ===")
    for s in summary:
        if s["status"] == "ok":
            print(f"  {s['id']:20s} {s['rows']:>7d} filas  {s['first_time'][:10]} -> {s['last_time'][:10]}  ({s['size_kb']} KB)")
        else:
            print(f"  {s['id']:20s} {s['status'].upper()}")

    n_ok = sum(1 for s in summary if s["status"] == "ok")
    print(f"\n{n_ok}/{len(stations)} estaciones descargadas correctamente.")


if __name__ == "__main__":
    main()
