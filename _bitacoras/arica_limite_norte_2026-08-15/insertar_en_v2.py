"""INSERCION QUIRURGICA EN jurisdicciones_v2.json — Opcion D, `arica`, 2026-08-15.

POR QUE QUIRURGICA Y NO REGENERANDO. `jurisdicciones_v2.json` lo escriben TRES
scripts, no uno: `fase4_migrar_insumo_v2.py` lo genera entero en modo "w" y DESPUES
`fase5_corregir_testigos.py` le escribe `correccion_testigos`, el grueso de
`convenciones` y la correccion al agua de los testigos, y
`fase5_registrar_toponimos_igm.py` los 4 toponimos y `pendientes`. Regenerar el v2
destruye todo eso —medido en su momento: 247 inserciones contra 924 borrados— y
reponerlo no es gratis: el corrector de testigos necesita Postgres y recalcula
contra la capa OSM de 925 MB.

Y EL ATAJO VA CON SU CONTROL, que es la condicion del owner: al lado vive
`verificar_v2_contra_v1.py`, que regenera el v2 a un archivo aparte y exige que
toda diferencia caiga en lo que los otros dos scripts escriben. Sin el, esto es
exactamente el atajo que preservo tres dias de desfase con la laguna Galletue.

QUE INSERTA, y nada mas que esto:
  1. `derivado_de.jurisdicciones_capitanias.json` -> el sha256 del v1 de hoy.
  2. `limite_norte_convencion` en LAS 64 jurisdicciones — el bloque en `arica`,
     null en las otras 63. Van las 64 porque el emisor del v2 ahora emite siempre
     la clave: ponerla solo en `arica` dejaria 63 entradas con una forma que una
     regeneracion no produce, y el control de al lado lo caza.
  3. En `arica`: `causa_sin_geometria` y `nota_fuente`, que la migracion deriva del
     campo `revisar` del v1.
  4. La convencion nueva en `convenciones`, en la posicion que le toca: DESPUES de
     las que emite la migracion y ANTES del umbral de 500 m que agrega el corrector
     de testigos. Al final seria una posicion que la regeneracion no reproduce.

LO QUE NO TOCA, y es el punto de la Opcion D: `limite_norte.dec` sigue en null,
`estado_geometria` sigue `no_cerrable`, `participa_matching` sigue false. ARICA NO
SE CIERRA. Lo que se cierra es el registro.

SHELL DECLARADA (CLAUDE.md 7.3) — en PowerShell, desde la raiz:

    cd C:\\Users\\katia\\tmarea-backend
    .\\tools\\raster-build\\.venv\\Scripts\\python.exe _bitacoras\\arica_limite_norte_2026-08-15\\insertar_en_v2.py

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

# La convencion nueva, TEXTUALMENTE IGUAL a la de scripts/fase4_migrar_insumo_v2.py.
# Si las dos dejaran de coincidir, el control de al lado lo caza en el prefijo de
# `convenciones`: no hay forma de que esta copia envejezca en silencio.
CONVENCION = (
    "EL LIMITE NORTE DE `arica` ESTA DECLARADO Y NO CONSTRUIDO. Owner, "
    "2026-08-15. El decreto no da coordenada: remite al limite politico "
    "internacional con el Peru, que fija otro instrumento. Se declara el "
    "paralelo 18 21 00 S con su ancla en 070 22 49,7 W, RETROCALCULADA por "
    "nosotros sobre el paquete Espacios_Maritimos de DIFROL — no es una "
    "coordenada que DIFROL publique — y con alcance de 24 mn desde la costa. "
    "EL VALOR NO SE ESCRIBE EN `limite_norte_dec` Y `arica` SIGUE "
    "`no_cerrable`, a proposito: la unica receta para una jurisdiccion sin "
    "contorno es `banda_paralelos`, que devuelve la franja entera hasta las "
    "200 mn, y eso adjudicaria agua que el propio paquete de DIFROL niega. "
    "Escribir el valor antes que el mecanismo de alcance abre una ventana en "
    "la que cualquiera que regenere produce esa capa. El detalle completo "
    "—que dice el decreto, que se leyo, el retrocalculo con su precision y su "
    "trampa de metodo, el rotulo de datum y la procedencia— vive en "
    "`limite_norte_convencion` dentro del v1, que es la fuente."
)

# La causa que la migracion deriva del `revisar` del v1. Se lee de ahi y no se
# copia: una copia seria un segundo lugar donde el texto puede envejecer.
MARCA_UMBRAL = "UMBRAL DE CORRECCION DE TESTIGOS"


class Alto(Exception):
    pass


def sha(ruta):
    with open(ruta, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def con_clave_despues_de(d, ancla, clave, valor):
    """Devuelve un dict nuevo con `clave` insertada justo despues de `ancla`.
    El ORDEN importa: tiene que quedar donde el emisor del v2 la pone, o la
    comparacion contra una regeneracion daria distinto por la posicion."""
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

    conv_v1 = {c["id"]: c.get("limite_norte_convencion") for c in v1["capitanias"]}
    arica_v1 = next(c for c in v1["capitanias"] if c["id"] == "arica")

    if not arica_v1.get("limite_norte_convencion"):
        raise Alto("el v1 no trae 'limite_norte_convencion' en `arica`. Esta "
                   "insercion deriva del v1; no inventa el bloque.")
    if not arica_v1.get("revisar"):
        raise Alto("el v1 no trae 'revisar' en `arica`. De ahi sale la causa "
                   "reescrita; sin eso no hay que insertar.")

    if all("limite_norte_convencion" in j for j in v2["jurisdicciones"]) and \
            v2["derivado_de"]["jurisdicciones_capitanias.json"] == sha(V1):
        print("YA APLICADA: el v2 ya trae la clave en las 64 y su sha del v1 esta "
              "al dia. No se toca nada.")
        return 0

    cambios = []

    # 1 ── el sha del v1
    antes = v2["derivado_de"]["jurisdicciones_capitanias.json"]
    v2["derivado_de"]["jurisdicciones_capitanias.json"] = sha(V1)
    cambios.append(f"derivado_de: {antes[:16]}... -> {sha(V1)[:16]}...")

    # 2 y 3 ── las 64 jurisdicciones
    nuevas, con_bloque = [], 0
    for j in v2["jurisdicciones"]:
        if j["id"] not in conv_v1:
            raise Alto(f"la jurisdiccion '{j['id']}' del v2 no existe en el v1")
        j = con_clave_despues_de(j, "limite_norte",
                                 "limite_norte_convencion", conv_v1[j["id"]])
        if conv_v1[j["id"]] is not None:
            con_bloque += 1
        if j["id"] == "arica":
            j["causa_sin_geometria"] = arica_v1["revisar"]
            j["nota_fuente"] = arica_v1["revisar"]
            # Lo que la Opcion D NO mueve. Se comprueba, no se supone.
            for campo, esperado in (("estado_geometria", "no_cerrable"),
                                    ("participa_matching", False),
                                    ("receta", "-")):
                if j[campo] != esperado:
                    raise Alto(f"`arica` tiene {campo}={j[campo]!r} y la Opcion D "
                               f"exige {esperado!r}. Algo cerro la jurisdiccion.")
            if (j.get("limite_norte") or {}).get("dec") is not None:
                raise Alto("`arica` tiene limite_norte.dec escrito. La Opcion D "
                           "existe justamente para que eso NO pase todavia.")
        nuevas.append(j)
    v2["jurisdicciones"] = nuevas
    cambios.append(f"limite_norte_convencion en {len(nuevas)} jurisdicciones "
                   f"({con_bloque} con bloque, {len(nuevas) - con_bloque} en null)")
    cambios.append("arica: causa_sin_geometria y nota_fuente reescritas desde "
                   "el 'revisar' del v1")

    # 4 ── la convencion, ANTES del umbral que agrega el corrector de testigos
    convs = v2["convenciones"]
    if CONVENCION not in convs:
        corte = next((i for i, c in enumerate(convs) if MARCA_UMBRAL in c), len(convs))
        convs.insert(corte, CONVENCION)
        cambios.append(f"convenciones: {len(convs) - 1} -> {len(convs)}, "
                       f"insertada en la posicion {corte} (antes del umbral)")

    # ── escritura: MISMA serializacion que el emisor del v2 ──────────────────
    # indent=1, ensure_ascii=False, sort_keys=False y saltos CRLF, que es lo que
    # deja `open(..., "w")` de Python en Windows. Cualquier otra cosa cambiaria el
    # archivo entero y el diff dejaria de decir que se hizo.
    with open(V2, "w", encoding="utf-8") as fh:
        json.dump(v2, fh, ensure_ascii=False, indent=1, sort_keys=False)

    print("INSERCION APLICADA sobre data/decreto/jurisdicciones_v2.json")
    for c in cambios:
        print(f"  · {c}")
    print(f"  v2 sha256 nuevo: {sha(V2)}")
    print()
    print("ARICA SIGUE `no_cerrable`. Lo que se cerro es el registro, no la")
    print("jurisdiccion. El conteo del ambito MARITIMO sigue en 44/8.")
    print()
    print("Ahora corre el control:")
    print("  .\\tools\\raster-build\\.venv\\Scripts\\python.exe "
          "_bitacoras\\arica_limite_norte_2026-08-15\\verificar_v2_contra_v1.py")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Alto as e:
        print(f"\nALTO: {e}\n", file=sys.stderr)
        sys.exit(2)
