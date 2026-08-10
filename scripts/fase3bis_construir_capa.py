"""
FASE 3 bis — Reconstruccion de la capa de jurisdicciones con metodo corregido.

SUPERSEDIDO POR fase3ter_construir_capa.py. NO CORRER.
Se versiona como evidencia del segundo metodo probado y abandonado: quita la banda
de paralelos como default y declara nula toda cadena abierta, porque el campo
'vertices' del insumo v1 no dice QUE BORDE del poligono forma la cadena. La Fase 3
ter resuelve eso con rol_cadena, y el insumo v2 lo resuelve mejor con ancla_seleccion.
La capa vigente se declara en scripts/fase5_declarar_capas_vigentes.sql.

Cambio de metodo respecto de la Fase 3: la banda entre paralelos deja de ser el
metodo por defecto. Se usa la poligonal donde el decreto la entrega, y la banda
solo donde el decreto efectivamente da un paralelo como limite.

QUE ES DECRETO Y QUE ES CONVENCION (registrado por exigencia del owner):

  DECRETO  Los paralelos limite, las coordenadas de los vertices, el lado que el
           texto asigna a una linea divisoria, y la extension mar afuera: el
           D.S. 991 Art. 2 declara que las jurisdicciones comprenden mar
           territorial, zona contigua, ZEE y plataforma continental.

  CONVENCION NUESTRA  Como se separan lateralmente dos jurisdicciones dentro de
           esa franja oceanica. El decreto fija hasta donde llega mar afuera,
           pero no como se reparte ese espacio entre Capitanias vecinas. Aqui se
           prolonga cada limite norte y sur por su propio paralelo hasta el
           limite exterior, y se cierra por ese limite. Es una eleccion nuestra,
           no del decreto.

  CONVENCION NUESTRA  El limite exterior se materializa como 200 millas nauticas
           (370.400 m) desde la costa. El Art. 2 nombra ZEE y plataforma
           continental sin darles geometria; 200 mn es la ZEE y se toma como el
           limite exterior operativo.

  CONVENCION NUESTRA  Donde el decreto dice 'siguiendo el litoral', el poligono
           se cierra generosamente hacia tierra y se recorta restando la capa de
           tierra, en vez de trazar la costa a mano. Es la nota_construccion del
           propio archivo fuente.

CONTROL DE FIDELIDAD DE LA POLIGONAL:
  El campo 'vertices' guarda los puntos con nombre, pero varias jurisdicciones se
  describen en la prosa como una travesia con giros axiales ('luego hacia el Sur
  por este meridiano hasta la Latitud X') cuyos puntos de giro NO estan en el
  campo estructurado. Construir desde 'vertices' en esos casos da un poligono mas
  chico que la jurisdiccion — un falso negativo, justo lo que INV-3.6 prohibe.
  Por eso se compara la prosa contra el campo estructurado y, si la prosa exige
  giros que el campo no trae, la jurisdiccion se declara NULA con esa causa. No
  se parsea la prosa: transcribirla es trabajo de la fuente, no de este script.

Uso (desde scripts/):
    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe fase3bis_construir_capa.py
"""

import json
import os
import re
from collections import Counter

import geopandas as gpd
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.validation import explain_validity, make_valid

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECRETO = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
ADJUDICADO = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
SHP = os.path.join(REPO, "geodata", "lagos", "Inventario_Lagos.shp")
SALIDA_SQL = os.path.join(REPO, "scripts", "fase3bis_capa_jurisdicciones.sql")

TABLA = "jurisdicciones_decreto"
LIMITE_ZEE_M = 370400
BBOX_OESTE, BBOX_ESTE = -85.0, -65.0
CRS = 4326

# Marcadores de giro axial en la prosa: si aparecen, la travesia tiene vertices
# que el campo estructurado no puede contener.
RE_GIRO = re.compile(
    r"(?:Longitud|Latitud|meridiano|paralelo)\s+\d{2,3}\s+\d{2}\s+\d{2}", re.I)
# Coordenadas completas en la prosa (lat/lon juntas).
RE_PAR = re.compile(r"\d{2}\s+\d{2}\s+\d{2}\s*S\s*/\s*\d{3}\s+\d{2}\s+\d{2}\s*W")

reparaciones = []


def sql_str(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"


def sql_bool(b):
    return "TRUE" if b else "FALSE"


def verts(cap):
    return [v for v in cap.get("vertices", [])
            if v.get("lat") is not None and v.get("lon") is not None]


def es_anillo(vs):
    return len(vs) >= 4 and (vs[0]["lat"], vs[0]["lon"]) == (vs[-1]["lat"], vs[-1]["lon"])


def giros_no_capturados(cap, vs):
    """Cuenta las referencias a giros axiales de la prosa que el campo no cubre.

    Una referencia a 'paralelo/Latitud X' que coincide con un limite declarado, o a
    una coordenada que ya esta entre los vertices, no cuenta. Lo que queda son
    giros que el poligono necesitaria y el campo estructurado no tiene.
    """
    texto = cap["texto_decreto"]
    conocidas = set()
    for v in vs:
        conocidas.add(round(abs(v["lat"]) * 3600))
        conocidas.add(round(abs(v["lon"]) * 3600))
    for k in ("limite_norte_dec", "limite_sur_dec"):
        if cap.get(k) is not None:
            conocidas.add(round(abs(cap[k]) * 3600))

    sobrantes = []
    for m in RE_GIRO.finditer(texto):
        partes = re.findall(r"\d+", m.group(0))
        seg = round(int(partes[0]) * 3600 + int(partes[1]) * 60 + int(partes[2]))
        # tolerancia de 2 segundos de arco por redondeos de la transcripcion
        if not any(abs(seg - c) <= 2 for c in conocidas):
            sobrantes.append(m.group(0).strip())
    return sobrantes


def geom_lacustre(gdf, cuerpos):
    partes = []
    for c in cuerpos:
        for fid in c["shapefile_fid"]:
            g = gdf.geometry.iloc[fid]
            if not g.is_valid:
                motivo, a0 = explain_validity(g), g.area
                g = make_valid(g)
                reparaciones.append({
                    "fid": fid, "nombre": gdf["NOMBRE"].iloc[fid], "motivo": motivo,
                    "antes": a0, "despues": g.area, "dif": abs(g.area - a0)})
            partes.append(g)
    return unary_union(partes) if partes else None


def main():
    dec = json.load(open(DECRETO, encoding="utf-8"))
    adj = json.load(open(ADJUDICADO, encoding="utf-8"))
    gdf = gpd.read_file(SHP).to_crs(epsg=CRS)
    cuerpos_por_jur = {j["id"]: j["cuerpos"] for j in adj["jurisdicciones"]}

    diag, filas = [], []

    for cap in dec["capitanias"]:
        cid = cap["id"]
        ambito = cap.get("ambito", cap["tipo"])
        vs = verts(cap)
        n, s = cap.get("limite_norte_dec"), cap.get("limite_sur_dec")
        sobrantes = giros_no_capturados(cap, vs) if vs else []

        f = {
            "id": cid, "nombre": cap["nombre"], "gobernacion": cap["gobernacion"],
            "ambito": ambito, "participa_matching": cap["participa_matching"],
            "sin_georreferenciar": bool(cap.get("sin_georreferenciar", False)),
            "texto_decreto": cap["texto_decreto"],
            "geom_sql": "NULL", "metodo": None, "estado": None, "causa": None,
        }

        if ambito == "lacustre":
            g = geom_lacustre(gdf, cuerpos_por_jur.get(cid, []))
            if g is None or g.is_empty:
                f.update(estado="nula_no_determinada",
                         causa="sin cuerpos con geometria adjudicada")
            else:
                f.update(estado="construida", metodo="union_cuerpos",
                         geom_sql=f"ST_Multi(ST_GeomFromText('{g.wkt}', {CRS}))")

        elif cap.get("sin_georreferenciar"):
            f.update(estado="nula_declarada",
                     causa="declarada sin georreferenciar en la fuente")

        elif ambito == "insular_remota":
            f.update(estado="nula_no_determinada",
                     causa="el decreto nombra islas sin coordenadas; requiere capa de islas")

        elif ambito == "antartica":
            # El texto antartico es una definicion pura por puntos: "Area delimitada
            # por las lineas imaginarias que unen: A; B; C; D". El anillo se cierra
            # sobre si mismo. No se extiende al limite exterior: no corresponde.
            if len(vs) >= 3:
                poly = Polygon([(v["lon"], v["lat"]) for v in vs])
                if not poly.is_valid:
                    poly = make_valid(poly)
                f.update(estado="construida", metodo="anillo_vertices",
                         geom_sql=f"ST_Multi(ST_GeomFromText('{poly.wkt}', {CRS}))")
            else:
                f.update(estado="nula_no_determinada",
                         causa=f"solo {len(vs)} vertice(s), insuficiente para un poligono")

        elif es_anillo(vs) and not sobrantes:
            poly = Polygon([(v["lon"], v["lat"]) for v in vs])
            if not poly.is_valid:
                poly = make_valid(poly)
            f.update(estado="construida", metodo="anillo_vertices",
                     geom_sql=f"ST_Multi(ST_GeomFromText('{poly.wkt}', {CRS}))")

        elif vs and not es_anillo(vs) and not sobrantes:
            # Cadena abierta. NO se construye: el campo estructurado no declara QUE
            # BORDE del poligono forma la cadena, y eso cambia el resultado por
            # completo. Verificado en la prosa, el papel varia entre jurisdicciones:
            #   Melinka       'Por el Este la linea imaginaria...'  -> area al Weste
            #   Puerto Cisnes 'Por el Weste la linea imaginaria...' -> area al Este
            #                 (las dos comparten los mismos 4 puntos del Canal Moraleda)
            #   Corral        'y desde alli la linea imaginaria ... por el Norte'
            #                 -> la cadena es el borde norte, el area queda al Sur
            #   Chacabuco     la cadena forma el borde norte y el limite sur es el
            #                 paralelo 47 00 00 S
            # Cerrar todas hacia un lado fijo produce geometria equivocada. Se declara
            # nula con la causa; el dato existe en la prosa pero no en el campo.
            f.update(estado="nula_no_determinada",
                     causa=("cadena abierta sin rol declarado: el campo 'vertices' no dice "
                            "que borde del poligono forma la cadena (norte, sur, este u "
                            "oeste). La prosa lo dice y varia caso a caso. Cerrarla hacia "
                            "un lado fijo daria geometria equivocada."))

        elif n is not None and s is not None and not vs:
            lat_n, lat_s = max(n, s), min(n, s)
            f.update(estado="construida", metodo="banda_paralelos",
                     geom_sql=(f"ST_Multi(ST_MakeEnvelope({BBOX_OESTE}, {lat_s}, "
                               f"{BBOX_ESTE}, {lat_n}, {CRS}))"))

        elif sobrantes:
            f.update(estado="nula_no_determinada",
                     causa=("poligonal incompleta: la prosa del decreto especifica giros "
                            "que el campo 'vertices' no contiene -> " +
                            "; ".join(sorted(set(sobrantes))[:6])))
        else:
            falta = ("limite sur" if n is not None else
                     "limite norte" if s is not None else "ambos paralelos")
            f.update(estado="nula_no_determinada",
                     causa=(f"el decreto no entrega con que cerrar: falta {falta} y la "
                            f"cadena tiene {len(vs)} vertice(s), insuficiente para un "
                            f"poligono. No se toma del vecino."))

        diag.append((cap["nombre"], ambito, len(vs), es_anillo(vs), n, s,
                     len(sobrantes), f["metodo"] or "-", f["estado"]))
        filas.append(f)

    # ── SQL ──────────────────────────────────────────────────────────────────
    L, A = [], None
    A = L.append
    A("-- FASE 3 bis — Capa unica de jurisdicciones del D.S. 991/1987.")
    A("-- GENERADO por scripts/fase3bis_construir_capa.py. No editar a mano (INV-3.7).")
    A("--")
    A("-- DECRETO   : paralelos, vertices, lado de las lineas divisorias, y la")
    A("--             extension mar afuera (Art. 2: mar territorial, zona contigua,")
    A("--             ZEE y plataforma continental).")
    A("-- CONVENCION: la separacion lateral entre Capitanias dentro de la franja")
    A("--             oceanica (se prolonga cada limite por su paralelo); el valor")
    A(f"--             de 200 mn = {LIMITE_ZEE_M} m como limite exterior operativo; y el")
    A("--             cierre generoso hacia tierra con resta de la capa de tierra.")
    A("")
    if reparaciones:
        A("-- ST_MakeValid aplicado SOLO a geometrias invalidas:")
        for r in reparaciones:
            A(f"--   fid {r['fid']} {r['nombre']}: {r['motivo']}")
            A(f"--     antes={r['antes']:.12f} despues={r['despues']:.12f} "
              f"dif={r['dif']:.3e} grados2")
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
    A("  causa_sin_geom      TEXT,")
    A("  texto_decreto       TEXT NOT NULL,")
    A(f"  geom                geometry(MultiPolygon, {CRS})")
    A(");")
    A("")
    for f in filas:
        A(f"INSERT INTO {TABLA} VALUES (")
        A(f"  {sql_str(f['id'])}, {sql_str(f['nombre'])}, {sql_str(f['gobernacion'])},")
        A(f"  {sql_str(f['ambito'])}, {sql_bool(f['participa_matching'])}, "
          f"{sql_bool(f['sin_georreferenciar'])},")
        A(f"  {sql_str(f['estado'])}, {sql_str(f['metodo'])}, {sql_str(f['causa'])},")
        A(f"  {sql_str(f['texto_decreto'])}, {f['geom_sql']});")
    A("")
    A("-- TIERRA = ne_land (aporta el continente) UNION mapa_base_multipoligonos")
    A("-- (aporta la resolucion de los canales). Ninguna basta sola: el mayor")
    A("-- poligono de mapa_base es Isla Lemuy, 95,8 km2 — no tiene el continente.")
    A("CREATE TEMP TABLE _tierra AS")
    A("SELECT ST_Subdivide(ST_MakeValid(geom), 256) AS geom")
    A("FROM mapa_base_multipoligonos")
    A(f"WHERE geom && ST_MakeEnvelope({BBOX_OESTE}, -60, {BBOX_ESTE}, -17, {CRS})")
    A("UNION ALL")
    A("SELECT ST_Subdivide(ST_MakeValid(ST_Intersection(ST_MakeValid(geom),")
    A(f"       ST_MakeEnvelope({BBOX_OESTE}, -60, {BBOX_ESTE}, -17, {CRS}))), 256)")
    A("FROM ne_land")
    A(f"WHERE ST_Intersects(geom, ST_MakeEnvelope({BBOX_OESTE}, -60, {BBOX_ESTE}, -17, "
      f"{CRS}));")
    A("CREATE INDEX ON _tierra USING GIST (geom);")
    A("ANALYZE _tierra;")
    A("")
    A("-- Limite exterior del espacio maritimo (convencion: 200 mn desde la costa).")
    A("CREATE TEMP TABLE _zee AS")
    A("SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(")
    A("         ST_Simplify(ST_Union(ST_MakeValid(l.geom)), 0.01)::geography,")
    A(f"         {LIMITE_ZEE_M})::geometry), 1e-8) AS geom")
    A("FROM ne_land l")
    A(f"WHERE ST_Intersects(l.geom, ST_MakeEnvelope({BBOX_OESTE}, -60, {BBOX_ESTE}, -17, "
      f"{CRS}));")
    A("")
    A("-- Acotar al limite exterior lo que se extiende mar afuera.")
    A(f"UPDATE {TABLA} j SET geom = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
    A("     ST_Intersection(ST_ReducePrecision(j.geom, 1e-8), z.geom)), 3))")
    A("FROM _zee z")
    A("WHERE j.metodo IN ('banda_paralelos','cadena_cerrada_al_limite_exterior')")
    A("  AND j.geom IS NOT NULL;")
    A("")
    A("-- Restar tierra. Solo maritima y antartica: en lacustre borraria el cuerpo.")
    A(f"UPDATE {TABLA} j SET geom = ST_Multi(ST_CollectionExtract(ST_MakeValid(")
    A("     ST_Difference(ST_ReducePrecision(j.geom, 1e-8), t.geom)), 3))")
    A("FROM (")
    A("  SELECT j2.id, ST_ReducePrecision(")
    A("           ST_MakeValid(ST_UnaryUnion(ST_Collect(t2.geom))), 1e-8) AS geom")
    A(f"  FROM {TABLA} j2")
    A("  JOIN _tierra t2 ON t2.geom && j2.geom AND ST_Intersects(t2.geom, j2.geom)")
    A("  WHERE j2.ambito = 'maritima' AND j2.geom IS NOT NULL")
    A("  GROUP BY j2.id) t")
    A("WHERE j.id = t.id;")
    A("")
    A(f"UPDATE {TABLA} SET geom = ST_MakeValid(geom) "
      "WHERE geom IS NOT NULL AND NOT ST_IsValid(geom);")
    A("")
    A(f"CREATE INDEX idx_{TABLA}_geom ON {TABLA} USING GIST (geom);")
    A(f"CREATE INDEX idx_{TABLA}_ambito ON {TABLA} (ambito);")
    A(f"ANALYZE {TABLA};")
    A("")
    A("COMMIT;")

    with open(SALIDA_SQL, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))

    # ── Diagnostico a stdout ─────────────────────────────────────────────────
    print("FASE 3 bis — DIAGNOSTICO Y GENERACION")
    print(f"Salida: {os.path.relpath(SALIDA_SQL, REPO)}")
    print()
    print(f"{'NOMBRE':<24} {'AMBITO':<15} {'v':>2} {'anillo':>6} {'giros':>5}  "
          f"{'METODO':<34} ESTADO")
    print("-" * 122)
    for nom, amb, nv, an, n, s, ng, met, est in diag:
        print(f"{nom:<24} {amb:<15} {nv:>2} {str(an):>6} {ng:>5}  {met:<34} {est}")
    print()
    print("CONTEO POR METODO")
    for k, v in sorted(Counter(d[7] for d in diag).items()):
        print(f"  {k:<38} {v}")
    print()
    print("CONTEO POR ESTADO")
    for k, v in sorted(Counter(d[8] for d in diag).items()):
        print(f"  {k:<38} {v}")
    print()
    print("NULAS POR CAUSA")
    for f in filas:
        if f["estado"] != "construida":
            print(f"  [{f['ambito']:<15}] {f['nombre']:<24} {f['causa']}")


if __name__ == "__main__":
    main()
