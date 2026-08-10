"""
FASE 3 — Construccion de la capa unica de jurisdicciones.

SUPERSEDIDO POR fase3ter_construir_capa.py. NO CORRER.
Se versiona como evidencia del metodo que se probo y se abandono: aqui la banda
entre paralelos es el metodo POR DEFECTO, y eso produce rectangulos que se pisan
entre vecinas laterales — el §7 del CONTRATO_MOTOR registra por que se descarto
resolver jurisdiccion por aproximacion geometrica. Su SQL, fase3_capa_jurisdicciones
.sql, se conserva por el mismo motivo. La capa vigente se declara en
scripts/fase5_declarar_capas_vigentes.sql.

Genera scripts/fase3_capa_jurisdicciones.sql, que crea public.jurisdicciones_decreto
con un campo de ambito, la puebla y deja el indice espacial. El SQL es la salida
reproducible: se regenera corriendo este script y se aplica con psql.

FUENTES (todas dentro del repo):
  - data/decreto/jurisdicciones_capitanias.json        (limites del D.S. 991)
  - data/decreto/cotejo_lacustre_adjudicado.json       (correspondencias adjudicadas)
  - geodata/lagos/Inventario_Lagos.shp                 (cuerpos de agua, EPSG:32719)
  - public.mapa_base_multipoligonos                    (costa, en la base)

METODOS DE CONSTRUCCION, por lo que el decreto entrega:

  anillo_vertices   Los vertices forman un anillo cerrado (primero == ultimo).
                    Se construye el poligono del anillo y se resta la costa.
                    4 jurisdicciones.

  banda_paralelos   El decreto da limite norte y limite sur. Se construye la banda
                    entre ambos paralelos, se acota hacia el oceano por la ZEE y se
                    resta la costa. 38 jurisdicciones.

  union_cuerpos     Ambito lacustre: union de los cuerpos de agua que el decreto
                    atribuye, segun la adjudicacion de la Fase 2. NO se resta costa
                    (INV-3.5: un cuerpo interior esta rodeado de tierra por
                    definicion y el recorte lo eliminaria). 6 jurisdicciones.

  (sin construir)   Todo lo demas queda con geometria NULA y su motivo explicito.
                    No se rellena por inferencia.

PARAMETROS DE CONSTRUCCION (uniformes y declarados, no inferidos caso a caso):

  LIMITE_ZEE_M = 370400   200 millas nauticas. El limite oceanico no viene por
                          jurisdiccion en el articulado; sale del Art. 2 del propio
                          decreto, que declara que las jurisdicciones comprenden mar
                          territorial, zona contigua, ZEE y plataforma continental.
                          Se aplica igual a todas.

  CAPA DE COSTA: se resta public.mapa_base_multipoligonos, que es la capa de costa de
                 mayor resolucion disponible en la base — 76.185 de sus 76.196 filas
                 son natural=coastline, y aporta 876.084 vertices dentro del bbox de
                 canales contra 16.113 de ne_land (54x). Ademas tiene indice GIST;
                 ne_land no lo tiene.

  El buffer de ZEE se calcula sobre ne_land (baja resolucion) a proposito: a 370 km
  de la costa el detalle del litoral es irrelevante y el calculo sobre la capa de
  alta resolucion seria mucho mas caro sin cambiar el resultado.

Uso (desde scripts/):
    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe fase3_construir_capa.py
"""

import json
import os

import geopandas as gpd
from shapely import wkt as shapely_wkt
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.validation import explain_validity, make_valid

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECRETO = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
ADJUDICADO = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
SHP = os.path.join(REPO, "geodata", "lagos", "Inventario_Lagos.shp")
SALIDA_SQL = os.path.join(REPO, "scripts", "fase3_capa_jurisdicciones.sql")

TABLA = "jurisdicciones_decreto"
LIMITE_ZEE_M = 370400          # 200 millas nauticas
BBOX_OESTE, BBOX_ESTE = -85.0, -65.0
CRS_TRABAJO = 4326

# Reparaciones aplicadas: se llenan durante la construccion y se emiten como
# comentarios en el SQL, para que quede en la bitacora que se reparo y con que
# diferencia de area.
reparaciones = []


def sql_str(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"


def sql_bool(b):
    return "TRUE" if b else "FALSE"


def anillo_cerrado(cap):
    vs = [v for v in cap.get("vertices", []) if v["lat"] is not None and v["lon"] is not None]
    if len(vs) >= 4 and (vs[0]["lat"], vs[0]["lon"]) == (vs[-1]["lat"], vs[-1]["lon"]):
        return vs
    return None


def geom_lacustre(gdf4326, cuerpos):
    """Union de los cuerpos adjudicados. make_valid SOLO sobre los invalidos."""
    partes = []
    for c in cuerpos:
        for fid in c["shapefile_fid"]:
            g = gdf4326.geometry.iloc[fid]
            if not g.is_valid:
                motivo = explain_validity(g)
                area_antes = g.area
                g = make_valid(g)
                reparaciones.append({
                    "fid": fid,
                    "nombre": gdf4326["NOMBRE"].iloc[fid],
                    "motivo": motivo,
                    "area_antes_grados2": area_antes,
                    "area_despues_grados2": g.area,
                    "diferencia_grados2": abs(g.area - area_antes),
                })
            partes.append(g)
    return unary_union(partes) if partes else None


def main():
    dec = json.load(open(DECRETO, encoding="utf-8"))
    adj = json.load(open(ADJUDICADO, encoding="utf-8"))
    gdf = gpd.read_file(SHP).to_crs(epsg=CRS_TRABAJO)

    cuerpos_por_jur = {j["id"]: j["cuerpos"] for j in adj["jurisdicciones"]}

    filas = []
    for cap in dec["capitanias"]:
        cid, tipo = cap["id"], cap["tipo"]
        base = {
            "id": cid,
            "nombre": cap["nombre"],
            "gobernacion": cap["gobernacion"],
            "ambito": tipo,
            "participa_matching": cap["participa_matching"],
            "sin_georreferenciar": bool(cap.get("sin_georreferenciar", False)),
            "texto_decreto": cap["texto_decreto"],
            "geom_sql": "NULL",
            "metodo": None,
            "estado": None,
            "motivo_sin_geom": None,
        }

        if tipo == "lacustre":
            g = geom_lacustre(gdf, cuerpos_por_jur.get(cid, []))
            if g is None or g.is_empty:
                base.update(estado="nula_no_determinada", metodo=None,
                            motivo_sin_geom="Sin cuerpos con geometria adjudicada.")
            else:
                base.update(
                    estado="construida", metodo="union_cuerpos",
                    geom_sql=f"ST_Multi(ST_GeomFromText('{g.wkt}', {CRS_TRABAJO}))")

        elif tipo == "maritima":
            if cap.get("sin_georreferenciar"):
                base.update(estado="nula_declarada",
                            motivo_sin_geom=cap.get("motivo_exclusion"))
            else:
                anillo = anillo_cerrado(cap)
                n, s = cap.get("limite_norte_dec"), cap.get("limite_sur_dec")
                if anillo:
                    poly = Polygon([(v["lon"], v["lat"]) for v in anillo])
                    if not poly.is_valid:
                        poly = make_valid(poly)
                    base.update(
                        estado="construida", metodo="anillo_vertices",
                        geom_sql=f"ST_Multi(ST_GeomFromText('{poly.wkt}', {CRS_TRABAJO}))")
                elif n is not None and s is not None:
                    # Banda entre paralelos. norte es la latitud menos negativa.
                    lat_n, lat_s = max(n, s), min(n, s)
                    base.update(
                        estado="construida", metodo="banda_paralelos",
                        geom_sql=(f"ST_Multi(ST_MakeEnvelope({BBOX_OESTE}, {lat_s}, "
                                  f"{BBOX_ESTE}, {lat_n}, {CRS_TRABAJO}))"))
                else:
                    falta = ("limite sur" if n is not None else
                             "limite norte" if s is not None else
                             "ambos limites (norte y sur)")
                    nv = len([v for v in cap.get("vertices", [])
                              if v["lat"] is not None and v["lon"] is not None])
                    base.update(
                        estado="nula_no_determinada",
                        motivo_sin_geom=(
                            f"No determinado: falta {falta} en los campos estructurados "
                            f"del decreto. Tiene {nv} vertice(s) que no cierran un anillo. "
                            f"El limite faltante no se deduce del vecino ni se infiere."))
        else:
            # antartica / insular_remota: el ambito no trae campos georreferenciados.
            if tipo == "antartica":
                motivo = ("No determinado: el ambito antartico no tiene vertices "
                          "estructurados. Las coordenadas figuran en el texto literal "
                          "del decreto pero no fueron transcritas al campo 'vertices'; "
                          "transcribirlas es una decision del owner, no se infiere aqui.")
            else:
                motivo = ("No determinado: el decreto define la jurisdiccion nombrando "
                          "islas, sin coordenadas. Requiere una capa de islas; no se "
                          "infiere.")
            base.update(estado="nula_no_determinada", motivo_sin_geom=motivo)

        filas.append(base)

    # ── Emitir SQL ───────────────────────────────────────────────────────────
    L = []
    A = L.append
    A("-- FASE 3 — Capa unica de jurisdicciones del D.S. 991/1987.")
    A("-- ARCHIVO GENERADO por scripts/fase3_construir_capa.py. No editar a mano:")
    A("-- INV-3.7 exige que la geometria sea un derivado reproducible del archivo fuente.")
    A(f"-- Parametro ZEE: {LIMITE_ZEE_M} m (200 millas nauticas, Art. 2 del decreto).")
    A("-- Capa de costa restada: public.mapa_base_multipoligonos (natural=coastline).")
    A("")
    if reparaciones:
        A("-- REPARACIONES ST_MakeValid aplicadas SOLO a geometrias invalidas:")
        for r in reparaciones:
            A(f"--   fid {r['fid']} {r['nombre']}: {r['motivo']}")
            A(f"--     area antes={r['area_antes_grados2']:.12f} grados2  "
              f"despues={r['area_despues_grados2']:.12f} grados2  "
              f"diferencia={r['diferencia_grados2']:.3e} grados2")
        A("-- Ninguna geometria valida fue tocada.")
    else:
        A("-- No se aplico ST_MakeValid: ninguna geometria usada resulto invalida.")
    A("")
    A("BEGIN;")
    A("")
    A(f"DROP TABLE IF EXISTS {TABLA};")
    A(f"CREATE TABLE {TABLA} (")
    A("  id                  TEXT PRIMARY KEY,")
    A("  nombre              TEXT NOT NULL,")
    A("  gobernacion         TEXT NOT NULL,")
    A("  ambito              TEXT NOT NULL CHECK (ambito IN "
      "('maritima','lacustre','antartica','insular_remota')),")
    A("  participa_matching  BOOLEAN NOT NULL,")
    A("  sin_georreferenciar BOOLEAN NOT NULL,")
    A("  estado_geometria    TEXT NOT NULL CHECK (estado_geometria IN "
      "('construida','nula_declarada','nula_no_determinada')),")
    A("  metodo              TEXT,")
    A("  motivo_sin_geom     TEXT,")
    A("  texto_decreto       TEXT NOT NULL,")
    A(f"  geom                geometry(MultiPolygon, {CRS_TRABAJO})")
    A(");")
    A("")

    for f in filas:
        A(f"INSERT INTO {TABLA} (id, nombre, gobernacion, ambito, participa_matching,")
        A("  sin_georreferenciar, estado_geometria, metodo, motivo_sin_geom, "
          "texto_decreto, geom) VALUES (")
        A(f"  {sql_str(f['id'])}, {sql_str(f['nombre'])}, {sql_str(f['gobernacion'])},")
        A(f"  {sql_str(f['ambito'])}, {sql_bool(f['participa_matching'])}, "
          f"{sql_bool(f['sin_georreferenciar'])},")
        A(f"  {sql_str(f['estado'])}, {sql_str(f['metodo'])}, "
          f"{sql_str(f['motivo_sin_geom'])},")
        A(f"  {sql_str(f['texto_decreto'])},")
        A(f"  {f['geom_sql']}")
        A(");")
    A("")

    # ── Recortes espaciales ──────────────────────────────────────────────────
    A("-- TIERRA = ne_land UNION mapa_base_multipoligonos. Hacen falta las dos y")
    A("-- ninguna basta sola (medido, no supuesto):")
    A("--   mapa_base_multipoligonos NO contiene el continente. Sus 76.185 filas")
    A("--     natural=coastline son islas e islotes; su poligono mayor es Isla Lemuy,")
    A("--     95,8 km2. Un punto en tierra firme (Santiago, -70.65/-33.45) no cae en")
    A("--     ninguno de sus poligonos. Aporta la alta resolucion de los canales:")
    A("--     876.084 vertices en el bbox de canales contra 16.113 de ne_land.")
    A("--   ne_land SI contiene el continente (poligono de 145 millones de km2), pero")
    A("--     a resolucion Natural Earth 10m, que se come el detalle de los fiordos.")
    A("-- No se unen en una sola geometria: se subdividen en trozos indexados y la")
    A("-- resta se hace localmente, que es donde el indice GIST sirve.")
    A("CREATE TEMP TABLE _tierra AS")
    A("SELECT ST_Subdivide(ST_MakeValid(geom), 256) AS geom")
    A("FROM mapa_base_multipoligonos")
    A(f"WHERE geom && ST_MakeEnvelope({BBOX_OESTE}, -60, {BBOX_ESTE}, -17, {CRS_TRABAJO})")
    A("UNION ALL")
    A("SELECT ST_Subdivide(ST_MakeValid(ST_Intersection(")
    A(f"         ST_MakeValid(geom), ST_MakeEnvelope({BBOX_OESTE}, -60, {BBOX_ESTE}, -17, "
      f"{CRS_TRABAJO}))), 256)")
    A("FROM ne_land")
    A(f"WHERE ST_Intersects(geom, ST_MakeEnvelope({BBOX_OESTE}, -60, {BBOX_ESTE}, -17, "
      f"{CRS_TRABAJO}));")
    A("CREATE INDEX ON _tierra USING GIST (geom);")
    A("ANALYZE _tierra;")
    A("")
    A("-- ZEE: 200 mn desde la costa. Se calcula sobre ne_land (baja resolucion) a")
    A("-- proposito: a 370 km el detalle del litoral no cambia el resultado.")
    A("-- El buffer sale con topologia sucia (GEOS: side location conflict), asi que se")
    A("-- sanea con ST_MakeValid y se baja la precision antes de usarlo en overlays.")
    A("CREATE TEMP TABLE _zee AS")
    A("SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(")
    A("         ST_Simplify(ST_Union(ST_MakeValid(l.geom)), 0.01)::geography,")
    A(f"         {LIMITE_ZEE_M}")
    A("       )::geometry), 1e-8) AS geom")
    A("FROM ne_land l")
    A(f"WHERE ST_Intersects(l.geom, ST_MakeEnvelope({BBOX_OESTE}, -60, {BBOX_ESTE}, -17, "
      f"{CRS_TRABAJO}));")
    A("")
    A("-- Las bandas se acotan a la ZEE. Los anillos de vertices son aguas interiores:")
    A("-- ya estan dentro y no se tocan.")
    A(f"UPDATE {TABLA} j SET geom = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
    A("     ST_Intersection(ST_ReducePrecision(j.geom, 1e-8), z.geom)), 3))")
    A("FROM _zee z")
    A("WHERE j.metodo = 'banda_paralelos' AND j.geom IS NOT NULL;")
    A("")
    A("-- Restar la costa. Solo ambito maritimo: las lacustres se eliminarian (INV-3.5).")
    A("-- Se unen unicamente los trozos de tierra que tocan cada jurisdiccion.")
    A(f"UPDATE {TABLA} j SET geom = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
    A("     ST_Difference(ST_ReducePrecision(j.geom, 1e-8), t.geom)), 3))")
    A("FROM (")
    A("  SELECT j2.id, ST_ReducePrecision(")
    A("           ST_MakeValid(ST_UnaryUnion(ST_Collect(t2.geom))), 1e-8) AS geom")
    A(f"  FROM {TABLA} j2")
    A("  JOIN _tierra t2 ON t2.geom && j2.geom AND ST_Intersects(t2.geom, j2.geom)")
    A("  WHERE j2.ambito = 'maritima' AND j2.geom IS NOT NULL")
    A("  GROUP BY j2.id")
    A(") t")
    A("WHERE j.id = t.id;")
    A("")
    A("-- Normalizar vacios a NULL no: un vacio debe verse en la evidencia como vacio.")
    A(f"UPDATE {TABLA} SET geom = ST_MakeValid(geom) "
      "WHERE geom IS NOT NULL AND NOT ST_IsValid(geom);")
    A("")
    A("-- Indice espacial obligatorio.")
    A(f"CREATE INDEX idx_{TABLA}_geom ON {TABLA} USING GIST (geom);")
    A(f"CREATE INDEX idx_{TABLA}_ambito ON {TABLA} (ambito);")
    A(f"ANALYZE {TABLA};")
    A("")
    A("COMMIT;")
    A("")

    with open(SALIDA_SQL, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))

    # ── Resumen a stdout ─────────────────────────────────────────────────────
    print("FASE 3 — GENERACION DEL SQL DE CONSTRUCCION")
    print(f"Salida: {os.path.relpath(SALIDA_SQL, REPO)}")
    print(f"Jurisdicciones: {len(filas)}")
    print()
    print(f"{'AMBITO':<16} {'METODO':<18} {'ESTADO':<22} N")
    print("-" * 66)
    from collections import Counter
    for (a, m, e), n in sorted(Counter(
            (f["ambito"], f["metodo"] or "-", f["estado"]) for f in filas).items()):
        print(f"{a:<16} {m:<18} {e:<22} {n}")
    print()
    print("REPARACIONES ST_MakeValid (solo sobre geometrias invalidas):")
    if not reparaciones:
        print("  ninguna")
    for r in reparaciones:
        print(f"  fid {r['fid']} {r['nombre']}")
        print(f"    motivo     : {r['motivo']}")
        print(f"    area antes : {r['area_antes_grados2']:.12f} grados2")
        print(f"    area despues: {r['area_despues_grados2']:.12f} grados2")
        print(f"    diferencia : {r['diferencia_grados2']:.3e} grados2")
    print()
    print("SIN GEOMETRIA — motivo por jurisdiccion:")
    for f in filas:
        if f["estado"] != "construida":
            print(f"  [{f['estado']:<22}] {f['ambito']:<15} {f['nombre']}")


if __name__ == "__main__":
    main()
