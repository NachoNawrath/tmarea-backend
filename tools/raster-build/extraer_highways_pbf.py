#!/usr/bin/env python3
"""
extraer_highways_pbf.py

Extrae ways highway=* (excluyendo bridge=yes / tunnel=yes) de un extracto
.osm.pbf, restringidas a un bbox, y las vuelca a JSON con la MISMA forma
que devuelve Overpass ("out geom"): { "elements": [ {type, id, tags,
geometry: [{lat,lon}, ...]}, ... ] }.

Existe para reemplazar las consultas en vivo a Overpass (la API publica no
esta pensada para barrer 8 grados de latitud -- ver diagnostico Piedraplen,
2026-07-28): un solo .osm.pbf descargado una vez, procesado local, sin rate
limit ni dependencia de un servicio externo.

Tambien extrae route=ferry (marcadas "es_ferry": true), agregado
2026-07-29 tras el caso El Banquito / Isla Huapi Abtao: el detector solo
miraba highway=*, asi que cualquier cruce mapeado unicamente como ferry
(sin highway=*) era invisible para todo el pipeline, sin importar su
ancho. Ver la nota en detectar-estructuras-artificiales.js sobre por que
a las ferries NO se les aplica el mismo umbral de ancho que a las
highway=*.

Reutilizable para cualquier tile futuro: basta con pasar el bbox del tile
correspondiente.

Requiere: pip install osmium (ya en tools/raster-build/.venv)

Uso:
    python extraer_highways_pbf.py <archivo.osm.pbf> <salida.json> \
        --bbox min_lon,min_lat,max_lon,max_lat

Ejemplo (bbox de AUSTRAL_N, spec S3.2):
    python extraer_highways_pbf.py C:/tmarea-data/raw/chile-latest.osm.pbf \
        C:/tmarea-data/raw/AUSTRAL_N_highways.json \
        --bbox -75.6,-47.0,-71.9,-41.5
"""
import argparse
import json
import sys

import osmium


class HighwayHandler(osmium.SimpleHandler):
    """Extrae highway=* y route=ferry (marcadas con es_ferry=true) -- ver
    nota 2026-07-29 en el docstring del modulo sobre por que route=ferry
    tambien se extrae aqui."""

    def __init__(self, bbox):
        super().__init__()
        self.min_lon, self.min_lat, self.max_lon, self.max_lat = bbox
        self.ways = []
        self.total_highway = 0
        self.total_ferry = 0
        self.excluidas_bridge_tunnel = 0
        self.sin_nodo_en_bbox = 0

    def _en_bbox(self, lon, lat):
        return self.min_lon <= lon <= self.max_lon and self.min_lat <= lat <= self.max_lat

    def way(self, w):
        tags = w.tags
        es_highway = "highway" in tags
        es_ferry = tags.get("route") == "ferry"
        if not es_highway and not es_ferry:
            return

        if es_highway:
            self.total_highway += 1
            if tags.get("bridge") == "yes" or tags.get("tunnel") == "yes":
                self.excluidas_bridge_tunnel += 1
                return
        else:
            self.total_ferry += 1

        geometry = []
        alguno_en_bbox = False
        try:
            for n in w.nodes:
                if not n.location.valid():
                    geometry.append(None)
                    continue
                lon, lat = n.location.lon, n.location.lat
                geometry.append({"lat": lat, "lon": lon})
                if self._en_bbox(lon, lat):
                    alguno_en_bbox = True
        except osmium.InvalidLocationError:
            # nodo sin resolver (extracto incompleto) -- descartar la way
            return

        if not alguno_en_bbox:
            self.sin_nodo_en_bbox += 1
            return

        self.ways.append({
            "type": "way",
            "id": w.id,
            "tags": dict(tags),
            "geometry": geometry,
            "es_ferry": es_ferry,
        })


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

    print(f"Procesando {args.pbf_path} (bbox={bbox})...")
    handler = HighwayHandler(bbox)
    handler.apply_file(args.pbf_path, locations=True)

    print(f"Total ways con highway=*: {handler.total_highway}")
    print(f"Total ways con route=ferry: {handler.total_ferry}")
    print(f"Excluidas por bridge=yes/tunnel=yes: {handler.excluidas_bridge_tunnel}")
    print(f"Descartadas por no tener ningun nodo dentro del bbox: {handler.sin_nodo_en_bbox}")
    print(f"Ways retenidas: {len(handler.ways)}")

    with open(args.salida_json, "w", encoding="utf-8") as f:
        json.dump({"elements": handler.ways}, f)

    print(f"Guardado: {args.salida_json}")


if __name__ == "__main__":
    main()
