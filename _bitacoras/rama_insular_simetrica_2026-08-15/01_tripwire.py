r"""
TRIPWIRE DE CONTEOS — se mide contra el v2, que es el insumo que gobierna.

  Sale de `estado_geometria`, NO de una lista recordada ni del prompt. La sesion
  del operador (_bitacoras/operador_preservetopology_2026-08-15/) fue la primera
  que lo midio asi; antes los dos pares se leian de _bitacoras/.

  Imprime TRES cosas que no son la misma y que se confunden con facilidad:
    · cerrable/no_cerrable por ambito  — el tripwire propiamente dicho
    · CUENTA de jurisdicciones por ambito — lo que mira ambitos-publicados.js:112,
      que compara contra `jurisdicciones_esperadas`. NO es el tripwire: cuenta
      filas, no estados, y por eso no se mueve cuando un estado cambia.
    · participa_matching == false — lo que gobierna zonas-aviso.js:196 y :216,
      que exigen correspondencia EXACTA con las entradas de zonas_aviso.json.

SHELL: se corre con el interprete del repo (python no esta en el PATH).
  Forma reproducible, PowerShell, desde la raiz del repositorio:

    & "tools\raster-build\.venv\Scripts\python.exe" `
      "_bitacoras\rama_insular_simetrica_2026-08-15\01_tripwire.py" `
      "_bitacoras\rama_insular_simetrica_2026-08-15\01_tripwire_antes.txt"

  El segundo argumento es la ruta de salida. Se pasa por argumento y no se
  redirige con el '>' de PowerShell, que reencoda (CLAUDE.md §7.2).
"""

import collections
import hashlib
import io
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
ZONAS = os.path.join(REPO, "data", "decreto", "zonas_aviso.json")


def sha(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def main():
    out = io.StringIO()

    def p(s=""):
        out.write(s + "\n")

    d = json.load(open(V2, encoding="utf-8"))
    J = d["jurisdicciones"]
    zonas = json.load(open(ZONAS, encoding="utf-8"))["zonas"]

    p("TRIPWIRE DE CONTEOS — medido contra el v2")
    p("=" * 78)
    p(f"  insumo : data/decreto/jurisdicciones_v2.json")
    p(f"  sha256 : {sha(V2)}")
    p(f"  total  : {len(J)} jurisdicciones")
    p("")

    p("1. CERRABLE / NO_CERRABLE POR AMBITO — el tripwire")
    p("-" * 78)
    c = collections.Counter((j["ambito"], j["estado_geometria"]) for j in J)
    for a in sorted({j["ambito"] for j in J}):
        ce = c[(a, "cerrable")]
        no = sum(v for (aa, e), v in c.items() if aa == a and e != "cerrable")
        p(f"  {a:<16} {ce:>3} cerrable / {no:>3} no_cerrable")
    ce = sum(1 for j in J if j["estado_geometria"] == "cerrable")
    p(f"  {'las ' + str(len(J)):<16} {ce:>3} cerrable / {len(J) - ce:>3} no_cerrable")
    p("")

    p("2. CUENTA DE JURISDICCIONES POR AMBITO — lo que mira ambitos-publicados.js:112")
    p("-" * 78)
    p("  No es el tripwire: cuenta FILAS, no estados. Un cambio de estado no lo mueve.")
    for a, n in sorted(collections.Counter(j["ambito"] for j in J).items()):
        p(f"  {a:<16} {n:>3}")
    p("")

    p("3. participa_matching == false — lo que gobierna zonas-aviso.js:196 y :216")
    p("-" * 78)
    pm = sorted(j["id"] for j in J if j["participa_matching"] is False)
    zi = sorted(z["jurisdiccion_id"] for z in zonas)
    p(f"  participa_matching=false : {len(pm)}")
    p(f"  entradas en zonas_aviso  : {len(zi)}")
    p(f"  correspondencia exacta   : {'SI' if pm == zi else 'NO'}")
    if pm != zi:
        p(f"    sin zona declarada : {sorted(set(pm) - set(zi))}")
        p(f"    zona sin carencia  : {sorted(set(zi) - set(pm))}")
    p(f"  ids: {', '.join(pm)}")
    p("")

    p("4. EL AMBITO insular_remota, FILA POR FILA")
    p("-" * 78)
    for j in J:
        if j["ambito"] != "insular_remota":
            continue
        p(f"  {j['id']}")
        p(f"    estado_geometria    : {j['estado_geometria']}")
        p(f"    receta              : {j['receta']}")
        p(f"    participa_matching  : {j['participa_matching']}")
        p(f"    causa_sin_geometria : {j['causa_sin_geometria']}")
    p("")

    texto = out.getvalue()
    sys.stdout.write(texto)
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8", newline="\n") as fh:
            fh.write(texto)


if __name__ == "__main__":
    main()
