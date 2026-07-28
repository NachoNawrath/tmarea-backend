"""
Evalua GEBCO (fuente 4 del spec, TMAREA_SPEC_Router_Raster_v1.md Sec.4) para
la Fase 3 -- el spec dice "no usar en AUSTRAL_*" por ser interpolada en
fiordos, pero eso nunca se midio contra dato real. Este script mide en vez
de asumir: compara el valor de GEBCO en los 7 puntos de control del
Derrotero SHOA contra la sonda documentada.

Version usada: GEBCO_2026 (la actual en el servicio publico -- GEBCO_2024
ya no esta disponible en download.gebco.net/CEDA, fue reemplazada por
lanzamientos anuales 2025/2026). Se deja constancia del cambio de version
en vez de forzar 2024 via un mirror historico.

Acceso: OPeNDAP directo contra el archivo CEDA (sin pasar por
download.gebco.net, que exige email y cola de trabajo asincronica -- eso
requeriria pedir permiso para enviar el email de alguien a un tercero, y
para una consulta de un puñado de celdas es innecesario). Confirmado
funcionando: GET con slice de indices sobre
https://dap.ceda.ac.uk/thredds/dodsC/.../GEBCO_2026.nc (elevation) y
gebco_2026_tid.nc (tid). Grid: 86400 x 43200 celdas, 15" (~463 m en el
ecuador, menos en latitudes altas), celda centrada:
    lon[i] = -180 + (i+0.5)/240   ->   i = round((lon+180)*240 - 0.5)
    lat[j] =  -90 + (j+0.5)/240   ->   j = round((lat+90)*240  - 0.5)
Verificado contra los valores reales de borde del grid (i=0, i=86399, etc).

TID (Type Identifier): codigo por celda de que tipo de fuente respalda el
valor (docs GEBCO_2024/2026). 10-17 = medicion directa (10 singlebeam, 11
multihaz, 12 sismica, 13 sondeo aislado, 14 sonda de ENC, 15 lidar, 16
optico, 17 combinacion). 40 = predicho por gravedad satelital, 41 =
interpolado por algoritmo. 0 = tierra. Bucket usado en el reporte:
"medido" = 10-17, "interpolado/predicho" = 40-49, "tierra" = 0.
"""
import csv
import json
import math
import time
import urllib.request

BASE_ELEV = "https://dap.ceda.ac.uk/thredds/dodsC/bodc/gebco/global/gebco_2026/ice_surface_elevation/netcdf/GEBCO_2026.nc"
BASE_TID = "https://dap.ceda.ac.uk/thredds/dodsC/bodc/gebco/global/gebco_2026/type_identifier_grid/netcdf/gebco_2026_tid.nc"

RES_PER_DEG = 240  # 15 arc-sec

OUT_DIR = r"C:\Users\katia\tmarea-backend\tools\raster-build"


def lon_to_idx(lon):
    return round((lon + 180) * RES_PER_DEG - 0.5)


def lat_to_idx(lat):
    return round((lat + 90) * RES_PER_DEG - 0.5)


def idx_to_lon(i):
    return -180 + (i + 0.5) / RES_PER_DEG


def idx_to_lat(j):
    return -90 + (j + 0.5) / RES_PER_DEG


def fetch_opendap_ascii(base_url, varname, lat_i0, lat_i1, lon_i0, lon_i1, retries=3):
    url = f"{base_url}.ascii?{varname}[{lat_i0}:1:{lat_i1}][{lon_i0}:1:{lon_i1}]"
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                text = resp.read().decode("utf-8")
            return parse_dods_ascii_grid(text)
        except Exception as e:
            last_err = e
            time.sleep(2)
    raise RuntimeError(f"fallo tras {retries} intentos: {url}\n{last_err}")


def parse_dods_ascii_grid(text):
    """Parsea la salida .ascii de un Grid 2D de OPeNDAP: lineas
    '[fila], v0, v1, v2, ...'. Devuelve list[list[float]]."""
    lines = text.strip().split("\n")
    rows = []
    for line in lines:
        line = line.strip()
        if not line.startswith("["):
            continue
        _, rest = line.split("]", 1)
        vals = [float(v) for v in rest.strip(", ").split(",") if v.strip() != ""]
        if vals:
            rows.append(vals)
    return rows


def ventana(lon, lat, half_cells=2):
    li = lon_to_idx(lon)
    lj = lat_to_idx(lat)
    elev = fetch_opendap_ascii(BASE_ELEV, "elevation", lj - half_cells, lj + half_cells, li - half_cells, li + half_cells)
    tid = fetch_opendap_ascii(BASE_TID, "tid", lj - half_cells, lj + half_cells, li - half_cells, li + half_cells)
    return elev, tid, li, lj


CONTROL_POINTS = [
    # nombre, lat, lon, sonda_shoa_m, fuente
    ("Paso Chocoi", -41.79, -73.55, 5.0, "Canal Chacao p.159, punto medio de la linea Canal de Chacao (geometria aproximada, no el punto exacto)"),
    ("Canal Tenglo", -41.487, -72.975, 11.0, "nodo N-PM-02 tmarea_nodos_nauticos_v1.json"),
    ("Canal Cruces", -44.24, -73.96, 6.6, "cerca de Isla Chaffers (Nominatim), aproximado"),
    ("Canal Pilcomayo Acceso W", -45.20, -73.55, 9.5, "extremo S de Canal Moraleda / cerca Isla Pilcomayo, aproximado"),
    ("Paso Galvarino", -44.42, -72.62, 10.0, "cerca Fiordo Ventisquero Cisnes (Nominatim), aproximado"),
    ("Canal Pilcomayo", -45.228, -73.545, 9.5, "Isla Pilcomayo (Nominatim)"),
    ("Paso De Vidts", -46.55, -73.85, 12.5, "S de Punta Leopardo (Nominatim), extremo S golfo Elefantes, aproximado"),
]


def clasificar_tid(t):
    t = int(t)
    if t == 0:
        return "tierra"
    if 10 <= t <= 19:
        return "medido"
    if 40 <= t <= 49:
        return "interpolado/predicho"
    return f"otro({t})"


def main():
    resultados = []
    for nombre, lat, lon, sonda_shoa, fuente in CONTROL_POINTS:
        print(f"Consultando GEBCO para {nombre} ({lat},{lon})...")
        elev, tid, li, lj = ventana(lon, lat, half_cells=2)
        elev_flat = [v for row in elev for v in row]
        tid_flat = [v for row in tid for v in row]
        centro_elev = elev[len(elev) // 2][len(elev[0]) // 2]
        centro_tid = tid[len(tid) // 2][len(tid[0]) // 2]
        prof_centro = -centro_elev if centro_elev < 0 else None
        prof_min_vecindad = -max(elev_flat) if max(elev_flat) < 0 else None  # menos profundo
        prof_max_vecindad = -min(elev_flat) if min(elev_flat) < 0 else None  # mas profundo
        tids_vecindad = sorted(set(int(t) for t in tid_flat))
        resultados.append({
            "nombre": nombre, "lat": lat, "lon": lon,
            "sonda_shoa_m": sonda_shoa,
            "gebco_prof_centro_m": prof_centro,
            "gebco_prof_min_vecindad_m": prof_min_vecindad,
            "gebco_prof_max_vecindad_m": prof_max_vecindad,
            "tid_centro": int(centro_tid), "tid_centro_clase": clasificar_tid(centro_tid),
            "tids_vecindad_5x5": tids_vecindad,
            "clases_vecindad": sorted(set(clasificar_tid(t) for t in tid_flat)),
            "error_vs_shoa_m": (round(prof_centro - sonda_shoa, 1) if prof_centro is not None else None),
            "fuente_coordenada": fuente,
        })
        time.sleep(0.5)

    with open(f"{OUT_DIR}\\gebco_control_points.json", "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)

    print("\n=== GEBCO vs SHOA en los 7 puntos de control ===")
    for r in resultados:
        print(f"{r['nombre']:<28} SHOA={r['sonda_shoa_m']:>5.1f}m  GEBCO(centro)={r['gebco_prof_centro_m']}m "
              f"error={r['error_vs_shoa_m']}m  TID_centro={r['tid_centro']}({r['tid_centro_clase']})  "
              f"TIDs_5x5={r['tids_vecindad_5x5']}")


if __name__ == "__main__":
    main()
