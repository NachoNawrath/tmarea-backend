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
    # Laguna Galletue: pasa a ADJUDICADOS_FID (D12, 2026-08-12). Estuvo aca como
    # "ausente" desde 2026-08-09 con el motivo "sin ninguna coincidencia ni
    # candidato", que la pasada de alineacion contra el TM-025 A desmintio: la
    # grafia del catastro esta en el parrafo de la Gobernacion de Valdivia.
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

# ── Adjudicacion POR FID EXPLICITO ───────────────────────────────────────────
# Para cuerpos donde el nombre NO puede ser el ancla. Se declara el FID y ademas lo
# que ese FID tiene que traer: si el shapefile cambia, el control lo caza en vez de
# adjudicar en silencio otra fila.
#
# (jurisdiccion_id, nombre_decreto) -> (resolucion, [fids], {atributos esperados}, motivo)
ADJUDICADOS_FID = {
    ("lago_villarrica", "Laguna Galletue"): (
        "aceptado", [965],
        {"nombre": "LAGO GUALLETUE", "region": "IX", "area_km2": 13.075},
        "D12, adjudicada por el owner el 2026-08-12. El decreto la escribe 'Galletue' y el "
        "catastro 'Gualletue'; esa grafia sale del parrafo de la Gobernacion Maritima de "
        "Valdivia, o sea del propio decreto y no de una fuente externa. Coincidencia unica "
        "en los 2.067 registros del catastro. Coherencia geografica con margen de 2x: 8,6 km "
        "de Icalma y 24,7 de Conguillio, los otros dos cuerpos de la misma frase del decreto, "
        "contra 51,9 km del siguiente candidato. SE ANCLA POR FID, no por nombre ni por "
        "geometria — ver GEMELOS_DECLARADOS."),
}

# ── Gemelos geometricos declarados ───────────────────────────────────────────
# Filas del shapefile cuya geometria es IDENTICA a la de un FID adjudicado. Existen
# y no se pueden borrar; lo que si se puede es exigir que esten DECLARADAS, para que
# nadie las incorpore sin darse cuenta.
#
# POR QUE ESTE CONTROL CUENTA FILAS Y NO MIDE AREA: dos poligonos identicos unidos
# dan exactamente la misma area que uno solo. Un control de superficie pasa con el
# duplicado adentro. El duplicado solo se ve contando filas.
#
# MEDIDO EL 2026-08-12, y es mas grande de lo que se creia: no es un caso suelto de
# Galletue. En esta zona del catastro hay TRES pares, todos con la misma forma —una
# fila con nombre y una fila sin nombre (NOMBRE = nan) con la geometria identica—:
#
#     [960, 965]  960 sin nombre   ·  965 LAGO GUALLETUE     13,075 km2
#     [962, 966]  962 sin nombre   ·  966 LAGUNA DE ICALMA    9,901 km2
#     [963, 967]  963 sin nombre   ·  967 LAGUNA DE ICALMA    1,932 km2
#
# Los tres se adjudican por la fila CON NOMBRE. La adjudicacion vigente de Icalma ya
# tomaba las correctas (966 y 967) porque empareja por nombre y los gemelos no lo
# tienen — o sea que acertaba POR ACCIDENTE, con el mismo accidente que salvaba a
# Galletue. Acertar por accidente deja de ser aceptable en cuanto alguien cambie el
# emparejamiento; por eso se declaran los tres.
GEMELOS_DECLARADOS = {
    965: {
        "gemelos": [960],
        "motivo": "El fid 960 no tiene nombre y su geometria es identica a la del 965: son "
                  "dos filas del catastro para el mismo cuerpo. Se adjudica el 965, que es "
                  "el que lleva el nombre. Un cotejo que seleccione por geometria traeria "
                  "los dos y duplicaria la laguna sin que ningun control de area lo note.",
    },
    966: {
        "gemelos": [962],
        "motivo": "Mismo patron que 960/965: el fid 962 no tiene nombre y su geometria es "
                  "identica a la del 966 (parte mayor de Icalma, 9,901 km2). Se adjudica el "
                  "966. Hallado por el control de gemelos el 2026-08-12; la adjudicacion "
                  "vigente ya tomaba el correcto, pero porque empareja por nombre y el "
                  "gemelo no lo tiene.",
    },
    967: {
        "gemelos": [963],
        "motivo": "Mismo patron: el fid 963 no tiene nombre y su geometria es identica a la "
                  "del 967 (parte menor de Icalma, 1,932 km2). Se adjudica el 967.",
    },
}

# ── D11 — alcance del ambito lacustre ────────────────────────────────────────
# DECIDIDA por el owner el 2026-08-12: opcion ESTRECHA. Este cotejo cubre las 6
# Capitanias de ambito lacustre y nada mas. Las Capitanias MARITIMAS a las que el
# decreto tambien les nombra cuerpos de agua interior quedan DECLARADAS como
# carencia — no en silencio, que es lo unico que la opcion estrecha no puede
# permitirse: sin la declaracion INV-3.6 tendria un hueco.
#
# Fundamento del owner: esos cuerpos NO tienen geometria hoy, asi que la opcion
# estrecha no le quita nada al patron. No se puede perder lo que nunca se publico.
#
# La lista se transcribe del texto_decreto de cada una, igual que CUERPOS, y el
# script verifica contra el insumo que las once sean de ambito maritimo y que
# ninguna este en CUERPOS: no puede estar en los dos alcances a la vez.
FUERA_DE_ALCANCE_D11 = {
    "constitucion":     "lagos Teno, Vichuquen, Colbun y Maule",
    "lebu":             "lagos Lanalhue y Lleu Lleu",
    "puerto_montt":     "lago Chapo",
    "maullin":          "rio Maicolpue",
    "cochamo":          "lagos Tagua-Tagua e Inferior",
    "chaiten":          "lagos Yelcho y Palena",
    "puerto_chacabuco": "canales interiores hasta la Laguna San Rafael",
    "talcahuano":       "lagunas Chica y Grande de San Pedro",
    "carahue":          "lagos Budi y Queule, laguna Trovolhue, y cuatro rios",
    "valdivia":         "seis rios y sus afluentes navegables",
    "corral":           "rio Colun",
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

    # ── Indice de geometrias identicas, para el control de gemelos ────────────
    # Se agrupa por WKB: dos filas con el mismo WKB son el mismo poligono, byte a
    # byte. No se compara por area: dos cuerpos DISTINTOS pueden tener la misma
    # area, y —lo que importa aca— dos filas IDENTICAS unidas dan la misma area
    # que una, asi que el area no distingue el caso que este control persigue.
    por_geometria = {}
    for fid, g in enumerate(gdf.geometry):
        if g is None or g.is_empty:
            continue
        por_geometria.setdefault(g.wkb, []).append(int(fid))
    gemelos_de = {}
    for _, grupo in por_geometria.items():
        if len(grupo) > 1:
            for fid in grupo:
                gemelos_de[fid] = [o for o in grupo if o != fid]
    print(f"Gemelos   : {len(gemelos_de)} fila(s) del shapefile comparten geometria "
          f"exacta con alguna otra")

    print("FASE 2 (cierre) — ADJUDICACION DE DUDOSOS")
    print(f"Shapefile : {os.path.relpath(SHP, REPO)}")
    print(f"Registros : {len(gdf)}")
    print(f"Anclaje   : FID (indice de fila 0..{len(gdf)-1})")
    print(f"NUM unico globalmente: {gdf['NUM'].is_unique} "
          f"({int(gdf['NUM'].duplicated(keep=False).sum())} filas con NUM duplicado) "
          f"— por eso NO se usa como ancla")
    print()

    salida = {
        # Fecha fija, no date.today(): un derivado con fecha de corrida no es
        # reproducible — cada corrida daria otro sha256 y "se regenero igual" seria
        # indistinguible de "se regenero distinto". Se sube a mano cuando cambia el
        # contenido, que es lo que la hace informativa.
        "generado": "2026-08-12",
        "fase": "2 — cotejo cerrado con adjudicacion del owner; regenerado tras la pasada "
                "de alineacion contra el TM-025 A, con D11 (alcance) y D12 (Galletue)",
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
            "Rios: geometria nula, declarados (INV-3.6). El shapefile no contiene rios.",
            "Galletue/Gualletue (D12, 2026-08-12): se adjudica el fid 965. Coincidencia unica "
            "en los 2.067 registros; la grafia del catastro sale del parrafo de la Gobernacion "
            "Maritima de Valdivia, o sea del propio decreto. Se ancla POR FID: el fid 960 "
            "tiene geometria identica y no tiene nombre, y esta declarado como gemelo.",
            "Los cuerpos con gemelo geometrico se anclan por FID y el gemelo se declara. El "
            "control cuenta FILAS, no area: dos poligonos identicos unidos dan la misma area "
            "que uno, asi que un control de superficie no ve el duplicado.",
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
            anclaje = "nombre"
            fids_declarados = None
            if clave in ADJUDICADOS_FID:
                if clave in ADJUDICADOS:
                    raise SystemExit(
                        f"FALLO: {clave} esta en ADJUDICADOS y en ADJUDICADOS_FID. "
                        f"Un cuerpo se ancla por nombre o por FID, no por los dos.")
                resolucion, fids_declarados, esperado, motivo = ADJUDICADOS_FID[clave]
                nombres_shp = []
                anclaje = "fid"
            elif clave in ADJUDICADOS:
                resolucion, nombres_shp, motivo = ADJUDICADOS[clave]
            else:
                resolucion, nombres_shp, motivo = "exacta", [nombre_dec.upper()], \
                    "Coincidencia exacta de nombre normalizado."

            fids, detalle = [], []
            if fids_declarados is not None:
                # Anclaje por FID: no se busca por nombre. Se verifica que la fila
                # traiga lo que la adjudicacion declaro, para que un shapefile
                # distinto no adjudique otra cosa en silencio.
                for fid in fids_declarados:
                    if fid < 0 or fid >= len(gdf):
                        raise SystemExit(
                            f"FALLO: {nombre_dec} declara fid {fid} y el shapefile tiene "
                            f"{len(gdf)} filas. El shapefile no es el adjudicado.")
                    r = gdf.iloc[fid]
                    real = {"nombre": norm(r["NOMBRE"]), "region": str(r["REGION"]).strip(),
                            "area_km2": round(float(r["AREA_KM2"]), 3)}
                    quiere = {"nombre": norm(esperado["nombre"]),
                              "region": str(esperado["region"]).strip(),
                              "area_km2": round(float(esperado["area_km2"]), 3)}
                    if real != quiere:
                        raise SystemExit(
                            f"FALLO: el fid {fid} adjudicado a {nombre_dec} trae {real} y la "
                            f"adjudicacion declara {quiere}. El shapefile no es el adjudicado.")
                    fids.append(fid)
                    detalle.append({"fid": fid, "num": int(r["NUM"]),
                                    "nombre": r["NOMBRE"], "region": r["REGION"],
                                    "area_km2": float(r["AREA_KM2"])})
            elif nombres_shp:
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

            # ── CONTROL DE GEMELOS GEOMETRICOS ────────────────────────────────
            # Falla CONTANDO FILAS. Si un FID adjudicado tiene otra fila con la
            # geometria identica y esa fila no esta declarada en GEMELOS_DECLARADOS,
            # se detiene: alguien podria incorporarla creyendo que suma cuerpo, y
            # la union duplicaria el mismo poligono sin cambiar el area ni un m2.
            gemelos_del_cuerpo = {}
            for fid in fids:
                otros = gemelos_de.get(fid, [])
                if not otros:
                    continue
                declarado = GEMELOS_DECLARADOS.get(fid)
                if declarado is None or sorted(declarado["gemelos"]) != sorted(otros):
                    raise SystemExit(
                        f"FALLO: el fid {fid} adjudicado a {nombre_dec} comparte geometria "
                        f"exacta con {len(otros)} fila(s) mas ({otros}) y eso no esta "
                        f"declarado en GEMELOS_DECLARADOS. Son {len(otros) + 1} filas para "
                        f"el mismo poligono: incorporarlas todas duplicaria el cuerpo sin "
                        f"cambiar el area. Declaralo o corregi la adjudicacion.")
                gemelos_del_cuerpo[str(fid)] = {
                    "gemelos_no_adjudicados": otros,
                    "filas_para_el_mismo_poligono": len(otros) + 1,
                    "motivo": declarado["motivo"],
                }

            tot[resolucion] += 1
            cuerpo = {
                "nombre_decreto": nombre_dec,
                "fragmento_decreto": fragmento,
                "resolucion": resolucion,
                "anclaje": anclaje,
                "shapefile_fid": fids,
                "shapefile_detalle": detalle,
                "motivo": motivo,
            }
            if gemelos_del_cuerpo:
                cuerpo["gemelos_geometricos_declarados"] = gemelos_del_cuerpo
            entrada["cuerpos"].append(cuerpo)
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

    # ── D11: alcance declarado, y la carencia de las once ────────────────────
    ambito_de = {c["id"]: (c.get("ambito") or c.get("tipo")) for c in dec["capitanias"]}
    malas = [j for j in FUERA_DE_ALCANCE_D11 if j not in ambito_de]
    if malas:
        raise SystemExit(f"FALLO: {malas} estan en FUERA_DE_ALCANCE_D11 y no en el decreto.")
    no_maritimas = [j for j in FUERA_DE_ALCANCE_D11 if ambito_de[j] != "maritima"]
    if no_maritimas:
        raise SystemExit(
            f"FALLO: {no_maritimas} estan declaradas fuera de alcance por D11 y su ambito "
            f"no es maritimo. D11 saca de alcance cuerpos que caen en Capitanias MARITIMAS; "
            f"si una es lacustre, entra al cotejo y no se declara como carencia.")
    solapadas = sorted(set(FUERA_DE_ALCANCE_D11) & set(CUERPOS))
    if solapadas:
        raise SystemExit(
            f"FALLO: {solapadas} estan en CUERPOS y en FUERA_DE_ALCANCE_D11 a la vez. "
            f"Una jurisdiccion esta dentro del alcance o fuera, no en los dos.")

    salida["alcance_d11"] = {
        "decidido": "2026-08-12, por el owner",
        "opcion": "estrecha — el cotejo cubre las 6 Capitanias de ambito lacustre",
        "fundamento": "Los cuerpos de las Capitanias maritimas NO tienen geometria hoy, asi "
                      "que la opcion estrecha no le quita nada al patron: no se puede perder "
                      "lo que nunca se publico. La opcion amplia queda como frente propio, "
                      "con su alcance medido antes de comprometerlo.",
        "jurisdicciones_en_alcance": sorted(CUERPOS),
        "carencia_declarada": {
            "que_es": "Capitanias de ambito MARITIMO a las que el decreto tambien les nombra "
                      "cuerpos de agua interior. Quedan FUERA del cotejo por decision D11, y "
                      "se declaran aca para que la ausencia no sea silencio (INV-3.6).",
            "cuantas": len(FUERA_DE_ALCANCE_D11),
            "sin_geometria_hoy": True,
            "jurisdicciones": [{"id": j, "nombre": nombres[j], "ambito": "maritima",
                                "cuerpos_que_el_decreto_le_nombra": txt}
                               for j, txt in sorted(FUERA_DE_ALCANCE_D11.items())],
        },
    }

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
