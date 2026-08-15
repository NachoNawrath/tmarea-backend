"""INSERCION QUIRURGICA EN jurisdicciones_v2.json — Opcion 2, 2026-08-15.

POR QUE QUIRURGICA Y NO REGENERANDO. `jurisdicciones_v2.json` lo escriben TRES
scripts —hasta hoy—: `fase4_migrar_insumo_v2.py` lo genera entero en modo "w" y
DESPUES `fase5_corregir_testigos.py` le escribe `correccion_testigos`, el grueso
de `convenciones` y la correccion al agua de los testigos. Regenerar destruye eso
—medido en su momento: 247 inserciones contra 924 borrados— y reponerlo exige
Postgres y recalcular contra la capa OSM de 925 MB.

EL TERCER ESCRITOR SE RETIRA HOY. `fase5_registrar_toponimos_igm.py` escribia los
4 toponimos, el bloque `pendientes` y las dos causas directamente sobre el v2.
Desde esta pieza esos tres bloques viven en el v1 y la migracion los sube; el
script pasa a VERIFICAR contra el v1 y no escribe nada. El v2 vuelve a tener dos
escritores.

QUE INSERTA, y nada mas que esto:
  1. `derivado_de.jurisdicciones_capitanias.json` -> el sha256 del v1 de hoy.
     ES EL PASO QUE SE OLVIDA, y olvidarlo no da exit 3 sino exit 1: el control
     lo mide como divergencia NO declarada (CONTROL 1, que es B0 adelantado).
  2. `causa_sin_geometria` de `punta_delgada` y `tierra_del_fuego` <- el
     `motivo_exclusion` del v1, que es de donde la migracion la deriva cuando
     `sin_georreferenciar` es true (fase4_migrar_insumo_v2.py:361-362).
  3. `nota_fuente` de las dos <- el `revisar` del v1 (:1212).
  4. `pendientes` se mueve ANTES de `correccion_testigos`. No es cosmetico: con
     la linea de paso nueva, la migracion emite `pendientes` al final de SU dict
     y el corrector de testigos agrega `correccion_testigos` despues. Ese es el
     orden que produce una regeneracion, y §3.4 pide que regenerar de el mismo
     resultado. El control compara por clave y no por posicion, asi que esto NO
     lo arregla a el: arregla el archivo.

LOS TRES VALORES SE LEEN DEL V1, NO SE COPIAN ACA. Una copia del texto en este
script seria un segundo lugar donde puede envejecer, que es exactamente el
defecto que esta pieza existe para cerrar.

LO QUE NO TOCA: `puntos_notables` del v2 (el v1 ya trae los 76 identicos, y se
comprueba elemento por elemento antes de dar por buena la insercion) ·
`estado_geometria` · `participa_matching` · `receta` · ninguna geometria.
**NINGUNA DE LAS DOS JURISDICCIONES SE CIERRA.** Marítima sigue 44/8; 54/10
sobre las 64.

SHELL DECLARADA (CLAUDE.md 7.3) — en PowerShell, desde la raiz:

    cd C:\\Users\\katia\\tmarea-backend
    .\\tools\\raster-build\\.venv\\Scripts\\python.exe _bitacoras\\causa_pd_tdf_2026-08-15\\03_espejar_en_v2.py

Se puede correr dos veces: detecta si ya esta aplicada y no hace nada.
"""

import hashlib
import io
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")

IDS = ("punta_delgada", "tierra_del_fuego")


class Alto(Exception):
    pass


def sha(ruta):
    with open(ruta, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def mover_antes_de(d, clave, ancla):
    """dict nuevo con `clave` reubicada justo antes de `ancla`."""
    if clave not in d or ancla not in d:
        raise Alto(f"no estan '{clave}' y '{ancla}'; no se reordena a ciegas")
    valor = d[clave]
    out = {}
    for k, v in d.items():
        if k == clave:
            continue
        if k == ancla:
            out[clave] = valor
        out[k] = v
    return out


def main():
    v1 = json.load(io.open(V1, encoding="utf-8"))
    v2 = json.load(io.open(V2, encoding="utf-8"))

    caps = {c["id"]: c for c in v1["capitanias"]}
    for cid in IDS:
        if cid not in caps:
            raise Alto(f"'{cid}' no esta en el v1")
        if not caps[cid].get("motivo_exclusion") or not caps[cid].get("revisar"):
            raise Alto(f"'{cid}' no trae `motivo_exclusion` o `revisar` en el v1. "
                       f"Esta insercion DERIVA del v1; no inventa el texto. "
                       f"Corre 02_bajar_al_v1.py primero.")

    # `puntos_notables`: el v1 ya tiene que traer los mismos 76, en el mismo
    # orden. Si no, la migracion emitiria una lista distinta de la del v2 y esta
    # insercion estaria tapando un desfase en vez de cerrarlo.
    pn1, pn2 = v1["puntos_notables"], v2["puntos_notables"]
    if pn1 != pn2:
        raise Alto(
            f"los `puntos_notables` del v1 ({len(pn1)}) y del v2 ({len(pn2)}) no "
            f"son identicos. La migracion los copia verbatim del v1, asi que "
            f"cualquier diferencia aca sale como divergencia en el control. No se "
            f"inserta encima de eso.")
    if (v1.get("pendientes") or []) != (v2.get("pendientes") or []):
        raise Alto("el bloque `pendientes` difiere entre el v1 y el v2. Mismo "
                   "motivo que arriba.")

    idx = {j["id"]: j for j in v2["jurisdicciones"]}
    al_dia = (
        v2["derivado_de"]["jurisdicciones_capitanias.json"] == sha(V1)
        and all(idx[c]["causa_sin_geometria"] == caps[c]["motivo_exclusion"]
                and idx[c]["nota_fuente"] == caps[c]["revisar"] for c in IDS)
        and list(v2).index("pendientes") < list(v2).index("correccion_testigos"))
    if al_dia:
        print("YA APLICADA: el v2 ya deriva del v1 de hoy, sus dos causas y notas "
              "coinciden y `pendientes` esta en su lugar. No se toca nada.")
        return 0

    cambios = []

    antes = v2["derivado_de"]["jurisdicciones_capitanias.json"]
    if antes != sha(V1):
        v2["derivado_de"]["jurisdicciones_capitanias.json"] = sha(V1)
        cambios.append(f"derivado_de: {antes[:16]}... -> {sha(V1)[:16]}...")

    for cid in IDS:
        j, c = idx[cid], caps[cid]
        for campo, origen in (("causa_sin_geometria", "motivo_exclusion"),
                              ("nota_fuente", "revisar")):
            if j.get(campo) != c[origen]:
                j[campo] = c[origen]
                cambios.append(f"{cid}.{campo} <- v1.{origen} ({len(c[origen])} car.)")
        # Lo que esta pieza NO mueve. Se comprueba, no se supone.
        for campo, esperado in (("estado_geometria", "no_cerrable"),
                                ("participa_matching", False),
                                ("receta", "-")):
            if j[campo] != esperado:
                raise Alto(f"'{cid}' tiene {campo}={j[campo]!r} y esta pieza exige "
                           f"{esperado!r}. Algo cerro la jurisdiccion.")

    if list(v2).index("pendientes") > list(v2).index("correccion_testigos"):
        v2 = mover_antes_de(v2, "pendientes", "correccion_testigos")
        cambios.append("pendientes movido antes de correccion_testigos (es el "
                       "orden que produce una regeneracion con la linea de paso)")

    # ── escritura: MISMA serializacion que el emisor del v2 ──────────────────
    # indent=1, ensure_ascii=False, sort_keys=False y CRLF, que es lo que deja
    # `open(..., "w")` en Windows.
    with open(V2, "w", encoding="utf-8") as fh:
        json.dump(v2, fh, ensure_ascii=False, indent=1, sort_keys=False)

    print("INSERCION APLICADA sobre data/decreto/jurisdicciones_v2.json")
    for c in cambios:
        print(f"  · {c}")
    print(f"  v2 sha256 nuevo: {sha(V2)}")
    print()
    print("CIERRA LA DIVERGENCIA, NO LAS JURISDICCIONES. Las dos siguen "
          "`no_cerrable`.")
    print("Marítima sigue 44/8; sobre las 64, 54/10.")
    print()
    print("Ahora el control, con su ruta de salida por argumento:")
    print("  .\\tools\\raster-build\\.venv\\Scripts\\python.exe "
          "_bitacoras\\arica_limite_norte_2026-08-15\\verificar_v2_contra_v1.py \\")
    print("      _bitacoras\\causa_pd_tdf_2026-08-15\\04_v2_contra_v1.txt")
    print("Y despues el resellado B12, que este movimiento del v2 dispara.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Alto as e:
        print(f"\nALTO: {e}\n", file=sys.stderr)
        sys.exit(2)
