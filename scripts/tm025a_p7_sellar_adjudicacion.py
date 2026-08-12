"""
P7 — RE-SELLAR adjudicacion_tramos.json CONTRA EL INSUMO ACTUAL.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\tm025a_p7_sellar_adjudicacion.py --verificar
    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\tm025a_p7_sellar_adjudicacion.py --sellar --autorizacion "..."

POR QUE ESTE SCRIPT EXISTE
  adjudicacion_tramos.json lleva la adjudicacion del owner sobre 22 tramos y
  declara contra que insumo se tomo. Ese bloque `insumo` NO LO ESCRIBIA NADIE
  —se puso a mano— y NO LO VERIFICABA NADIE, mientras el auditor si tenia el
  control equivalente para el eslabon de arriba (B0, v2 -> v1). Medido el
  2026-08-11: el sello apuntaba a un v2 (ff3e6710) que no existe en ningun
  commit del repositorio.

  Desde ahora lo escribe este script y lo verifica el control B12.

POR QUE NO SE RE-SELLA SOLO
  Se descarto explicitamente que un script re-selle el hash en cada corrida. Un
  re-sellado automatico ESCONDE el problema: el archivo dice que la decision se
  tomo mirando un insumo, y que el insumo se mueva debajo tiene que gritar, no
  taparse. Esa es la razon por la que B12 falla en vez de auto-corregirse.
  Decision del owner, 2026-08-11.

QUE COMPRUEBA ANTES DE SELLAR
  Que la adjudicacion SIGA APLICANDO. Cada uno de los 22 tramos adjudicados
  tiene que existir todavia en el v2, con las mismas coordenadas, y el tipo que
  el v2 le da tiene que ser el que el owner adjudico. Si alguno no calza, el
  sello NO se pone: significa que el insumo cambio de una forma que toca lo que
  el owner decidio, y eso vuelve al owner, no a un sello.

  Sellar sin esa comprobacion seria exactamente el re-sellado automatico que se
  descarto, con un paso mas.

MODOS
  --verificar   dice si la adjudicacion sigue aplicando y si el sello esta al
                dia. No escribe. Es el modo por defecto.
  --sellar      escribe el sello. Exige --autorizacion con el texto del owner.
"""

import argparse
import hashlib
import io
import json
import os
import sys
from datetime import date

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
ADJ = os.path.join(REPO, "data", "decreto", "adjudicacion_tramos.json")

TOL = 1e-6


class Alto(Exception):
    pass


def sha256(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def escribir_json(ruta, doc):
    crudo = open(ruta, encoding="utf-8").read()
    ls = [l for l in crudo.splitlines() if l.strip()]
    sangria = len(ls[1]) - len(ls[1].lstrip()) if len(ls) > 1 else 2
    with open(ruta, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(doc, ensure_ascii=False, indent=sangria))


def igual(a, b):
    if a is None or b is None:
        return a is None and b is None
    return abs(a - b) < TOL


def mismo_tramo(t_adj, t_v2):
    return (igual(t_adj["desde"]["lat"], t_v2["desde"]["lat"])
            and igual(t_adj["desde"]["lon"], t_v2["desde"]["lon"])
            and igual(t_adj["hasta"]["lat"], t_v2["hasta"]["lat"])
            and igual(t_adj["hasta"]["lon"], t_v2["hasta"]["lon"]))


def verificar(adj, v2):
    """Devuelve (aplican, no_encontrados, discrepantes)."""
    por_jur = {j["id"]: (j.get("tramos") or []) for j in v2["jurisdicciones"]}
    aplican, no_encontrados, discrepantes = [], [], []
    for t in adj.get("tramos", []):
        jid = t["jurisdiccion"]
        candidatos = [x for x in por_jur.get(jid, []) if mismo_tramo(t, x)]
        if not candidatos:
            no_encontrados.append(t)
            continue
        if len(candidatos) > 1:
            discrepantes.append((t, f"{len(candidatos)} tramos del v2 calzan con las "
                                    f"mismas coordenadas: la clave no identifica"))
            continue
        c = candidatos[0]
        if c.get("tipo") != t.get("tipo_adjudicado"):
            discrepantes.append((t, f"el v2 le da tipo '{c.get('tipo')}' y el owner "
                                    f"adjudico '{t.get('tipo_adjudicado')}'"))
            continue
        aplican.append(t)
    return aplican, no_encontrados, discrepantes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sellar", action="store_true")
    ap.add_argument("--verificar", action="store_true")
    ap.add_argument("--autorizacion", default=None,
                    help="texto de la autorizacion del owner; obligatorio con --sellar")
    args = ap.parse_args()
    if not args.sellar:
        args.verificar = True

    adj = json.load(open(ADJ, encoding="utf-8"))
    v2 = json.load(open(V2, encoding="utf-8"))
    sello = (adj.get("insumo") or {}).get("jurisdicciones_v2.json")
    real = sha256(V2)

    print("=" * 78)
    print("P7 — SELLO DE adjudicacion_tramos.json")
    print("=" * 78)
    print(f"  modo             : {'SELLAR' if args.sellar else 'verificar (no escribe)'}")
    print(f"  v2 en disco      : {real[:16]}")
    print(f"  sello registrado : {str(sello)[:16] if sello else '(ninguno)'}")
    print(f"  al dia           : {'SI' if sello == real else 'NO'}")
    print()

    aplican, faltan, disc = verificar(adj, v2)
    total = len(adj.get("tramos", []))
    print("¿LA ADJUDICACION SIGUE APLICANDO?")
    print(f"  tramos adjudicados por el owner : {total}")
    print(f"  siguen existiendo y con su tipo : {len(aplican)}")
    print(f"  no se encuentran en el v2       : {len(faltan)}")
    print(f"  encontrados con otro tipo       : {len(disc)}")
    for t in faltan:
        print(f"    NO ESTA  {t['nombre']:<22} "
              f"({t['desde']['lat']}, {t['desde']['lon']}) -> "
              f"({t['hasta']['lat']}, {t['hasta']['lon']})")
    for t, m in disc:
        print(f"    DISCREPA {t['nombre']:<22} {m}")
    print()

    if faltan or disc:
        raise Alto("la adjudicacion NO sigue aplicando entera. El sello no se pone: "
                   "el insumo cambio de una forma que toca lo que el owner decidio, y "
                   "eso vuelve al owner, no a un sello.")

    print("  ok  las 22 adjudicaciones siguen aplicando: mismos tramos, mismos tipos.")
    print()

    if not args.sellar:
        if sello == real:
            print("  El sello esta al dia. No hay nada que hacer.")
        else:
            print("  EL SELLO ESTA VIEJO. La adjudicacion sigue aplicando entera, asi")
            print("  que re-sellarla es seguro — pero es decision del owner, no de este")
            print("  script. Para ponerlo:")
            print()
            print('    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe \\')
            print('      scripts\\tm025a_p7_sellar_adjudicacion.py --sellar \\')
            print('      --autorizacion "<lo que el owner escriba>"')
        print("=" * 78)
        return 0

    if not args.autorizacion or not args.autorizacion.strip():
        raise Alto("--sellar exige --autorizacion con el texto del owner. Un sello sin "
                   "autorizacion es el re-sellado automatico que se descarto.")

    adj.setdefault("insumo", {})["jurisdicciones_v2.json"] = real
    # La fecha SALE DEL RELOJ, no de una constante escrita a mano. La constante ya
    # produjo el error que este bloque existe para impedir: el 2026-08-11 quedo
    # sellado con fecha 2026-08-12, o sea una constancia de adjudicacion fechada en
    # el futuro. Un sello es una afirmacion sobre cuando se autorizo algo; que
    # dependa de que alguien se acuerde de actualizar una linea es la forma segura
    # de que termine mintiendo.
    #
    # Que sea del reloj NO rompe la reproducibilidad como la rompe un `generado:
    # new Date()` en un derivado: este archivo no se regenera, se escribe UNA VEZ
    # por cada autorizacion explicita del owner. La fecha es un hecho de cuando
    # ocurrio, no un valor derivado que deba dar igual en cada corrida.
    adj["sellado"] = {
        "fecha": date.today().isoformat(),
        "autorizacion": args.autorizacion.strip(),
        "sello_anterior": sello,
        "verificado_antes_de_sellar": (
            f"Las {total} adjudicaciones siguen aplicando: cada tramo existe en el v2 "
            f"con las mismas coordenadas y el tipo que el owner adjudico. Comprobado "
            f"por este script antes de escribir."),
        "por": "scripts/tm025a_p7_sellar_adjudicacion.py",
    }
    escribir_json(ADJ, adj)
    print(f"  SELLADO. {str(sello)[:16]} -> {real[:16]}")
    print(f"  autorizacion: {args.autorizacion.strip()[:70]}")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Alto as e:
        print()
        print(f"P7 DETENIDO: {e}")
        sys.exit(2)
