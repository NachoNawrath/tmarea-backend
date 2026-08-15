"""EL GATE QUE EL OWNER EXIGIO MEDIDO ANTES DE ESCRIBIR, NO DESPUES.

Opcion 2 sube al v1 los 4 toponimos del IGM (`puntos_notables` 72 -> 76) y el
bloque `pendientes`. La pregunta del owner es una sola y es previa: **¿se mueve
algun control A del auditor del v1 al hacerlo?** Si se mueve, no se escribe.

COMO SE MIDE. No se razona sobre el codigo: se CORRE el auditor dos veces —una
contra el v1 de hoy y otra contra un v1 en la sombra con los 4 puntos y el
bloque ya puestos— y se comparan los dos informes linea por linea. Se descartan
de la comparacion unicamente las lineas de huella sha256, que cambian por
construccion porque el archivo auditado es otro; cualquier otra diferencia es
justamente lo que este gate existe para cazar.

  · el v1 real     data/decreto/jurisdicciones_capitanias.json   NO SE TOCA
  · el v1 sombra   _v1_sombra.json, aca al lado, gitignored
  · veredicto      exit 0 ningun control se mueve · exit 1 alguno se movio
                   exit 2 no se pudo medir

NO ESCRIBE NADA en data/, src/ ni geodata/. La constante DECRETO del modulo del
auditor se sustituye EN MEMORIA antes de llamarlo, y se comprueba por sha256
antes y despues que el v1 real no se movio ni por un instante — el mismo recaudo
que `verificar_v2_contra_v1.py`, por el mismo motivo.

LO QUE ESTE GATE MIDE Y LO QUE NO. Mide el efecto de la Opcion 2 sobre el
auditor del v1, que es lo que el owner pidio. NO mide el efecto sobre el auditor
del v2 (B0..B12) ni sobre el control de consistencia: esos corren despues, sobre
el dato ya escrito, y tienen su propia evidencia.

SHELL DECLARADA (CLAUDE.md 7.3) — en PowerShell, desde la raiz:

    cd C:\\Users\\katia\\tmarea-backend
    .\\tools\\raster-build\\.venv\\Scripts\\python.exe _bitacoras\\causa_pd_tdf_2026-08-15\\01_gate_puntos_notables.py

El interprete NO es `py` ni `python`: es el venv de tools/raster-build.
"""

import copy
import difflib
import hashlib
import importlib.util
import io
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
V1_REAL = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
V2_REAL = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
AUDITOR = os.path.join(REPO, "scripts", "fase4_auditoria_insumo.py")
V1_SOMBRA = os.path.join(AQUI, "_v1_sombra.json")      # gitignored

NUEVOS = ["Punta Anxious", "Peninsula Brecknock", "Punta Harry", "Cabo San Vicente"]


class Alto(Exception):
    pass


def sha(ruta):
    with open(ruta, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def correr_auditor(ruta_v1):
    """Corre el auditor con DECRETO desviado. Devuelve (codigo, texto)."""
    antes = sha(V1_REAL)

    spec = importlib.util.spec_from_file_location("_auditor_v1", AUDITOR)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["_auditor_v1"] = mod
    spec.loader.exec_module(mod)

    if not hasattr(mod, "DECRETO"):
        raise Alto("el auditor no expone la constante DECRETO; el desvio de "
                   "entrada de este gate depende de ella y no se adivina otra")
    mod.DECRETO = ruta_v1

    salida = io.StringIO()
    real = sys.stdout
    try:
        sys.stdout = salida
        codigo = mod.main()
    finally:
        sys.stdout = real

    if sha(V1_REAL) != antes:
        raise Alto("CORRER EL AUDITOR TOCO EL V1 REAL. El desvio no funciono y "
                   "este gate acaba de hacer lo que existe para evitar. "
                   "Restaurar desde git.")
    return codigo, salida.getvalue()


def construir_sombra():
    """El v1 tal como quedaria despues de la Opcion 2, sin escribirlo en data/."""
    v1 = json.load(io.open(V1_REAL, encoding="utf-8"))
    v2 = json.load(io.open(V2_REAL, encoding="utf-8"))

    ya = {p["nombre"] for p in v1["puntos_notables"]}
    del_v2 = {p["nombre"]: p for p in v2["puntos_notables"]}
    faltan = [n for n in NUEVOS if n not in ya]
    if not faltan:
        raise Alto("el v1 ya trae los 4 toponimos: este gate no tiene que medir "
                   "nada y correrlo igual daria un verde que no significa nada")
    for n in faltan:
        if n not in del_v2:
            raise Alto(f"'{n}' no esta en los puntos_notables del v2: la sombra "
                       f"se construye COPIANDO del v2, no inventando el registro")
        v1["puntos_notables"].append(copy.deepcopy(del_v2[n]))

    if "pendientes" in v1:
        raise Alto("el v1 ya trae 'pendientes'")
    v1["pendientes"] = copy.deepcopy(v2["pendientes"])

    with open(V1_SOMBRA, "w", encoding="utf-8") as fh:
        json.dump(v1, fh, ensure_ascii=False, indent=1, sort_keys=False)
    return len(faltan), len(v1["puntos_notables"]), len(v1["pendientes"])


def sin_huella(texto):
    """Quita las lineas que cambian por construccion al auditar otro archivo:
    las huellas sha256 y la linea que nombra la ruta del insumo. Se quitan por
    NOMBRE, no por numero de linea, para que el filtro no envejezca."""
    out = []
    for l in texto.splitlines():
        s = l.strip()
        if s.startswith("sha256[:16]") or s.startswith("insumo   :"):
            continue
        out.append(l)
    return out


def main():
    L = []
    A = L.append
    A("=" * 78)
    A("GATE — ¿SE MUEVE ALGUN CONTROL A DEL AUDITOR DEL V1 AL PASAR")
    A("        puntos_notables DE 72 A 76 Y AGREGAR EL BLOQUE `pendientes`?")
    A("condicion del owner, 2026-08-15: medido ANTES de escribir, no despues")
    A("=" * 78)
    A("")
    A(f"  v1 real    sha256 {sha(V1_REAL)}")
    A(f"  v2 real    sha256 {sha(V2_REAL)}")

    agregados, total_pn, total_pend = construir_sombra()
    A(f"  v1 sombra  sha256 {sha(V1_SOMBRA)}   (_v1_sombra.json, no se versiona)")
    A("")
    A(f"  puntos_notables agregados a la sombra : {agregados}  {NUEVOS}")
    A(f"  puntos_notables en la sombra          : {total_pn}")
    A(f"  entradas de `pendientes` en la sombra : {total_pend}")
    A("")

    cod_real, txt_real = correr_auditor(V1_REAL)
    cod_sombra, txt_sombra = correr_auditor(V1_SOMBRA)

    A("  El v1 real NO se toco: sha comprobado antes y despues de cada corrida.")
    A("")
    A("CONTROL 1 — el veredicto del auditor")
    A("-" * 78)
    A(f"  contra el v1 real   exit {cod_real}")
    A(f"  contra la sombra    exit {cod_sombra}")
    if cod_real == cod_sombra:
        A("  ok     el veredicto no cambia")
    else:
        A("  FALLA  el veredicto CAMBIA. La Opcion 2 mueve la auditoria del v1.")
    A("")

    A("CONTROL 2 — informe contra informe, linea por linea")
    A("-" * 78)
    A("  Se descartan solo las lineas de huella sha256 y la que nombra la ruta")
    A("  del insumo: cambian porque el archivo auditado es otro. Todo lo demas")
    A("  tiene que salir identico.")
    A("")
    a, b = sin_huella(txt_real), sin_huella(txt_sombra)
    diff = [d for d in difflib.unified_diff(a, b, "v1_real", "v1_sombra", n=1,
                                            lineterm="")]
    cuerpo = [d for d in diff if d[:1] in "+-" and not d.startswith(("+++", "---"))]
    A(f"  lineas del informe (real)   {len(a)}")
    A(f"  lineas del informe (sombra) {len(b)}")
    A(f"  lineas que difieren         {len(cuerpo)}")
    A("")
    if cuerpo:
        A("  LAS DIFERENCIAS:")
        for d in diff:
            A(f"    {d}")
    else:
        A("  ok     los dos informes son identicos. Ningun control A se mueve.")
    A("")

    A("CONTROL 3 — el unico lugar donde el auditor del v1 LEE puntos_notables")
    A("-" * 78)
    A("  `fase4_auditoria_insumo.py:458` arma el catalogo y `:517-531` (A0) lo")
    A("  cruza contra los `vertices` que NOMBRAN un punto notable. Agregar un")
    A("  punto solo puede mover A0 si alguna capitania tiene un vertice con ese")
    A("  nombre. Se cuenta, no se supone:")
    A("")
    v1 = json.load(io.open(V1_REAL, encoding="utf-8"))
    hits = 0
    for c in v1["capitanias"]:
        for campo in ("vertices", "poligonal_completa"):
            for v in (c.get(campo) or []):
                if v.get("nombre") in NUEVOS:
                    hits += 1
                    A(f"    {c['id']:<20} {campo:<20} {v.get('nombre')}")
    A(f"  vertices del v1 que nombran alguno de los 4 : {hits}")
    if hits == 0:
        A("  ok     ninguno. A0 no gana ni una comparacion nueva.")
    else:
        A("  ATENCION: hay vertices que los nombran. El CONTROL 2 dice si el")
        A("            cruce los da por coincidentes o no.")
    A("")

    falla = (cod_real != cod_sombra) or bool(cuerpo)
    A("=" * 78)
    if falla:
        A("VEREDICTO: LA OPCION 2 MUEVE LA AUDITORIA DEL V1 — exit 1.")
        A("           No se escribe. Las diferencias estan arriba, una por una.")
        codigo = 1
    else:
        A("VEREDICTO: NINGUN CONTROL A SE MUEVE — exit 0.")
        A("           El auditor del v1 dice exactamente lo mismo con 72 y con 76")
        A("           puntos notables y con el bloque `pendientes` puesto.")
        codigo = 0
    A("=" * 78)

    texto = "\n".join(L) + "\n"

    # La evidencia se escribe ANTES de imprimir. Leccion del BOM del 2026-08-12 y
    # de la flecha en la consola cp1252 del 2026-08-15: si el control muere al
    # imprimir, deja en disco el .txt de la corrida anterior y apaga los dos
    # rastros a la vez. Primero el archivo; la pantalla es lo prescindible.
    with io.open(os.path.join(AQUI, "01_gate_puntos_notables.txt"), "w",
                 encoding="utf-8", newline="\n") as fh:
        fh.write(texto)

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        print(texto)
    except UnicodeEncodeError:
        print(texto.encode("ascii", "replace").decode("ascii"))
        print("[la consola no soporta UTF-8; 01_gate_puntos_notables.txt esta "
              "completo y bien]")
    return codigo


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Alto as e:
        print(f"\nALTO: {e}\n", file=sys.stderr)
        sys.exit(2)
