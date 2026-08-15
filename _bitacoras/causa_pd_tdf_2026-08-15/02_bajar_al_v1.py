"""OPCION 2 — BAJAR AL V1 LO QUE HACE VIGENTE AL TEXTO, NO SOLO EL TEXTO.

Orden del owner (2026-08-15), primer punto de la sesion y previo a la Pieza 3:
la causa vigente de `punta_delgada` y `tierra_del_fuego` baja al v1. La Opcion 2
baja ademas el dato que hace verdadero a ese texto, porque sin el, el v1 quedaria
diciendo "verificados contra la capa de Toponimos del IGM (ver puntos_notables)"
con esos puntos AUSENTES de su propio `puntos_notables` — un puntero colgado
dentro de la fuente.

QUE ESCRIBE, en `data/decreto/jurisdicciones_capitanias.json` y nada mas:

  1. `motivo_exclusion` de las dos  -> la causa vigente. Es el campo que la
     migracion lee primero cuando `sin_georreferenciar` es true
     (fase4_migrar_insumo_v2.py:361-362), y de ahi sale `causa_sin_geometria`.
  2. `revisar` de las dos           -> reescrito. Es el string mas vencido de los
     seis: decia que esos accidentes necesitan georreferenciacion externa y estan
     verificados contra el IGM. De ahi sale `nota_fuente` (:1212). Corrige de paso
     `Punta Anxius` -> `Punta Anxious`, que es la grafia del IGM.
  3. `puntos_notables` 72 -> 76      -> los 4 toponimos del IGM, COPIADOS del v2.
     No se transcriben a mano: se copian del registro que produjo la consulta al
     servicio, con su `fuente`, su `motivo_eleccion` y sus `descartados`.
  4. `pendientes`                    -> el bloque entero, copiado del v2.

POR QUE ESTO NO ES UNA REGENERACION AL REVES. Los 4 toponimos y el `pendientes`
son dato fuente: salieron de una consulta a la capa SECCION_L del IGM con su
procedencia escrita. Que vivieran solo en el derivado es la inversion que INV-3.7
prohibe. Bajarlos no los inventa: los pone donde el contrato dice que viven.

LO QUE NO TOCA, y es el rotulo de toda la pieza: `sin_georreferenciar` sigue
true, `participa_matching` sigue false. **NINGUNA DE LAS DOS JURISDICCIONES SE
CIERRA.** Siguen `no_cerrable`. Marítima sigue 44/8; sobre las 64, 54/10. Lo que
cierra es la DIVERGENCIA entre el v1 y el v2, no la jurisdiccion.

MEDIDO ANTES DE ESCRIBIR, condicion del owner: `01_gate_puntos_notables.py` corre
el auditor del v1 contra el v1 de hoy y contra la sombra con los 4 puntos y el
bloque puestos, y exige que los dos informes salgan identicos. Salio exit 0, 391
lineas contra 391, 0 diferencias.

SHELL DECLARADA (CLAUDE.md 7.3) — en PowerShell, desde la raiz:

    cd C:\\Users\\katia\\tmarea-backend
    .\\tools\\raster-build\\.venv\\Scripts\\python.exe _bitacoras\\causa_pd_tdf_2026-08-15\\02_bajar_al_v1.py

Se puede correr dos veces: detecta si ya esta aplicada y no hace nada.
"""

import copy
import hashlib
import io
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")

TOPONIMOS = ["Punta Anxious", "Peninsula Brecknock", "Punta Harry",
             "Cabo San Vicente"]

# ── EL TEXTO EXACTO, APROBADO POR EL OWNER SIN CAMBIOS (2026-08-15) ───────────
# Parte del texto vigente que hoy tiene el v2 y toca UNICAMENTE los punteros,
# para que sean verdaderos en los dos archivos: `Ver pendientes.` pasa a nombrar
# el pendiente por su id, que es estable y existe en los dos.
#
# NO repone la frase del `motivo_exclusion` viejo *"El motor NO debe evaluarla en
# silencio..."*: esa instruccion ya vive en `zonas_aviso.json` y en el catalogo
# §10 del contrato, `arica` no la lleva, y una copia mas es un lugar mas donde
# envejecer.
CAUSAS = {
    "punta_delgada":
        "falta UNICAMENTE el limite maritimo internacional por el Oriente, que "
        "el propio decreto invoca sin darlo en coordenadas. Su linea del Weste "
        "ya esta resuelta: Punta Harry y Cabo San Vicente estan verificados "
        "contra la capa de Toponimos del IGM (ver puntos_notables). El owner "
        "acepto que ese limite es la linea Punta Dungeness - Cabo del Espiritu "
        "Santo del Tratado de 1881; falta el extremo argentino, que la capa "
        "chilena no trae. Ver el pendiente "
        "`limite_maritimo_internacional_oriente_magallanes`.",
    "tierra_del_fuego":
        "faltan DOS cosas, y ya no es la falta de coordenadas de sus "
        "accidentes: Cabo San Vicente y Punta Anxious estan verificados contra "
        "la capa de Toponimos del IGM (ver puntos_notables). Falta (1) el "
        "limite oriental internacional — mismo pendiente que Punta Delgada, "
        "`limite_maritimo_internacional_oriente_magallanes` — y (2) un ancla "
        "que diga de que lado de la linea esta la jurisdiccion. El decreto dice "
        "'el area oriental', pero la construccion no decide lados por letra "
        "cardinal; lo limpio es anclar en uno de los cuerpos que el propio "
        "parrafo le enumera (Bahia Gente Grande, Bahia Inutil, Canal Whiteside, "
        "Canal Gabriel, Seno Almirantazgo).",
}

NOTAS_FUENTE = {
    "punta_delgada":
        "Punta Harry y Cabo San Vicente estan verificados contra la capa de "
        "Toponimos del IGM. Lo pendiente de fuente externa es el extremo "
        "argentino de la linea del Oriente (Cabo del Espiritu Santo), no los "
        "accidentes del Weste.",
    "tierra_del_fuego":
        "Cabo San Vicente y Punta Anxious estan verificados contra la capa de "
        "Toponimos del IGM. Lo pendiente de fuente externa es el extremo "
        "argentino de la linea del Oriente (Cabo del Espiritu Santo), y ademas "
        "falta el ancla que elija el lado.",
}


class Alto(Exception):
    pass


def sha(ruta):
    with open(ruta, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def con_clave_despues_de(d, ancla, clave, valor):
    """dict nuevo con `clave` insertada justo despues de `ancla`."""
    if ancla not in d:
        raise Alto(f"no esta la clave ancla '{ancla}'; no se inserta a ciegas")
    out = {}
    for k, v in d.items():
        out[k] = v
        if k == ancla:
            out[clave] = valor
    return out


def main():
    v1 = json.load(io.open(V1, encoding="utf-8"))
    v2 = json.load(io.open(V2, encoding="utf-8"))

    caps = {c["id"]: c for c in v1["capitanias"]}
    for cid in CAUSAS:
        if cid not in caps:
            raise Alto(f"'{cid}' no esta en el v1")
        if not caps[cid].get("sin_georreferenciar"):
            raise Alto(
                f"'{cid}' no declara `sin_georreferenciar`. Esta insercion se "
                f"apoya en que la migracion corta en el branch de :361, que es "
                f"lo que hace que reescribir el texto NO mueva "
                f"`estado_geometria`. Sin eso, la premisa medida no vale.")

    ya_texto = all(caps[c].get("motivo_exclusion") == CAUSAS[c]
                   and caps[c].get("revisar") == NOTAS_FUENTE[c] for c in CAUSAS)
    ya_pn = {p["nombre"] for p in v1["puntos_notables"]} >= set(TOPONIMOS)
    ya_pend = "pendientes" in v1
    if ya_texto and ya_pn and ya_pend:
        print("YA APLICADA: el v1 trae las dos causas vigentes, los 4 toponimos "
              "y el bloque `pendientes`. No se toca nada.")
        return 0

    cambios = []

    # 1 y 2 ── las dos causas y las dos notas
    for cid in CAUSAS:
        c = caps[cid]
        if c.get("motivo_exclusion") != CAUSAS[cid]:
            c["motivo_exclusion"] = CAUSAS[cid]
            cambios.append(f"{cid}.motivo_exclusion reescrito ({len(CAUSAS[cid])} car.)")
        if c.get("revisar") != NOTAS_FUENTE[cid]:
            c["revisar"] = NOTAS_FUENTE[cid]
            cambios.append(f"{cid}.revisar reescrito ({len(NOTAS_FUENTE[cid])} car.)")
        # Lo que la Opcion 2 NO mueve. Se comprueba, no se supone.
        for campo, esperado in (("sin_georreferenciar", True),
                                ("participa_matching", False)):
            if c.get(campo) != esperado:
                raise Alto(f"'{cid}' tiene {campo}={c.get(campo)!r} y esta pieza "
                           f"exige {esperado!r}. Algo cerro la jurisdiccion.")

    # 3 ── los 4 toponimos del IGM, copiados del v2
    por_nombre_v2 = {p["nombre"]: p for p in v2["puntos_notables"]}
    ya = {p["nombre"] for p in v1["puntos_notables"]}
    n_antes = len(v1["puntos_notables"])
    for n in TOPONIMOS:
        if n in ya:
            continue
        if n not in por_nombre_v2:
            raise Alto(f"'{n}' no esta en los puntos_notables del v2: se COPIA "
                       f"del registro que produjo la consulta al IGM, no se "
                       f"transcribe a mano")
        v1["puntos_notables"].append(copy.deepcopy(por_nombre_v2[n]))
    if len(v1["puntos_notables"]) != n_antes:
        cambios.append(f"puntos_notables: {n_antes} -> {len(v1['puntos_notables'])} "
                       f"({TOPONIMOS})")

    # 4 ── el bloque `pendientes`, copiado del v2, justo despues de puntos_notables
    if "pendientes" not in v1:
        if not v2.get("pendientes"):
            raise Alto("el v2 no trae `pendientes`: no hay que bajar")
        v1 = con_clave_despues_de(v1, "puntos_notables", "pendientes",
                                  copy.deepcopy(v2["pendientes"]))
        cambios.append(f"pendientes: bloque nuevo, {len(v1['pendientes'])} entrada(s) "
                       f"({[p['id'] for p in v1['pendientes']]})")

    # ── escritura: MISMA serializacion que tenia el v1 ───────────────────────
    # indent=2, ensure_ascii=False, sort_keys=False y CRLF, que es lo que deja
    # `open(..., "w")` en Windows. Cualquier otra cosa reescribiria el archivo
    # entero y el diff dejaria de decir que se hizo.
    with open(V1, "w", encoding="utf-8") as fh:
        json.dump(v1, fh, ensure_ascii=False, indent=2, sort_keys=False)

    print("ESCRITO sobre data/decreto/jurisdicciones_capitanias.json")
    for c in cambios:
        print(f"  · {c}")
    print(f"  v1 sha256 nuevo: {sha(V1)}")
    print()
    print("NINGUNA DE LAS DOS SE CERRO: siguen `no_cerrable`, "
          "sin_georreferenciar=true, participa_matching=false.")
    print("Marítima sigue 44/8; sobre las 64, 54/10.")
    print()
    print("EL V2 QUEDO DESFASADO A PROPOSITO. Ahora, EN ESTE ORDEN:")
    print("  1. 03_espejar_en_v2.py     (incluye refrescar `derivado_de` — si se")
    print("                              olvida, el control sale exit 1, no 3)")
    print("  2. el control, con su ruta de salida por argumento")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Alto as e:
        print(f"\nALTO: {e}\n", file=sys.stderr)
        sys.exit(2)
