"""
FASE 2 — Cotejo de cuerpos de agua lacustres: decreto vs. shapefile.

Para cada jurisdiccion de ambito lacustre del decreto, verifica que cada cuerpo
de agua que el decreto le atribuye tenga geometria en el shapefile de cuerpos de
agua continentales.

Insumos (ambos dentro del repo, nunca desde la carpeta personal del owner):
  - data/decreto/jurisdicciones_capitanias.json
  - geodata/lagos/Inventario_Lagos.shp   (reproyectado a EPSG:4326 al leer)

REGLA DE COTEJO — solo coincidencia EXACTA de nombre normalizado cuenta como
encontrado. Normalizar = mayusculas, sin tildes, sin apostrofes, espacios
colapsados. No se acepta ninguna correspondencia por similitud, prefijo ni
distancia de edicion. Los casos que no dan coincidencia exacta se reportan como
NO ENCONTRADO, y si existen candidatos parecidos se listan aparte como DUDOSO
para que los adjudique una persona. Una coincidencia exacta con mas de un
registro del shapefile tampoco se resuelve sola: se marca DUDOSO.

Los nombres de cada cuerpo se transcriben del campo texto_decreto tal como el
decreto los enumera, conservando el sustantivo de tipo (lago / laguna / rio) que
el propio texto aplica a la lista. No se agrega ni se quita ningun cuerpo.

Este script es de solo lectura: no escribe en la base de datos ni construye
geometria.

Uso (desde la raiz del repo):
    tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\fase2_cotejo_lacustre.py
"""

import json
import os
import unicodedata

import geopandas as gpd

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHP = os.path.join(REPO, "geodata", "lagos", "Inventario_Lagos.shp")
DECRETO = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
CRS_TRABAJO = "EPSG:4326"

# ── Transcripcion de los cuerpos nombrados en cada texto_decreto ──────────────
# Estructura: id de la capitania -> lista de (nombre_segun_decreto, fragmento literal)
# El nombre_segun_decreto lleva el sustantivo de tipo que el decreto aplica a la
# enumeracion ("Lagos X, Y y Z" -> "Lago X", "Lago Y", "Lago Z").
CUERPOS = {
    "lago_rapel": [
        ("Lago Rapel", "el lago Rapel"),
    ],
    "lago_villarrica": [
        ("Lago Colico", "Lagos Colico"),
        ("Lago Caburgua", "Lagos ... Caburgua"),
        ("Lago Huilipilun", "Lagos ... Huilipilun"),
        ("Lago Villarrica", "Lagos ... y Villarrica"),
        ("Laguna Conguillio", "lagunas Conguillio"),
        ("Laguna Galletue", "lagunas ... Galletue"),
        ("Laguna Icalma", "lagunas ... e Icalma"),
        ("Rio Tolten", "y el Rio Tolten"),
    ],
    "lago_panguipulli": [
        ("Lago Calafquen", "Lagos Calafquen"),
        ("Lago Panguipulli", "Lagos ... Panguipulli"),
        ("Lago Pellaifa", "Lagos ... Pellaifa"),
        ("Lago Pullinque", "Lagos ... Pullinque"),
        ("Lago Rinihue", "Lagos ... Rinihue"),
        ("Lago Neltume", "Lagos ... Neltume"),
        ("Lago Pirihueico", "Lagos ... Pirihueico"),
        ("Rio Fuy", "los rios Fuy"),
        ("Rio San Pedro", "los rios ... y San Pedro"),
    ],
    "lago_ranco": [
        ("Lago Ranco", "Lagos Ranco"),
        ("Lago Maihue", "Lagos ... Maihue"),
        ("Lago Puyehue", "Lagos ... Puyehue (hasta el limite con la Region de Los Lagos)"),
        ("Lago Huishue", "Lagos ... Huishue"),
        ("Lago Gris", "Lagos ... y Gris"),
        ("Rio Bueno", "Incluye el rio Bueno en los sectores Los Patos, La Goleta y El Manzanito"),
    ],
    "puerto_varas": [
        ("Lago Llanquihue", "Lagos Llanquihue"),
        ("Lago Rupanco", "Lagos ... Rupanco"),
        ("Lago Todos los Santos", "Lagos ... Todos los Santos"),
        ("Lago Puyehue", "Lagos ... Puyehue (hasta el limite con la Region de Los Rios)"),
        ("Lago Constancia", "Lagos ... y Constancia"),
    ],
    "lago_general_carrera": [
        ("Lago General Carrera", "Lagos General Carrera"),
        ("Lago Cochrane", "Lagos ... Cochrane"),
        ("Lago O'Higgins", "Lagos ... y O'Higgins"),
    ],
}


def norm(s):
    """Mayusculas, sin tildes, sin apostrofes, espacios colapsados."""
    if s is None:
        return ""
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = s.upper().replace("'", "").replace("’", "").replace("`", "")
    return " ".join(s.split())


def sep(t):
    print()
    print("=" * 100)
    print(t)
    print("=" * 100)


def main():
    print("FASE 2 — COTEJO DE CUERPOS DE AGUA LACUSTRES (decreto vs. shapefile)")
    print(f"Decreto   : {os.path.relpath(DECRETO, REPO)}")
    print(f"Shapefile : {os.path.relpath(SHP, REPO)}")

    dec = json.load(open(DECRETO, encoding="utf-8"))
    print(f"Fuente declarada: {dec['fuente']}")
    print(f"Generado        : {dec['generado']}")

    gdf = gpd.read_file(SHP).to_crs(CRS_TRABAJO)
    print(f"Registros del shapefile: {len(gdf)}   CRS: {gdf.crs.to_string()}")

    # Indice de nombres normalizados -> lista de indices de fila
    idx = {}
    for i, nom in enumerate(gdf["NOMBRE"]):
        idx.setdefault(norm(nom), []).append(i)

    # El ambito se lee por la clave que el archivo trae, no por una fija con
    # default: 'tipo' es la del v1 y 'ambito' la del v2. Con `c.get("tipo")` a
    # secas, pasarle un archivo que use la otra clave devuelve cero lacustres y el
    # cotejo informa "todo en orden" sin haber mirado nada.
    claves = [k for k in ("ambito", "tipo") if any(k in c for c in dec["capitanias"])]
    if not claves:
        raise SystemExit("FALLO: ninguna capitania declara 'ambito' ni 'tipo'. "
                         "No se asume el ambito de nadie.")
    sin_ambito = [c["id"] for c in dec["capitanias"]
                  if not any(k in c for k in claves)]
    if sin_ambito:
        raise SystemExit(f"FALLO: sin campo de ambito: {sin_ambito}")
    lacustres = [c for c in dec["capitanias"]
                 if any(c.get(k) == "lacustre" for k in claves)]
    print(f"Campo de ambito en uso: {', '.join(claves)}")
    print(f"Jurisdicciones de ambito lacustre en el decreto: {len(lacustres)}")
    if not lacustres:
        raise SystemExit("FALLO: cero jurisdicciones lacustres. El decreto define "
                         "seis; un cotejo vacio no es un cotejo en orden.")

    filas = []       # (jurisdiccion, nombre_decreto, nombre_shapefile, encontrado)
    dudosos = []     # detalle para adjudicacion humana
    no_encontrados = []

    for cap in lacustres:
        cuerpos = CUERPOS.get(cap["id"])
        sep(f"JURISDICCION: {cap['nombre']}   (id: {cap['id']}, gobernacion: {cap['gobernacion']})")
        print("TEXTO LITERAL DEL DECRETO:")
        print(f"  {cap['texto_decreto']}")
        print()

        if cuerpos is None:
            print("  Cuerpos atribuidos: no determinado (id sin transcripcion).")
            continue

        print(f"  Cuerpos nombrados en el texto: {len(cuerpos)}")
        print()
        print(f"  {'NOMBRE SEGUN DECRETO':<26} {'NOMBRE EN SHAPEFILE':<26} {'ENCONTRADO':<12} DETALLE")
        print(f"  {'-'*26} {'-'*26} {'-'*12} {'-'*40}")

        for nombre_dec, fragmento in cuerpos:
            n = norm(nombre_dec)
            hits = idx.get(n, [])

            # Fallback exacto sobre el nombre desnudo (sin el sustantivo de tipo),
            # por si el shapefile no repite "LAGO"/"LAGUNA" en el campo NOMBRE.
            via = "exacta"
            if not hits:
                desnudo = " ".join(n.split()[1:]) if len(n.split()) > 1 else n
                if desnudo and desnudo in idx:
                    hits = idx[desnudo]
                    via = "exacta sin sustantivo de tipo"

            if len(hits) == 1:
                r = gdf.iloc[hits[0]]
                estado = "SI"
                nom_shp = r["NOMBRE"]
                detalle = f"{r['REGION']} | {r['AREA_KM2']} km2 | match {via}"
            elif len(hits) > 1:
                estado = "DUDOSO"
                nom_shp = gdf.iloc[hits[0]]["NOMBRE"]
                detalle = f"{len(hits)} registros con el mismo nombre — ambiguo"
                dudosos.append((cap["nombre"], nombre_dec, "multiple", [
                    (gdf.iloc[h]["NOMBRE"], gdf.iloc[h]["REGION"], gdf.iloc[h]["COMUNA"],
                     gdf.iloc[h]["AREA_KM2"]) for h in hits]))
            else:
                estado = "NO"
                nom_shp = "—"
                # Candidatos SOLO para listarlos aparte. No se aceptan nunca.
                # Se busca por token completo y tambien por prefijo de 6 letras del
                # token, para que una grafia distinta (Caburgua / CABURGA) aparezca
                # como dudoso y no se reporte como ausencia total.
                tokens = [t for t in n.split() if t not in ("LAGO", "LAGUNA", "RIO") and len(t) > 3]
                cands = []
                vistos = set()
                if tokens:
                    for k, hs in idx.items():
                        completo = all(t in k for t in tokens)
                        prefijo = all(t[:6] in k for t in tokens)
                        if completo or prefijo:
                            for h in hs:
                                if h in vistos:
                                    continue
                                vistos.add(h)
                                cands.append((gdf.iloc[h]["NOMBRE"], gdf.iloc[h]["REGION"],
                                              gdf.iloc[h]["COMUNA"], gdf.iloc[h]["AREA_KM2"]))
                detalle = f"sin coincidencia exacta; candidatos parecidos: {len(cands)}"
                no_encontrados.append((cap["nombre"], nombre_dec, fragmento, cands))
                if cands:
                    dudosos.append((cap["nombre"], nombre_dec, "parecido", cands))

            print(f"  {nombre_dec:<26} {str(nom_shp):<26} {estado:<12} {detalle}")
            filas.append((cap["nombre"], nombre_dec, str(nom_shp), estado))

    # ── Resumen ──────────────────────────────────────────────────────────────
    sep("TABLA DE CORRESPONDENCIA COMPLETA")
    print(f"{'JURISDICCION':<24} {'NOMBRE SEGUN DECRETO':<26} {'NOMBRE EN SHAPEFILE':<26} ENCONTRADO")
    print(f"{'-'*24} {'-'*26} {'-'*26} {'-'*10}")
    for j, nd, ns, e in filas:
        print(f"{j:<24} {nd:<26} {ns:<26} {e}")

    n_si = sum(1 for f in filas if f[3] == "SI")
    n_no = sum(1 for f in filas if f[3] == "NO")
    n_du = sum(1 for f in filas if f[3] == "DUDOSO")
    sep("CONTEO")
    print(f"  Cuerpos atribuidos por el decreto : {len(filas)}")
    print(f"  Encontrados (coincidencia exacta) : {n_si}")
    print(f"  NO encontrados                    : {n_no}")
    print(f"  Dudosos                           : {n_du}")

    sep("NO ENCONTRADOS — RESULTADO PRINCIPAL DE LA FASE")
    if not no_encontrados:
        print("  (ninguno)")
    for jur, nom, frag, cands in no_encontrados:
        print()
        print(f"  {nom}   [jurisdiccion: {jur}]")
        print(f"    fragmento literal del decreto: \"{frag}\"")
        print(f"    en el shapefile: sin coincidencia exacta de nombre")
        if cands:
            print(f"    candidatos NO aceptados ({len(cands)}), para adjudicacion humana:")
            for c in cands[:12]:
                print(f"      - {c[0]}  |  {c[1]}  |  {c[2]}  |  {c[3]} km2")
            if len(cands) > 12:
                print(f"      ... y {len(cands)-12} mas")

    sep("DUDOSOS — LISTADOS APARTE, NO RESUELTOS")
    if not dudosos:
        print("  (ninguno)")
    for jur, nom, clase, cands in dudosos:
        print()
        etiqueta = ("coincidencia exacta multiple" if clase == "multiple"
                    else "sin coincidencia exacta, hay nombres parecidos")
        print(f"  {nom}   [jurisdiccion: {jur}]  — {etiqueta}")
        for c in cands[:12]:
            print(f"      - {c[0]}  |  {c[1]}  |  {c[2]}  |  {c[3]} km2")
        if len(cands) > 12:
            print(f"      ... y {len(cands)-12} mas")

    sep("FIN FASE 2")


if __name__ == "__main__":
    main()
