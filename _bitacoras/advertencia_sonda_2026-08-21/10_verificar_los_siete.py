# -*- coding: utf-8 -*-
"""
MEDICION 5 — LOS 7 REGISTROS, UNO POR UNO, CONTRA EL TEXTO FUENTE.

La spec del router lo pedia y nadie lo habia corrido:
  docs/TMAREA_SPEC_Router_Raster_v1.md, Sec 6.1 -- <<Dato bien extraido, campo mal
  interpretado -- verificar caso por caso contra el texto fuente antes de cargar>>.

Este instrumento es esa verificacion. Para cada uno de los 7 registros con
`sonda_canal_min_m` imprime TODAS las profundidades que el Derrotero da para esa
entrada, y contrasta el numero cargado contra la MENOR de ellas.

Unidad: REGISTRO DE PASO. Denominador: los 7 de src/config/pasos-sonda-canal.json.
Fuente: C:\\tmarea-data\\raw\\derrotero_cols_141_623.pkl (pp. 141-623).

Se corre:  py _bitacoras/advertencia_sonda_2026-08-21/10_verificar_los_siete.py
"""
import pickle
import re
import io
import os
import sys

PKL = r"C:\tmarea-data\raw\derrotero_cols_141_623.pkl"
AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "10_verificar_los_siete.txt")

# (nombre CSV, pagina, valor cargado, canal al que se atribuye, tiene geometria)
LOS_SIETE = [
    ("Paso Chocoi",               159,  5.0, "Canal Chacao",    True),
    ("Canal Tenglo",              291, 11.0, "Canal Tenglo",    True),
    ("Canal Cruces",              388,  6.6, "Canal Cruces",    False),
    ("Canal Pilcomayo. Acceso W", 482,  9.5, "Canal Moraleda",  True),
    ("Paso Galvarino",            519, 10.0, "Paso Galvarino",  False),
    ("Canal Pilcomayo",           538,  9.5, "Canal Pilcomayo", False),
    ("Paso De Vidts",             574, 12.5, "Paso Vidts",      False),
]

# Toda cifra seguida de "metro/metros", tolerando el guion de corte de linea del
# OCR ("profun- didad") y el numero de columna que se cuela en medio.
CIFRA_M = re.compile(r"(\d{1,3}(?:[.,]\d+)?)\s*(?:\d+\s+)?metros?\b", re.IGNORECASE)
# LOS RANGOS: en "de 5 a 27 metros de profundidad" solo el 27 va pegado a
# `metros`, asi que CIFRA_M sola ve el extremo ALTO y pierde el bajo — que es
# justo el que interesa. Medido: sin esto, Paso Chocoi salia "SUBESTIMA en 22 m"
# cuando su 5.0 es correcto. Un instrumento que corre y mide otra cosa.
RANGO_M = re.compile(r"de\s+(\d{1,3}(?:[.,]\d+)?)\s*a\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:\d+\s+)?metros?\b", re.IGNORECASE)
# Solo nos interesan las que hablan de fondo, no de las fichas de muelle.
# `ancho` NO va en la lista de exclusion: el Derrotero da el ancho en cables o
# millas, y cuando aparece en la misma frase que la profundidad ("tiene 1,6
# millas de ancho y de 5 a 27 metros de profundidad") excluir por esa palabra
# tira el dato bueno. Se midio: con `ancho` en la lista, Paso Chocoi salia
# NO VERIFICABLE.
CTX_FONDO = re.compile(r"profun|sonda|fondo|braza", re.IGNORECASE)
CTX_NO_FONDO = re.compile(r"eslora|manga|calado\s+m[aá]ximo|UKC", re.IGNORECASE)

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

say("MEDICION 5 — LOS 7 REGISTROS CONTRA EL TEXTO FUENTE DEL DERROTERO")
say("=" * 78)
say("")
say("La verificacion caso por caso que la Sec 6.1 de la spec del router pedia")
say("ANTES de cargar, y que nadie habia corrido.")
say("")
say("Unidad: REGISTRO DE PASO. Denominador: los 7 con sonda documentada.")
say("Todas las profundidades salen del tomo cacheado, pp. 141-623.")
say("")

veredictos = []

for nombre, pagina, cargado, canal, con_geo in LOS_SIETE:
    t = re.sub(r"\s+", " ", texto(pagina))
    # EL GUION DE CORTE DE LINEA DEL OCR PARTE LAS PALABRAS: "me- tros",
    # "profun- didad", "sumer- gidas". Sin des-guionar, `metros` no matchea y el
    # registro sale NO VERIFICABLE aunque el dato este ahi. Medido: asi se caian
    # Canal Cruces (6,6 "me- tros") y Paso De Vidts (12,5). ES DEL MISMO TIPO DE
    # PUNTO CIEGO QUE TIENE EL EXTRACTOR ORIGINAL, que no des-guiona.
    t = re.sub(r"(\w)-\s+(\w)", r"\1\2", t)
    i = t.lower().find(nombre.lower())
    frag = t[i:i + 1400] if i >= 0 else t[:1400]

    say("=" * 78)
    say("%s — p.%d %s" % (nombre, pagina, "[CON GEOMETRIA — PUEDE SALIR A PANTALLA]" if con_geo else "[sin geometria — nunca sale]"))
    say("   cargado como sonda_canal_min_m : %s m" % cargado)
    say("   atribuido al canal             : %s" % canal)
    say("")

    prof = []
    for m in CIFRA_M.finditer(frag):
        ctx = frag[max(0, m.start() - 120): m.end() + 60]
        if CTX_FONDO.search(ctx) and not CTX_NO_FONDO.search(ctx[-90:]):
            val = float(m.group(1).replace(",", "."))
            prof.append((val, " ".join(ctx.split())))
    for m in RANGO_M.finditer(frag):
        ctx = frag[max(0, m.start() - 120): m.end() + 60]
        if CTX_FONDO.search(ctx) and not CTX_NO_FONDO.search(ctx[-90:]):
            prof.append((float(m.group(1).replace(",", ".")), " ".join(ctx.split())))

    if not prof:
        say("   NINGUNA profundidad reencontrada en la entrada. No se puede verificar.")
        veredictos.append((nombre, cargado, None, con_geo, "NO VERIFICABLE"))
        say("")
        continue

    say("   PROFUNDIDADES QUE EL DERROTERO DA PARA ESTA ENTRADA:")
    vistos = set()
    for val, ctx in sorted(prof):
        if val in vistos:
            continue
        vistos.add(val)
        say("     %6.1f m   ...%s..." % (val, ctx[:190]))
    say("")

    menor = min(v for v, _ in prof)
    say("   MENOR profundidad que la fuente menciona : %.1f m" % menor)
    say("   Numero cargado                           : %.1f m" % cargado)
    if abs(menor - cargado) < 0.05:
        v = "COINCIDE — el cargado ES la menor de la fuente"
    elif cargado > menor:
        v = "SOBREESTIMA en %.1f m — la fuente da una MENOR y el cargado la ignora" % (cargado - menor)
    else:
        v = "SUBESTIMA en %.1f m" % (menor - cargado)
    say("   VEREDICTO                                : %s" % v)
    say("")
    veredictos.append((nombre, cargado, menor, con_geo, v))

say("=" * 78)
say("")
say("RESUMEN")
say("")
say("   %-28s %8s %8s %-9s %s" % ("registro", "cargado", "menor", "geometria", "veredicto"))
for nombre, cargado, menor, con_geo, v in veredictos:
    say("   %-28s %8s %8s %-9s %s" % (
        nombre[:28], cargado, ("%.1f" % menor) if menor is not None else "-",
        "SI" if con_geo else "no", v.split(" —")[0]))
say("")

con_geo_mal = [x for x in veredictos if x[3] and not x[4].startswith("COINCIDE")]
say("   De los %d registros, %d tienen geometria y pueden salir a pantalla." % (len(veredictos), sum(1 for x in veredictos if x[3])))
say("   De esos, %d NO tienen el numero que la fuente da como menor." % len(con_geo_mal))
say("")
say("LO QUE ESTE CONTROL NO MIRA, Y HAY QUE SABERLO ANTES DE APOYARSE EN EL:")
say("   COMPRUEBA EL NUMERO, NO LA ATRIBUCION. `Canal Pilcomayo. Acceso W` sale")
say("   COINCIDE —9,5 es el numero que su frase da— y sin embargo esta MAL: la")
say("   frase dice <<a medio canal en su acceso E hay una sonda de 9,5 metros>>")
say("   del CANAL PILCOMAYO, y el registro la atribuye a CANAL MORALEDA, que es")
say("   otro canal, de ~200 km, y del que la misma frase dice que es <<profundo y")
say("   sin peligro>>. Un verde de este control NO es un permiso para publicar.")
say("")
say("   Tampoco mira que la profundidad sea del EJE NAVEGABLE. La cabecera de")
say("   tools/derrotero/extract_fondeaderos.py ya lo dejo escrito: <<el Derrotero")
say("   SHOA describe COMO NAVEGAR, no es una fuente de batimetria de eje>>.")
say("")
say("=" * 78)
say("FIN DE LA MEDICION 5 — VERIFICADO")

salida = "\n".join(L) + "\n"
with io.open(SALIDA, "w", encoding="utf-8") as f:
    f.write(salida)
sys.stdout.reconfigure(encoding="utf-8")
print(salida)
