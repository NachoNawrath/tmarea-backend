"""
Calculo de la grilla proyectada de un tile a partir de su bbox WGS84.

spec §3.2: el pipeline DEBE calcular origin_x, origin_y, cols y rows
proyectando el bbox al CRS de §3.1 y alineando a multiplo de res_m.
Nunca leerlos de una constante.

Se densifica el borde del bbox antes de proyectar: en Transverse Mercator
un bbox WGS84 grande no mapea a un rectangulo con lados rectos (el
meridiano/paralelo se curva), asi que tomar solo las 4 esquinas
subestimaria el area real necesaria. Se muestrean N puntos por lado y se
usa el min/max proyectado de todos ellos.
"""
import numpy as np
from pyproj import Transformer

CRS_PROJ4 = "+proj=tmerc +lat_0=0 +lon_0=-72 +k=0.9996 +x_0=500000 +y_0=10000000 +datum=WGS84 +units=m"

TILES = {
    # AUSTRAL_N llega hasta -39.5 (no -41.5): el primer corte dejaba Puerto
    # Montt (-41.47), Canal Tenglo y Corral (-39.87) fuera del tile -- el
    # borde caia en medio de la zona de operacion. Ver spec Sec 3.2.
    "AUSTRAL_N": {"lon_min": -75.6, "lon_max": -71.9, "lat_min": -47.0, "lat_max": -39.5, "res_m": 50},
    "NORTE": {"lon_min": -75.0, "lon_max": -69.5, "lat_min": -40.0, "lat_max": -17.5, "res_m": 100},
    "AUSTRAL_S": {"lon_min": -76.5, "lon_max": -66.8, "lat_min": -56.2, "lat_max": -47.0, "res_m": 50},
}


def densified_boundary(lon_min, lon_max, lat_min, lat_max, n=200):
    lons_top = np.linspace(lon_min, lon_max, n)
    lons_bot = np.linspace(lon_min, lon_max, n)
    lats_left = np.linspace(lat_min, lat_max, n)
    lats_right = np.linspace(lat_min, lat_max, n)

    lons = np.concatenate([lons_top, lons_bot, np.full(n, lon_min), np.full(n, lon_max)])
    lats = np.concatenate([np.full(n, lat_max), np.full(n, lat_min), lats_left, lats_right])
    return lons, lats


def compute_grid(tile_id):
    cfg = TILES[tile_id]
    res_m = cfg["res_m"]

    lons, lats = densified_boundary(cfg["lon_min"], cfg["lon_max"], cfg["lat_min"], cfg["lat_max"])
    transformer = Transformer.from_crs("EPSG:4326", CRS_PROJ4, always_xy=True)
    xs, ys = transformer.transform(lons, lats)

    min_x, max_x = float(np.min(xs)), float(np.max(xs))
    min_y, max_y = float(np.min(ys)), float(np.max(ys))

    origin_x = np.floor(min_x / res_m) * res_m
    origin_y = np.ceil(max_y / res_m) * res_m
    cols = int(np.ceil((max_x - origin_x) / res_m))
    rows = int(np.ceil((origin_y - min_y) / res_m))

    return {
        "tile_id": tile_id,
        "crs_proj4": CRS_PROJ4,
        "origin_x": origin_x,
        "origin_y": origin_y,
        "res_m": res_m,
        "cols": cols,
        "rows": rows,
        "cells": cols * rows,
        "bbox_proj": {"min_x": min_x, "max_x": max_x, "min_y": min_y, "max_y": max_y},
    }


if __name__ == "__main__":
    import json
    import sys

    tile_id = sys.argv[1] if len(sys.argv) > 1 else "AUSTRAL_N"
    grid = compute_grid(tile_id)
    print(json.dumps(grid, indent=2))
    cells_m = grid["cells"] / 1e6
    mb = grid["cells"] * 2 / 1024 / 1024
    print(f"\ncols x rows = {grid['cols']} x {grid['rows']} = {grid['cells']:,} celdas (~{cells_m:.1f} M, ~{mb:.0f} MB en uint16)")
