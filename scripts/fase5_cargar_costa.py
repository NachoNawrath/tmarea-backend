"""
FASE 5 — CARGADOR DE LA CAPA DE COSTA. La deja en la base y se verifica.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\fase5_cargar_costa.py
    ... --solo-verificar    no carga; corre los controles sobre lo que ya esta

QUE CAPA CARGA: la que geodata/costa/capas_costa.json declara en roles.tierra.
Ninguna capa se nombra en este codigo. Cambiar de costa es cambiar ese archivo.

COMO ESTA PENSADO

  REPRODUCIBLE      La capa se identifica por sha256, no por nombre de archivo. Si
                    el zip en disco no es el que el manifiesto declara, se detiene:
                    el origen REGENERA el archivo a diario y una version distinta
                    de la costa no puede entrar en silencio. Las rutas salen de la
                    ubicacion del script y la conexion del .env del repo.

  FALLA RUIDOSO     Siete controles (A1..A7). Cualquiera que no cuadre deshace la
                    transaccion entera. No queda capa a medias ni capa sin verificar.

  AUTOVERIFICADO    Los controles A4..A7 corren DENTRO de la transaccion que carga,
                    contra la capa ya cargada, y su resultado queda persistido en
                    <tabla>_verificacion. No hay una revision aparte que alguien
                    pueda saltarse.

  COHERENCIA ENTRE  Las exigencias del rol no son prosa: se miden. La capa se eligio
  DICHO Y MEDIDO    por RESOLUCION, asi que A6 cuenta los vertices de las dos capas
                    en el mismo recorte y exige el minimo declarado. La capa se usa
                    para correr testigos al agua, y eso solo es seguro si su
                    complemento es mar y no lago, asi que A7 lo comprueba contra el
                    inventario de lagos ya adjudicado, cuerpo por cuerpo.

LO QUE A7 GARANTIZA, Y POR QUE IMPORTA
  El corrector de testigos define "agua" como el complemento de esta capa. Si un
  lago fuera un hueco de la capa, correr un testigo al agua mas cercana podria
  meterlo en agua dulce sin conexion con el mar, y el testigo pasaria el control de
  contencion siendo un punto al que no se llega navegando. A7 comprueba que los
  cuerpos lacustres adjudicados caen DENTRO de la capa de tierra — o sea que son
  tierra para ella — y por lo tanto que su complemento es mar.
"""

import argparse
import hashlib
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import psycopg2
import pyogrio
from shapely import wkb as shp_wkb
from shapely.geometry import box

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFIESTO = os.path.join(REPO, "geodata", "costa", "capas_costa.json")
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
LACUSTRE = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
ENV = os.path.join(REPO, ".env")

VERTICES_SUBDIVISION = 256   # tope de vertices por trozo de la tabla de trabajo
# Los ambitos a los que la construccion les resta tierra. Es el mismo criterio que
# usa el SQL del constructor (WHERE ambito = 'maritima'); esta aca para que A4b sepa
# que puntos tienen que caer dentro del recorte, y no como una lista de casos.
AMBITOS_QUE_RESTAN_TIERRA = {"maritima"}


class Alto(SystemExit):
    def __init__(self, msg):
        super().__init__(f"\nALTO: {msg}\n")


# ── utilidades ────────────────────────────────────────────────────────────────

def sha256(ruta):
    h = hashlib.sha256()
    with open(ruta, "rb") as fh:
        for bloque in iter(lambda: fh.read(1 << 22), b""):
            h.update(bloque)
    return h.hexdigest()


def leer_env():
    if not os.path.exists(ENV):
        raise Alto(f"no existe {ENV}: sin el no hay a que base conectarse")
    cfg = {}
    for linea in open(ENV, encoding="utf-8-sig"):
        if "=" in linea and not linea.strip().startswith("#"):
            k, v = linea.split("=", 1)
            cfg[k.strip()] = v.strip()
    faltan = [k for k in ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
              if not cfg.get(k)]
    if faltan:
        raise Alto(f"al .env le faltan {', '.join(faltan)}")
    return cfg


def ident(nombre, que):
    """Nombre de tabla que viene del manifiesto. No se interpola nada que no sea
    un identificador simple: el manifiesto es dato, y dato que arma SQL se valida."""
    if not nombre or not nombre.replace("_", "").isalnum() or nombre[0].isdigit():
        raise Alto(f"el manifiesto declara '{nombre}' como {que} y eso no es un "
                   f"nombre de tabla usable")
    return nombre


def vsi(zip_abs, interna):
    return f"/vsizip/{zip_abs.replace(os.sep, '/')}/{interna}"


def fuente_de(capa):
    """Ruta que pyogrio tiene que abrir. Un zip se abre por /vsizip; un shapefile
    suelto, directo. Lo decide la extension del archivo declarado, no un caso."""
    ruta = os.path.join(REPO, capa["archivo"].replace("/", os.sep))
    if not os.path.exists(ruta):
        raise Alto(f"la capa '{capa['id']}' declara {capa['archivo']} y no esta en "
                   f"disco. Se regenera desde {capa.get('origen')}")
    if ruta.lower().endswith(".zip"):
        if not capa.get("capa_interna"):
            raise Alto(f"la capa '{capa['id']}' es un zip y no declara capa_interna")
        return os.path.abspath(ruta), vsi(os.path.abspath(ruta), capa["capa_interna"])
    return os.path.abspath(ruta), os.path.abspath(ruta)


def n_vertices(geom):
    if geom.is_empty:
        return 0
    if geom.geom_type == "Polygon":
        return len(geom.exterior.coords) + sum(len(r.coords) for r in geom.interiors)
    return sum(n_vertices(g) for g in geom.geoms)


# ── manifiesto ────────────────────────────────────────────────────────────────

def rol(man, cual):
    r = (man.get("roles") or {}).get(cual)
    if not r or not r.get("capa"):
        raise Alto(f"el manifiesto no declara roles.{cual}.capa")
    porid = {c["id"]: c for c in man["capas"]}
    if r["capa"] not in porid:
        raise Alto(f"roles.{cual} apunta a la capa '{r['capa']}', que no esta "
                   f"declarada en 'capas'")
    return r, porid[r["capa"]]


def exigir_rol_tierra(r, capa):
    """A1. Las exigencias del rol se comprueban contra lo que la capa declara de si
    misma. Una capa que no las cumple no entra como tierra, y el motivo se dice."""
    problemas = []
    if capa.get("semantica") != "tierra":
        problemas.append(f"declara semantica='{capa.get('semantica')}' y el rol "
                         f"tierra exige 'tierra'")
    if capa.get("cierra_bahias") is not False:
        problemas.append(f"declara cierra_bahias={capa.get('cierra_bahias')}: una "
                         f"capa que cierra las bahias marca agua real como tierra "
                         f"(INV-3.6)")
    if capa.get("aguas_interiores_son_tierra") is not True:
        problemas.append(f"declara aguas_interiores_son_tierra="
                         f"{capa.get('aguas_interiores_son_tierra')}: sin esa "
                         f"garantia, 'el agua mas cercana' podria ser un lago")
    if capa.get("epsg") != 4326:
        problemas.append(f"declara EPSG {capa.get('epsg')} y la base es 4326")
    if not capa.get("tabla"):
        problemas.append("no declara tabla de destino")
    if problemas:
        raise Alto(f"la capa '{capa['id']}' no puede cumplir el rol tierra:\n  - "
                   + "\n  - ".join(problemas))


# ── lectura de la fuente ──────────────────────────────────────────────────────

def leer_recortada(capa, caja, etiqueta):
    """A2 y A3. Huella, luego lectura, luego los controles de la geometria cruda."""
    zip_abs, fuente = fuente_de(capa)
    if capa.get("sha256"):
        real = sha256(zip_abs)
        if real != capa["sha256"]:
            raise Alto(f"{etiqueta}: el archivo en disco NO es el que el manifiesto "
                       f"declara.\n  manifiesto {capa['sha256']}\n  en disco   {real}\n"
                       f"  {capa.get('advertencia_origen') or ''}\n"
                       f"  No se carga: una costa distinta cambia toda la capa de "
                       f"jurisdicciones y eso se declara, no se descubre.")
        print(f"  {etiqueta}: sha256 coincide con el manifiesto")
    else:
        raise Alto(f"{etiqueta}: la capa no declara sha256. Sin huella no hay "
                   f"reproducibilidad (INV-3.7)")

    info = pyogrio.read_info(fuente)
    crs = str(info.get("crs") or "")
    if crs != f"EPSG:{capa['epsg']}":
        raise Alto(f"{etiqueta}: la fuente dice estar en '{crs}' y el manifiesto "
                   f"declara EPSG:{capa['epsg']}")
    gdf = pyogrio.read_dataframe(fuente, bbox=(caja["x_w"], caja["y_s"],
                                               caja["x_e"], caja["y_n"]),
                                 columns=[])
    if len(gdf) == 0:
        raise Alto(f"{etiqueta}: la lectura recortada no devolvio ni un poligono")
    tipos = set(gdf.geom_type)
    if tipos - {"Polygon", "MultiPolygon"}:
        raise Alto(f"{etiqueta}: la fuente trae geometrias que no son poligonos: "
                   f"{sorted(tipos - {'Polygon', 'MultiPolygon'})}")
    malas = {"nulas": int(gdf.geometry.isna().sum()),
             "vacias": int(gdf.is_empty.sum()),
             "invalidas": int((~gdf.is_valid).sum())}
    if any(malas.values()):
        raise Alto(f"{etiqueta}: la fuente trae {malas}. Una capa de costa con "
                   f"geometrias rotas no se repara en silencio")
    # Los vertices se cuentan sobre la geometria RECORTADA. Un filtro por bbox
    # devuelve los poligonos ENTEROS que tocan la caja: ne_land trae Sudamerica y la
    # Antartica completas, y contar sus vertices sin recortar no mide la resolucion
    # dentro de la caja sino cuanto mundo cuelga afuera. Con eso la razon entre las
    # dos capas salia 21x en vez de 520x.
    caja_g = box(caja["x_w"], caja["y_s"], caja["x_e"], caja["y_n"])
    v_crudo = sum(n_vertices(g) for g in gdf.geometry)
    v_rec = sum(n_vertices(g.intersection(caja_g)) for g in gdf.geometry)
    print(f"  {etiqueta}: {len(gdf)} poligonos; {v_rec} vertices recortados a la "
          f"caja ({v_crudo} sin recortar); 0 nulas, 0 vacias, 0 invalidas")
    return gdf, v_rec


# ── carga ─────────────────────────────────────────────────────────────────────

def cargar(cur, gdf, tabla, tabla_sub, epsg):
    cur.execute(f"DROP TABLE IF EXISTS {tabla_sub}")
    cur.execute(f"DROP TABLE IF EXISTS {tabla} CASCADE")
    cur.execute(f"CREATE TABLE {tabla} (fid BIGINT PRIMARY KEY, "
                f"geom geometry(MultiPolygon, {epsg}))")
    buf = io.StringIO()
    for i, g in enumerate(gdf.geometry):
        buf.write(f"{i}\t{shp_wkb.dumps(g, hex=True)}\n")
    buf.seek(0)
    cur.execute(f"CREATE TEMP TABLE _crudo (fid BIGINT, wkb TEXT)")
    cur.copy_expert("COPY _crudo (fid, wkb) FROM STDIN", buf)
    cur.execute(f"INSERT INTO {tabla} (fid, geom) SELECT fid, "
                f"ST_Multi(ST_SetSRID(ST_GeomFromWKB(decode(wkb,'hex')), {epsg})) "
                f"FROM _crudo")
    cur.execute(f"CREATE INDEX idx_{tabla}_geom ON {tabla} USING GIST (geom)")
    cur.execute(f"ANALYZE {tabla}")

    # Tabla de trabajo: los mismos poligonos partidos en trozos chicos. La resta de
    # tierra y la busqueda del agua mas cercana se hacen contra esta; el indice
    # espacial solo sirve si los rectangulos envolventes son chicos. La cruda queda
    # para poder auditar 1 a 1 contra la fuente.
    cur.execute(f"CREATE TABLE {tabla_sub} AS SELECT fid, "
                f"ST_Subdivide(geom, {VERTICES_SUBDIVISION}) AS geom FROM {tabla}")
    cur.execute(f"CREATE INDEX idx_{tabla_sub}_geom ON {tabla_sub} USING GIST (geom)")
    cur.execute(f"ANALYZE {tabla_sub}")


# ── controles dentro de la transaccion ────────────────────────────────────────

def controles(cur, tabla, tabla_sub, epsg, caja, n_fuente, v_tierra,
              capa_tierra, capa_lim, v_lim, minimo, cuerpos, pts_insumo):
    """Devuelve [(control, ok, obtenido, detalle)]. No decide: solo mide."""
    r = []

    cur.execute(f"SELECT count(*), count(*) FILTER (WHERE geom IS NULL OR "
                f"ST_IsEmpty(geom) OR NOT ST_IsValid(geom)), "
                f"count(DISTINCT ST_SRID(geom)), min(ST_SRID(geom)) FROM {tabla}")
    n, rotas, n_srid, srid = cur.fetchone()
    r.append(("A4 la capa cargada es la que se leyo de la fuente",
              n == n_fuente and rotas == 0 and n_srid == 1 and srid == epsg,
              f"{n} filas, {rotas} rotas, SRID {srid}",
              f"leidas de la fuente {n_fuente}"))

    cur.execute(f"SELECT round(ST_XMin(e)::numeric,4), round(ST_YMin(e)::numeric,4), "
                f"round(ST_XMax(e)::numeric,4), round(ST_YMax(e)::numeric,4) "
                f"FROM (SELECT ST_Extent(geom) e FROM {tabla}) s")
    ex = cur.fetchone()
    # A4b. La primera version de este control exigia que la tierra llegara a los
    # cuatro lados de la caja, y eso es FALSO: al Oeste y al Sur de la caja hay
    # oceano abierto, no tierra. Un control que pide algo que no puede ser cierto no
    # detecta nada, solo miente. Lo que de verdad importa es distinto: que la capa
    # cubra la zona donde se la va a usar. La zona la define el propio insumo — los
    # puntos que declaran las jurisdicciones a las que se les va a restar tierra —,
    # no una caja elegida a mano. Si el recorte se queda corto contra el dato, la
    # resta dejaria tierra adentro de una figura sin que nada avise (INV-3.6).
    afuera = [f"{n} ({la:.4f},{lo:.4f})" for n, la, lo in pts_insumo
              if not (caja["x_w"] <= lo <= caja["x_e"]
                      and caja["y_s"] <= la <= caja["y_n"])]
    r.append(("A4b el recorte cubre todo punto declarado de las jurisdicciones a "
              "las que se les resta tierra",
              len(afuera) == 0 and len(pts_insumo) > 0,
              f"{len(pts_insumo) - len(afuera)} de {len(pts_insumo)} puntos dentro "
              f"del recorte; extension cargada x {ex[0]}..{ex[2]} y {ex[1]}..{ex[3]}",
              ("quedan afuera: " + "; ".join(afuera[:10])) if afuera else None))

    # A5. NO se exige que la capa sea una particion: se exige que lo que la capa
    # DECLARA de si misma coincida con lo que se mide. La variante split de OSM se
    # pisa en las costuras (medido: 2.116 pares, 6.219 km2, 0,22% de la tierra), y
    # eso no invalida una capa de tierra — tierra sobre tierra no inventa agua ni la
    # tapa. Lo que prohibe es un atajo: la union se hace con ST_UnaryUnion y no con
    # ST_Collect, porque un MultiPolygon de piezas que se pisan es invalido. El
    # control esta para que ese hecho no cambie de callado: si una capa futura
    # declarara ser disjunta y no lo fuera, o al reves, se detiene.
    cur.execute(f"SELECT count(*), coalesce(sum(ST_Area(ST_Intersection("
                f"a.geom,b.geom)::geography)),0) FROM {tabla} a JOIN {tabla} b "
                f"ON a.fid < b.fid AND a.geom && b.geom "
                f"WHERE ST_Relate(a.geom, b.geom, 'T********')")
    pisan, km2 = cur.fetchone()
    declarado = capa_tierra.get("poligonos_disjuntos")
    if declarado is None:
        raise Alto(f"la capa '{capa_tierra['id']}' no declara poligonos_disjuntos. "
                   f"No hay caso por defecto: de ese hecho depende si la union de la "
                   f"capa puede hacerse con ST_Collect o exige ST_UnaryUnion")
    r.append((f"A5 el traslape entre poligonos coincide con lo declarado "
              f"(poligonos_disjuntos={declarado})",
              (pisan == 0) == bool(declarado),
              f"{pisan} pares con traslape de area, "
              f"{float(km2) / 1e6:.1f} km2 en total",
              "una capa que se pisa exige ST_UnaryUnion; ST_Collect daria un "
              "MultiPolygon invalido" if pisan else None))

    # A6. La capa se eligio por resolucion: la exigencia se mide, no se afirma. Los
    # vertices vienen contados sobre la geometria recortada — ver leer_recortada.
    r.append((f"A6 resolucion contra '{capa_lim['id']}', vertices recortados a la "
              f"misma caja, minimo {minimo}x",
              v_lim > 0 and v_tierra / v_lim >= minimo,
              f"{v_tierra} vs {v_lim} vertices = "
              f"{(v_tierra / v_lim if v_lim else 0):.0f}x",
              None))

    # A7. Lo que hace segura la correccion de testigos: el complemento es mar.
    fuera = []
    for c in cuerpos:
        cur.execute(f"SELECT count(*) FROM {tabla_sub} t WHERE ST_Intersects("
                    f"t.geom, ST_SetSRID(ST_MakePoint(%s,%s),{epsg}))",
                    (c["lon"], c["lat"]))
        if cur.fetchone()[0] == 0:
            fuera.append(f"{c['nombre']} ({c['lat']:.4f},{c['lon']:.4f})")
    r.append(("A7 las aguas interiores son tierra para esta capa",
              len(fuera) == 0 and len(cuerpos) > 0,
              f"{len(cuerpos) - len(fuera)} de {len(cuerpos)} cuerpos lacustres "
              f"caen dentro de la capa de tierra",
              ("son huecos de la capa: " + "; ".join(fuera[:10])) if fuera else None))
    return r


def puntos_del_insumo():
    """Insumo del A4b. Todo punto que el insumo declara para las jurisdicciones a las
    que la construccion les RESTA tierra. Cuales son esas lo dice el dato — el ambito
    —, no una lista en el codigo: si mañana se les restara tierra a las lacustres,
    basta que el ambito entre aca."""
    v2 = json.load(open(V2, encoding="utf-8"))
    pts = []
    for j in v2["jurisdicciones"]:
        if j["ambito"] not in AMBITOS_QUE_RESTAN_TIERRA:
            continue
        for p in (j.get("contorno") or []) + (j.get("puntos_no_incorporados") or []):
            if p.get("lat") is not None and p.get("lon") is not None:
                pts.append((f"{j['nombre']} contorno", p["lat"], p["lon"]))
        for campo in ("ancla_seleccion", "punto_representativo"):
            a = j.get(campo)
            if a and a.get("lat") is not None and a.get("lon") is not None:
                pts.append((f"{j['nombre']} {campo}", a["lat"], a["lon"]))
    if not pts:
        raise Alto(f"el insumo no declara ni un punto para los ambitos "
                   f"{sorted(AMBITOS_QUE_RESTAN_TIERRA)}: A4b no tendria con que "
                   f"medirse")
    return pts


def puntos_lacustres(cur, epsg):
    """Un punto interior por cuerpo lacustre adjudicado, sacado del inventario de
    lagos que ya usa el constructor. Insumo del A7."""
    from shapely.geometry import shape  # noqa: F401  (solo para claridad de deps)
    import pyogrio as _p
    lac = json.load(open(LACUSTRE, encoding="utf-8"))
    shp = os.path.join(REPO, "geodata", "lagos", "Inventario_Lagos.shp")
    if not os.path.exists(shp):
        raise Alto(f"no esta {shp}: sin el inventario de lagos no se puede "
                   f"comprobar A7, y sin A7 no se puede correr un testigo al agua")
    lagos = _p.read_dataframe(shp).to_crs(epsg=epsg)
    quiero = {}
    for j in lac["jurisdicciones"]:
        for c in j.get("cuerpos") or []:
            for fid in (c.get("shapefile_fid") or []):
                quiero[fid] = c["nombre_decreto"]
    if not quiero:
        raise Alto("el cotejo lacustre no adjudica ni un cuerpo: A7 no tendria con "
                   "que medirse")
    faltan = [f for f in quiero if f not in lagos.index]
    if faltan:
        raise Alto(f"el cotejo lacustre adjudica los fid {faltan[:10]} y el "
                   f"shapefile de lagos no los tiene")
    out = []
    for fid, nombre in sorted(quiero.items()):
        p = lagos.geometry.loc[fid].representative_point()
        out.append({"nombre": nombre, "lat": p.y, "lon": p.x})
    return out


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo-verificar", action="store_true",
                    help="no carga; corre los controles sobre lo que ya esta")
    args = ap.parse_args()

    man = json.load(open(MANIFIESTO, encoding="utf-8"))
    caja = man["recorte"]
    r_tierra, capa = rol(man, "tierra")
    _, capa_lim = rol(man, "limite_exterior")
    exigir_rol_tierra(r_tierra, capa)
    minimo = r_tierra.get("resolucion_minima_vs_limite_exterior")
    if not minimo:
        raise Alto("roles.tierra no declara resolucion_minima_vs_limite_exterior: "
                   "la capa se eligio por resolucion y esa exigencia se mide")
    tabla = ident(capa["tabla"], "tabla de la capa de tierra")
    tabla_sub = ident(capa.get("tabla_subdividida"), "tabla de trabajo subdividida")
    epsg = capa["epsg"]

    print("FASE 5 — CARGA DE LA CAPA DE COSTA")
    print(f"manifiesto : {os.path.relpath(MANIFIESTO, REPO)}")
    print(f"             sha256[:16] {sha256(MANIFIESTO)[:16]}")
    print(f"rol tierra : {capa['id']}  ->  {tabla} / {tabla_sub}")
    print(f"recorte    : x {caja['x_w']}..{caja['x_e']}  y {caja['y_s']}..{caja['y_n']}")
    print("")
    print("A1 el rol y la capa son compatibles: ok")
    print("A2/A3 huella y geometria de la fuente")

    gdf, v_tierra = leer_recortada(capa, caja, f"tierra '{capa['id']}'")
    _, v_lim = leer_recortada(capa_lim, caja, f"limite_exterior '{capa_lim['id']}'")

    cfg = leer_env()
    con = psycopg2.connect(host=cfg["DB_HOST"], port=cfg["DB_PORT"],
                           dbname=cfg["DB_NAME"], user=cfg["DB_USER"],
                           password=cfg["DB_PASSWORD"])
    con.autocommit = False
    try:
        cur = con.cursor()
        print("")
        cuerpos = puntos_lacustres(cur, epsg)
        pts_insumo = puntos_del_insumo()
        if not args.solo_verificar:
            print(f"Cargando {len(gdf)} poligonos en {tabla} y partiendolos en "
                  f"{tabla_sub}...")
            cargar(cur, gdf, tabla, tabla_sub, epsg)
        cur.execute(f"SELECT count(*) FROM {tabla_sub}")
        print(f"  {tabla_sub}: {cur.fetchone()[0]} trozos de hasta "
              f"{VERTICES_SUBDIVISION} vertices")

        print("")
        print("CONTROLES, dentro de la misma transaccion")
        res = controles(cur, tabla, tabla_sub, epsg, caja, len(gdf), v_tierra,
                        capa, capa_lim, v_lim, minimo, cuerpos, pts_insumo)
        cur.execute(f"DROP TABLE IF EXISTS {tabla}_verificacion")
        cur.execute(f"CREATE TABLE {tabla}_verificacion (control TEXT PRIMARY KEY, "
                    f"ok BOOLEAN NOT NULL, obtenido TEXT, detalle TEXT)")
        for c, ok, obt, det in res:
            cur.execute(f"INSERT INTO {tabla}_verificacion VALUES (%s,%s,%s,%s)",
                        (c, ok, obt, det))
            print(f"  [{'ok  ' if ok else 'FALLA'}] {c}")
            print(f"           {obt}" + (f" | {det}" if det else ""))

        cur.execute(f"DROP TABLE IF EXISTS {tabla}_procedencia")
        cur.execute(f"CREATE TABLE {tabla}_procedencia (clave TEXT PRIMARY KEY, "
                    f"valor TEXT)")
        for k, v in (("capa_id", capa["id"]),
                     ("rol", "tierra"),
                     ("archivo", capa["archivo"]),
                     ("sha256", capa["sha256"]),
                     ("origen", capa.get("origen")),
                     ("licencia", capa.get("licencia")),
                     ("epsg", str(epsg)),
                     ("recorte", f"{caja['x_w']},{caja['y_s']},{caja['x_e']},"
                                 f"{caja['y_n']}"),
                     ("poligonos", str(len(gdf))),
                     ("vertices_recortados", str(v_tierra)),
                     ("poligonos_disjuntos", str(capa.get("poligonos_disjuntos"))),
                     ("traslape_medido", next(
                         (o for c, _, o, _ in res if c.startswith("A5")), None)),
                     ("resolucion_medida", next(
                         (o for c, _, o, _ in res if c.startswith("A6")), None)),
                     ("tabla_subdividida", tabla_sub),
                     ("subdivision_vertices", str(VERTICES_SUBDIVISION)),
                     ("manifiesto", "geodata/costa/capas_costa.json"),
                     ("manifiesto_sha256", sha256(MANIFIESTO)),
                     ("cargado_por", "scripts/fase5_cargar_costa.py")):
            cur.execute(f"INSERT INTO {tabla}_procedencia VALUES (%s,%s)", (k, v))
        cur.execute(f"COMMENT ON TABLE {tabla} IS %s",
                    (f"Capa de tierra del rol 'tierra' de geodata/costa/"
                     f"capas_costa.json ({capa['id']}). Cargada por script, "
                     f"recortada a la caja de trabajo. Procedencia en "
                     f"{tabla}_procedencia, controles en {tabla}_verificacion. "
                     f"Tabla de trabajo subdividida: {tabla_sub}.",))

        fallan = [c for c, ok, _, _ in res if not ok]
        if fallan:
            con.rollback()
            raise Alto("la capa no paso sus propios controles y NO queda cargada:\n  "
                       + "\n  ".join(fallan))
        con.commit()
        print("")
        print(f"Capa cargada y verificada. {tabla} ({len(gdf)} poligonos, "
              f"{v_tierra} vertices) y {tabla_sub}.")
    finally:
        con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
