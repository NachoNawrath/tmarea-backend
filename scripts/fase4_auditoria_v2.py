"""
FASE 4 — Etapa A, segunda pasada. AUDITORIA DEL INSUMO v2. No construye nada.

Misma pregunta que la primera pasada: ¿el archivo fuente permite construir una
capa de jurisdicciones correcta? Ahora contra el insumo rediseñado.

NO escribe en la base de datos, NO genera SQL, NO deja geometria persistida.
Solo biblioteca estandar: corre igual en cualquier maquina que clone el
repositorio, sin PostGIS, sin geopandas y sin shapefiles.

QUE COMPRUEBA
-------------
B0  Fidelidad de la migracion. El rediseño cambio la ESTRUCTURA; el CONTENIDO
    tiene que estar intacto. Se comprueba contra el v1 en disco: mismos ids,
    misma cantidad, todo punto del v1 presente en el v2, textos y correcciones
    identicos, y el sha256 que el v2 declara igual al del v1 real. Sin este
    control, todo lo demas auditaria un dato que quiza ya no es el decreto.

B1  Cierre determinado (INV-3.6). Cada receta tiene sus ingredientes, y la
    figura que produce es UNA. Para las que se cierran cortando una caja, se
    comprueba ademas que el contorno la parta en exactamente dos trozos y que el
    ancla caiga limpiamente en uno.

B2  Vecinas en lados opuestos de la frontera que comparten. Ahora la frontera es
    una entidad unica con dos lados nombrados, asi que se comprueba directamente:
    las anclas de sus dos lados tienen que quedar en trozos distintos.

B3  Ninguna mas chica que su descripcion (INV-3.6, falso negativo). Toda
    coordenada que el decreto nombra como suya cae dentro de su figura.

B4  Las declaradas sin geometria son exactamente las no cerrables. El v2 declara
    el estado; el auditor lo recalcula por su cuenta y compara. Una declaracion
    que nadie contrasta no es una garantia.

B5  Punto representativo. El testigo sobre agua cae dentro de su figura. Una
    jurisdiccion sin testigo no es un defecto del insumo — es cobertura que la
    fuente no da — pero tiene que declarar su causa, igual que una geometria
    nula: la carencia se declara, no se esconde.

B6  Adjudicacion lacustre y traslape deliberado.

B7  Integridad del grafo de fronteras.

B8  Tramos del contorno. El constructor lee el tipo de cada tramo para saber cual
    ensancha hacia tierra, asi que el marcado se audita entero: tipo valido y
    ninguno indeterminado, ninguno sin la adjudicacion que necesita, tantos tramos
    como puntos exige el contorno, respaldo literal en cada uno, coherencia con el
    resumen sigue_litoral, y el CONTROL CRUZADO — un tramo de litoral no puede ser
    a la vez la frontera que se comparte con una vecina, porque ensanchar ahi le
    comeria territorio.

B9  Frontera declarada y respeto del alcance. Una frontera DECLARADA no sale de
    vertices comunes: la puso una transcripcion, asi que tiene que traer su motivo,
    la cita del decreto de sus DOS lados y su alcance ESCRITO — sin el, el alcance
    queda atado a sus vertices y se mueve calladamente con ellos. Y su ALCANCE — el
    tramo dentro del cual
    decide — se audita entero, porque es lo que gobierna cuanta superficie recorta:
    cada borde del alcance tiene que aparecer literalmente como coordenada citada
    (INV-3.7 aplicado al alcance: el texto fuente esta ahi al lado), el alcance tiene
    que contener a la propia frontera, y tiene que acotar el eje que corresponde — un
    meridiano se extiende perpendicular a si mismo, o sea acota latitudes y no
    longitudes.

    POR QUE HIZO FALTA, medido el 2026-08-10: se ensancho el alcance de la unica
    frontera declarada de medio grado a CUATRO grados de latitud y la auditoria
    seguia dando exit 0. Con ese alcance el meridiano recorta donde el decreto no
    dice nada y las figuras vecinas salen mas chicas, sin error en ningun lado — el
    falso negativo silencioso de INV-3.6. Ninguna de las diez familias anteriores lo
    cazaba: se cazaba MOVER la frontera (B2), no ENSANCHAR su alcance.

Los controles B0 de campos obligatorios, ambito geografico y puntos notables, y
los B2.0 de franjas oceanicas y cobertura del litoral, vienen de la primera
pasada. Se habian perdido al reescribir el auditor para el modelo v2 y se
restauraron: no auditaban campos que el rediseno eliminara, asi que su ausencia
era un agujero de deteccion y no una simplificacion.

COMO SE DECIDE "DE QUE LADO", SIN LETRAS CARDINALES
---------------------------------------------------
El contorno abierto, prolongado por sus dos extremos, parte la caja de trabajo
en dos trozos. Para saber si dos puntos caen en el mismo trozo no hace falta
construir los trozos: basta contar cuantas veces el SEGMENTO que los une cruza
el contorno. Numero impar, lados opuestos. Funciona igual con contornos en
escalera, que es donde una letra cardinal no significaba nada.

Se cuenta sobre el segmento entre los dos puntos y no sobre un rayo con
direccion fija a proposito: un rayo hacia el Norte no cruza nunca un contorno
que corre casi Norte-Sur, y ahi seria el metodo — no el dato — el que declararia
que dos vecinas estan del mismo lado. El segmento no tiene direccion
privilegiada, y ademas es la pregunta misma: ¿hay que cruzar la frontera para ir
de una a la otra?

Antes de usarlo se verifica el supuesto: el contorno prolongado tiene que cruzar
el borde de la caja exactamente dos veces. Si lo cruza mas, deja mas de dos
trozos, "el trozo que contiene el ancla" deja de estar bien definido, y eso se
reporta en vez de seguir con un resultado que parece bueno.

Uso, desde la raiz del repositorio:
    py scripts/fase4_auditoria_v2.py
"""

import hashlib
import json
import math
import os
import re
import sys
from collections import defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
LACUSTRE = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
ADJUDICACION = os.path.join(REPO, "data", "decreto", "adjudicacion_tramos.json")

TOL_GRADOS = 1e-6
TOL_BORDE = 1e-4
# Caja de trabajo. CONVENCION nuestra, no decreto: es el marco dentro del cual se
# corta, no un limite juridico. Los mismos valores que usa la construccion.
X_W, X_E = -85.0, -65.0
Y_S, Y_N = -60.0, -17.0
# Prolongacion de los segmentos terminales del contorno, en grados. Tiene que
# garantizar la salida de la caja desde cualquier punto interior de ella.
PROLONGA = 60.0
# Separacion entre el borde de la caja y los extremos del contorno, para que
# ningun cruce ocurra exactamente sobre el borde.
MARGEN = 0.5

RE_DMS = re.compile(r"(\d{1,3})\s+(\d{1,2})\s+(\d{1,2})\s*([SWNE])\b")


def sha(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def coords_del_texto(texto):
    out = []
    for m in RE_DMS.finditer(texto or ""):
        v = int(m.group(1)) + int(m.group(2)) / 60 + int(m.group(3)) / 3600
        out.append((-v if m.group(4) in ("S", "W") else v, m.group(4), m.group(0)))
    return out


def puntos_citados(texto):
    c = coords_del_texto(texto)
    pares, sueltas, i = [], [], 0
    while i < len(c):
        if c[i][1] in ("S", "N"):
            if i + 1 < len(c) and c[i + 1][1] in ("W", "E"):
                pares.append((c[i][0], c[i + 1][0], f"{c[i][2]} / {c[i + 1][2]}"))
                i += 2
                continue
            sueltas.append((c[i][0], c[i][2]))
        i += 1
    return pares, sueltas


# ── geometria: paridad de cruces ─────────────────────────────────────────────

def prolongar(pts):
    """Extiende los dos segmentos terminales para que el corte cruce la caja."""
    if len(pts) < 2:
        return list(pts)
    (x0, y0), (x1, y1) = pts[0], pts[1]
    d = math.hypot(x0 - x1, y0 - y1) or 1.0
    ini = (x0 + (x0 - x1) / d * PROLONGA, y0 + (y0 - y1) / d * PROLONGA)
    (xa, ya), (xb, yb) = pts[-1], pts[-2]
    d2 = math.hypot(xa - xb, ya - yb) or 1.0
    fin = (xa + (xa - xb) / d2 * PROLONGA, ya + (ya - yb) / d2 * PROLONGA)
    return [ini] + list(pts) + [fin]


def _corta_segmentos(p, q, r, s):
    """¿Se cruzan los segmentos pq y rs? Orientaciones con signo."""
    def o(a, b, c):
        v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        return 0 if abs(v) < 1e-14 else (1 if v > 0 else -1)
    o1, o2, o3, o4 = o(p, q, r), o(p, q, s), o(r, s, p), o(r, s, q)
    return o1 != o2 and o3 != o4


def cruces_del_borde(pts, caja):
    """Cuantas veces el contorno prolongado cruza el borde de la caja.

    Dos cruces = dos trozos, que es lo que la receta necesita. Mas cruces
    significan mas trozos, y entonces 'el trozo que contiene el ancla' deja de
    estar bien definido.
    """
    x0, y0, x1, y1 = caja
    lados = [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)),
             ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]
    ext = prolongar(pts)
    n = 0
    for a, b in zip(ext, ext[1:]):
        for c, d in lados:
            if _corta_segmentos(a, b, c, d):
                n += 1
    return n


def separa(pts, p, q):
    """¿El contorno deja a p y q en trozos distintos?

    Se cuentan los cruces del SEGMENTO p-q con el contorno prolongado: numero
    impar, lados opuestos. No se usa un rayo con direccion fija — un rayo hacia
    el Norte no cruza nunca un contorno que corre casi Norte-Sur, y ahi el
    metodo, no el dato, decidiria que dos vecinas estan del mismo lado. El
    segmento entre los dos puntos no tiene direccion privilegiada: es la
    pregunta misma, '¿hay que cruzar la frontera para ir de uno al otro?'.

    p y q son (lat, lon).
    """
    ext = prolongar(pts)
    seg = ((p[1], p[0]), (q[1], q[0]))
    n = sum(1 for a, b in zip(ext, ext[1:])
            if _corta_segmentos(a, b, seg[0], seg[1]))
    return n % 2 == 1


def sobre_el_contorno(pts, lat, lon):
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        vx, vy = xb - xa, yb - ya
        den = vx * vx + vy * vy
        t = 0.0 if den == 0 else max(0.0, min(1.0, ((lon - xa) * vx + (lat - ya) * vy) / den))
        if math.hypot(lon - (xa + t * vx), lat - (ya + t * vy)) <= TOL_BORDE:
            return True
    return False


def dentro_del_anillo(anillo, lat, lon):
    if sobre_el_contorno(anillo + anillo[:1], lat, lon):
        return True
    dentro = False
    for a, b in zip(anillo, anillo[1:] + anillo[:1]):
        if (a[1] > lat) != (b[1] > lat):
            if lon < a[0] + (lat - a[1]) * (b[0] - a[0]) / (b[1] - a[1]):
                dentro = not dentro
    return dentro


# ── lectura del v2 ───────────────────────────────────────────────────────────

def usables(j):
    return [(p["lon"], p["lat"]) for p in j["contorno"]
            if p["lon"] is not None and p.get("usable")]


def anillo_de(j):
    p = usables(j)
    if not j.get("contorno_cerrado"):
        return None
    return p[:-1] if len(p) > 1 and p[0] == p[-1] else p


def banda(j):
    """Franja [sur, norte] que ACOTA la figura.

    Solo acotan los paralelos que el decreto declara. Las latitudes del contorno
    NO acotan: son puntos por donde pasa una frontera lateral, no un tope. Solo
    pueden EXTENDER la franja mas alla del paralelo declarado, nunca encogerla —
    encogerla dejaria fuera superficie decretada, que es el falso negativo que
    INV-3.6 prohibe. Donde el decreto no declara paralelo, ese lado queda abierto
    y lo cierra el contorno o el litoral, no la franja.
    """
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
    """La caja que se corta. Acotada por los paralelos que el decreto declare;
    donde no los declara, por la caja de trabajo.

    Se agranda un margen pequeño en los cuatro lados. Los extremos del contorno
    caen justo SOBRE los paralelos limite, y un cruce que ocurre exactamente en
    el borde no es transversal: se cuenta dos veces o ninguna segun el redondeo.
    Separar el borde del contorno vuelve todos los cruces limpios. La caja es
    convencion de trabajo, no un limite juridico, asi que agrandarla no cambia
    ninguna figura: lo que la acota de verdad es el litoral y el limite exterior.
    """
    n = (j.get("limite_norte") or {}).get("dec")
    s = (j.get("limite_sur") or {}).get("dec")
    lats = [la for _, la in usables(j)]
    sur = min(([s] if s is not None else []) + lats + [Y_N])
    norte = max(([n] if n is not None else []) + lats + [Y_S])
    sur, norte = min(sur, norte), max(sur, norte)
    return (X_W - MARGEN, max(Y_S, sur) - MARGEN,
            X_E + MARGEN, min(Y_N, norte) + MARGEN)


def ancla(j):
    a = j.get("ancla_seleccion")
    if not a or a.get("lat") is None or a.get("lon") is None:
        return None
    return (a["lat"], a["lon"])


def testigo(j):
    t = j.get("punto_representativo")
    if not t:
        return None
    return (t["lat"], t["lon"])


def recalcular_estado(j, cuerpos):
    """El estado que el auditor deduce por su cuenta, para contrastarlo con el
    que el dato declara. Una declaracion que nadie contrasta no garantiza nada."""
    receta, pts = j.get("receta"), usables(j)
    if j["ambito"] == "lacustre":
        fids = [f for c in (cuerpos or []) for f in (c.get("shapefile_fid") or [])]
        return "cerrable" if fids else "no_cerrable"
    if j["ambito"] == "insular_remota":
        return "no_cerrable"
    if j.get("contorno_cerrado"):
        return "cerrable" if len(pts) >= 3 else "no_cerrable"
    if len(pts) >= 2:
        return "cerrable" if ancla(j) and not j.get("nota_fuente") else "no_cerrable"
    n = (j.get("limite_norte") or {}).get("dec")
    s = (j.get("limite_sur") or {}).get("dec")
    return "cerrable" if (n is not None and s is not None) else "no_cerrable"


def separa_sin_prolongar(pts, p, q):
    """Como separa(), pero SIN prolongar los extremos de la linea.

    Para una frontera, prolongar es hacerle decir lo que el decreto no dice mas
    alla de sus extremos. Si el segmento p-q no cruza el trazo REAL, no hay
    frontera cruzada, y ante la duda la jurisdiccion incluye — errar hacia 'de
    mas' es lo que corresponde cuando lo que esta en juego es excluir agua.
    p y q en (lat, lon).
    """
    seg = ((p[1], p[0]), (q[1], q[0]))
    n = sum(1 for a, b in zip(pts, pts[1:])
            if _corta_segmentos(a, b, seg[0], seg[1]))
    return n % 2 == 1


# Fronteras del insumo, por id. Las puebla main(). El modelo de figura las
# necesita: la figura que el constructor produce esta recortada por ellas, y un
# auditor que modele una figura distinta de la que se construye no audita nada.
FRONTERAS = {}


def alcance_de(f):
    """Hasta donde decide una frontera poligonal: (lat_min, lat_max, lon_min, lon_max).

    Usa la 'extension' que la frontera declare; si no la trae, la deduce de sus
    propios puntos. Una frontera dice lo que dice ENTRE SUS EXTREMOS y nada fuera
    de ellos: prolongarla de punta a punta le hace decir mas de lo que el decreto
    entrega.
    """
    e = f.get("extension")
    if e:
        return e["lat_min"], e["lat_max"], e["lon_min"], e["lon_max"]
    lats = [p["lat"] for p in f["puntos"]]
    lons = [p["lon"] for p in f["puntos"]]
    return min(lats), max(lats), min(lons), max(lons)


def dentro_del_alcance(f, lat, lon):
    """¿Esta frontera tiene algo que decir sobre este punto?

    Regla unica, sin casos por jurisdiccion: la frontera decide sobre los puntos
    cuya proyeccion SOBRE SU PROPIA DIRECCION cae dentro del tramo declarado. O
    sea, se extiende perpendicularmente a si misma, nunca a lo largo. Para un
    meridiano eso es su franja de latitudes; para un paralelo, su franja de
    longitudes; para una cadena diagonal, el tramo de su cuerda.
    """
    la0, la1, lo0, lo1 = alcance_de(f)
    pts = f["puntos"]
    ax, ay = pts[0]["lon"], pts[0]["lat"]
    bx, by = pts[-1]["lon"], pts[-1]["lat"]
    vx, vy = bx - ax, by - ay
    den = vx * vx + vy * vy
    if den == 0:                      # frontera degenerada: cae al rectangulo
        return (la0 - TOL_BORDE <= lat <= la1 + TOL_BORDE
                and lo0 - TOL_BORDE <= lon <= lo1 + TOL_BORDE)
    t = ((lon - ax) * vx + (lat - ay) * vy) / den
    margen = TOL_BORDE / math.sqrt(den)
    return -margen <= t <= 1 + margen


def lados_de(f):
    return frozenset(x for x in (f.get("lado_a"), f.get("lado_b"),
                                 f.get("lado_norte"), f.get("lado_sur")) if x)


def franja_del_trazo(j):
    """(lon_min, lon_max) que el decreto DIBUJA para esta jurisdiccion, o None.

    Son las longitudes de su contorno que el decreto nombra de verdad. Se excluyen
    las que el v2 resolvio al borde de la caja — las marcadas con lon_origen, y las
    que caen sobre el borde mismo —: esas no son un trazo, son el lado abierto.

    Es la forma medible de la distincion que gobierna el paralelo compartido: donde
    el decreto dibuja, el dibujo manda; donde no dibuja nada, no hay con que
    contradecir al paralelo.
    """
    lons = [p["lon"] for p in j["contorno"]
            if p.get("lon") is not None and not p.get("lon_origen")
            and abs(p["lon"] - X_W) > TOL_BORDE and abs(p["lon"] - X_E) > TOL_BORDE]
    return (min(lons), max(lons)) if lons else None


def dentro_del_trazo_local(j, lat, lon):
    """¿El punto cae donde el decreto dibuja el trazo fino del limite?

    Dos zonas, y las dos salen del dato: la franja de longitudes que el contorno de
    la jurisdiccion describe, y el alcance de las fronteras poligonales que declara.
    Ahi el limite tiene dibujo — entradas, islas, puntas — y ese dibujo puede cruzar
    el paralelo. Fuera, solo queda mar abierto y el paralelo es todo lo que hay.
    """
    fr = franja_del_trazo(j)
    if fr is not None and fr[0] - TOL_BORDE <= lon <= fr[1] + TOL_BORDE:
        return True
    for fid in j.get("fronteras") or []:
        g = FRONTERAS.get(fid)
        if g is None or g["tipo"] != "poligonal" or len(g.get("puntos") or []) < 2:
            continue
        if dentro_del_alcance(g, lat, lon):
            return True
    return False


def fuera_por_frontera(j, lat, lon):
    """(True, motivo) si alguna frontera declarada deja este punto del lado ajeno.

    Es la misma definicion de figura que aplica el constructor — ninguna
    jurisdiccion cruza las fronteras que el insumo le declara — resuelta por
    paridad de cruces en vez de por corte de poligonos. Dos implementaciones de
    una misma definicion: si una se equivoca, la otra no la acompaña.
    """
    a = ancla(j)
    for fid in j.get("fronteras") or []:
        f = FRONTERAS.get(fid)
        if f is None:
            continue                                  # B7 lo caza por su cuenta
        # PARALELO COMPARTIDO. Un paralelo que las dos vecinas declaran como limite
        # comun separa en TODA su extension: nada en el decreto lo acota a la costa.
        # Recorta en todos lados menos dentro del alcance de las poligonales que
        # declara la misma pareja — ahi el decreto dibuja el trazo local del limite y
        # ese dibujo puede cruzar el paralelo, que es de donde salian las latitudes
        # que banda() usa para extender la franja.
        #
        # Origen, para no volver atras: antes esto era 'continue' con el argumento de
        # que banda() ya lo aplicaba y que reimponer el paralelo encogeria la figura
        # dejando fuera superficie decretada (INV-3.6). El argumento valia para el
        # trazo local y se generalizo de mas: mar afuera no hay trazo que describir, y
        # no recortar ahi dejaba a dos vecinas pisandose 882 km2 en pleno oceano.
        if f["tipo"] == "paralelo":
            if f.get("latitud") is None or a is None:
                continue
            # Un punto SOBRE el paralelo pertenece a las dos vecinas, igual que uno
            # sobre una frontera poligonal: son justamente los vertices con que el
            # decreto describe el limite. Sin esta tolerancia, cinco jurisdicciones
            # perdian coordenadas que el decreto les cita, por estar exactamente en
            # la linea.
            if abs(lat - f["latitud"]) <= TOL_BORDE:
                continue
            if dentro_del_trazo_local(j, lat, lon):
                continue
            arriba_ancla = a[0] > f["latitud"]
            arriba_punto = lat > f["latitud"]
            if arriba_ancla != arriba_punto:
                return True, (f"del otro lado del paralelo compartido '{fid}' "
                              f"({f['latitud']:.6f}) respecto de la sede, y fuera "
                              f"del trazo local que el decreto dibuja")
            continue
        if len(f.get("puntos") or []) < 2 or a is None:
            continue
        if not dentro_del_alcance(f, lat, lon):
            continue                                  # fuera del tramo declarado
        pts = [(p["lon"], p["lat"]) for p in f["puntos"]]
        # Un punto SOBRE la frontera pertenece a las dos vecinas, no a ninguna
        # menos. Los vertices que el decreto cita son justamente los de la
        # frontera: excluirlos declararia que la jurisdiccion no contiene los
        # puntos con que el propio decreto la describe.
        if sobre_el_contorno(pts, lat, lon):
            continue
        if separa_sin_prolongar(pts, a, (lat, lon)):
            return True, (f"del otro lado de la frontera '{fid}' respecto de la sede "
                          f"que define la jurisdiccion")
    return False, None


def dentro_de_la_figura(j, lat, lon):
    """('dentro' | 'fuera' | 'pendiente_litoral' | 'no_evaluable', motivo).

    LA FIGURA ES LA MISMA QUE CONSTRUYE EL CONSTRUCTOR: receta, franja de
    paralelos, contorno, Y recorte por las fronteras declaradas dentro del alcance
    de cada una. Antes este auditor modelaba la figura SIN el recorte, o sea otro
    objeto distinto del que se construye, y por ahi un defecto podia pasar el
    control y morir en la construccion.

    La implementacion es independiente de la del constructor a proposito: aqui se
    resuelve por paridad de cruces sobre coordenadas, alla por corte de poligonos
    con shapely. Si el auditor llamara al codigo del constructor dejaria de ser un
    control y seria un espejo: compartirian el error y ninguno lo cazaria.
    """
    v, motivo = _figura_por_receta(j, lat, lon)
    if v not in ("dentro", "pendiente_litoral"):
        return v, motivo
    fuera, por_que = fuera_por_frontera(j, lat, lon)
    if fuera:
        return "fuera", por_que
    return v, motivo


def _figura_por_receta(j, lat, lon):
    """La figura que dan la receta, la franja y el contorno, ANTES del recorte por
    fronteras."""
    receta = j.get("receta")
    if receta == "union_cuerpos":
        return "no_evaluable", "figura lacustre: se verifica contra el cuerpo de agua"
    if receta == "anillo":
        an = anillo_de(j)
        if not an or len(an) < 3:
            return "no_evaluable", "anillo incompleto"
        if dentro_del_anillo(an, lat, lon):
            return "dentro", None
        if j.get("sigue_litoral"):
            # El anillo une con una recta los tramos que el decreto describe como
            # 'el litoral'. La figura real se cierra contra la costa, mas afuera.
            # Sin la capa de tierra este auditor no puede decidir, y decir que
            # esta dentro seria afirmar lo que no comprobo. Lo que si puede es
            # descartar el caso malo: el ensanche va HACIA TIERRA y el ancla esta
            # en tierra, asi que un punto del mismo lado del anillo que el ancla
            # cae dentro del ensanche, y uno del lado contrario no.
            a = ancla(j)
            if a is None:
                return "no_evaluable", "sigue el litoral y no hay ancla con que orientar"
            if dentro_del_anillo(an, a[0], a[1]) == dentro_del_anillo(an, lat, lon):
                return ("pendiente_litoral",
                        "fuera del anillo pero del mismo lado que el ancla: cae en el "
                        "ensanche hacia tierra. Lo confirma la Etapa B con la capa de "
                        "costa; aqui no hay con que")
            return "fuera", ("fuera del anillo y del lado opuesto al ancla: el ensanche "
                             "hacia tierra tampoco lo alcanzaria")
        return "fuera", "fuera del anillo de vertices"

    fr = banda(j)
    if fr is not None:
        if lat < fr[0] - TOL_BORDE:
            return "fuera", f"al Sur del limite sur de la figura ({fr[0]:.6f})"
        if lat > fr[1] + TOL_BORDE:
            return "fuera", f"al Norte del limite norte de la figura ({fr[1]:.6f})"

    if receta == "corte_y_ancla":
        pts, a = usables(j), ancla(j)
        if len(pts) < 2 or a is None:
            return "no_evaluable", "sin contorno o sin ancla"
        if sobre_el_contorno(pts, lat, lon):
            return "dentro", None
        if separa(pts, a, (lat, lon)):
            return "fuera", ("del otro lado del contorno respecto del ancla que "
                             "define la jurisdiccion")
    return "dentro", None


# ── informe ──────────────────────────────────────────────────────────────────

class Informe:
    def __init__(self):
        self.fallos = defaultdict(list)

    def p(self, s=""):
        print(s)

    def h(self, t):
        self.p("")
        self.p("=" * 78)
        self.p(t)
        self.p("=" * 78)

    def fallo(self, c, d):
        self.fallos[c].append(d)
        self.p(f"  FALLA  {d}")

    def aviso(self, s):
        self.p(f"  aviso  {s}")

    def ok(self, s):
        self.p(f"  ok     {s}")


def main():
    inf = Informe()
    v2 = json.load(open(V2, encoding="utf-8"))
    v1 = json.load(open(V1, encoding="utf-8"))
    lac = json.load(open(LACUSTRE, encoding="utf-8"))
    J = v2["jurisdicciones"]
    F = v2["fronteras"]
    idx = {j["id"]: j for j in J}
    # El modelo de figura recorta por fronteras; sin este indice modelaria otra
    # figura que la que se construye.
    FRONTERAS.clear()
    FRONTERAS.update({f["id"]: f for f in F})
    cuerpos_lac = {x["id"]: x["cuerpos"] for x in lac["jurisdicciones"]}

    inf.p("FASE 4 — ETAPA A, SEGUNDA PASADA. AUDITORIA DEL INSUMO v2")
    inf.p(f"insumo   : {os.path.relpath(V2, REPO)}")
    inf.p(f"fuente   : {v2['fuente']}")
    inf.p(f"generado : {v2.get('generado')} por {v2.get('generado_por')}")
    inf.p("No escribe en la base de datos ni deja geometria persistida.")
    inf.p("")
    for ruta in (V2, V1, LACUSTRE, ADJUDICACION, os.path.abspath(__file__)):
        if os.path.exists(ruta):
            inf.p(f"  sha256[:16] {sha(ruta)[:16]}  {os.path.relpath(ruta, REPO)}")

    # ── B0 ───────────────────────────────────────────────────────────────────
    inf.h("B0 — FIDELIDAD DE LA MIGRACION: la estructura cambio, el contenido no")

    dec = v2.get("derivado_de") or {}
    real = sha(V1)
    if dec.get("jurisdicciones_capitanias.json") != real:
        inf.fallo("B0", f"el v2 dice derivar de un v1 con sha256 "
                        f"{str(dec.get('jurisdicciones_capitanias.json'))[:16]} pero el "
                        f"v1 en disco es {real[:16]}: el insumo cambio despues de migrar")
    else:
        inf.ok("el v2 deriva del v1 que esta en disco (sha256 coincide)")

    c1 = {c["id"]: c for c in v1["capitanias"]}
    if set(c1) != set(idx):
        inf.fallo("B0", f"los ids no coinciden: sobran {sorted(set(idx) - set(c1))}, "
                        f"faltan {sorted(set(c1) - set(idx))}")
    else:
        inf.ok(f"{len(J)} jurisdicciones, los mismos ids que el v1")

    perdidos, textos = [], []
    for cid, c in c1.items():
        j = idx.get(cid)
        if not j:
            continue
        todos = j["contorno"] + (j.get("puntos_no_incorporados") or [])
        en_v2 = {(round(p["lat"], 6), None if p["lon"] is None else round(p["lon"], 6))
                 for p in todos}
        # Un punto que el v1 dejaba sin longitud ('por este paralelo hasta el lado
        # abierto') aparece en el v2 con la longitud ya resuelta al borde. No se
        # perdio: cambio de forma, y el v2 lo marca con lon_origen.
        en_v2 |= {(round(p["lat"], 6), None) for p in todos if p.get("lon_origen")}
        for campo in ("poligonal_completa", "vertices"):
            for v in (c.get(campo) or []):
                if v.get("lat") is None:
                    continue
                k = (round(v["lat"], 6),
                     None if v.get("lon") is None else round(v["lon"], 6))
                if k not in en_v2:
                    perdidos.append(f"{c['nombre']}: el punto {k} de '{campo}' no esta "
                                    f"en el contorno del v2")
        if c["texto_decreto"] != j["texto_decreto"]:
            textos.append(f"{c['nombre']}: el texto del decreto cambio en la migracion")
        if (c.get("correccion_aplicada") or None) != (j.get("correccion_aplicada") or None):
            textos.append(f"{c['nombre']}: la correccion registrada cambio")
    for d in perdidos + textos:
        inf.fallo("B0", d)
    if not perdidos:
        inf.ok("todo punto del v1 esta en el contorno del v2")
    if not textos:
        inf.ok("textos del decreto y correcciones, identicos al v1")

    # Prerequisito estructural: toda frontera tiene que apuntar a jurisdicciones
    # que existen. Se comprueba ACA, antes que nada, porque los controles que
    # vienen despues indexan por esos ids: con uno roto, el auditor moria con
    # KeyError y el fallo real quedaba tapado por el crash.
    huerf = [f"{f['id']}: {k}='{f[k]}' no existe entre las jurisdicciones"
             for f in F for k in ("lado_a", "lado_b", "lado_norte", "lado_sur")
             if f.get(k) and f[k] not in idx]
    for d in huerf:
        inf.fallo("B0", d)
    if huerf:
        inf.h("VEREDICTO — AUDITORIA ABORTADA")
        inf.p("  El grafo de fronteras apunta a jurisdicciones que no existen. No se")
        inf.p("  sigue auditando: todo lo que viene despues indexa por esos ids y")
        inf.p("  daria un error de ejecucion en vez de un hallazgo.")
        inf.p("")
        for d in huerf:
            inf.p(f"  [B0] {d}")
        return 1
    inf.ok("toda frontera apunta a jurisdicciones existentes")

    des = []
    for j in J:
        for p in j["contorno"]:
            for eje in ("lat", "lon"):
                t = p.get(f"{eje}_dms")
                if not t or p.get(eje) is None:
                    continue
                m = RE_DMS.fullmatch(t.strip())
                if not m:
                    des.append(f"{j['nombre']}: DMS ilegible '{t}'")
                    continue
                v = int(m.group(1)) + int(m.group(2)) / 60 + int(m.group(3)) / 3600
                v = -v if m.group(4) in ("S", "W") else v
                if abs(v - p[eje]) > 5e-5:
                    des.append(f"{j['nombre']}: DMS '{t}' = {v:.6f} contra decimal "
                               f"{p[eje]:.6f}")
    for d in des:
        inf.fallo("B0", d)
    if not des:
        inf.ok("DMS y decimal coinciden en todo el contorno")

    # Restaurados de la primera pasada. Se habian perdido al reescribir el
    # auditor para el modelo v2: no auditaban campos que el rediseno eliminara,
    # asi que su ausencia era un agujero, no una simplificacion.
    obl = ("id", "nombre", "gobernacion", "ambito", "receta", "estado_geometria",
           "participa_matching", "texto_decreto")
    falt = [f"{j.get('nombre', j.get('id'))}: falta el campo obligatorio '{k}'"
            for j in J for k in obl if k not in j]
    for d in falt:
        inf.fallo("B0", d)
    if not falt:
        inf.ok("todas traen los campos obligatorios")

    fuera_geo = []
    for j in J:
        for p in j["contorno"]:
            lat, lon = p["lat"], p["lon"]
            if lat is None:
                continue
            if not (-90 <= lat <= -17) or (lon is not None and not (-180 <= lon <= -50)):
                fuera_geo.append(f"{j['nombre']}: punto ({lat}, {lon}) fuera del ambito "
                                 f"geografico de Chile y su territorio antartico")
    for d in fuera_geo:
        inf.fallo("B0", d)
    if not fuera_geo:
        inf.ok("todo punto del contorno cae en el ambito geografico esperado")

    notables = {n["nombre"]: n for n in (v2.get("puntos_notables") or [])}
    disc = []
    for j in J:
        for p in j["contorno"] + (j.get("puntos_no_incorporados") or []):
            pn = notables.get(p.get("nombre"))
            if not pn or p.get("lon_origen"):
                continue
            for eje in ("lat", "lon"):
                a, b = p.get(eje), pn.get(eje)
                if a is not None and b is not None and abs(a - b) > TOL_GRADOS:
                    disc.append(f"{j['nombre']}: el punto '{p['nombre']}' {eje}={a:.6f} "
                                f"pero puntos_notables dice {b:.6f}")
    for d in disc:
        inf.fallo("B0", d)
    if not disc:
        inf.ok("los puntos que nombran un punto notable coinciden con el catalogo")

    # ── B1 ───────────────────────────────────────────────────────────────────
    inf.h("B1 — CIERRE DETERMINADO")

    inf.p(f"  {'JURISDICCION':<22} {'AMBITO':<15} {'RECETA':<16} {'PTS':<4} "
          f"{'TROZOS':<7} ESTADO")
    inf.p("  " + "-" * 82)
    trozos_de = {}
    for j in J:
        pts = usables(j)
        tr = "-"
        if j["receta"] == "corte_y_ancla" and len(pts) >= 2:
            n = cruces_del_borde(pts, caja_de(j))
            tr = str(n // 2 + 1) if n % 2 == 0 else f"?{n}"
            trozos_de[j["id"]] = n
        inf.p(f"  {j['nombre']:<22} {j['ambito']:<15} {str(j['receta']):<16} "
              f"{len(pts):<4} {tr:<7} {j['estado_geometria']}")

    inf.p("")
    for j in J:
        if j["estado_geometria"] != "cerrable":
            continue
        pts, r = usables(j), j["receta"]
        if r == "union_cuerpos":
            if not [f for c in (cuerpos_lac.get(j["id"]) or [])
                    for f in (c.get("shapefile_fid") or [])]:
                inf.fallo("B1", f"{j['nombre']}: declarada cerrable y sin cuerpos "
                                f"adjudicados")
        elif r == "anillo":
            if len(pts) < 3:
                inf.fallo("B1", f"{j['nombre']}: anillo con {len(pts)} puntos usables")
        elif r == "corte_y_ancla":
            a = ancla(j)
            if a is None:
                inf.fallo("B1", f"{j['nombre']}: receta de corte y no trae ancla")
                continue
            if j["id"] not in trozos_de:
                inf.fallo("B1", f"{j['nombre']}: receta de corte y no se llego a contar "
                                f"en cuantos trozos parte la caja")
                continue
            n = trozos_de[j["id"]]
            if n != 2:
                inf.fallo("B1", f"{j['nombre']}: el contorno prolongado cruza el borde "
                                f"de la caja {n} veces; con {n} cruces deja "
                                f"{n // 2 + 1 if n % 2 == 0 else 'un numero impar de'} "
                                f"trozos y 'el trozo que contiene el ancla' deja de "
                                f"estar bien definido")
            if sobre_el_contorno(pts, a[0], a[1]):
                inf.fallo("B1", f"{j['nombre']}: el ancla cae SOBRE el contorno, no "
                                f"dentro de un trozo")
        elif r == "banda_paralelos":
            if (j["limite_norte"]["dec"] is None or j["limite_sur"]["dec"] is None):
                inf.fallo("B1", f"{j['nombre']}: banda sin uno de sus paralelos")
        else:
            inf.fallo("B1", f"{j['nombre']}: declarada cerrable con receta '{r}'")
    if not inf.fallos["B1"]:
        inf.ok("toda jurisdiccion cerrable tiene los ingredientes de su receta y "
               "produce una figura unica")

    # Restaurado de la primera pasada. El paralelo rige un lado y el contorno
    # otro, asi que cruzarlo suele ser correcto — pero la figura queda mas grande
    # que el paralelo declarado. Es 'de mas', no 'de menos' (INV-3.4), y por eso
    # es aviso; pero es convencion nuestra y tiene que quedar registrada, no
    # ocurrir en silencio.
    inf.p("")
    inf.p("  B1 bis — contornos que desbordan su paralelo limite declarado")
    desb = []
    for j in J:
        lats = [la for _, la in usables(j)]
        if not lats:
            continue
        n = (j.get("limite_norte") or {}).get("dec")
        s_ = (j.get("limite_sur") or {}).get("dec")
        if n is not None and max(lats) > n + TOL_BORDE:
            desb.append(f"{j['nombre']}: el contorno llega a {max(lats):.6f} y su limite "
                        f"norte declarado es {n:.6f}")
        if s_ is not None and min(lats) < s_ - TOL_BORDE:
            desb.append(f"{j['nombre']}: el contorno llega a {min(lats):.6f} y su limite "
                        f"sur declarado es {s_:.6f}")
    for d in desb:
        inf.aviso(d)
    if not desb:
        inf.ok("ningun contorno desborda su paralelo limite declarado")

    # ── B2 ───────────────────────────────────────────────────────────────────
    inf.h("B2 — VECINAS EN LADOS OPUESTOS DE LA FRONTERA QUE COMPARTEN")

    # Restaurados de la primera pasada. Dos jurisdicciones que ocupan la franja
    # oceanica completa no pueden solaparse en latitud: ahi no hay contorno que
    # las separe, solo el paralelo.
    inf.p("  B2.0 — dos que ocupan la franja oceanica completa no pueden solaparse")
    bandas = [j for j in J if j["receta"] == "banda_paralelos"
              and banda(j) is not None]
    sol = []
    for i, a in enumerate(bandas):
        for b in bandas[i + 1:]:
            fa, fb = banda(a), banda(b)
            d = min(fa[1], fb[1]) - max(fa[0], fb[0])
            if d > TOL_BORDE:
                sol.append(f"{a['nombre']} [{fa[0]:.6f}, {fa[1]:.6f}] y {b['nombre']} "
                           f"[{fb[0]:.6f}, {fb[1]:.6f}] se solapan {d:.6f} grados")
    for d in sol:
        inf.fallo("B2", d)
    if not sol:
        inf.ok(f"{len(bandas)} jurisdicciones de banda, ninguna se solapa en latitud")

    inf.p("")
    inf.p("  B2.0 bis — cobertura en latitud del litoral continental")
    tramos = sorted((banda(j) for j in J if j["ambito"] == "maritima"
                     and banda(j) is not None
                     and all(map(math.isfinite, banda(j)))), key=lambda t: -t[1])
    unido, huecos = [], []
    for s_, n_ in tramos:
        if unido and s_ <= unido[-1][1] + TOL_BORDE:
            unido[-1] = (min(unido[-1][0], s_), max(unido[-1][1], n_))
        else:
            unido.append((s_, n_))
    for a, b in zip(unido, unido[1:]):
        huecos.append(f"entre la latitud {a[0]:.6f} y {b[1]:.6f} ({a[0] - b[1]:.6f} "
                      f"grados) ninguna jurisdiccion maritima con franja determinable "
                      f"cubre el litoral")
    for d in huecos:
        inf.fallo("B2", d)
    if not huecos and unido:
        inf.ok(f"cobertura continua entre {unido[0][1]:.6f} y {unido[-1][0]:.6f}")
    inf.p("")

    pol = [f for f in F if f["tipo"] == "poligonal"]
    par = [f for f in F if f["tipo"] == "paralelo"]
    inf.p(f"  {len(F)} fronteras: {len(par)} por paralelo, {len(pol)} poligonales")
    inf.p("")
    inf.p(f"  {'VECINA A':<21} {'VECINA B':<21} {'PTS':<4} {'A SEPARA':<9} "
          f"{'B EXCLUYE':<10} VEREDICTO")
    inf.p("  " + "-" * 88)
    for f in sorted(pol, key=lambda x: x["id"]):
        a, b = idx[f["lado_a"]], idx[f["lado_b"]]
        pa, pb = ancla(a), ancla(b)
        # El corte se evalua con el CONTORNO COMPLETO de cada una, no con el
        # trozo compartido. Prolongar una subcadena de dos o tres puntos la
        # extiende en una direccion arbitraria y el resultado seria del metodo,
        # no del dato. Con el contorno completo la pregunta es exactamente la que
        # importa: ¿el trozo que se queda A contiene el ancla de B?
        # Se pregunta por la FIGURA completa de cada una — franja de paralelos,
        # contorno y anillo —, no solo por el contorno. Un lado de la frontera lo
        # puede aportar un paralelo declarado en vez del trazo: Chonchi separa por
        # su limite norte y Castro por su contorno, y las dos separan igual. Mirar
        # solo el contorno declararia un conflicto que no existe.
        # El requisito, dicho como toca: ninguna puede contener la sede de la otra.
        vers = []
        for due, otro in ((a, pb), (b, pa)):
            if otro is None or ancla(due) is None:
                vers.append(None)
            else:
                v, _ = dentro_de_la_figura(due, otro[0], otro[1])
                vers.append(v != "dentro")
        concretos = [v for v in vers if v is not None]
        if not concretos:
            ver = "n/a"
        elif all(concretos):
            ver = "opuestos"
        elif any(concretos):
            ver = "DISCREPAN"
        else:
            ver = "MISMO LADO"
        inf.p(f"  {a['nombre']:<21} {b['nombre']:<21} {len(f['puntos']):<4} "
              f"{str(vers[0]):<10} {str(vers[1]):<10} {ver}")
        if ver == "MISMO LADO":
            inf.fallos["B2"].append(
                f"{a['nombre']} y {b['nombre']} comparten una frontera de "
                f"{len(f['puntos'])} puntos y cada figura contiene la sede de la otra: "
                f"se solaparian")
        elif ver == "DISCREPAN":
            inf.fallos["B2"].append(
                f"{a['nombre']} y {b['nombre']}: una excluye la sede de la otra y la "
                f"otra no ({vers[0]} / {vers[1]}). Las dos vecinas no describen la "
                f"misma frontera")
    inf.p("")
    for d in inf.fallos["B2"]:
        inf.p(f"  FALLA  {d}")

    mal_par = []
    for f in par:
        n, s = idx[f["lado_norte"]], idx[f["lado_sur"]]
        an, asur = ancla(n), ancla(s)
        if an is None or asur is None:
            continue
        if not (an[0] > f["latitud"] > asur[0]):
            mal_par.append(f"paralelo {f['latitud']:.6f}: {n['nombre']} deberia quedar "
                           f"al Norte (su ancla esta en {an[0]:.6f}) y {s['nombre']} al "
                           f"Sur (en {asur[0]:.6f})")
    for d in mal_par:
        inf.fallo("B2", d)
    if not mal_par:
        inf.ok(f"en las {len(par)} fronteras por paralelo, cada vecina queda de su lado")

    duplas = defaultdict(list)
    for f in F:
        k = tuple(sorted([f.get("lado_a") or f.get("lado_norte"),
                          f.get("lado_b") or f.get("lado_sur")]))
        duplas[k].append(f["id"])
    for k, v in sorted(duplas.items()):
        if len(v) > 1:
            inf.aviso(f"{k[0]} y {k[1]} comparten {len(v)} fronteras distintas: {v}")
        if k[0] == k[1]:
            inf.fallo("B2", f"la frontera {v} tiene la misma jurisdiccion en sus dos lados")

    # ── B3 ───────────────────────────────────────────────────────────────────
    inf.h("B3 — NINGUNA MAS CHICA QUE SU DESCRIPCION EN EL DECRETO")

    afuera, no_eval, amparadas, pend_lit = [], [], [], []
    for j in J:
        if j["estado_geometria"] != "cerrable" or j["receta"] == "union_cuerpos":
            continue
        corr = j.get("correccion_aplicada") or ""
        pares, sueltas = puntos_citados(j["texto_decreto"])
        for lat, lon, lit in pares:
            v, motivo = dentro_de_la_figura(j, lat, lon)
            if v == "fuera":
                (amparadas if any(t.strip() in corr for t in lit.split("/"))
                 else afuera).append((j["nombre"], lit, motivo))
            elif v == "no_evaluable":
                no_eval.append((j["nombre"], lit, motivo))
            elif v == "pendiente_litoral":
                pend_lit.append((j["nombre"], lit, motivo))
        fr = banda(j)
        if fr is None:
            continue
        for lat, lit in sueltas:
            if fr[0] - TOL_BORDE <= lat <= fr[1] + TOL_BORDE:
                continue
            if lit in corr:
                amparadas.append((j["nombre"], lit, "corregida"))
                continue
            donde = "Sur" if lat < fr[0] else "Norte"
            afuera.append((j["nombre"], lit,
                           f"paralelo citado al {donde} de la figura "
                           f"({(fr[0] if lat < fr[0] else fr[1]):.6f})"))
    for n, lit, motivo in afuera:
        inf.fallo("B3", f"{n}: el decreto cita '{lit}' y la figura lo deja afuera — {motivo}")
    if not afuera:
        inf.ok("ninguna figura deja afuera una coordenada que su propio texto cita")
    if amparadas:
        inf.p("")
        inf.p("  Amparadas por una correccion registrada (INV-3.7):")
        for n, lit, _ in amparadas:
            inf.p(f"    {n} — '{lit}'")
    if pend_lit:
        inf.p("")
        inf.p("  Pendientes de la capa de costa (convencion de litoral, INV-3.4):")
        for n, lit, motivo in pend_lit:
            inf.p(f"    {n} — '{lit}': {motivo}")
    if no_eval:
        inf.p("")
        for n, lit, motivo in no_eval:
            inf.aviso(f"{n} — '{lit}': {motivo}")

    # ── B4 ───────────────────────────────────────────────────────────────────
    inf.h("B4 — LAS DECLARADAS SIN GEOMETRIA SON EXACTAMENTE LAS NO CERRABLES")

    declaradas = {j["id"] for j in J if j["estado_geometria"] == "no_cerrable"}
    recalc = {j["id"] for j in J
              if recalcular_estado(j, cuerpos_lac.get(j["id"])) == "no_cerrable"}
    inf.p(f"  declaradas no cerrables en el dato : {len(declaradas):>2}  {sorted(declaradas)}")
    inf.p(f"  recalculadas por el auditor        : {len(recalc):>2}  {sorted(recalc)}")
    inf.p("")
    for cid in sorted(recalc - declaradas):
        inf.fallo("B4", f"{idx[cid]['nombre']}: el auditor no logra cerrarla y el dato "
                        f"la declara cerrable. Falso negativo silencioso — INV-3.6")
    for cid in sorted(declaradas - recalc):
        inf.fallo("B4", f"{idx[cid]['nombre']}: declarada no cerrable pero el auditor si "
                        f"la cierra ({idx[cid]['receta']}). Cobertura perdida sin motivo")
    if not (declaradas ^ recalc):
        inf.ok("la declaracion del dato y el recalculo del auditor coinciden")

    inf.p("")
    for cid in sorted(declaradas):
        j = idx[cid]
        probl = []
        if j["participa_matching"]:
            probl.append("participa_matching=true")
        if not j.get("causa_sin_geometria"):
            probl.append("sin causa que declarar al patron")
        if probl:
            inf.fallo("B4", f"{j['nombre']}: sin geometria y {', '.join(probl)}")
    if not any("sin geometria y" in d for d in inf.fallos["B4"]):
        inf.ok("toda la que quedara sin geometria trae su causa y no participa del "
               "matching")
    inf.p("")
    inf.p("  Causa declarada de cada una:")
    for cid in sorted(declaradas):
        inf.p(f"    {idx[cid]['nombre']:<22} {idx[cid]['causa_sin_geometria']}")

    # ── B5 ───────────────────────────────────────────────────────────────────
    inf.h("B5 — PUNTO REPRESENTATIVO SOBRE AGUA")

    sin_t, fuera_t, pend_t, ok_t = [], [], [], 0
    for j in J:
        if j["estado_geometria"] != "cerrable":
            continue
        t = testigo(j)
        if t is None:
            sin_t.append(j)
            continue
        v, motivo = dentro_de_la_figura(j, t[0], t[1])
        if v == "fuera":
            fuera_t.append((j, t, motivo))
        elif v == "pendiente_litoral":
            pend_t.append((j, t, motivo))
        else:
            ok_t += 1
    inf.p(f"  testigos que caen dentro de su figura : {ok_t}")
    inf.p(f"  testigos fuera                        : {len(fuera_t)}")
    inf.p(f"  testigos pendientes de la costa       : {len(pend_t)}")
    inf.p(f"  cerrables sin testigo                 : {len(sin_t)}")
    inf.p("")
    for j, t, motivo in fuera_t:
        pr = j["punto_representativo"]
        inf.fallo("B5", f"{j['nombre']}: su testigo ({t[0]:.4f}, {t[1]:.4f}) "
                        f"[{pr['fuente']}, a {pr.get('distancia_km_a_la_sede')} km de la "
                        f"sede] cae fuera de su figura — {motivo}")
    # Una cerrable sin testigo no es un defecto del insumo: es cobertura que la
    # fuente no da. Lo que no puede pasar es que falte en silencio. El control es
    # el mismo que INV-3.6 aplica a la geometria — declarado, no escondido.
    # Criterio acordado con el owner el 2026-08-09 (opcion A).
    for j in sin_t:
        if j.get("causa_sin_punto_representativo"):
            inf.p(f"  decl   {j['nombre']}: sin testigo, declarado — "
                  f"{j['causa_sin_punto_representativo']}")
        else:
            inf.fallo("B5", f"{j['nombre']}: cerrable, sin punto representativo y SIN "
                            f"causa declarada. La carencia se declara, no se esconde")
    for j, t, motivo in pend_t:
        inf.p(f"  pend   {j['nombre']}: testigo ({t[0]:.4f}, {t[1]:.4f}) — {motivo}")
    if not fuera_t and not sin_t:
        inf.ok("ningun testigo cae fuera de su figura")

    # ── B6 ───────────────────────────────────────────────────────────────────
    inf.h("B6 — ADJUDICACION LACUSTRE Y TRASLAPE DELIBERADO")

    ids_v2 = {j["id"] for j in J}
    ids_lac_v2 = {j["id"] for j in J if j["ambito"] == "lacustre"}
    sobran = sorted(set(cuerpos_lac) - ids_v2)
    faltan = sorted(ids_lac_v2 - set(cuerpos_lac))
    if sobran or faltan:
        inf.fallo("B6", f"ids del cotejo lacustre sin jurisdiccion: {sobran}; "
                        f"lacustres sin entrada en el cotejo: {faltan}. Con un caso por "
                        f"defecto, esto quedaba como 'sin cuerpos adjudicados', que es "
                        f"una causa falsa")
    else:
        inf.ok("los ids del cotejo lacustre y las jurisdicciones lacustres coinciden")

    delib = lac.get("traslape_deliberado") or {}
    inf.p(f"  traslapes declarados como deliberados: {len(delib)}")
    for nombre, d in delib.items():
        inf.p(f"    {nombre} -> {d['jurisdicciones']}")
    asignado = defaultdict(list)
    for jid, cs in cuerpos_lac.items():
        for c in cs:
            for fid in (c.get("shapefile_fid") or []):
                asignado[fid].append((jid, c["nombre_decreto"]))
    nd = {n.strip().lower() for n in delib}
    malos = [f for f, v in asignado.items()
             if len(v) > 1 and not ({n.strip().lower() for _, n in v} & nd)]
    for f in sorted(malos):
        inf.fallo("B6", f"cuerpo fid={f} compartido por {[x[0] for x in asignado[f]]} sin "
                        f"declararse deliberado")
    if not malos:
        inf.ok("todo cuerpo compartido esta declarado como traslape deliberado")
    sin_fid = [(jid, c["nombre_decreto"], c.get("resolucion"))
               for jid, cs in cuerpos_lac.items() for c in cs
               if not (c.get("shapefile_fid") or [])]
    for jid, n, res in sin_fid:
        if res not in ("ausente", "rechazado"):
            inf.fallo("B6", f"{jid}: cuerpo '{n}' sin geometria y sin resolucion")
    inf.ok(f"{len(sin_fid)} cuerpos sin geometria, todos con resolucion declarada")

    # ── B7 ───────────────────────────────────────────────────────────────────
    inf.h("B7 — INTEGRIDAD DEL GRAFO DE FRONTERAS")

    ids_f = [f["id"] for f in F]
    if len(ids_f) != len(set(ids_f)):
        inf.fallo("B7", "hay ids de frontera repetidos")
    else:
        inf.ok(f"{len(F)} ids de frontera unicos")
    inf.p("  (la existencia de los lados de cada frontera se comprueba en B0, antes")
    inf.p("   de que cualquier control indexe por esos ids)")
    inconsist = []
    for j in J:
        for fid in j["fronteras"]:
            f = next((x for x in F if x["id"] == fid), None)
            if f is None:
                inconsist.append(f"{j['nombre']}: referencia la frontera '{fid}', que no existe")
            elif j["id"] not in (f.get("lado_a"), f.get("lado_b"),
                                 f.get("lado_norte"), f.get("lado_sur")):
                inconsist.append(f"{j['nombre']}: referencia '{fid}' y esa frontera no la "
                                 f"nombra en ninguno de sus lados")
    for d in inconsist:
        inf.fallo("B7", d)
    if not inconsist:
        inf.ok("las referencias jurisdiccion <-> frontera son consistentes en ambos sentidos")
    sin_f = [j["nombre"] for j in J
             if j["estado_geometria"] == "cerrable" and not j["fronteras"]
             and j["ambito"] == "maritima"]
    if sin_f:
        inf.aviso(f"maritimas cerrables sin ninguna frontera declarada: {sin_f}")

    # ── B8 ───────────────────────────────────────────────────────────────────
    inf.h("B8 — TRAMOS DEL CONTORNO")
    inf.p("  El constructor lee el tipo de cada tramo para saber cual ensancha hacia")
    inf.p("  tierra. Un tramo mal marcado mueve un limite sin que nada avise, asi que")
    inf.p("  el marcado se audita entero, no por muestreo.")
    inf.p("")

    def etiq(e):
        """Nombre del vertice, o sus coordenadas cuando el decreto no lo nombra."""
        return e.get("nombre") or f"({e['lat']:.4f}, {e['lon']:.4f})"

    TIPOS = ("litoral", "frontera", "abierto")
    total_tr = sum(len(j.get("tramos") or []) for j in J)
    cuenta = defaultdict(int)
    origen = defaultdict(int)
    for j in J:
        for t in (j.get("tramos") or []):
            cuenta[t.get("tipo")] += 1
            origen[t.get("tipo_origen")] += 1
    inf.p(f"  {total_tr} tramos: " + ", ".join(f"{k}={cuenta[k]}" for k in TIPOS)
          + f", otros={total_tr - sum(cuenta[k] for k in TIPOS)}")
    inf.p(f"  origen de la marca: " + ", ".join(f"{k}={v}" for k, v in sorted(origen.items())))
    inf.p("")

    # B8.1 — el tipo tiene que ser uno de los tres, y ninguno indeterminado.
    malos = [(j["nombre"], t) for j in J for t in (j.get("tramos") or [])
             if t.get("tipo") not in TIPOS]
    for n, t in malos:
        inf.fallo("B8", f"{n}: tramo ({t['desde']['lat']}, {t['desde']['lon']}) -> "
                        f"({t['hasta']['lat']}, {t['hasta']['lon']}) con tipo "
                        f"'{t.get('tipo')}' — {t.get('causa_indeterminado') or 'sin causa'}")
    if not malos:
        inf.ok("todo tramo tiene un tipo de los tres; ninguno indeterminado")

    # B8.2 — ninguno puede quedar sin la decision que necesita.
    sin_adj = [(j["nombre"], t) for j in J for t in (j.get("tramos") or [])
               if t.get("tipo_origen") == "sin_adjudicar"]
    for n, t in sin_adj:
        inf.fallo("B8", f"{n}: tramo {etiq(t['desde'])} -> "
                        f"{etiq(t['hasta'])} necesita adjudicacion del owner y "
                        f"no la tiene registrada")
    if not sin_adj:
        inf.ok("ningun tramo quedo sin adjudicar")

    # B8.3 — cada jurisdiccion tiene tantos tramos como su contorno exige.
    desc = []
    for j in J:
        pts = usables(j)
        if len(pts) < 2:
            if j.get("tramos"):
                desc.append(f"{j['nombre']}: {len(pts)} punto(s) usables y "
                            f"{len(j['tramos'])} tramo(s)")
            continue
        esperados = len(pts) if j.get("contorno_cerrado") and pts[0] != pts[-1] \
            else len(pts) - 1
        if len(j.get("tramos") or []) != esperados:
            desc.append(f"{j['nombre']}: {len(pts)} puntos exigen {esperados} tramos y "
                        f"trae {len(j.get('tramos') or [])}")
    for d in desc:
        inf.fallo("B8", d)
    if not desc:
        inf.ok("cada contorno trae exactamente los tramos que sus puntos exigen")

    # B8.4 — CONTROL CRUZADO. Un tramo de litoral no puede ser, a la vez, la
    # frontera que comparte con una vecina. El litoral separa agua de tierra; una
    # frontera compartida separa dos jurisdicciones. Si el dato dice las dos cosas
    # del mismo trazo, una de las dos esta mal — y ensanchar hacia tierra sobre la
    # frontera de la vecina le comeria territorio.
    pares_frontera = set()
    for f in F:
        if f["tipo"] != "poligonal":
            continue
        pf = [(p["lon"], p["lat"]) for p in f["puntos"]]
        for a, b in zip(pf, pf[1:]):
            for lado in (f.get("lado_a"), f.get("lado_b")):
                pares_frontera.add((lado, a, b))
                pares_frontera.add((lado, b, a))
    choques = []
    for j in J:
        for t in (j.get("tramos") or []):
            if t.get("tipo") != "litoral":
                continue
            a = (t["desde"]["lon"], t["desde"]["lat"])
            b = (t["hasta"]["lon"], t["hasta"]["lat"])
            if (j["id"], a, b) in pares_frontera:
                choques.append(f"{j['nombre']}: el tramo {etiq(t['desde'])} -> "
                               f"{etiq(t['hasta'])} esta marcado litoral y es "
                               f"tambien una frontera compartida con una vecina. "
                               f"Ensanchar ahi le comeria territorio a la vecina")
    for d in choques:
        inf.fallo("B8", d)
    if not choques:
        inf.ok("ningun tramo de litoral coincide con una frontera compartida")

    # B8.5 — respaldo literal. Un tramo clasificado sin fragmento del decreto es
    # una marca sin fuente.
    sin_frag = [(j["nombre"], t) for j in J for t in (j.get("tramos") or [])
                if t.get("tipo") in ("litoral", "frontera")
                and not (t.get("fragmento_decreto") or "").strip()]
    for n, t in sin_frag:
        inf.fallo("B8", f"{n}: tramo {etiq(t['desde'])} -> "
                        f"{etiq(t['hasta'])} marcado '{t['tipo']}' sin fragmento "
                        f"del decreto que lo respalde")
    if not sin_frag:
        inf.ok("todo tramo clasificado trae el fragmento del decreto que lo respalda")

    # B8.6 — el resumen de la jurisdiccion no puede contradecir a sus tramos.
    incoh = []
    for j in J:
        tiene = any(t.get("tipo") == "litoral" for t in (j.get("tramos") or []))
        if bool(j.get("sigue_litoral")) != tiene:
            incoh.append(f"{j['nombre']}: sigue_litoral={j.get('sigue_litoral')} y "
                         f"{'si' if tiene else 'no'} tiene tramos de litoral")
    for d in incoh:
        inf.fallo("B8", d)
    if not incoh:
        inf.ok("sigue_litoral coincide con los tramos en toda jurisdiccion")

    # B8.7 — un tramo 'abierto' tiene que tocar el lado abierto de verdad.
    mal_ab = []
    for j in J:
        resueltos = {(round(p["lat"], 6), round(p["lon"], 6))
                     for p in j["contorno"] if p.get("lon_origen")}
        for t in (j.get("tramos") or []):
            if t.get("tipo") != "abierto":
                continue
            ex = {(round(t[e]["lat"], 6), round(t[e]["lon"], 6)) for e in ("desde", "hasta")}
            if not (ex & resueltos):
                mal_ab.append(f"{j['nombre']}: tramo marcado 'abierto' y ninguno de sus "
                              f"extremos es un punto resuelto al lado abierto")
    for d in mal_ab:
        inf.fallo("B8", d)
    if not mal_ab:
        inf.ok("todo tramo 'abierto' toca un punto resuelto al lado abierto")

    # B8.8 — la adjudicacion registrada tiene que aplicarse entera. Una entrada
    # que no encuentra su tramo es una decision del owner que no llego al dato.
    if os.path.exists(ADJUDICACION):
        adj = json.load(open(ADJUDICACION, encoding="utf-8"))
        vistos = {(j["id"], round(t["desde"]["lat"], 6), round(t["desde"]["lon"], 6),
                   round(t["hasta"]["lat"], 6), round(t["hasta"]["lon"], 6))
                  for j in J for t in (j.get("tramos") or [])
                  if t.get("tipo_origen") == "adjudicado"}
        huerf = [r for r in adj.get("tramos", [])
                 if (r["jurisdiccion"], round(r["desde"]["lat"], 6),
                     round(r["desde"]["lon"], 6), round(r["hasta"]["lat"], 6),
                     round(r["hasta"]["lon"], 6)) not in vistos]
        for r in huerf:
            inf.fallo("B8", f"la adjudicacion registra un tramo de {r['nombre']} "
                            f"({r['desde'].get('nombre')} -> {r['hasta'].get('nombre')}) "
                            f"que no se aplico a ningun tramo del insumo")
        if not huerf:
            inf.ok(f"las {len(adj.get('tramos', []))} adjudicaciones registradas se "
                   f"aplicaron todas")
        rev = [r for r in adj.get("tramos", []) if r.get("resolucion") == "corregido"]
        if rev:
            inf.p("")
            inf.p("  Adjudicaciones que revierten la propuesta automatica:")
            for r in rev:
                inf.p(f"    {r['nombre']:<22} {r['tipo_propuesto']} -> "
                      f"{r['tipo_adjudicado']}")
    else:
        inf.fallo("B8", f"no existe {os.path.relpath(ADJUDICACION, REPO)} y hay tramos "
                        f"que requieren adjudicacion")

    # ── B9 ───────────────────────────────────────────────────────────────────
    inf.h("B9 — FRONTERA DECLARADA Y RESPETO DEL ALCANCE")
    inf.p("  Una frontera DECLARADA no sale de vertices que dos jurisdicciones")
    inf.p("  compartan: la puso una transcripcion. Y su ALCANCE — hasta donde vale —")
    inf.p("  decide cuanta superficie recorta. Ensanchar un alcance le hace decir al")
    inf.p("  decreto lo que no dice, y le come territorio a la vecina sin que se vea:")
    inf.p("  la figura sale mas chica y no hay error en ningun lado.")
    inf.p("")

    declaradas = [f for f in F if f.get("origen") or f.get("motivo_declaracion")]
    con_ext = [f for f in F if f.get("extension")]
    inf.p(f"  fronteras declaradas por transcripcion : {len(declaradas)}")
    inf.p(f"  fronteras con alcance declarado        : {len(con_ext)}")
    inf.p("")

    # B9.1 — una frontera que nadie transcribe no es del decreto.
    for f in declaradas:
        citas = f.get("citas") or {}
        lados = [f[k] for k in ("lado_a", "lado_b", "lado_norte", "lado_sur")
                 if f.get(k)]
        sin = [l for l in lados if not (citas.get(l) or "").strip()]
        if not f.get("motivo_declaracion"):
            inf.fallo("B9", f"{f['id']}: esta declarada y no dice por que. Una "
                             f"frontera que no se deriva de vertices comunes y no "
                             f"declara su motivo es una asercion sin respaldo")
        if sin:
            inf.fallo("B9", f"{f['id']}: declarada y sin cita del decreto para "
                             f"{', '.join(sin)}. Las dos mitades tienen que estar en "
                             f"el texto: es lo unico que la distingue de un limite "
                             f"inventado")
        # Una declarada tiene que traer su alcance ESCRITO, aunque coincida con el
        # rectangulo de sus puntos. Sin el, alcance_de() cae a ese rectangulo y el
        # alcance pasa a seguir a los puntos: mover un vertice movería calladamente
        # hasta donde la frontera decide, y se perderia el registro de hasta donde
        # se autorizo que dijera. El alcance explicito es la constancia de eso.
        if not f.get("extension"):
            inf.fallo("B9", f"{f['id']}: declarada y sin alcance escrito. Una "
                             f"frontera declarada tiene que dejar constancia de "
                             f"hasta donde se autorizo que decida; si no, el alcance "
                             f"queda atado a sus vertices y se mueve con ellos")
    if declaradas and not inf.fallos["B9"]:
        inf.ok("toda frontera declarada trae su motivo y la cita de sus dos lados")

    # B9.2 — cada borde del alcance, respaldado literalmente en las citas.
    # Es INV-3.7 aplicado al alcance: la geometria se deriva del texto fuente, y el
    # texto fuente esta ahi al lado, en 'citas'. Un borde que no aparece en ninguna
    # cita es un numero que alguien puso.
    for f in con_ext:
        texto = " ".join(v for v in (f.get("citas") or {}).values() if v)
        apoyos = set()
        for m in RE_DMS.finditer(texto):
            v = int(m.group(1)) + int(m.group(2)) / 60 + int(m.group(3)) / 3600
            apoyos.add(-v if m.group(4) in ("S", "W") else v)
        e = f["extension"]
        for k in ("lat_min", "lat_max", "lon_min", "lon_max"):
            if e.get(k) is None:
                inf.fallo("B9", f"{f['id']}: el alcance declarado no trae '{k}'. Un "
                                f"alcance a medias no acota nada")
                continue
            if not any(abs(e[k] - a) <= 5e-5 for a in apoyos):
                inf.fallo("B9", f"{f['id']}: el alcance declara {k}={e[k]:.6f} y ese "
                                f"valor NO aparece en ninguna cita del decreto de "
                                f"esta frontera. Coordenadas citadas: "
                                f"{sorted(round(a, 4) for a in apoyos)}")

    # B9.3 — el alcance no puede ser mas chico que la frontera misma.
    for f in con_ext:
        pts = f.get("puntos") or []
        if not pts:
            inf.fallo("B9", f"{f['id']}: declara alcance y no tiene puntos. Sin "
                            f"geometria propia el alcance no acota nada")
            continue
        e = f["extension"]
        afuera = [p for p in pts
                  if not (e["lat_min"] - TOL_GRADOS <= p["lat"] <= e["lat_max"] + TOL_GRADOS
                          and e["lon_min"] - TOL_GRADOS <= p["lon"] <= e["lon_max"] + TOL_GRADOS)]
        if afuera:
            inf.fallo("B9", f"{f['id']}: el alcance declarado deja fuera "
                            f"{len(afuera)} de sus propios vertices. Una frontera no "
                            f"puede decidir sobre menos que el segmento que es")

    # B9.4 — el alcance tiene que ser coherente con la forma de la frontera. Un
    # meridiano acota latitudes y NO longitudes; un paralelo al reves. Si el alcance
    # se ensancha por el eje a lo largo del cual la frontera corre, deja de acotar.
    for f in con_ext:
        pts = f.get("puntos") or []
        if len(pts) < 2:
            continue
        e = f["extension"]
        lons = {round(p["lon"], 6) for p in pts}
        lats = {round(p["lat"], 6) for p in pts}
        if len(lons) == 1 and abs(e["lon_max"] - e["lon_min"]) > TOL_GRADOS:
            inf.fallo("B9", f"{f['id']}: corre por un solo meridiano "
                            f"({lons.pop():.6f}) y su alcance abre una franja de "
                            f"longitudes. Un meridiano se extiende perpendicular a "
                            f"si mismo: acota latitudes, no longitudes")
        if len(lats) == 1 and abs(e["lat_max"] - e["lat_min"]) > TOL_GRADOS:
            inf.fallo("B9", f"{f['id']}: corre por un solo paralelo "
                            f"({lats.pop():.6f}) y su alcance abre una franja de "
                            f"latitudes")

    if con_ext and not inf.fallos["B9"]:
        inf.ok("todo alcance declarado esta respaldado en las citas, contiene a su "
               "propia frontera y acota el eje que corresponde")
    for f in con_ext:
        e = f["extension"]
        inf.p(f"    {f['id']}: lat {e['lat_min']} .. {e['lat_max']}  "
              f"lon {e['lon_min']} .. {e['lon_max']}")
    if not declaradas and not con_ext:
        inf.fallo("B9", "no hay ninguna frontera declarada ni ningun alcance en el "
                        "insumo. Este control no tiene nada que mirar, y eso no es "
                        "'limpio': es que el camino que deberia cubrir desaparecio")

    # ── veredicto ────────────────────────────────────────────────────────────
    inf.h("VEREDICTO DE LA SEGUNDA PASADA")
    con_fallos = {k: v for k, v in inf.fallos.items() if v}
    total = sum(len(v) for v in con_fallos.values())
    for k in sorted(con_fallos):
        inf.p(f"  {k}: {len(con_fallos[k])} fallo(s)")
    inf.p("")
    if total == 0:
        inf.p("  AUDITORIA LIMPIA. El insumo permite construir una capa correcta.")
        inf.p("  No se construye nada: la Etapa B requiere autorizacion del owner.")
        return 0
    inf.p(f"  AUDITORIA NO LIMPIA — {total} fallo(s) en {len(con_fallos)} control(es).")
    inf.p("  NO se construye.")
    inf.p("")
    for k in sorted(con_fallos):
        for d in con_fallos[k]:
            inf.p(f"  [{k}] {d}")
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:                                        # noqa: BLE001
        import traceback
        traceback.print_exc()
        print("")
        print("=" * 78)
        print("AUDITORIA ROTA — no es un veredicto")
        print("=" * 78)
        print(f"  El auditor se detuvo con un error de ejecucion: {type(e).__name__}: {e}")
        print("  Esto NO significa que el insumo tenga un hallazgo, ni que este limpio:")
        print("  significa que el auditor no llego a mirar. Codigo de salida 2 para que")
        print("  nadie lo confunda con el 1 de 'auditoria con hallazgos'.")
        sys.exit(2)
