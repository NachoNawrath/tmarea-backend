"""
FASE 1 — Ingesta de insumos para la capa de jurisdicciones marítimas y lacustres.

Carga los dos insumos de la capa nueva y deja la evidencia cruda en _bitacoras/:

  1. Shapefile de cuerpos de agua continentales (geodata/lagos/Inventario_Lagos.shp),
     reproyectado desde su CRS de origen a la proyección de trabajo del resto de
     las capas de la base (EPSG:4326 — verificado contra geometry_columns).
  2. Archivo de definición de jurisdicciones del decreto (JSON), buscado dentro
     del repo en data/decreto/.

Reproducibilidad: ambos insumos se leen SIEMPRE desde rutas dentro del repo,
nunca desde la carpeta personal del owner. La procedencia (origen, fecha de
copia, tamaño y sha256) queda registrada en geodata/lagos/PROCEDENCIA.txt.

Este script no escribe en la base de datos ni modifica ningún insumo.

Uso (desde la raíz del repo):
    tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\fase1_ingesta_insumos.py
"""

import glob
import json
import os
import sys

import geopandas as gpd

# ── Rutas (todas relativas a la raíz del repo) ────────────────────────────────
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHP = os.path.join(REPO, "geodata", "lagos", "Inventario_Lagos.shp")
DECRETO_DIR = os.path.join(REPO, "data", "decreto")

# Proyección de trabajo del resto de las capas de la base.
# Verificado en public.geometry_columns: bahias_sitport, batimetria, ne_land,
# nodos_maritimos, seamarks_puntos y mapa_base_multipoligonos declaran srid 4326.
CRS_TRABAJO = "EPSG:4326"


def sep(titulo):
    print()
    print("=" * 78)
    print(titulo)
    print("=" * 78)


def ingesta_shapefile():
    sep("INSUMO 1 — SHAPEFILE DE CUERPOS DE AGUA CONTINENTALES")

    if not os.path.exists(SHP):
        print(f"RUTA        : {SHP}")
        print("ESTADO      : NO ENCONTRADO — no determinado")
        return None

    gdf = gpd.read_file(SHP)

    print(f"RUTA        : {os.path.relpath(SHP, REPO)}")
    print(f"REGISTROS   : {len(gdf)}")
    print()
    print("CRS DE ORIGEN (literal del .prj):")
    print(f"  {gdf.crs.to_string()}  —  {gdf.crs.name}")
    print(f"  unidad de eje: {gdf.crs.axis_info[0].unit_name}")
    print()
    print("EXTENSIÓN ESPACIAL EN CRS DE ORIGEN (minx, miny, maxx, maxy):")
    print(f"  {tuple(round(v, 3) for v in gdf.total_bounds)}")

    # ── Reproyección a la proyección de trabajo ──────────────────────────────
    gdf4326 = gdf.to_crs(CRS_TRABAJO)

    print()
    print(f"CRS DE DESTINO: {gdf4326.crs.to_string()}  —  {gdf4326.crs.name}")
    print("EXTENSIÓN ESPACIAL REPROYECTADA (minx, miny, maxx, maxy):")
    print(f"  {tuple(round(v, 6) for v in gdf4326.total_bounds)}")

    print()
    print("COLUMNAS DE ATRIBUTOS:")
    for col, dt in gdf4326.dtypes.items():
        print(f"  {col:<20} {dt}")

    print()
    print("TIPOS DE GEOMETRÍA:")
    for tipo, n in gdf4326.geom_type.value_counts().items():
        print(f"  {tipo:<20} {n}")
    print(f"  geometrías nulas     {int(gdf4326.geometry.isna().sum())}")
    print(f"  geometrías vacías    {int(gdf4326.geometry.is_empty.sum())}")
    print(f"  geometrías inválidas {int((~gdf4326.geometry.is_valid).sum())}")

    return gdf4326


def listado_nombres(gdf, campo):
    sep(f"LISTADO COMPLETO DE NOMBRES DEL SHAPEFILE — campo '{campo}'")
    serie = gdf[campo]
    # OJO: el campo trae NA de pandas, no cadena vacía. Un chequeo con
    # str(v).strip() == "" los cuenta como nombre válido ("nan") y reporta 0.
    nulos = int(serie.isna().sum())
    vacios = int((serie.dropna().astype(str).str.strip() == "").sum())
    con_nombre = len(serie) - nulos - vacios
    print(f"Total de registros : {len(serie)}")
    print(f"  sin nombre (NA)  : {nulos}")
    print(f"  cadena vacía     : {vacios}")
    print(f"  con nombre       : {con_nombre}")
    print()
    print("Listado (los registros sin nombre se marcan <SIN NOMBRE>):")
    print()
    for i, v in enumerate(serie.tolist(), 1):
        etiqueta = "<SIN NOMBRE>" if (v is None or serie.isna().iloc[i - 1]) else v
        print(f"{i:>5}  {etiqueta}")


def ingesta_decreto():
    sep("INSUMO 2 — ARCHIVO DE DEFINICIÓN DE JURISDICCIONES (DECRETO)")

    print(f"DIRECTORIO ESPERADO: {os.path.relpath(DECRETO_DIR, REPO)}")

    if not os.path.isdir(DECRETO_DIR):
        print("ESTADO      : DIRECTORIO INEXISTENTE")
        print("REGISTROS   : no determinado")
        print("CONTENIDO   : no determinado")
        return None

    archivos = sorted(glob.glob(os.path.join(DECRETO_DIR, "*.json")))
    if not archivos:
        print("ESTADO      : SIN ARCHIVOS .json")
        print("REGISTROS   : no determinado")
        print("CONTENIDO   : no determinado")
        return None

    for ruta in archivos:
        print()
        print(f"ARCHIVO     : {os.path.relpath(ruta, REPO)}")
        print(f"TAMAÑO      : {os.path.getsize(ruta)} bytes")
        with open(ruta, encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, list):
            print(f"REGISTROS   : {len(data)} (arreglo raíz)")
            claves = sorted({k for item in data if isinstance(item, dict) for k in item})
            print(f"CLAVES      : {claves}")
        elif isinstance(data, dict):
            print(f"CLAVES RAÍZ : {sorted(data.keys())}")
            for k, v in data.items():
                if isinstance(v, list):
                    print(f"  {k}: {len(v)} elementos")
        return data

    return None


def main():
    print("FASE 1 — INGESTA DE INSUMOS")
    print(f"Repo: {REPO}")
    print(f"Proyección de trabajo: {CRS_TRABAJO}")

    gdf = ingesta_shapefile()

    if gdf is not None:
        # El campo de nombre se detecta por presencia, no se asume.
        candidatos = [c for c in gdf.columns if c.lower() in
                      ("nombre", "name", "nom_lago", "nombre_lag", "nom")]
        if candidatos:
            listado_nombres(gdf, candidatos[0])
        else:
            sep("LISTADO COMPLETO DE NOMBRES DEL SHAPEFILE")
            print("Campo de nombre: no determinado")
            print(f"Columnas disponibles: {list(gdf.columns)}")

    ingesta_decreto()

    sep("FIN FASE 1")


if __name__ == "__main__":
    sys.exit(main())
