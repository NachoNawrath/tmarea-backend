#!/usr/bin/env python3
"""
extraer_intermareal_pbf.py

Extrae poligonos de zona intermareal de un extracto .osm.pbf, restringidos
a un bbox: ways cerradas Y relaciones multipolygon (a diferencia de
extraer_highways_pbf.py, que solo mira ways lineales).

Hallazgo que motiva este script (2026-07-29, reporte de usuario tras cerrar
El Banquito): los water polygons de OSM marcan la costa en linea de BAJAMAR,
asi que toda la franja intermareal (se cubre y descubre con la marea) queda
adentro del poligono de "agua" y el pipeline la rasteriza como navegable.
No es un caso puntual (una isla, un istmo): es sistematico en todo el tile,
tan grande como sea la franja intermareal real en cada punto de costa.

Criterio de match (cualquiera de estos tags, OR):
  wetland=tidalflat
  tidal=yes
  natural=mud
  natural=wetland + tidal=yes   (subset de tidal=yes, no hace falta chequeo aparte)
  natural=shoal

Usa osmium.FileProcessor(...).with_areas(), que ensambla tanto ways
cerradas como relaciones multipolygon en objetos Area -- necesario porque
zonas intermareales grandes suelen mapearse como relacion (ej. contornea
una isla completa con varios segmentos de costa).

Requiere: pip install osmium shapely pyproj (ya en tools/raster-build/.venv)

Uso:
    python extraer_intermareal_pbf.py C:/tmarea-data/raw/chile-latest.osm.pbf \
        C:/tmarea-data/raw/AUSTRAL_N_intermareal.json \
        --bbox -75.6,-47.0,-71.9,-39.5
"""
import argparse
import json
import sys
import time

import osmium
import osmium.geom
import shapely.wkb
from pyproj import Geod
from shapely.geometry import box, mapping

GEOD = Geod(ellps="WGS84")


def matches(tags):
    razones = []
    if tags.get("wetland") == "tidalflat":
        razones.append("wetland=tidalflat")
    if tags.get("tidal") == "yes":
        razones.append("tidal=yes")
    if tags.get("natural") == "mud":
        razones.append("natural=mud")
    if tags.get("natural") == "shoal":
        razones.append("natural=shoal")
    return razones


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pbf_path")
    ap.add_argument("salida_json")
    ap.add_argument("--bbox", required=True, help="min_lon,min_lat,max_lon,max_lat")
    args = ap.parse_args()

    bbox = tuple(float(x) for x in args.bbox.split(","))
    if len(bbox) != 4:
        print("ERROR: --bbox debe tener 4 valores min_lon,min_lat,max_lon,max_lat", file=sys.stderr)
        sys.exit(1)
    bbox_poly = box(*bbox)

    print(f"Procesando {args.pbf_path} (bbox={bbox})...", flush=True)
    t0 = time.time()

    wkbfab = osmium.geom.WKBFactory()
    fp = osmium.FileProcessor(args.pbf_path).with_areas()

    total_areas_vistas = 0
    total_match_tags = 0
    total_fuera_bbox = 0
    total_wkb_error = 0
    poligonos = []

    for obj in fp:
        if not obj.is_area():
            continue
        total_areas_vistas += 1
        if total_areas_vistas % 200000 == 0:
            print(f"  ...{total_areas_vistas:,} areas revisadas, "
                  f"{len(poligonos)} candidatas hasta ahora, {time.time()-t0:.0f}s", flush=True)

        tags = dict(obj.tags)
        razones = matches(tags)
        if not razones:
            continue
        total_match_tags += 1

        try:
            wkb = wkbfab.create_multipolygon(obj)
        except RuntimeError:
            total_wkb_error += 1
            continue

        geom = shapely.wkb.loads(wkb, hex=True)
        if geom.is_empty or not geom.is_valid:
            geom = geom.buffer(0)
        if geom.is_empty:
            continue

        if not geom.intersects(bbox_poly):
            total_fuera_bbox += 1
            continue

        area_m2, _ = GEOD.geometry_area_perimeter(geom)
        area_m2 = abs(area_m2)

        poligonos.append({
            "id": obj.orig_id(),
            "tipo": "relation" if obj.is_multipolygon() else "way",
            "tags": tags,
            "razones_match": razones,
            "area_m2": area_m2,
            "geometry": mapping(geom),
        })

    poligonos.sort(key=lambda p: -p["area_m2"])
    area_total_m2 = sum(p["area_m2"] for p in poligonos)

    print(f"Total areas (ways cerradas + multipolygon) revisadas: {total_areas_vistas:,}")
    print(f"Con tag de zona intermareal: {total_match_tags:,}")
    print(f"Fuera del bbox del tile (descartadas): {total_fuera_bbox:,}")
    print(f"Errores de geometria WKB (descartadas): {total_wkb_error:,}")
    print(f"Poligonos retenidos: {len(poligonos):,}")
    print(f"Area total: {area_total_m2:,.0f} m2 ({area_total_m2/1e6:,.2f} km2)")
    print(f"Tiempo total: {time.time()-t0:.0f}s")

    salida = {
        "bbox": bbox,
        "criterio": [
            "wetland=tidalflat", "tidal=yes", "natural=mud",
            "natural=wetland+tidal=yes (subset de tidal=yes)", "natural=shoal",
        ],
        "total_areas_revisadas": total_areas_vistas,
        "total_con_tag": total_match_tags,
        "total_fuera_bbox": total_fuera_bbox,
        "total_wkb_error": total_wkb_error,
        "n_poligonos": len(poligonos),
        "area_total_m2": area_total_m2,
        "poligonos": poligonos,
    }
    with open(args.salida_json, "w", encoding="utf-8") as f:
        json.dump(salida, f)

    print(f"Guardado: {args.salida_json}")


if __name__ == "__main__":
    main()
