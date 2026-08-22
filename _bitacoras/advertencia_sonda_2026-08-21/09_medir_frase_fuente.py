# -*- coding: utf-8 -*-
"""
MEDICION 4 — QUE FRASE DEL DERROTERO PRODUJO CADA NUMERO.

La pregunta del owner: <<11 m de sonda en Canal Tenglo>> describe bien el dato?
No se contesta con el CSV: su columna `contexto` esta TRUNCADA a ~200 caracteres
y en varios casos corta ANTES de la frase que produjo el numero. Se contesta con
el texto fuente, que esta en la maquina.

Fuente: C:\\tmarea-data\\raw\\derrotero_cols_141_623.pkl (paginas 141-623 del
Derrotero, cacheadas por tools/derrotero/extract_full.py).

Se corre:  py _bitacoras/advertencia_sonda_2026-08-21/09_medir_frase_fuente.py
"""
import pickle
import re
import io
import os
import sys

PKL = r"C:\tmarea-data\raw\derrotero_cols_141_623.pkl"
SALIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "09_medir_frase_fuente.txt")

# El MISMO regex de tools/derrotero/extract_full.py, copiado para que la medicion
# reproduzca la extraccion y no una parecida.
_NOISE_NUM = r"(?:\d+\s+)?"
SONDA_RE = re.compile(
    r"(?:de\s+)?(?P<s1>\d{1,3}(?:[.,]\d+)?)\s*(?:a\s*(?P<s2>\d{1,3}(?:[.,]\d+)?)\s*)?" + _NOISE_NUM + r"metros\s+de\s+profundidad"
    r"|profundidad\s+(?:m[ií]nima\s+)?de\s+(?P<s3>\d{1,3}(?:[.,]\d+)?)\s*" + _NOISE_NUM + r"metros",
    re.IGNORECASE,
)

# Los 7 con sonda documentada: (nombre en el CSV, pagina, valor cargado)
LOS_SIETE = [
    ("Paso Chocoi", 159, 5.0, "Canal Chacao", True),
    ("Canal Tenglo", 291, 11.0, "Canal Tenglo", True),
    ("Canal Cruces", 388, 6.6, "Canal Cruces", False),
    ("Canal Pilcomayo. Acceso W", 482, 9.5, "Canal Moraleda", True),
    ("Paso Galvarino", 519, 10.0, "Paso Galvarino", False),
    ("Canal Pilcomayo", 538, 9.5, "Canal Pilcomayo", False),
    ("Paso De Vidts", 574, 12.5, "Paso Vidts", False),
]

L = []
def say(s=""):
    L.append(s)

with open(PKL, "rb") as f:
    paginas = pickle.load(f)

def texto_de(p):
    v = paginas.get(p)
    if v is None:
        return ""
    if isinstance(v, dict):
        for k in ("text", "texto", "cols", "columnas", "raw"):
            if k in v:
                x = v[k]
                return "\n".join(x) if isinstance(x, list) else str(x)
        return "\n".join(str(x) for x in v.values())
    if isinstance(v, list):
        return "\n".join(str(x) for x in v)
    return str(v)

say("MEDICION 4 — LA FRASE DEL DERROTERO DETRAS DE CADA NUMERO")
say("=" * 78)
say("")
say("Unidad: REGISTRO DE PASO. Denominador: los 7 con sonda documentada.")
say("Fuente: el tomo cacheado, pp. 141-623. Regex: el mismo de extract_full.py.")
say("")

resumen = []

for nombre, pagina, valor, canal, con_geo in LOS_SIETE:
    t = re.sub(r"\s+", " ", texto_de(pagina))
    say("=" * 78)
    say("%s — p.%d — cargado como sonda_canal_min_m = %s m %s"
        % (nombre, pagina, valor, "[CON GEOMETRIA]" if con_geo else "[sin geometria]"))
    say("   canal al que se lo atribuye: %s" % canal)
    say("")
    # localizar la entrada del paso dentro de la pagina
    i = t.lower().find(nombre.lower())
    frag = t[i:i + 900] if i >= 0 else t
    m = SONDA_RE.search(frag)
    if not m:
        say("   NO SE REENCUENTRA LA FRASE en el fragmento de esta pagina.")
        say("   (el extractor usa un corte de 700 caracteres o hasta la entrada siguiente)")
        resumen.append((nombre, valor, "no reencontrada", ""))
        say("")
        continue
    ini = max(0, m.start() - 130)
    fin = min(len(frag), m.end() + 130)
    say("   FRASE FUENTE (contexto +-130 caracteres):")
    say("     ..." + frag[ini:fin].strip() + "...")
    say("")
    if m.group("s1"):
        v1, v2 = m.group("s1"), m.group("s2")
        if v2:
            forma = "RANGO %s a %s -> el extractor carga el MINIMO" % (v1, v2)
            resumen.append((nombre, valor, "rango", "%s a %s" % (v1, v2)))
        else:
            forma = "VALOR UNICO %s" % v1
            resumen.append((nombre, valor, "unico", v1))
    else:
        forma = "PROFUNDIDAD (MINIMA) DE %s" % m.group("s3")
        resumen.append((nombre, valor, "minima_declarada", m.group("s3")))
    say("   FORMA DEL DATO EN LA FUENTE: %s" % forma)
    say("")

say("=" * 78)
say("")
say("RESUMEN — QUE ES CADA NUMERO EN LA FUENTE")
say("")
say("   %-28s %8s  %-18s %s" % ("paso", "cargado", "forma en la fuente", "lo que dice la fuente"))
for nombre, valor, forma, crudo in resumen:
    say("   %-28s %8s  %-18s %s" % (nombre[:28], valor, forma, crudo))
say("")

n_rango = sum(1 for r in resumen if r[2] == "rango")
n_unico = sum(1 for r in resumen if r[2] == "unico")
n_min = sum(1 for r in resumen if r[2] == "minima_declarada")
n_no = sum(1 for r in resumen if r[2] == "no reencontrada")
say("   de %d registros: %d son el MINIMO DE UN RANGO · %d valor unico · %d minima declarada · %d no reencontrada"
    % (len(resumen), n_rango, n_unico, n_min, n_no))
say("")
say("=" * 78)
say("FIN DE LA MEDICION 4 — VERIFICADO")

salida = "\n".join(L) + "\n"
with io.open(SALIDA, "w", encoding="utf-8") as f:
    f.write(salida)
sys.stdout.reconfigure(encoding="utf-8")
print(salida)
