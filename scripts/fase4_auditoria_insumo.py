"""
FASE 4 — Etapa A. AUDITORIA DEL INSUMO DE JURISDICCIONES. No construye nada.

Responde una sola pregunta: ¿el archivo fuente permite construir una capa de
jurisdicciones correcta? Si la respuesta es no, el detalle de por que.

NO escribe en la base de datos, NO genera SQL, NO deja geometria persistida.
Todo calculo geometrico es en memoria y solo para decidir si el insumo alcanza.
Es un auditor, no un constructor.

QUE COMPRUEBA, Y CONTRA QUE CRITERIO
------------------------------------
A0  Integridad de la transcripcion.
    El dato tiene que ser el que dice ser antes de preguntarse si alcanza. DMS y
    decimal de cada coordenada coinciden; los ids son unicos; los vertices que
    nombran un punto notable coinciden con el catalogo.

A1  Cierre determinado (INV-3.6).
    Toda jurisdiccion con geometria prevista tiene que poder cerrarse de UNA
    sola forma. Se distingue "no cerrable" (la fuente no trae con que) de
    "ambiguo" (trae datos que admiten mas de una lectura).

A2  Vecinas en lados opuestos de la frontera que comparten.
    Dos jurisdicciones que comparten frontera no pueden quedar del mismo lado de
    ella. Se comprueba por dos vias independientes que tienen que coincidir: el
    rol declarado de la cadena y el punto que representa a cada una. Se comprueba
    ademas que dos jurisdicciones que ocupan la franja oceanica completa no se
    solapen en latitud.

A3  Ninguna mas chica que su descripcion (INV-3.6, falso negativo).
    Toda coordenada que el propio texto del decreto nombra como suya cae dentro
    de la figura que el insumo manda construir. Una que queda afuera es
    superficie decretada que la capa no cubriria: existe la restriccion, la ruta
    la cruza, y el patron no la ve.

A4  Las declaradas sin geometria son exactamente las no cerrables (INV-3.6).
    Ni una mas ni una menos. La que no cierra y no se declara es el falso
    negativo silencioso. La que se declara pudiendo cerrar es cobertura perdida
    sin motivo.

A5  Punto representativo.
    Toda jurisdiccion con geometria prevista trae el punto que la representa, y
    ese punto cae dentro de su propia figura.

A6  Adjudicacion lacustre y traslape deliberado.

COMO SE DECIDE "DE QUE LADO", Y POR QUE ASI
-------------------------------------------
rol_cadena dice que borde del poligono forma la poligonal: si el decreto dice
"por el Este la linea que...", esa linea es el borde Este y el area queda al
Weste. Esa lectura solo esta definida si la cadena corre efectivamente en el eje
que el rol nombra. La medida es el seno del angulo entre la cadena y el eje del
rol: 1 = perfectamente transversal, 0 = el rol apunta a lo largo de la cadena y
no dice nada. El corte esta en 45 grados (seno 1/raiz(2)), que no es un numero
elegido a ojo: es el punto medio exacto entre dos cardinales. Por debajo, la
cadena esta mas cerca del eje que el rol NO nombra, la letra identifica el borde
equivocado, y el lado que salga lo decide el constructor y no el decreto.

Dos controles mas, estos sin ningun umbral: la cadena tiene que ser monotona —
una que se devuelve sobre si misma no separa dos lados — y el lado que elige el
rol tiene que ser el mismo donde esta el punto que representa a la jurisdiccion.

Todo lado, en todos los controles, se mide sobre la misma normal de la cadena.
Medirlo de dos maneras distintas produce discrepancias que son del metodo y no
del dato, y eso es justo lo que una auditoria no puede permitirse.

PRINCIPIOS DE INGENIERIA
------------------------
Reproducible: solo biblioteca estandar, sin base de datos, sin shapefiles, sin
  rutas fuera del repositorio. Corre igual en cualquier maquina que clone.
Ruidoso: cada comprobacion que falla queda listada con su dato, y el proceso
  termina con codigo de salida distinto de cero. No hay resultado degradado.
Sin casos particulares: ninguna regla nombra una jurisdiccion. Todo lo que
  distingue a una de otra sale de campos del dato — ambito, rol_cadena,
  sin_georreferenciar, correccion_aplicada.

Uso, desde la raiz del repositorio:
    py scripts/fase4_auditoria_insumo.py
"""

import hashlib
import json
import math
import os
import re
import sys
from collections import defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECRETO = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
LACUSTRE = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")

# Coincidencia entre DMS y decimal: 1e-6 grados ~ 11 cm.
TOL_GRADOS = 1e-6
# "Dentro o en el borde": 1e-4 grados ~ 11 m. Por debajo es redondeo del decimal,
# no una diferencia de limite.
TOL_BORDE = 1e-4
CERO = 1e-9
# Umbral del rol. rol_cadena es una letra cardinal: nombra un eje con 90 grados
# de granularidad. Para que la letra nombre efectivamente el borde que la
# poligonal forma, la cadena tiene que estar mas cerca del eje nombrado que del
# perpendicular — o sea, el angulo entre ambos por debajo de 45 grados, que en
# seno es 1/raiz(2). Por debajo de eso la letra nombra el eje equivocado y el
# lado que se deduzca depende de como lo lea el constructor, no del decreto.
# No es una constante elegida a ojo: es el punto medio exacto entre dos cardinales.
UMBRAL_ROL = math.sqrt(0.5)

# Direccion, en el plano (Este, Norte), hacia donde queda la jurisdiccion segun
# el borde que su poligonal forma.
ROL_DIRECCION = {
    "E": (-1.0, 0.0), "NE": (-1.0, 0.0), "SE": (-1.0, 0.0),
    "W": (+1.0, 0.0), "NW": (+1.0, 0.0), "SW": (+1.0, 0.0),
    "N": (0.0, -1.0),
    "S": (0.0, +1.0),
}
NOMBRE_LADO = {(+1, "x"): "Este", (-1, "x"): "Weste",
               (+1, "y"): "Norte", (-1, "y"): "Sur"}

RE_DMS = re.compile(r"(\d{1,3})\s+(\d{1,2})\s+(\d{1,2})\s*([SWNE])\b")


# ── coordenadas ──────────────────────────────────────────────────────────────

def dms_a_dec(texto):
    """'073 32 30 W' -> -73.541667. None si el texto no es una coordenada."""
    if not texto:
        return None
    m = RE_DMS.fullmatch(texto.strip())
    if not m:
        return None
    val = int(m.group(1)) + int(m.group(2)) / 60 + int(m.group(3)) / 3600
    return -val if m.group(4) in ("S", "W") else val


def coords_del_texto(texto):
    out = []
    for m in RE_DMS.finditer(texto or ""):
        val = int(m.group(1)) + int(m.group(2)) / 60 + int(m.group(3)) / 3600
        out.append((-val if m.group(4) in ("S", "W") else val, m.group(4), m.group(0)))
    return out


def puntos_citados(texto):
    """Pares (lat, lon, literal) completos, y latitudes sueltas (lat, literal).

    Un par es una latitud seguida de una longitud. Una latitud sin longitud a
    continuacion es un paralelo limite, no un punto.
    """
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


# ── geometria de apoyo (plano local, metrico aproximado) ─────────────────────

def factor_lon(pts):
    """Un grado de longitud vale menos que uno de latitud. Sin esto, la
    orientacion de una cadena en la zona austral sale al reves."""
    return math.cos(math.radians(sum(p[1] for p in pts) / len(pts)))


def a_plano(pts):
    k = factor_lon(pts)
    return [(p[0] * k, p[1]) for p in pts], k


def direccion_y_normal(pts):
    """Direccion global de la cadena y su normal, en el plano local.

    La direccion es el desplazamiento del primer al ultimo punto. Para una
    cadena en escalera es la tendencia, no el trazo; por eso la monotonia se
    controla aparte.
    """
    plano, k = a_plano(pts)
    dx, dy = plano[-1][0] - plano[0][0], plano[-1][1] - plano[0][1]
    n = math.hypot(dx, dy)
    if n < CERO:
        return None, None, k
    d = (dx / n, dy / n)
    return d, (-d[1], d[0]), k


def eje_dominante(pts):
    """'meridional' si la cadena corre mas Norte-Sur que Este-Weste."""
    plano, _ = a_plano(pts)
    d_lat = max(p[1] for p in plano) - min(p[1] for p in plano)
    d_lon = max(p[0] for p in plano) - min(p[0] for p in plano)
    return ("meridional" if d_lat >= d_lon else "zonal"), d_lat, d_lon


def es_monotona(pts):
    """La cadena avanza siempre en el mismo sentido sobre su eje dominante.

    Una cadena que se devuelve (escalera) no parte el plano en dos lados: no hay
    'el lado Weste de la cadena'. El rol deja de significar algo.
    """
    eje, _, _ = eje_dominante(pts)
    i = 1 if eje == "meridional" else 0
    v = [p[i] for p in pts]
    sube = all(b >= a - TOL_GRADOS for a, b in zip(v, v[1:]))
    baja = all(b <= a + TOL_GRADOS for a, b in zip(v, v[1:]))
    return sube or baja


def seno_transversal(pts, rol):
    """|sin| del angulo entre la cadena y el eje del rol. 0 = el rol no elige."""
    d, n, k = direccion_y_normal(pts)
    if n is None or rol not in ROL_DIRECCION:
        return None
    vx, vy = ROL_DIRECCION[rol]
    return abs(vx * n[0] + vy * n[1])


def lado_por_rol(pts, rol):
    """Signo del lado que el rol elige, medido sobre la normal de la cadena."""
    d, n, k = direccion_y_normal(pts)
    if n is None or rol not in ROL_DIRECCION:
        return 0, 0.0
    vx, vy = ROL_DIRECCION[rol]
    s = vx * n[0] + vy * n[1]
    if abs(s) <= CERO:
        return 0, s
    return (1 if s > 0 else -1), s


def lado_de_punto(pts, lat, lon):
    """Signo del lado de la cadena donde cae un punto, sobre la misma normal."""
    d, n, k = direccion_y_normal(pts)
    if n is None:
        return 0, 0.0
    plano, _ = a_plano(pts)
    cx = sum(p[0] for p in plano) / len(plano)
    cy = sum(p[1] for p in plano) / len(plano)
    s = (lon * k - cx) * n[0] + (lat - cy) * n[1]
    if abs(s) <= TOL_BORDE:
        return 0, s
    return (1 if s > 0 else -1), s


def dentro_del_anillo(anillo, lat, lon):
    for a, b in zip(anillo, anillo[1:] + anillo[:1]):
        vx, vy = b[0] - a[0], b[1] - a[1]
        wx, wy = lon - a[0], lat - a[1]
        den = vx * vx + vy * vy
        t = 0.0 if den == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / den))
        if math.hypot(lon - (a[0] + t * vx), lat - (a[1] + t * vy)) <= TOL_BORDE:
            return True
    dentro = False
    for a, b in zip(anillo, anillo[1:] + anillo[:1]):
        if (a[1] > lat) != (b[1] > lat):
            if lon < a[0] + (lat - a[1]) * (b[0] - a[0]) / (b[1] - a[1]):
                dentro = not dentro
    return dentro


# ── lectura del insumo ───────────────────────────────────────────────────────

def cadena(cap):
    """Poligonal del decreto como (lon, lat). Descarta los puntos sin longitud:
    un punto con longitud nula dice 'por este paralelo hasta el lado abierto', y
    el lado abierto no es frontera con nadie."""
    bruto = cap.get("poligonal_completa") or cap.get("vertices") or []
    return [(v["lon"], v["lat"]) for v in bruto
            if v.get("lat") is not None and v.get("lon") is not None]


def puntos_sin_lon(cap):
    bruto = cap.get("poligonal_completa") or cap.get("vertices") or []
    return [v for v in bruto if v.get("lat") is not None and v.get("lon") is None]


def anillo_de(cap):
    """Anillo cerrado sin repetir el primer punto, o None."""
    p = cadena(cap)
    if cap["ambito"] == "antartica" or cap.get("rol_cadena") == "anillo":
        return (p[:-1] if len(p) > 1 and p[0] == p[-1] else p) or None
    if len(p) >= 4 and p[0] == p[-1]:
        return p[:-1]
    return None


def banda_lat(cap):
    """Franja [sur, norte] que acota la figura: los paralelos declarados,
    extendidos por los extremos de la poligonal cuando el decreto no da paralelo
    de ese lado. Es lo que hace la construccion al armar la caja."""
    lats = [p[1] for p in cadena(cap)]
    n, s = cap.get("limite_norte_dec"), cap.get("limite_sur_dec")
    cn = ([n] if n is not None else []) + lats
    cs = ([s] if s is not None else []) + lats
    if not cn or not cs:
        return None
    return (min(cs), max(cn))


def punto_interior(cap):
    pi = cap.get("punto_interior")
    if not pi or pi.get("lat") is None or pi.get("lon") is None:
        return None
    return (pi["lat"], pi["lon"])


# ── A1: clasificacion del cierre ─────────────────────────────────────────────

def clasificar(cap, cuerpos_lac):
    """(receta, estado, causa). estado: cerrable | ambiguo | no_cerrable."""
    amb, pts, rol = cap["ambito"], cadena(cap), cap.get("rol_cadena")

    if amb == "lacustre":
        fids = [f for c in cuerpos_lac.get(cap["id"], [])
                for f in (c.get("shapefile_fid") or [])]
        if not fids:
            return "union_cuerpos", "no_cerrable", "sin cuerpos de agua adjudicados"
        return "union_cuerpos", "cerrable", None

    if amb == "insular_remota":
        return "-", "no_cerrable", ("el decreto nombra islas sin coordenadas y el "
                                    "insumo no trae geometria de islas")

    anillo = anillo_de(cap)
    if anillo is not None:
        if len(anillo) < 3:
            return "anillo", "no_cerrable", f"anillo con {len(anillo)} punto(s), se necesitan 3"
        return "anillo", "cerrable", None

    if rol:
        if len(pts) < 2:
            return f"rol_{rol}", "no_cerrable", f"la poligonal trae {len(pts)} punto(s) con longitud"
        if rol not in ROL_DIRECCION:
            return f"rol_{rol}", "ambiguo", f"rol_cadena '{rol}' no tiene lado definido"
        franja = banda_lat(cap)
        if franja is None or franja[1] - franja[0] <= TOL_BORDE:
            return f"rol_{rol}", "no_cerrable", "la franja de latitud resultante tiene altura cero"
        seno = seno_transversal(pts, rol)
        if seno is None:
            return f"rol_{rol}", "ambiguo", f"rol '{rol}' sin direccion asociada"
        if seno < UMBRAL_ROL:
            grados = math.degrees(math.asin(min(1.0, seno)))
            return (f"rol_{rol}", "ambiguo",
                    f"el rol '{rol}' apunta a {grados:.0f}° de la propia cadena "
                    f"(seno {seno:.4f}, umbral {UMBRAL_ROL:.4f} = 45°): la poligonal "
                    f"corre mas cerca del eje que el rol NO nombra, asi que la letra "
                    f"no identifica el borde y el lado que salga depende de como lo lea "
                    f"el constructor, no del decreto")
        if not es_monotona(pts):
            eje, _, _ = eje_dominante(pts)
            return (f"rol_{rol}", "ambiguo",
                    f"la poligonal se devuelve sobre su eje {eje} (cadena en escalera): "
                    f"no define 'un lado', y el rol '{rol}' no basta para decidir que "
                    f"trozo es la jurisdiccion")
        if puntos_sin_lon(cap) and not (cap.get("cierre") or ""):
            return (f"rol_{rol}", "ambiguo",
                    f"{len(puntos_sin_lon(cap))} punto(s) sin longitud y sin campo "
                    f"'cierre' que declare a que lado abierto se llevan")
        return f"rol_{rol}", "cerrable", None

    n, s = cap.get("limite_norte_dec"), cap.get("limite_sur_dec")
    if n is not None and s is not None and not pts:
        return "banda_paralelos", "cerrable", None

    falta = ("limite sur" if n is not None else
             "limite norte" if s is not None else "ambos paralelos")
    if pts:
        return ("-", "no_cerrable",
                f"trae {len(pts)} vertice(s) pero ni anillo cerrado ni rol_cadena que "
                f"diga de que lado queda la jurisdiccion; ademas falta {falta}")
    return "-", "no_cerrable", f"el decreto no entrega con que cerrar: falta {falta}"


def dentro_de_la_figura(cap, receta, estado, lat, lon):
    """(veredicto, motivo). veredicto: 'dentro' | 'fuera' | 'no_evaluable'.

    Solo mira lo que el insumo determina: la franja de latitud y el lado de la
    cadena. No mira la costa ni el limite exterior — esas capas solo pueden
    RECORTAR, nunca meter adentro lo que la receta dejo afuera.
    """
    if receta == "anillo":
        anillo = anillo_de(cap)
        if anillo is None or len(anillo) < 3:
            return "no_evaluable", "anillo incompleto"
        if not dentro_del_anillo(anillo, lat, lon):
            return "fuera", "fuera del anillo de vertices"
        return "dentro", None

    franja = banda_lat(cap)
    if franja is not None:
        sur, norte = franja
        if lat < sur - TOL_BORDE:
            return "fuera", f"al Sur del limite sur de la figura ({sur:.6f})"
        if lat > norte + TOL_BORDE:
            return "fuera", f"al Norte del limite norte de la figura ({norte:.6f})"

    if receta.startswith("rol_"):
        rol = receta[4:]
        pts = cadena(cap)
        if rol not in ROL_DIRECCION or len(pts) < 2:
            return "no_evaluable", "sin rol utilizable"
        if estado == "ambiguo":
            return "no_evaluable", "el cierre de esta jurisdiccion es ambiguo (ver A1)"
        # Un punto que es vertice de la propia poligonal esta en el borde.
        for lo, la in pts:
            if abs(lo - lon) <= TOL_BORDE and abs(la - lat) <= TOL_BORDE:
                return "dentro", None
        # Los dos lados se miden sobre la MISMA normal de la cadena; comparar dos
        # medidas distintas daria discrepancias que son del metodo, no del dato.
        esperado, _ = lado_por_rol(pts, rol)
        real, _ = lado_de_punto(pts, lat, lon)
        if esperado == 0:
            return "no_evaluable", "el rol no elige lado sobre esta cadena"
        if real != 0 and real != esperado:
            vx, vy = ROL_DIRECCION[rol]
            k = "x" if vx != 0 else "y"
            hacia = NOMBRE_LADO[((1 if (vx if k == "x" else vy) > 0 else -1), k)]
            return "fuera", (f"del lado opuesto de la poligonal al que el rol '{rol}' "
                             f"asigna la jurisdiccion (hacia el {hacia})")
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

    def fallo(self, control, detalle):
        self.fallos[control].append(detalle)
        self.p(f"  FALLA  {detalle}")

    def aviso(self, s):
        self.p(f"  aviso  {s}")

    def ok(self, s):
        self.p(f"  ok     {s}")


def main():
    inf = Informe()
    dec = json.load(open(DECRETO, encoding="utf-8"))
    lac = json.load(open(LACUSTRE, encoding="utf-8"))
    caps = dec["capitanias"]
    cuerpos_lac = {j["id"]: j.get("cuerpos", []) for j in lac["jurisdicciones"]}
    notables = {p["nombre"]: p for p in dec.get("puntos_notables", [])}

    inf.p("FASE 4 — ETAPA A. AUDITORIA DEL INSUMO DE JURISDICCIONES")
    inf.p(f"insumo   : {os.path.relpath(DECRETO, REPO)}")
    inf.p(f"lacustre : {os.path.relpath(LACUSTRE, REPO)}")
    inf.p(f"fuente   : {dec['fuente']}")
    inf.p(f"generado : {dec.get('generado')}")
    inf.p("No escribe en la base de datos ni deja geometria persistida.")
    inf.p("")
    inf.p("Huellas de lo auditado, para que este informe se pueda volver a producir")
    inf.p("identico y se sepa contra que version del dato se dijo lo que se dice:")
    for ruta in (DECRETO, LACUSTRE, os.path.abspath(__file__)):
        h = hashlib.sha256(open(ruta, "rb").read()).hexdigest()[:16]
        inf.p(f"  sha256[:16] {h}  {os.path.relpath(ruta, REPO)}")

    # ── A0 ───────────────────────────────────────────────────────────────────
    inf.h("A0 — INTEGRIDAD DE LA TRANSCRIPCION")

    ids = [c["id"] for c in caps]
    if len(ids) != len(set(ids)):
        inf.fallo("A0", f"ids repetidos: {sorted({i for i in ids if ids.count(i) > 1})}")
    else:
        inf.ok(f"{len(ids)} ids unicos")

    obl = ("id", "nombre", "gobernacion", "ambito", "participa_matching", "texto_decreto")
    falt = [(c.get("nombre", c.get("id")), k) for c in caps for k in obl if k not in c]
    for n, k in falt:
        inf.fallo("A0", f"{n}: falta el campo obligatorio '{k}'")
    if not falt:
        inf.ok("todas traen los campos obligatorios")

    des = []
    for c in caps:
        for campo in ("limite_norte", "limite_sur"):
            d, v = dms_a_dec(c.get(f"{campo}_dms")), c.get(f"{campo}_dec")
            if d is not None and v is not None and abs(d - v) > TOL_GRADOS:
                des.append(f"{c['nombre']}.{campo}: DMS '{c[campo + '_dms']}' = {d:.6f} "
                           f"pero el decimal dice {v:.6f}")
        for campo in ("poligonal_completa", "vertices"):
            for v in (c.get(campo) or []):
                for eje in ("lat", "lon"):
                    d = dms_a_dec(v.get(f"{eje}_dms"))
                    if d is not None and v.get(eje) is not None and abs(d - v[eje]) > TOL_GRADOS:
                        des.append(f"{c['nombre']}.{campo}.{eje}: DMS '{v[eje + '_dms']}' "
                                   f"= {d:.6f} pero el decimal dice {v[eje]:.6f}")
    for d in des:
        inf.fallo("A0", d)
    if not des:
        inf.ok("DMS y decimal coinciden en toda coordenada que trae ambos")

    fuera = [f"{c['nombre']}: vertice ({lat}, {lon}) fuera del ambito geografico de "
             f"Chile y su territorio antartico"
             for c in caps for lon, lat in cadena(c)
             if not (-90 <= lat <= -17) or not (-180 <= lon <= -50)]
    for f in fuera:
        inf.fallo("A0", f)
    if not fuera:
        inf.ok("todo vertice cae en el ambito geografico esperado")

    disc = []
    for c in caps:
        for v in (c.get("vertices") or []):
            pn = notables.get(v.get("nombre"))
            if not pn:
                continue
            for eje in ("lat", "lon"):
                a, b = v.get(eje), pn.get(eje)
                if a is not None and b is not None and abs(a - b) > TOL_GRADOS:
                    disc.append(f"{c['nombre']}: vertice '{v['nombre']}' {eje}={a:.6f} "
                                f"pero puntos_notables dice {b:.6f}")
    for d in disc:
        inf.fallo("A0", d)
    if not disc:
        inf.ok("los vertices que nombran un punto notable coinciden con el catalogo")

    abiertos = [c["nombre"] for c in caps if c["ambito"] == "antartica"
                and cadena(c) and cadena(c)[0] != cadena(c)[-1]]
    if abiertos:
        inf.aviso(f"anillos transcritos sin repetir el primer punto al final: "
                  f"{abiertos}. Cierran igual, pero conviven con otros que si lo "
                  f"repiten: transcripcion no uniforme.")

    # Las dos listas de puntos tienen que decir lo mismo. La construccion usa
    # poligonal_completa cuando existe; un vertice que solo esta en 'vertices' se
    # pierde sin que nadie avise, y con el se pierde el trozo que ese vertice
    # delimita.
    huerfanos = []
    for c in caps:
        pc = c.get("poligonal_completa")
        if not pc:
            continue
        en_pc = {(round(v["lon"], 6), round(v["lat"], 6)) for v in pc
                 if v.get("lat") is not None and v.get("lon") is not None}
        for v in (c.get("vertices") or []):
            if v.get("lat") is None or v.get("lon") is None:
                continue
            if (round(v["lon"], 6), round(v["lat"], 6)) in en_pc:
                continue
            pts = cadena(c)
            d = min(math.hypot((v["lon"] - lo) * factor_lon(pts), v["lat"] - la)
                    for lo, la in pts)
            en_cierre = (v.get("nombre") or "~") in (c.get("cierre") or "")
            huerfanos.append(
                f"{c['nombre']}: el vertice '{v.get('nombre')}' "
                f"({v['lat']:.6f}, {v['lon']:.6f}) esta en 'vertices' pero NO en "
                f"'poligonal_completa'; dista {d * 111.19:.1f} km del punto mas cercano "
                f"de la poligonal"
                f"{'; el campo cierre lo nombra en prosa' if en_cierre else ''}. La "
                f"construccion lee poligonal_completa: ese punto se pierde en silencio.")
    for h in huerfanos:
        inf.fallo("A0", h)
    if not huerfanos:
        inf.ok("'vertices' y 'poligonal_completa' contienen los mismos puntos")

    # ── A1 ───────────────────────────────────────────────────────────────────
    inf.h("A1 — CIERRE DETERMINADO")

    estado, receta, causa = {}, {}, {}
    for c in caps:
        r, e, ca = clasificar(c, cuerpos_lac)
        estado[c["id"]], receta[c["id"]], causa[c["id"]] = e, r, ca

    inf.p(f"  {'JURISDICCION':<22} {'AMBITO':<15} {'RECETA':<18} ESTADO")
    inf.p("  " + "-" * 74)
    for c in caps:
        inf.p(f"  {c['nombre']:<22} {c['ambito']:<15} {receta[c['id']]:<18} {estado[c['id']]}")

    inf.p("")
    for c in caps:
        if estado[c["id"]] != "cerrable":
            inf.p(f"  [{estado[c['id']]:<12}] {c['nombre']}: {causa[c['id']]}")

    no_cerrables = {c["id"] for c in caps if estado[c["id"]] == "no_cerrable"}
    ambiguos = {c["id"] for c in caps if estado[c["id"]] == "ambiguo"}
    inf.p("")
    inf.p(f"  cerrables    : {sum(1 for c in caps if estado[c['id']] == 'cerrable')}")
    inf.p(f"  ambiguas     : {len(ambiguos)}")
    inf.p(f"  no cerrables : {len(no_cerrables)}")
    inf.p("")
    for c in caps:
        if estado[c["id"]] == "ambiguo":
            inf.fallo("A1", f"{c['nombre']}: cierre ambiguo — {causa[c['id']]}")

    inf.p("")
    inf.p("  A1.2 — capacidad del rol para elegir lado (seno del angulo entre la")
    inf.p("         cadena y el eje del rol; 1 = transversal, 0 = no elige)")
    inf.p(f"  {'JURISDICCION':<22} {'ROL':<6} {'SENO':<8} {'EJE CADENA':<12} "
          f"{'MONOTONA':<9} LECTURA")
    inf.p("  " + "-" * 84)
    for c in caps:
        rol, pts = c.get("rol_cadena"), cadena(c)
        if not rol or rol == "anillo" or len(pts) < 2:
            continue
        s = seno_transversal(pts, rol)
        eje = eje_dominante(pts)[0]
        mono = "si" if es_monotona(pts) else "NO"
        if s is None:
            lectura = "rol sin direccion"
        elif s < UMBRAL_ROL:
            lectura = (f"NO NOMBRA ESTE BORDE: {math.degrees(math.asin(min(1.0, s))):.0f}° "
                       f"de la cadena")
        else:
            lectura = f"transversal ({math.degrees(math.asin(min(1.0, s))):.0f}°)"
        inf.p(f"  {c['nombre']:<22} {rol:<6} {(f'{s:.4f}' if s is not None else '-'):<8} "
              f"{eje:<12} {mono:<9} {lectura}")

    inf.p("")
    inf.p("  A1.3 — poligonales que desbordan su paralelo limite declarado")
    inf.p("         El paralelo rige un lado y la poligonal otro; que la poligonal lo")
    inf.p("         cruce suele ser correcto. Pero la construccion estira la caja hasta")
    inf.p("         el extremo de la poligonal, de modo que la figura queda mas grande")
    inf.p("         que el paralelo declarado. Es 'de mas', no 'de menos' (INV-3.4), y")
    inf.p("         por eso es aviso y no fallo — pero es convencion nuestra y tiene")
    inf.p("         que quedar registrada como tal, no ocurrir en silencio.")
    desborde = []
    for c in caps:
        pts = cadena(c)
        if not pts:
            continue
        lats = [p[1] for p in pts]
        n, s = c.get("limite_norte_dec"), c.get("limite_sur_dec")
        if n is not None and max(lats) > n + TOL_BORDE:
            desborde.append(f"{c['nombre']}: la poligonal llega a {max(lats):.6f} y el "
                            f"limite norte declarado es {n:.6f} ('{c.get('limite_norte_dms')}')")
        if s is not None and min(lats) < s - TOL_BORDE:
            desborde.append(f"{c['nombre']}: la poligonal llega a {min(lats):.6f} y el "
                            f"limite sur declarado es {s:.6f} ('{c.get('limite_sur_dms')}')")
    for d in desborde:
        inf.aviso(d)
    if not desborde:
        inf.ok("ninguna poligonal desborda su paralelo limite declarado")

    inf.p("")
    inf.p("  A1.4 — rol_cadena contra el cardinal que usa su propia cita")
    CARD = {"norte": "N", "sur": "S", "este": "E", "weste": "W", "oeste": "W"}
    sin_resp = []
    for c in caps:
        rol, cita = c.get("rol_cadena"), (c.get("cita_rol_decreto") or "")
        if not rol or rol == "anillo" or not cita:
            continue
        m = re.search(r"[Pp]or el (Norte|Sur|Este|Weste|Oeste)", cita)
        if not m:
            continue
        card = CARD[m.group(1).lower()]
        if card not in rol:
            sin_resp.append(f"{c['nombre']}: rol_cadena='{rol}' pero su cita introduce "
                            f"la poligonal con 'Por el {m.group(1)}' (=> '{card}'). "
                            f"Rol y cita no concuerdan.")
    for s in sin_resp:
        inf.fallo("A1", s)
    if not sin_resp:
        inf.ok("todo rol_cadena concuerda con el cardinal de su cita")

    # ── A2 ───────────────────────────────────────────────────────────────────
    inf.h("A2 — VECINAS EN LADOS OPUESTOS DE LA FRONTERA QUE COMPARTEN")

    inf.p("  A2.1 — dos que ocupan la franja oceanica completa no pueden solaparse")
    inf.p("         en latitud")
    bandas = [c for c in caps if receta[c["id"]] == "banda_paralelos"]
    sol = []
    for i, a in enumerate(bandas):
        for b in bandas[i + 1:]:
            fa, fb = banda_lat(a), banda_lat(b)
            d = min(fa[1], fb[1]) - max(fa[0], fb[0])
            if d > TOL_BORDE:
                sol.append(f"{a['nombre']} [{fa[0]:.6f}, {fa[1]:.6f}] y {b['nombre']} "
                           f"[{fb[0]:.6f}, {fb[1]:.6f}] se solapan {d:.6f} grados")
    for s in sol:
        inf.fallo("A2", s)
    if not sol:
        inf.ok(f"{len(bandas)} jurisdicciones de banda, ninguna se solapa en latitud")

    inf.p("")
    inf.p("  A2.1 bis — cobertura en latitud del litoral continental, sumando TODA")
    inf.p("             jurisdiccion maritima con franja determinable")
    tramos = sorted((banda_lat(c) for c in caps
                     if c["ambito"] == "maritima" and banda_lat(c) is not None),
                    key=lambda t: -t[1])
    unido, huecos = [], []
    for s_, n_ in tramos:
        if unido and s_ <= unido[-1][1] + TOL_BORDE:
            unido[-1] = (min(unido[-1][0], s_), max(unido[-1][1], n_))
        else:
            unido.append((s_, n_))
    for a, b in zip(unido, unido[1:]):
        huecos.append(f"entre la latitud {a[0]:.6f} y {b[1]:.6f} "
                      f"({a[0] - b[1]:.6f} grados) ninguna jurisdiccion maritima con "
                      f"franja determinable cubre el litoral")
    for h in huecos:
        inf.fallo("A2", h)
    if not huecos:
        inf.ok(f"cobertura continua entre {unido[0][1]:.6f} y {unido[-1][0]:.6f}")

    inf.p("")
    inf.p("  A2.2 — pares que comparten 2 o mas vertices")
    seqs = {c["id"]: cadena(c) for c in caps if cadena(c)}
    pares = []
    for i, a in enumerate(caps):
        for b in caps[i + 1:]:
            sa, sb = seqs.get(a["id"]), seqs.get(b["id"])
            if not sa or not sb:
                continue
            sbs, vistos, com = set(sb), set(), []
            for p in sa:
                if p in sbs and p not in vistos:
                    vistos.add(p)
                    com.append(p)
            if len(com) >= 2:
                pares.append((a, b, com))

    if not pares:
        inf.fallo("A2", "ningun par comparte vertices: no hay frontera que verificar")
    inf.p(f"  {len(pares)} pares comparten frontera explicita en el insumo")
    inf.p("")
    inf.p(f"  {'VECINA A':<21} {'VECINA B':<21} {'V':<3} {'ROL A':<7} {'ROL B':<7} "
          f"{'POR ROL':<14} POR PUNTO")
    inf.p("  " + "-" * 100)
    pend = []
    for a, b, com in pares:
        ra, rb = a.get("rol_cadena"), b.get("rol_cadena")
        # Mismo umbral que A1: sobre ESTA frontera, la letra tiene que nombrar el
        # borde que la frontera forma, no el perpendicular.
        la, sa_rol = lado_por_rol(com, ra) if ra in ROL_DIRECCION else (0, 0.0)
        lb, sb_rol = lado_por_rol(com, rb) if rb in ROL_DIRECCION else (0, 0.0)
        if not (ra in ROL_DIRECCION and rb in ROL_DIRECCION):
            v_rol = "n/a"
        elif abs(sa_rol) < UMBRAL_ROL or abs(sb_rol) < UMBRAL_ROL:
            v_rol = "NO NOMBRA"
        else:
            v_rol = "opuestos" if la != lb else "MISMO LADO"

        pa, pb = punto_interior(a), punto_interior(b)
        if pa is None or pb is None:
            v_pi = "n/a (sin punto)"
        else:
            sa_, _ = lado_de_punto(com, pa[0], pa[1])
            sb_, _ = lado_de_punto(com, pb[0], pb[1])
            if sa_ == 0 or sb_ == 0:
                v_pi = "sobre la frontera"
            else:
                v_pi = "opuestos" if sa_ != sb_ else "MISMO LADO"

        inf.p(f"  {a['nombre']:<21} {b['nombre']:<21} {len(com):<3} {str(ra):<7} "
              f"{str(rb):<7} {v_rol:<14} {v_pi}")

        if v_rol == "MISMO LADO":
            pend.append(f"{a['nombre']} y {b['nombre']} comparten {len(com)} vertices y "
                        f"sus roles ('{ra}' y '{rb}') las dejan del MISMO lado de esa "
                        f"frontera")
        if v_rol == "NO NOMBRA":
            pend.append(f"{a['nombre']} y {b['nombre']} comparten {len(com)} vertices y "
                        f"al menos uno de sus roles ('{ra}' a {abs(sa_rol):.2f}, '{rb}' a "
                        f"{abs(sb_rol):.2f} de transversalidad) no nombra el borde que esa "
                        f"frontera forma: no puede elegir lado sobre ella")
        if v_pi == "MISMO LADO":
            pend.append(f"{a['nombre']} y {b['nombre']} comparten {len(com)} vertices y "
                        f"sus puntos representativos caen del MISMO lado de esa frontera")
        if v_rol == "opuestos" and v_pi == "MISMO LADO":
            pend.append(f"{a['nombre']} y {b['nombre']}: el rol y el punto se contradicen "
                        f"sobre la misma frontera")
    inf.p("")
    for d in pend:
        inf.fallo("A2", d)
    if not pend:
        inf.ok("toda vecina queda del lado opuesto de la frontera que comparte")

    # ── A3 ───────────────────────────────────────────────────────────────────
    inf.h("A3 — NINGUNA MAS CHICA QUE SU DESCRIPCION EN EL DECRETO")
    inf.p("  Toda coordenada que el texto nombra como propia tiene que caer dentro de")
    inf.p("  la figura que el insumo manda construir. La que queda afuera es superficie")
    inf.p("  decretada que la capa no cubriria: falso negativo silencioso.")
    inf.p("")

    afuera, no_eval, corregidas = [], [], []
    for c in caps:
        if estado[c["id"]] == "no_cerrable" or receta[c["id"]] == "union_cuerpos":
            continue
        corr = c.get("correccion_aplicada") or ""
        pares_txt, sueltas = puntos_citados(c["texto_decreto"])
        for lat, lon, lit in pares_txt:
            v, motivo = dentro_de_la_figura(c, receta[c["id"]], estado[c["id"]], lat, lon)
            if v == "fuera":
                if any(t.strip() in corr for t in lit.split("/")):
                    corregidas.append((c["nombre"], lit))
                else:
                    afuera.append((c["nombre"], lit, motivo))
            elif v == "no_evaluable":
                no_eval.append((c["nombre"], lit, motivo))
        franja = banda_lat(c)
        if franja is None:
            continue
        for lat, lit in sueltas:
            if franja[0] - TOL_BORDE <= lat <= franja[1] + TOL_BORDE:
                continue
            if lit in corr:
                corregidas.append((c["nombre"], lit))
                continue
            donde = "Sur" if lat < franja[0] else "Norte"
            lim = franja[0] if lat < franja[0] else franja[1]
            afuera.append((c["nombre"], lit,
                           f"paralelo citado al {donde} del limite {donde.lower()} de la "
                           f"figura ({lim:.6f})"))

    for n, lit, motivo in afuera:
        inf.fallo("A3", f"{n}: el decreto cita '{lit}' y la figura lo deja afuera — {motivo}")
    if not afuera:
        inf.ok("ninguna figura deja afuera una coordenada que su propio texto cita")

    if corregidas:
        inf.p("")
        inf.p("  Citas fuera de la figura amparadas por una correccion registrada "
              "(INV-3.7):")
        for n, lit in corregidas:
            c = next(x for x in caps if x["nombre"] == n)
            inf.p(f"    {n} — '{lit}': {c['correccion_aplicada']}")

    if no_eval:
        inf.p("")
        inf.p("  Citas que no se pueden evaluar porque el cierre es ambiguo (ver A1):")
        for n, lit, motivo in no_eval:
            inf.p(f"    {n} — '{lit}': {motivo}")

    if afuera:
        inf.p("")
        inf.p("  Texto literal de las afectadas, para que el owner adjudique:")
        for n in dict.fromkeys(n for n, _, _ in afuera):
            c = next(x for x in caps if x["nombre"] == n)
            inf.p(f"    {n}: {c['texto_decreto']}")

    # ── A4 ───────────────────────────────────────────────────────────────────
    inf.h("A4 — LAS DECLARADAS SIN GEOMETRIA SON EXACTAMENTE LAS NO CERRABLES")

    declaradas = {c["id"] for c in caps if c.get("sin_georreferenciar")}
    inf.p(f"  declaradas sin georreferenciar : {len(declaradas):>2}  {sorted(declaradas)}")
    inf.p(f"  no cerrables desde la fuente   : {len(no_cerrables):>2}  {sorted(no_cerrables)}")
    inf.p(f"  ambiguas (cierre no unico)     : {len(ambiguos):>2}  {sorted(ambiguos)}")
    inf.p("")

    for cid in sorted(no_cerrables - declaradas):
        c = next(x for x in caps if x["id"] == cid)
        inf.fallo("A4", f"{c['nombre']}: no cierra con la fuente y NO esta declarada "
                        f"(sin_georreferenciar=false, participa_matching="
                        f"{str(c['participa_matching']).lower()}). Falso negativo "
                        f"silencioso — INV-3.6. Causa: {causa[cid]}")
    for cid in sorted(declaradas - no_cerrables):
        c = next(x for x in caps if x["id"] == cid)
        inf.fallo("A4", f"{c['nombre']}: declarada sin georreferenciar pero la fuente si "
                        f"permite cerrarla ({receta[cid]}). Cobertura perdida sin motivo.")
    if not (no_cerrables ^ declaradas):
        inf.ok("los dos conjuntos coinciden exactamente")

    inf.p("")
    inf.p("  Banderas de una jurisdiccion que quedara sin geometria (INV-3.6):")
    algo = False
    for cid in sorted(no_cerrables):
        c = next(x for x in caps if x["id"] == cid)
        probl = []
        if c["participa_matching"]:
            probl.append("participa_matching=true")
        if not c.get("motivo_exclusion"):
            probl.append("sin motivo_exclusion que declarar al patron")
        if probl:
            algo = True
            inf.fallo("A4", f"{c['nombre']}: quedara sin geometria y {', '.join(probl)}")
    if not algo:
        inf.ok("toda la que quedara sin geometria lo declara y no participa del matching")

    # ── A5 ───────────────────────────────────────────────────────────────────
    inf.h("A5 — PUNTO REPRESENTATIVO")
    inf.p("  Sin punto no hay con que comprobar, en la Etapa B, que cada jurisdiccion")
    inf.p("  contiene al punto que la representa.")
    inf.p("")

    sin_punto, fuera_de_si, sin_evaluar = [], [], []
    for c in caps:
        if estado[c["id"]] == "no_cerrable":
            continue
        pi = punto_interior(c)
        if pi is None:
            sin_punto.append(c)
            continue
        if receta[c["id"]] == "union_cuerpos":
            continue
        v, motivo = dentro_de_la_figura(c, receta[c["id"]], estado[c["id"]], pi[0], pi[1])
        if v == "fuera":
            fuera_de_si.append((c["nombre"], pi, motivo))
        elif v == "no_evaluable":
            sin_evaluar.append((c["nombre"], pi, motivo))

    for c in sin_punto:
        inf.fallo("A5", f"{c['nombre']} ({c['ambito']}, receta {receta[c['id']]}): tendra "
                        f"geometria y no trae punto_interior")
    for n, pi, motivo in fuera_de_si:
        inf.fallo("A5", f"{n}: su punto representativo ({pi[0]}, {pi[1]}) cae fuera de su "
                        f"propia figura — {motivo}")
    if sin_evaluar:
        inf.p("")
        for n, pi, motivo in sin_evaluar:
            inf.aviso(f"{n}: punto ({pi[0]}, {pi[1]}) no evaluable — {motivo}")
    if not sin_punto and not fuera_de_si:
        inf.ok("toda jurisdiccion con geometria prevista trae su punto y lo contiene")

    inf.p("")
    inf.p("  Origen declarado de los puntos representativos:")
    origenes = defaultdict(int)
    for c in caps:
        pi = c.get("punto_interior")
        if pi:
            origenes[(pi.get("origen") or "sin origen declarado")[:70]] += 1
    for o, n in sorted(origenes.items(), key=lambda x: -x[1]):
        inf.p(f"    {n:>3}  {o}")

    # ── A6 ───────────────────────────────────────────────────────────────────
    inf.h("A6 — ADJUDICACION LACUSTRE Y TRASLAPE DELIBERADO")

    delib = lac.get("traslape_deliberado") or {}
    inf.p(f"  traslapes declarados como deliberados: {len(delib)}")
    for nombre, d in delib.items():
        inf.p(f"    {nombre} -> {d['jurisdicciones']}")
        inf.p(f"      motivo: {d['motivo']}")

    asignado = defaultdict(list)
    for jid, cuerpos in cuerpos_lac.items():
        for c in cuerpos:
            for fid in (c.get("shapefile_fid") or []):
                asignado[fid].append((jid, c["nombre_decreto"]))
    compartidos = {f: v for f, v in asignado.items() if len(v) > 1}
    nombres_delib = {n.strip().lower() for n in delib}
    malos = [f for f, v in compartidos.items()
             if not ({n.strip().lower() for _, n in v} & nombres_delib)]
    for f in sorted(malos):
        inf.fallo("A6", f"cuerpo fid={f} asignado a {[x[0] for x in asignado[f]]} sin "
                        f"estar declarado como traslape deliberado")
    if compartidos and not malos:
        inf.ok(f"los {len(compartidos)} cuerpo(s) compartido(s) estan todos declarados")

    inf.p("")
    sin_fid = [(jid, c["nombre_decreto"], c.get("resolucion"))
               for jid, cuerpos in cuerpos_lac.items() for c in cuerpos
               if not (c.get("shapefile_fid") or [])]
    inf.p(f"  cuerpos nombrados por el decreto sin geometria adjudicada: {len(sin_fid)}")
    for jid, n, res in sin_fid:
        if res in ("ausente", "rechazado"):
            inf.ok(f"{jid}: '{n}' — {res}")
        else:
            inf.fallo("A6", f"{jid}: cuerpo '{n}' sin geometria y sin resolucion que lo "
                            f"declare (resolucion={res})")

    # ── veredicto ────────────────────────────────────────────────────────────
    inf.h("VEREDICTO DE LA ETAPA A")
    total = sum(len(v) for v in inf.fallos.values())
    for k in sorted(inf.fallos):
        inf.p(f"  {k}: {len(inf.fallos[k])} fallo(s)")
    inf.p("")
    if total == 0:
        inf.p("  AUDITORIA LIMPIA. El insumo permite construir una capa correcta.")
        inf.p("  No se construye nada: la Etapa B requiere autorizacion del owner.")
        return 0

    inf.p(f"  AUDITORIA NO LIMPIA — {total} fallo(s) en {len(inf.fallos)} control(es).")
    inf.p("  NO se construye. Los fallos que implican decidir que dice el decreto son")
    inf.p("  del owner; este script no corrige la fuente.")
    inf.p("")
    for k in sorted(inf.fallos):
        for d in inf.fallos[k]:
            inf.p(f"  [{k}] {d}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
