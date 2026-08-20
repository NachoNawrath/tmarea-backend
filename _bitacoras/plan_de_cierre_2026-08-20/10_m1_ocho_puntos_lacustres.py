# (m1) — check_control_points sobre los OCHO puntos lacustres, contra los CINCO tiles.
#
# ALCANCE CERRADO por el owner: correr y publicar. No se regeneran tiles, no se
# toca la mascara, no se disena la solucion.
#
# POR QUE ESTE FICHERO Y NO check_control_points.py A SECAS:
#   El instrumento trackeado tiene su lista de puntos CLAVADA en el codigo y
#   mira UN SOLO TILE (--tile, por defecto AUSTRAL_N). Con eso NO se puede
#   contestar la pregunta de EXTENT, que exige preguntarle a los CINCO tiles.
#   Asi que se corrio primero TAL CUAL -- 10 de 11, salida en 10a_instrumento_trackeado.txt --
#   para probar que la cadena de herramientas anda y para heredar su semantica,
#   y este fichero REUSA sus mismos modulos y su misma aritmetica:
#     - el mismo unpack_cells de packing.py
#     - la misma formula col=(x-origin_x)/res, fila=(origin_y-y)/res
#     - el mismo criterio: confianza_raw == 0 -> TIERRA, == 1 -> AGUA
#   No reimplementa la proyeccion: usa pyproj con el crs_proj4 que cada tile
#   declara en su propio .meta.json.
#
# LOS OCHO PUNTOS NO SE INVENTARON NI SE COPIARON DE UN CHAT: salen literales de
# _bitacoras/spec2_pantalla_2026-08-20/08_lago_contra_las_tres_clases.js, que es
# el instrumento trackeado que produjo el 12/12 de las fallas lacustres.
#
# EL CONTROL POSITIVO ES DE LA MISMA PROCEDENCIA Y ESO ES LO QUE LO HACE VALER:
#   el par maritimo Quellon -> Calbuco es el CONTROL POSITIVO que ese mismo
#   fichero usa, y son coordenadas de PUERTO igual que las ocho. Misma clase de
#   punto, misma fuente. Si el instrumento devolviera lo mismo para los ocho y
#   para los dos, no habria medido nada.
#
# EL VECINDARIO DE 2000 m NO ES UN UMBRAL INVENTADO: es el snap que el propio
# AUSTRAL_N.meta.json declara en sus observaciones ("0 puertos aislados
# (snap 2000m)"). Se mira porque un punto de muelle cae LEGITIMAMENTE en TIERRA
# -- lo dice check_control_points.py en su propio comentario -- y lo que decide
# si una ruta arranca es si hay agua navegable CERCA.
import json
import os
import sys

import numpy as np
from pyproj import Transformer

sys.path.insert(0, "C:/Users/katia/tmarea-backend/tools/raster-build")
from packing import unpack_cells  # noqa: E402

TILES_DIR = "C:/tmarea-data/tiles"
SNAP_M = 2000  # declarado en el meta del tile, no elegido aca

LACUSTRES = [
    ("Gral Carrera  zarpe    Pto Ibanez",   -46.2947, -71.9264),
    ("Gral Carrera  recalada Rio Tranquilo", -46.6194, -72.6733),
    ("Llanquihue    zarpe    Muelle",        -41.2553, -73.0026),
    ("Llanquihue    recalada Frutillar",     -41.0726, -72.9353),
    ("Villarrica    zarpe    Pucon",         -39.2765, -71.9803),
    ("Villarrica    recalada Villarrica",    -39.2883, -72.2195),
    ("Panguipulli   zarpe    Costanera",     -39.6439, -72.3220),
    ("Panguipulli   recalada Pto Fuy",       -39.8720, -71.8891),
]

CONTROLES_POSITIVOS = [
    ("CP maritimo  zarpe    Quellon",        -43.1208, -73.6232),
    ("CP maritimo  recalada Calbuco",        -41.7639, -73.1303),
    ("CP maritimo           Anahuac/Pto Montt", -41.4776, -72.9388),
]
CONTROL_NEGATIVO = [
    ("CN fuera de Chile     Cordoba, AR",    -31.4200, -64.1800),
]


def cargar_tiles():
    tiles = []
    for nombre in sorted(os.listdir(TILES_DIR)):
        if not nombre.endswith(".meta.json"):
            continue
        with open(os.path.join(TILES_DIR, nombre), encoding="utf-8") as f:
            meta = json.load(f)
        binp = os.path.join(TILES_DIR, meta["tile_id"] + ".bin")
        if not os.path.exists(binp):
            print("ALTO: el registry declara " + meta["tile_id"] + " y no esta el .bin")
            sys.exit(1)
        tiles.append({
            "id": meta["tile_id"],
            "meta": meta,
            "packed": np.memmap(binp, dtype=np.uint16, mode="r",
                                shape=(meta["rows"], meta["cols"])),
            "tr": Transformer.from_crs("EPSG:4326", meta["crs_proj4"], always_xy=True),
        })
    return tiles


def celda(t, lat, lon):
    """Devuelve (dentro, fila, col)."""
    x, y = t["tr"].transform(lon, lat)
    m = t["meta"]
    col = int((x - m["origin_x"]) / m["res_m"])
    fila = int((m["origin_y"] - y) / m["res_m"])
    dentro = 0 <= fila < m["rows"] and 0 <= col < m["cols"]
    return dentro, fila, col


def leer(t, fila, col):
    raw = int(t["packed"][fila, col])
    kml, conf, dist = unpack_cells(np.array([raw]))
    return raw, int(kml[0]), int(conf[0]), int(dist[0]) * t["meta"]["unit_m"]


def vecindario(t, fila, col):
    """Celdas navegables dentro del snap declarado. Devuelve (navegables, total)."""
    r = SNAP_M // t["meta"]["res_m"]
    m = t["meta"]
    f0, f1 = max(0, fila - r), min(m["rows"], fila + r + 1)
    c0, c1 = max(0, col - r), min(m["cols"], col + r + 1)
    bloque = np.asarray(t["packed"][f0:f1, c0:c1]).ravel()
    _, conf, _ = unpack_cells(bloque)
    return int((conf > 0).sum()), int(bloque.size)


def evaluar(tiles, etiqueta, lat, lon):
    dentro_de = []
    for t in tiles:
        d, fila, col = celda(t, lat, lon)
        if d:
            dentro_de.append((t, fila, col))

    if not dentro_de:
        print(f"  {etiqueta:38s} {lat:9.4f} {lon:9.4f}  ->  FUERA DE TODO TILE"
              f"                         causa: EXTENT")
        return "EXTENT", None

    # si cae en mas de uno, se informan todos y se decide por el primero navegable
    partes = []
    veredicto, detalle = None, None
    for t, fila, col in dentro_de:
        raw, kml, conf, dist = leer(t, fila, col)
        nav, tot = vecindario(t, fila, col)
        clase = "AGUA" if conf > 0 else "TIERRA"
        partes.append(f"{t['id']}[f={fila},c={col}] raw={raw} conf={conf} -> {clase}"
                      f" dist_m={dist} · navegables en {SNAP_M}m: {nav}/{tot}")
        if veredicto is None or (clase == "AGUA"):
            veredicto = "AGUA" if clase == "AGUA" else ("TIERRA_CON_AGUA_CERCA" if nav > 0 else "MASCARA")
            detalle = (t["id"], nav, tot, dist)
    print(f"  {etiqueta:38s} {lat:9.4f} {lon:9.4f}  ->  {veredicto}")
    for p in partes:
        print(f"      {p}")
    return veredicto, detalle


def main():
    tiles = cargar_tiles()
    print("(m1) — LOS OCHO PUNTOS LACUSTRES CONTRA EL RASTER")
    print("")
    print("  tiles cargados del registry: " + ", ".join(t["id"] for t in tiles))
    print("  snap declarado por el propio meta del tile: " + str(SNAP_M) + " m")
    print("  criterio heredado de check_control_points.py: confianza_raw == 0 -> TIERRA, > 0 -> AGUA")
    print("")

    print("LOS OCHO PUNTOS LACUSTRES")
    res_lac = [evaluar(tiles, e, la, lo) for e, la, lo in LACUSTRES]
    print("")
    print("CONTROL POSITIVO — misma clase de punto (coordenada de PUERTO), misma fuente,")
    print("y esta ruta SI calcula en el motor")
    res_cp = [evaluar(tiles, e, la, lo) for e, la, lo in CONTROLES_POSITIVOS]
    print("")
    print("CONTROL NEGATIVO — tiene que dar FUERA DE TODO TILE")
    res_cn = [evaluar(tiles, e, la, lo) for e, la, lo in CONTROL_NEGATIVO]

    print("")
    print("-" * 95)
    print("SEPARACION DE CAUSAS, POR LAGO — la que el plan anterior dejo DERIVADA y no medida")
    print("-" * 95)
    lagos = {}
    for (e, la, lo), (v, d) in zip(LACUSTRES, res_lac):
        lagos.setdefault(e.split()[0] + " " + e.split()[1] if e.startswith("Gral") else e.split()[0], []).append((e, v, d))
    for lago, filas in lagos.items():
        causas = {v for _, v, _ in filas}
        if causas == {"EXTENT"}:
            causa = "EXTENT — los dos extremos fuera de todo tile"
        elif "EXTENT" in causas:
            causa = "MIXTA — un extremo fuera del extent y el otro dentro"
        elif causas == {"MASCARA"}:
            causa = "MASCARA — dentro del extent, celda TIERRA y CERO navegables en el snap"
        else:
            causa = "OTRA — " + "/".join(sorted(causas))
        print(f"  {lago:16s} {causa}")

    print("")
    print("-" * 95)
    n_cp_ok = sum(1 for v, _ in res_cp if v in ("AGUA", "TIERRA_CON_AGUA_CERCA"))
    print(f"CONTROL POSITIVO: {n_cp_ok} de {len(res_cp)} maritimos con agua navegable alcanzable")
    n_cn_ok = sum(1 for v, _ in res_cn if v == "EXTENT")
    print(f"CONTROL NEGATIVO: {n_cn_ok} de {len(res_cn)} fuera de todo tile")
    if n_cp_ok == 0:
        print("ALTO: el control positivo no distingue. El instrumento no midio nada.")
        sys.exit(1)
    print("")


if __name__ == "__main__":
    main()
