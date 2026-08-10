"""
FASE 4 — Rediseno del insumo de jurisdicciones. v1 -> v2.

Transforma la ESTRUCTURA del archivo fuente. El CONTENIDO no se toca: los
vertices, las coordenadas, las citas del decreto, las correcciones registradas y
los textos literales pasan tal cual. Nada se corrige, nada se deduce, nada se
rellena. Lo que cambia es como esta organizado, porque la organizacion anterior
tenia tres defectos que producian errores silenciosos.

QUE CAMBIA, Y POR QUE
---------------------
1. UNA SOLA LISTA DE PUNTOS por jurisdiccion (`contorno`), en vez de `vertices`
   y `poligonal_completa`. Dos listas que pueden discrepar, discrepan: en v1 hay
   4 vertices presentes en una y ausentes de la otra, y la construccion leia la
   que no los tenia. Se perdian sin aviso — uno de ellos, la esquina NE del
   limite norte de Quemchi, a 47 km de su poligonal.

   Al fusionarlas, cada punto se coteja contra el texto literal del decreto de su
   propia jurisdiccion: si sus coordenadas aparecen ahi, entra con
   `respaldo_textual: true`; si no aparecen, entra marcado con
   `respaldo_textual: false` y NO se usa para construir. Es un cotejo contra el
   literal, no una interpretacion.

2. DESAPARECE `rol_cadena`. Era una letra cardinal que pretendia decir de que
   lado de la poligonal queda la jurisdiccion. Una letra solo nombra un borde si
   la poligonal corre en ese eje, y en 7 de 16 casos no lo hace: Talcahuano a 0
   grados, Puerto Aguirre a 1, Puerto Chacabuco a 15. Con esos angulos el lado
   que sale lo decide el constructor y no el decreto — de ahi el traslape de
   28.325 km2 entre Puerto Aguirre y Puerto Chacabuco.

   El lado pasa a decidirlo el `ancla_seleccion`: la jurisdiccion es el trozo que
   contiene la sede de su Capitania. No es interpretacion del decreto, es un
   hecho verificable — el decreto no puede poner la Capitania de Lirquen fuera de
   Lirquen. Y funciona igual con poligonales en escalera, donde una letra
   cardinal no significa nada.

3. LA FRONTERA ES UNA ENTIDAD COMPARTIDA, no una propiedad que cada vecina
   declara por su cuenta. En v1 una misma frontera se declaraba dos veces, una en
   cada Capitania, y las dos declaraciones podian contradecirse — Castro y Chonchi
   quedaban del mismo lado de la frontera que comparten. Con la frontera como
   entidad unica con dos lados nombrados, esa contradiccion es imposible de
   escribir.

4. `estado_geometria` SE DECLARA EN LA FUENTE, no se deduce al construir. En v1
   solo 2 de las 8 que no cierran estaban declaradas; las otras 6 pasaban como
   jurisdicciones normales con `participa_matching: true` y sin motivo. Eso es el
   falso negativo silencioso que INV-3.6 prohibe por nombre.

5. DOS PUNTOS CON DOS PROPOSITOS DISTINTOS, que v1 confundia en uno solo:
     `ancla_seleccion`      elige el trozo al construir. Puede estar en tierra.
                            Es la sede de la Capitania. Convencion nuestra.
     `punto_representativo` es el testigo que la geometria FINAL debe contener.
                            Tiene que estar sobre agua, porque la construccion
                            resta la tierra: un punto en tierra jamas puede estar
                            contenido, y el control se vuelve infalsable. En v1
                            los 51 puntos eran la sede, en tierra, todos.

6. `sectores: []` en cada jurisdiccion. La nota de alcance de INV-3.4 anticipa
   que las resoluciones locales subdividen la jurisdiccion en sectores con
   condicion de puerto independiente. Que el hueco exista desde ahora evita
   rehacer la estructura cuando lleguen.

DE DONDE SALE EL PUNTO REPRESENTATIVO, SIN FABRICAR NINGUNA COORDENADA
----------------------------------------------------------------------
maritimas  De las bahias SITPORT, que son puntos sobre agua, reales, y ya
           versionados en el repositorio. Se elige la bahia mas cercana a la sede
           de entre las que caen dentro de la franja de latitud que el decreto
           fija para esa jurisdiccion. La franja es del decreto; la eleccion por
           cercania es convencion nuestra y queda declarada en el campo `origen`.
           NO se usa la capitania que `bahia-capitania-map.json` asigna a cada
           bahia: ese mapa tiene 38 capitanias contra las 64 del decreto y
           discrepa de el en varias bahias. Sirve como banco de pruebas de la
           capa, no como fuente de esta asignacion.
lacustres  Punto sobre la superficie del cuerpo de agua adjudicado en Fase 2.
           Agua por definicion.
antarticas Punto sobre la superficie del anillo que el decreto describe.

Las que no alcanzan un punto quedan con `punto_representativo: null` y su causa
declarada, igual que la geometria.

Uso, desde la raiz del repositorio:
    tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\fase4_migrar_insumo_v2.py
"""

import hashlib
import json
import math
import os
import re
import sys
from collections import defaultdict

import geopandas as gpd
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.validation import make_valid

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
LACUSTRE = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
SEED_BAHIAS = os.path.join(REPO, "scripts", "seed-bahias-sitport.js")
# Borde de la caja de trabajo, para resolver los puntos que el decreto deja
# 'hasta el lado abierto'. CONVENCION nuestra; los mismos valores que la
# construccion y el auditor.
X_W, X_E = -85.0, -65.0
SHP_LAGOS = os.path.join(REPO, "geodata", "lagos", "Inventario_Lagos.shp")
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")

TOL = 1e-6
RE_DMS = re.compile(r"(\d{1,3})\s+(\d{1,2})\s+(\d{1,2})\s*([SWNE])\b")
RE_BAHIA = re.compile(
    r"(\d+):\s*\{\s*lat:\s*(-?[\d.]+),\s*lng:\s*(-?[\d.]+),\s*nombre:\s*'([^']*)'\s*\}")


class Alto(Exception):
    """Un supuesto de la migracion no se cumple. Se detiene, no se degrada."""


def sha(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def dms(valor, eje):
    """Decimal -> '073 32 30 W'. Para escribir el DMS de un punto que v1 solo
    traia en decimal, de modo que el v2 quede uniforme."""
    if valor is None:
        return None
    hemi = ("S" if valor < 0 else "N") if eje == "lat" else ("W" if valor < 0 else "E")
    v = abs(valor)
    g = int(v)
    m = int(round((v - g) * 3600)) // 60
    s = int(round((v - g) * 3600)) % 60
    if m == 60:
        g, m = g + 1, 0
    ancho = 2 if eje == "lat" else 3
    return f"{g:0{ancho}d} {m:02d} {s:02d} {hemi}"


def coords_del_texto(texto):
    """Coordenadas DMS que el texto nombra, como decimales con su hemisferio."""
    out = []
    for m in RE_DMS.finditer(texto or ""):
        val = int(m.group(1)) + int(m.group(2)) / 60 + int(m.group(3)) / 3600
        out.append((-val if m.group(4) in ("S", "W") else val, m.group(4)))
    return out


def _ejes_nombrados(texto, lat, lon):
    """(nombra_la_latitud, nombra_la_longitud) en este texto.

    Se buscan por separado porque el decreto a veces las escribe juntas
    ('41 39 00 S / 073 03 54 W') y a veces separadas por prosa ('el paralelo
    42 00 00 S desde el meridiano 073 00 00 W'). Cotejo contra el literal.
    """
    c = coords_del_texto(texto)
    hay_lat = any(h in ("S", "N") and abs(v - lat) <= 1e-4 for v, h in c)
    hay_lon = lon is None or any(h in ("W", "E") and abs(v - lon) <= 1e-4 for v, h in c)
    return hay_lat, hay_lon


def _nombra(texto, lat, lon):
    return all(_ejes_nombrados(texto, lat, lon))


def respaldo_textual(cap, corpus, lat, lon):
    """Donde respalda el decreto a este punto: (nivel, detalle).

    nivel 'propio'      lo nombra el parrafo de su propia jurisdiccion.
    nivel 'correccion'  lo nombra la correccion registrada de esa jurisdiccion
                        (INV-3.7). Es el caso de una longitud que el decreto
                        escribe con hemisferio S y la correccion lee como W.
    nivel 'ajeno'       lo nombra el parrafo de OTRA jurisdiccion. Vale cuando
                        las dos comparten esa frontera — el decreto describe una
                        misma linea desde los dos lados y no siempre repite las
                        coordenadas en ambos parrafos. Cual es cual lo decide
                        despues el cruce con las fronteras derivadas.
    nivel 'ninguno'     el decreto no lo nombra en ninguna parte.
    """
    prop_lat, prop_lon = _ejes_nombrados(cap["texto_decreto"], lat, lon)
    if prop_lat and prop_lon:
        return "propio", cap["id"]
    corr = cap.get("correccion_aplicada")
    if corr:
        # La correccion suele reparar UNA de las dos coordenadas — el hemisferio
        # de una longitud, por ejemplo — mientras la otra sigue estando bien en
        # el parrafo. Por eso se completa eje por eje, no exigiendo que la
        # correccion repita el punto entero.
        corr_lat, corr_lon = _ejes_nombrados(corr, lat, lon)
        if (prop_lat or corr_lat) and (prop_lon or corr_lon):
            return "correccion", cap["id"]
    ajenos = [oid for oid, txt in corpus.items()
              if oid != cap["id"] and _nombra(txt, lat, lon)]
    if ajenos:
        return "ajeno", ajenos
    return "ninguno", None


def leer_bahias():
    """Las 162 bahias SITPORT con coordenadas, desde el seed versionado."""
    src = open(SEED_BAHIAS, encoding="utf-8").read()
    m = re.search(r"const BAHIA_COORDS = \{([\s\S]*?)\n\};", src)
    if not m:
        raise Alto(f"no se encontro BAHIA_COORDS en {SEED_BAHIAS}")
    bahias = [{"id": int(x.group(1)), "lat": float(x.group(2)),
               "lon": float(x.group(3)), "nombre": x.group(4)}
              for x in RE_BAHIA.finditer(m.group(1))]
    if not bahias:
        raise Alto("BAHIA_COORDS quedo vacio al parsear: cambio el formato del seed")
    return bahias


def contorno_unificado(cap, corpus):
    """Funde 'vertices' y 'poligonal_completa' en una lista unica y ordenada.

    Manda el orden de poligonal_completa cuando existe, porque es el recorrido
    integro con los giros axiales de la prosa. Los puntos que solo estan en
    'vertices' se agregan al final, marcados con su procedencia, para que no se
    pierdan en silencio como pasaba en v1.

    Devuelve (contorno, cerrado). 'cerrado' se decide ANTES de quitar el punto
    repetido de cierre: un anillo se reconoce porque su primer punto vuelve a
    aparecer al final, y si se deduplica primero esa senal desaparece.
    """
    salida, vistos = [], set()

    abierto = lado_abierto(cap)

    def agregar(v, procedencia):
        lat, lon = v.get("lat"), v.get("lon")
        if lat is None:
            return
        # Un punto sin longitud dice 'por este paralelo hasta el lado abierto'.
        # En v1 eso quedaba sin resolver y el punto se caia del recorrido: el
        # tramo terminal que el decreto describe desaparecia. Aqui se resuelve al
        # borde de la caja de trabajo por el lado que el propio dato declara
        # abierto, y se marca de donde salio esa longitud para que nadie la
        # confunda con una coordenada del decreto.
        lon_origen = None
        if lon is None and abierto:
            lon = X_W if abierto == "W" else X_E
            lon_origen = f"resuelta al lado abierto {abierto} (convencion, no decreto)"
        clave = (round(lat, 6), None if lon is None else round(lon, 6))
        if clave in vistos:
            return
        vistos.add(clave)
        nivel, donde = respaldo_textual(cap, corpus, lat,
                                        None if lon_origen else lon)
        salida.append({
            "lat": lat, "lon": lon,
            "lat_dms": v.get("lat_dms") or dms(lat, "lat"),
            "lon_dms": v.get("lon_dms") or dms(lon, "lon"),
            "nombre": v.get("nombre"),
            "procedencia": procedencia,
            "lon_origen": lon_origen,
            "respaldo": nivel,
            "respaldo_en": donde,
            "usable": None,   # lo fija el cruce con las fronteras
        })

    recorrido = cap.get("poligonal_completa") or cap.get("vertices") or []
    con_lon = [(v["lon"], v["lat"]) for v in recorrido
               if v.get("lat") is not None and v.get("lon") is not None]
    cerrado = len(con_lon) >= 4 and con_lon[0] == con_lon[-1]
    if cap["ambito"] == "antartica":
        cerrado = True

    procedencia = ("poligonal_completa" if cap.get("poligonal_completa")
                   else "vertices")
    for v in recorrido:
        agregar(v, procedencia)

    # Los puntos que v1 tenia solo en la lista suelta NO se meten en el
    # recorrido. Insertarlos exigiria decidir por donde pasa el trazo, y eso es
    # decidir que dice el decreto. Van aparte, documentados: el decreto los
    # nombra y el recorrido transcrito no los incluye, que es justo lo que el
    # owner tiene que resolver.
    sueltos = []
    if cap.get("poligonal_completa"):
        for v in (cap.get("vertices") or []):
            lat, lon = v.get("lat"), v.get("lon")
            if lat is None:
                continue
            clave = (round(lat, 6), None if lon is None else round(lon, 6))
            if clave in vistos:
                continue
            vistos.add(clave)
            nivel, donde = respaldo_textual(cap, corpus, lat, lon)
            sueltos.append({
                "lat": lat, "lon": lon,
                "lat_dms": v.get("lat_dms") or dms(lat, "lat"),
                "lon_dms": v.get("lon_dms") or dms(lon, "lon"),
                "nombre": v.get("nombre"),
                "respaldo": nivel, "respaldo_en": donde,
                "motivo": ("el decreto lo nombra pero el recorrido transcrito no lo "
                           "incluye; incorporarlo exige decidir por donde pasa el "
                           "trazo, y eso es del owner"),
            })
    return salida, cerrado, sueltos


def puntos_todos(contorno):
    """Todo punto con longitud, sin filtrar por respaldo. Se usa para derivar las
    fronteras compartidas, que a su vez deciden que respaldo ajeno es valido."""
    return [(p["lon"], p["lat"]) for p in contorno if p["lon"] is not None]


def puntos_utiles(contorno):
    """Los puntos que construyen: con longitud y con respaldo aceptado."""
    return [(p["lon"], p["lat"]) for p in contorno
            if p["lon"] is not None and p["usable"]]


def banda(cap, contorno):
    """Franja [sur, norte] del decreto, extendida por el contorno util."""
    lats = [la for _, la in puntos_utiles(contorno)]
    n, s = cap.get("limite_norte_dec"), cap.get("limite_sur_dec")
    cn = ([n] if n is not None else []) + lats
    cs = ([s] if s is not None else []) + lats
    if not cn or not cs:
        return None
    return (min(cs), max(cn))


# ── estado de geometria: se declara, no se deduce al construir ───────────────

def declarar_estado(cap, contorno, cerrado, cuerpos):
    """(receta, estado, causa). Misma pregunta que hace la auditoria, pero aqui la
    respuesta queda ESCRITA EN EL DATO, que es lo que INV-3.6 exige.

    La receta v2 es una sola y uniforme, sin letras cardinales:

      union_cuerpos   lacustre: la union de los cuerpos adjudicados en Fase 2.
      anillo          el contorno cierra sobre si mismo.
      corte_y_ancla   el contorno abierto parte una caja en dos y el ancla elige
                      el trozo. La caja se acota con los paralelos que el decreto
                      declare; los que no declare no hacen falta, porque el
                      contorno y el litoral cierran el resto.
      banda_paralelos sin contorno: la franja entre los dos paralelos.

    Lo que hace no cerrable a una jurisdiccion es que le falte el ingrediente de
    su receta, no que le falte un campo que su receta no usa.
    """
    amb = cap["ambito"]
    pts = puntos_utiles(contorno)
    n, s = cap.get("limite_norte_dec"), cap.get("limite_sur_dec")

    # Lo que la propia fuente ya declara como no georreferenciable manda: es un
    # limite que el decreto no entrega, no una carencia de la transcripcion.
    if cap.get("sin_georreferenciar"):
        return "-", "no_cerrable", (cap.get("motivo_exclusion") or cap.get("revisar"))

    if amb == "lacustre":
        if not [f for c in cuerpos for f in (c.get("shapefile_fid") or [])]:
            return "union_cuerpos", "no_cerrable", "sin cuerpos de agua adjudicados"
        return "union_cuerpos", "cerrable", None

    if amb == "insular_remota":
        return ("-", "no_cerrable",
                "el decreto nombra las islas sin coordenadas y el insumo no trae capa "
                "de islas; requiere fuente externa")

    if cerrado:
        if len(pts) < 3:
            return ("anillo", "no_cerrable",
                    f"el contorno cierra pero deja {len(pts)} punto(s) utilizable(s); "
                    f"se necesitan 3")
        return "anillo", "cerrable", None

    if len(pts) >= 2:
        if not cap.get("punto_interior"):
            return ("corte_y_ancla", "no_cerrable",
                    "el contorno parte el espacio en dos y no hay ancla que diga cual "
                    "de los dos trozos es la jurisdiccion")
        if cap.get("revisar"):
            return "corte_y_ancla", "no_cerrable", cap["revisar"]
        return "corte_y_ancla", "cerrable", None

    if n is not None and s is not None:
        return "banda_paralelos", "cerrable", None

    if cap.get("revisar"):
        return "-", "no_cerrable", cap["revisar"]
    falta = ("el limite sur" if n is not None else
             "el limite norte" if s is not None else "ambos paralelos")
    return ("-", "no_cerrable",
            f"el decreto no entrega con que cerrar: falta {falta}, y no hay contorno "
            f"que lo supla. No se toma del vecino.")


# ── fronteras compartidas ────────────────────────────────────────────────────



def sigue_litoral(cap):
    """¿El decreto describe algun tramo del limite como 'el litoral'?

    Donde el decreto dice 'siguiendo el litoral' no esta trazando una recta:
    esta diciendo que el limite sigue la costa. Unir los dos extremos con una
    recta corta por dentro y deja fuera superficie decretada — por eso el puerto
    de Puerto Montt caia fuera de su propia jurisdiccion.

    CONVENCION autorizada por el owner el 2026-08-09: en estas jurisdicciones el
    contorno se cierra generosamente HACIA TIERRA y la tierra se resta despues.
    Queda 'de mas, nunca de menos', que es INV-3.4. La deteccion es textual y
    verificable: la palabra en el parrafo del propio decreto. Se conserva el
    campo del v1 cuando ya venia marcado.
    """
    return bool(cap.get("sigue_litoral")
                or describe_litoral(cap.get("texto_decreto")))


PALABRAS_LITORAL = ("litoral", "costa", "ribera")


def describe_litoral(fragmento):
    """El fragmento del decreto dice que el tramo sigue la costa.

    Comparacion por subcadena y no por expresion regular a proposito: una
    expresion con escapes es fragil de transportar entre archivos, y aqui un
    fallo silencioso del patron marcaria como 'frontera' un tramo de litoral, que
    es exactamente el error que este campo existe para evitar.
    """
    t = (fragmento or "").lower()
    return any(w in t for w in PALABRAS_LITORAL)



def _pos_en_texto(texto, lat, lon):
    """Posicion en el texto donde el decreto nombra este punto, o None.

    Se busca la latitud, y entre las apariciones se prefiere la que tenga la
    longitud del punto cerca. Devuelve (inicio, fin) del tramo nombrado.
    """
    mejor = None
    for m in RE_DMS.finditer(texto or ""):
        v = int(m.group(1)) + int(m.group(2)) / 60 + int(m.group(3)) / 3600
        v = -v if m.group(4) in ("S", "W") else v
        if m.group(4) not in ("S", "N") or abs(v - lat) > 1e-4:
            continue
        # ¿la longitud del punto aparece dentro de los 40 caracteres siguientes?
        # El fin del punto es el fin de SU longitud cuando el decreto la escribe
        # a continuacion. Tomar un largo fijo se comeria el texto que describe el
        # tramo siguiente, que es justamente lo que hay que leer.
        fin, cerca = m.end(), False
        for x in RE_DMS.finditer(texto[m.end():m.end() + 40]):
            if x.group(4) not in ("W", "E"):
                continue
            xv = -(int(x.group(1)) + int(x.group(2)) / 60 + int(x.group(3)) / 3600)
            if lon is not None and abs(xv - lon) <= 1e-4:
                fin, cerca = m.end() + x.end(), True
                break
        if lon is None:
            cerca = True
        # Solo vale la aparicion que trae TAMBIEN la longitud del punto. Una
        # latitud puede repetirse en el parrafo — Puerto Montt nombra 41 39 00 S
        # dos veces, con longitudes distintas — y quedarse con la primera arrastra
        # el fragmento del tramo equivocado. Sin coincidencia exacta se devuelve
        # None y el tramo queda 'indeterminado': un hueco que el auditor caza vale
        # mas que una marca que parece buena y no lo es.
        if not cerca:
            continue
        if mejor is None or m.start() < mejor[1][0]:
            mejor = ((0, m.start()), (m.start(), fin))
    return mejor[1] if mejor else None


def marcar_tramos(cap, contorno, cerrado, abierto, corpus=None):
    """Clasifica cada tramo del contorno: litoral, frontera o abierto.

    TRANSCRIPCION, no inferencia. Para cada par de puntos consecutivos se
    localiza en el parrafo del decreto donde se nombra cada uno y se lee el texto
    QUE VA ENTRE LOS DOS. Ese fragmento es el que describe el tramo, y se guarda
    junto a la marca para que la clasificacion sea auditable palabra por palabra.

      litoral    el decreto dice que ese tramo sigue el litoral, la costa o una
                 ribera. Es el unico que ensancha hacia tierra.
      abierto    el tramo termina en el lado abierto: sale a mar afuera y no hay
                 tierra que capturar, asi que tampoco ensancha.
      frontera   el resto — linea imaginaria, paralelo, meridiano o diagonal.

    Un tramo cuyos extremos no se pueden localizar en el texto queda
    'indeterminado'. No se adivina: lo reporta el auditor.
    """
    pts = [q for q in contorno if q["lon"] is not None and q.get("usable")]
    if len(pts) < 2:
        return []
    pares = list(zip(pts, pts[1:]))
    if cerrado and pts[0] != pts[-1]:
        pares.append((pts[-1], pts[0]))
    # El decreto describe una misma frontera desde los dos lados y no siempre
    # repite las coordenadas en ambos parrafos. Cuando el propio parrafo no
    # nombra los extremos del tramo, se lee el de la jurisdiccion que si los
    # nombra — el mismo criterio con que se acepto el respaldo ajeno.
    textos = [("propio", cap["texto_decreto"])]
    ajenos = {o for q in contorno if q.get("respaldo") == "ajeno"
              for o in (q.get("respaldo_en") or [])}
    for oid in sorted(ajenos):
        if corpus and oid in corpus:
            textos.append((oid, corpus[oid]))

    tramos = []
    for a, b in pares:
        origen = None
        if b.get("lon_origen") or a.get("lon_origen"):
            tipo, frag = "abierto", (cap.get("cierre") or "")
        else:
            tipo, frag, origen = "indeterminado", None, None
            for quien, texto in textos:
                pa = _pos_en_texto(texto, a["lat"], a["lon"])
                pb = _pos_en_texto(texto, b["lat"], b["lon"])
                if pa is None or pb is None:
                    continue
                ini, fin = (pa[1], pb[0]) if pa[1] <= pb[0] else (pb[1], pa[0])
                frag = texto[ini:fin].strip()
                tipo = "litoral" if describe_litoral(frag) else "frontera"
                origen = quien
                break
        tramos.append({
            "desde": {"lat": a["lat"], "lon": a["lon"], "nombre": a.get("nombre")},
            "hasta": {"lat": b["lat"], "lon": b["lon"], "nombre": b.get("nombre")},
            "tipo": tipo,
            "fragmento_decreto": (frag or None) if frag != "" else None,
            "fragmento_de": origen if tipo != "abierto" else "cierre",
        })
    return tramos


def lado_abierto(cap):
    """Hacia donde queda abierta la figura, segun la prosa de cierre de v1.

    Un punto del contorno sin longitud significa 'por este paralelo hasta el lado
    abierto'. En v1 eso vivia en prosa; aqui queda como campo.
    """
    c = cap.get("cierre") or ""
    if "Abierto al Weste" in c:
        return "W"
    if "Abierto al Este" in c:
        return "E"
    return None


def derivar_fronteras(caps, contornos, cerrados):
    """Las fronteras del insumo, cada una como UNA entidad con sus dos lados.

    Dos tipos:
      paralelo   el limite sur de una es el limite norte de otra.
      poligonal  dos jurisdicciones transcriben 2 o mas vertices identicos.
    El lado que no tiene vecina en el insumo queda en null: es mar abierto,
    frontera internacional, litoral o una jurisdiccion que no cierra.
    """
    fronteras, incidencias = [], []

    por_sur = defaultdict(list)
    por_norte = defaultdict(list)
    for c in caps:
        if c.get("limite_sur_dec") is not None:
            por_sur[round(c["limite_sur_dec"], 6)].append(c)
        if c.get("limite_norte_dec") is not None:
            por_norte[round(c["limite_norte_dec"], 6)].append(c)

    for lat in sorted(set(por_sur) & set(por_norte), reverse=True):
        arriba, abajo = por_sur[lat], por_norte[lat]
        for a in arriba:
            for b in abajo:
                fronteras.append({
                    "id": f"par__{a['id']}__{b['id']}",
                    "tipo": "paralelo",
                    "latitud": lat,
                    "latitud_dms": a.get("limite_sur_dms"),
                    "puntos": [],
                    "lado_norte": a["id"],
                    "lado_sur": b["id"],
                    "citas": {a["id"]: a["texto_decreto"][:0] or None,
                              b["id"]: None},
                })
        if len(arriba) > 1 or len(abajo) > 1:
            incidencias.append(
                f"el paralelo {lat:.6f} lo comparten {len(arriba)} por el Sur "
                f"({[c['nombre'] for c in arriba]}) y {len(abajo)} por el Norte "
                f"({[c['nombre'] for c in abajo]}): son Capitanias laterales, no "
                f"apiladas, y el paralelo solo no las separa")

    ids = [c["id"] for c in caps]
    idx = {c["id"]: c for c in caps}
    for i, a in enumerate(ids):
        pa = puntos_todos(contornos[a])
        if not pa:
            continue
        for b in ids[i + 1:]:
            pb = puntos_todos(contornos[b])
            if not pb:
                continue
            sb, vistos, com = set(pb), set(), []
            for p in pa:
                if p in sb and p not in vistos:
                    vistos.add(p)
                    com.append(p)
            if len(com) < 2:
                continue
            # Orden segun A; se comprueba que B transcriba la misma secuencia.
            # Vale el sentido opuesto, y vale la rotacion cuando alguno de los
            # dos contornos es un anillo: en un anillo el punto de partida es
            # arbitrario, asi que la misma frontera puede aparecer cortada por
            # el inicio de la lista sin que eso signifique un trazo distinto.
            # Solo los puntos que vienen del recorrido integro llevan orden. Los
            # anexados desde la lista suelta de v1 se agregan al final de la
            # fusion, y compararlos como si tuvieran posicion daria una
            # discrepancia inventada por el metodo.
            ordenado_a = {(p["lon"], p["lat"]) for p in contornos[a]
                          if p["procedencia"] == "poligonal_completa"}
            ordenado_b = {(p["lon"], p["lat"]) for p in contornos[b]
                          if p["procedencia"] == "poligonal_completa"}
            con_orden = ordenado_a & ordenado_b
            com_ord = [p for p in com if p in con_orden]
            en_b = [p for p in pb if p in con_orden]
            anillo = cerrados.get(a) or cerrados.get(b)

            def coincide(x, y):
                if x == y:
                    return True
                if not anillo or len(x) != len(y):
                    return False
                return any(y[i:] + y[:i] == x for i in range(len(y)))

            mismo = (len(com_ord) < 2 or coincide(com_ord, en_b)
                     or coincide(com_ord, en_b[::-1]))
            fronteras.append({
                "id": f"pol__{a}__{b}",
                "tipo": "poligonal",
                "latitud": None,
                "latitud_dms": None,
                "puntos": [{"lat": la, "lon": lo, "lat_dms": dms(la, "lat"),
                            "lon_dms": dms(lo, "lon")} for lo, la in com],
                "lado_a": a,
                "lado_b": b,
                "citas": {a: idx[a].get("cita_rol_decreto"),
                          b: idx[b].get("cita_rol_decreto")},
                "secuencia_coincide": mismo,
            })
            if not mismo:
                incidencias.append(
                    f"{idx[a]['nombre']} y {idx[b]['nombre']} comparten {len(com)} "
                    f"vertices pero no en la misma secuencia: no estan describiendo "
                    f"el mismo trazo")
    return fronteras, incidencias


# ── puntos representativos, sobre agua ───────────────────────────────────────

def _km(a_lat, a_lon, b_lat, b_lon):
    k = math.cos(math.radians((a_lat + b_lat) / 2))
    return math.hypot((a_lon - b_lon) * k, a_lat - b_lat) * 111.19


def testigos_maritimos(caps, bahias):
    """Asigna a cada Capitania su bahia SITPORT testigo, o ninguna.

    Criterio: la bahia b es testigo de la Capitania C si la sede de C es la sede
    MAS CERCANA a b de todas las sedes. Entre las que le corresponden, se toma la
    mas proxima a la sede. Una Capitania a la que ninguna bahia elige queda sin
    testigo y se declara: no se le presta el de la vecina.

    Es simetrico y determinista: nadie le roba el testigo a nadie, y no depende
    del orden en que se recorran las jurisdicciones.

    AVISO SOBRE INV-3.3: esto NO resuelve jurisdiccion por proximidad, que es
    justamente lo que ese invariante prohibe. Es la eleccion de un punto de
    prueba. Lo que decide si el testigo pertenece a la jurisdiccion es la
    contencion en el poligono del decreto — y comprobarla es el objetivo del
    control, no su supuesto. Si el testigo cae fuera, eso es el hallazgo.
    """
    sedes = [(c["id"], c["punto_interior"]) for c in caps
             if c.get("punto_interior") and c["ambito"] == "maritima"]
    if not sedes:
        return {}
    asignadas = defaultdict(list)
    for b in bahias:
        cid, sede = min(sedes, key=lambda s: _km(b["lat"], b["lon"],
                                                 s[1]["lat"], s[1]["lon"]))
        asignadas[cid].append((b, _km(b["lat"], b["lon"], sede["lat"], sede["lon"])))

    out = {}
    for cid, cands in asignadas.items():
        b, km = min(cands, key=lambda x: x[1])
        out[cid] = {
            "lat": b["lat"], "lon": b["lon"],
            "fuente": f"bahia SITPORT {b['id']} — {b['nombre']}",
            "distancia_km_a_la_sede": round(km, 1),
            "bahias_que_eligen_esta_sede": len(cands),
            "origen": (f"CONVENCION nuestra, no decreto: de las bahias SITPORT cuya "
                       f"sede de Capitania mas cercana es esta, la mas proxima "
                       f"({km:.1f} km). Punto sobre agua, que es lo que la geometria "
                       f"final tiene que poder contener. La eleccion NO usa la franja "
                       f"del decreto ni el poligono: si lo hiciera, el testigo se "
                       f"confirmaria solo y el control no podria fallar nunca."),
        }
    return out


def punto_maritimo(cap, testigos):
    t = testigos.get(cap["id"])
    if t:
        return t, None
    if not cap.get("punto_interior"):
        return None, "sin sede de Capitania con que elegir un testigo"
    return None, ("ninguna bahia SITPORT tiene a esta Capitania como su sede mas "
                  "cercana: no hay punto sobre agua con que probar su geometria")


def punto_de_geometria(geom, que):
    if geom is None or geom.is_empty:
        return None, f"sin {que} con que derivar un punto"
    p = geom.representative_point()
    return {"lat": p.y, "lon": p.x, "fuente": que,
            "origen": (f"CONVENCION nuestra, no decreto: punto sobre la superficie "
                       f"de {que}. Cae sobre agua por definicion.")}, None


def main():
    v1 = json.load(open(V1, encoding="utf-8"))
    lac = json.load(open(LACUSTRE, encoding="utf-8"))
    caps = v1["capitanias"]
    cuerpos_lac = {j["id"]: j.get("cuerpos", []) for j in lac["jurisdicciones"]}
    bahias = leer_bahias()
    testigos = testigos_maritimos(caps, bahias)
    gdf = gpd.read_file(SHP_LAGOS).to_crs(epsg=4326)

    print("FASE 4 — MIGRACION DEL INSUMO v1 -> v2")
    print(f"  entrada : {os.path.relpath(V1, REPO)}  sha256[:16] {sha(V1)[:16]}")
    print(f"  lacustre: {os.path.relpath(LACUSTRE, REPO)}  sha256[:16] {sha(LACUSTRE)[:16]}")
    print(f"  bahias  : {len(bahias)} puntos SITPORT desde "
          f"{os.path.relpath(SEED_BAHIAS, REPO)}")
    print()

    corpus = {c["id"]: c["texto_decreto"] for c in caps}
    fundidos = {c["id"]: contorno_unificado(c, corpus) for c in caps}
    contornos = {k: v[0] for k, v in fundidos.items()}
    cerrados = {k: v[1] for k, v in fundidos.items()}
    sueltos_de = {k: v[2] for k, v in fundidos.items()}

    # Las fronteras se derivan con TODOS los puntos, porque son ellas las que
    # deciden despues que respaldo ajeno vale. Derivar con los puntos ya filtrados
    # seria circular.
    fronteras, incidencias = derivar_fronteras(caps, contornos, cerrados)

    # Un punto respaldado solo por el parrafo de otra jurisdiccion vale si las dos
    # comparten esa frontera: el decreto describe una misma linea desde los dos
    # lados y no siempre repite las coordenadas en ambos parrafos. Si el parrafo
    # ajeno no es de una vecina con frontera compartida, el punto no es de esta
    # jurisdiccion y no se usa.
    vecinas = defaultdict(set)
    for f in fronteras:
        if f["tipo"] != "poligonal":
            continue
        vecinas[f["lado_a"]].add(f["lado_b"])
        vecinas[f["lado_b"]].add(f["lado_a"])

    descartados = []
    for cap in caps:
        for p in contornos[cap["id"]]:
            if p["respaldo"] in ("propio", "correccion"):
                p["usable"] = True
            elif p["respaldo"] == "ajeno":
                comparte = sorted(set(p["respaldo_en"]) & vecinas[cap["id"]])
                p["usable"] = bool(comparte)
                p["respaldo_en"] = comparte or p["respaldo_en"]
            else:
                p["usable"] = False
            if not p["usable"]:
                descartados.append((cap["nombre"], p))

    estados = {}
    juris, sin_punto = [], []

    for cap in caps:
        cid = cap["id"]
        cont = contornos[cid]
        receta, estado, causa = declarar_estado(cap, cont, cerrados[cid],
                                                cuerpos_lac.get(cid, []))
        estados[cid] = estado

        pr, motivo = None, None
        if estado == "cerrable":
            if cap["ambito"] == "lacustre":
                partes = []
                for c in cuerpos_lac.get(cid, []):
                    for fid in (c.get("shapefile_fid") or []):
                        g = gdf.geometry.iloc[fid]
                        partes.append(g if g.is_valid else make_valid(g))
                pr, motivo = punto_de_geometria(
                    unary_union(partes) if partes else None,
                    "los cuerpos de agua adjudicados en Fase 2")
            elif cap["ambito"] == "antartica":
                pts = puntos_utiles(cont)
                poly = Polygon(pts) if len(pts) >= 3 else None
                if poly is not None and not poly.is_valid:
                    poly = make_valid(poly)
                pr, motivo = punto_de_geometria(poly, "el anillo que describe el decreto")
            else:
                pr, motivo = punto_maritimo(cap, testigos)
            if pr is None:
                sin_punto.append((cap["nombre"], motivo))

        juris.append({
            "id": cid,
            "nombre": cap["nombre"],
            "gobernacion": cap["gobernacion"],
            "ambito": cap["ambito"],
            "participa_matching": estado == "cerrable",
            "receta": receta,
            "estado_geometria": estado,
            "causa_sin_geometria": causa,
            "contorno_cerrado": cerrados[cid],
            "lado_abierto": lado_abierto(cap),
            "sigue_litoral": sigue_litoral(cap),
            "limite_norte": {"dms": cap.get("limite_norte_dms"),
                             "dec": cap.get("limite_norte_dec"),
                             "tipo": cap.get("limite_norte_tipo")},
            "limite_sur": {"dms": cap.get("limite_sur_dms"),
                           "dec": cap.get("limite_sur_dec"),
                           "tipo": cap.get("limite_sur_tipo")},
            "contorno": cont,
            "tramos": marcar_tramos(cap, cont, cerrados[cid], lado_abierto(cap),
                                    corpus),
            "puntos_no_incorporados": sueltos_de[cid] or None,
            "fronteras": [],
            "ancla_seleccion": (dict(cap["punto_interior"])
                                if cap.get("punto_interior") else None),
            "punto_representativo": pr,
            "causa_sin_punto_representativo": motivo,
            "cuerpos_lacustres": cuerpos_lac.get(cid) or None,
            "sectores": [],
            "texto_decreto": cap["texto_decreto"],
            "correccion_aplicada": cap.get("correccion_aplicada"),
            "nota_fuente": cap.get("revisar") or cap.get("nota"),
            "cierre_v1": cap.get("cierre"),
        })

    por_jur = defaultdict(list)
    for f in fronteras:
        for k in ("lado_norte", "lado_sur", "lado_a", "lado_b"):
            if f.get(k):
                por_jur[f[k]].append(f["id"])
    for j in juris:
        j["fronteras"] = sorted(set(por_jur.get(j["id"], [])))

    salida = {
        "version": 2,
        "fuente": v1["fuente"],
        "generado": "2026-08-09",
        "generado_por": "scripts/fase4_migrar_insumo_v2.py",
        "derivado_de": {
            "jurisdicciones_capitanias.json": sha(V1),
            "cotejo_lacustre_adjudicado.json": sha(LACUSTRE),
            "seed-bahias-sitport.js": sha(SEED_BAHIAS),
        },
        "nota_construccion": v1.get("nota_construccion"),
        "convenciones": [
            "El lado de una poligonal lo decide 'ancla_seleccion' (la sede de la "
            "Capitania), no una letra cardinal. La jurisdiccion es el trozo que "
            "contiene esa ancla.",
            "Cada tramo del contorno lleva su tipo — litoral, frontera o abierto — "
            "transcrito del parrafo que lo describe, con el fragmento literal que lo "
            "respalda. Solo los tramos 'litoral' ensanchan hacia tierra. Un tramo "
            "'abierto' sale a mar afuera y no tiene tierra que capturar.",
            "Donde el decreto describe un tramo del limite como 'el litoral' "
            "(sigue_litoral: true), el contorno NO se cierra con la recta entre los "
            "dos extremos: se cierra generosamente hacia tierra y la tierra se resta "
            "despues. La recta corta por dentro de la costa y dejaria fuera superficie "
            "decretada. Queda 'de mas, nunca de menos' (INV-3.4). Convencion "
            "autorizada por el owner el 2026-08-09.",
            "'punto_representativo' es el testigo sobre agua que la geometria final "
            "debe contener. Su eleccion es nuestra; su ubicacion sale de una fuente "
            "real (bahias SITPORT, cuerpos lacustres adjudicados, anillo del decreto).",
            "Un punto del contorno con 'respaldo_textual: false' no aparece en el "
            "texto del decreto de su jurisdiccion y NO se usa para construir.",
            "La separacion lateral entre Capitanias en la franja oceanica, el limite "
            "exterior de 200 mn y el cierre generoso hacia tierra con resta posterior "
            "de la capa de tierra siguen siendo convencion nuestra, como en v1.",
        ],
        "puntos_notables": v1.get("puntos_notables"),
        "fronteras": fronteras,
        "jurisdicciones": juris,
    }
    with open(V2, "w", encoding="utf-8") as fh:
        json.dump(salida, fh, ensure_ascii=False, indent=1, sort_keys=False)

    # ── que hizo la migracion ────────────────────────────────────────────────
    print(f"jurisdicciones : {len(juris)}")
    print(f"fronteras      : {len(fronteras)}  "
          f"({sum(1 for f in fronteras if f['tipo'] == 'paralelo')} por paralelo, "
          f"{sum(1 for f in fronteras if f['tipo'] == 'poligonal')} poligonales)")
    print(f"salida         : {os.path.relpath(V2, REPO)}  sha256[:16] {sha(V2)[:16]}")
    print()

    print("ESTADO DE GEOMETRIA, AHORA DECLARADO EN EL DATO")
    for est in ("cerrable", "no_cerrable"):
        n = [j for j in juris if j["estado_geometria"] == est]
        print(f"  {est:<12} {len(n)}")
        if est == "no_cerrable":
            for j in n:
                print(f"      {j['nombre']:<22} {j['causa_sin_geometria']}")
    print()

    print("RESPALDO TEXTUAL DE LOS PUNTOS DEL CONTORNO")
    niveles = defaultdict(int)
    for j in juris:
        for p in j["contorno"]:
            niveles[p["respaldo"]] += 1
    for k in ("propio", "correccion", "ajeno", "ninguno"):
        print(f"  {k:<12} {niveles[k]}")
    print()
    print("  Puntos DESCARTADOS: el decreto no los nombra en el parrafo de esta")
    print("  jurisdiccion ni en el de una vecina con la que comparta frontera.")
    if descartados:
        for nombre, p in descartados:
            print(f"    {nombre:<22} {p['lat_dms']} / {p['lon_dms']}  "
                  f"'{p['nombre']}'  respaldo={p['respaldo']} "
                  f"({p['respaldo_en']})  venia de {p['procedencia']}")
        print("  Quedan en el dato, marcados 'usable: false'. No se usan para construir.")
    else:
        print("    ninguno")
    print()

    print("PUNTOS QUE EL DECRETO NOMBRA Y EL RECORRIDO TRANSCRITO NO INCLUYE")
    print("  El recorrido es 'poligonal_completa'. Estos estaban solo en la lista")
    print("  suelta de v1. Meterlos en el trazo exige decidir por donde pasa, y eso")
    print("  es del owner: quedan aparte, no se pierden y no se inventan.")
    hay = False
    for j in juris:
        for p in (j["puntos_no_incorporados"] or []):
            hay = True
            print(f"    {j['nombre']:<22} {p['lat_dms']} / {p['lon_dms']}  "
                  f"'{p['nombre']}'  respaldo={p['respaldo']}")
    if not hay:
        print("    ninguno")
    print()

    print("PUNTO REPRESENTATIVO SOBRE AGUA")
    con = [j for j in juris if j["punto_representativo"]]
    print(f"  resueltos {len(con)} de {sum(1 for j in juris if j['estado_geometria'] == 'cerrable')} "
          f"cerrables")
    for j in juris:
        if j["estado_geometria"] != "cerrable":
            continue
        pr = j["punto_representativo"]
        if pr:
            print(f"  ok   {j['nombre']:<22} ({pr['lat']:.4f}, {pr['lon']:.4f})  "
                  f"{pr['fuente']}")
        else:
            print(f"  --   {j['nombre']:<22} {j['causa_sin_punto_representativo']}")
    print()

    print("TIPO DE TRAMO, TRANSCRITO DEL PARRAFO DE CADA JURISDICCION")
    cnt = defaultdict(int)
    for j in juris:
        for t in (j["tramos"] or []):
            cnt[t["tipo"]] += 1
    print(f"  total de tramos marcados: {sum(cnt.values())}")
    for k in ("litoral", "frontera", "abierto", "indeterminado"):
        print(f"    {k:<15} {cnt[k]}")
    print()
    for j in juris:
        lits = [t for t in (j["tramos"] or []) if t["tipo"] == "litoral"]
        for t in lits:
            print(f"  LITORAL  {j['nombre']:<22} "
                  f"{t['desde']['nombre'] or ''} -> {t['hasta']['nombre'] or ''}")
            print(f"           \"{(t['fragmento_decreto'] or '')[:96]}\"")
    ind = [(j["nombre"], t) for j in juris for t in (j["tramos"] or [])
           if t["tipo"] == "indeterminado"]
    if ind:
        print()
        print("  INDETERMINADOS (no se localizaron sus extremos en el texto):")
        for n, t in ind:
            print(f"    {n:<22} ({t['desde']['lat']}, {t['desde']['lon']}) -> "
                  f"({t['hasta']['lat']}, {t['hasta']['lon']})")
    print()

    print("INCIDENCIAS DETECTADAS AL DERIVAR FRONTERAS")
    if incidencias:
        for i in incidencias:
            print(f"  {i}")
    else:
        print("  ninguna")
    print()
    print("La migracion no adjudica nada de lo que quedo abierto en la Etapa A.")
    print("Reorganiza el dato; lo que exige decidir que dice el decreto sigue abierto.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Alto as e:
        print(f"\nMIGRACION DETENIDA: {e}", file=sys.stderr)
        sys.exit(2)
