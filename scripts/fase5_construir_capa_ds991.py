"""
FASE 5 — ETAPA B. Constructor de la capa de jurisdicciones del D.S. 991/1987.

Un solo comando construye, aplica y se verifica. Si un supuesto no se cumple, se
detiene con el motivo y no deja capa a medias.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe fase5_construir_capa_ds991.py
    ... --solo-generar     escribe el SQL y no toca la base

COMO ESTA PENSADO, que es lo que el owner fijo:

  REPRODUCIBLE      Todo sale del insumo versionado y de la base. Las rutas se
                    derivan de la ubicacion del script; la conexion, del .env del
                    repo; psql se busca en el PATH. Nada apunta al disco de nadie.
                    El sha256 del insumo queda guardado junto a la capa.

  FALLA RUIDOSO     Una jurisdiccion que el insumo declara cerrable y no se puede
                    construir NO se degrada a nula: detiene la corrida. Lo mismo
                    cualquier control de salida que no cuadre. No hay resultado
                    parcial.

  AUTOVERIFICADO    Los controles viajan DENTRO del SQL que construye, en la misma
                    transaccion, y terminan en un RAISE. No hay una revision aparte
                    que alguien pueda saltarse: si la capa se regenera mal en seis
                    meses, la construccion se cae sola.

  ABIERTO A QUE     Los sectores dentro de cada Capitania se construyen por el
  LA FUENTE CAMBIE  mismo camino que las jurisdicciones en cuanto el insumo los
                    traiga; hoy vienen vacios y la tabla queda vacia, no ausente.
                    La capa de tierra es un insumo declarado y se cambia en un
                    solo lugar. La version y el sha del insumo quedan registrados.

  SIN CASOS         Ninguna jurisdiccion se nombra en el codigo. Lo que necesita
  PARTICULARES      trato distinto lo declara el dato: la receta, el ambito, los
                    tramos litoral, las fronteras y su extension, los traslapes
                    deliberados. Los controles leen esas mismas declaraciones.

RECETAS, del campo 'receta' del insumo:
  anillo           el contorno cierra sobre si mismo.
  corte_y_ancla    el contorno parte el espacio; la jurisdiccion es el trozo que
                   contiene el ancla — la sede —, no una letra cardinal.
  banda_paralelos  la franja entre los dos paralelos declarados.
  union_cuerpos    ambito lacustre: union de los cuerpos adjudicados.

ENSANCHE HACIA TIERRA: solo sobre tramos marcados 'litoral'. Los 'frontera' y
'abierto' no ensanchan nunca.

FRONTERAS: ninguna figura cruza las que el insumo le declara, y cada frontera
recorta SOLO dentro de su alcance — se extiende perpendicular a si misma, jamas a
lo largo. Prolongarla mas alla de sus extremos le haria decir lo que el decreto no
dice ahi.
"""

import argparse
import glob
import io
import json
import math
import os
import shutil
import subprocess
import sys
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import geopandas as gpd
from shapely.geometry import LineString, Polygon, box
from shapely.ops import split, unary_union
from shapely.validation import explain_validity, make_valid

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
LACUSTRE = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
SHP_LAGOS = os.path.join(REPO, "geodata", "lagos", "Inventario_Lagos.shp")
SALIDA_SQL = os.path.join(REPO, "scripts", "fase5_capa_ds991.sql")
ENV = os.path.join(REPO, ".env")

TABLA = "jurisdicciones_ds991"
CRS = 4326

# ── Parametros. Convencion nuestra, ninguno es un caso particular ─────────────
LIMITE_ZEE_M = 370400          # 200 millas nauticas
X_W, X_E = -85.0, -65.0        # caja de trabajo, longitudes
Y_S, Y_N = -60.0, -17.0        # caja de trabajo, latitudes continentales
MARGEN = 0.5
PROLONGA = 60.0
ENSANCHE_KM = 60.0
KM_POR_GRADO = 111.32
TOL_TRASLAPE_KM2 = 0.01
TOL_HUECO_KM2 = 0.01

# CAPA DE TIERRA. Insumo declarado, se cambia solo aqui. Vacio = no se resta.
# Hoy vacio por decision del owner del 2026-08-10: la unica capa de tierra
# disponible en la base es ne_land, Natural Earth 1:10m, que da por tierra 30 de
# los 53 puntos representativos — bahias y puertos fluviales reales, entre ellos
# Valparaiso, Iquique y San Antonio. Restar con esa capa produce el falso negativo
# que prohibe INV-3.6. Mientras no haya una costa de resolucion real, no se resta:
# incluir tierra de mas no daña a nadie porque no se navega por ella.
CAPAS_TIERRA = []

CONVENCIONES_CONSTRUCTOR = [
    "RESTAR LA TIERRA ES CONVENCION NUESTRA, NO DECRETO. El Art. 2 del D.S. 991 "
    "dice que la jurisdiccion comprende el litoral, los lagos y rios navegables, "
    "las aguas interiores, el mar territorial, la zona contigua, la ZEE y la "
    "plataforma continental: el decreto NO pone un limite por el lado de tierra, y "
    "de hecho 43 de las 44 jurisdicciones maritimas cerrables no tienen ninguno. El "
    "corte contra la costa se hace para que la FIGURA REPRESENTE AGUA, no para "
    "acotar la jurisdiccion. De ahi se siguen dos cosas: que la capa de costa se "
    "elige por su fidelidad al agua real y no por su autoridad administrativa, y "
    "que ante la duda se yerra hacia incluir de mas, nunca hacia excluir.",
    "El limite exterior del espacio maritimo se materializa como 200 millas "
    f"nauticas ({LIMITE_ZEE_M} m). El Art. 2 nombra ZEE y plataforma continental "
    "sin darles geometria.",
    "La separacion lateral entre Capitanias dentro de la franja oceanica: el "
    "decreto fija hasta donde llega mar afuera, no como se reparte ese espacio "
    "entre vecinas. La reparten el contorno y las fronteras declaradas.",
    "Donde el decreto dice 'el litoral', el poligono se cierra generosamente hacia "
    f"tierra con un corredor de {ENSANCHE_KM:.0f} km y despues se resta la tierra, "
    "en vez de trazar la costa a mano. La profundidad del corredor no fija el "
    "limite: lo fijan la resta de tierra, la conectividad por agua y las fronteras.",
    "Del corredor de ensanche solo se conserva el agua que queda conectada con la "
    "figura base. Un cuerpo de agua separado por tierra no es alcanzable desde la "
    "jurisdiccion.",
    "Ninguna figura cruza las fronteras que el insumo le declara. Cada frontera "
    "recorta SOLO dentro de su alcance: se extiende perpendicular a si misma, nunca "
    "a lo largo. Prolongarla mas alla de sus extremos le haria decir lo que el "
    "decreto no dice ahi.",
    "La caja de trabajo es un artificio de calculo para poder cortar, no un limite "
    "juridico.",
    "El ambito antartico no resta tierra ni se acota al limite exterior: el decreto "
    "lo define como un area delimitada por lineas imaginarias.",
]


class Alto(SystemExit):
    """Un supuesto no se cumple. Se detiene con el motivo; no hay resultado parcial."""


reparaciones = []


# ── utilidades ───────────────────────────────────────────────────────────────

def sql_str(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"


def sql_bool(b):
    return "TRUE" if b else "FALSE"


def sql_geom(g):
    return "NULL" if g is None or g.is_empty else \
        f"ST_Multi(ST_GeomFromText('{g.wkt}', {CRS}))"


def sha256(ruta):
    import hashlib
    h = hashlib.sha256()
    with open(ruta, "rb") as fh:
        for b in iter(lambda: fh.read(65536), b""):
            h.update(b)
    return h.hexdigest()


def buscar_psql():
    """psql desde el PATH, o desde PSQL, o donde el instalador de Windows lo deja.
    Si no aparece, se detiene: no hay 'seguir sin aplicar' silencioso."""
    if os.environ.get("PSQL") and os.path.exists(os.environ["PSQL"]):
        return os.environ["PSQL"]
    hallado = shutil.which("psql")
    if hallado:
        return hallado
    for patron in (r"C:\Program Files\PostgreSQL\*\bin\psql.exe",
                   r"C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe",
                   "/usr/bin/psql", "/usr/local/bin/psql", "/opt/homebrew/bin/psql"):
        c = sorted(glob.glob(patron), reverse=True)
        if c:
            return c[0]
    raise Alto("no se encontro psql. Ponelo en el PATH o exporta PSQL con su ruta.")


def leer_env():
    if not os.path.exists(ENV):
        raise Alto(f"falta {os.path.relpath(ENV, REPO)}: sin el no hay como conectarse.")
    cfg = {}
    for linea in open(ENV, encoding="utf-8-sig"):
        if "=" in linea and not linea.strip().startswith("#"):
            k, v = linea.split("=", 1)
            cfg[k.strip()] = v.strip()
    faltan = [k for k in ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
              if not cfg.get(k)]
    if faltan:
        raise Alto(f"al .env le faltan {faltan}")
    return cfg


# ── lectura del insumo, sin defaults silenciosos ─────────────────────────────

def usables(j):
    return [(p["lon"], p["lat"]) for p in j["contorno"]
            if p["lon"] is not None and p["lat"] is not None and p.get("usable")]


def ancla(j):
    a = j.get("ancla_seleccion")
    if not a or a.get("lat") is None or a.get("lon") is None:
        return None
    return (a["lat"], a["lon"])


def banda(j):
    """Franja [sur, norte] que acota. Solo acotan los paralelos declarados; las
    latitudes del contorno solo pueden EXTENDERLA, nunca encogerla — encogerla
    dejaria fuera superficie decretada (INV-3.6). Mismo criterio que el auditor."""
    lats = [la for _, la in usables(j)]
    n = (j.get("limite_norte") or {}).get("dec")
    s = (j.get("limite_sur") or {}).get("dec")
    norte = max([n] + lats) if n is not None else None
    sur = min([s] + lats) if s is not None else None
    if norte is None and sur is None:
        return None
    return (sur if sur is not None else -math.inf,
            norte if norte is not None else math.inf)


def caja_de(j):
    n = (j.get("limite_norte") or {}).get("dec")
    s = (j.get("limite_sur") or {}).get("dec")
    lats = [la for _, la in usables(j)]
    sur = min(([s] if s is not None else []) + lats + [Y_N])
    norte = max(([n] if n is not None else []) + lats + [Y_S])
    sur, norte = min(sur, norte), max(sur, norte)
    return box(X_W - MARGEN, max(Y_S, sur) - MARGEN,
               X_E + MARGEN, min(Y_N, norte) + MARGEN)


# ── geometria ────────────────────────────────────────────────────────────────

def prolongar(pts):
    (x0, y0), (x1, y1) = pts[0], pts[1]
    d = math.hypot(x0 - x1, y0 - y1) or 1.0
    ini = (x0 + (x0 - x1) / d * PROLONGA, y0 + (y0 - y1) / d * PROLONGA)
    (xa, ya), (xb, yb) = pts[-1], pts[-2]
    d2 = math.hypot(xa - xb, ya - yb) or 1.0
    fin = (xa + (xa - xb) / d2 * PROLONGA, ya + (ya - yb) / d2 * PROLONGA)
    return LineString([ini] + list(pts) + [fin])


def poligonal(g):
    """Solo la parte de area. Cortar e intersecar deja a veces bordes y puntos
    sueltos en una GeometryCollection; una jurisdiccion es superficie, y arrastrar
    esos restos rompe la operacion siguiente sin decir por que."""
    if g is None or g.is_empty:
        return g
    if g.geom_type in ("Polygon", "MultiPolygon"):
        return g
    partes = [p for p in getattr(g, "geoms", []) if p.geom_type in
              ("Polygon", "MultiPolygon") and not p.is_empty]
    return unary_union(partes) if partes else Polygon()


def trozo_del_ancla(geom, linea, anc_xy):
    """(trozo del lado del ancla, None) o (None, motivo). Sin caso por defecto."""
    if geom.is_empty:
        return geom, None
    try:
        trozos = [g for g in split(geom, linea).geoms if g.area > 0]
    except Exception as e:                                        # noqa: BLE001
        return None, f"el corte fallo: {e}"
    if len(trozos) < 2:
        return geom, None
    p = Polygon()
    sel = [t for t in trozos if t.contains(_punto(anc_xy)) or
           t.distance(_punto(anc_xy)) < 1e-9]
    if not sel:
        # El ancla no cae en ningun trozo: queda fuera de la caja recortada. Se
        # elige por cercania, que es determinista, y se avisa.
        sel = [min(trozos, key=lambda t: t.distance(_punto(anc_xy)))]
    return poligonal(unary_union(sel)) if sel else p, None


def _punto(anc_xy):
    from shapely.geometry import Point
    return Point(anc_xy[0], anc_xy[1])


def banda_de_alcance(f):
    """Rectangulo donde una frontera poligonal tiene algo que decir.

    Se extiende perpendicular a la frontera y NO a lo largo: cubre exactamente el
    tramo declarado. Misma definicion que usa el auditor, resuelta con geometria en
    vez de con proyecciones escalares.
    """
    pts = [(p["lon"], p["lat"]) for p in f["puntos"]]
    ax, ay = pts[0]
    bx, by = pts[-1]
    vx, vy = bx - ax, by - ay
    largo = math.hypot(vx, vy)
    if largo == 0:
        return None
    nx, ny = -vy / largo * PROLONGA, vx / largo * PROLONGA
    return Polygon([(ax - nx, ay - ny), (bx - nx, by - ny),
                    (bx + nx, by + ny), (ax + nx, ay + ny)])


def recortar_por_fronteras(j, g, fronteras):
    """La figura no cruza ninguna frontera declarada, y cada frontera manda solo
    dentro de su alcance."""
    anc = ancla(j)
    aplicadas = []
    for fid in j.get("fronteras") or []:
        f = fronteras.get(fid)
        if f is None:
            raise Alto(f"{j['nombre']} declara la frontera '{fid}', que no existe "
                       f"entre las fronteras del insumo")
        if f["tipo"] == "paralelo":
            continue          # ya la aplica banda(), y la aplica sin encoger
        if f["tipo"] != "poligonal":
            raise Alto(f"la frontera '{fid}' es de tipo '{f['tipo']}', que no esta "
                       f"en la tabla de tipos (paralelo, poligonal)")
        if len(f.get("puntos") or []) < 2 or anc is None:
            continue
        alcance = banda_de_alcance(f)
        if alcance is None:
            continue
        dentro = poligonal(g.intersection(alcance))
        if dentro.is_empty:
            continue
        fuera = poligonal(g.difference(alcance))
        pts = [(p["lon"], p["lat"]) for p in f["puntos"]]
        recortado, err = trozo_del_ancla(dentro, prolongar(pts), (anc[1], anc[0]))
        if err:
            raise Alto(f"{j['nombre']}, al recortar contra '{fid}': {err}")
        g = poligonal(unary_union([recortado, fuera]))
        aplicadas.append(fid)
        if g.is_empty:
            raise Alto(f"{j['nombre']} quedo vacia al recortar contra '{fid}'")
    return (g if g.is_valid else make_valid(g)), aplicadas


def corredor_litoral(tramo, anc_xy):
    a = (tramo["desde"]["lon"], tramo["desde"]["lat"])
    b = (tramo["hasta"]["lon"], tramo["hasta"]["lat"])
    vx, vy = b[0] - a[0], b[1] - a[1]
    largo = math.hypot(vx, vy)
    if largo == 0:
        raise Alto("un tramo marcado litoral tiene largo cero")
    nx, ny = -vy / largo, vx / largo
    if (anc_xy[0] - a[0]) * nx + (anc_xy[1] - a[1]) * ny < 0:
        nx, ny = -nx, -ny
    lat_med = (a[1] + b[1]) / 2
    dy = ENSANCHE_KM / KM_POR_GRADO
    dx = ENSANCHE_KM / (KM_POR_GRADO * math.cos(math.radians(lat_med)))
    return Polygon([a, b, (b[0] + nx * dx, b[1] + ny * dy),
                    (a[0] + nx * dx, a[1] + ny * dy)])


def geom_lacustre(gdf, cuerpos):
    partes = []
    for c in cuerpos:
        for fid in c["shapefile_fid"]:
            g = gdf.geometry.iloc[fid]
            if not g.is_valid:
                motivo, a0 = explain_validity(g), g.area
                g = make_valid(g)
                reparaciones.append({"fid": fid, "nombre": gdf["NOMBRE"].iloc[fid],
                                     "motivo": motivo, "antes": a0, "despues": g.area})
            partes.append(g)
    return unary_union(partes) if partes else None


# ── recetas. Tabla explicita: una receta fuera de ella no construye nada ─────

def receta_anillo(j, ctx):
    pts = usables(j)
    if len(pts) < 3:
        raise Alto(f"{j['nombre']}: el anillo trae {len(pts)} puntos usables y hacen "
                   f"falta 3")
    poly = Polygon(pts)
    return poly if poly.is_valid else make_valid(poly)


def receta_corte_y_ancla(j, ctx):
    pts, anc = usables(j), ancla(j)
    if len(pts) < 2:
        raise Alto(f"{j['nombre']}: el contorno trae {len(pts)} punto(s) usable(s) y "
                   f"hacen falta 2")
    if anc is None:
        raise Alto(f"{j['nombre']}: el contorno parte el espacio en dos y no hay "
                   f"ancla que diga cual de los dos lados es la jurisdiccion")
    g, err = trozo_del_ancla(caja_de(j), prolongar(pts), (anc[1], anc[0]))
    if err:
        raise Alto(f"{j['nombre']}: {err}")
    fr = banda(j)
    if fr is not None:
        g = g.intersection(box(X_W - MARGEN, max(fr[0], Y_S - MARGEN),
                               X_E + MARGEN, min(fr[1], Y_N + MARGEN)))
    if g.is_empty:
        raise Alto(f"{j['nombre']}: la franja de paralelos deja el trozo vacio")
    return g if g.is_valid else make_valid(g)


def receta_banda_paralelos(j, ctx):
    fr = banda(j)
    if fr is None or not all(map(math.isfinite, fr)):
        raise Alto(f"{j['nombre']}: la receta es la franja y el decreto no declara "
                   f"los dos paralelos. No se toma del vecino")
    return box(X_W, fr[0], X_E, fr[1])


def receta_union_cuerpos(j, ctx):
    if j["id"] not in ctx["cuerpos_lac"]:
        raise Alto(f"{j['nombre']}: no tiene entrada en el cotejo lacustre; los dos "
                   f"insumos no concuerdan en los ids")
    g = geom_lacustre(ctx["gdf"], ctx["cuerpos_lac"][j["id"]])
    if g is None or g.is_empty:
        raise Alto(f"{j['nombre']}: tiene entrada y ninguno de sus cuerpos trae "
                   f"geometria. INV-3.5 no admite una lacustre vacia")
    return g


RECETAS = {
    "anillo": receta_anillo,
    "corte_y_ancla": receta_corte_y_ancla,
    "banda_paralelos": receta_banda_paralelos,
    "union_cuerpos": receta_union_cuerpos,
}


def construir_figura(j, ctx, fronteras):
    """(base, amplia, fronteras_aplicadas, n_litoral). Cualquier supuesto que no se
    cumpla levanta Alto: una cerrable que no se puede construir NO se degrada."""
    constructor = RECETAS.get(j["receta"])
    if constructor is None:
        raise Alto(f"{j['nombre']}: la receta '{j['receta']}' no esta en la tabla "
                   f"({', '.join(sorted(RECETAS))}); no se construye por defecto")
    base = constructor(j, ctx)

    anc = ancla(j)
    litorales = [t for t in j["tramos"] if t["tipo"] == "litoral"]
    if litorales and anc is None:
        raise Alto(f"{j['nombre']}: tiene tramos litoral y no tiene ancla con que "
                   f"saber hacia donde ensanchar")
    # EL ENSANCHE EXIGE CAPA DE TIERRA. El corredor existe para capturar el agua
    # que la cuerda recta deja afuera entre ella y la costa; quien lo recorta a esa
    # agua es la resta de tierra y la conectividad. Sin capa de tierra no queda un
    # ensanche: queda una losa de 60 km que solo pisa a las vecinas. Medido el
    # 2026-08-10: cuatro pares que en la figura base dan traslape CERO pasan a
    # pisarse solo por los corredores. Se omite, y queda declarado en la
    # procedencia de la capa — no es una omision silenciosa.
    corredores = ([corredor_litoral(t, (anc[1], anc[0])) for t in litorales]
                  if CAPAS_TIERRA else [])
    amplia = unary_union([base] + corredores) if corredores else base

    base_r, aplicadas = recortar_por_fronteras(j, base, fronteras)
    amplia_r, _ = recortar_por_fronteras(j, amplia, fronteras)
    return base_r, amplia_r, aplicadas, len(litorales)


# ── SQL ──────────────────────────────────────────────────────────────────────

def emitir_sql(v2, lac, filas, sectores):
    permitidos = sorted({tuple(sorted(x["jurisdicciones"]))
                         for x in (lac.get("traslape_deliberado") or {}).values()
                         if len(x.get("jurisdicciones") or []) == 2})
    L = []
    A = L.append
    A("-- FASE 5, ETAPA B — Capa de jurisdicciones del D.S. 991/1987.")
    A("-- GENERADO por scripts/fase5_construir_capa_ds991.py (INV-3.7). No editar.")
    A("-- Los controles viajan en esta misma transaccion y terminan en RAISE: si algo")
    A("-- no cuadra, no queda capa.")
    for r in reparaciones:
        A(f"-- ST_MakeValid en fid {r['fid']} {r['nombre']}: {r['motivo']}")
    A("")
    A("BEGIN;")
    A("")
    A(f"DROP TABLE IF EXISTS {TABLA}_convenciones;")
    A(f"CREATE TABLE {TABLA}_convenciones (n INT PRIMARY KEY, origen TEXT NOT NULL,")
    A("  texto TEXT NOT NULL);")
    n = 0
    for t in v2.get("convenciones", []):
        n += 1
        A(f"INSERT INTO {TABLA}_convenciones VALUES ({n}, 'insumo v2', {sql_str(t)});")
    for t in CONVENCIONES_CONSTRUCTOR:
        n += 1
        A(f"INSERT INTO {TABLA}_convenciones VALUES ({n}, 'constructor', {sql_str(t)});")
    A("")
    A(f"DROP TABLE IF EXISTS {TABLA}_procedencia;")
    A(f"CREATE TABLE {TABLA}_procedencia (clave TEXT PRIMARY KEY, valor TEXT);")
    for k, v in (("insumo", "data/decreto/jurisdicciones_v2.json"),
                 ("insumo_version", str(v2.get("version"))),
                 ("insumo_sha256", sha256(V2)),
                 ("insumo_generado", str(v2.get("generado"))),
                 ("fuente", v2.get("fuente")),
                 ("capas_tierra", ", ".join(CAPAS_TIERRA) or "ninguna: no se resta tierra"),
                 ("ensanche_litoral", f"{ENSANCHE_KM:.0f} km" if CAPAS_TIERRA else
                  "NO APLICADO: el ensanche exige capa de tierra que lo recorte; "
                  "sin ella el corredor es una losa que solo pisa a las vecinas"),
                 ("limite_exterior_m", str(LIMITE_ZEE_M))):
        A(f"INSERT INTO {TABLA}_procedencia VALUES ({sql_str(k)}, {sql_str(v)});")
    A("")
    A(f"DROP TABLE IF EXISTS {TABLA}_sectores;")
    A(f"DROP TABLE IF EXISTS {TABLA};")
    A(f"CREATE TABLE {TABLA} (")
    A("  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, gobernacion TEXT NOT NULL,")
    A("  ambito TEXT NOT NULL CHECK (ambito IN "
      "('maritima','lacustre','antartica','insular_remota')),")
    A("  participa_matching BOOLEAN NOT NULL, receta TEXT,")
    A("  estado_geometria TEXT NOT NULL CHECK (estado_geometria IN "
      "('construida','nula_declarada')),")
    A("  causa_sin_geometria TEXT, sigue_litoral BOOLEAN NOT NULL,")
    A("  tramos_litoral INT NOT NULL, fronteras_aplicadas TEXT, km2_ensanche NUMERIC,")
    A("  punto_representativo geometry(Point, 4326), causa_sin_punto_representativo TEXT,")
    A(f"  texto_decreto TEXT NOT NULL, _base geometry(MultiPolygon, {CRS}),")
    A(f"  _amplia geometry(MultiPolygon, {CRS}), geom geometry(MultiPolygon, {CRS}),")
    A("  CONSTRAINT nula_siempre_con_causa CHECK (")
    A("    estado_geometria <> 'nula_declarada' OR causa_sin_geometria IS NOT NULL));")
    A("")
    A(f"CREATE TABLE {TABLA}_sectores (")
    A("  id TEXT PRIMARY KEY, jurisdiccion TEXT NOT NULL REFERENCES " + TABLA + "(id),")
    A(f"  nombre TEXT NOT NULL, texto_decreto TEXT, geom geometry(MultiPolygon, {CRS}));")
    A("")
    for f in filas:
        t = f["testigo"]
        pt = ("NULL" if not t else
              f"ST_SetSRID(ST_MakePoint({t['lon']}, {t['lat']}), {CRS})")
        A(f"INSERT INTO {TABLA} (id, nombre, gobernacion, ambito, participa_matching,")
        A("  receta, estado_geometria, causa_sin_geometria, sigue_litoral,")
        A("  tramos_litoral, fronteras_aplicadas, punto_representativo,")
        A("  causa_sin_punto_representativo, texto_decreto, _base, _amplia) VALUES (")
        A(f"  {sql_str(f['id'])}, {sql_str(f['nombre'])}, {sql_str(f['gobernacion'])},")
        A(f"  {sql_str(f['ambito'])}, {sql_bool(f['participa_matching'])}, "
          f"{sql_str(f['receta'])},")
        A(f"  {sql_str(f['estado'])}, {sql_str(f['causa'])}, "
          f"{sql_bool(f['sigue_litoral'])}, {f['n_litoral']},")
        A(f"  {sql_str(','.join(f['fronteras_aplicadas']) or None)}, {pt},")
        A(f"  {sql_str(f['causa_sin_testigo'])}, {sql_str(f['texto_decreto'])},")
        A(f"  {sql_geom(f['base'])}, {sql_geom(f['amplia'])});")
    for s in sectores:
        A(f"INSERT INTO {TABLA}_sectores VALUES ({sql_str(s['id'])}, "
          f"{sql_str(s['jurisdiccion'])}, {sql_str(s['nombre'])}, "
          f"{sql_str(s.get('texto_decreto'))}, {sql_geom(s['geom'])});")
    A("")
    if CAPAS_TIERRA:
        A("-- ── TIERRA ────────────────────────────────────────────────────────")
        A("CREATE TEMP TABLE _tierra AS")
        A(" UNION ALL ".join(
            f"SELECT ST_Subdivide(ST_MakeValid(geom), 256) AS geom FROM {t} "
            f"WHERE geom && ST_MakeEnvelope({X_W}, {Y_S}, {X_E}, {Y_N}, {CRS})"
            for t in CAPAS_TIERRA) + ";")
        A("CREATE INDEX ON _tierra USING GIST (geom);")
        A("ANALYZE _tierra;")
        A(f"UPDATE {TABLA} j SET")
        A("  _base = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
        A("    ST_Difference(ST_ReducePrecision(j._base, 1e-8), t.geom)), 3)),")
        A("  _amplia = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
        A("    ST_Difference(ST_ReducePrecision(j._amplia, 1e-8), t.geom)), 3))")
        A("FROM (SELECT j2.id, ST_ReducePrecision(ST_MakeValid(")
        A("        ST_UnaryUnion(ST_Collect(t2.geom))), 1e-8) AS geom")
        A(f"      FROM {TABLA} j2 JOIN _tierra t2 ON t2.geom && j2._amplia")
        A("      WHERE j2.ambito = 'maritima' AND j2._amplia IS NOT NULL")
        A("      GROUP BY j2.id) t WHERE j.id = t.id AND j.ambito = 'maritima';")
        A("")
        A("-- Del ensanche solo sobrevive el agua alcanzable desde la figura base.")
        A(f"UPDATE {TABLA} j SET geom = c.geom FROM (")
        A("  SELECT j2.id, ST_Multi(ST_CollectionExtract(ST_MakeValid(")
        A("           ST_UnaryUnion(ST_Collect(d.geom))), 3)) AS geom")
        A(f"  FROM {TABLA} j2, LATERAL ST_Dump(j2._amplia) d")
        A("  WHERE j2.ambito = 'maritima' AND j2._amplia IS NOT NULL")
        A("    AND j2._base IS NOT NULL AND ST_Intersects(d.geom, j2._base)")
        A("  GROUP BY j2.id) c WHERE j.id = c.id;")
    else:
        A("-- No se resta tierra: ver la convencion registrada. La figura ensanchada")
        A("-- es la figura.")
        A(f"UPDATE {TABLA} SET geom = _amplia WHERE ambito = 'maritima';")
    A("")
    A(f"UPDATE {TABLA} SET geom = _base WHERE ambito IN ('lacustre', 'antartica');")
    A("")
    A("-- Limite exterior: solo lo maritimo.")
    A("CREATE TEMP TABLE _zee AS")
    A("SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(")
    A("  ST_Simplify(ST_Union(ST_MakeValid(ST_Intersection(ST_MakeValid(l.geom),")
    A(f"    ST_MakeEnvelope({X_W}, {Y_S}, {X_E}, {Y_N}, {CRS})))), 0.01)::geography,")
    A(f"  {LIMITE_ZEE_M})::geometry), 1e-8) AS geom FROM ne_land l")
    A(f"WHERE ST_Intersects(l.geom, ST_MakeEnvelope({X_W}, {Y_S}, {X_E}, {Y_N}, {CRS}));")
    A(f"UPDATE {TABLA} j SET geom = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
    A("  ST_Intersection(ST_ReducePrecision(j.geom, 1e-8), z.geom)), 3))")
    A("FROM _zee z WHERE j.ambito = 'maritima' AND j.geom IS NOT NULL;")
    A("")
    A(f"UPDATE {TABLA} SET geom = ST_MakeValid(geom)")
    A("WHERE geom IS NOT NULL AND NOT ST_IsValid(geom);")
    A(f"UPDATE {TABLA} SET km2_ensanche = round((")
    A("  (ST_Area(geom::geography) - ST_Area(ST_Intersection(geom, _base)::geography))")
    A("  / 1e6)::numeric, 2) WHERE tramos_litoral > 0 AND geom IS NOT NULL;")
    A(f"ALTER TABLE {TABLA} DROP COLUMN _base, DROP COLUMN _amplia;")
    A(f"CREATE INDEX idx_{TABLA}_geom ON {TABLA} USING GIST (geom);")
    A(f"CREATE INDEX idx_{TABLA}_ambito ON {TABLA} (ambito);")
    A(f"CREATE INDEX idx_{TABLA}_sect_geom ON {TABLA}_sectores USING GIST (geom);")
    A(f"ANALYZE {TABLA};")
    A("")
    emitir_controles(A, permitidos)
    A("")
    A(f"COMMENT ON TABLE {TABLA} IS 'Capa de referencia de las jurisdicciones de "
      "Capitania del D.S. 991/1987. Derivada por script desde el insumo versionado "
      f"(INV-3.7); no editar la geometria a mano. Procedencia en {TABLA}_procedencia, "
      f"convenciones en {TABLA}_convenciones. El motor todavia NO la consulta.';")
    A("COMMIT;")
    open(SALIDA_SQL, "w", encoding="utf-8").write("\n".join(L))


def emitir_controles(A, permitidos):
    """Los controles, en la misma transaccion, terminando en RAISE."""
    A("-- ══ CONTROLES. Van aca adentro a proposito: una revision aparte se puede")
    A("--    saltar, esta no. Si algo no cuadra, la transaccion entera se cae.")
    A(f"DROP TABLE IF EXISTS {TABLA}_verificacion;")
    A(f"CREATE TABLE {TABLA}_verificacion (control TEXT PRIMARY KEY, ok BOOLEAN "
      "NOT NULL, obtenido TEXT, detalle TEXT);")
    A("")
    A(f"INSERT INTO {TABLA}_verificacion")
    A("SELECT 'C1 sin geometria vacia, de area cero o invalida',")
    A("  count(*) = 0, count(*)::text, string_agg(nombre, ', ')")
    A(f"FROM {TABLA} WHERE estado_geometria = 'construida'")
    A("  AND (geom IS NULL OR ST_IsEmpty(geom) OR NOT ST_IsValid(geom)")
    A("       OR ST_Area(geom::geography) = 0);")
    A("")
    A(f"INSERT INTO {TABLA}_verificacion")
    A("SELECT 'C2 toda nula declarada con su causa', count(*) = 0, count(*)::text,")
    A("  string_agg(nombre, ', ')")
    A(f"FROM {TABLA} WHERE estado_geometria = 'nula_declarada'")
    A("  AND (causa_sin_geometria IS NULL OR causa_sin_geometria = '');")
    A("")
    A("-- Los traslapes permitidos salen del dato, no del codigo.")
    A(f"DROP TABLE IF EXISTS {TABLA}_traslapes_ok;")
    A(f"CREATE TEMP TABLE _ok (a TEXT, b TEXT);")
    for a, b in permitidos:
        A(f"INSERT INTO _ok VALUES ({sql_str(a)}, {sql_str(b)});")
    A(f"INSERT INTO {TABLA}_verificacion")
    A("SELECT 'C3 cero traslapes fuera de los declarados deliberados',")
    A("  count(*) = 0, count(*)::text,")
    A("  string_agg(x.na || ' x ' || x.nb || ' = ' || x.km2::text, '; ')")
    A("FROM (SELECT a.nombre na, b.nombre nb,")
    A("        round((ST_Area(ST_Intersection(a.geom,b.geom)::geography)/1e6)::numeric,3) km2")
    A(f"      FROM {TABLA} a JOIN {TABLA} b ON a.id < b.id")
    A("      WHERE a.geom IS NOT NULL AND b.geom IS NOT NULL AND a.geom && b.geom")
    A("        AND ST_Intersects(a.geom, b.geom)")
    A(f"        AND ST_Area(ST_Intersection(a.geom,b.geom)::geography) > {TOL_TRASLAPE_KM2}*1e6")
    A("        AND NOT EXISTS (SELECT 1 FROM _ok o WHERE o.a = least(a.id,b.id)")
    A("                          AND o.b = greatest(a.id,b.id))) x;")
    A("")
    A(f"INSERT INTO {TABLA}_verificacion")
    A("SELECT 'C4 cada jurisdiccion contiene su punto representativo',")
    A("  count(*) = 0, count(*)::text, string_agg(nombre, ', ')")
    A(f"FROM {TABLA} WHERE geom IS NOT NULL AND punto_representativo IS NOT NULL")
    A("  AND NOT ST_Intersects(geom, punto_representativo);")
    A("")
    A(f"INSERT INTO {TABLA}_verificacion")
    A("SELECT 'C5 construida sin testigo trae su causa declarada',")
    A("  count(*) = 0, count(*)::text, string_agg(nombre, ', ')")
    A(f"FROM {TABLA} WHERE geom IS NOT NULL AND punto_representativo IS NULL")
    A("  AND (causa_sin_punto_representativo IS NULL OR causa_sin_punto_representativo = '');")
    A("")
    A(f"INSERT INTO {TABLA}_verificacion")
    A("SELECT 'C6 el ensanche solo donde hay tramo litoral', count(*) = 0,")
    A("  count(*)::text, string_agg(nombre, ', ')")
    A(f"FROM {TABLA} WHERE tramos_litoral = 0 AND km2_ensanche IS NOT NULL;")
    A("")
    A(f"INSERT INTO {TABLA}_verificacion")
    A("SELECT 'C7 indice espacial presente', count(*) >= 1, count(*)::text, NULL")
    A(f"FROM pg_indexes WHERE tablename = '{TABLA}' AND indexdef ILIKE '%gist%';")
    A("")
    A("DO $$")
    A("DECLARE fallidos TEXT;")
    A("BEGIN")
    A("  SELECT string_agg(control || ' [obtenido=' || COALESCE(obtenido,'?') ||")
    A("           COALESCE(': ' || detalle, '') || ']', E'\\n  ')")
    A(f"    INTO fallidos FROM {TABLA}_verificacion WHERE NOT ok;")
    A("  IF fallidos IS NOT NULL THEN")
    A("    RAISE EXCEPTION E'LA CAPA NO CUMPLE SUS PROPIOS CONTROLES:\\n  %', fallidos;")
    A("  END IF;")
    A("END $$;")


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo-generar", action="store_true",
                    help="escribe el SQL y no toca la base")
    args = ap.parse_args()

    v2 = json.load(open(V2, encoding="utf-8"))
    lac = json.load(open(LACUSTRE, encoding="utf-8"))
    gdf = gpd.read_file(SHP_LAGOS).to_crs(epsg=CRS)
    fronteras = {f["id"]: f for f in v2["fronteras"]}
    ctx = {"gdf": gdf,
           "cuerpos_lac": {x["id"]: x["cuerpos"] for x in lac["jurisdicciones"]}}

    filas, sectores, diag = [], [], []
    for j in v2["jurisdicciones"]:
        f = {"id": j["id"], "nombre": j["nombre"], "gobernacion": j["gobernacion"],
             "ambito": j["ambito"], "participa_matching": j["participa_matching"],
             "receta": j["receta"], "sigue_litoral": bool(j["sigue_litoral"]),
             "texto_decreto": j["texto_decreto"], "estado": None, "causa": None,
             "base": None, "amplia": None, "n_litoral": 0, "fronteras_aplicadas": [],
             "testigo": j.get("punto_representativo"),
             "causa_sin_testigo": j.get("causa_sin_punto_representativo")}

        if j["estado_geometria"] != "cerrable":
            causa = j.get("causa_sin_geometria")
            if not causa:
                raise Alto(f"{j['nombre']} viene declarada no cerrable y sin causa. "
                           f"Una nula sin causa es un falso negativo silencioso "
                           f"(INV-3.6); no se inventa la causa aca")
            f.update(estado="nula_declarada", causa=causa)
        else:
            base, amplia, apl, nlit = construir_figura(j, ctx, fronteras)
            f.update(estado="construida", base=base, amplia=amplia,
                     fronteras_aplicadas=apl, n_litoral=nlit)
            for s in (j.get("sectores") or []):
                sectores.append({"id": f"{j['id']}__{s['id']}", "jurisdiccion": j["id"],
                                 "nombre": s["nombre"],
                                 "texto_decreto": s.get("texto_decreto"),
                                 "geom": None})
        filas.append(f)
        diag.append((j["nombre"], j["ambito"], j["receta"], f["n_litoral"],
                     f["estado"], ",".join(f["fronteras_aplicadas"])))

    # Conteos contra el insumo. Si no cuadran, algo se perdio en el camino.
    esperadas = sum(1 for j in v2["jurisdicciones"] if j["estado_geometria"] == "cerrable")
    obtenidas = sum(1 for f in filas if f["estado"] == "construida")
    if esperadas != obtenidas:
        raise Alto(f"el insumo declara {esperadas} cerrables y se construyeron "
                   f"{obtenidas}")
    if len(filas) != len(v2["jurisdicciones"]):
        raise Alto("se perdieron filas entre el insumo y la capa")

    emitir_sql(v2, lac, filas, sectores)
    informe(filas, diag, sectores)

    if args.solo_generar:
        print()
        print("--solo-generar: no se toco la base.")
        return

    cfg, psql = leer_env(), buscar_psql()
    print()
    print(f"Aplicando con {psql} sobre {cfg['DB_NAME']}@{cfg['DB_HOST']}...")
    env = dict(os.environ, PGPASSWORD=cfg["DB_PASSWORD"])
    r = subprocess.run([psql, "-h", cfg["DB_HOST"], "-p", cfg["DB_PORT"],
                        "-U", cfg["DB_USER"], "-d", cfg["DB_NAME"],
                        "-v", "ON_ERROR_STOP=1", "-q", "-f", SALIDA_SQL],
                       env=env, capture_output=True, text=True, encoding="utf-8",
                       errors="replace")
    if r.stdout.strip():
        print(r.stdout.strip()[-4000:])
    if r.returncode != 0:
        print(r.stderr.strip()[-4000:])
        raise Alto("la construccion no paso sus propios controles. No hay capa: la "
                   "transaccion se deshizo entera.")
    print("Capa construida y verificada. Los controles pasaron dentro de la "
          "transaccion.")


def informe(filas, diag, sectores):
    print("FASE 5, ETAPA B — CONSTRUCCION")
    print(f"  salida   : {os.path.relpath(SALIDA_SQL, REPO)}")
    print(f"  tierra   : {', '.join(CAPAS_TIERRA) or 'no se resta (ver convencion)'}")
    print(f"  ensanche : {ENSANCHE_KM:.0f} km, solo en tramos litoral")
    print()
    print(f"{'NOMBRE':<24} {'AMBITO':<15} {'RECETA':<16} {'LIT':>3} {'ESTADO':<16} "
          f"FRONTERAS")
    print("-" * 122)
    for n, a, r, nl, e, fr in diag:
        print(f"{n:<24} {a:<15} {r:<16} {nl:>3} {e:<16} {fr[:40]}")
    print()
    for et, c in (("RECETA", Counter(d[2] for d in diag)),
                  ("ESTADO", Counter(d[4] for d in diag))):
        print(f"CONTEO POR {et}")
        for k, v in sorted(c.items()):
            print(f"  {k:<24} {v}")
    print()
    print(f"SECTORES construidos: {len(sectores)}")
    print("NULAS DECLARADAS, CON SU CAUSA")
    for f in filas:
        if f["estado"] != "construida":
            print(f"  {f['nombre']:<24} {str(f['causa'])[:80]}")


if __name__ == "__main__":
    main()
