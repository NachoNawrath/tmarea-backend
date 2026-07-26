"""
Descarga seamarks de peligro (spec §4 fuente 3) via Overpass API, acotado
al bbox del tile. Tags: seamark:type in {rock, wreck, obstruction, shoal}.
Se guarda como GeoJSON fuera del repo (C:\\tmarea-data\\raw\\).

Uso: python fetch_seamarks.py --tile AUSTRAL_N
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request

from grid import TILES

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HAZARD_TAGS = ["rock", "wreck", "obstruction", "shoal"]
USER_AGENT = "TmareaRasterBuild/1.0 (contacto: inawrath@gmail.com)"


def build_query(lat_min, lon_min, lat_max, lon_max):
    bbox = f"{lat_min},{lon_min},{lat_max},{lon_max}"
    clauses = "\n  ".join(f'node["seamark:type"="{t}"]({bbox});' for t in HAZARD_TAGS)
    clauses += "\n  " + "\n  ".join(f'way["seamark:type"="{t}"]({bbox});' for t in HAZARD_TAGS)
    return f"""
[out:json][timeout:180];
(
  {clauses}
);
out geom;
""".strip()


def fetch(tile_id, out_path, retries=3):
    cfg = TILES[tile_id]
    query = build_query(cfg["lat_min"], cfg["lon_min"], cfg["lat_max"], cfg["lon_max"])
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")

    last_err = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                OVERPASS_URL,
                data=data,
                method="POST",
                headers={
                    "User-Agent": USER_AGENT,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            with urllib.request.urlopen(req, timeout=200) as resp:
                body = resp.read()
            result = json.loads(body)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(result, f)
            n_elements = len(result.get("elements", []))
            print(f"OK: {n_elements} elementos guardados en {out_path}")
            return result
        except Exception as e:
            last_err = e
            print(f"Intento {attempt}/{retries} fallo: {e}", file=sys.stderr)
            if attempt < retries:
                time.sleep(5 * attempt)
    raise RuntimeError(f"No se pudo obtener seamarks tras {retries} intentos: {last_err}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", default="AUSTRAL_N")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    out = args.out or f"C:/tmarea-data/raw/{args.tile}_seamarks_peligro.json"
    fetch(args.tile, out)
