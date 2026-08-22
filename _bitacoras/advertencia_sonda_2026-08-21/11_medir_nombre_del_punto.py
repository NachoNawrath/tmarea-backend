# -*- coding: utf-8 -*-
"""
MEDICION 6 — ¿LA FUENTE NOMBRA EL PUNTO BAJO, O SOLO EL CANAL?

Pregunta del owner (2026-08-21): V2 dice <<y no precisa en que punto>>, y eso es
mas humilde de lo que el dato permite — para Canal Tenglo la fuente SI nombra el
lugar (punta Hoffmann). Lo que falta es la COORDENADA para ubicarlo en la ruta,
que no es lo mismo.

Este instrumento mide, registro por registro, si la frase que da la profundidad
trae ademas un LUGAR NOMBRADO. Denominador: los 7 con sonda documentada.

LO QUE ESTE INSTRUMENTO NO HACE, Y ES A PROPOSITO: no propone cargar el nombre
automaticamente. La medicion 5 mostro que la extraccion automatica de este tomo
se equivoca de campo; el nombre va a entrar como DATO DECLARADO por fila, leido
a mano contra la fuente, igual que la correccion de la sonda. Esto solo dice
cuantas filas tienen de donde sacarlo.

Se corre:  py _bitacoras/advertencia_sonda_2026-08-21/11_medir_nombre_del_punto.py
"""
import pickle
import re
import io
import os
import sys

PKL = r"C:\tmarea-data\raw\derrotero_cols_141_623.pkl"
AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "11_medir_nombre_del_punto.txt")

LOS_SIETE = [
    ("Paso Chocoi",               159,  5.0, True),
    ("Canal Tenglo",              291,  1.0, True),   # ya con la correccion firmada
    ("Canal Cruces",              388,  6.6, False),
    ("Canal Pilcomayo. Acceso W", 482,  9.5, True),
    ("Paso Galvarino",            519, 10.0, False),
    ("Canal Pilcomayo",           538,  9.5, False),
    ("Paso De Vidts",             574, 12.5, False),
]

# ── LA LECTURA A MANO, Y POR QUE EXISTE ESTA COLUMNA ─────────────────────────
# El regex encuentra un toponimo en la oracion y NO PUEDE SABER si ese nombre
# ubica la SONDA o ubica el PASO. Es el mismo defecto que la medicion 5 encontro
# en el extractor original —dato bien extraido, campo mal interpretado— y este
# instrumento lo repitio: dio 4 toponimos, y leyendo las oraciones solo UNO
# nombra el lugar de la sonda. Los otros tres nombran donde SE FORMA el paso.
#
# Por eso la columna de abajo es una LECTURA A MANO contra la oracion impresa
# arriba, y es la que manda. El regex queda para que se vea la diferencia.
LECTURA_A_MANO = {
    # registro: (ubica_la_sonda, nombre_para_el_patron, por_que)
    "Paso Chocoi":               (False, None, "«entre la punta Chocoi y la isla Dona Sebastiana» ubica donde SE FORMA el paso; los 5 a 27 m son del paso entero"),
    "Canal Tenglo":              (True,  "punta Hoffmann", "«frente a la punta Hoffmann, se sonda en bajamar apenas 1 metro, siendo esta la parte mas angosta y baja del canal»: el nombre ES el lugar de la sonda"),
    "Canal Cruces":              (False, None, "«casi en el eje del canal» habla de las rocas, no de la profundidad minima"),
    "Canal Pilcomayo. Acceso W": (False, None, "«a medio canal en su acceso E» ubica, pero no se senala en carta — y ademas la atribucion a Moraleda se saca"),
    "Paso Galvarino":            (False, None, "«al NE y 7,8 millas de la punta Cesari» ubica el PASO, no la sonda"),
    "Canal Pilcomayo":           (False, None, "idem Acceso W: es la misma frase, repetida en otra pagina"),
    "Paso De Vidts":             (False, None, "«punta Leopardo / islote Entrada / islote Astudillo» ubican el PASO, no la sonda"),
}

# TOPONIMO: sustantivo geografico del Derrotero + nombre propio en mayuscula.
TOPONIMO = re.compile(
    r"\b(punta|isla|islote|roca|rocas|bajo|banco|caleta|pen[ií]nsula|cabo|monte|bah[ií]a|puerto|angostura|farell[oó]n)\s+"
    r"([A-ZÁÉÍÓÚÑ][\wáéíóúñ'’-]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ'’-]+)?)")
# LOCATIVO sin nombre propio: ubica dentro del paso pero no se puede senalar en carta.
LOCATIVO = re.compile(
    r"(a medio canal|en su acceso [NSEW]{1,2}|en su parte m[aá]s angosta|"
    r"la parte m[aá]s angosta|hacia su acceso [NSEW]{1,2}|en el acceso [NSEW]{1,2}|en el eje del canal)",
    re.IGNORECASE)

L = []
def say(s=""):
    L.append(s)

paginas = pickle.load(open(PKL, "rb"))

def texto(p):
    v = paginas.get(p)
    if isinstance(v, dict):
        for k in ("text", "texto", "cols", "columnas", "raw"):
            if k in v:
                x = v[k]
                return "\n".join(x) if isinstance(x, list) else str(x)
        return "\n".join(str(x) for x in v.values())
    if isinstance(v, list):
        return "\n".join(str(x) for x in v)
    return str(v or "")

say("MEDICION 6 — ¿LA FUENTE NOMBRA EL PUNTO BAJO?")
say("=" * 78)
say("")
say("Unidad: REGISTRO DE PASO. Denominador: los 7 con sonda documentada.")
say("Se busca en la ORACION que contiene la profundidad, no en toda la entrada:")
say("un toponimo de otra frase no ubica esta sonda.")
say("")

filas = []

for nombre, pagina, valor, con_geo in LOS_SIETE:
    t = re.sub(r"\s+", " ", texto(pagina))
    t = re.sub(r"(\w)-\s+(\w)", r"\1\2", t)   # des-guionar el corte de linea del OCR
    i = t.lower().find(nombre.lower())
    frag = t[i:i + 1400] if i >= 0 else t[:1400]

    # la oracion que contiene el valor
    objetivo = ("%g" % valor).replace(".", ",")
    oracion = None
    for o in re.split(r"(?<=[.;])\s+", frag):
        if re.search(r"\b" + re.escape(objetivo) + r"\b", o) and re.search(r"profun|sonda", o, re.I):
            oracion = o
            break

    say("=" * 78)
    say("%s — p.%d — sonda %s m %s" % (nombre, pagina, valor, "[CON GEOMETRIA]" if con_geo else "[sin geometria]"))
    if not oracion:
        say("   ORACION NO AISLADA. No se mide.")
        filas.append((nombre, con_geo, "no aislada", "", False, None))
        say("")
        continue
    say("   ORACION: ..." + oracion.strip()[:250] + "...")
    tops = [" ".join(m.groups()) for m in TOPONIMO.finditer(oracion)]
    locs = [m.group(1) for m in LOCATIVO.finditer(oracion)]
    if tops:
        say("   TOPONIMO EN LA MISMA ORACION : " + " · ".join(tops))
        clase = "toponimo"
        det = tops[0]
    elif locs:
        say("   TOPONIMO                     : ninguno")
        say("   LOCATIVO (ubica, no se senala en carta): " + " · ".join(locs))
        clase = "locativo"
        det = locs[0]
    else:
        say("   NI TOPONIMO NI LOCATIVO: la fuente atribuye la sonda al paso entero.")
        clase = "solo el paso"
        det = ""
    ubica, para_el_patron, porque = LECTURA_A_MANO[nombre]
    say("   LECTURA A MANO — ¿el nombre ubica LA SONDA?: %s" % ("SI -> " + para_el_patron if ubica else "NO"))
    say("      %s" % porque)
    filas.append((nombre, con_geo, clase, det, ubica, para_el_patron))
    say("")

say("=" * 78)
say("")
say("RESUMEN")
say("")
say("   %-28s %-9s %-13s %s" % ("registro", "geometria", "que da", "detalle"))
for nombre, con_geo, clase, det, ubica, nom in filas:
    say("   %-28s %-9s %-13s %-22s %s" % (nombre[:28], "SI" if con_geo else "no", clase, det, ("SONDA -> "+nom) if ubica else "no ubica la sonda"))
say("")
n_top = sum(1 for f in filas if f[2] == "toponimo")
n_loc = sum(1 for f in filas if f[2] == "locativo")
n_solo = sum(1 for f in filas if f[2] == "solo el paso")
say("   de %d: %d con TOPONIMO · %d con LOCATIVO · %d solo el paso · %d no aisladas"
    % (len(filas), n_top, n_loc, n_solo, len(filas) - n_top - n_loc - n_solo))
say("")
say("   CON GEOMETRIA (los unicos que pueden salir a pantalla):")
for nombre, con_geo, clase, det, ubica, nom in filas:
    if con_geo:
        say("     %-28s %-12s %s" % (nombre[:28], clase, ("NOMBRA LA SONDA: "+nom) if ubica else "no nombra la sonda"))
say("")
say("CONSECUENCIA PARA LA PLANTILLA: el nombre NO esta en todas las filas, asi que")
say("la frase necesita DOS RAMAS y la rama se elige por un campo declarado por fila,")
say("nunca por un regex en tiempo de render (§4.2: ningun mapeo con caso por defecto")
say("silencioso). Una plantilla que diga <<no precisa en que punto>> para todas seria")
say("FALSA en las filas que si lo precisan — que es la correccion del owner.")
say("")
say("=" * 78)
say("FIN DE LA MEDICION 6 — VERIFICADO")

salida = "\n".join(L) + "\n"
with io.open(SALIDA, "w", encoding="utf-8") as f:
    f.write(salida)
sys.stdout.reconfigure(encoding="utf-8")
print(salida)
