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


def dentro_de_la_figura(j, lat, lon):
    """('dentro' | 'fuera' | 'no_evaluable', motivo)."""
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
    cuerpos_lac = {x["id"]: x.get("cuerpos", []) for x in lac["jurisdicciones"]}

    inf.p("FASE 4 — ETAPA A, SEGUNDA PASADA. AUDITORIA DEL INSUMO v2")
    inf.p(f"insumo   : {os.path.relpath(V2, REPO)}")
    inf.p(f"fuente   : {v2['fuente']}")
    inf.p(f"generado : {v2.get('generado')} por {v2.get('generado_por')}")
    inf.p("No escribe en la base de datos ni deja geometria persistida.")
    inf.p("")
    for ruta in (V2, V1, LACUSTRE, os.path.abspath(__file__)):
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
            n = trozos_de.get(j["id"], 0)
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
    huerf = []
    for f in F:
        for k in ("lado_a", "lado_b", "lado_norte", "lado_sur"):
            if f.get(k) and f[k] not in idx:
                huerf.append(f"{f['id']}: {k}='{f[k]}' no existe")
    for d in huerf:
        inf.fallo("B7", d)
    if not huerf:
        inf.ok("toda frontera apunta a jurisdicciones existentes")
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
    sys.exit(main())
