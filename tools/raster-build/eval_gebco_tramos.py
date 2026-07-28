"""
Cobertura de GEBCO por tramo critico, cruzada contra AUSTRAL_N.bin (misma
logica que eval_gmrt.py pero para GEBCO via OPeNDAP -- ver eval_gebco.py
para el acceso). A resolucion nativa (15", ~450m) no hace falta submuestrear:
cada tramo tiene como mucho unas pocas decenas de celdas por lado.
"""
import json
import numpy as np
from pyproj import Transformer

from eval_gebco import lon_to_idx, lat_to_idx, idx_to_lon, idx_to_lat, fetch_opendap_ascii, BASE_ELEV, BASE_TID, clasificar_tid

OUT_DIR = r"C:\Users\katia\tmarea-backend\tools\raster-build"
META_PATH = r"C:\tmarea-data\tiles\AUSTRAL_N.meta.json"
BIN_PATH = r"C:\tmarea-data\tiles\AUSTRAL_N.bin"

with open(META_PATH, encoding="utf-8") as f:
    META = json.load(f)
ORIGIN_X, ORIGIN_Y = META["origin_x"], META["origin_y"]
RES_M = META["res_m"]
COLS, ROWS = META["cols"], META["rows"]
UNIT_M = META["unit_m"]
DIST_MASK = (1 << (META["packing"]["dist_bits"][0] + 1)) - 1
TILE_ARR = np.memmap(BIN_PATH, dtype="uint16", mode="r", shape=(ROWS, COLS))
TO_TILE_CRS = Transformer.from_crs("EPSG:4326", META["crs_proj4"], always_xy=True)


def es_agua_navegable(lon, lat):
    x, y = TO_TILE_CRS.transform(lon, lat)
    col = int((x - ORIGIN_X) / RES_M)
    fila = int((ORIGIN_Y - y) / RES_M)
    if not (0 <= col < COLS and 0 <= fila < ROWS):
        return None
    raw = int(TILE_ARR[fila, col])
    dist_units = raw & DIST_MASK
    return (dist_units * UNIT_M) > 0


TRAMOS = {
    "Canal Tenglo": (-41.44, -41.55, -72.90, -73.05),
    "Seno de Reloncavi": (-41.35, -41.75, -72.35, -72.70),
    "Canal de Chacao": (-41.75, -41.85, -73.40, -73.70),
    "Fiordo Aysen (acceso Chacabuco)": (-45.30, -45.50, -72.60, -72.95),
}


def eval_tramo(nombre, bbox):
    north, south, east, west = bbox
    li0, li1 = sorted([lon_to_idx(west), lon_to_idx(east)])
    lj0, lj1 = sorted([lat_to_idx(south), lat_to_idx(north)])
    print(f"GEBCO {nombre}: {li1-li0+1} x {lj1-lj0+1} celdas nativas")
    elev = fetch_opendap_ascii(BASE_ELEV, "elevation", lj0, lj1, li0, li1)
    tid = fetch_opendap_ascii(BASE_TID, "tid", lj0, lj1, li0, li1)

    total = agua_navegable = con_dato = medido = 0
    tids_vistos = set()
    for jj, row in enumerate(elev):
        lat = idx_to_lat(lj0 + jj)
        for ii, val in enumerate(row):
            lon = idx_to_lon(li0 + ii)
            total += 1
            aw = es_agua_navegable(lon, lat)
            if not aw:
                continue
            agua_navegable += 1
            if val < 0:
                con_dato += 1
            t = int(tid[jj][ii])
            tids_vistos.add(t)
            if 10 <= t <= 19:
                medido += 1

    return {
        "nombre": nombre, "bbox": bbox, "celdas_nativas": total,
        "agua_navegable_celdas": agua_navegable,
        "pct_agua_navegable_con_dato": round(100 * con_dato / agua_navegable, 1) if agua_navegable else None,
        "pct_agua_navegable_medido": round(100 * medido / agua_navegable, 1) if agua_navegable else None,
        "tids_presentes": sorted(tids_vistos),
        "clases_tid_presentes": sorted(set(clasificar_tid(t) for t in tids_vistos)),
    }


def main():
    stats = {nombre: eval_tramo(nombre, bbox) for nombre, bbox in TRAMOS.items()}
    with open(f"{OUT_DIR}\\gebco_tramos.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print("\n=== GEBCO por tramo critico ===")
    for nombre, r in stats.items():
        print(f"{nombre}: {r['agua_navegable_celdas']} celdas agua navegable | "
              f"con dato={r['pct_agua_navegable_con_dato']}% | medido(TID 10-19)={r['pct_agua_navegable_medido']}% | "
              f"TIDs={r['tids_presentes']}")


if __name__ == "__main__":
    main()
