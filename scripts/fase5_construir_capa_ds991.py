"""
FASE 5 — ETAPA B. Constructor de la capa de jurisdicciones del D.S. 991/1987.

Un solo comando construye, aplica y se verifica. Si un supuesto no se cumple, se
detiene con el motivo y no deja capa a medias.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe fase5_construir_capa_ds991.py
    ... --solo-generar     escribe el SQL y no toca la base
    ... --ensayo           corre todo contra la base y al final deshace

CODIGOS DE SALIDA
  0  todos los ambitos habilitados pasaron sus controles y quedaron publicados
  3  PUBLICACION PARCIAL: entro lo que paso, y algun ambito habilitado no paso
     sus controles y quedo fuera con su causa escrita
  1  no quedo capa — ningun ambito paso, o se cayo un supuesto antes

COMO ESTA PENSADO, que es lo que el owner fijo:

  REPRODUCIBLE      Todo sale del insumo versionado y de la base. Las rutas se
                    derivan de la ubicacion del script; la conexion, del .env del
                    repo; psql se busca en el PATH. Nada apunta al disco de nadie.
                    El sha256 del insumo queda guardado junto a la capa.

  FALLA RUIDOSO     Una jurisdiccion que el insumo declara cerrable y no se puede
                    construir NO se degrada a nula: detiene la corrida. Lo mismo
                    cualquier control de salida que no cuadre.

  AUTOVERIFICADO    Los controles viajan DENTRO del SQL que construye, en la misma
                    transaccion. No hay una revision aparte que alguien pueda
                    saltarse: si la capa se regenera mal en seis meses, la
                    construccion se cae sola.

  EL GATE ES POR    D3, 2026-08-10: "que un lago no se construya porque dos
  AMBITO            Capitanias maritimas se pisan en Magallanes no tiene
                    fundamento". Cada control se mide POR AMBITO y cada ambito
                    entra por su cuenta: habilitado en el registro, sin controles
                    suyos en falla, y con al menos una geometria. El que no entra
                    se retira de la capa con su causa escrita en _publicacion.
                    Dentro de cada ambito sigue siendo todo o nada — nada se
                    promueve a medias —, y si no entra ninguno la transaccion se
                    deshace entera, como antes. Ningun control se afloja: lo unico
                    que cambia es a quien se lleva puesto el que falla.

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
MANIFIESTO = os.path.join(REPO, "geodata", "costa", "capas_costa.json")
LACUSTRE = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
AMBITOS = os.path.join(REPO, "data", "decreto", "ambitos_publicados.json")
SHP_LAGOS = os.path.join(REPO, "geodata", "lagos", "Inventario_Lagos.shp")
SALIDA_SQL = os.path.join(REPO, "scripts", "fase5_capa_ds991.sql")
ENV = os.path.join(REPO, ".env")

TABLA = "jurisdicciones_ds991"
CRS = 4326

# Etiqueta del alcance que NO es un ambito: los controles estructurales — los que
# hablan de la capa entera, no de un ambito — y los pares de traslape cuyos dos
# lados son de ambitos distintos. Vive aca y no escrita dentro del SQL para que
# el gate y los controles no puedan discrepar en como se llama.
AMBITO_CAPA = "(capa)"

# Marca de la linea con la que el gate informa que publico y que retuvo. La emite
# el SQL y la vuelve a leer este mismo script para decidir con que codigo termina.
# Es una sola linea, de formato fijo, y sale como NOTICE porque es lo unico que
# sobrevive cuando la transaccion se deshace.
MARCA_PUBLICACION = "PUBLICACION ::"

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

# CAPAS DE TIERRA Y DE LIMITE EXTERIOR. NO se declaran aca: las declara
# geodata/costa/capas_costa.json, en sus roles, y capas_declaradas() las trae de ahi
# al arrancar. Este modulo no nombra ninguna capa.
#
# Hasta el 2026-08-10 esto era una lista vacia con un comentario que explicaba por
# que no se restaba tierra: la unica capa disponible era ne_land, 1:10m, que da por
# tierra bahias y puertos reales — el falso negativo que prohibe INV-3.6. Esa
# situacion se termino: la capa OSM esta cargada, medida y verificada, y el
# manifiesto la declara primaria. Lo que cambio de fondo es que la eleccion dejo de
# vivir en el codigo. Cambiar de costa el dia que llegue una linea oficial es
# cambiar roles.tierra en el manifiesto y volver a correr.
CAPAS_TIERRA = []          # lo llena capas_declaradas()
CAPA_LIMITE_EXTERIOR = None
COSTA_DECLARADA = {}       # huella de la capa de tierra, para el control C0

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
    "PARALELO COMPARTIDO. Cuando dos vecinas declaran el MISMO paralelo como su "
    "limite comun, ese paralelo las separa EN TODA SU EXTENSION, no solo cerca de la "
    "costa: nada en el decreto lo acota. Antes no recortaba, y la franja se armaba "
    "solo con banda(), que deja que las latitudes citadas del contorno la EXTIENDAN. "
    "Eso hacia que dos vecinas se pisaran mar afuera — Castro y Chonchi, 882 km2 en "
    "una tira de 2,8 km de alto por 350 km de largo — porque las dos citan "
    "coordenadas que cruzan su propio paralelo compartido. El fundamento de la "
    "correccion: esas coordenadas describen el TRAZO LOCAL del limite, no la franja "
    "oceanica. Por eso el paralelo recorta en todos lados MENOS dentro del alcance "
    "de las fronteras poligonales que declara la misma pareja: ahi, y solo ahi, el "
    "decreto dibuja el limite fino y ese dibujo manda. Decidido por la owner el "
    "2026-08-10.",
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


def capas_declaradas():
    """Trae del manifiesto las capas de los roles 'tierra' y 'limite_exterior'. Este
    modulo no nombra capas: si el manifiesto declara otra costa, la construccion la
    usa sin tocar una linea de codigo.

    Comprueba ademas que el RECORTE con que la capa se cargo cubra la caja de trabajo
    de la construccion. Si la caja creciera y el recorte no, se restaria tierra
    contra una capa que no llega hasta ahi: quedaria tierra adentro de una figura
    marina sin que nada avise, que es el falso negativo de INV-3.6."""
    global CAPAS_TIERRA, CAPA_LIMITE_EXTERIOR, COSTA_DECLARADA
    if not os.path.exists(MANIFIESTO):
        raise Alto(f"falta {os.path.relpath(MANIFIESTO, REPO)}: es donde se declara "
                   f"que capa de tierra usa la construccion. Sin el no se resta nada "
                   f"por defecto, se para.")
    man = json.load(open(MANIFIESTO, encoding="utf-8"))
    porid = {c["id"]: c for c in man["capas"]}
    elegidas = {}
    for nombre in ("tierra", "limite_exterior"):
        r = (man.get("roles") or {}).get(nombre) or {}
        if r.get("capa") not in porid:
            raise Alto(f"el manifiesto no declara una capa valida en "
                       f"roles.{nombre}")
        c = porid[r["capa"]]
        t = c.get("tabla_subdividida") or c.get("tabla")
        if not t or not str(t).replace("_", "").isalnum():
            raise Alto(f"la capa '{c['id']}' del rol {nombre} no declara una tabla "
                       f"usable")
        elegidas[nombre] = (c, t)

    rec = man["recorte"]
    if not (rec["x_w"] <= X_W and rec["x_e"] >= X_E
            and rec["y_s"] <= Y_S and rec["y_n"] >= Y_N):
        raise Alto(f"el recorte con que se cargo la costa no cubre la caja de "
                   f"trabajo de la construccion.\n  recorte  x {rec['x_w']}.."
                   f"{rec['x_e']}  y {rec['y_s']}..{rec['y_n']}\n  caja     x {X_W}.."
                   f"{X_E}  y {Y_S}..{Y_N}\n  Restar tierra contra una capa que no "
                   f"llega deja tierra adentro de la figura sin aviso (INV-3.6). "
                   f"Ampliá el recorte y volvé a cargar la costa.")

    ct, tabla_tierra = elegidas["tierra"]
    CAPAS_TIERRA = [tabla_tierra]
    CAPA_LIMITE_EXTERIOR = elegidas["limite_exterior"][1]
    COSTA_DECLARADA = {"id": ct["id"], "sha256": ct["sha256"],
                       "tabla_base": ct["tabla"], "tabla": tabla_tierra}
    return man


def habilitados_declarados():
    """Que ambitos pueden entrar a la capa publicada, del registro declarado.

    D3 parte el gate por ambito: cada ambito existe cuando pasa SUS controles. De
    ahi se sigue algo que el plan no tenia escrito y que este lector existe para
    cerrar: partir el gate no libera solo al ambito que la etapa esta trabajando,
    libera a TODOS los que pasen. Un ambito que ninguna etapa audito se publicaria
    solo, retirando su aviso de INV-3.6 sin que nadie lo decidiera. Cual puede
    entrar es una declaracion, no una consecuencia.

    Sin defaults: un ambito sin su campo detiene la corrida (CLAUDE.md §4.2). La
    habilitacion NO afloja ningun control — un ambito habilitado que falla sus
    controles tampoco entra."""
    d = json.load(open(AMBITOS, encoding="utf-8"))
    if not isinstance(d.get("ambitos"), list) or not d["ambitos"]:
        raise Alto(f"{os.path.relpath(AMBITOS, REPO)} no trae un arreglo 'ambitos'")
    out = {}
    for e in d["ambitos"]:
        a = e.get("ambito")
        if not a:
            raise Alto(f"{os.path.relpath(AMBITOS, REPO)}: hay una entrada sin 'ambito'")
        if not isinstance(e.get("habilitado_para_publicar"), bool):
            raise Alto(f"el ambito '{a}' no declara 'habilitado_para_publicar' booleano "
                       f"en {os.path.relpath(AMBITOS, REPO)}. Sin ese campo no se sabe "
                       f"si puede entrar a la capa, y no se supone que si")
        if not str(e.get("motivo_habilitacion") or "").strip():
            raise Alto(f"el ambito '{a}' declara habilitacion sin 'motivo_habilitacion'")
        out[a] = bool(e["habilitado_para_publicar"])
    return out


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


def lados_de(f):
    return frozenset(x for x in (f.get("lado_a"), f.get("lado_b"),
                                 f.get("lado_norte"), f.get("lado_sur")) if x)


def trazo_local_de(j, fronteras):
    """Zona donde el TRAZO LOCAL manda y el paralelo compartido no recorta.

    Dos partes, las dos sacadas del dato: la franja de longitudes que el contorno de
    la jurisdiccion DIBUJA — excluyendo las resueltas al borde de la caja, que no son
    trazo sino lado abierto — y el alcance de sus fronteras poligonales. Ahi el
    decreto describe el limite fino, con sus entradas, islas y puntas, y ese dibujo
    puede cruzar el paralelo: Castro cita 42 35 12 S y Quemchi 42 23 30 S, los dos al
    Sur de su propio paralelo compartido y los dos pegados a la costa. Fuera de esa
    zona no hay trazo que describir y el paralelo es todo lo que el decreto dice.

    Misma definicion que usa el auditor, resuelta con geometria en vez de con
    comparaciones escalares."""
    zonas = []
    lons = [p["lon"] for p in j["contorno"]
            if p.get("lon") is not None and not p.get("lon_origen")
            and abs(p["lon"] - X_W) > 1e-4 and abs(p["lon"] - X_E) > 1e-4]
    if lons:
        zonas.append(box(min(lons), Y_S - MARGEN, max(lons), Y_N + MARGEN))
    for fid in j.get("fronteras") or []:
        g = fronteras.get(fid)
        if g is None or g["tipo"] != "poligonal" or len(g.get("puntos") or []) < 2:
            continue
        b = banda_de_alcance(g)
        if b is not None:
            zonas.append(b)
    return unary_union(zonas) if zonas else None


def recortar_por_paralelo(j, g, f, fronteras, anc):
    """CONVENCION: un paralelo que las dos vecinas declaran como limite compartido
    separa EN TODA SU EXTENSION. Ver PARALELO_COMPARTIDO en las convenciones."""
    lat = f.get("latitud")
    if lat is None or anc is None:
        return g, False
    local = trazo_local_de(j, fronteras)
    libre = poligonal(g.intersection(local)) if local is not None else None
    corta = poligonal(g.difference(local)) if local is not None else g
    if corta.is_empty:
        return g, False
    lado = (box(X_W - MARGEN, lat, X_E + MARGEN, Y_N + MARGEN) if anc[0] > lat
            else box(X_W - MARGEN, Y_S - MARGEN, X_E + MARGEN, lat))
    nuevo = poligonal(corta.intersection(lado))
    if libre is not None and not libre.is_empty:
        nuevo = poligonal(unary_union([nuevo, libre]))
    if nuevo.is_empty:
        raise Alto(f"{j['nombre']} quedo vacia al recortar contra el paralelo "
                   f"compartido '{f['id']}'")
    return nuevo, True


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
            g, hubo = recortar_por_paralelo(j, g, f, fronteras, anc)
            if hubo:
                aplicadas.append(fid)
            continue
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

def emitir_ddl(A, tabla):
    """La forma de la capa. Sale de aca y de ningun otro lado: la prueba de mordida
    del gate levanta su tabla de prueba con este mismo emisor, para que no pueda
    haber una copia del esquema que se quede vieja (CLAUDE.md §2)."""
    A(f"DROP TABLE IF EXISTS {tabla}_sectores;")
    A(f"DROP TABLE IF EXISTS {tabla};")
    A(f"CREATE TABLE {tabla} (")
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
    A(f"CREATE TABLE {tabla}_sectores (")
    A("  id TEXT PRIMARY KEY, jurisdiccion TEXT NOT NULL REFERENCES " + tabla + "(id),")
    A(f"  nombre TEXT NOT NULL, texto_decreto TEXT, geom geometry(MultiPolygon, {CRS}));")
    A("")


def emitir_traslape_ensanche(A, tabla):
    """La tabla que alimenta a C8. Tambien se emite desde un solo lugar: la mordida
    del gate la construye con este emisor sobre su tabla de prueba."""
    A(f"DROP TABLE IF EXISTS {tabla}_traslape_ensanche;")
    A(f"CREATE TABLE {tabla}_traslape_ensanche AS")
    # aa y ab: el ambito de cada lado. Los lleva la tabla y no se deducen despues,
    # porque C8 los necesita para saber a que ambito le imputa el par — y un par
    # con un lado de cada ambito no es de ninguno de los dos (ver emitir_controles).
    A("SELECT a.nombre AS na, b.nombre AS nb, a.ambito AS aa, b.ambito AS ab,")
    A("  round((ST_Area(ST_Intersection(a.geom,b.geom)::geography)/1e6)::numeric,3) "
      "AS km2_final,")
    A("  round((ST_Area(ST_Intersection(ST_Intersection(a.geom,a._base),")
    A("    ST_Intersection(b.geom,b._base))::geography)/1e6)::numeric,3) "
      "AS km2_sin_ensanche")
    A(f"FROM {tabla} a JOIN {tabla} b ON a.id < b.id")
    A("WHERE (a.tramos_litoral > 0 OR b.tramos_litoral > 0)")
    A("  AND a.geom IS NOT NULL AND b.geom IS NOT NULL")
    A("  AND a._base IS NOT NULL AND b._base IS NOT NULL")
    A("  AND a.geom && b.geom AND ST_Intersects(a.geom, b.geom);")
    A("")


def emitir_sql(v2, lac, filas, sectores, habilitados, ensayo):
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
    if CAPAS_TIERRA:
        A("-- ══ C0. LA COSTA CONTRA LA QUE SE VA A RESTAR ES LA DECLARADA Y PASO")
        A("--    SUS PROPIOS CONTROLES. Va PRIMERO, antes de construir nada: restar")
        A("--    contra otra costa, o contra una que no se verifico, produce una capa")
        A("--    que parece bien y no lo esta. El sha viene del manifiesto al generar")
        A("--    este SQL, asi que el SQL tambien queda atado a la costa que declara.")
        A("DO $$")
        A("DECLARE h TEXT; malos TEXT;")
        A("BEGIN")
        A(f"  IF to_regclass('public.{COSTA_DECLARADA['tabla']}') IS NULL")
        A(f"     OR to_regclass('public.{COSTA_DECLARADA['tabla_base']}_procedencia')"
          " IS NULL THEN")
        A(f"    RAISE EXCEPTION 'no esta cargada la capa de costa "
          f"{COSTA_DECLARADA['tabla']}. Corre antes scripts/fase5_cargar_costa.py';")
        A("  END IF;")
        A(f"  SELECT valor INTO h FROM {COSTA_DECLARADA['tabla_base']}_procedencia")
        A("    WHERE clave = 'sha256';")
        A(f"  IF h IS DISTINCT FROM {sql_str(COSTA_DECLARADA['sha256'])} THEN")
        A("    RAISE EXCEPTION E'la costa cargada no es la que declara el "
          "manifiesto:\\n  cargada    %\\n  manifiesto %', h, "
          f"{sql_str(COSTA_DECLARADA['sha256'])};")
        A("  END IF;")
        A("  SELECT string_agg(control, '; ') INTO malos FROM "
          f"{COSTA_DECLARADA['tabla_base']}_verificacion WHERE NOT ok;")
        A("  IF malos IS NOT NULL THEN")
        A("    RAISE EXCEPTION 'la costa cargada tiene controles en falla: %', malos;")
        A("  END IF;")
        A("END $$;")
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
    emitir_ddl(A, TABLA)
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
        # La resta va jurisdiccion por jurisdiccion y no en una sola sentencia. La
        # semantica es identica — cada figura se resta contra la misma tierra, y las
        # filas no dependen entre si — pero una sola sentencia sobre 44 filas pesadas
        # es opaca: corre veinte minutos sin decir si avanza, por cual va, ni cual es
        # la cara. Con el bucle, cada jurisdiccion informa su tiempo y su tamaño, y
        # si algun dia una se vuelve impagable se ve cual es. Sigue todo dentro de la
        # misma transaccion: no cambia nada de lo que se deshace si algo falla.
        # ST_UnaryUnion y no ST_Collect: la capa de costa se pisa a si misma (medido:
        # 2.116 pares, 6.219 km2) y un MultiPolygon de piezas que se pisan es
        # invalido. Ver poligonos_disjuntos en el manifiesto.
        A("DO $$")
        A("DECLARE r RECORD; t0 timestamptz; n int := 0; tot int;")
        A("BEGIN")
        A(f"  SELECT count(*) INTO tot FROM {TABLA}")
        A("    WHERE ambito = 'maritima' AND _amplia IS NOT NULL;")
        A(f"  FOR r IN SELECT id, nombre FROM {TABLA}")
        A("      WHERE ambito = 'maritima' AND _amplia IS NOT NULL ORDER BY id LOOP")
        A("    t0 := clock_timestamp();")
        A(f"    UPDATE {TABLA} j SET")
        A("      _base = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
        A("        ST_Difference(ST_ReducePrecision(j._base, 1e-8), u.g)), 3)),")
        A("      _amplia = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
        A("        ST_Difference(ST_ReducePrecision(j._amplia, 1e-8), u.g)), 3))")
        A("    FROM (SELECT ST_ReducePrecision(ST_MakeValid(")
        A("            ST_UnaryUnion(ST_Collect(t.geom))), 1e-8) AS g")
        A(f"          FROM _tierra t, {TABLA} j2")
        A("          WHERE j2.id = r.id AND t.geom && j2._amplia) u")
        A("    WHERE j.id = r.id;")
        A("    n := n + 1;")
        A("    RAISE NOTICE 'tierra restada %/% % en %', n, tot, r.nombre,")
        A("      clock_timestamp() - t0;")
        A("  END LOOP;")
        A("END $$;")
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
    A("-- Limite exterior: solo lo maritimo. La capa sale del rol 'limite_exterior'")
    A("-- del manifiesto, no de un nombre puesto aca. Ahi la resolucion gruesa es")
    A("-- adecuada A PROPOSITO: el error de una costa 1:10m son cientos de metros,")
    A("-- cuatro ordenes por debajo de las 200 millas, y ademas se simplifica antes")
    A("-- de bufferear. Usar la capa fina costaria horas para mover un borde que esta")
    A("-- a 370 km de la costa.")
    A("-- EL OPERADOR NO ES INTERCAMBIABLE, y esto no es preferencia de estilo.")
    A("-- ST_Simplify es Douglas-Peucker y puede eliminar un ANILLO ENTERO: con esta")
    A("-- misma tolerancia borraba OCHO piezas de la union —entre ellas San Felix y")
    A("-- Sala y Gomez, dos de las seis islas que el D.S. 991 enumera por nombre— y")
    A("-- ningun control lo cazaba, porque la figura que queda no es nula, ni vacia,")
    A("-- ni invalida, ni de area cero. ST_SimplifyPreserveTopology conserva todos")
    A("-- los anillos por construccion, comprime igual (5.950 vertices contra 5.980)")
    A("-- y cuesta 0,4 s mas de buffer. Medido en")
    A("-- _bitacoras/simplify_precondicion_2026-08-15/ y aplicado en")
    A("-- _bitacoras/operador_preservetopology_2026-08-15/. No volver al anterior.")
    A("CREATE TEMP TABLE _zee AS")
    A("SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(")
    A("  ST_SimplifyPreserveTopology(ST_Union(ST_MakeValid(ST_Intersection("
      "ST_MakeValid(l.geom),")
    A(f"    ST_MakeEnvelope({X_W}, {Y_S}, {X_E}, {Y_N}, {CRS})))), 0.01)::geography,")
    A(f"  {LIMITE_ZEE_M})::geometry), 1e-8) AS geom FROM {CAPA_LIMITE_EXTERIOR} l")
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
    # ── EL ENSANCHE, MEDIDO ANTES DE PERDER LA FIGURA BASE ────────────────────
    # Con capa de tierra el corredor de litoral se aplica de nuevo. Sin ella era una
    # losa de 60 km que solo pisaba a las vecinas; con ella tiene que comportarse
    # como ensanche — agregar el agua que la cuerda recta deja entre ella y la costa,
    # y nada mas. Eso no se afirma: se mide aca, mientras _base todavia existe, y se
    # persiste. Los NOTICE salen aunque la transaccion se deshaga despues, que es
    # justamente cuando mas hacen falta.
    A(f"DROP TABLE IF EXISTS {TABLA}_ensanche;")
    A(f"CREATE TABLE {TABLA}_ensanche AS")
    A("SELECT id, nombre, tramos_litoral,")
    A("  round((ST_Area(ST_Intersection(geom,_base)::geography)/1e6)::numeric,2) "
      "AS km2_sin_ensanche,")
    A("  round((ST_Area(geom::geography)/1e6)::numeric,2) AS km2_con_ensanche,")
    A("  round(((ST_Area(geom::geography) - "
      "ST_Area(ST_Intersection(geom,_base)::geography))/1e6)::numeric,2) AS km2_agrega")
    A(f"FROM {TABLA} WHERE tramos_litoral > 0 AND geom IS NOT NULL;")
    A("")
    # Traslapes atribuibles al ensanche: se compara el traslape de las figuras
    # FINALES contra el de las figuras SIN el corredor (la base, recortada por el
    # mismo limite exterior). Un par que no se pisaba sin corredor y se pisa con el
    # es el corredor comportandose como losa.
    emitir_traslape_ensanche(A, TABLA)
    A("DO $$")
    A("DECLARE r RECORD;")
    A("BEGIN")
    A("  RAISE NOTICE '--- ENSANCHE DE LITORAL, SUPERFICIE QUE AGREGA ---';")
    A(f"  FOR r IN SELECT * FROM {TABLA}_ensanche ORDER BY km2_agrega DESC LOOP")
    A("    RAISE NOTICE '  % (% tramo(s) litoral): sin ensanche % km2, con ensanche "
      "% km2, agrega % km2', r.nombre, r.tramos_litoral, r.km2_sin_ensanche, "
      "r.km2_con_ensanche, r.km2_agrega;")
    A("  END LOOP;")
    A("  RAISE NOTICE '--- TRASLAPES DONDE INTERVIENE UNA CON ENSANCHE ---';")
    A(f"  FOR r IN SELECT * FROM {TABLA}_traslape_ensanche "
      "ORDER BY km2_final DESC LOOP")
    # El veredicto por par es de TRES casos, no de dos. La primera version tenia dos
    # y etiquetaba 'LO CREA EL ENSANCHE' a pares cuya interseccion final es de area
    # CERO: figuras que solo se tocan por el borde, que es lo que ST_Intersects
    # devuelve verdadero sin que haya traslape ninguno. Decia que el ensanche creaba
    # nueve traslapes cuando no creaba ninguno.
    A("    RAISE NOTICE '  % x %: final % km2, sin ensanche % km2 -> %', r.na, r.nb, "
      "r.km2_final, r.km2_sin_ensanche, CASE")
    A(f"      WHEN r.km2_final <= {TOL_TRASLAPE_KM2} THEN 'sin traslape: solo se "
      "tocan por el borde'")
    A(f"      WHEN r.km2_sin_ensanche <= {TOL_TRASLAPE_KM2} THEN 'LO CREA EL "
      "ENSANCHE'")
    A(f"      WHEN r.km2_final > r.km2_sin_ensanche + {TOL_TRASLAPE_KM2} THEN")
    A("        'ya existia sin el, y el ensanche lo AGRANDA ' ||")
    A("        round(r.km2_final / nullif(r.km2_sin_ensanche,0), 1)::text || 'x'")
    A("      ELSE 'ya existia sin el, el ensanche no lo mueve' END;")
    A("  END LOOP;")
    # Todos los traslapes, dichos como NOTICE ANTES de los controles. El detalle que
    # viaja en el RAISE de C3 puede venir cortado, y si la transaccion se deshace la
    # tabla no queda para consultarla: sin esto, un traslape que voltea la
    # construccion no deja su medicion en ningun lado.
    A("  RAISE NOTICE '--- TODOS LOS TRASLAPES ENTRE FIGURAS FINALES ---';")
    # Con el rectangulo que ocupa cada traslape. Dos traslapes de la misma
    # superficie tienen causas distintas segun DONDE caigan: una franja larga y
    # angosta que se va al Oeste hasta el limite exterior es separacion lateral sin
    # resolver en la franja oceanica; una mancha compacta pegada a la costa es otra
    # cosa. Sin el rectangulo hay que ir a mirar el mapa para saber cual es cual.
    A("  FOR r IN SELECT a.nombre na, b.nombre nb, a.ambito aa, b.ambito ab,")
    A("      round((ST_Area(i.g::geography)/1e6)::numeric,3) km2,")
    A("      round(ST_XMin(i.g)::numeric,3) x0, round(ST_XMax(i.g)::numeric,3) x1,")
    A("      round(ST_YMin(i.g)::numeric,3) y0, round(ST_YMax(i.g)::numeric,3) y1")
    A(f"    FROM {TABLA} a JOIN {TABLA} b ON a.id < b.id,")
    A("      LATERAL (SELECT ST_Intersection(a.geom,b.geom) g) i")
    A("    WHERE a.geom IS NOT NULL AND b.geom IS NOT NULL AND a.geom && b.geom")
    A("      AND ST_Intersects(a.geom,b.geom)")
    A(f"      AND ST_Area(i.g::geography) > {TOL_TRASLAPE_KM2}*1e6")
    A("    ORDER BY 5 DESC LOOP")
    A("    RAISE NOTICE '  % (%) x % (%) = % km2  |  lon % .. %  lat % .. %',")
    A("      r.na, r.aa, r.nb, r.ab, r.km2, r.x0, r.x1, r.y0, r.y1;")
    A("  END LOOP;")
    A("END $$;")
    A("")
    A(f"ALTER TABLE {TABLA} DROP COLUMN _base, DROP COLUMN _amplia;")
    A(f"CREATE INDEX idx_{TABLA}_geom ON {TABLA} USING GIST (geom);")
    A(f"CREATE INDEX idx_{TABLA}_ambito ON {TABLA} (ambito);")
    A(f"CREATE INDEX idx_{TABLA}_sect_geom ON {TABLA}_sectores USING GIST (geom);")
    A(f"ANALYZE {TABLA};")
    A("")
    # ── EL AREA DE CADA FIGURA, TOMADA ANTES DE QUE EL GATE BORRE ─────────────
    # Constancia, no control. El gate por ambito (D3) retira de la tabla los
    # ambitos que no se publican, asi que terminada la corrida no queda de donde
    # leer el km2 de una jurisdiccion retenida: _publicacion guarda la CUENTA y no
    # el area, y _ensanche solo mira las que tienen tramo litoral — hoy tres de
    # cuarenta y cuatro. Sin esto, medir que le hizo un cambio del constructor a
    # las maritimas obliga a reconstruir la banda de cada una por fuera del build,
    # que es aproximado y no se puede firmar km2 por km2.
    # Se emite ACA a proposito: es el ultimo momento en que las figuras retenidas
    # todavia existen. Nada la consulta y ninguna decision depende de ella.
    A(f"DROP TABLE IF EXISTS {TABLA}_areas;")
    A(f"CREATE TABLE {TABLA}_areas AS")
    A("SELECT id, nombre, ambito, estado_geometria,")
    A("  round((ST_Area(geom::geography) / 1e6)::numeric, 1) AS km2,")
    A("  ST_NPoints(geom) AS vertices, ST_NumGeometries(geom) AS piezas")
    A(f"FROM {TABLA};")
    A(f"COMMENT ON TABLE {TABLA}_areas IS 'Area de cada jurisdiccion TAL COMO LA "
      "CONSTRUYO ESTA CORRIDA, tomada antes del gate por ambito. Incluye los "
      "ambitos que el gate retiene y borra de la capa, que es justamente lo que no "
      "se puede leer en ningun otro lado despues. ES CONSTANCIA, NO CONTROL: nada "
      "la consulta y ninguna decision depende de ella. Una fila con km2 nulo es una "
      "nula_declarada (INV-3.6), no un error.';")
    A("")
    emitir_controles(A, TABLA, permitidos)
    A("")
    emitir_gate(A, TABLA, habilitados)
    A("")
    A(f"COMMENT ON TABLE {TABLA} IS 'Capa de referencia de las jurisdicciones de "
      "Capitania del D.S. 991/1987. Derivada por script desde el insumo versionado "
      f"(INV-3.7); no editar la geometria a mano. Procedencia en {TABLA}_procedencia, "
      f"convenciones en {TABLA}_convenciones. CONTIENE SOLO LOS AMBITOS PUBLICADOS: "
      "el gate por ambito (D3) retira en la misma transaccion los que no pasaron sus "
      "controles o no estan habilitados, asi que un ambito que no aparece aca NO es "
      "una zona sin jurisdiccion — es un ambito no publicado, causa (a) de INV-3.6, y "
      f"lo declaran {TABLA}_publicacion y data/decreto/ambitos_publicados.json. El "
      "motor todavia NO la consulta.';")
    if ensayo:
        A("")
        A("-- ENSAYO: la corrida se hace entera —construye, mide, aplica el gate— y")
        A("-- despues se deshace. Sirve para ver el veredicto de una construccion que")
        A("-- tarda diez minutos sin dejar nada en la base. Las mediciones salen como")
        A("-- NOTICE, que sobreviven al rollback.")
        A("ROLLBACK;")
    else:
        A("COMMIT;")
    open(SALIDA_SQL, "w", encoding="utf-8").write("\n".join(L))


def control_por_fila(A, tabla, nombre, condicion):
    """Un control de fila, contado POR AMBITO. La condicion describe la fila
    DEFECTUOSA, igual que antes; lo que cambia es que el resultado deja de ser uno
    para toda la capa. El LEFT JOIN contra la lista de ambitos es lo que hace que
    un ambito sin defectos tenga igual su fila en ok: sin eso, un ambito limpio no
    aparece y 'no falla' seria indistinguible de 'no se midio'."""
    A(f"INSERT INTO {tabla}_verificacion")
    A(f"SELECT {sql_str(nombre)}, a.ambito, count(x.id) = 0, count(x.id)::text,")
    A("  string_agg(x.nombre, ', ')")
    A(f"FROM _amb a LEFT JOIN {tabla} x ON x.ambito = a.ambito AND ({condicion})")
    A(f"WHERE a.ambito <> {sql_str(AMBITO_CAPA)} GROUP BY a.ambito;")
    A("")


def emitir_controles(A, tabla, permitidos):
    """Los controles, en la misma transaccion. Cada uno se evalua POR AMBITO.

    POR QUE POR AMBITO. D3 (2026-08-10) decidio que el gate se parte: el ambito
    lacustre existe cuando pasa SUS controles, el maritimo cuando pasa los suyos.
    Hasta hoy los ocho controles escribian una fila para toda la capa y un solo
    RAISE con WHERE NOT ok la miraba entera: C3 metia una fila en falla por un
    traslape entre dos Capitanias maritimas de Chiloe y se llevaba puestas a las
    seis lacustres, que no habian aportado ninguna. Medido el 2026-08-12 en
    _bitacoras/e3_recon_2026-08-12.txt.

    LO QUE ESTO NO ES. No se le baja la severidad a ningun control (CLAUDE.md
    §0.3): las condiciones que definen la fila defectuosa son las mismas, con las
    mismas tolerancias. C3 sigue fallando igual para lo maritimo. Lo unico que
    cambia es a quien se lleva puesto cuando falla.

    DOS ALCANCES. Un control puede hablar de un ambito o de la capa entera. Los de
    capa entera llevan el ambito AMBITO_CAPA y su falla no publica nada: son C7
    —el indice es de la tabla, no de un ambito— y los pares de traslape con un
    lado de cada ambito, que no son de ninguno de los dos."""
    A("-- ══ CONTROLES. Van aca adentro a proposito: una revision aparte se puede")
    A("--    saltar, esta no. Lo que cambia con D3 es el ALCANCE de lo que se cae:")
    A("--    cada control se mide por ambito, y un ambito que falla no arrastra a")
    A("--    los otros. Lo que ningun control hace es aflojarse.")
    A(f"DROP TABLE IF EXISTS {tabla}_verificacion;")
    A(f"CREATE TABLE {tabla}_verificacion (control TEXT NOT NULL, ambito TEXT NOT "
      "NULL,")
    A("  ok BOOLEAN NOT NULL, obtenido TEXT, detalle TEXT,")
    A("  PRIMARY KEY (control, ambito));")
    A("")
    A("-- Los ambitos que la capa realmente trae, mas el alcance de capa entera. La")
    A("-- lista sale del dato construido y no de una enumeracion escrita aca: si")
    A("-- manana el insumo trae un ambito nuevo, se mide solo.")
    A("CREATE TEMP TABLE _amb AS SELECT DISTINCT ambito FROM " + tabla + ";")
    A(f"INSERT INTO _amb VALUES ({sql_str(AMBITO_CAPA)});")
    A("")
    control_por_fila(A, tabla, "C1 sin geometria vacia, de area cero o invalida",
                     "x.estado_geometria = 'construida' AND (x.geom IS NULL OR "
                     "ST_IsEmpty(x.geom) OR NOT ST_IsValid(x.geom) OR "
                     "ST_Area(x.geom::geography) = 0)")
    control_por_fila(A, tabla, "C2 toda nula declarada con su causa",
                     "x.estado_geometria = 'nula_declarada' AND "
                     "(x.causa_sin_geometria IS NULL OR x.causa_sin_geometria = '')")
    A("-- Los traslapes permitidos salen del dato, no del codigo.")
    A(f"CREATE TEMP TABLE _ok (a TEXT, b TEXT);")
    for a, b in permitidos:
        A(f"INSERT INTO _ok VALUES ({sql_str(a)}, {sql_str(b)});")
    A("")
    # A QUE AMBITO SE LE IMPUTA UN PAR. Si los dos lados son del mismo ambito, a
    # ese. Si son de ambitos distintos, a NINGUNO de los dos: al alcance de capa,
    # que no publica nada. No es una severidad menor ni mayor — es negarse a
    # elegir. Decidir cual de los dos lados esta de mas exige interpretar el
    # decreto, y el plan lo deja escrito como lo unico que E4 tiene pendiente de
    # definir dentro de C3. Medido el 2026-08-12: hoy hay CERO pares cruzados, asi
    # que esta regla no cambia ningun resultado de hoy; existe para que el dia que
    # aparezca uno no se resuelva solo y en silencio a favor del ambito que se
    # estuviera publicando.
    A("CREATE TEMP TABLE _c3 AS")
    A("SELECT a.nombre na, b.nombre nb, a.ambito aa, b.ambito ab,")
    A(f"  CASE WHEN a.ambito = b.ambito THEN a.ambito ELSE {sql_str(AMBITO_CAPA)} END "
      "AS ambito,")
    A("  round((ST_Area(ST_Intersection(a.geom,b.geom)::geography)/1e6)::numeric,3) km2")
    A(f"FROM {tabla} a JOIN {tabla} b ON a.id < b.id")
    A("WHERE a.geom IS NOT NULL AND b.geom IS NOT NULL AND a.geom && b.geom")
    A("  AND ST_Intersects(a.geom, b.geom)")
    A(f"  AND ST_Area(ST_Intersection(a.geom,b.geom)::geography) > {TOL_TRASLAPE_KM2}*1e6")
    A("  AND NOT EXISTS (SELECT 1 FROM _ok o WHERE o.a = least(a.id,b.id)")
    A("                    AND o.b = greatest(a.id,b.id));")
    A(f"INSERT INTO {tabla}_verificacion")
    A("SELECT 'C3 cero traslapes fuera de los declarados deliberados', a.ambito,")
    A("  count(x.na) = 0, count(x.na)::text,")
    A("  string_agg(x.na || ' x ' || x.nb || ' = ' || x.km2::text || CASE WHEN")
    A("    x.aa <> x.ab THEN ' [PAR CRUZADO ' || x.aa || ' x ' || x.ab || ']' ELSE '' END,")
    A("    '; ')")
    A("FROM _amb a LEFT JOIN _c3 x ON x.ambito = a.ambito GROUP BY a.ambito;")
    A("")
    control_por_fila(A, tabla, "C4 cada jurisdiccion contiene su punto representativo",
                     "x.geom IS NOT NULL AND x.punto_representativo IS NOT NULL AND "
                     "NOT ST_Intersects(x.geom, x.punto_representativo)")
    control_por_fila(A, tabla, "C5 construida sin testigo trae su causa declarada",
                     "x.geom IS NOT NULL AND x.punto_representativo IS NULL AND "
                     "(x.causa_sin_punto_representativo IS NULL OR "
                     "x.causa_sin_punto_representativo = '')")
    control_por_fila(A, tabla, "C6 el ensanche solo donde hay tramo litoral",
                     "x.tramos_litoral = 0 AND x.km2_ensanche IS NOT NULL")
    # C7 es de la capa, no de un ambito: el indice esta o no esta para todos. Por
    # eso lleva el alcance de capa entera y su falla no publica nada.
    A(f"INSERT INTO {tabla}_verificacion")
    A(f"SELECT 'C7 indice espacial presente', {sql_str(AMBITO_CAPA)}, count(*) >= 1,")
    A("  count(*)::text, NULL")
    A(f"FROM pg_indexes WHERE tablename = '{tabla}' AND indexdef ILIKE '%gist%';")
    A("")
    # C8. El corredor de litoral tiene que comportarse como ensanche y no como losa.
    # Puede AGRANDAR un traslape que ya existia por separacion lateral — eso es otro
    # problema, y es el que decide el decreto —, pero no puede CREAR uno donde las
    # figuras base no se tocaban. Los traslapes deliberados quedan exentos por el
    # mismo dato que exime a C3, no por una lista aparte.
    A("CREATE TEMP TABLE _c8 AS")
    A("SELECT x.na, x.nb, x.aa, x.ab,")
    A(f"  CASE WHEN x.aa = x.ab THEN x.aa ELSE {sql_str(AMBITO_CAPA)} END AS ambito,")
    A("  x.km2_final")
    A(f"FROM {tabla}_traslape_ensanche x")
    A(f"WHERE x.km2_sin_ensanche <= {TOL_TRASLAPE_KM2}")
    A(f"  AND x.km2_final > {TOL_TRASLAPE_KM2}")
    A(f"  AND NOT EXISTS (SELECT 1 FROM {tabla} a, {tabla} b, _ok o")
    A("     WHERE a.nombre = x.na AND b.nombre = x.nb")
    A("       AND o.a = least(a.id,b.id) AND o.b = greatest(a.id,b.id));")
    A(f"INSERT INTO {tabla}_verificacion")
    A("SELECT 'C8 el ensanche no crea traslapes que no existieran sin el', a.ambito,")
    A("  count(x.na) = 0, count(x.na)::text,")
    A("  string_agg(x.na || ' x ' || x.nb || ' = ' || x.km2_final::text || CASE WHEN")
    A("    x.aa <> x.ab THEN ' [PAR CRUZADO ' || x.aa || ' x ' || x.ab || ']' ELSE '' END,")
    A("    '; ')")
    A("FROM _amb a LEFT JOIN _c8 x ON x.ambito = a.ambito GROUP BY a.ambito;")
    A("")
    # El estado de TODOS los controles sale como NOTICE antes de cualquier RAISE. Si
    # la transaccion se deshace, la tabla de verificacion se va con ella: sin esto,
    # una corrida que se cae no deja constancia de que los demas SI pasaron, que es
    # la mitad de lo que hay que saber para decidir que hacer.
    A("DO $$")
    A("DECLARE r RECORD;")
    A("BEGIN")
    A("  RAISE NOTICE '--- ESTADO DE TODOS LOS CONTROLES, POR AMBITO ---';")
    A(f"  FOR r IN SELECT * FROM {tabla}_verificacion ORDER BY ambito, control LOOP")
    A("    RAISE NOTICE '  [%] %  %  (obtenido %)%', CASE WHEN r.ok THEN 'ok   ' "
      "ELSE 'FALLA' END, rpad(r.ambito, 16), r.control, COALESCE(r.obtenido,'?'),")
    A("      COALESCE(': ' || r.detalle, '');")
    A("  END LOOP;")
    A("END $$;")


def emitir_gate(A, tabla, habilitados):
    """EL GATE, POR AMBITO. D3, 2026-08-10.

    Antes: un RAISE con `WHERE NOT ok` sobre la capa entera. Un control en falla
    deshacia la transaccion completa, y con ella los ambitos que habian pasado.

    Ahora: cada ambito entra si —y solo si— se cumplen las tres condiciones, y el
    que no entra se RETIRA de la capa con su causa escrita. La transaccion sigue
    siendo una sola y sigue siendo todo-o-nada DENTRO de cada ambito: nada se
    promueve a medias, que es la otra mitad de D3.

      1. esta HABILITADO en data/decreto/ambitos_publicados.json;
      2. no tiene ningun control suyo en falla;
      3. tiene al menos una jurisdiccion con geometria.

    POR QUE SE BORRAN LAS FILAS DEL AMBITO QUE NO ENTRA, en vez de marcarlas. Lo
    que esta en la tabla ES lo publicado, sin que ningun consumidor tenga que
    acordarse de filtrar. La alternativa —dejarlas con una bandera— es la forma
    exacta del error que este repositorio ya pago: una tabla con el nombre
    canonico y datos que parecen validos, que es el falso negativo silencioso de
    INV-3.6 aplicado a la capa misma (ver fase5_descartar_build_provisional.sql).
    Lo que se pierde con el borrado es poder mirar la geometria retenida en la
    base; queda medida en los NOTICE y en las tablas _ensanche y
    _traslape_ensanche, que ahora sobreviven porque la transaccion confirma.

    LO QUE NO CAMBIA. Si NINGUN ambito entra, esto termina donde terminaba antes:
    un RAISE que deshace la transaccion entera y no deja capa."""
    A("-- ══ EL GATE, POR AMBITO (D3). Un ambito entra si esta habilitado, no tiene")
    A("--    controles suyos en falla, y trae al menos una geometria. El que no")
    A("--    entra se retira con su causa. Si no entra ninguno, no queda capa.")
    A("CREATE TEMP TABLE _hab (ambito TEXT PRIMARY KEY, habilitado BOOLEAN NOT NULL);")
    for a, h in sorted(habilitados.items()):
        A(f"INSERT INTO _hab VALUES ({sql_str(a)}, {sql_bool(h)});")
    A("")
    # Un ambito construido que el registro no declara no se supone habilitado ni no
    # habilitado: detiene. Es el mismo criterio que el resto del constructor —
    # ningun mapeo por clave con caso por defecto (CLAUDE.md §4.2).
    A("DO $$")
    A("DECLARE faltan TEXT;")
    A("BEGIN")
    A("  SELECT string_agg(a.ambito, ', ') INTO faltan FROM _amb a")
    A(f"   WHERE a.ambito <> {sql_str(AMBITO_CAPA)}")
    A("     AND NOT EXISTS (SELECT 1 FROM _hab h WHERE h.ambito = a.ambito);")
    A("  IF faltan IS NOT NULL THEN")
    A("    RAISE EXCEPTION 'la capa trae ambitos que el registro de ambitos "
      "publicados no declara: %. No se supone su habilitacion', faltan;")
    A("  END IF;")
    A("END $$;")
    A("")
    A(f"DROP TABLE IF EXISTS {tabla}_publicacion;")
    A(f"CREATE TABLE {tabla}_publicacion (")
    A("  ambito TEXT PRIMARY KEY, habilitado BOOLEAN NOT NULL,")
    A("  controles_ok BOOLEAN NOT NULL, jurisdicciones INT NOT NULL,")
    A("  con_geometria INT NOT NULL, publicado BOOLEAN NOT NULL, causa TEXT,")
    A("  construido_en TIMESTAMPTZ NOT NULL DEFAULT now(),")
    A("  CONSTRAINT retenido_siempre_con_causa CHECK (publicado OR causa IS NOT NULL));")
    A("")
    A(f"INSERT INTO {tabla}_publicacion")
    A("  (ambito, habilitado, controles_ok, jurisdicciones, con_geometria, publicado,")
    A("   causa)")
    A("SELECT a.ambito, h.habilitado, m.ok, m.n, m.con_geom,")
    A("  h.habilitado AND m.ok AND m.con_geom > 0 AND NOT capa.rota,")
    A("  CASE WHEN capa.rota THEN 'la capa tiene un control ESTRUCTURAL en falla: '")
    A("         || capa.detalle || '. Ningun ambito se publica'")
    A("       WHEN NOT h.habilitado THEN 'no habilitado para publicar en "
      "data/decreto/ambitos_publicados.json'")
    A("       WHEN NOT m.ok THEN 'controles en falla: ' || COALESCE(m.fallidos,")
    A("         'no se midio ningun control para este ambito')")
    A("       WHEN m.con_geom = 0 THEN 'ninguna de sus jurisdicciones tiene "
      "geometria: no hay nada que publicar'")
    A("       ELSE NULL END")
    A("FROM _amb a")
    A("JOIN _hab h ON h.ambito = a.ambito")
    A("CROSS JOIN LATERAL (")
    A("  SELECT bool_and(v.ok) AS ok,")
    A("         string_agg(v.control || COALESCE(' [' || v.detalle || ']', ''), '; ')")
    A("           FILTER (WHERE NOT v.ok) AS fallidos")
    A(f"    FROM {tabla}_verificacion v WHERE v.ambito = a.ambito) m0")
    A("CROSS JOIN LATERAL (")
    # Un ambito sin ninguna fila de control no se da por bueno: el default cae del
    # lado que NO publica. Hoy no puede pasar —los controles se emiten contra la
    # misma lista de ambitos— y por eso mismo, si pasara, seria un defecto.
    A("  SELECT COALESCE(m0.ok, FALSE) AS ok, m0.fallidos,")
    A(f"         (SELECT count(*)::int FROM {tabla} j WHERE j.ambito = a.ambito) AS n,")
    A(f"         (SELECT count(*)::int FROM {tabla} j WHERE j.ambito = a.ambito")
    A("            AND j.geom IS NOT NULL AND NOT ST_IsEmpty(j.geom)) AS con_geom) m")
    A("CROSS JOIN LATERAL (")
    A("  SELECT EXISTS (SELECT 1 FROM " + tabla + "_verificacion v")
    A(f"           WHERE v.ambito = {sql_str(AMBITO_CAPA)} AND NOT v.ok) AS rota,")
    A("         (SELECT string_agg(v.control || COALESCE(' [' || v.detalle || ']', ''),")
    A(f"            '; ') FROM {tabla}_verificacion v")
    A(f"           WHERE v.ambito = {sql_str(AMBITO_CAPA)} AND NOT v.ok) AS detalle) capa")
    A(f"WHERE a.ambito <> {sql_str(AMBITO_CAPA)};")
    A("")
    A("-- El ambito que no entra se RETIRA. Los sectores primero, que apuntan a la")
    A("-- jurisdiccion.")
    A(f"DELETE FROM {tabla}_sectores s USING {tabla} j")
    A(f" WHERE s.jurisdiccion = j.id AND j.ambito IN")
    A(f"   (SELECT ambito FROM {tabla}_publicacion WHERE NOT publicado);")
    A(f"DELETE FROM {tabla} WHERE ambito IN")
    A(f"   (SELECT ambito FROM {tabla}_publicacion WHERE NOT publicado);")
    A("")
    A("DO $$")
    A("DECLARE r RECORD; pub TEXT; falla TEXT; decl TEXT;")
    A("BEGIN")
    A("  RAISE NOTICE '--- GATE POR AMBITO (D3) ---';")
    A(f"  FOR r IN SELECT * FROM {tabla}_publicacion ORDER BY ambito LOOP")
    A("    RAISE NOTICE '  [%] %  habilitado=%  controles=%  %/% con geometria%',")
    A("      CASE WHEN r.publicado THEN 'PUBLICA' ELSE 'retiene' END,")
    A("      rpad(r.ambito, 16), r.habilitado,")
    A("      CASE WHEN r.controles_ok THEN 'ok' ELSE 'EN FALLA' END,")
    A("      r.con_geometria, r.jurisdicciones, COALESCE(' — ' || r.causa, '');")
    A("  END LOOP;")
    A("")
    A(f"  SELECT string_agg(ambito, ',' ORDER BY ambito) INTO pub")
    A(f"    FROM {tabla}_publicacion WHERE publicado;")
    # Las dos causas de retencion se informan por separado a proposito. Un ambito
    # retenido porque su declaracion no lo habilita es el estado previsto y no es
    # una falla; uno retenido porque sus controles fallan SI lo es, y es lo que
    # tiene que seguir haciendo ruido hasta que se arregle (CLAUDE.md §0.3). Que
    # el proceso termine en verde o en rojo lo decide esa distincion, asi que
    # viaja en una sola linea con formato fijo que el constructor vuelve a leer.
    A(f"  SELECT string_agg(ambito, ',' ORDER BY ambito) INTO falla")
    A(f"    FROM {tabla}_publicacion WHERE NOT publicado AND habilitado")
    A("      AND NOT controles_ok;")
    A(f"  SELECT string_agg(ambito, ',' ORDER BY ambito) INTO decl")
    A(f"    FROM {tabla}_publicacion WHERE NOT publicado")
    A("      AND (NOT habilitado OR (controles_ok AND con_geometria = 0));")
    A(f"  RAISE NOTICE '{MARCA_PUBLICACION} publicados=[%] retenidos_por_falla=[%] "
      "retenidos_por_declaracion=[%]', COALESCE(pub,''), COALESCE(falla,''),")
    A("    COALESCE(decl,'');")
    A("")
    A("  IF pub IS NULL THEN")
    A("    RAISE EXCEPTION E'NINGUN AMBITO PASA EL GATE, ASI QUE NO QUEDA CAPA. "
      "Detalle por ambito:\\n  %',")
    A(f"      (SELECT string_agg(ambito || ': ' || COALESCE(causa,'?'), E'\\n  ' "
      f"ORDER BY ambito) FROM {tabla}_publicacion);")
    A("  END IF;")
    A("END $$;")
    A("")
    A(f"COMMENT ON TABLE {tabla}_publicacion IS 'Que ambito de la capa entro y cual "
      "no, con su causa. Lo escribe el gate por ambito del constructor (D3): un "
      "ambito entra si esta habilitado en data/decreto/ambitos_publicados.json, no "
      "tiene controles suyos en falla y trae al menos una geometria. Las filas de "
      "los ambitos que no entraron NO estan en la capa: fueron retiradas en la "
      "misma transaccion. Esta tabla es la constancia de esa decision y la unica "
      f"forma de saber, mirando solo la base, por que {tabla} no trae un ambito.';")
    A(f"COMMENT ON TABLE {tabla}_verificacion IS 'Estado de cada control POR AMBITO "
      "en la corrida que construyo la capa. El alcance " + AMBITO_CAPA + " son los "
      "controles estructurales —de la capa entera, no de un ambito— y los pares de "
      "traslape con un lado en cada ambito: si alguno de esos falla, no se publica "
      "ningun ambito.';")


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo-generar", action="store_true",
                    help="escribe el SQL y no toca la base")
    ap.add_argument("--ensayo", action="store_true",
                    help="corre todo contra la base y al final DESHACE: da el "
                         "veredicto del gate sin publicar nada")
    args = ap.parse_args()

    capas_declaradas()
    habilitados = habilitados_declarados()
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

    emitir_sql(v2, lac, filas, sectores, habilitados, args.ensayo)
    informe(filas, diag, sectores, habilitados)

    if args.solo_generar:
        print()
        print("--solo-generar: no se toco la base.")
        return

    cfg, psql = leer_env(), buscar_psql()
    print()
    print(f"Aplicando con {psql} sobre {cfg['DB_NAME']}@{cfg['DB_HOST']}"
          + ("  [ENSAYO: termina en ROLLBACK]" if args.ensayo else "") + "...")
    env = dict(os.environ, PGPASSWORD=cfg["DB_PASSWORD"])
    # Se transmite en vivo y con stderr mezclado, en vez de capturar y mostrar al
    # final. Dos motivos, los dos aprendidos aca: los NOTICE de psql — el progreso de
    # la resta de tierra y TODA la medicion del ensanche y los traslapes — salen por
    # stderr, y capturando solo se mostraban cuando la corrida fallaba, o sea que al
    # salir bien se perdian. Y una resta que tarda veinte minutos sin decir nada no
    # se puede distinguir de una colgada.
    proc = subprocess.Popen([psql, "-h", cfg["DB_HOST"], "-p", cfg["DB_PORT"],
                             "-U", cfg["DB_USER"], "-d", cfg["DB_NAME"],
                             "-v", "ON_ERROR_STOP=1", "-q", "-f", SALIDA_SQL],
                            env=env, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True, encoding="utf-8",
                            errors="replace", bufsize=1)
    # El veredicto del gate se lee de la linea con marca que el propio SQL emite. Se
    # lee de ahi y no de la tabla _publicacion porque en un ensayo esa tabla no
    # sobrevive, y porque el NOTICE es lo unico que queda cuando la transaccion se
    # deshace. El prefijo que psql le pone a un NOTICE depende del idioma de la
    # instalacion, asi que la marca se busca dentro de la linea, no al principio.
    veredicto = None
    for linea in proc.stdout:
        print(linea.rstrip())
        sys.stdout.flush()
        if MARCA_PUBLICACION in linea:
            veredicto = linea.strip()
    if proc.wait() != 0:
        raise Alto("ningun ambito paso el gate: no hay capa, la transaccion se "
                   "deshizo entera. El detalle esta arriba, y las mediciones que "
                   "alcanzaron a salir como NOTICE tambien: sobreviven al rollback.")
    if veredicto is None:
        raise Alto("la corrida termino sin errores y no emitio el veredicto de "
                   f"publicacion ('{MARCA_PUBLICACION}'). No se da por publicada una "
                   "capa cuyo gate no dijo que hizo.")

    publicados, por_falla, por_decl = leer_veredicto(veredicto)
    print()
    if args.ensayo:
        print("ENSAYO: la transaccion se deshizo. En la base no quedo nada.")
        print("Lo que HABRIA publicado una corrida de verdad:")
    print(f"  publicados               : {', '.join(publicados) or 'ninguno'}")
    print(f"  retenidos por falla      : {', '.join(por_falla) or 'ninguno'}")
    print(f"  retenidos por declaracion: {', '.join(por_decl) or 'ninguno'}")
    if por_falla:
        # Publicacion PARCIAL. No es exito: un ambito habilitado no pasa sus
        # controles y eso tiene que seguir haciendo ruido hasta que se arregle
        # (CLAUDE.md §0.3). Tampoco es el fracaso de antes, porque lo que si paso
        # quedo publicado. Codigo propio para que las dos cosas se distingan, con
        # el mismo criterio con que el control de drift de E0.1 usa su exit 3.
        print()
        print("PUBLICACION PARCIAL. Los ambitos habilitados que NO pasaron sus "
              "controles siguen fuera de la capa, con su causa en "
              f"{TABLA}_publicacion: {', '.join(por_falla)}.")
        sys.exit(3)
    print()
    print("Todos los ambitos habilitados pasaron sus controles dentro de la "
          "transaccion.")


def leer_veredicto(linea):
    """Los tres grupos de la linea con marca. Si su forma cambia, esto se detiene:
    un parser que devuelve listas vacias ante una linea que no entiende diria que
    no se publico nada, que es exactamente lo contrario de lo que puede haber
    pasado."""
    import re
    m = re.search(MARCA_PUBLICACION + r"\s*publicados=\[([^\]]*)\]\s*"
                  r"retenidos_por_falla=\[([^\]]*)\]\s*"
                  r"retenidos_por_declaracion=\[([^\]]*)\]", linea)
    if not m:
        raise Alto(f"no se entiende el veredicto de publicacion: {linea}")
    return tuple([x for x in g.split(",") if x] for g in m.groups())


def informe(filas, diag, sectores, habilitados):
    print("FASE 5, ETAPA B — CONSTRUCCION")
    print(f"  salida   : {os.path.relpath(SALIDA_SQL, REPO)}")
    print(f"  tierra   : {', '.join(CAPAS_TIERRA) or 'no se resta (ver convencion)'}"
          + (f"   [{COSTA_DECLARADA['id']}, sha {COSTA_DECLARADA['sha256'][:12]}]"
             if COSTA_DECLARADA else ""))
    print(f"  ext.     : {CAPA_LIMITE_EXTERIOR}, buffer de {LIMITE_ZEE_M} m")
    print(f"  ensanche : {ENSANCHE_KM:.0f} km, solo en tramos litoral"
          + ("" if CAPAS_TIERRA else "  — NO APLICADO: exige capa de tierra"))
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
    print("HABILITACION PARA PUBLICAR, de data/decreto/ambitos_publicados.json")
    for a, h in sorted(habilitados.items()):
        print(f"  {a:<24} {'habilitado' if h else 'NO habilitado'}")
    print()
    print(f"SECTORES construidos: {len(sectores)}")
    print("NULAS DECLARADAS, CON SU CAUSA")
    for f in filas:
        if f["estado"] != "construida":
            print(f"  {f['nombre']:<24} {str(f['causa'])[:80]}")


if __name__ == "__main__":
    main()
