"""
FASE 4 — PRUEBA DE MORDIDA DEL AUDITOR. Comprueba que el auditor puede fallar.

Un auditor que devuelve exit 0 no prueba nada por si solo: puede estar limpio
porque el insumo esta bien, o porque el control se rompio y ya no mira. Este
script distingue las dos cosas. Por cada FAMILIA de control introduce un defecto
deliberado en el insumo, corre el auditor, y exige que la familia correspondiente
lo cace. Despues restaura el insumo y verifica por sha256 que quedo byte por byte
como estaba.

Si una familia no caza su defecto, este script termina con codigo distinto de
cero. Un control que no muerde es un control que no existe.

NO construye geometria. NO deja el insumo alterado: cada mutacion se revierte
antes de la siguiente, y la reversion se comprueba.

Uso, desde la raiz del repositorio:
    py scripts/fase4_prueba_mordida_auditor.py
"""

import copy
import hashlib
import json
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
LACUSTRE = os.path.join(REPO, "data", "decreto", "cotejo_lacustre_adjudicado.json")
ADJUDICACION = os.path.join(REPO, "data", "decreto", "adjudicacion_tramos.json")
AUDITOR = os.path.join(REPO, "scripts", "fase4_auditoria_v2.py")


def sha(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def cargar(ruta):
    return json.load(open(ruta, encoding="utf-8"))


def guardar(ruta, dato):
    with open(ruta, "w", encoding="utf-8") as fh:
        json.dump(dato, fh, ensure_ascii=False, indent=1)


def jur(v2, pred):
    """Primera jurisdiccion que cumple el predicado. Sin caso por defecto: si no
    hay ninguna, la mutacion no se puede construir y hay que saberlo."""
    for j in v2["jurisdicciones"]:
        if pred(j):
            return j
    raise SystemExit("PRUEBA MAL CONSTRUIDA: no hay jurisdiccion que cumpla el "
                     "predicado de esta mutacion")


# ── las mutaciones, una por familia ──────────────────────────────────────────
# Cada una recibe los tres archivos cargados y devuelve una descripcion de lo que
# rompio. Toca lo minimo indispensable: mientras mas chica la mutacion, mas
# especifico el control que se esta probando.

def mut_b0(v2, lac, adj):
    j = jur(v2, lambda j: j["texto_decreto"])
    j["texto_decreto"] = j["texto_decreto"] + " TEXTO ALTERADO."
    return f"se altero el texto del decreto de {j['nombre']} en el v2"


def mut_b1(v2, lac, adj):
    j = jur(v2, lambda j: j["receta"] == "corte_y_ancla"
            and j["estado_geometria"] == "cerrable")
    j["ancla_seleccion"] = None
    return f"se quito el ancla de {j['nombre']}, que se cierra por corte y ancla"


def mut_b2(v2, lac, adj):
    f = next(x for x in v2["fronteras"] if x["tipo"] == "poligonal"
             and all(jur(v2, lambda j, i=lado: j["id"] == i)["ancla_seleccion"]
                     for lado in (x["lado_a"], x["lado_b"])))
    a = jur(v2, lambda j: j["id"] == f["lado_a"])
    b = jur(v2, lambda j: j["id"] == f["lado_b"])
    a["ancla_seleccion"] = copy.deepcopy(b["ancla_seleccion"])
    return (f"se movio el ancla de {a['nombre']} encima de la de {b['nombre']}, "
            f"con quien comparte frontera")


def mut_b3(v2, lac, adj):
    j = jur(v2, lambda j: j["receta"] == "banda_paralelos"
            and (j.get("limite_sur") or {}).get("dec") is not None)
    # Se sube el limite sur medio grado: la coordenada que el propio texto cita
    # como suya queda fuera de la figura.
    j["limite_sur"]["dec"] = j["limite_sur"]["dec"] + 0.5
    return (f"se subio medio grado el limite sur de {j['nombre']}, dejando fuera "
            f"una coordenada que su texto cita")


def mut_b4(v2, lac, adj):
    j = jur(v2, lambda j: j["estado_geometria"] == "cerrable"
            and j["receta"] == "banda_paralelos")
    j["estado_geometria"] = "no_cerrable"
    j["causa_sin_geometria"] = "causa inventada por la prueba de mordida"
    j["participa_matching"] = False
    return (f"se declaro no_cerrable a {j['nombre']}, que el auditor si logra "
            f"cerrar")


def mut_b5(v2, lac, adj):
    j = jur(v2, lambda j: j.get("punto_representativo")
            and j["receta"] == "banda_paralelos")
    # Se lleva el testigo muy al norte: fuera de la franja de su jurisdiccion.
    j["punto_representativo"]["lat"] = -18.0
    return f"se movio el testigo de {j['nombre']} fuera de su franja de latitud"


def mut_b6(v2, lac, adj):
    lac["jurisdicciones"][0]["id"] = "id_que_no_existe"
    return "se cambio el id de la primera entrada del cotejo lacustre"


def mut_b0_referencias(v2, lac, adj):
    """Un lado de frontera que apunta a un id inexistente.

    Esta mutacion probaba B7 hasta que la prueba descubrio que el auditor moria
    con KeyError en B2 antes de llegar alli. El control se movio a B0, delante de
    todo lo que indexa por esos ids, y por eso ahora le corresponde a B0.
    """
    f = next(x for x in v2["fronteras"] if x["tipo"] == "poligonal")
    f["lado_b"] = "jurisdiccion_inexistente"
    return f"se apunto el lado_b de la frontera {f['id']} a un id inexistente"


def mut_b7(v2, lac, adj):
    """Una jurisdiccion que referencia una frontera que no existe.

    Es lo que queda en B7 despues de mover la integridad de los lados a B0: la
    consistencia de las referencias en el sentido jurisdiccion -> frontera.
    """
    j = jur(v2, lambda j: j.get("fronteras"))
    j["fronteras"] = list(j["fronteras"]) + ["frontera_que_no_existe"]
    return f"se le agrego a {j['nombre']} una referencia a una frontera inexistente"


def mut_b8(v2, lac, adj):
    # Un tramo de litoral que es, a la vez, frontera compartida: el control
    # cruzado que motiva todo el marcado por tramos.
    for f in v2["fronteras"]:
        if f["tipo"] != "poligonal" or len(f["puntos"]) < 2:
            continue
        a, b = f["puntos"][0], f["puntos"][1]
        j = jur(v2, lambda j, i=f["lado_a"]: j["id"] == i)
        for t in (j.get("tramos") or []):
            ext = {(t["desde"]["lat"], t["desde"]["lon"]),
                   (t["hasta"]["lat"], t["hasta"]["lon"])}
            if ext == {(a["lat"], a["lon"]), (b["lat"], b["lon"])}:
                t["tipo"] = "litoral"
                j["sigue_litoral"] = True
                return (f"se marco litoral un tramo de {j['nombre']} que es la "
                        f"frontera compartida {f['id']}")
    raise SystemExit("PRUEBA MAL CONSTRUIDA: no se encontro un tramo que coincida "
                     "con una frontera compartida")


def _con_alcance(v2):
    for f in v2["fronteras"]:
        if f.get("extension"):
            return f
    raise SystemExit("PRUEBA MAL CONSTRUIDA: ninguna frontera declara alcance, y sin "
                     "eso no hay que ensanchar. Si el insumo dejo de tener fronteras "
                     "declaradas, B9 no tiene que quedar 'limpio': hay que saber que "
                     "el camino desaparecio")


def mut_b9_alcance(v2, lac, adj):
    """El defecto que motivo toda la familia: ensanchar el alcance de una frontera
    declarada. La frontera queda donde estaba — B2 no tiene nada que decir — pero
    pasa a recortar sobre latitudes que el decreto nunca le dio, y las figuras
    vecinas salen mas chicas sin que aparezca ningun error. Medido antes de escribir
    B9: con esta misma mutacion la auditoria daba exit 0."""
    f = _con_alcance(v2)
    antes = f["extension"]["lat_min"]
    f["extension"]["lat_min"] = antes - 2.0
    return (f"se ensancho el alcance de la frontera declarada {f['id']}: lat_min de "
            f"{antes} a {antes - 2.0}, dos grados que ninguna cita respalda")


def mut_b9_cita(v2, lac, adj):
    """Una frontera declarada a la que se le quita el respaldo de un lado. Es lo unico
    que distingue una frontera transcrita del decreto de un limite que alguien
    aserto: que las dos mitades esten en el texto."""
    f = next((x for x in v2["fronteras"]
              if (x.get("origen") or x.get("motivo_declaracion")) and x.get("citas")),
             None)
    if f is None:
        raise SystemExit("PRUEBA MAL CONSTRUIDA: no hay frontera declarada con citas")
    lado = next(k for k in ("lado_a", "lado_b", "lado_norte", "lado_sur")
                if f.get(k) and (f["citas"].get(f[k]) or "").strip())
    f["citas"][f[lado]] = None
    return (f"se borro la cita del decreto del {lado} de la frontera declarada "
            f"{f['id']}")


MUTACIONES = [
    ("B0", "fidelidad de la migracion", mut_b0),
    ("B1", "cierre determinado", mut_b1),
    ("B2", "vecinas en lados opuestos", mut_b2),
    ("B3", "ninguna mas chica que su descripcion", mut_b3),
    ("B4", "declaradas == no cerrables", mut_b4),
    ("B5", "punto representativo", mut_b5),
    ("B6", "adjudicacion lacustre", mut_b6),
    ("B0", "integridad referencial de los lados", mut_b0_referencias),
    ("B7", "grafo de fronteras", mut_b7),
    ("B8", "tramos del contorno", mut_b8),
    ("B9", "alcance de una frontera declarada", mut_b9_alcance),
    ("B9", "respaldo del decreto en la frontera declarada", mut_b9_cita),
]

RE_FALLO = re.compile(r"^\s*\[(B\d)\]", re.M)


def correr_auditor():
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    r = subprocess.run([sys.executable, AUDITOR], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", env=env, cwd=REPO)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def main():
    rutas = [V2, LACUSTRE, ADJUDICACION]
    originales = {r: open(r, "rb").read() for r in rutas if os.path.exists(r)}
    shas = {r: sha(r) for r in originales}

    print("FASE 4 — PRUEBA DE MORDIDA DEL AUDITOR")
    print(f"auditor: {os.path.relpath(AUDITOR, REPO)}")
    for r, h in shas.items():
        print(f"  sha256[:16] {h[:16]}  {os.path.relpath(r, REPO)}")
    print()

    code, salida = correr_auditor()
    print(f"linea base, insumo intacto: exit={code} "
          f"({'limpio' if code == 0 else 'NO LIMPIO'})")
    if code != 0:
        print("  La linea base no esta limpia. La prueba de mordida no significa nada")
        print("  sobre un insumo que ya falla: primero hay que dejarlo limpio.")
        return 2
    print()

    resultados = []
    for familia, titulo, fn in MUTACIONES:
        v2, lac = cargar(V2), cargar(LACUSTRE)
        adj = cargar(ADJUDICACION) if os.path.exists(ADJUDICACION) else None
        try:
            desc = fn(v2, lac, adj)
        except SystemExit as e:
            print(f"{familia}  PRUEBA MAL CONSTRUIDA: {e}")
            resultados.append((familia, titulo, "-", False, str(e), False))
            continue
        guardar(V2, v2)
        guardar(LACUSTRE, lac)
        if adj is not None:
            guardar(ADJUDICACION, adj)

        code, salida = correr_auditor()
        # Un crash NO es una deteccion. Antes de arreglarlo, el auditor moria con
        # KeyError en B2 y salia con el mismo codigo que 'encontre hallazgos', asi
        # que el agujero de B7 quedaba tapado por el error de ejecucion.
        roto = code == 2 or "Traceback (most recent call last)" in salida
        cazada = (not roto) and familia in set(RE_FALLO.findall(salida))
        detalle = next((ln.strip() for ln in salida.splitlines()
                        if ln.strip().startswith(f"[{familia}]")), "")

        # Restaurar SIEMPRE, y comprobar que la reversion fue exacta antes de
        # seguir: una prueba que deja el insumo tocado contamina la siguiente.
        for r, b in originales.items():
            open(r, "wb").write(b)
        malas = [os.path.relpath(r, REPO) for r in originales if sha(r) != shas[r]]
        if malas:
            print(f"{familia}  LA RESTAURACION FALLO en {malas} — se detiene")
            return 3

        marca = "caza" if cazada else ("SE ROMPE" if roto else "NO CAZA")
        print(f"{familia}  {marca:<8} exit={code}  {titulo}")
        print(f"      mutacion: {desc}")
        if detalle:
            print(f"      reporto : {detalle[:150]}")
        elif roto:
            ult = [ln for ln in salida.splitlines() if ln.strip()][-1:]
            print(f"      el auditor se ROMPIO en vez de reportar: {ult[0].strip()[:120]}")
            print(f"      un error de ejecucion no es un hallazgo: el control no mordio")
        else:
            otras = sorted(set(RE_FALLO.findall(salida)))
            print(f"      el auditor no reporto nada de {familia}"
                  + (f"; si reporto {otras}" if otras else "; salio limpio"))
        resultados.append((familia, titulo, code, cazada, detalle, roto))
        print()

    print("=" * 78)
    print("VEREDICTO DE LA PRUEBA DE MORDIDA")
    print("=" * 78)
    cazadas = [r for r in resultados if r[3]]
    print(f"  familias probadas : {len(resultados)}")
    print(f"  que cazan         : {len(cazadas)}")
    print(f"  que NO cazan      : {len(resultados) - len(cazadas)}")
    print()
    for familia, titulo, code, cazada, _, roto in resultados:
        marca = "ok   " if cazada else ("ROTO " if roto else "FALLA")
        print(f"  {marca}  {familia}  {titulo}")
    print()

    code_final, salida_final = correr_auditor()
    print(f"  insumo restaurado, auditoria final: exit={code_final}")
    for r, h in shas.items():
        estado = "intacto" if sha(r) == h else "ALTERADO"
        print(f"    {estado:<9} {os.path.relpath(r, REPO)}")

    if len(cazadas) != len(resultados):
        print()
        print("  PRUEBA NO SUPERADA: hay familias cuyo control no muerde. Un control")
        print("  que no falla ante un defecto deliberado no prueba nada, y la pasada")
        print("  limpia que lo incluya tampoco.")
        return 1
    if code_final != 0:
        print()
        print("  PRUEBA NO SUPERADA: el insumo no volvio a su estado limpio.")
        return 1
    print()
    print("  PRUEBA SUPERADA: cada familia caza su defecto, y el insumo quedo")
    print("  byte por byte como estaba.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
