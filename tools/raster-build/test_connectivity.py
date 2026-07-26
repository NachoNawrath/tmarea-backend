"""
Test de conectividad por flood-fill sobre el .bin (permanente, reusable
para otros tiles/canales -- no es exclusivo de Canal Tenglo).

Por que esto y no solo mirar el control.tif: el control.tif esta a 1/4 de
resolucion (200 m/px en AUSTRAL_N). Canal Tenglo mide ~300 m de ancho:
sale en ~1.5 px, y puede VERSE cerrado en la imagen aunque el .bin de
resolucion completa (50 m) tenga el canal correctamente abierto, o
viceversa. Este test responde la pregunta sobre los datos crudos, no
sobre una imagen submuestreada.

Metodo:
  1. Flood-fill (8-conectividad, igual que el A* con paso diagonal que
     usara el router de Fase 2) sobre celdas navegables (confianza > 0),
     restringido a una ventana chica que contenga SOLO el canal en
     cuestion -- si la ventana fuera el tile entero, cualquier ruta larga
     por fuera "conectaria" los dos puntos y el test no probaria nada
     sobre el paso angosto en si.
  2. Transecto perpendicular en el punto mas angosto del trazado
     conocido: contando celdas navegables a lo largo de una normal al
     eje del canal, en metros reales (no en pixeles del control.tif).

Coordenadas de Canal Tenglo: NO inventadas. Tomadas del trazado ya
verificado del motor anterior (tmarea_nodos_nauticos_v1.json, edge
N-PM-01 -> N-PM-02, "Salida Puerto Montt por Canal Tenglo", 39 puntos).
"""
import argparse
import json

import numpy as np
from pyproj import Transformer
from scipy import ndimage

from packing import unpack_cells

# path completo (lon, lat) del edge N-PM-01->N-PM-02 en
# tmarea_nodos_nauticos_v1.json -- extremo Anahuac/Puerto Montt a extremo
# paso Tenglo (hacia Golfo de Ancud / Calbuco por el siguiente edge).
CANAL_TENGLO_PATH_LONLAT = [
    [-72.9387607, -41.4776306], [-72.9391973, -41.4775993], [-72.9396349, -41.4775771],
    [-72.9400732, -41.477564], [-72.9405118, -41.4775602], [-72.9409504, -41.4775654],
    [-72.9413886, -41.4775798], [-72.9418262, -41.4776034], [-72.9422625, -41.4776361],
    [-72.9426973, -41.4776781], [-72.943131, -41.4777287], [-72.9435624, -41.4777888],
    [-72.9439911, -41.4778574], [-72.9444175, -41.4779354], [-72.9448404, -41.4780218],
    [-72.9452602, -41.4781176], [-72.9456762, -41.4782214], [-72.9460881, -41.4783343],
    [-72.9464958, -41.4784556], [-72.9468988, -41.4785855], [-72.9472967, -41.4787236],
    [-72.9476893, -41.4788701], [-72.9480764, -41.4790246], [-72.9484574, -41.4791873],
    [-72.9488326, -41.4793577], [-72.9519, -41.4814], [-72.9550928, -41.4836097],
    [-72.9567531, -41.4845179], [-72.9584134, -41.4854262], [-72.9584939, -41.4854399],
    [-72.9585744, -41.4854537], [-72.958657, -41.4854555], [-72.9587396, -41.4854531],
    [-72.9588243, -41.4854403], [-72.9589091, -41.485422], [-72.9589902, -41.4853934],
    [-72.9590714, -41.4853571], [-72.9593207, -41.4852378], [-72.9595701, -41.4851186],
]

# lat, lon
PUNTO_A = (-41.4776306, -72.9387607)  # lado Puerto Montt / Anahuac (path[0])
PUNTO_B = (-41.4851186, -72.9595701)  # lado paso Tenglo, hacia Golfo de Ancud (path[-1])

# Ventana chica que contiene SOLO el canal -- no la ruta larga por fuera
# de Isla Tenglo. Bbox del path +- margen (~1.5-2 km), suficiente para
# incluir todo el ancho del paso pero no un rodeo por el sur/oeste de la
# isla, que en esta zona implica varios km de mas.
VENTANA = {"lat_min": -41.50, "lat_max": -41.465, "lon_min": -72.975, "lon_max": -72.925}


def latlon_to_rowcol(lat, lon, meta, transformer):
    x, y = transformer.transform(lon, lat)
    col = int((x - meta["origin_x"]) / meta["res_m"])
    fila = int((meta["origin_y"] - y) / meta["res_m"])
    return fila, col


def load_confianza(meta, tiles_dir, tile_id):
    rows, cols = meta["rows"], meta["cols"]
    packed = np.memmap(f"{tiles_dir}/{tile_id}.bin", dtype=np.uint16, mode="r", shape=(rows, cols))
    return packed


def flood_fill_check(meta, packed, transformer, punto_a, punto_b, ventana, log):
    fila_min, col_min = latlon_to_rowcol(ventana["lat_max"], ventana["lon_min"], meta, transformer)
    fila_max, col_max = latlon_to_rowcol(ventana["lat_min"], ventana["lon_max"], meta, transformer)
    fila_min, fila_max = max(0, fila_min), min(meta["rows"], fila_max)
    col_min, col_max = max(0, col_min), min(meta["cols"], col_max)

    log(f"Ventana: filas [{fila_min}:{fila_max}] ({fila_max - fila_min} filas), "
        f"cols [{col_min}:{col_max}] ({col_max - col_min} cols)")

    ventana_raw = packed[fila_min:fila_max, col_min:col_max]
    _, confianza, _ = unpack_cells(ventana_raw)
    navegable = confianza > 0

    fa, ca = latlon_to_rowcol(*punto_a, meta, transformer)
    fb, cb = latlon_to_rowcol(*punto_b, meta, transformer)
    fa_local, ca_local = fa - fila_min, ca - col_min
    fb_local, cb_local = fb - fila_min, cb - col_min

    for nombre, f, c in [("A", fa_local, ca_local), ("B", fb_local, cb_local)]:
        if not (0 <= f < navegable.shape[0] and 0 <= c < navegable.shape[1]):
            raise RuntimeError(f"Punto {nombre} cae fuera de la ventana -- agrandar VENTANA")
        if not navegable[f, c]:
            log(f"  AVISO: punto {nombre} (fila={f},col={c} dentro de ventana) no es navegable el mismo; "
                f"se busca la celda navegable mas cercana")

    # 8-conectividad: coincide con el paso diagonal que usara el A* de
    # Fase 2 (heuristica octile). Con 4-conectividad se podria reportar
    # "cerrado" un paso que el router si va a poder cruzar en diagonal.
    structure = np.ones((3, 3), dtype=int)
    labeled, n_components = ndimage.label(navegable, structure=structure)

    def nearest_navigable_label(f, c, max_r=5):
        if labeled[f, c] != 0:
            return labeled[f, c]
        for r in range(1, max_r + 1):
            f0, f1 = max(0, f - r), min(labeled.shape[0], f + r + 1)
            c0, c1 = max(0, c - r), min(labeled.shape[1], c + r + 1)
            sub = labeled[f0:f1, c0:c1]
            nz = sub[sub != 0]
            if nz.size:
                return int(nz[0])
        return 0

    label_a = nearest_navigable_label(fa_local, ca_local)
    label_b = nearest_navigable_label(fb_local, cb_local)

    conectado = label_a != 0 and label_a == label_b
    log(f"  componentes conexas en la ventana: {n_components}")
    log(f"  label(A)={label_a}, label(B)={label_b}")
    return conectado


def narrowest_width(meta, packed, transformer, path_lonlat, log, step_m=None):
    step_m = step_m or meta["res_m"]
    to_proj = transformer

    proj_pts = [to_proj.transform(lon, lat) for lon, lat in path_lonlat]
    proj_pts = np.array(proj_pts)

    min_width = None
    min_width_at = None

    n = len(proj_pts)
    for i in range(1, n - 1):
        tangent = proj_pts[i + 1] - proj_pts[i - 1]
        norm = np.linalg.norm(tangent)
        if norm == 0:
            continue
        tangent /= norm
        perp = np.array([-tangent[1], tangent[0]])  # normal al eje del canal

        cx, cy = proj_pts[i]

        def is_navigable(x, y):
            col = int((x - meta["origin_x"]) / meta["res_m"])
            fila = int((meta["origin_y"] - y) / meta["res_m"])
            if not (0 <= fila < meta["rows"] and 0 <= col < meta["cols"]):
                return False
            raw = int(packed[fila, col])
            _, confianza, _ = unpack_cells(np.array([raw]))
            return bool(confianza[0] > 0)

        if not is_navigable(cx, cy):
            continue  # el propio punto del trazado cae en tierra en esta resolucion, se salta

        dist_pos, dist_neg = 0.0, 0.0
        d = step_m
        while is_navigable(cx + perp[0] * d, cy + perp[1] * d):
            dist_pos = d
            d += step_m
        d = step_m
        while is_navigable(cx - perp[0] * d, cy - perp[1] * d):
            dist_neg = d
            d += step_m

        width = dist_pos + dist_neg + meta["res_m"]  # + la celda central
        if min_width is None or width < min_width:
            min_width = width
            min_width_at = path_lonlat[i]

    log(f"  ancho minimo encontrado: {min_width:.0f} m, en {min_width_at}")
    return min_width, min_width_at


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", default="AUSTRAL_N")
    ap.add_argument("--tiles-dir", default="C:/tmarea-data/tiles")
    args = ap.parse_args()

    def log(msg):
        print(msg, flush=True)

    with open(f"{args.tiles_dir}/{args.tile}.meta.json", encoding="utf-8") as f:
        meta = json.load(f)

    transformer = Transformer.from_crs("EPSG:4326", meta["crs_proj4"], always_xy=True)
    packed = load_confianza(meta, args.tiles_dir, args.tile)

    log("=== TEST: conectividad Canal Tenglo (flood-fill en ventana acotada) ===")
    log(f"Punto A (Puerto Montt/Anahuac): {PUNTO_A}")
    log(f"Punto B (paso Tenglo, hacia Golfo de Ancud): {PUNTO_B}")
    conectado = flood_fill_check(meta, packed, transformer, PUNTO_A, PUNTO_B, VENTANA, log)
    log(f"RESULTADO: {'CONECTADO -- canal abierto por Tenglo' if conectado else 'NO CONECTADO -- canal cerrado en el .bin'}")

    log("\n=== ANCHO NAVEGABLE MINIMO (transecto perpendicular) ===")
    min_width, where = narrowest_width(meta, packed, transformer, CANAL_TENGLO_PATH_LONLAT, log)

    log("\n=== VEREDICTO ===")
    ok = conectado and min_width is not None and min_width > 0
    print("PASA" if ok else "FALLA")
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
