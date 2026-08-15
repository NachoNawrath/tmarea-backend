"""EL V2 QUEDO CONSISTENTE CON EL V1 EN TODO, NO SOLO EN EL CAMPO QUE SE INSERTO.

Condicion del owner, 2026-08-15: *el atajo que evita regenerar tambien evita
enterarse*. La insercion quirurgica en `jurisdicciones_v2.json` es el atajo — y es
el correcto, porque regenerar el v2 destruye lo que le escriben los otros dos
scripts (medido en su momento: 247 inserciones contra 924 borrados). Pero un atajo
sin control es exactamente lo que preservo tres dias de desfase con la laguna
Galletue: el v2 seguia declarandola sin geometria mientras el v1 ya la tenia
adjudicada, y nadie se entero porque nadie regenero.

COMO SE MIDE, entonces. No se compara el campo insertado: se REGENERA el v2 entero
a un archivo aparte y se compara contra el que esta en disco. Todo lo que difiera
tiene que caer dentro de lo que los OTROS DOS scripts escriben, declarado abajo.
Cualquier otra diferencia es el desfase que este control existe para cazar.

  · el v2 real     data/decreto/jurisdicciones_v2.json  (con la insercion aplicada)
  · el v2 patron   se regenera aca, en _v2_regenerado.json, y NO se versiona
  · veredicto      exit 0 sin divergencia · exit 1 divergencia NO declarada
                   exit 2 no se pudo medir · exit 3 divergencia declarada y abierta

LA RUTA DE SALIDA SE PASA POR ARGUMENTO desde el 2026-08-15, y el defecto no
cambio: sin argumento sigue escribiendo `04_v2_contra_v1.txt` aca al lado. El
motivo es CLAUDE.md 3.3 — este control hay que correrlo cada vez que se toque el
v2 quirurgicamente, y correrlo donde nacio PISA la constancia de la sesion que lo
produjo. Una bitacora publicada se agrega, no se reescribe. Cada corrida nueva
escribe en la bitacora de SU sesion:

    ... verificar_v2_contra_v1.py <ruta del .txt de salida>

NO ESCRIBE NADA en data/, src/ ni geodata/. La constante V2 del modulo de migracion
se sustituye en memoria antes de llamarlo, asi que el v2 real no se toca ni por un
instante. Se comprueba por sha256 antes y despues, y si cambio, se detiene.

SHELL DECLARADA (CLAUDE.md 7.3) — en PowerShell, desde la raiz:

    cd C:\\Users\\katia\\tmarea-backend
    .\\tools\\raster-build\\.venv\\Scripts\\python.exe _bitacoras\\arica_limite_norte_2026-08-15\\verificar_v2_contra_v1.py

El interprete es el venv de tools/raster-build: la migracion importa geopandas y
ni `py` ni `python` lo tienen.
"""

import hashlib
import importlib.util
import io
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
V2_REAL = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
V1_REAL = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
MIGRACION = os.path.join(REPO, "scripts", "fase4_migrar_insumo_v2.py")
V2_PATRON = os.path.join(AQUI, "_v2_regenerado.json")     # gitignored


# ── LO QUE LOS OTROS DOS SCRIPTS ESCRIBEN — declarado, no deducido ─────────────
# Se declara en vez de inferirse porque inferirlo seria dejar que el control se
# adapte a lo que encuentre, y un control que se adapta no puede fallar (0.3).
# Cada entrada dice QUIEN la escribe: si manana aparece un cuarto escritor, su
# bloque no esta aca y el control lo caza en vez de absorberlo.

# Bloques que la migracion NO produce y otro script AGREGA ENTEROS: en el patron
# no existen y en el v2 si.
#
# 2026-08-15, Opcion 2: SE RETIRA `pendientes`. Ya no lo agrega nadie sobre el
# derivado — vive en el v1 y la migracion lo sube con su linea de paso—, asi que
# el patron lo produce y tiene que salir identico. Retirarlo APRIETA el control:
# hasta hoy perdonaba el bloque entero.
BLOQUES_AGREGADOS = {
    "correccion_testigos": "fase5_corregir_testigos.py",
}

# Listas donde otro script AGREGA AL FINAL. No se declaran como "todo lo que pase
# aca esta bien" —eso taparia una modificacion de lo que la migracion si produce—:
# se exige que la lista del patron sea PREFIJO EXACTO de la del v2, y lo que sobra
# al final se lista una por una para que se vea quien la puso.
#
# 2026-08-15, Opcion 2: SE RETIRA `puntos_notables`, por el mismo motivo. Los 4
# toponimos del IGM viven en el v1 desde hoy y la migracion copia la lista
# verbatim, asi que el patron trae los 76 y se comparan uno por uno. Hasta hoy se
# perdonaban 4 elementos de cola.
LISTAS_CON_APENDICE = {
    "convenciones": "fase5_corregir_testigos.py (el umbral de 500 m)",
}

BLOQUES_DE_OTROS = dict(BLOQUES_AGREGADOS)

# ── DIVERGENCIAS CONOCIDAS Y ABIERTAS — codigo de salida 3, no 1 ──────────────
# Misma semantica que el control de drift de E0.1: `1` es divergencia NO declarada
# y `3` es divergencia declarada y abierta. Una entrada aca NO la perdona: la
# nombra, la deja a la vista en cada corrida y en el diff de git, y exige que se
# escriba como cerrarla. Cualquier divergencia que no este nombrada aca sigue
# saliendo `1`, que es lo que impide que esta lista se convierta en un cajon.
#
# CERRADAS EL 2026-08-15 (Opcion 2), y por eso el dict quedo vacio: las dos que
# vivian aca eran `jurisdicciones[punta_delgada].causa_sin_geometria` y la de
# `tierra_del_fuego`. Su condicion de cierre escrita era "cuando la causa vigente
# baje al v1", y bajo — con los 4 toponimos del IGM y el bloque `pendientes`, que
# es lo que hace verdadero al texto. Evidencia en
# `_bitacoras/causa_pd_tdf_2026-08-15/`.
#
# Se dejan retiradas y no comentadas adentro: una entrada que ya no puede
# dispararse es un permiso vivo esperando a que el defecto vuelva. El dict vacio
# es el estado correcto — cualquier divergencia sale `1` hasta que alguien la
# declare a proposito, que es lo que impide que esta lista se vuelva un cajon.
DIVERGENCIAS_ABIERTAS = {}

# Dentro de cada jurisdiccion, los campos que el corrector de testigos reescribe.
# El resto tiene que salir IDENTICO de la migracion.
CAMPOS_DE_OTROS_EN_JURISDICCION = {
    "punto_representativo",
    "punto_representativo_descartado",
    "causa_sin_punto_representativo",
}


class Alto(Exception):
    pass


def sha(ruta):
    with open(ruta, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def cargar(ruta):
    with io.open(ruta, encoding="utf-8") as fh:
        return json.load(fh)


def regenerar():
    """Corre la migracion con la salida desviada. El v2 real no se toca."""
    antes = sha(V2_REAL)

    spec = importlib.util.spec_from_file_location("_migracion", MIGRACION)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["_migracion"] = mod
    spec.loader.exec_module(mod)

    if not hasattr(mod, "V2"):
        raise Alto("el modulo de migracion no expone la constante V2; el desvio de "
                   "salida de este control depende de ella y no se adivina otra")
    mod.V2 = V2_PATRON

    silencio = io.StringIO()
    real_stdout = sys.stdout
    try:
        sys.stdout = silencio
        mod.main()
    finally:
        sys.stdout = real_stdout

    despues = sha(V2_REAL)
    if antes != despues:
        raise Alto(
            f"LA REGENERACION TOCO EL V2 REAL. sha antes {antes[:16]}, despues "
            f"{despues[:16]}. El desvio de salida no funciono y este control acaba "
            f"de hacer justamente lo que existe para evitar. Restaurar desde git."
        )
    return silencio.getvalue()


def diferencias(a, b, ruta=""):
    """Lista de (ruta, valor_en_real, valor_en_patron). Recorre dicts y listas."""
    out = []
    if type(a) is not type(b) and not (isinstance(a, (int, float))
                                       and isinstance(b, (int, float))):
        return [(ruta or "(raiz)", f"<{type(a).__name__}>", f"<{type(b).__name__}>")]
    if isinstance(a, dict):
        for k in dict.fromkeys(list(a) + list(b)):
            if k not in a:
                out.append((f"{ruta}.{k}", "(ausente)", "(presente)"))
            elif k not in b:
                out.append((f"{ruta}.{k}", "(presente)", "(ausente)"))
            else:
                out += diferencias(a[k], b[k], f"{ruta}.{k}")
    elif isinstance(a, list):
        if len(a) != len(b):
            out.append((f"{ruta}[]", f"{len(a)} elementos", f"{len(b)} elementos"))
        for i, (x, y) in enumerate(zip(a, b)):
            out += diferencias(x, y, f"{ruta}[{i}]")
    elif a != b:
        out.append((ruta, repr(a)[:150], repr(b)[:150]))
    return out


def declarada(ruta):
    """(es_esperada, quien). Una diferencia esta declarada si cae en un bloque que
    otro script escribe, o en un campo de jurisdiccion que el corrector reescribe."""
    partes = ruta.lstrip(".").split(".")
    if partes and partes[0].split("[")[0] in BLOQUES_DE_OTROS:
        return True, BLOQUES_DE_OTROS[partes[0].split("[")[0]]
    if len(partes) >= 2 and partes[0].startswith("jurisdicciones["):
        if partes[1].split("[")[0] in CAMPOS_DE_OTROS_EN_JURISDICCION:
            return True, "fase5_corregir_testigos.py"
    return False, None


def main():
    L = []
    A = L.append
    A("=" * 78)
    A("EL V2 CONTRA UNA REGENERACION LIMPIA DESDE EL V1")
    A("condicion del owner, 2026-08-15: la insercion quirurgica va con verificacion")
    A("de que el v2 quedo consistente en TODO, no solo en el campo insertado")
    A("=" * 78)
    A("")
    A(f"  v1     sha256 {sha(V1_REAL)}")
    A(f"  v2     sha256 {sha(V2_REAL)}")

    salida_migracion = regenerar()
    A(f"  patron sha256 {sha(V2_PATRON)}   (_v2_regenerado.json, no se versiona)")
    A("")
    A("  El v2 real NO se toco: sha comprobado antes y despues de regenerar.")
    A("")

    real, patron = cargar(V2_REAL), cargar(V2_PATRON)

    # ── B0 por adelantado: el sha que el v2 declara del v1 ────────────────────
    dec = (real.get("derivado_de") or {}).get("jurisdicciones_capitanias.json")
    real_v1 = sha(V1_REAL)
    A("CONTROL 1 — `derivado_de` apunta al v1 que esta en disco (es B0 adelantado)")
    A("-" * 78)
    if dec == real_v1:
        A(f"  ok       {dec[:32]}...")
    else:
        A(f"  FALLA    el v2 declara derivar de {str(dec)[:32]}...")
        A(f"           y el v1 en disco es      {real_v1[:32]}...")
    A("")

    # ── Las listas con apendice, con prefijo EXACTO ───────────────────────────
    A("CONTROL 2 — las listas donde otro script agrega al final")
    A("-" * 78)
    A("  Se exige que la lista que produce la migracion sea PREFIJO EXACTO de la")
    A("  que esta en el v2. Asi un agregado al final pasa y una MODIFICACION de lo")
    A("  que la migracion si produce NO pasa, que es lo que un permiso por bloque")
    A("  entero dejaria colar.")
    A("")
    prefijo_ok = True
    for clave, quien in LISTAS_CON_APENDICE.items():
        lr, lp = real.get(clave) or [], patron.get(clave) or []
        if lr[:len(lp)] == lp:
            A(f"  ok     {clave:<18} patron {len(lp):>3} · v2 {len(lr):>3} · "
              f"prefijo exacto, {len(lr) - len(lp)} agregada(s) al final")
            for extra in lr[len(lp):]:
                A(f"           + {str(extra)[:96]}")
            A(f"           las agrega: {quien}")
        else:
            prefijo_ok = False
            A(f"  FALLA  {clave:<18} la lista del patron NO es prefijo de la del v2: "
              f"algo de lo que la migracion produce fue MODIFICADO en el v2.")
            for i, (x, y) in enumerate(zip(lr, lp)):
                if x != y:
                    A(f"           primer desvio en [{i}]")
                    A(f"             v2 real    {str(x)[:120]}")
                    A(f"             regenerado {str(y)[:120]}")
                    break
    A("")

    # Las rutas del diff traen indice numerico (jurisdicciones[57]); las
    # divergencias se declaran por ID, que es estable. Se traduce.
    ids = [j["id"] for j in real["jurisdicciones"]]

    def por_id(ruta):
        p = ruta.lstrip(".")
        if p.startswith("jurisdicciones["):
            i = int(p[len("jurisdicciones["):p.index("]")])
            if 0 <= i < len(ids):
                return "jurisdicciones[" + ids[i] + "]" + p[p.index("]") + 1:]
        return p

    difs = [d for d in diferencias(real, patron)
            if d[0].lstrip(".").split(".")[0].split("[")[0] not in LISTAS_CON_APENDICE]
    esperadas, inesperadas, abiertas = [], [], []
    for d in difs:
        ok, quien = declarada(d[0])
        if ok:
            esperadas.append((d, quien))
        elif por_id(d[0]) in DIVERGENCIAS_ABIERTAS:
            abiertas.append((d, por_id(d[0])))
        else:
            inesperadas.append((d, quien))

    A("CONTROL 3 — toda diferencia contra la regeneracion esta declarada")
    A("-" * 78)
    A(f"  diferencias totales        {len(difs)}")
    A(f"  declaradas (otros scripts) {len(esperadas)}")
    A(f"  divergencias ABIERTAS      {len(abiertas)}   (declaradas y sin cerrar -> exit 3)")
    A(f"  NO DECLARADAS              {len(inesperadas)}   (-> exit 1)")
    A("")
    A("  Reparto de las declaradas, por quien las escribe:")
    porque = {}
    for (d, quien) in esperadas:
        porque[quien] = porque.get(quien, 0) + 1
    for quien, n in sorted(porque.items(), key=lambda t: -t[1]):
        A(f"    {n:>5}  {quien}")
    A("")

    if abiertas:
        A("  LAS DIVERGENCIAS ABIERTAS — conocidas, escritas, y SIN CERRAR:")
        for (ruta, en_real, en_patron), clave in abiertas:
            A(f"    {clave}")
            A(f"        v2 real    {en_real}")
            A(f"        regenerado {en_patron}")
            for linea in DIVERGENCIAS_ABIERTAS[clave].split(". "):
                if linea.strip():
                    A(f"        · {linea.strip().rstrip('.')}.")
        A("")

    if inesperadas:
        A("  LAS NO DECLARADAS — cada una es un desfase entre el v1 y el v2:")
        for (ruta, en_real, en_patron), _ in inesperadas[:60]:
            A(f"    {ruta}")
            A(f"        v2 real    {en_real}")
            A(f"        regenerado {en_patron}")
        if len(inesperadas) > 60:
            A(f"    ... y {len(inesperadas) - 60} mas")
    elif abiertas:
        A("  Ninguna NO DECLARADA. Todo lo que difiere esta arriba, con su nombre y")
        A("  su condicion de cierre. Que exit sea 3 y no 0 es el punto: hay desfase")
        A("  y esta escrito, que no es lo mismo que no haberlo.")
    else:
        A("  Ninguna. El v2 dice del v1 exactamente lo que una regeneracion diria.")
    A("")

    # ── CONTROL 3 — lo que esta sesion inserto, comprobado contra el patron ───
    A("CONTROL 4 — la insercion de `arica`, contra lo que la migracion produce sola")
    A("-" * 78)
    jr = next(j for j in real["jurisdicciones"] if j["id"] == "arica")
    jp = next(j for j in patron["jurisdicciones"] if j["id"] == "arica")
    filas = [
        ("estado_geometria", jr.get("estado_geometria"), jp.get("estado_geometria")),
        ("receta", jr.get("receta"), jp.get("receta")),
        ("participa_matching", jr.get("participa_matching"), jp.get("participa_matching")),
        ("limite_norte.dec", (jr.get("limite_norte") or {}).get("dec"),
                             (jp.get("limite_norte") or {}).get("dec")),
        ("limite_norte_convencion presente", jr.get("limite_norte_convencion") is not None,
                                             jp.get("limite_norte_convencion") is not None),
    ]
    for nombre, a, b in filas:
        marca = "ok    " if a == b else "FALLA "
        A(f"  {marca} {nombre:<36} v2={a!r:<18} regenerado={b!r}")
    A("")
    A("  Y lo que NO tiene que haber cambiado, porque D no cierra `arica`:")
    for nombre, valor, esperado in (
            ("estado_geometria", jr.get("estado_geometria"), "no_cerrable"),
            ("participa_matching", jr.get("participa_matching"), False),
            ("limite_norte.dec", (jr.get("limite_norte") or {}).get("dec"), None)):
        marca = "ok    " if valor == esperado else "FALLA "
        A(f"  {marca} {nombre:<36} es {valor!r}, tiene que ser {esperado!r}")
    A("")

    # ── CONTROL 4 — el conteo, con su ambito al lado (condicion del owner) ────
    A("CONTROL 5 — el conteo, SIEMPRE con su ambito al lado")
    A("-" * 78)
    cuenta = {}
    for j in real["jurisdicciones"]:
        k = (j["ambito"], j["estado_geometria"])
        cuenta[k] = cuenta.get(k, 0) + 1
    for amb in sorted({a for a, _ in cuenta}):
        c = cuenta.get((amb, "cerrable"), 0)
        n = cuenta.get((amb, "no_cerrable"), 0)
        A(f"    {amb:<16} cerrable {c:>2}  ·  no_cerrable {n:>2}")
    tc = sum(v for (_, e), v in cuenta.items() if e == "cerrable")
    tn = sum(v for (_, e), v in cuenta.items() if e == "no_cerrable")
    A(f"    {'TOTAL 64':<16} cerrable {tc:>2}  ·  no_cerrable {tn:>2}")
    A("")
    A("    MARITIMA sigue en 44/8. La Opcion D NO cierra `arica`: declara su limite")
    A("    y no lo construye. Si alguna vez este control dice 45/7 sin que se haya")
    A("    construido el mecanismo de alcance, algo escribio `limite_norte_dec`.")
    A("")

    fallas = bool(inesperadas) or dec != real_v1 or not prefijo_ok \
        or jr.get("estado_geometria") != "no_cerrable" \
        or jr.get("participa_matching") is not False \
        or (jr.get("limite_norte") or {}).get("dec") is not None \
        or jr.get("limite_norte_convencion") is None

    if fallas:
        codigo, veredicto = 1, "DIVERGENCIA NO DECLARADA — exit 1"
    elif abiertas:
        codigo, veredicto = 3, (
            f"DIVERGENCIA DECLARADA Y ABIERTA — exit 3. Son {len(abiertas)}, "
            f"nombradas arriba\n            con su condicion de cierre. No se "
            f"cierra callandolo.")
    else:
        codigo, veredicto = 0, "SIN DIVERGENCIA — exit 0"

    A("=" * 78)
    A("VEREDICTO: " + veredicto)
    A("=" * 78)
    A("")
    A("Salida de la migracion durante la regeneracion (para que no quede oculta):")
    A("-" * 78)
    L.extend("  " + l for l in salida_migracion.rstrip().splitlines())

    texto = "\n".join(L) + "\n"

    # LA EVIDENCIA SE ESCRIBE ANTES DE IMPRIMIR, y el orden no es estetico.
    # Es la leccion del BOM del 2026-08-12: aquel control moria antes de escribir su
    # estado versionado, asi que el defecto apagaba los DOS rastros a la vez —el log
    # y el diff de git— y el control roto se leia como control que paso. Aca ya pasó
    # una vez en chico: la consola cp1252 de Windows no sabe imprimir una flecha, la
    # corrida moria con UnicodeEncodeError y dejaba en disco el .txt de la corrida
    # ANTERIOR, con exit 1 y sin decir por que. Primero el archivo; despues la
    # pantalla, que es lo prescindible.
    destino = (os.path.abspath(sys.argv[1]) if len(sys.argv) > 1
               else os.path.join(AQUI, "04_v2_contra_v1.txt"))
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with io.open(destino, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(texto)
    L.append(f"\n(evidencia escrita en {os.path.relpath(destino, REPO)})")

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        print(texto)
    except UnicodeEncodeError:
        print(texto.encode("ascii", "replace").decode("ascii"))
        print("[la consola no soporta UTF-8; el archivo 04_v2_contra_v1.txt "
              "esta completo y bien]")
    return codigo


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Alto as e:
        print(f"\nALTO: {e}\n", file=sys.stderr)
        sys.exit(2)
