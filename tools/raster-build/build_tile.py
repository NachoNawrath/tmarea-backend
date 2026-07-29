"""
Pipeline de build del raster de ruteo (TMAREA_SPEC_Router_Raster_v1.md Sec 5).

Fase 1 (esta corrida): SOLO OSM water polygons + seamarks de peligro.
Sin batimetria, sin KML (no existen los 14 KML en el repo todavia).
Consecuencia esperada y correcta (spec Sec 5.2): todas las celdas
navegables salen ROJO. Confianza uniforme = constante multiplicativa,
no cambia el camino optimo -- la capa empieza a discriminar en Fase 3.

Uso:
    python build_tile.py --tile AUSTRAL_N
"""
import argparse
import gc
import json
import os
import time

import geopandas as gpd
import numpy as np
import rasterio.features

from banded_edt import process_tile_banded
from coarse_and_control import write_coarse_bin, write_control_tif
from grid import TILES, compute_grid

DATA_DIR = "C:/tmarea-data/raw"
OUT_DIR = "C:/tmarea-data/tiles"
WATER_POLYGONS_ZIP = f"{DATA_DIR}/water-polygons-split-4326.zip"
HAZARD_BUFFER_M = 100
UNIT_M = 10  # unidad del campo distancia empaquetado (spec Sec 5.1)

# tools/raster-build/build_tile.py -> raiz del repo (tmarea-backend/)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ZONAS_DRAGADAS_PATH = os.path.join(REPO_ROOT, "src", "config", "zonas-dragadas.json")
EXCLUSIONES_PATH = os.path.join(REPO_ROOT, "src", "config", "exclusiones.json")


def find_water_shapefile():
    """El zip de osmdata.openstreetmap.de trae el shapefile dentro de una
    carpeta water-polygons-split-4326/. geopandas puede leer directo del
    zip via el prefijo zip://, sin descomprimir a disco."""
    return f"zip://{WATER_POLYGONS_ZIP}!water-polygons-split-4326/water_polygons.shp"


def load_water_mask(tile_cfg, grid, log):
    log("Cargando water polygons OSM (recorte por bbox)...")
    bbox = (tile_cfg["lon_min"], tile_cfg["lat_min"], tile_cfg["lon_max"], tile_cfg["lat_max"])
    gdf = gpd.read_file(find_water_shapefile(), bbox=bbox)
    log(f"  {len(gdf)} poligonos de agua intersectan el bbox")

    gdf = gdf.to_crs(grid["crs_proj4"])

    transform = rasterio.transform.from_origin(grid["origin_x"], grid["origin_y"], grid["res_m"], grid["res_m"])
    shape = (grid["rows"], grid["cols"])

    if len(gdf) == 0:
        raise RuntimeError("Ningun poligono de agua intersecta el bbox del tile -- revisar bbox/fuente")

    agua = rasterio.features.rasterize(
        [(geom, 1) for geom in gdf.geometry if geom is not None and not geom.is_empty],
        out_shape=shape,
        transform=transform,
        fill=0,
        dtype=np.uint8,
    ).astype(bool)

    del gdf
    gc.collect()
    log(f"  mascara de agua: {agua.sum():,} celdas navegables de {agua.size:,} ({100 * agua.mean():.1f}%)")
    return agua, transform


def subtract_hazards(agua, tile_id, grid, transform, log):
    hazards_path = f"{DATA_DIR}/{tile_id}_seamarks_peligro.json"
    if not os.path.exists(hazards_path):
        log(f"  AVISO: no se encontro {hazards_path}, se omite la resta de peligros")
        return agua, 0

    with open(hazards_path, encoding="utf-8") as f:
        overpass = json.load(f)

    elements = overpass.get("elements", [])
    if not elements:
        log("  0 elementos de peligro -- nada que restar")
        return agua, 0

    from shapely.geometry import Point, LineString
    from shapely.ops import transform as shp_transform
    from pyproj import Transformer

    to_proj = Transformer.from_crs("EPSG:4326", grid["crs_proj4"], always_xy=True).transform

    geoms = []
    for el in elements:
        if el["type"] == "node":
            geoms.append(Point(el["lon"], el["lat"]))
        elif el["type"] == "way" and "geometry" in el:
            coords = [(pt["lon"], pt["lat"]) for pt in el["geometry"]]
            if len(coords) >= 2:
                geoms.append(LineString(coords))

    if not geoms:
        log("  0 geometrias de peligro utilizables -- nada que restar")
        return agua, 0

    buffered = [shp_transform(to_proj, g).buffer(HAZARD_BUFFER_M) for g in geoms]

    hazard_mask = rasterio.features.rasterize(
        [(g, 1) for g in buffered],
        out_shape=agua.shape,
        transform=transform,
        fill=0,
        dtype=np.uint8,
    ).astype(bool)

    n_before = agua.sum()
    agua = agua & ~hazard_mask
    log(f"  {len(geoms)} peligros, buffer {HAZARD_BUFFER_M}m -> {n_before - agua.sum():,} celdas removidas de agua")
    return agua, len(geoms)


def subtract_exclusiones(agua, grid, transform, log):
    """Estructuras artificiales que cortan un canal (terraplenes, espigones,
    causeways, tombolos) que el water-polygon de OSM no registra como
    tierra porque no modifican la linea de costa mapeada -- ver
    tools/detectar-estructuras-artificiales.js y spec Sec 7.6 (mecanismo de
    exclusion, "no pases por alla": celdas marcadas intransitables en el
    build, preferido sobre un waypoint forzado).

    src/config/exclusiones.json: cada entrada es una linea WGS84 (el tramo
    de la via que corre sobre agua, entre landA y landB) + buffer_m, O
    (campo "tipo_geometria": "poligono") un poligono WGS84 ya cerrado que
    cubre el istmo completo tierra-a-tierra -- preferido sobre una union de
    lineas bufferizadas cuando el terraplen tiene ramificaciones (varias
    ways no contiguas sobre el mismo cuerpo de tierra): una linea buffereada
    solo cubre una franja fija alrededor de la via, y si el terraplen real
    es mas ancho que eso en algun punto, o si el cluster de vias no forma
    una cadena continua, puede quedar un hueco navegable junto a la franja
    aunque cada via individual este bien cubierta (caso Piedraplen, Calbuco,
    diagnosticado 2026-07-29: 8 lineas con buffer_m=60 sin huecos en su
    propio trazado, verificado, pero igual insuficiente). El poligono se
    deriva de las ways natural=coastline del .osm.pbf (limite tierra/agua
    real, no una suposicion de ancho de calzada) recortadas a una ventana
    local y polygonize()-adas -- ver tools/raster-build/build_tile.py
    historial de commit para el script de derivacion. Se resta de la
    mascara de agua ANTES del EDT, igual que subtract_hazards -- estas
    celdas deben salir confianza=0 (tierra), no solo penalizadas."""
    if not os.path.exists(EXCLUSIONES_PATH):
        log(f"  AVISO: no se encontro {EXCLUSIONES_PATH}, se omite la resta de exclusiones")
        return agua, 0

    with open(EXCLUSIONES_PATH, encoding="utf-8") as f:
        exclusiones = json.load(f)
    if not exclusiones:
        log("  0 exclusiones -- nada que restar")
        return agua, 0

    from shapely.geometry import LineString, Polygon
    from shapely.ops import transform as shp_transform
    from pyproj import Transformer

    to_proj = Transformer.from_crs("EPSG:4326", grid["crs_proj4"], always_xy=True).transform

    buffered = []
    for exc in exclusiones:
        if exc.get("tipo_geometria") == "poligono":
            geom = Polygon(exc["geometria_wgs84"])
        else:
            geom = LineString(exc["geometria_wgs84"])
        proyectada = shp_transform(to_proj, geom)
        buffered.append(proyectada.buffer(exc["buffer_m"]))

    exclusion_mask = rasterio.features.rasterize(
        [(g, 1) for g in buffered],
        out_shape=agua.shape,
        transform=transform,
        fill=0,
        dtype=np.uint8,
    ).astype(bool)

    n_before = agua.sum()
    agua = agua & ~exclusion_mask
    log(f"  {len(exclusiones)} estructuras artificiales (exclusiones.json) -> "
        f"{n_before - agua.sum():,} celdas removidas de agua")
    return agua, len(exclusiones)


def subtract_intermareal(agua, tile_id, grid, transform, log):
    """Zonas intermareales (se cubren y descubren con la marea) que el
    water-polygon de OSM incluye como agua porque OSM mapea la costa en
    linea de BAJAMAR (hallazgo 2026-07-29, sistematico en todo el tile --
    ver docs/handoff-fase2.md, "Hallazgo nuevo, sistematico: ZONAS
    INTERMAREALES"). Extraidas del .osm.pbf local con
    tools/raster-build/extraer_intermareal_pbf.py (wetland=tidalflat,
    tidal=yes, natural=mud, natural=shoal -- ways cerradas Y relaciones
    multipolygon), verificadas con analizar_impacto_intermareal.py
    (0.10% del agua navegable actual del tile, 0 puertos genuinamente
    aislados con el snap de 2000m ya existente) y con
    tools/raster-build/test_connectivity.py + una corrida real del router
    contra un .bin de prueba (no el de produccion) para Canal Tenglo, el
    paso mas angosto del corredor troncal con geometria conocida: ancho
    250m -> 150m tras la mascara, PERO conectado y con expansions/distancia
    de ruta casi identicas antes/despues en el A* real (test-tenglo.js) --
    no se cerro el corredor.

    Igual que subtract_exclusiones: se resta de la mascara de agua ANTES
    del EDT, asi que estas celdas salen confianza=0 (tierra), no solo
    penalizadas -- no es una preferencia de costo, es "esto no es agua
    navegable de verdad", igual criterio que Piedraplen/El Banquito.
    """
    path = f"{DATA_DIR}/{tile_id}_intermareal.json"
    if not os.path.exists(path):
        log(f"  AVISO: no se encontro {path}, se omite la resta de zonas intermareales")
        return agua, 0

    with open(path, encoding="utf-8") as f:
        extraccion = json.load(f)
    poligonos = extraccion.get("poligonos", [])
    if not poligonos:
        log("  0 poligonos intermareales -- nada que restar")
        return agua, 0

    from shapely.geometry import shape as shp_shape
    from shapely.ops import transform as shp_transform
    from pyproj import Transformer

    to_proj = Transformer.from_crs("EPSG:4326", grid["crs_proj4"], always_xy=True).transform

    proyectados = []
    for p in poligonos:
        geom = shp_shape(p["geometry"])
        proyectados.append(shp_transform(to_proj, geom))

    intermareal_mask = rasterio.features.rasterize(
        [(g, 1) for g in proyectados if g is not None and not g.is_empty],
        out_shape=agua.shape,
        transform=transform,
        fill=0,
        dtype=np.uint8,
    ).astype(bool)

    n_before = agua.sum()
    agua = agua & ~intermareal_mask
    log(f"  {len(poligonos)} poligonos intermareales ({extraccion.get('area_total_m2', 0)/1e6:,.1f} km2) -> "
        f"{n_before - agua.sum():,} celdas removidas de agua")
    return agua, len(poligonos)


def rasterize_zonas_dragadas(grid, transform, agua_shape, log):
    """Zonas de margen relajado (spec Sec 7.1). Tres tipos, todos con el
    mismo efecto (bit 15 / kml_bit, dMinM acotado a dMinM_max en
    banded_edt.py) pero geometria distinta:
      - area_portuaria: punto + buffer_m (puertos reales)
      - canal_conocido: linea + buffer_m (ej. Tenglo, 39 pts verificados)
      - canal_acceso_derivado: linea + buffer_m (generada por el propio
        router, derivar-zonas-canal.js) -- condicion de honestidad: estas
        celdas NUNCA deben promoverse a VERDE en Fase 3 aunque haya
        bafimetria cercana, solo se permite el paso por geometria. El
        formato actual no tiene bit para distinguir el tipo a nivel de
        celda (16 bits ya totalmente ocupados) asi que ese chequeo debe
        hacerse en la etapa de integracion bafimetrica de Fase 3
        consultando este mismo JSON, no en el raster."""
    zonas_path = ZONAS_DRAGADAS_PATH
    if not os.path.exists(zonas_path):
        log(f"  AVISO: no se encontro {zonas_path}, zona_relajada queda vacia")
        return None

    with open(zonas_path, encoding="utf-8") as f:
        zonas = json.load(f)
    if not zonas:
        return None

    from shapely.geometry import Point, LineString
    from shapely.ops import transform as shp_transform
    from pyproj import Transformer

    to_proj = Transformer.from_crs("EPSG:4326", grid["crs_proj4"], always_xy=True).transform

    buffered = []
    for z in zonas:
        geom_wgs84 = z["geometria_wgs84"]
        if z["tipo"] == "area_portuaria":
            geom = Point(*geom_wgs84)
        else:  # canal_conocido, canal_acceso_derivado: linea
            geom = LineString(geom_wgs84)
        proyectada = shp_transform(to_proj, geom)
        buffered.append(proyectada.buffer(z["buffer_m"]))

    zona_mask = rasterio.features.rasterize(
        [(g, 1) for g in buffered],
        out_shape=agua_shape,
        transform=transform,
        fill=0,
        dtype=np.uint8,
    ).astype(bool)

    por_tipo = {}
    for z in zonas:
        por_tipo[z["tipo"]] = por_tipo.get(z["tipo"], 0) + 1
    log(f"  {len(zonas)} zonas de margen relajado ({por_tipo}) rasterizadas -> {zona_mask.sum():,} celdas marcadas")
    return zona_mask


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", default="AUSTRAL_N")
    args = ap.parse_args()
    tile_id = args.tile
    tile_cfg = TILES[tile_id]

    os.makedirs(OUT_DIR, exist_ok=True)

    def log(msg):
        print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

    t0 = time.time()
    log(f"=== build_tile.py --tile {tile_id} ===")

    grid = compute_grid(tile_id)
    log(f"Grilla calculada: {grid['cols']} x {grid['rows']} = {grid['cells']:,} celdas "
        f"(origin_x={grid['origin_x']}, origin_y={grid['origin_y']}, res_m={grid['res_m']})")

    agua, transform = load_water_mask(tile_cfg, grid, log)
    agua, n_hazards = subtract_hazards(agua, tile_id, grid, transform, log)

    log("Restando estructuras artificiales (exclusiones.json)...")
    agua, n_exclusiones = subtract_exclusiones(agua, grid, transform, log)

    log("Restando zonas intermareales (bajamar OSM != navegable real)...")
    agua, n_intermareal = subtract_intermareal(agua, tile_id, grid, transform, log)

    log("Rasterizando zonas de margen relajado (zonas-dragadas.json)...")
    zona_relajada = rasterize_zonas_dragadas(grid, transform, agua.shape, log)
    n_zonas_dragadas = 0
    if os.path.exists(ZONAS_DRAGADAS_PATH):
        with open(ZONAS_DRAGADAS_PATH, encoding="utf-8") as f:
            n_zonas_dragadas = len(json.load(f))

    bin_path = f"{OUT_DIR}/{tile_id}.bin"
    log(f"Abriendo memmap de salida: {bin_path}")
    packed = np.memmap(bin_path, dtype=np.uint16, mode="w+", shape=(grid["rows"], grid["cols"]))

    log("Procesando EDT por bandas...")
    stats = process_tile_banded(agua, grid["res_m"], UNIT_M, packed, zona_relajada=zona_relajada, progress=log)
    del agua
    if zona_relajada is not None:
        del zona_relajada
    gc.collect()

    navegable = stats["navegable"]
    cobertura = {
        "verde": 0.0,
        "amarillo": 0.0,
        "rojo": (stats["rojo"] / navegable) if navegable else 0.0,
    }
    log(f"Cobertura batimetrica (Fase 1, esperado 100% rojo): {cobertura}")

    meta = {
        "tile_id": tile_id,
        "crs_proj4": grid["crs_proj4"],
        "origin_x": grid["origin_x"],
        "origin_y": grid["origin_y"],
        "res_m": grid["res_m"],
        "cols": grid["cols"],
        "rows": grid["rows"],
        "dtype": "uint16",
        "unit_m": UNIT_M,
        "packing": {"kml_bit": 15, "confianza_bits": [14, 13], "dist_bits": [12, 0]},
        "nodata": 0,
        "coarse_factor": 8,
        "cobertura_batimetrica": cobertura,
        "observaciones": [
            f"{n_hazards} peligros de seamarks obtenidos via Overpass para todo el bbox del tile. "
            "Es un numero bajo, pero no es un bug: OSM tiene muy poca cobertura de seamarks en "
            "Chile (pobreza de datos de la fuente, no del pipeline). No se debe interpretar como "
            "'zona sin peligros reales', solo como 'zona sin peligros mapeados en OSM'.",
            f"El bit 15 (kml_bit) se puebla con {n_zonas_dragadas} zonas de margen relajado "
            "(src/config/zonas-dragadas.json, spec Sec 7.1) -- buffers de 1-2km alrededor de "
            "puertos reales, NO con los 14 KML de canales (esos siguen sin digitalizar, "
            "decision Fase 2: no digitalizar por adelantado).",
            f"{n_exclusiones} estructuras artificiales (src/config/exclusiones.json, spec Sec 7.6) "
            "restadas de la mascara de agua antes del EDT -- terraplenes/causeways que el "
            "water-polygon de OSM no registra como tierra (caso Piedraplen, Calbuco, "
            "diagnostico 2026-07-28).",
            f"{n_intermareal} poligonos de zona intermareal (wetland=tidalflat/tidal=yes/natural=mud/"
            "natural=shoal, extraidos via tools/raster-build/extraer_intermareal_pbf.py de "
            f"{tile_id}_intermareal.json) restados de la mascara de agua antes del EDT -- OSM mapea "
            "la costa en linea de bajamar, asi que la franja intermareal quedaba como agua navegable "
            "(hallazgo sistematico, 2026-07-29). Verificado antes de aplicar: 0.10% del agua navegable "
            "del tile, 0 puertos aislados (snap 2000m), Canal Tenglo conectado con el A* real "
            "pre/post casi identico.",
        ],
        "build": {
            "fecha": time.strftime("%Y-%m-%d"),
            "fase": 2,
            "fuentes": {
                "osm_water": "osmdata.openstreetmap.de/download/water-polygons-split-4326.zip",
                "seamarks_overpass": f"{tile_id}_seamarks_peligro.json ({n_hazards} peligros, buffer {HAZARD_BUFFER_M}m)",
                "gmrt": None, "ibcso": None, "gebco": None,
                "kml": None,
                "zonas_dragadas": f"src/config/zonas-dragadas.json ({n_zonas_dragadas} zonas)",
                "exclusiones": f"src/config/exclusiones.json ({n_exclusiones} estructuras artificiales)",
                "intermareal": f"{tile_id}_intermareal.json ({n_intermareal} poligonos)",
            },
        },
    }
    meta_path = f"{OUT_DIR}/{tile_id}.meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    log(f"meta.json escrito: {meta_path}")

    log("Escribiendo grid grueso (coarse, max-pooling factor 8)...")
    coarse_shape = write_coarse_bin(packed, f"{OUT_DIR}/{tile_id}.coarse.bin")
    log(f"  coarse.bin: {coarse_shape}")
    gc.collect()  # unpack_cells materializa 3 arrays de ~145MB c/u; liberar antes del siguiente paso

    log("Escribiendo GeoTIFF de control...")
    control_shape = write_control_tif(
        packed, f"{OUT_DIR}/{tile_id}.control.tif",
        grid["origin_x"], grid["origin_y"], grid["res_m"], grid["crs_proj4"],
    )
    log(f"  control.tif: {control_shape}")

    packed.flush()
    del packed
    gc.collect()

    log(f"=== listo en {time.time() - t0:.1f}s ===")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
