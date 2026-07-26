"""
Genera la base de src/config/zonas-dragadas.json (spec
TMAREA_SPEC_Router_Raster_v1.md Sec 7.1): solo las zonas tipo
'area_portuaria' (punto + buffer alrededor de cada puerto de
puertos_chile_nacional.json). Las zonas 'canal_conocido' y
'canal_acceso_derivado' se agregan por separado (derivar-zonas-canal.js)
porque requieren el router cargado (dilatacion/flood-fill) o datos de
otro archivo (tmarea_nodos_nauticos_v1.json).

Formato de cada entrada (igual para los 3 tipos, spec Sec 7.1):
  { nombre, tipo, geometria_wgs84, buffer_m, dMinM_max, fuente }
geometria_wgs84 es [lon,lat] para area_portuaria (punto), o
[[lon,lat],...] para canal_conocido/canal_acceso_derivado (linea).

NOTA (v1.6.1): el buffer de 2km en AREAS_PORTUARIAS es DELIBERADAMENTE
grande todavia -- el spec pide medir el dano y cubrir los canales por su
propia geometria ANTES de reducirlo a ~800m. No bajar este numero sin
haber corrido esa secuencia completa.
"""
import json
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUERTOS_PATH = os.path.join(REPO_ROOT, "src", "services", "data", "puertos_chile_nacional.json")
OUT_PATH = os.path.join(REPO_ROOT, "src", "config", "zonas-dragadas.json")

AUSTRAL_N_BBOX = {"lon_min": -75.6, "lon_max": -71.9, "lat_min": -47.0, "lat_max": -39.5}
BUFFER_PUERTO_M = 1000
BUFFER_AREA_PORTUARIA_M = 2000
DMIN_MAX = 50

AREAS_PORTUARIAS = [
    ("Puerto Montt (Anahuac)", -72.97656408099994, -41.48607231899996),
    ("Puerto Montt (centro/bahia interior)", -72.9378, -41.4718),
    ("Calbuco", -73.13039365699996, -41.77629706199997),
    ("Ancud", -73.83128069799994, -41.86653650299996),
    ("Castro", -73.75909839499997, -42.48076879599995),
    ("Quellon", -73.62317869399999, -43.12075347399997),
    ("Melinka", -73.74786402599995, -43.89816864699998),
    ("Chacabuco", -72.807, -45.462),
]


def generar_base(buffer_area_m=BUFFER_AREA_PORTUARIA_M, buffer_puerto_m=BUFFER_PUERTO_M):
    with open(PUERTOS_PATH, encoding="utf-8") as f:
        data = json.load(f)

    zonas = []
    for area_nombre, lon, lat in AREAS_PORTUARIAS:
        zonas.append({
            "nombre": area_nombre,
            "tipo": "area_portuaria",
            "geometria_wgs84": [lon, lat],
            "buffer_m": buffer_area_m,
            "dMinM_max": DMIN_MAX,
            "fuente": "area portuaria principal (spec Sec 7.1), aproximacion por buffer -- sin poligono oficial",
        })

    n_puertos = 0
    for feat in data["features"]:
        geom = feat.get("geometry", {})
        lon, lat = geom.get("x"), geom.get("y")
        if lon is None or lat is None:
            continue
        if not (AUSTRAL_N_BBOX["lon_min"] <= lon <= AUSTRAL_N_BBOX["lon_max"]
                and AUSTRAL_N_BBOX["lat_min"] <= lat <= AUSTRAL_N_BBOX["lat_max"]):
            continue
        nombre = str(feat["attributes"].get("NOMBRE") or f"puerto_{feat['attributes'].get('OBJECTID')}")
        zonas.append({
            "nombre": nombre,
            "tipo": "area_portuaria",
            "geometria_wgs84": [lon, lat],
            "buffer_m": buffer_puerto_m,
            "dMinM_max": DMIN_MAX,
            "fuente": "puertos_chile_nacional.json (spec Sec 7.1)",
        })
        n_puertos += 1

    return zonas, len(AREAS_PORTUARIAS), n_puertos


def main():
    zonas, n_areas, n_puertos = generar_base()
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(zonas, f, ensure_ascii=False, indent=2)
    print(f"{n_areas} areas portuarias + {n_puertos} puertos individuales "
          f"dentro del bbox de AUSTRAL_N = {len(zonas)} zonas 'area_portuaria' escritas en {OUT_PATH}")


if __name__ == "__main__":
    main()
