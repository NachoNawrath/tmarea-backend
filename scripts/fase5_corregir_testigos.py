"""
FASE 5 — ETAPA 1. CORRECCION DE LOS TESTIGOS: correrlos al agua mas cercana.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\fase5_corregir_testigos.py --medir
    ...                                                                        --aplicar

  --medir     mide y reporta la distribucion. NO escribe. Es el modo con que se
              eligio el umbral, y sirve para volver a mirarlo si la costa cambia.
  --aplicar   escribe la correccion en el insumo versionado.

POR QUE SE CORRIGE
  El propio insumo declara que el punto representativo es "el testigo SOBRE AGUA que
  la geometria final tiene que poder contener" y que "su eleccion es nuestra". Medido
  contra la capa de costa: 35 de 43 testigos maritimos caen en TIERRA, con mediana de
  28 m tierra adentro. Son puntos de muelle o de sede que SITPORT puso del lado de la
  tierra. O sea: el dato no cumple la definicion que el insumo da de el. Corregirlo
  cae dentro de lo que ya esta declarado como convencion nuestra.

  Lo que NO se toca es el criterio: la figura tiene que contener su testigo. Aflojar
  el criterio a "contiene o pasa a menos de N metros" seguiria llamando "testigo
  sobre agua" a un punto en tierra. Se arregla el dato, no la vara.

COMO ESTA PENSADO

  REPRODUCIBLE      La correccion es una funcion del punto ORIGINAL y de la capa de
  E IDEMPOTENTE     costa, y el original queda guardado en el insumo. Correr esto dos
                    veces da el mismo resultado, y correrlo despues de cambiar la
                    costa recalcula todo desde los originales — nunca desde un punto
                    ya movido, que acumularia desplazamiento sobre desplazamiento.

  FALLA RUIDOSO     Si un punto no se puede resolver, o el resultado cae en tierra, o
                    la capa de costa no es la que el manifiesto declara, se detiene.
                    Ningun testigo se deja "aproximadamente bien".

  AUTOVERIFICADO    Despues de mover, cada punto se vuelve a preguntar a la base: no
                    tiene que intersecar la tierra, y su desplazamiento tiene que ser
                    el medido. La verificacion no confia en el calculo que la produjo.

  SIN CASOS         Ninguna jurisdiccion se nombra aca. La que no se corrige lo
  PARTICULARES      declara en el dato, en punto_representativo.correccion_al_agua,
                    con su motivo; el codigo lee esa declaracion y la reporta. El
                    ambito decide quien entra. Si el campo esta pero mal formado, se
                    detiene: una exclusion sin motivo no es una exclusion.

QUE ES "AGUA"
  El complemento de la capa declarada en roles.tierra del manifiesto. Que eso sea MAR
  y no un lago lo garantiza el control A7 del cargador, que comprueba que los cuerpos
  lacustres adjudicados caen DENTRO de la capa de tierra. Sin ese control, correr un
  testigo podria meterlo en agua dulce sin salida al mar y el testigo pasaria el
  control de contencion siendo un punto al que no se llega navegando.

COMO SE ENCUENTRA EL AGUA MAS CERCANA
  No por la orilla del poligono que contiene al punto: la variante 'split' de la capa
  parte la costa en una grilla, y el borde mas cercano de UNA pieza puede ser una
  costura que tiene tierra al otro lado. Se unen antes todas las piezas de tierra del
  entorno — con ST_UnaryUnion, porque la capa se pisa a si misma y ST_Collect daria
  un MultiPolygon invalido — y se construye el AGUA del entorno como la diferencia.
  Sobre esa agua, erosionada por el margen de seguridad, se pide el punto mas
  cercano. Asi el resultado es agua de verdad y no un punto sobre la linea de costa,
  que pertenece a los dos lados.
"""

import argparse
import hashlib
import io
import json
import math
import os
import statistics
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import psycopg2

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFIESTO = os.path.join(REPO, "geodata", "costa", "capas_costa.json")
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
ENV = os.path.join(REPO, ".env")

# ── Convenciones de esta correccion. Ninguna es un caso particular ────────────

# Los ambitos cuyos testigos se corren contra la capa de costa. Es el mismo criterio
# con que la construccion resta tierra: correr un testigo lacustre contra la costa
# del mar lo mandaria al oceano.
AMBITOS = {"maritima"}

# UMBRAL. Cuanto se admite mover un testigo antes de que deje de ser el mismo punto y
# pase a ser un dato inventado. Uno solo para todos: la fuente escribe TODOS sus
# puntos con la misma precision, asi que no hay con que justificar un umbral distinto
# por punto — ver el punto (3) de UMBRAL_JUSTIFICACION, que deja registrada la regla
# por precision que se intento y la medicion que la descarto. La justificacion medida
# completa esta al pie de este archivo y se persiste en el insumo.
UMBRAL_M = 500.0

# MARGEN DE IDENTIDAD. Un punto movido no puede acercarse a la jurisdiccion vecina:
# se exige que la distancia al testigo mas cercano de OTRA jurisdiccion sea al menos
# este multiplo del desplazamiento que se le aplico. No es un aviso: si no se cumple,
# la corrida se detiene. Se mide sobre el desplazamiento REAL y no sobre el umbral,
# porque lo que puede arruinar a un testigo es lo que efectivamente se lo movio.
MARGEN_IDENTIDAD = 10.0

# MARGEN DE SEGURIDAD. Cuanto se mete el punto corregido dentro del agua, en vez de
# dejarlo sobre la linea de costa. Un punto exactamente sobre la orilla pertenece a
# los dos lados: ST_Intersects contra la tierra da verdadero y el control de
# contencion quedaria decidido por el redondeo. 1 metro esta tres ordenes de magnitud
# por encima de la precision con que la construccion reduce coordenadas (1e-8 grados,
# ~1 mm) y dos por debajo de la mediana del desplazamiento, asi que no mueve la
# distribucion ni empuja a nadie por encima del umbral.
MARGEN_AGUA_M = 1.0

# Radios de busqueda, en metros. Se prueban en orden y se usa el primero que resuelve
# con holgura. Empezar chico no es una optimizacion: unir la tierra de un radio de 50
# km alrededor de un punto de los canales son cientos de miles de vertices, y hacerlo
# cuando alcanzaba con 2 km es pedirle al calculo un error de redondeo que no hacia
# falta. El ultimo radio esta muy por encima del umbral a proposito: lo que importa de
# un punto que no se puede corregir es MEDIR cuanto le faltaba, para poder declararlo.
RADIOS_M = (2_000.0, 10_000.0, 50_000.0, 200_000.0)

UMBRAL_JUSTIFICACION = """\
UMBRAL DE CORRECCION DE TESTIGOS. CONVENCION NUESTRA, no decreto.

  umbral = 500 m, uno solo para todos los puntos.

QUE TIENE QUE CUMPLIR UN UMBRAL ACA. Dos cosas, y las dos se miden:
  (1) alcanzar para arreglar el dato en el caso normal — si dejara afuera a la
      mayoria seria una excusa, no una correccion;
  (2) no permitir un desplazamiento que convierta al testigo en el punto de la
      jurisdiccion vecina, porque ahi dejaria de probar nada.
El punto (3) de mas abajo registra una tercera exigencia que se intento imponer y que
la medicion descarto. Queda escrita para que nadie la vuelva a derivar.

(1) LO QUE CUESTA ARREGLAR EL DATO. Distancia al agua de los 35 testigos maritimos
    que caen en tierra, medida contra la capa de costa declarada:
      mediana 28 m   minimo 3 m   maximo 3.380 m
      a menos de   100 m : 25 de 35
      a menos de   250 m : 27 de 35
      a menos de   500 m : 30 de 35
      a menos de 1.000 m : 32 de 35
      a menos de 2.000 m : 34 de 35
    500 m cubre 30 de 35. Es un numero redondo por encima del percentil 85, no el
    maximo observado: poner el umbral en el valor que hace pasar a todos lo
    convertiria en una descripcion de la costa de hoy — al cambiar la capa se moveria
    solo y no podria fallar nunca. Un umbral tiene que poder dejar puntos afuera, y
    este los deja.

(2) LO QUE SE PONE EN RIESGO AL MOVER. Distancia de cada testigo al testigo mas
    cercano de OTRA jurisdiccion:
      minimo 7.654 m (Coronel)   |   mediana 57.920 m
    Contra eso, el desplazamiento mayor que esta correccion aplica es de 500 m. La
    exigencia NO queda como observacion: por cada punto movido se comprueba que la
    distancia al testigo vecino sea al menos 10 veces su desplazamiento, y si no se
    cumple la corrida se DETIENE.

    Segunda medida, del mismo lado: la libertad que la eleccion del testigo YA se
    tomo respecto de la sede de su Capitania, que el propio insumo declara en
    distancia_km_a_la_sede — mediana 1,8 km, maximo 25,2 km. La eleccion del testigo
    ya aceptó apartarse kilometros de la sede; correrlo unos cientos de metros para
    ponerlo sobre agua es chico contra esa libertad ya tomada.

(3) UN UMBRAL POR PRECISION DEL PUNTO: SE INTENTO Y LA MEDICION LO DESCARTO.
    Queda registrado porque la idea es razonable y alguien la va a volver a tener.

    LA IDEA. Un punto escrito '-72.8' no afirma nada mas fino que unos kilometros;
    medirle 1.007 m de desplazamiento y declararlo inservible seria juzgarlo con una
    vara que su fuente nunca pretendio. De ahi: umbral = el mayor entre 500 m y la
    precision del propio punto. Contando decimales sobre el insumo daba 32 puntos con
    4 decimales (±6 m), y once con 3, 2, 1 y hasta 0 decimales — hasta ±55 km. Con esa
    regla, Puerto Chacabuco (lon '-72.8', ±3.904 m) conservaba su testigo.

    POR QUE NO SIRVE. Esa distribucion de precisiones NO EXISTE. Se fue a mirar la
    fuente de los puntos — scripts/seed-bahias-sitport.js, de donde salen las 163
    bahias SITPORT — y las 163 coordenadas estan escritas con CUATRO decimales, todas.
    Bahia Chacabuco es '-45.4667, -72.8000' y Bahia Moreno es '-23.6500, -70.4000'.
    Los decimales que faltaban se perdieron al serializar el JSON: -70.4000 y -70.4
    son el MISMO numero de punto flotante, y al reescribir el archivo los ceros
    finales desaparecen. O sea que lo que se estaba midiendo no era la precision del
    dato sino el formato con que un archivo intermedio quedo escrito.

    LO QUE ESTO SIGNIFICA. La fuente tiene precision UNIFORME de 4 decimales, ±6 m.
    No hay ninguna variacion de precision sobre la que apoyar umbrales distintos, y
    por lo tanto Puerto Chacabuco, a 1.007 m del agua con una coordenada precisa a
    ±6 m, no tiene excusa de coordenada gruesa: describe otra cosa. Se declara.

    LA LECCION, que es la general. El argumento se apoyaba en una medicion, y la
    medicion no medía lo que el argumento decia. Antes de darla por buena hubo que ir
    a la fuente del dato, no al archivo derivado que se tenia a mano.

QUE PASA CON LOS QUE QUEDAN AFUERA. No se mueven. Se declaran sin testigo, con su
causa y con la distancia medida, igual que INV-3.6 exige declarar una geometria nula.
El punto original queda guardado en punto_representativo_descartado: la carencia se
declara, no se esconde, y la evidencia de cual era el punto no se borra."""


class Alto(SystemExit):
    def __init__(self, msg):
        super().__init__(f"\nALTO: {msg}\n")


# ── utilidades ────────────────────────────────────────────────────────────────

def sha256(ruta):
    h = hashlib.sha256()
    with open(ruta, "rb") as fh:
        for b in iter(lambda: fh.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()


def leer_env():
    if not os.path.exists(ENV):
        raise Alto(f"no existe {ENV}")
    cfg = {}
    for linea in open(ENV, encoding="utf-8-sig"):
        if "=" in linea and not linea.strip().startswith("#"):
            k, v = linea.split("=", 1)
            cfg[k.strip()] = v.strip()
    return cfg


def capa_tierra(man):
    r = (man.get("roles") or {}).get("tierra") or {}
    porid = {c["id"]: c for c in man["capas"]}
    if r.get("capa") not in porid:
        raise Alto("el manifiesto no declara una capa valida en roles.tierra")
    c = porid[r["capa"]]
    t = c.get("tabla_subdividida") or c.get("tabla")
    if not t or not t.replace("_", "").isalnum():
        raise Alto(f"la capa '{c['id']}' no declara una tabla de trabajo usable")
    return c, t


def exigir_capa_cargada(cur, capa, tabla):
    """La correccion se apoya en la capa cargada. Si la cargada no es la que el
    manifiesto declara, o no paso sus controles, no se corrige nada: el resultado
    seria un desplazamiento medido contra otra costa."""
    base = capa["tabla"]
    cur.execute("SELECT to_regclass(%s), to_regclass(%s), to_regclass(%s)",
                (base, tabla, f"{base}_verificacion"))
    a, b, c = cur.fetchone()
    if not (a and b and c):
        raise Alto(f"falta {base} / {tabla} / {base}_verificacion en la base. "
                   f"Corre antes scripts/fase5_cargar_costa.py")
    cur.execute(f"SELECT control FROM {base}_verificacion WHERE NOT ok")
    malos = [x[0] for x in cur.fetchall()]
    if malos:
        raise Alto(f"la capa de costa cargada tiene controles en falla: {malos}")
    cur.execute(f"SELECT valor FROM {base}_procedencia WHERE clave = 'sha256'")
    fila = cur.fetchone()
    if not fila or fila[0] != capa["sha256"]:
        raise Alto(f"la capa cargada declara sha256 {fila and fila[0]} y el "
                   f"manifiesto {capa['sha256']}: se cargo otra costa. Volve a "
                   f"correr el cargador")


# ── el punto de partida, siempre el original ──────────────────────────────────

def origen_del_testigo(j):
    """El punto desde el que se corrige. SIEMPRE el original, nunca uno ya movido:
    de otro modo, correr esto dos veces acumularia desplazamiento. Devuelve
    (dict del punto, de_donde_salio) o (None, motivo)."""
    d = j.get("punto_representativo_descartado")
    if d:
        return d, "descartado en una corrida anterior"
    pr = j.get("punto_representativo")
    if not pr:
        return None, "el insumo no le da testigo"
    corr = pr.get("correccion")
    if corr:
        o = corr.get("original")
        if not o or o.get("lat") is None or o.get("lon") is None:
            raise Alto(f"{j['nombre']}: tiene punto_representativo.correccion sin "
                       f"'original'. No se puede recalcular desde el punto de "
                       f"partida y corregir sobre un punto ya movido acumularia "
                       f"desplazamiento")
        base = dict(pr)
        base.pop("correccion", None)
        base["lat"], base["lon"] = o["lat"], o["lon"]
        return base, "original guardado por una corrida anterior"
    return dict(pr), "el insumo, sin correccion previa"


def exclusion_declarada(j, pr):
    """La jurisdiccion que no se corrige lo declara en el dato. Presente y bien
    formado: se respeta. Presente y mal formado: se detiene. Ausente: se corrige,
    que es la regla."""
    d = pr.get("correccion_al_agua")
    if d is None:
        return None
    if not isinstance(d, dict) or "aplica" not in d or not d.get("motivo"):
        raise Alto(f"{j['nombre']}: punto_representativo.correccion_al_agua tiene "
                   f"que traer 'aplica' y 'motivo'. Una exclusion sin motivo no es "
                   f"una exclusion, es un caso particular escondido en el dato")
    return None if d["aplica"] else d


# ── medicion contra la capa ───────────────────────────────────────────────────

def en_tierra(cur, tabla, lat, lon):
    cur.execute(f"SELECT EXISTS (SELECT 1 FROM {tabla} WHERE ST_Intersects(geom, "
                f"ST_SetSRID(ST_MakePoint(%s,%s),4326)))", (lon, lat))
    return cur.fetchone()[0]


def agua_mas_cercana(cur, tabla, lat, lon):
    """(lat, lon, metros) del punto de agua mas cercano, o (None,None,cota) si ni el
    radio mas grande alcanza. Nunca devuelve un punto sin haber comprobado que la
    respuesta cabe holgada dentro del radio con que se calculo: si el resultado
    quedara pegado al borde del radio, el agua de verdad podria estar mas cerca
    afuera de lo que se mirO."""
    for radio in RADIOS_M:
        cur.execute(
            f"""
            WITH p AS (SELECT ST_SetSRID(ST_MakePoint(%(lon)s,%(lat)s),4326) g),
            tierra AS (SELECT ST_UnaryUnion(ST_Collect(t.geom)) g
                       FROM {tabla} t, p
                       -- El prefiltro por envolvente NO es una optimizacion
                       -- prescindible: ST_DWithin sobre ::geography no puede usar el
                       -- indice GIST, que esta construido sobre la geometria, y sin
                       -- el se barren las 130.537 piezas de costa por cada punto
                       -- (medido: 40 s contra 0,02 s, mismo resultado). El grado de
                       -- latitud es el mas largo, asi que expandir por r/111320 en
                       -- los dos ejes sobra por el lado de la longitud: filtra de
                       -- mas, nunca de menos. ST_DWithin queda como refinamiento
                       -- exacto.
                       WHERE t.geom && ST_Expand(p.g, %(rdeg)s)
                         AND ST_DWithin(t.geom::geography, p.g::geography, %(r)s)),
            agua AS (SELECT ST_Difference(
                       ST_Buffer(p.g::geography, %(r)s)::geometry,
                       COALESCE(tierra.g, ST_GeomFromText('POLYGON EMPTY',4326))) g
                     FROM p, tierra),
            seguro AS (SELECT CASE WHEN tierra.g IS NULL THEN agua.g
                         ELSE ST_Difference(agua.g,
                              ST_Buffer(tierra.g::geography, %(margen)s)::geometry)
                       END g FROM agua, tierra)
            SELECT ST_Y(c.g), ST_X(c.g), ST_Distance(p.g::geography, c.g::geography)
            FROM p, (SELECT ST_ClosestPoint(seguro.g, p.g) g FROM seguro, p) c
            WHERE NOT ST_IsEmpty(c.g)
            """,
            {"lat": lat, "lon": lon, "r": radio, "rdeg": radio / 111320.0,
             "margen": MARGEN_AGUA_M})
        fila = cur.fetchone()
        # Holgura: la respuesta tiene que estar bien adentro del radio mirado. Se
        # exige la mitad; con eso, cualquier agua mas cercana que la hallada habria
        # estado dentro del recorte y la habriamos visto.
        if fila and fila[2] is not None and fila[2] <= radio / 2:
            return fila[0], fila[1], fila[2]
    return None, None, RADIOS_M[-1]


def metros(cur, a, b):
    cur.execute("SELECT ST_Distance(ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography,"
                "ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography)",
                (a[1], a[0], b[1], b[0]))
    return cur.fetchone()[0]


# ── el trabajo ────────────────────────────────────────────────────────────────

def evaluar(cur, tabla, v2):
    """Mide todos los testigos del ambito. No escribe nada. Devuelve una fila por
    jurisdiccion con lo que le corresponde y por que."""
    filas = []
    for j in v2["jurisdicciones"]:
        if j["ambito"] not in AMBITOS:
            continue
        pr, de_donde = origen_del_testigo(j)
        base = {"id": j["id"], "nombre": j["nombre"],
                "cerrable": j["estado_geometria"] == "cerrable"}
        if pr is None:
            # Una no_cerrable sin testigo no es una carencia: no va a tener figura
            # que contener nada. Una cerrable sin testigo si, y su causa la audita B5.
            filas.append(dict(base, caso="sin_testigo",
                              motivo=j.get("causa_sin_punto_representativo")
                              or de_donde))
            continue
        lat, lon = pr["lat"], pr["lon"]
        base.update(lat=lat, lon=lon, pr=pr, de_donde=de_donde)
        excl = exclusion_declarada(j, j.get("punto_representativo") or pr)
        sobre_tierra = en_tierra(cur, tabla, lat, lon)
        if excl:
            nlat, nlon, d = ((None, None, 0.0) if not sobre_tierra
                             else agua_mas_cercana(cur, tabla, lat, lon))
            filas.append(dict(base, caso="excluido", en_tierra=sobre_tierra,
                              dist_m=d, motivo=excl["motivo"],
                              declarado_por=excl.get("declarado_por")))
            continue
        if not sobre_tierra:
            filas.append(dict(base, caso="ya_en_agua", dist_m=0.0))
            continue
        nlat, nlon, d = agua_mas_cercana(cur, tabla, lat, lon)
        if nlat is None:
            filas.append(dict(base, caso="irresoluble", dist_m=None, cota_m=d))
            continue
        filas.append(dict(base, caso="corregible" if d <= UMBRAL_M else "pasa_umbral",
                          nlat=nlat, nlon=nlon, dist_m=d))
    return filas


def riesgo_de_identidad(cur, filas):
    """Insumo (2) de la justificacion del umbral: la distancia de cada testigo al
    testigo mas cercano de OTRA jurisdiccion. Mide cuanto margen hay antes de que
    mover un punto lo confunda con el de la vecina. Deja el valor en cada fila."""
    pts = [f for f in filas if f.get("lat") is not None]
    if len(pts) < 2:
        return {}
    for i, f in enumerate(pts):
        f["vecino_m"], f["vecino"] = min(
            (metros(cur, (f["lat"], f["lon"]), (g["lat"], g["lon"])), g["nombre"])
            for k, g in enumerate(pts) if k != i)
    ds = sorted((f["vecino_m"], f["nombre"]) for f in pts)
    return {"minimo_m": ds[0][0], "minimo_de": ds[0][1],
            "mediana_m": statistics.median(d for d, _ in ds), "n": len(ds)}


def exigir_margen_de_identidad(filas):
    """No es un aviso. Un punto que al moverse se acerque al testigo vecino mas de lo
    que el margen admite detiene la corrida: seria un testigo que ya no distingue su
    jurisdiccion de la de al lado, que es exactamente lo unico que un testigo hace.
    Se mide sobre el desplazamiento REAL, no sobre el umbral que se le permitia."""
    malos = []
    for f in filas:
        if f["caso"] != "corregible" or not f.get("dist_m"):
            continue
        if f.get("vecino_m") is None:
            raise Alto(f"{f['nombre']}: no se pudo medir la distancia al testigo "
                       f"vecino, y sin eso no se puede garantizar que moverlo no lo "
                       f"confunda con el de al lado")
        if f["vecino_m"] < MARGEN_IDENTIDAD * f["dist_m"]:
            malos.append(f"{f['nombre']}: se moveria {f['dist_m']:.0f} m y su "
                         f"testigo vecino ({f['vecino']}) esta a {f['vecino_m']:.0f} "
                         f"m — hacen falta {MARGEN_IDENTIDAD:.0f}x, o sea "
                         f"{MARGEN_IDENTIDAD * f['dist_m']:.0f} m")
    if malos:
        raise Alto("el margen de identidad no se cumple y la correccion NO se "
                   "aplica:\n  " + "\n  ".join(malos))


def informe(cur, filas, v2):
    por = {}
    for f in filas:
        por.setdefault(f["caso"], []).append(f)
    print("")
    print("=" * 78)
    print("DISTRIBUCION MEDIDA")
    print("=" * 78)
    print(f"  testigos del ambito {sorted(AMBITOS)} : {len(filas)}")
    for caso in ("ya_en_agua", "corregible", "pasa_umbral", "irresoluble",
                 "excluido", "sin_testigo"):
        print(f"    {caso:<14} {len(por.get(caso, []))}")
    ds = sorted(f["dist_m"] for f in filas
                if f.get("dist_m") is not None and f["dist_m"] > 0)
    if ds:
        print("")
        print(f"  desplazamiento al agua, de los {len(ds)} que caen en tierra:")
        print(f"    mediana {statistics.median(ds):.0f} m   minimo {ds[0]:.0f} m   "
              f"maximo {ds[-1]:.0f} m")
        for c in (100, 250, 500, 1000, 2000):
            print(f"    a menos de {c:>5} m : {sum(1 for d in ds if d <= c)} de "
                  f"{len(ds)}")
    r = riesgo_de_identidad(cur, filas)
    if r:
        print("")
        print("  riesgo de identidad — distancia al testigo de OTRA jurisdiccion:")
        print(f"    minimo {r['minimo_m']:.0f} m ({r['minimo_de']})   "
              f"mediana {r['mediana_m']:.0f} m")
        peor = max((f for f in filas if f["caso"] == "corregible"),
                   key=lambda f: f["dist_m"] / (f.get("vecino_m") or 1), default=None)
        if peor:
            print(f"    el caso mas apretado de los que se mueven: {peor['nombre']} "
                  f"se mueve {peor['dist_m']:.0f} m con el vecino a "
                  f"{peor['vecino_m']:.0f} m = "
                  f"{peor['vecino_m'] / peor['dist_m']:.0f}x "
                  f"(hacen falta {MARGEN_IDENTIDAD:.0f}x)")
    sedes = sorted(x for x in ((j.get("punto_representativo") or {})
                               .get("distancia_km_a_la_sede")
                               for j in v2["jurisdicciones"]) if x is not None)
    if sedes:
        print("")
        print("  libertad que la eleccion del testigo YA se tomo respecto de la sede:")
        print(f"    mediana {statistics.median(sedes):.1f} km   "
              f"maximo {sedes[-1]:.1f} km")
    print("")
    print(f"  UMBRAL: {UMBRAL_M:.0f} m, uno solo para todos")
    print(f"  MARGEN DENTRO DEL AGUA: {MARGEN_AGUA_M:.0f} m   "
          f"MARGEN DE IDENTIDAD: {MARGEN_IDENTIDAD:.0f}x")
    print("")
    print("=" * 78)
    print("TESTIGO POR TESTIGO")
    print("=" * 78)
    for f in sorted(filas, key=lambda x: (x["caso"], -(x.get("dist_m") or 0))):
        if f["caso"] == "corregible":
            print(f"  mueve  {f['nombre']:<24} {f['dist_m']:>8.1f} m   "
                  f"({f['lat']:.5f},{f['lon']:.5f}) -> "
                  f"({f['nlat']:.5f},{f['nlon']:.5f})")
        elif f["caso"] == "ya_en_agua":
            print(f"  queda  {f['nombre']:<24} {'0':>8} m   ya estaba sobre agua")
        elif f["caso"] == "pasa_umbral":
            print(f"  DECL   {f['nombre']:<24} {f['dist_m']:>8.1f} m   pasa el "
                  f"umbral de {UMBRAL_M:.0f} m: no se mueve, se declara")
        elif f["caso"] == "irresoluble":
            print(f"  DECL   {f['nombre']:<24} {'>' + str(int(f['cota_m'])):>8} m   "
                  f"no se hallo agua dentro del radio maximo")
        elif f["caso"] == "excluido":
            d = f.get("dist_m")
            print(f"  DECL   {f['nombre']:<24} "
                  f"{(f'{d:.0f}' if d else '0'):>8} m   excluido POR DECLARACION en "
                  f"el dato ({f.get('declarado_por') or 'sin autor'})")
            print(f"         {f['motivo']}")
        else:
            print(f"  s/t    {f['nombre']:<24} {'—':>8}     "
                  f"{'cerrable — ' if f['cerrable'] else 'no cerrable, no va a '
                   'tener figura — '}{f['motivo']}")
    return por


# ── escritura en el insumo ────────────────────────────────────────────────────

def aplicar(cur, tabla, filas, v2, capa):
    idx = {j["id"]: j for j in v2["jurisdicciones"]}
    huella_costa = {"capa": capa["id"], "sha256": capa["sha256"],
                    "tabla": capa["tabla"]}
    conv = {"umbral_m": UMBRAL_M, "margen_agua_m": MARGEN_AGUA_M,
            "margen_identidad": MARGEN_IDENTIDAD, "capa_de_costa": huella_costa,
            "aplicado_por": "scripts/fase5_corregir_testigos.py"}
    movidos = declarados = 0
    for f in filas:
        j = idx[f["id"]]
        if f["caso"] == "sin_testigo":
            continue
        pr = dict(f["pr"])
        pr.pop("correccion", None)
        if f["caso"] in ("corregible", "ya_en_agua"):
            movido = f["caso"] == "corregible"
            nuevo = dict(pr)
            if movido:
                nuevo["lat"], nuevo["lon"] = round(f["nlat"], 7), round(f["nlon"], 7)
            nuevo["correccion"] = dict(
                conv,
                estado="movido_al_agua" if movido else "no_hizo_falta",
                original={"lat": pr["lat"], "lon": pr["lon"]},
                desplazamiento_m=round(f["dist_m"], 1),
                motivo=("el punto original caia en TIERRA segun la capa de costa "
                        "declarada, y el insumo define el punto representativo como "
                        "el testigo SOBRE AGUA que la geometria tiene que poder "
                        "contener. Se corrio al agua mas cercana, que es lo minimo "
                        "que lo hace cumplir su propia definicion."
                        if movido else
                        "el punto original ya caia sobre agua segun la capa de costa "
                        "declarada. No se movio. Queda registrado para que la "
                        "ausencia de correccion sea un hecho medido y no un olvido."))
            j["punto_representativo"] = nuevo
            j.pop("punto_representativo_descartado", None)
            if movido:
                movidos += 1
            # Si venia de un descarte anterior y ahora entra, la causa se limpia.
            if j.get("causa_sin_punto_representativo") and \
                    "no sirve como testigo" in (j["causa_sin_punto_representativo"]):
                j["causa_sin_punto_representativo"] = None
        else:
            d = f.get("dist_m")
            cuanto = (f"{d:.0f} m" if d is not None
                      else f"mas de {f['cota_m']:.0f} m")
            if f["caso"] == "excluido":
                motivo = (
                    f"NO SIRVE COMO TESTIGO CONTRA UNA COSTA DE MAR, y ademas esta "
                    f"declarado fuera de esta correccion en el propio dato "
                    f"(punto_representativo.correccion_al_agua), por "
                    f"{f.get('declarado_por') or 'declaracion sin autor'}: "
                    f"{f['motivo']} El punto no se movio. Medido igual, para que la "
                    f"declaracion tenga su numero al lado: el agua mas cercana esta "
                    f"a {cuanto}.")
                causa = (f"su punto representativo esta declarado fuera de la "
                         f"correccion al agua — {f['motivo']} — y sin corregir cae "
                         f"en tierra, a {cuanto} del agua. No se mueve y no se usa "
                         f"como testigo. El punto y su medicion quedan en "
                         f"punto_representativo_descartado.")
            else:
                motivo = (
                    f"NO SIRVE COMO TESTIGO. El punto cae en tierra y el agua mas "
                    f"cercana esta a {cuanto} segun la capa de costa declarada, por "
                    f"encima del umbral de {UMBRAL_M:.0f} m. La fuente escribe este "
                    f"punto con la misma precision que todos los demas — cuatro "
                    f"decimales, ±6 m —, asi que la distancia no se explica por una "
                    f"coordenada gruesa: a {cuanto} del agua el punto no es una orilla "
                    f"mal puesta por unos metros, describe otra cosa — una sede, un "
                    f"puerto interior —, y moverlo seria inventar el dato en vez de "
                    f"corregirlo. Se conserva aca para no borrar la evidencia de cual "
                    f"era.")
                causa = (f"su punto representativo no sirve como testigo: cae en "
                         f"tierra y el agua mas cercana esta a {cuanto}, por encima "
                         f"del umbral de correccion de {UMBRAL_M:.0f} m. El "
                         f"punto y su medicion quedan en "
                         f"punto_representativo_descartado.")
            j["punto_representativo"] = None
            j["punto_representativo_descartado"] = dict(
                pr, motivo_descarte=motivo,
                distancia_al_agua_m=(round(d, 1) if d is not None else None),
                cota_inferior_m=(None if d is not None else f.get("cota_m")),
                **conv)
            j["causa_sin_punto_representativo"] = causa
            declarados += 1

    v2.setdefault("convenciones", []).append(UMBRAL_JUSTIFICACION)
    v2["convenciones"] = list(dict.fromkeys(v2["convenciones"]))
    v2["correccion_testigos"] = {
        "aplicada": True,
        "fecha": "2026-08-10",
        "por": "scripts/fase5_corregir_testigos.py",
        "camino": "camino 1, autorizado por el owner: correr cada testigo al agua mas "
                  "cercana segun la capa de costa declarada, registrando el "
                  "desplazamiento; pasado el umbral el punto no se mueve y se declara.",
        "umbral_m": UMBRAL_M,
        "umbral_regla": "uno solo para todos los puntos: la fuente los escribe a todos "
                        "con la misma precision. La justificacion medida, y la regla "
                        "por precision que se intento y se descarto, estan en "
                        "convenciones.",
        "margen_identidad": MARGEN_IDENTIDAD,
        "margen_agua_m": MARGEN_AGUA_M,
        "capa_de_costa": huella_costa,
        "movidos": movidos,
        "declarados_sin_testigo": declarados,
        "reproducible": "la correccion es funcion del punto original y de la capa de "
                        "costa. El original queda en punto_representativo.correccion."
                        "original (o en punto_representativo_descartado). Volver a "
                        "correr el script recalcula desde los originales: es "
                        "idempotente, y si la costa cambia recalcula todo desde cero "
                        "en vez de mover lo ya movido.",
    }
    with open(V2, "w", encoding="utf-8") as fh:
        json.dump(v2, fh, ensure_ascii=False, indent=1)
    return movidos, declarados


def verificar_aplicado(cur, tabla, v2):
    """Se vuelve a preguntar a la base, sobre el archivo ya escrito. No se confia en
    el calculo que produjo los puntos: se comprueba el resultado."""
    fallas = []
    n_agua = n_decl = 0
    for j in v2["jurisdicciones"]:
        if j["ambito"] not in AMBITOS:
            continue
        pr = j.get("punto_representativo")
        if pr is None:
            if j.get("punto_representativo_descartado") and \
                    not j.get("causa_sin_punto_representativo"):
                fallas.append(f"{j['nombre']}: descartado sin causa declarada")
            n_decl += 1
            continue
        corr = pr.get("correccion")
        excl = (pr.get("correccion_al_agua") or {})
        if not corr:
            if excl and excl.get("aplica") is False:
                continue
            fallas.append(f"{j['nombre']}: quedo sin registro de correccion")
            continue
        if en_tierra(cur, tabla, pr["lat"], pr["lon"]):
            fallas.append(f"{j['nombre']}: el testigo corregido "
                          f"({pr['lat']:.5f},{pr['lon']:.5f}) SIGUE en tierra")
        else:
            n_agua += 1
        o = corr["original"]
        d = metros(cur, (o["lat"], o["lon"]), (pr["lat"], pr["lon"]))
        if abs(d - corr["desplazamiento_m"]) > 1.0:
            fallas.append(f"{j['nombre']}: el desplazamiento registrado "
                          f"{corr['desplazamiento_m']} m no es el que se mide "
                          f"entre el original y el corregido ({d:.1f} m)")
        if corr["desplazamiento_m"] > UMBRAL_M:
            fallas.append(f"{j['nombre']}: se movio {corr['desplazamiento_m']} m, "
                          f"por encima del umbral de {UMBRAL_M:.0f} m")
    return fallas, n_agua, n_decl


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--medir", action="store_true", help="mide y reporta; no escribe")
    g.add_argument("--aplicar", action="store_true", help="escribe en el insumo")
    args = ap.parse_args()

    man = json.load(open(MANIFIESTO, encoding="utf-8"))
    capa, tabla = capa_tierra(man)
    v2 = json.load(open(V2, encoding="utf-8"))

    print("FASE 5 — ETAPA 1. CORRECCION DE LOS TESTIGOS")
    print(f"modo       : {'medir (no escribe)' if args.medir else 'APLICAR'}")
    print(f"insumo     : data/decreto/jurisdicciones_v2.json")
    print(f"             sha256[:16] {sha256(V2)[:16]}")
    print(f"capa costa : {capa['id']}  ->  {tabla}")
    print(f"             sha256[:16] {capa['sha256'][:16]}")

    cfg = leer_env()
    con = psycopg2.connect(host=cfg["DB_HOST"], port=cfg["DB_PORT"],
                           dbname=cfg["DB_NAME"], user=cfg["DB_USER"],
                           password=cfg["DB_PASSWORD"])
    try:
        cur = con.cursor()
        exigir_capa_cargada(cur, capa, tabla)
        filas = evaluar(cur, tabla, v2)
        por = informe(cur, filas, v2)

        # El margen de identidad se exige en los dos modos: en --medir para que el
        # reporte no muestre como aceptable algo que despues no se va a poder
        # aplicar, y en --aplicar antes de tocar el archivo.
        exigir_margen_de_identidad(filas)

        if args.medir:
            print("")
            print(f"  margen de identidad: se cumple en los "
                  f"{sum(1 for f in filas if f['caso'] == 'corregible')} que se "
                  f"moverian")
            print("MODO MEDIR: no se escribio nada.")
            return 0

        movidos, declarados = aplicar(cur, tabla, filas, v2, capa)
        v2r = json.load(open(V2, encoding="utf-8"))
        fallas, n_agua, n_decl = verificar_aplicado(cur, tabla, v2r)
        print("")
        print("=" * 78)
        print("VERIFICACION SOBRE EL ARCHIVO YA ESCRITO")
        print("=" * 78)
        print(f"  movidos al agua          : {movidos}")
        print(f"  declarados sin testigo   : {declarados}")
        print(f"  testigos sobre agua      : {n_agua}")
        print(f"  sin testigo en el insumo : {n_decl}")
        print(f"  insumo sha256[:16]       : {sha256(V2)[:16]}")
        if fallas:
            for f in fallas:
                print(f"  FALLA {f}")
            raise Alto(f"{len(fallas)} verificaciones fallaron sobre el insumo ya "
                       f"escrito. El archivo quedO modificado: revisalo antes de "
                       f"seguir, no lo uses")
        print("  todas las verificaciones pasaron")
        print("")
        print(f"  Excluidos por declaracion en el dato: "
              f"{len(por.get('excluido', []))}")
        for f in por.get("excluido", []):
            print(f"    {f['nombre']}: {f['motivo']}")
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())
