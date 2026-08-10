"""
FASE 3 ter — Capa de jurisdicciones con las poligonales completas del decreto.

La fuente ahora entrega tres campos que antes faltaban:
  poligonal_completa  el recorrido integro, con los giros axiales de la prosa.
  rol_cadena          que borde del poligono forma la poligonal: N, S, E, W,
                      NE, SE o 'anillo'.
  cierre              como se cierra el resto del poligono, en prosa.

METODO UNIFORME (uno solo para los 15 casos con rol, en vez de un caso especial
por jurisdiccion):

  1. Se arma una CAJA acotada al norte y al sur por los paralelos limite del
     decreto, o por el extremo de la poligonal cuando el decreto no da paralelo
     de ese lado; al Weste por el limite exterior del espacio maritimo y al Este
     por un borde generoso tierra adentro.
  2. Se PARTE la caja con la poligonal, prolongando sus dos segmentos terminales
     hasta salir de la caja para que el corte sea completo.
  3. rol_cadena ELIGE el trozo: la poligonal es un borde, y el rol dice de que
     lado queda la jurisdiccion.
        E, SE, NE  -> la jurisdiccion queda al Weste de la poligonal
        W          -> queda al Este
        N          -> queda al Sur
        S          -> queda al Norte
  4. rol 'anillo' no se parte: la poligonal ya cierra sobre si misma.

  Este metodo no depende del orden en que venga la poligonal, que varia — Quemchi
  viene de Sur a Norte y el resto de Norte a Sur.

  Un punto de la poligonal con lon nula significa 'por este paralelo hasta el
  lado abierto'. Se resuelve al borde abierto que declara el campo cierre.

QUE ES DECRETO Y QUE ES CONVENCION: igual que en Fase 3 bis. Del decreto salen
los paralelos, los vertices, el rol de cada poligonal y la extension mar afuera
(Art. 2). Es convencion nuestra la separacion lateral en la franja oceanica, el
valor de 200 mn como limite exterior, y el cierre generoso hacia tierra con resta
posterior de la capa de tierra.

Uso (desde scripts/):
    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe fase3ter_construir_capa.py
"""

import json
import os
from collections import Counter

import geopandas as gpd
from shapely.geometry import LineString, Polygon, box
from shapely.ops import split, unary_union
from shapely.validation import explain_validity, make_valid

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECRETO = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
ADJUDICADO = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
SHP = os.path.join(REPO, "geodata", "lagos", "Inventario_Lagos.shp")
SALIDA_SQL = os.path.join(REPO, "scripts", "fase3ter_capa_jurisdicciones.sql")
SALIDA_ADY = os.path.join(REPO, "scripts", "fase3ter_adyacencias.sql")

TABLA = "jurisdicciones_decreto"
LIMITE_ZEE_M = 370400
X_W, X_E = -85.0, -65.0
CRS = 4326
# Grados que se prolongan los segmentos terminales. Tiene que garantizar la salida
# de la caja desde cualquier punto interior: la caja mide 20 grados de ancho y hasta
# unos 7 de alto, asi que 60 sale siempre, incluso para un segmento casi paralelo a
# un borde. Con 5 no alcanzaba y Maullin no llegaba a partir su caja.
PROLONGA = 60.0

reparaciones = []


def sql_str(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"


def sql_bool(b):
    return "TRUE" if b else "FALSE"


# El decreto no cierra por el lado del oceano las figuras que salen mar afuera;
# donde no lo hace, el campo 'cierre' de la fuente lo dice con palabras. Ese texto
# se mapea al borde de la caja SIN caso por defecto. Antes, cualquier texto que no
# dijera "Abierto al Weste" — incluido un campo ausente — resolvia al Este, y un
# vertice de longitud nula terminaba a 20 grados tierra adentro en vez de mar
# afuera, sin error ni aviso: la figura entera cambia de lado en silencio.
CIERRE_A_BORDE = (("Abierto al Weste", X_W), ("Abierto al Este", X_E))


def borde_abierto(cap):
    """(x, None) si el texto de cierre dice a que lado abre; (None, motivo) si no."""
    texto = cap.get("cierre") or ""
    hallados = [(frase, x) for frase, x in CIERRE_A_BORDE if frase in texto]
    if len(hallados) == 1:
        return hallados[0][1], None
    if not hallados:
        return None, ("un vertice de longitud nula exige saber a que lado abre la "
                      "figura y el campo 'cierre' no lo dice" +
                      (f": '{texto[:60]}'" if texto else " (campo ausente)"))
    return None, ("el campo 'cierre' nombra mas de un lado abierto: " +
                  ", ".join(f for f, _ in hallados))


def puntos(cap):
    """(puntos, fuente, motivo_de_error). lon nula -> el borde que declare 'cierre'.

    Devuelve tambien de cual de los dos campos salieron los puntos: las dos fuentes
    difieren en 8 de las 18 capitanias que tienen ambas pobladas, y cual se uso es
    parte de la trazabilidad de la figura, no un detalle interno.
    """
    fuente = ("poligonal_completa" if cap.get("poligonal_completa")
              else "vertices" if cap.get("vertices") else None)
    pc = cap.get("poligonal_completa") or cap.get("vertices") or []
    x_abierto = None
    if any(v.get("lat") is not None and v.get("lon") is None for v in pc):
        x_abierto, err = borde_abierto(cap)
        if err:
            return [], fuente, err
    out = []
    for v in pc:
        if v.get("lat") is None:
            continue
        lon = v["lon"] if v.get("lon") is not None else x_abierto
        out.append((lon, v["lat"]))
    return out, fuente, None


def prolongar(linea):
    """Prolonga los segmentos terminales para que el corte cruce la caja entera."""
    cs = list(linea.coords)
    (x0, y0), (x1, y1) = cs[0], cs[1]
    d = ((x0 - x1) ** 2 + (y0 - y1) ** 2) ** 0.5 or 1.0
    ini = (x0 + (x0 - x1) / d * PROLONGA, y0 + (y0 - y1) / d * PROLONGA)
    (xa, ya), (xb, yb) = cs[-1], cs[-2]
    d2 = ((xa - xb) ** 2 + (ya - yb) ** 2) ** 0.5 or 1.0
    fin = (xa + (xa - xb) / d2 * PROLONGA, ya + (ya - yb) / d2 * PROLONGA)
    return LineString([ini] + cs + [fin])


# El rol de la cadena mapea a un lado. Tabla explicita: un rol que no este aqui no
# cae en ningun lado, se declara. Antes, el 'else' devolvia None y el llamador lo
# reportaba como "no selecciono ningun trozo", que es otra causa — la figura queda
# nula igual, pero por un motivo que no es el verdadero y que manda a buscar el
# defecto donde no esta.
ROL_A_LADO = {"E": "weste", "SE": "weste", "NE": "weste",
              "W": "este", "N": "sur", "S": "norte"}


def elegir_lado(trozos, corte, rol):
    """(geometria, None) o (None, motivo). El rol dice de que lado de la poligonal
    queda la jurisdiccion."""
    lado = ROL_A_LADO.get(rol)
    if lado is None:
        return None, (f"rol_cadena '{rol}' no esta en la tabla de lados "
                      f"({', '.join(sorted(ROL_A_LADO))}); no se elige uno por defecto")
    cx, cy = corte.centroid.x, corte.centroid.y
    if lado == "weste":
        sel = [t for t in trozos if t.centroid.x < cx]
    elif lado == "este":
        sel = [t for t in trozos if t.centroid.x > cx]
    elif lado == "sur":
        sel = [t for t in trozos if t.centroid.y < cy]
    else:
        sel = [t for t in trozos if t.centroid.y > cy]
    if not sel:
        return None, f"rol_cadena '{rol}' no selecciono ningun trozo"
    return unary_union(sel), None


def construir_por_rol(cap):
    pts, _fuente, err = puntos(cap)
    rol = cap.get("rol_cadena")
    if err:
        return None, err
    if len(pts) < 2:
        return None, "poligonal con menos de 2 puntos"

    if rol == "anillo":
        poly = Polygon(pts)
        return (poly if poly.is_valid else make_valid(poly)), None

    lats = [p[1] for p in pts]
    n, s = cap.get("limite_norte_dec"), cap.get("limite_sur_dec")
    lat_n = max([l for l in ([n] if n is not None else []) + lats])
    lat_s = min([l for l in ([s] if s is not None else []) + lats])
    if lat_n == lat_s:
        return None, "la caja resultante tiene altura cero"

    caja = box(X_W, lat_s, X_E, lat_n)
    corte = LineString(pts)
    try:
        trozos = [g for g in split(caja, prolongar(corte)).geoms if g.area > 0]
    except Exception as e:                                    # noqa: BLE001
        return None, f"el corte de la caja fallo: {e}"
    if len(trozos) < 2:
        return None, ("la poligonal no parte la caja en dos: no separa la "
                      "jurisdiccion de su vecina")
    g, err = elegir_lado(trozos, corte, rol)
    if err:
        return None, err
    if g.is_empty:
        return None, f"rol_cadena '{rol}' selecciono un trozo vacio"
    return (g if g.is_valid else make_valid(g)), None


def geom_lacustre(gdf, cuerpos):
    partes = []
    for c in cuerpos:
        for fid in c["shapefile_fid"]:
            g = gdf.geometry.iloc[fid]
            if not g.is_valid:
                motivo, a0 = explain_validity(g), g.area
                g = make_valid(g)
                reparaciones.append({"fid": fid, "nombre": gdf["NOMBRE"].iloc[fid],
                                     "motivo": motivo, "antes": a0, "despues": g.area,
                                     "dif": abs(g.area - a0)})
            partes.append(g)
    return unary_union(partes) if partes else None


def main():
    dec = json.load(open(DECRETO, encoding="utf-8"))
    adj = json.load(open(ADJUDICADO, encoding="utf-8"))
    gdf = gpd.read_file(SHP).to_crs(epsg=CRS)
    cuerpos_por_jur = {j["id"]: j["cuerpos"] for j in adj["jurisdicciones"]}

    filas, diag = [], []

    for cap in dec["capitanias"]:
        cid = cap["id"]
        ambito = cap["ambito"]
        # Los puntos se resuelven una sola vez. 'err_pts' es un estado propio, no un
        # 'no hay puntos': confundirlos manda la figura a otra receta en silencio.
        pts_cap, fuente_pts, err_pts = puntos(cap)
        f = {"id": cid, "nombre": cap["nombre"], "gobernacion": cap["gobernacion"],
             "ambito": ambito, "participa_matching": cap["participa_matching"],
             "sin_georreferenciar": bool(cap.get("sin_georreferenciar", False)),
             "texto_decreto": cap["texto_decreto"], "rol": cap.get("rol_cadena"),
             "geom_sql": "NULL", "metodo": None, "estado": None, "causa": None}

        if ambito == "lacustre":
            # El id se busca en el otro insumo SIN default. Un id ausente y un id
            # presente con todos sus cuerpos sin geometria son cosas distintas: el
            # primero es un desacuerdo entre dos archivos, el segundo es el estado
            # legitimo del dato. Con '.get(cid, [])' los dos daban la misma causa y
            # una lacustre podia quedar vacia contra INV-3.5 sin que nada lo dijera.
            if cid not in cuerpos_por_jur:
                f.update(estado="nula_no_determinada",
                         causa=("no tiene entrada en cotejo_lacustre_adjudicado.json: "
                                "los dos insumos no concuerdan en los ids. No se asume "
                                "que no tenga cuerpos"))
            else:
                g = geom_lacustre(gdf, cuerpos_por_jur[cid])
                if g is None or g.is_empty:
                    f.update(estado="nula_no_determinada",
                             causa="tiene entrada, y ninguno de sus cuerpos trae geometria")
                else:
                    f.update(estado="construida", metodo="union_cuerpos",
                             geom_sql=f"ST_Multi(ST_GeomFromText('{g.wkt}', {CRS}))")

        elif "revisar" in cap:
            # La fuente declara que el decreto no entrega el dato. No es
            # transcripcion pendiente: es un limite que el decreto no georreferencia.
            f.update(estado="nula_declarada", causa=cap["revisar"])

        elif ambito == "insular_remota":
            f.update(estado="nula_no_determinada",
                     causa="el decreto nombra islas sin coordenadas; requiere capa de islas")

        elif ambito == "antartica":
            if err_pts:
                f.update(estado="nula_no_determinada", causa=err_pts)
            elif len(pts_cap) >= 3:
                poly = Polygon(pts_cap)
                f.update(estado="construida", metodo="anillo_vertices",
                         geom_sql=("ST_Multi(ST_GeomFromText('"
                                   f"{(poly if poly.is_valid else make_valid(poly)).wkt}'"
                                   f", {CRS}))"))
            else:
                f.update(estado="nula_no_determinada", causa="menos de 3 vertices")

        elif cap.get("rol_cadena"):
            g, err = construir_por_rol(cap)
            if g is None:
                f.update(estado="nula_no_determinada", causa=err)
            else:
                metodo = ("anillo_poligonal" if cap["rol_cadena"] == "anillo"
                          else f"poligonal_rol_{cap['rol_cadena']}")
                f.update(estado="construida", metodo=metodo,
                         geom_sql=f"ST_Multi(ST_GeomFromText('{g.wkt}', {CRS}))")

        elif cap.get("vertices") and not err_pts and len(pts_cap) >= 4 and \
                pts_cap[0] == pts_cap[-1]:
            poly = Polygon(pts_cap)
            f.update(estado="construida", metodo="anillo_vertices",
                     geom_sql=("ST_Multi(ST_GeomFromText('"
                               f"{(poly if poly.is_valid else make_valid(poly)).wkt}'"
                               f", {CRS}))"))

        elif cap.get("limite_norte_dec") is not None and \
                cap.get("limite_sur_dec") is not None and not cap.get("vertices"):
            lat_n = max(cap["limite_norte_dec"], cap["limite_sur_dec"])
            lat_s = min(cap["limite_norte_dec"], cap["limite_sur_dec"])
            f.update(estado="construida", metodo="banda_paralelos",
                     geom_sql=(f"ST_Multi(ST_MakeEnvelope({X_W}, {lat_s}, {X_E}, "
                               f"{lat_n}, {CRS}))"))
        elif err_pts:
            # No se degrada a la banda de paralelos ni se reporta como paralelo
            # faltante: lo que falta es saber a que lado abre la figura.
            f.update(estado="nula_no_determinada", causa=err_pts)
        else:
            falta = ("limite sur" if cap.get("limite_norte_dec") is not None else
                     "limite norte" if cap.get("limite_sur_dec") is not None else
                     "ambos paralelos")
            f.update(estado="nula_no_determinada",
                     causa=(f"el decreto no entrega con que cerrar: falta {falta}. "
                            f"No se toma del vecino."))

        filas.append(f)
        diag.append((cap["nombre"], ambito, str(cap.get("rol_cadena")),
                     fuente_pts or "-", f["metodo"] or "-", f["estado"]))

    # ── SQL de construccion ──────────────────────────────────────────────────
    L = []
    A = L.append
    A("-- FASE 3 ter — Capa de jurisdicciones del D.S. 991/1987.")
    A("-- GENERADO por scripts/fase3ter_construir_capa.py (INV-3.7). No editar.")
    A("-- DECRETO   : paralelos, poligonales completas, rol_cadena, y la extension")
    A("--             mar afuera del Art. 2.")
    A("-- CONVENCION: separacion lateral en la franja oceanica, 200 mn como limite")
    A(f"--             exterior ({LIMITE_ZEE_M} m), y cierre generoso hacia tierra con")
    A("--             resta posterior de la capa de tierra.")
    A("")
    for r in reparaciones:
        A(f"-- ST_MakeValid en fid {r['fid']} {r['nombre']}: {r['motivo']}")
        A(f"--   antes={r['antes']:.12f} despues={r['despues']:.12f} dif={r['dif']:.3e}")
    A("")
    A("BEGIN;")
    A(f"DROP TABLE IF EXISTS {TABLA};")
    A(f"CREATE TABLE {TABLA} (")
    A("  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, gobernacion TEXT NOT NULL,")
    A("  ambito TEXT NOT NULL CHECK (ambito IN "
      "('maritima','lacustre','antartica','insular_remota')),")
    A("  participa_matching BOOLEAN NOT NULL, sin_georreferenciar BOOLEAN NOT NULL,")
    A("  estado_geometria TEXT NOT NULL CHECK (estado_geometria IN "
      "('construida','nula_declarada','nula_no_determinada')),")
    A("  metodo TEXT, rol_cadena TEXT, causa_sin_geom TEXT, texto_decreto TEXT NOT NULL,")
    A(f"  geom geometry(MultiPolygon, {CRS}));")
    A("")
    for f in filas:
        A(f"INSERT INTO {TABLA} VALUES ({sql_str(f['id'])}, {sql_str(f['nombre'])},")
        A(f"  {sql_str(f['gobernacion'])}, {sql_str(f['ambito'])}, "
          f"{sql_bool(f['participa_matching'])}, {sql_bool(f['sin_georreferenciar'])},")
        A(f"  {sql_str(f['estado'])}, {sql_str(f['metodo'])}, {sql_str(f['rol'])},")
        A(f"  {sql_str(f['causa'])}, {sql_str(f['texto_decreto'])}, {f['geom_sql']});")
    A("")
    A("CREATE TEMP TABLE _tierra AS")
    A("SELECT ST_Subdivide(ST_MakeValid(geom), 256) AS geom FROM mapa_base_multipoligonos")
    A(f"WHERE geom && ST_MakeEnvelope({X_W}, -60, {X_E}, -17, {CRS})")
    A("UNION ALL")
    A("SELECT ST_Subdivide(ST_MakeValid(ST_Intersection(ST_MakeValid(geom),")
    A(f"       ST_MakeEnvelope({X_W}, -60, {X_E}, -17, {CRS}))), 256) FROM ne_land")
    A(f"WHERE ST_Intersects(geom, ST_MakeEnvelope({X_W}, -60, {X_E}, -17, {CRS}));")
    A("CREATE INDEX ON _tierra USING GIST (geom);")
    A("ANALYZE _tierra;")
    A("")
    A("-- Limite exterior. OJO: hay que RECORTAR ne_land al bbox ANTES de unir y")
    A("-- buffear. ne_land trae un poligono con toda la tierra del mundo; buffearlo")
    A("-- entero en espacio geography da una geometria degenerada que cubre el globo,")
    A("-- y entonces el recorte no recorta nada y los poligonos se quedan pegados al")
    A("-- borde arbitrario de la caja en vez del limite exterior del Art. 2.")
    A("CREATE TEMP TABLE _zee AS")
    A("SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(")
    A("  ST_Simplify(ST_Union(ST_MakeValid(ST_Intersection(ST_MakeValid(l.geom),")
    A(f"    ST_MakeEnvelope({X_W}, -60, {X_E}, -17, {CRS})))), 0.01)::geography,")
    A(f"  {LIMITE_ZEE_M})::geometry), 1e-8) AS geom FROM ne_land l")
    A(f"WHERE ST_Intersects(l.geom, ST_MakeEnvelope({X_W}, -60, {X_E}, -17, {CRS}));")
    A("")
    A("-- Acotar al limite exterior todo lo maritimo que se extiende mar afuera.")
    A(f"UPDATE {TABLA} j SET geom = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
    A("  ST_Intersection(ST_ReducePrecision(j.geom, 1e-8), z.geom)), 3))")
    A("FROM _zee z WHERE j.ambito = 'maritima' AND j.geom IS NOT NULL;")
    A("")
    A("-- Restar tierra. Solo maritima.")
    A(f"UPDATE {TABLA} j SET geom = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
    A("  ST_Difference(ST_ReducePrecision(j.geom, 1e-8), t.geom)), 3))")
    A("FROM (SELECT j2.id, ST_ReducePrecision(ST_MakeValid(")
    A("        ST_UnaryUnion(ST_Collect(t2.geom))), 1e-8) AS geom")
    A(f"      FROM {TABLA} j2 JOIN _tierra t2")
    A("        ON t2.geom && j2.geom AND ST_Intersects(t2.geom, j2.geom)")
    A("      WHERE j2.ambito = 'maritima' AND j2.geom IS NOT NULL")
    A("      GROUP BY j2.id) t WHERE j.id = t.id;")
    A("")
    A(f"UPDATE {TABLA} SET geom = ST_MakeValid(geom) "
      "WHERE geom IS NOT NULL AND NOT ST_IsValid(geom);")
    A(f"CREATE INDEX idx_{TABLA}_geom ON {TABLA} USING GIST (geom);")
    A(f"CREATE INDEX idx_{TABLA}_ambito ON {TABLA} (ambito);")
    A(f"ANALYZE {TABLA};")
    A("COMMIT;")
    open(SALIDA_SQL, "w", encoding="utf-8").write("\n".join(L))

    # ── Pares que comparten vertices, para el control de adyacencia ──────────
    # Secuencia de puntos de cada jurisdiccion, EN EL ORDEN DEL DECRETO. El orden
    # importa: la frontera compartida se reconstruye siguiendolo. Ordenar por
    # coordenada daria una linea en zigzag que no es la frontera y falsea el hueco.
    secuencia = {}
    for cap in dec["capitanias"]:
        seq = []
        for campo in ("poligonal_completa", "vertices"):
            for v in cap.get(campo) or []:
                if v.get("lat") is not None and v.get("lon") is not None:
                    p = (round(v["lon"], 6), round(v["lat"], 6))
                    if p not in seq:
                        seq.append(p)
            if seq:
                break
        if seq:
            secuencia[cap["id"]] = seq

    ids = sorted(secuencia)
    pares = []
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            sb = set(secuencia[b])
            comunes = [p for p in secuencia[a] if p in sb]   # orden de A
            if len(comunes) >= 2:
                pares.append((a, b, comunes))

    S = []
    B = S.append
    B("-- FASE 3 ter — Control de adyacencia entre vecinas que comparten frontera.")
    B("-- Un par comparte frontera si comparte 2 o mas vertices en el JSON del decreto.")
    B("-- HUECO: superficie dentro de una franja de 1 km alrededor de la frontera")
    B("-- compartida que no cubre ninguna de las dos y que no es tierra.")
    B("DROP TABLE IF EXISTS _ady;")
    B("CREATE TEMP TABLE _ady (id_a TEXT, id_b TEXT, n_vert INT, linea geometry);")
    for a, b, comunes in pares:
        wkt = LineString(comunes).wkt if len(comunes) >= 2 else None
        if wkt:
            B(f"INSERT INTO _ady VALUES ('{a}', '{b}', {len(comunes)}, "
              f"ST_GeomFromText('{wkt}', {CRS}));")
    B("")
    B("CREATE TEMP TABLE _tierra2 AS")
    B("SELECT ST_Subdivide(ST_MakeValid(geom), 256) AS geom FROM mapa_base_multipoligonos")
    B(f"WHERE geom && ST_MakeEnvelope({X_W}, -60, {X_E}, -17, {CRS})")
    B("UNION ALL")
    B("SELECT ST_Subdivide(ST_MakeValid(ST_Intersection(ST_MakeValid(geom),")
    B(f"       ST_MakeEnvelope({X_W}, -60, {X_E}, -17, {CRS}))), 256) FROM ne_land")
    B(f"WHERE ST_Intersects(geom, ST_MakeEnvelope({X_W}, -60, {X_E}, -17, {CRS}));")
    B("CREATE INDEX ON _tierra2 USING GIST (geom);")
    B("ANALYZE _tierra2;")
    B("")
    B("-- Un par con una geometria NULL NO se informa como traslape 0 ni hueco 0: se")
    B("-- informa como no evaluable. Cero medido y cero por falta de dato son cosas")
    B("-- distintas, y darlos con el mismo numero es el falso negativo silencioso que")
    B("-- prohibe INV-3.6, aplicado al control en vez de a la capa.")
    B("SELECT a.nombre AS vecina_a, b.nombre AS vecina_b, d.n_vert AS vert_comunes,")
    B("  a.estado_geometria AS est_a, b.estado_geometria AS est_b,")
    B("  (a.geom IS NOT NULL AND b.geom IS NOT NULL) AS evaluable,")
    B("  round((ST_Area(ST_Intersection(a.geom, b.geom)::geography)")
    B("        /1e6)::numeric, 4) AS km2_traslape,")
    B("  round((ST_Area((")
    B("     SELECT ST_Difference(")
    B("       ST_Difference(ST_Buffer(d.linea::geography, 1000)::geometry,")
    B("         ST_Union(a.geom, b.geom)),")
    B("       COALESCE((SELECT ST_UnaryUnion(ST_Collect(t.geom)) FROM _tierra2 t")
    B("                 WHERE t.geom && ST_Buffer(d.linea::geography, 1000)::geometry),")
    B("                ST_SetSRID('POLYGON EMPTY'::geometry, 4326)))")
    B("  )::geography))/1e6)::numeric, 4) AS km2_hueco")
    B(f"FROM _ady d JOIN {TABLA} a ON a.id = d.id_a JOIN {TABLA} b ON b.id = d.id_b")
    B("ORDER BY evaluable, km2_traslape DESC NULLS LAST, km2_hueco DESC NULLS LAST;")
    open(SALIDA_ADY, "w", encoding="utf-8").write("\n".join(S))

    print("FASE 3 ter — GENERACION")
    print(f"  construccion: {os.path.relpath(SALIDA_SQL, REPO)}")
    print(f"  adyacencias : {os.path.relpath(SALIDA_ADY, REPO)}  ({len(pares)} pares)")
    print()
    print(f"{'NOMBRE':<24} {'AMBITO':<15} {'ROL':<7} {'FUENTE PUNTOS':<20} "
          f"{'METODO':<22} ESTADO")
    print("-" * 120)
    for n, a, r, fp, m, e in diag:
        print(f"{n:<24} {a:<15} {r:<7} {fp:<20} {m:<22} {e}")
    print()
    for et, cnt in (("FUENTE DE PUNTOS", Counter(d[3] for d in diag)),
                    ("METODO", Counter(d[4] for d in diag)),
                    ("ESTADO", Counter(d[5] for d in diag))):
        print(f"CONTEO POR {et}")
        for k, v in sorted(cnt.items()):
            print(f"  {k:<26} {v}")
        print()
    print("NULAS POR CAUSA")
    for f in filas:
        if f["estado"] != "construida":
            print(f"  [{f['estado']:<20}] {f['nombre']:<22} {str(f['causa'])[:78]}")


if __name__ == "__main__":
    main()
