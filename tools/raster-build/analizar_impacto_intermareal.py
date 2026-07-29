#!/usr/bin/env python3
"""
analizar_impacto_intermareal.py

PASO 1 del hallazgo de zonas intermareales (2026-07-29, ver
docs/handoff-fase2.md): mide el impacto ANTES de tocar el pipeline de
build. Consume la salida de extraer_intermareal_pbf.py y responde:

  - cuantos poligonos y area total
  - que % del agua NAVEGABLE ACTUAL del tile (AUSTRAL_N.bin vigente, ya
    con exclusiones aplicadas) cae dentro de zona intermareal
  - overlap en el corredor de los 3 canales con geometria real
    (Canal Tenglo, Canal Chacao, Canal Moraleda -- ver canal-geometria.js;
    los otros 4 canales de pasos-sonda-canal.json no tienen geometria en
    ningun dataset del proyecto, no se puede medir overlap ahi)
  - puertos de puertos_chile_nacional.json que caen DENTRO de un poligono
    intermareal (critico: el punto de referencia del puerto quedaria
    inalcanzable si se rasteriza como tierra)

No escribe nada en el .bin ni en ningun config -- solo lee y reporta.

Uso:
    python analizar_impacto_intermareal.py \
        --intermareal C:/tmarea-data/raw/AUSTRAL_N_intermareal.json \
        --tile AUSTRAL_N
"""
import argparse
import json
import os
import time

import numpy as np
import rasterio.features
import rasterio.transform
from pyproj import Transformer
from shapely.geometry import shape, LineString, Point
from shapely.ops import transform as shp_transform
from shapely.prepared import prep

from grid import TILES, compute_grid
from packing import unpack_cells

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TILES_DIR = "C:/tmarea-data/tiles"
GEOJSON_PATH = os.path.join(REPO_ROOT, "src", "services", "data", "red_nautica_chile_completa.geojson")
NODOS_PATH = os.path.join(REPO_ROOT, "src", "services", "data", "tmarea_nodos_nauticos_v1.json")
PUERTOS_PATH = os.path.join(REPO_ROOT, "src", "services", "data", "puertos_chile_nacional.json")

CANAL_BUFFER_M = 1000  # ancho de corredor para medir overlap por canal


def cargar_canales():
    """Replica canal-geometria.js: solo 3 canales tienen geometria real."""
    canales = {}
    with open(GEOJSON_PATH, encoding="utf-8") as f:
        geojson = json.load(f)
    for nombre, nombre_geojson in [("Canal Chacao", "Canal de Chacao"), ("Canal Moraleda", "Canal Moraleda")]:
        feat = next((ft for ft in geojson["features"] if ft.get("properties", {}).get("name") == nombre_geojson), None)
        if feat and feat["geometry"]["type"] == "LineString":
            canales[nombre] = feat["geometry"]["coordinates"]  # [[lon,lat],...]

    with open(NODOS_PATH, encoding="utf-8") as f:
        nodos = json.load(f)
    e01 = next((e for e in nodos.get("edges", []) if e.get("id") == "E-01"), None)
    if e01:
        canales["Canal Tenglo"] = e01["path"]

    return canales


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--intermareal", required=True)
    ap.add_argument("--tile", default="AUSTRAL_N")
    args = ap.parse_args()

    t0 = time.time()

    def log(msg):
        print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

    log(f"Cargando {args.intermareal} ...")
    with open(args.intermareal, encoding="utf-8") as f:
        extraccion = json.load(f)
    poligonos = extraccion["poligonos"]
    log(f"  {len(poligonos):,} poligonos, area total declarada {extraccion['area_total_m2']/1e6:,.2f} km2")

    tile_cfg = TILES[args.tile]
    grid = compute_grid(args.tile)
    transform = rasterio.transform.from_origin(grid["origin_x"], grid["origin_y"], grid["res_m"], grid["res_m"])
    shape_grid = (grid["rows"], grid["cols"])
    to_proj = Transformer.from_crs("EPSG:4326", grid["crs_proj4"], always_xy=True).transform

    log("Proyectando y rasterizando poligonos intermareales sobre la grilla del tile...")
    geoms_wgs84 = [shape(p["geometry"]) for p in poligonos]
    geoms_proj = [shp_transform(to_proj, g) for g in geoms_wgs84]

    intermareal_mask = rasterio.features.rasterize(
        [(g, 1) for g in geoms_proj if g is not None and not g.is_empty],
        out_shape=shape_grid,
        transform=transform,
        fill=0,
        dtype=np.uint8,
    ).astype(bool)
    n_celdas_intermareal = int(intermareal_mask.sum())
    log(f"  {n_celdas_intermareal:,} celdas del tile caen dentro de algun poligono intermareal "
        f"({100 * intermareal_mask.mean():.2f}% del tile completo)")

    bin_path = f"{TILES_DIR}/{args.tile}.bin"
    log(f"Cargando tile vigente: {bin_path}")
    packed = np.memmap(bin_path, dtype=np.uint16, mode="r", shape=shape_grid)
    _, confianza, _ = unpack_cells(packed)
    navegable = confianza != 0
    n_navegable = int(navegable.sum())
    log(f"  {n_navegable:,} celdas navegables en el tile vigente (post-exclusiones)")

    overlap = navegable & intermareal_mask
    n_overlap = int(overlap.sum())
    pct_del_navegable = n_overlap / n_navegable if n_navegable else 0.0
    log(f"  {n_overlap:,} celdas navegables caen en zona intermareal "
        f"({100*pct_del_navegable:.2f}% del agua navegable actual del tile)")

    # --- overlap por canal (solo los 3 con geometria real) ---
    log(f"Midiendo overlap en los 3 canales con geometria real (buffer {CANAL_BUFFER_M}m)...")
    canales = cargar_canales()
    resultado_canales = {}
    for nombre, coords_lonlat in canales.items():
        linea_wgs84 = LineString(coords_lonlat)
        linea_proj = shp_transform(to_proj, linea_wgs84)
        buf = linea_proj.buffer(CANAL_BUFFER_M)
        corredor_mask = rasterio.features.rasterize(
            [(buf, 1)], out_shape=shape_grid, transform=transform, fill=0, dtype=np.uint8,
        ).astype(bool)
        corredor_navegable = corredor_mask & navegable
        corredor_intermareal = corredor_navegable & intermareal_mask
        n_corr_nav = int(corredor_navegable.sum())
        n_corr_inter = int(corredor_intermareal.sum())
        pct = (n_corr_inter / n_corr_nav) if n_corr_nav else 0.0
        resultado_canales[nombre] = {
            "celdas_navegables_en_corredor": n_corr_nav,
            "celdas_intermareal_en_corredor": n_corr_inter,
            "pct_intermareal": pct,
        }
        log(f"  {nombre}: {n_corr_inter:,}/{n_corr_nav:,} celdas navegables del corredor son intermareal "
            f"({100*pct:.2f}%)")

    # --- top clusters por area, para ubicar donde pega mas fuerte ---
    top_n = 15
    top_poligonos = sorted(poligonos, key=lambda p: -p["area_m2"])[:top_n]
    top_reporte = []
    for p in top_poligonos:
        g = shape(p["geometry"])
        c = g.centroid
        top_reporte.append({
            "id": p["id"], "tipo": p["tipo"], "razones_match": p["razones_match"],
            "area_m2": p["area_m2"], "area_km2": p["area_m2"] / 1e6,
            "centroide_lonlat": [c.x, c.y],
            "nombre_osm": p["tags"].get("name"),
        })

    # --- puertos dentro de zona intermareal ---
    log(f"Chequeando {PUERTOS_PATH} contra los poligonos intermareales...")
    with open(PUERTOS_PATH, encoding="utf-8") as f:
        puertos_raw = json.load(f)
    lon_min, lon_max = tile_cfg["lon_min"], tile_cfg["lon_max"]
    lat_min, lat_max = tile_cfg["lat_min"], tile_cfg["lat_max"]

    puertos_en_tile = []
    for feat in puertos_raw["features"]:
        geom = feat.get("geometry") or {}
        lon, lat = geom.get("x"), geom.get("y")
        if lon is None or lat is None:
            continue
        if lon_min <= lon <= lon_max and lat_min <= lat <= lat_max:
            puertos_en_tile.append((feat["attributes"], lon, lat))
    log(f"  {len(puertos_en_tile):,} puertos caen dentro del bbox del tile "
        f"(de {len(puertos_raw['features']):,} totales en el archivo)")

    # union de todos los poligonos intermareales (WGS84) para el point-in-polygon,
    # con prepared geometry para acelerar 644 chequeos
    from shapely.ops import unary_union
    union_intermareal = unary_union(geoms_wgs84)
    union_prep = prep(union_intermareal)

    puertos_afectados = []
    for attrs, lon, lat in puertos_en_tile:
        pt = Point(lon, lat)
        if union_prep.contains(pt):
            puertos_afectados.append({
                "nombre": attrs.get("NOMBRE"), "location": attrs.get("LOCATION"),
                "comuna": attrs.get("COMUNA"), "region": attrs.get("COD_REG"),
                "lon": lon, "lat": lat,
            })

    log(f"  {len(puertos_afectados)} puertos caen DENTRO de un poligono intermareal")
    for p in puertos_afectados:
        log(f"    CRITICO: {p['nombre']} ({p['location']}, {p['comuna']}) en {p['lon']:.5f},{p['lat']:.5f}")

    reporte = {
        "tile": args.tile,
        "n_poligonos_intermareal": len(poligonos),
        "area_total_intermareal_m2": extraccion["area_total_m2"],
        "area_total_intermareal_km2": extraccion["area_total_m2"] / 1e6,
        "celdas_tile_total": grid["cells"],
        "celdas_intermareal": n_celdas_intermareal,
        "celdas_navegables_actual": n_navegable,
        "celdas_navegables_en_intermareal": n_overlap,
        "pct_navegable_actual_cubierto_por_intermareal": pct_del_navegable,
        "overlap_por_canal": resultado_canales,
        "top_poligonos_por_area": top_reporte,
        "puertos_en_tile": len(puertos_en_tile),
        "puertos_dentro_de_intermareal": puertos_afectados,
    }

    out_path = os.path.join(os.path.dirname(args.intermareal), f"{args.tile}_impacto_intermareal.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(reporte, f, indent=2, ensure_ascii=False)

    log(f"Reporte guardado: {out_path}")
    log(f"=== listo en {time.time()-t0:.1f}s ===")

    print("\n" + "=" * 70)
    print("RESUMEN")
    print("=" * 70)
    print(f"Poligonos intermareales en bbox: {len(poligonos):,}, area total {extraccion['area_total_m2']/1e6:,.2f} km2")
    print(f"% del agua navegable ACTUAL del tile cubierto por intermareal: {100*pct_del_navegable:.2f}%")
    print("Overlap por canal (de los 3 con geometria real):")
    for nombre, r in resultado_canales.items():
        print(f"  {nombre}: {100*r['pct_intermareal']:.2f}%")
    print(f"Puertos dentro de zona intermareal: {len(puertos_afectados)} (de {len(puertos_en_tile)} en el tile)")
    if pct_del_navegable > 0.10 or puertos_afectados:
        print("\n*** UMBRAL DE PARADA ALCANZADO: >10% del navegable o puertos aislados. "
              "Revisar criterio antes de aplicar (PASO 2). ***")
    else:
        print("\nDentro de umbral (<=10%, sin puertos aislados) -- ver reporte completo igual antes de decidir.")


if __name__ == "__main__":
    main()
