"""
Evalua GMRT (fuente 5 del spec, Sec.4) para la Fase 3: batimetria multihaz
real de campanas oceanograficas. GridServer es un servicio REST publico sin
auth (https://www.gmrt.org/services/gridserverinfo.php), confirmado
funcionando.

Distincion medido/sintetico: GMRT expone dos capas sobre la MISMA malla --
`topo` (con relleno sintetico de fondo donde no hay dato real) y
`topo-mask` (solo alta resolucion medida, nodata donde no hay). Comparar
ambas celda a celda es la forma correcta de separar medido de sintetico,
documentada por el propio servicio (no una inferencia nuestra).

Cruce contra AUSTRAL_N.bin: reutiliza el mismo CRS/indexado que
validar_fondeaderos.py (proj4 + origin/res del meta.json) para saber, por
cada celda de GMRT que cae dentro del bbox de AUSTRAL_N, si esa celda esta
en agua navegable segun el raster del router (distancia > 0).
"""
import json
import time
import urllib.request
import numpy as np
import rasterio
from pyproj import Transformer

OUT_DIR = r"C:\Users\katia\tmarea-backend\tools\raster-build"
SCRATCH = r"C:\Users\katia\AppData\Local\Temp\claude\C--Users-katia--claude\42344fe6-301c-4316-9745-6d3255a08c38\scratchpad"

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
        return None  # fuera de bbox
    raw = int(TILE_ARR[fila, col])
    dist_units = raw & DIST_MASK
    return (dist_units * UNIT_M) > 0


def gmrt_download(bbox, layer, out_path, resolution="max"):
    north, south, east, west = bbox
    url = (f"https://www.gmrt.org/services/GridServer?north={north}&south={south}"
           f"&east={east}&west={west}&layer={layer}&format=geotiff&resolution={resolution}")
    for attempt in range(3):
        try:
            urllib.request.urlretrieve(url, out_path)
            with open(out_path, "rb") as f:
                head = f.read(4)
            if head[:2] not in (b"II", b"MM"):
                raise RuntimeError(f"respuesta no es GeoTIFF: {head}")
            return
        except Exception as e:
            print(f"  reintento {attempt+1} para {layer} {bbox}: {e}")
            time.sleep(3)
    raise RuntimeError(f"fallo GMRT download tras 3 intentos: {url}")


TRAMOS = {
    "Canal Tenglo": (-41.44, -41.55, -72.90, -73.05),
    "Seno de Reloncavi": (-41.35, -41.75, -72.35, -72.70),
    "Canal de Chacao": (-41.75, -41.85, -73.40, -73.70),
    "Fiordo Aysen (acceso Chacabuco)": (-45.30, -45.50, -72.60, -72.95),
}

CONTROL_POINTS = [
    ("Paso Chocoi", -41.79, -73.55, 5.0),
    ("Canal Tenglo", -41.487, -72.975, 11.0),
    ("Canal Cruces", -44.24, -73.96, 6.6),
    ("Canal Pilcomayo Acceso W", -45.20, -73.55, 9.5),
    ("Paso Galvarino", -44.42, -72.62, 10.0),
    ("Canal Pilcomayo", -45.228, -73.545, 9.5),
    ("Paso De Vidts", -46.55, -73.85, 12.5),
]


def eval_tramo(nombre, bbox):
    print(f"Descargando GMRT para tramo: {nombre} {bbox}")
    topo_path = f"{SCRATCH}\\gmrt_{nombre.replace(' ', '_').replace('(', '').replace(')', '')}_topo.tif"
    mask_path = f"{SCRATCH}\\gmrt_{nombre.replace(' ', '_').replace('(', '').replace(')', '')}_mask.tif"
    gmrt_download(bbox, "topo", topo_path)
    gmrt_download(bbox, "topo-mask", mask_path)

    with rasterio.open(topo_path) as ds_topo, rasterio.open(mask_path) as ds_mask:
        topo = ds_topo.read(1).astype(float)
        mask = ds_mask.read(1).astype(float)
        nodata_mask = ds_mask.nodata
        transform = ds_topo.transform
        res_x = abs(transform.a)
        res_y = abs(transform.e)
        h, w = topo.shape

        # step para no evaluar cada celda 1:1 contra el tile si la grilla es
        # muy densa -- muestreo regular, suficiente para % de cobertura
        step = max(1, h // 200, w // 200)
        total = 0
        en_bbox_tile = 0
        agua_navegable = 0
        agua_con_dato_medido = 0
        agua_con_dato_topo = 0

        for r in range(0, h, step):
            for c in range(0, w, step):
                lon, lat = rasterio.transform.xy(transform, r, c)
                total += 1
                aw = es_agua_navegable(lon, lat)
                if aw is None:
                    continue
                en_bbox_tile += 1
                if not aw:
                    continue
                agua_navegable += 1
                if topo[r, c] < 0:  # tiene dato batimetrico (no nodata, bajo nivel del mar)
                    agua_con_dato_topo += 1
                if nodata_mask is not None and mask[r, c] != nodata_mask and mask[r, c] < 0:
                    agua_con_dato_medido += 1

        res_m_approx = res_y * 111320  # aprox a esta latitud
        return {
            "nombre": nombre, "bbox": bbox,
            "resolucion_grid_deg": [round(res_x, 6), round(res_y, 6)],
            "resolucion_aprox_m": round(res_m_approx, 1),
            "muestras_totales": total,
            "muestras_en_bbox_tile": en_bbox_tile,
            "muestras_agua_navegable": agua_navegable,
            "pct_agua_navegable_con_dato_topo": round(100 * agua_con_dato_topo / agua_navegable, 1) if agua_navegable else None,
            "pct_agua_navegable_con_dato_medido": round(100 * agua_con_dato_medido / agua_navegable, 1) if agua_navegable else None,
        }


def eval_control_points():
    resultados = []
    for nombre, lat, lon, sonda_shoa in CONTROL_POINTS:
        print(f"Consultando GMRT punto de control: {nombre}")
        d = 0.02  # ~2km
        bbox = (lat + d, lat - d, lon + d, lon - d)
        topo_path = f"{SCRATCH}\\gmrt_pt_{nombre.replace(' ', '_')}_topo.tif"
        mask_path = f"{SCRATCH}\\gmrt_pt_{nombre.replace(' ', '_')}_mask.tif"
        gmrt_download(bbox, "topo", topo_path, resolution="max")
        gmrt_download(bbox, "topo-mask", mask_path, resolution="max")
        with rasterio.open(topo_path) as ds_topo, rasterio.open(mask_path) as ds_mask:
            topo = ds_topo.read(1).astype(float)
            mask = ds_mask.read(1).astype(float)
            nodata_mask = ds_mask.nodata
            row, col = ds_topo.index(lon, lat)
            row = min(max(row, 0), topo.shape[0] - 1)
            col = min(max(col, 0), topo.shape[1] - 1)
            centro = topo[row, col]
            agua = topo[topo < 0]
            medido = mask[(mask != nodata_mask)] if nodata_mask is not None else mask[mask < 0]
            medido = medido[medido < 0] if len(medido) else medido
            prof_centro = -centro if centro < 0 else None
            prof_min_vecindad = -agua.max() if len(agua) else None
            prof_max_vecindad = -agua.min() if len(agua) else None
            tiene_medido_cerca = len(medido) > 0
        resultados.append({
            "nombre": nombre, "lat": lat, "lon": lon, "sonda_shoa_m": sonda_shoa,
            "gmrt_prof_centro_m": (round(prof_centro, 1) if prof_centro is not None else None),
            "gmrt_prof_min_vecindad_m": (round(prof_min_vecindad, 1) if prof_min_vecindad is not None else None),
            "gmrt_prof_max_vecindad_m": (round(prof_max_vecindad, 1) if prof_max_vecindad is not None else None),
            "tiene_dato_medido_topomask_en_bbox": tiene_medido_cerca,
            "error_centro_vs_shoa_m": (round(prof_centro - sonda_shoa, 1) if prof_centro is not None else None),
        })
        time.sleep(0.5)
    return resultados


def main():
    tramo_stats = {nombre: eval_tramo(nombre, bbox) for nombre, bbox in TRAMOS.items()}
    with open(f"{OUT_DIR}\\gmrt_tramos.json", "w", encoding="utf-8") as f:
        json.dump(tramo_stats, f, ensure_ascii=False, indent=2)
    print("\n=== GMRT por tramo critico ===")
    for nombre, r in tramo_stats.items():
        print(f"{nombre}: res~{r['resolucion_aprox_m']}m | agua_navegable={r['muestras_agua_navegable']} muestras | "
              f"con dato(topo)={r['pct_agua_navegable_con_dato_topo']}% | con dato MEDIDO={r['pct_agua_navegable_con_dato_medido']}%")

    puntos = eval_control_points()
    with open(f"{OUT_DIR}\\gmrt_control_points.json", "w", encoding="utf-8") as f:
        json.dump(puntos, f, ensure_ascii=False, indent=2)
    print("\n=== GMRT vs SHOA en los 7 puntos de control ===")
    for r in puntos:
        print(f"{r['nombre']:<28} SHOA={r['sonda_shoa_m']:>5.1f}m  GMRT(centro)={r['gmrt_prof_centro_m']}m "
              f"error={r['error_centro_vs_shoa_m']}m  rango_vecindad=[{r['gmrt_prof_min_vecindad_m']},{r['gmrt_prof_max_vecindad_m']}]  "
              f"medido_cerca={r['tiene_dato_medido_topomask_en_bbox']}")


if __name__ == "__main__":
    main()
