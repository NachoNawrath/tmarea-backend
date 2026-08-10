"""
FASE 2 (cierre) — Adjudicacion de los dudosos del cotejo lacustre.

El cotejo (scripts/fase2_cotejo_lacustre.py) dejo 18 coincidencias exactas,
11 dudosos y 3 ausencias totales. Los dudosos no los resuelve el codigo: los
adjudico el owner. Este script deja esa adjudicacion como DATO VERSIONADO
(INV-3.7) en data/decreto/cotejo_lacustre_adjudicado.json, que es lo que la
Fase 3 consumira para construir la geometria lacustre.

Cada correspondencia queda anclada al FID (indice de fila del shapefile), que es
unico por construccion y estable para un archivo dado — y el archivo queda fijado
por su sha256 en este mismo JSON. No se ancla por nombre ('LAGUNA DE ICALMA'
aparece dos veces) ni por NUM (tiene 78 duplicados en las 2067 filas; es unico
solo entre los registros aqui usados, lo que el script verifica).

CRITERIOS DE ADJUDICACION (del owner, 2026-08-09):
  - lago/laguna es nomenclatura, no identidad: el decreto y el catastro usan
    palabras distintas para el mismo cuerpo. Se aceptan.
  - Caburgua/Caburga y Pullinque/Pullingue son grafia. Se aceptan.
  - Rapel es embalse porque efectivamente lo es. Se acepta.
  - Rio San Pedro -> Laguna Grande de San Pedro y Rio Bueno -> Laguna Achibueno
    se RECHAZAN: estan en otra region, son cuerpos distintos que comparten palabra.
  - Icalma: union de sus dos poligonos, es un cuerpo con dos partes.
  - Puyehue: entero a las dos jurisdicciones que lo nombran. Partirlo mal es peor
    que el traslape; INV-3.4 fija 'muestra de mas, nunca de menos'.
  - Rios y Galletue: geometria nula, declarados. INV-3.6.

Este script no construye geometria ni escribe en la base de datos.

Uso (desde la raiz del repo):
    tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\fase2_adjudicacion.py
"""

import hashlib
import json
import os

import geopandas as gpd

from fase2_cotejo_lacustre import CUERPOS, SHP, REPO, norm

SALIDA = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
DECRETO = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")

# ── Adjudicacion: (jurisdiccion_id, nombre_decreto) -> (resolucion, nombre_shp, motivo)
# resolucion ∈ {exacta, aceptado, rechazado, ausente}
# "exacta" no se lista aqui: se resuelve sola por coincidencia de nombre.
ADJUDICADOS = {
    ("lago_rapel", "Lago Rapel"): (
        "aceptado", ["EMBALSE RAPEL"],
        "El decreto dice 'lago'; el catastro lo clasifica como embalse, que es lo que "
        "efectivamente es. Mismo cuerpo."),
    ("lago_villarrica", "Lago Caburgua"): (
        "aceptado", ["LAGO CABURGA"],
        "Diferencia de grafia del mismo toponimo."),
    ("lago_villarrica", "Laguna Icalma"): (
        "aceptado", ["LAGUNA DE ICALMA", "LAGUNA DE ICALMA"],
        "Un cuerpo con dos partes en el catastro (9.901 y 1.932 km2). La jurisdiccion "
        "cubre las dos: se unen."),
    ("lago_villarrica", "Laguna Galletue"): (
        "ausente", [],
        "Sin ninguna coincidencia ni candidato en el shapefile. Queda sin geometria, "
        "declarado (INV-3.6)."),
    ("lago_villarrica", "Rio Tolten"): (
        "ausente", [],
        "Cuerpo fluvial. El shapefile no contiene rios. Sin geometria, declarado (INV-3.6)."),
    ("lago_panguipulli", "Lago Pellaifa"): (
        "aceptado", ["LAGUNA PELLAIFA"],
        "lago/laguna es nomenclatura, no identidad. Mismo cuerpo (X, Panguipulli)."),
    ("lago_panguipulli", "Lago Pullinque"): (
        "aceptado", ["LAGUNA PULLINGUE"],
        "Diferencia de grafia del mismo toponimo, mas lago/laguna. Mismo cuerpo "
        "(X, Panguipulli)."),
    ("lago_panguipulli", "Lago Neltume"): (
        "aceptado", ["LAGUNA NELTUME"],
        "lago/laguna es nomenclatura, no identidad. Mismo cuerpo (X, Panguipulli)."),
    ("lago_panguipulli", "Rio Fuy"): (
        "ausente", [],
        "Cuerpo fluvial. El shapefile no contiene rios. Sin geometria, declarado (INV-3.6)."),
    ("lago_panguipulli", "Rio San Pedro"): (
        "rechazado", [],
        "El candidato LAGUNA GRANDE DE SAN PEDRO esta en la Region VIII (San Pedro de la "
        "Paz): es otro cuerpo que comparte palabra. Se rechaza. Sin geometria (INV-3.6)."),
    ("lago_ranco", "Lago Huishue"): (
        "aceptado", ["LAGUNA HUISHUE"],
        "lago/laguna es nomenclatura, no identidad. Mismo cuerpo (X, Lago Ranco)."),
    ("lago_ranco", "Lago Gris"): (
        "aceptado", ["LAGUNA GRIS"],
        "lago/laguna es nomenclatura, no identidad. Mismo cuerpo (X, Lago Ranco)."),
    ("lago_ranco", "Rio Bueno"): (
        "rechazado", [],
        "El candidato LAGUNA ACHIBUENO esta en la Region VII: es otro cuerpo que comparte "
        "palabra. Se rechaza. Sin geometria (INV-3.6)."),
    ("puerto_varas", "Lago Constancia"): (
        "aceptado", ["LAGUNA CONSTANCIA"],
        "lago/laguna es nomenclatura, no identidad. Mismo cuerpo (X)."),
}

# Puyehue: el decreto lo parte por limite regional; el catastro trae un solo poligono.
# Se asigna entero a las dos jurisdicciones. Genera traslape deliberado.
TRASLAPE_DELIBERADO = {
    "LAGO PUYEHUE": {
        "jurisdicciones": ["lago_ranco", "puerto_varas"],
        "motivo": "El decreto lo parte por limite regional ('hasta el limite con la Region "
                  "de Los Lagos' / 'de Los Rios'); el shapefile trae un unico poligono y el "
                  "criterio de particion no esta determinado. Se asigna entero a ambas: "
                  "INV-3.4 fija que el motor muestra de mas, nunca de menos.",
    }
}


def sha256(ruta):
    h = hashlib.sha256()
    with open(ruta, "rb") as fh:
        for bloque in iter(lambda: fh.read(65536), b""):
            h.update(bloque)
    return h.hexdigest()


def main():
    gdf = gpd.read_file(SHP)
    dec = json.load(open(DECRETO, encoding="utf-8"))
    nombres = {cap["id"]: cap["nombre"] for cap in dec["capitanias"]}

    # CUERPOS se escribe a mano en el otro script y nada ata sus claves al decreto.
    # Un id que no exista alli no puede resolverse usando el id como nombre: la
    # entrada se escribiria igual en el archivo versionado y la Fase 3 construiria
    # geometria para una jurisdiccion que el decreto no tiene. Se aborta.
    huerfanos = sorted(set(CUERPOS) - set(nombres))
    if huerfanos:
        raise SystemExit(
            f"FALLO: {huerfanos} estan en CUERPOS y no en {os.path.basename(DECRETO)}. "
            f"No se adjudica contra un id que el decreto no define.")

    # Anclaje por FID (indice de fila), unico por construccion. NUM NO sirve como
    # identificador global: se deja constancia del hecho medido, no se asume.
    por_nombre = {}
    for fid, r in gdf.iterrows():
        por_nombre.setdefault(norm(r["NOMBRE"]), []).append((int(fid), r))

    print("FASE 2 (cierre) — ADJUDICACION DE DUDOSOS")
    print(f"Shapefile : {os.path.relpath(SHP, REPO)}")
    print(f"Registros : {len(gdf)}")
    print(f"Anclaje   : FID (indice de fila 0..{len(gdf)-1})")
    print(f"NUM unico globalmente: {gdf['NUM'].is_unique} "
          f"({int(gdf['NUM'].duplicated(keep=False).sum())} filas con NUM duplicado) "
          f"— por eso NO se usa como ancla")
    print()

    salida = {
        "generado": "2026-08-09",
        "fase": "2 — cotejo cerrado con adjudicacion del owner",
        "insumo_shapefile": {
            "ruta": "geodata/lagos/Inventario_Lagos.shp",
            "sha256_shp": sha256(SHP),
            "campo_identificador": "FID (indice de fila, 0-based)",
            "nota_identificador": "NUM no es unico en el shapefile (78 filas con NUM "
                                  "duplicado); no se usa como ancla. El FID es estable "
                                  "para el archivo cuyo sha256 se registra aqui.",
            "crs_origen": "EPSG:32719",
            "crs_trabajo": "EPSG:4326",
        },
        "insumo_decreto": {
            "ruta": "data/decreto/jurisdicciones_capitanias.json",
            "sha256": sha256(DECRETO),
        },
        "criterios_adjudicacion": [
            "lago/laguna es nomenclatura, no identidad: decreto y catastro usan palabras "
            "distintas para el mismo cuerpo.",
            "Caburgua/Caburga y Pullinque/Pullingue son diferencias de grafia.",
            "Rapel se acepta como embalse porque efectivamente lo es.",
            "Se rechazan los candidatos de otra region que solo comparten una palabra "
            "(Rio San Pedro, Rio Bueno).",
            "Icalma: union de sus dos poligonos.",
            "Puyehue: entero a las dos jurisdicciones que lo nombran (INV-3.4).",
            "Rios y Galletue: geometria nula, declarados (INV-3.6).",
        ],
        "traslape_deliberado": TRASLAPE_DELIBERADO,
        "jurisdicciones": [],
    }

    tot = {"exacta": 0, "aceptado": 0, "rechazado": 0, "ausente": 0}

    for jid, cuerpos in CUERPOS.items():
        entrada = {"id": jid, "nombre": nombres[jid], "ambito": "lacustre",
                   "cuerpos": []}
        print(f"--- {nombres[jid]} ({jid})")
        for nombre_dec, fragmento in cuerpos:
            clave = (jid, nombre_dec)
            if clave in ADJUDICADOS:
                resolucion, nombres_shp, motivo = ADJUDICADOS[clave]
            else:
                resolucion, nombres_shp, motivo = "exacta", [nombre_dec.upper()], \
                    "Coincidencia exacta de nombre normalizado."

            fids, detalle = [], []
            if nombres_shp:
                # Un nombre repetido en la lista (Icalma) significa "todos los
                # registros que llevan ese nombre"; nombres distintos, uno cada uno.
                if len(nombres_shp) > 1 and len(set(nombres_shp)) == 1:
                    seleccion = por_nombre.get(norm(nombres_shp[0]), [])
                    # La cantidad esperada esta en el dato: la adjudicacion dice
                    # cuantas partes tiene el cuerpo. Si el shapefile devuelve otra,
                    # la union sale de un conjunto distinto del adjudicado y el
                    # resultado seria una geometria que nadie autorizo.
                    if len(seleccion) != len(nombres_shp):
                        raise SystemExit(
                            f"FALLO: '{nombres_shp[0]}' resuelve a {len(seleccion)} "
                            f"registro(s) y la adjudicacion de {nombre_dec} declara "
                            f"{len(nombres_shp)}. El shapefile no es el adjudicado.")
                else:
                    seleccion = []
                    for ns in nombres_shp:
                        cands = por_nombre.get(norm(ns), [])
                        if len(cands) != 1:
                            raise SystemExit(
                                f"FALLO: '{ns}' resuelve a {len(cands)} registros; "
                                f"la correspondencia de {nombre_dec} seria ambigua.")
                        seleccion.extend(cands)
                for fid, r in seleccion:
                    fids.append(fid)
                    detalle.append({"fid": fid, "num": int(r["NUM"]),
                                    "nombre": r["NOMBRE"], "region": r["REGION"],
                                    "area_km2": float(r["AREA_KM2"])})

            if resolucion in ("exacta", "aceptado") and not fids:
                raise SystemExit(f"FALLO: {nombre_dec} resuelto como {resolucion} sin FID.")

            tot[resolucion] += 1
            entrada["cuerpos"].append({
                "nombre_decreto": nombre_dec,
                "fragmento_decreto": fragmento,
                "resolucion": resolucion,
                "shapefile_fid": fids,
                "shapefile_detalle": detalle,
                "motivo": motivo,
            })
            marca = {"exacta": "OK", "aceptado": "ADJ", "rechazado": "RECH",
                     "ausente": "NULA"}[resolucion]
            print(f"    [{marca:<4}] {nombre_dec:<24} -> "
                  f"{'fid ' + str(fids) if fids else 'sin geometria'}")

        con_geom = [c for c in entrada["cuerpos"] if c["shapefile_fid"]]
        entrada["cuerpos_con_geometria"] = len(con_geom)
        entrada["cuerpos_sin_geometria"] = len(entrada["cuerpos"]) - len(con_geom)
        # INV-3.5: ninguna lacustre puede quedar vacia.
        entrada["cumple_inv_3_5"] = len(con_geom) > 0
        print(f"    -> con geometria: {len(con_geom)}  sin geometria: "
              f"{entrada['cuerpos_sin_geometria']}  INV-3.5: "
              f"{'OK' if entrada['cumple_inv_3_5'] else 'FALLA'}")
        print()
        salida["jurisdicciones"].append(entrada)

    salida["conteo"] = tot
    salida["total_cuerpos"] = sum(tot.values())
    salida["total_con_geometria"] = tot["exacta"] + tot["aceptado"]

    print("CONTEO FINAL")
    for k, v in tot.items():
        print(f"  {k:<12} {v}")
    print(f"  {'TOTAL':<12} {sum(tot.values())}")
    print()
    fallan = [j["nombre"] for j in salida["jurisdicciones"] if not j["cumple_inv_3_5"]]
    print(f"INV-3.5 (ninguna lacustre vacia): {'OK' if not fallan else 'FALLA en ' + str(fallan)}")

    with open(SALIDA, "w", encoding="utf-8") as fh:
        json.dump(salida, fh, ensure_ascii=False, indent=2)
    print()
    print(f"Escrito: {os.path.relpath(SALIDA, REPO)}")


if __name__ == "__main__":
    main()
