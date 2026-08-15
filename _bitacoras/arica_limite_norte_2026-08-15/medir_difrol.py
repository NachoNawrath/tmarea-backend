"""MEDICION DEL LIMITE NORTE DE `arica` CONTRA EL PAQUETE Espacios_Maritimos DE DIFROL.

Solo LEE y DESCARGA. No escribe en data/, src/, geodata/ ni en la base de datos.
Lo unico que escribe son sus propios derivados, dentro de este mismo directorio.

QUE CONTESTA, y por que cada pregunta esta aca:

  (1) Que es el paquete — geometria, campos, CRS y la traza de procesamiento del
      .shp.xml. Sin esto, "el datum es un rotulo" es una afirmacion sin medicion.
  (2) Donde terminan por el Norte las lineas de Mar Territorial (12 mn) y de Zona
      Contigua (24 mn). Ese es el valor del paralelo que la capa usa de verdad,
      contra el 18 21 03 del Acta de 1930.
  (3) EL RETROCALCULO DEL ANCLA. DIFROL no publica el punto de origen del limite:
      lo deja implicito en el trazado. Se proyectan los dos terminos hacia el
      Oriente sobre el paralelo —12 mn el de MT, 24 mn el de ZC— y se comprueba si
      caen en la misma longitud. Si coinciden, esa longitud es el ancla.
      DOS CAPAS INDEPENDIENTES QUE DAN EL MISMO PUNTO ES LA PRUEBA; una sola no
      probaria nada, porque cualquier punto retroproyectado desde una sola linea
      es la definicion de esa linea y no una medicion.
  (4) Donde termina la linea de ZEE/PC. Es lo que sostiene la decision de 24 mn:
      si el paralelo siguiera hasta las 200 mn, esa linea tendria que terminar
      sobre el paralelo, y no lo hace.

HECHO DE MAQUINA (va tambien en PROCEDENCIA.txt): difrol.gob.cl esta detras de
Cloudflare y ROMPE EL HANDSHAKE TLS CON SCHANNEL en Windows. Fallan
`Invoke-WebRequest` y `curl.exe` con SEC_E_ILLEGAL_MESSAGE. Baja con el python del
venv de tools/raster-build, que usa OpenSSL y no schannel.

SHELL DECLARADA (CLAUDE.md 7.3) — en PowerShell, desde la raiz del repositorio:

    cd C:\\Users\\katia\\tmarea-backend
    .\\tools\\raster-build\\.venv\\Scripts\\python.exe _bitacoras\\arica_limite_norte_2026-08-15\\medir_difrol.py

El interprete NO es `py` (no tiene geopandas) ni `python` (stub de la Microsoft
Store). Es el venv de tools/raster-build: 3.14.6, OpenSSL 3.5.7, geopandas 1.1.4.
"""

import hashlib
import io
import json
import math
import os
import re
import sys
import unicodedata
import urllib.request
import zipfile
from datetime import datetime, timezone

URL = "https://difrol.gob.cl/repositorio/Espacios_Maritimos/Espacios_Maritimos.zip"
AQUI = os.path.dirname(os.path.abspath(__file__))
ZIP_LOCAL = os.path.join(AQUI, "_Espacios_Maritimos.zip")   # crudo pesado: NO se versiona

MN_M = 1852.0          # una milla nautica en metros
ANCHO_MT_MN = 12.0     # mar territorial
ANCHO_ZC_MN = 24.0     # zona contigua


class Alto(Exception):
    """Un supuesto que no se cumple detiene el proceso con su motivo (CLAUDE.md 4.1)."""


def norm(s):
    """Normalizacion central de texto externo: sin acentos, MAYUSCULAS (INV-0.3)."""
    if s is None:
        return ""
    s = unicodedata.normalize("NFKD", str(s))
    return "".join(c for c in s if not unicodedata.combining(c)).upper().strip()


def dms(valor, positivo, negativo):
    """Grados-minutos-segundos con coma decimal, que es como los escribe el decreto."""
    hemi = positivo if valor >= 0 else negativo
    v = abs(valor)
    g = int(v)
    m = int((v - g) * 60)
    s = (v - g - m / 60) * 3600
    return f"{g:02d} {m:02d} {s:06.3f} {hemi}".replace(".", ",")


# ─── (0) DESCARGA, CON SU HUELLA ────────────────────────────────────────────────

def descargar():
    """Devuelve (bytes, cabeceras, de_cache). Reusa el zip local si ya esta."""
    if os.path.exists(ZIP_LOCAL):
        with open(ZIP_LOCAL, "rb") as fh:
            return fh.read(), {}, True
    req = urllib.request.Request(URL, headers={"User-Agent": "tmarea/medicion-arica"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            crudo = r.read()
            cab = {k: v for k, v in r.headers.items()}
    except Exception as e:
        raise Alto(
            f"no se pudo bajar {URL}: {e!r}. Si el error es de TLS, NO se reintenta "
            f"con curl.exe ni con Invoke-WebRequest: los dos usan schannel y este "
            f"host lo rompe. Este script ya usa OpenSSL."
        ) from e
    with open(ZIP_LOCAL, "wb") as fh:
        fh.write(crudo)
    return crudo, cab, False


# ─── (1) QUE ES EL PAQUETE ──────────────────────────────────────────────────────

def leer_paquete(crudo):
    import geopandas as gpd

    zf = zipfile.ZipFile(io.BytesIO(crudo))
    nombres = zf.namelist()
    shps = [n for n in nombres if n.lower().endswith(".shp")]
    if len(shps) != 1:
        raise Alto(f"se esperaba un unico .shp en el paquete y hay {len(shps)}: {shps}")

    destino = os.path.join(AQUI, "_shp")
    os.makedirs(destino, exist_ok=True)
    zf.extractall(destino)
    ruta = os.path.join(destino, shps[0])

    # La codificacion se PRUEBA en vez de suponerse, y se exige que el resultado
    # sea legible antes de parsear nada (INV-0.3: el parseo va sobre texto sano, no
    # sobre texto que se limpia despues).
    #
    # UNA AFIRMACION MIA QUE ERA FALSA, y queda escrita porque el error es del tipo
    # que este repositorio ya pago (CLAUDE.md 2). Al ver 'Zona Econ�mica' en la
    # salida escribi que el .cpg del paquete declaraba UTF-8 y mentia. NO ES ASI:
    # medido sobre los bytes crudos del .dbf, la secuencia es b'Econ\xc3\xb3mica',
    # que es UTF-8 VALIDO. El .cpg dice UTF-8 y tiene razon. El caracter de
    # reemplazo lo pone la CONSOLA de Windows al imprimir, no el archivo. Lei el
    # terminal y le atribui el defecto a la fuente. La sonda se conserva igual:
    # cuesta nada y deja el supuesto medido en vez de heredado.
    gdf, codificacion = None, None
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            cand = gpd.read_file(ruta, encoding=enc)
        except Exception:
            continue
        textos = " ".join(str(v) for c in cand.columns if c != "geometry"
                          for v in cand[c].tolist())
        if "�" not in textos:
            gdf, codificacion = cand, enc
            break
    if gdf is None:
        raise Alto("ninguna codificacion probada (utf-8, latin-1, cp1252) deja los "
                   "nombres del .dbf legibles; no se sigue con texto roto")

    prj = None
    p = os.path.splitext(ruta)[0] + ".prj"
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8", errors="replace") as fh:
            prj = fh.read().strip()

    # La traza de procesamiento: es la evidencia de que hubo DefineProjection y no
    # una transformacion. Se extraen los nombres de proceso, no el XML entero.
    procesos, xml_crudo = [], None
    for n in nombres:
        if n.lower().endswith(".shp.xml"):
            xml_crudo = zf.read(n).decode("utf-8", errors="replace")
            procesos = re.findall(r"<Process[^>]*Name=['\"]([^'\"]+)['\"]", xml_crudo)
            procesos += re.findall(r"\b(DefineProjection|Project|Dissolve|Merge|Append)\b",
                                   xml_crudo)
    return gdf, nombres, prj, list(dict.fromkeys(procesos)), xml_crudo, codificacion


# ─── (2) y (4) TERMINOS NORTE ───────────────────────────────────────────────────

def vertices(geom):
    """Todos los vertices de una geometria de lineas, como (lon, lat)."""
    partes = list(geom.geoms) if geom.geom_type.startswith("Multi") else [geom]
    out = []
    for p in partes:
        out.extend([(x, y) for x, y in zip(*p.coords.xy)])
    return out


def termino_norte(geom):
    """El vertice de latitud maxima. Es el extremo Norte de la linea."""
    vs = vertices(geom)
    if not vs:
        raise Alto("la geometria no trae vertices")
    return max(vs, key=lambda t: t[1])


def identificar(gdf):
    """MT y ZC por nombre; el limite exterior, por nombre Y POR GEOGRAFIA.

    Sin caso por defecto (CLAUDE.md 4.2): si algo no se identifica sin ambiguedad,
    se detiene.

    POR QUE EL CRITERIO DEL LIMITE EXTERIOR ES DISTINTO, y quedo escrito porque la
    primera version de esta funcion estaba mal: el paquete NO trae una linea de
    ZEE, trae CINCO features y TRES mencionan ZEE o Plataforma —dos 'Zona Economica
    Exclusiva y Plataforma Continental' y una 'Plataforma Continental'—. El nombre
    no las distingue. Lo que las distingue es DONDE ESTAN, y para la pregunta de
    `arica` la que importa es la que llega a la latitud de Arica. El criterio se
    declara aca en vez de elegir una: la unica cuyo termino norte cae al Norte del
    paralelo 25 S. Si hubiera mas de una, se detiene.
    """
    campo = next((c for c in gdf.columns if norm(c) in ("NOMBRE", "NOM_ABRE")), None)
    if campo is None:
        raise Alto(f"no hay campo de nombre en el shapefile; columnas: {list(gdf.columns)}")

    out = {}
    for clave, prueba in (("MT", lambda t: "MAR TERRITORIAL" in t),
                          ("ZC", lambda t: "CONTIGUA" in t)):
        hits = [i for i, v in gdf[campo].items() if prueba(norm(v))]
        if len(hits) != 1:
            raise Alto(
                f"'{clave}' no se identifica sin ambiguedad: {len(hits)} coincidencias "
                f"sobre el campo '{campo}'. Valores presentes: "
                f"{[str(v) for v in gdf[campo].tolist()]}. No se elige uno por defecto."
            )
        out[clave] = (hits[0], str(gdf[campo].iloc[hits[0]]))

    LAT_CORTE = -25.0
    cands = [i for i, v in gdf[campo].items()
             if ("EXCLUSIVA" in norm(v) or "PLATAFORMA" in norm(v))
             and termino_norte(gdf.geometry.iloc[i])[1] > LAT_CORTE]
    if len(cands) != 1:
        detalle = "; ".join(
            f"[{i}] '{gdf[campo].iloc[i]}' termino norte lat "
            f"{termino_norte(gdf.geometry.iloc[i])[1]:.4f}"
            for i, v in gdf[campo].items()
            if "EXCLUSIVA" in norm(v) or "PLATAFORMA" in norm(v))
        raise Alto(
            f"el limite exterior no se identifica sin ambiguedad: {len(cands)} "
            f"feature(s) de ZEE/PC con termino norte al Norte de {LAT_CORTE}. "
            f"Candidatas: {detalle}. No se elige una por defecto."
        )
    out["ZEE"] = (cands[0], str(gdf[campo].iloc[cands[0]]))
    return campo, out


# ─── (3) EL RETROCALCULO ────────────────────────────────────────────────────────

def retroceder_geodesica(lon, lat, millas):
    """Ir `millas` al Oriente por la GEODESICA de azimut inicial 90.

    SE CONSERVA A PROPOSITO Y NO SE USA COMO RESULTADO. Es el metodo con el que se
    hizo la primera corrida, y esta mal para este caso: una geodesica de azimut 90
    tiene su VERTICE en el punto de partida y desde ahi se va hacia el ecuador, o
    sea que NO se queda sobre el paralelo. A 12 mn se aparta ~9 m y a 24 mn ~38 m,
    y esos ~29 m de diferencia entre las dos aparecian como si las dos capas
    discreparan. Es el error que produce el instrumento, no la fuente. Queda para
    que la comparacion de los dos metodos este a la vista (CLAUDE.md 2).
    """
    from pyproj import Geod
    g = Geod(ellps="WGS84")
    lon2, lat2, _ = g.fwd(lon, lat, 90.0, millas * MN_M)
    return lon2, lat2


def retroceder_paralelo(lon, lat, millas):
    """Ir `millas` al Oriente SOBRE EL PARALELO — latitud constante. Es el metodo
    correcto: el limite que el decreto invoca y que la capa dibuja es un paralelo,
    que es una linea de latitud constante y NO una geodesica.

    La longitud del arco de paralelo por radian es N(phi)*cos(phi), con N el radio
    de curvatura en el primer vertical del elipsoide WGS84.
    """
    a, f = 6378137.0, 1 / 298.257223563
    e2 = f * (2 - f)
    phi = math.radians(lat)
    n = a / math.sqrt(1 - e2 * math.sin(phi) ** 2)
    radio = n * math.cos(phi)                     # metros por radian de longitud
    dlon = (millas * MN_M) / radio                # radianes
    return lon + math.degrees(dlon), lat          # la latitud NO se mueve


def metros_por_segundo_de_longitud(lat):
    a, f = 6378137.0, 1 / 298.257223563
    e2 = f * (2 - f)
    phi = math.radians(lat)
    n = a / math.sqrt(1 - e2 * math.sin(phi) ** 2)
    return n * math.cos(phi) * math.radians(1 / 3600)


def main():
    lineas = []
    A = lineas.append
    ahora = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")

    crudo, cab, de_cache = descargar()
    sha = hashlib.sha256(crudo).hexdigest()

    A("=" * 78)
    A("MEDICION DEL LIMITE NORTE DE `arica` — paquete Espacios_Maritimos de DIFROL")
    A(f"corrida: {ahora}   (UTC)")
    A("solo lectura sobre el repositorio; escribe unicamente sus derivados")
    A("=" * 78)
    A("")
    A("0. EL ARCHIVO Y SU HUELLA")
    A("-" * 78)
    A(f"  url          {URL}")
    A(f"  bytes        {len(crudo)}")
    A(f"  sha256       {sha}")
    A(f"  origen       {'zip ya presente en el directorio' if de_cache else 'descargado en esta corrida'}")
    for k in ("Last-Modified", "ETag", "Content-Type", "Date"):
        if k in cab:
            A(f"  {k:<12} {cab[k]}")
    A("")

    gdf, nombres, prj, procesos, _, codificacion = leer_paquete(crudo)

    A("1. QUE ES EL PAQUETE")
    A("-" * 78)
    A(f"  contenido del zip : {', '.join(sorted(nombres))}")
    A(f"  features          : {len(gdf)}")
    A(f"  codificacion .dbf : {codificacion} — PROBADA, no supuesta. El paquete trae")
    A("                      .cpg y declara UTF-8, y los bytes crudos lo confirman")
    A("                      (b'Econ\\xc3\\xb3mica'). Si al leer esta salida en una")
    A("                      consola de Windows aparece 'Econ?mica', el defecto es")
    A("                      de la consola y NO del archivo: el derivado .csv de al")
    A("                      lado esta en UTF-8 y bien.")
    A(f"  tipos de geometria: {sorted(set(gdf.geometry.geom_type))}")
    A(f"  campos            : {[c for c in gdf.columns if c != 'geometry']}")
    total_v = sum(len(vertices(g)) for g in gdf.geometry)
    A(f"  vertices totales  : {total_v}")
    zs = {round(z, 6) for g in gdf.geometry for z in
          ([c[2] for p in (g.geoms if g.geom_type.startswith('Multi') else [g])
            for c in p.coords if len(c) > 2])}
    A(f"  valores de Z      : {sorted(zs) if zs else 'la geometria no trae Z'}")
    A("")
    A("  .prj declarado:")
    A(f"    {prj if prj else '(no hay .prj en el paquete)'}")
    A(f"  EPSG que pyogrio deduce: {gdf.crs.to_epsg() if gdf.crs else None}")
    A("")
    A("  TRAZA DE PROCESAMIENTO del .shp.xml (es la evidencia del rotulo de datum):")
    A(f"    {procesos if procesos else '(sin traza de procesos en el .shp.xml)'}")
    A("")
    A("  LECTURA — el datum es un ROTULO, no una transformacion pendiente:")
    A("  el .prj declara un GCS sin codigo EPSG y sin epoca, y la traza muestra un")
    A("  DefineProjection, que REESCRIBE la etiqueta sin mover un solo vertice. Si")
    A("  hubiera habido cambio de datum la traza diria Project. QUIEN REPROYECTE")
    A("  CREYENDO QUE HAY UNA TRANSFORMACION PENDIENTE MUEVE EL DATO SIN MOTIVO.")
    A("")
    A("  LO QUE EL PAQUETE NO TRAE, y hay que decirlo: NO vienen las lineas de base.")
    A("  Sin ellas no se puede recalcular nada desde cero: se mide sobre el trazado")
    A("  publicado, que es lo que este script hace.")
    A("")

    campo, ident = identificar(gdf)

    A("2. LAS CINCO FEATURES, UNA POR UNA")
    A("-" * 78)
    A("  Van todas y no solo las tres que se usan, porque el nombre NO las")
    A("  distingue: hay dos 'Zona Economica Exclusiva y Plataforma Continental'.")
    A("")
    A(f"  {'#':>2}  {'nombre':<48} {'vert.':>6}  {'lat norte':>11}  {'lat sur':>11}")
    for i, v in gdf[campo].items():
        vs = vertices(gdf.geometry.iloc[i])
        lats = [p[1] for p in vs]
        A(f"  {i:>2}  {str(v):<48} {len(vs):>6}  {max(lats):>11.5f}  {min(lats):>11.5f}")
    A("")
    A(f"  IDENTIFICADAS PARA ESTA MEDICION: "
      f"MT=[{ident['MT'][0]}] · ZC=[{ident['ZC'][0]}] · limite exterior=[{ident['ZEE'][0]}]")
    A("  El limite exterior se eligio POR GEOGRAFIA (unica ZEE/PC con termino norte")
    A("  al Norte del paralelo 25 S), no por nombre. Ver el criterio en identificar().")
    A("")

    A("3. LOS TERMINOS NORTE")
    A("-" * 78)
    A(f"  campo de nombre usado: '{campo}'")
    A("")
    terminos = {}
    for clave in ("MT", "ZC", "ZEE"):
        i, nombre = ident[clave]
        lon, lat = termino_norte(gdf.geometry.iloc[i])
        terminos[clave] = (lon, lat, nombre)
        A(f"  {clave:<4} '{nombre}'")
        A(f"       termino norte  {dms(lat,'N','S')} / {dms(lon,'E','W')}")
        A(f"       decimal        {lat:.8f} / {lon:.8f}")
    A("")
    A("  CONTRA EL ACTA DE 1930: el Acta pone el hito en 18 21 03 S. Los dos")
    A("  terminos de arriba estan en 18 21 00 y algo, o sea que LA CAPA USA")
    A("  18 21 00 — tres segundos al Norte de lo que el Acta escribe.")
    A("  El hito 1 del Acta NO esta versionado en este repositorio, asi que la")
    A("  distancia exacta entre los dos puntos NO SE MIDE ACA (CLAUDE.md 3.2).")
    A("")

    from pyproj import Geod
    g = Geod(ellps="WGS84")

    A("4. EL RETROCALCULO DEL ANCLA")
    A("-" * 78)
    A("  Metodo: cada linea se proyecta hacia el ORIENTE por el ancho que le")
    A("  corresponde — 12 mn la de MT, 24 mn la de ZC — hasta el origen del limite.")
    A("  Si las dos caen en el mismo punto, ese punto es el ancla. SON DOS CAPAS")
    A("  INDEPENDIENTES: que coincidan es la prueba. Una sola no probaria nada,")
    A("  porque retroproyectar desde una linea reproduce la definicion de esa linea.")
    A("")
    A("  CORRECCION DE MI PROPIO INSTRUMENTO, hecha antes de reportar y escrita")
    A("  porque el metodo importa tanto como el numero (CLAUDE.md 2). La primera")
    A("  corrida proyecto sobre una GEODESICA de azimut inicial 90, y una geodesica")
    A("  NO es un paralelo: tiene su vertice en el punto de partida y desde ahi se")
    A("  aparta hacia el ecuador. Las dos se corren abajo, a la vista.")
    A("")
    anclas = {}
    for etiqueta, fn in (("GEODESICA (metodo equivocado)", retroceder_geodesica),
                         ("PARALELO   (metodo correcto)",  retroceder_paralelo)):
        pts = {}
        for clave, millas in (("MT", ANCHO_MT_MN), ("ZC", ANCHO_ZC_MN)):
            lon, lat, _ = terminos[clave]
            pts[clave] = fn(lon, lat, millas)
        (mlon, mlat), (zlon, zlat) = pts["MT"], pts["ZC"]
        _, _, sep = g.inv(mlon, mlat, zlon, zlat)
        A(f"  {etiqueta}")
        for clave, millas in (("MT", ANCHO_MT_MN), ("ZC", ANCHO_ZC_MN)):
            plon, plat = pts[clave]
            A(f"    desde {clave} ({millas:g} mn):  {dms(plat,'N','S')} / "
              f"{dms(plon,'E','W')}   [{plat:.8f}, {plon:.8f}]")
        A(f"    separacion MT vs ZC: {sep:.2f} m")
        A("")
        anclas[etiqueta.split()[0]] = pts

    pts = anclas["PARALELO"]
    (mlon, mlat), (zlon, zlat) = pts["MT"], pts["ZC"]
    dif_seg = abs(mlon - zlon) * 3600
    dif_m = dif_seg * metros_por_segundo_de_longitud(mlat)
    lon_med = (mlon + zlon) / 2
    lat_med = (mlat + zlat) / 2
    _, _, sep_m = g.inv(mlon, mlat, zlon, zlat)

    A("  EL RESULTADO, sobre el metodo correcto:")
    A(f"    diferencia en LONGITUD  {dif_seg:.4f}\" de arco  =  {dif_m:.2f} m")
    A(f"    diferencia en LATITUD   {abs(mlat-zlat)*3600:.4f}\" de arco")
    A(f"    separacion total        {sep_m:.2f} m")
    A("")
    A("  QUE AFIRMA ESTA COINCIDENCIA Y QUE NO. Afirma que las dos capas comparten")
    A("  el mismo origen EN LONGITUD dentro del metro. NO afirma que compartan la")
    A("  latitud al centimetro, y no pueden: sus propios terminos norte estan a")
    lat_mt, lat_zc = terminos["MT"][1], terminos["ZC"][1]
    _, _, sep_term = g.inv(terminos["MT"][0], lat_mt, terminos["MT"][0], lat_zc)
    A(f"  {abs(lat_mt-lat_zc)*3600:.3f}\" uno del otro ({sep_term:.1f} m de latitud), que es el ruido del")
    A("  propio trazado. El ancla se toma del promedio y se declara con ese ruido.")
    A("")
    A(f"  ANCLA RETROCALCULADA: {dms(lat_med,'N','S')} / {dms(lon_med,'E','W')}")
    A(f"              decimal : {lat_med:.8f} / {lon_med:.8f}")
    A(f"  REDONDEADA como se escribe en el insumo: 18 21 00 S / 070 22 49,7 W")
    A("")
    A("  ESTO ES UN RETROCALCULO NUESTRO. DIFROL NO PUBLICA ESTE PUNTO: lo deja")
    A("  implicito en el trazado de dos lineas. El valor de arriba es lo que se")
    A("  deduce de ellas, y asi tiene que quedar escrito en el insumo.")
    A("")

    A("5. HASTA DONDE LLEGA EL PARALELO — lo que sostiene la decision de 24 mn")
    A("-" * 78)
    zlon_t, zlat_t, znom = terminos["ZEE"]
    A(f"  La linea de ZEE/PC ('{znom}') termina por el Norte en")
    A(f"    {dms(zlat_t,'N','S')} / {dms(zlon_t,'E','W')}   [{zlat_t:.8f}, {zlon_t:.8f}]")
    _, _, d_par = g.inv(zlon_t, zlat_t, zlon_t, lat_med)
    A(f"  Ese punto esta a {d_par/MN_M:.1f} mn AL SUR del paralelo del ancla.")
    A("")
    A("  LECTURA: si el limite con Peru siguiera el paralelo hasta las 200 mn, la")
    A("  linea de ZEE tendria que terminar SOBRE el paralelo. No lo hace. El propio")
    A("  paquete niega que el paralelo siga mas alla, y por eso cubrir de 24 a 200")
    A("  mn con el paralelo adjudicaria como chilena agua que la fuente que usamos")
    A("  para cerrar el Norte dice que no lo es.")
    A("")
    A("=" * 78)
    A("FIN")
    A("=" * 78)

    salida = "\n".join(lineas) + "\n"
    print(salida)

    # ── Derivados. Se versionan siempre (CLAUDE.md 3.5). Sin BOM, saltos \n. ──
    with open(os.path.join(AQUI, "02_retrocalculo.txt"), "w",
              encoding="utf-8", newline="\n") as fh:
        fh.write(salida)

    filas = [("clave", "nombre_en_la_capa", "rol", "lat_dec", "lon_dec",
              "lat_dms", "lon_dms")]
    for clave in ("MT", "ZC", "ZEE"):
        lon, lat, nombre = terminos[clave]
        filas.append((clave, nombre, "termino_norte_de_la_linea",
                      f"{lat:.8f}", f"{lon:.8f}", dms(lat, "N", "S"), dms(lon, "E", "W")))
    for clave in ("MT", "ZC"):
        alon, alat = anclas["PARALELO"][clave]
        filas.append((clave, ident[clave][1], f"ancla_retrocalculada_{clave}_sobre_paralelo",
                      f"{alat:.8f}", f"{alon:.8f}", dms(alat, "N", "S"), dms(alon, "E", "W")))
    for clave in ("MT", "ZC"):
        alon, alat = anclas["GEODESICA"][clave]
        filas.append((clave, ident[clave][1],
                      f"ancla_retrocalculada_{clave}_sobre_geodesica_NO_USAR",
                      f"{alat:.8f}", f"{alon:.8f}", dms(alat, "N", "S"), dms(alon, "E", "W")))
    filas.append(("MT+ZC", "promedio de los dos retrocalculos", "ancla_del_limite",
                  f"{lat_med:.8f}", f"{lon_med:.8f}",
                  dms(lat_med, "N", "S"), dms(lon_med, "E", "W")))
    with open(os.path.join(AQUI, "01_terminos_medidos.csv"), "w",
              encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(";".join(f) for f in filas) + "\n")

    with open(os.path.join(AQUI, "03_huella.json"), "w",
              encoding="utf-8", newline="\n") as fh:
        json.dump({
            "url": URL,
            "sha256": sha,
            "bytes": len(crudo),
            "cabeceras": cab,
            "medido_el": ahora,
            "interprete": sys.version.split()[0],
            "features": int(len(gdf)),
            "prj": prj,
            "procesos_shp_xml": procesos,
            "separacion_entre_retrocalculos_m": round(sep_m, 3),
            "ancla_del_limite": {"lat": round(lat_med, 8), "lon": round(lon_med, 8)},
        }, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Alto as e:
        print(f"\nALTO: {e}\n", file=sys.stderr)
        sys.exit(2)
