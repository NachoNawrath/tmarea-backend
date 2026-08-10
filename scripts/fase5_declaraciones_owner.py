"""
FASE 5 — Decisiones del owner del 2026-08-10, registradas en la fuente.

Dos, las dos con la cita de su parrafo:

  1. CHAITEN. El tramo del paralelo 42 30 00 S es FRONTERA, no litoral. Se
     registra en data/decreto/adjudicacion_tramos.json, que es donde vive la
     decision del owner sobre que dice el decreto.

  2. QUEMCHI x RIO NEGRO HORNOPIREN. Se declara la frontera del meridiano
     073 00 00 W entre 42 00 00 S y 42 30 00 S. Se registra en el campo
     'fronteras_declaradas' de data/decreto/jurisdicciones_capitanias.json.
     La derivacion automatica no la ve porque exige que las dos jurisdicciones
     transcriban los mismos vertices, y el parrafo de Quemchi da el meridiano
     como extremo Este de su limite norte, no como vertice de su cadena.

Se descarto el otro camino — extender el contorno de Quemchi a un recorrido
completo — porque le cambia la receta y eso es reescribir como el decreto la
describe, no transcribirla.

IDEMPOTENTE: lo ya registrado no se vuelve a escribir.

Uso (desde scripts/):
    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe fase5_declaraciones_owner.py
"""

import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
ADJ = os.path.join(REPO, "data", "decreto", "adjudicacion_tramos.json")

AUTORIZACION = "Autorizado por la owner el 2026-08-10."

# ── 1. Adjudicacion del tramo de Chaiten ─────────────────────────────────────
TRAMO_CHAITEN = {
    "jurisdiccion": "chaiten",
    "nombre": "Chaiten",
    "desde": {"lat": -42.5, "lon": -72.633333,
              "nombre": "Interseccion 42 30 00 S / 072 38 00 W, costa Este estero Renihue"},
    "hasta": {"lat": -42.5, "lon": -73.2, "nombre": None},
    "tipo_propuesto": "litoral",
    "tipo_adjudicado": "frontera",
    "resolucion": "corregido",
    "fragmento_decreto": "en la costa Este del estero Renihue; por el Weste, el meridiano",
    "motivo": (
        "La propuesta automatica leyo 'en la costa Este del estero Renihue', que "
        "ubica DONDE TERMINA el paralelo y no describe como se avanza por el tramo. "
        "El tramo es el paralelo 42 30 00 S entre 072 38 00 W y 073 12 00 W: una "
        "linea imaginaria, no un trazo de costa. Ademas es el MISMO SEGMENTO que CP "
        "Rio Negro Hornopiren declara como su limite sur ('luego por el paralelo "
        "42 30 00 S hacia el Weste hasta la Longitud 073 00 00 W'), y ahi ya esta "
        "marcado frontera: marcarlo litoral aqui dejaria la misma linea con dos "
        "tipos distintos segun quien la mire. Aplica el criterio ya registrado: "
        "'Una mencion que ubica un vertice no convierte en litoral al tramo que "
        "empieza ahi'. " + AUTORIZACION),
}

# ── 2. Frontera declarada Quemchi x Rio Negro Hornopiren ─────────────────────
FRONTERA_QUEMCHI_HORNOPIREN = {
    "id": "pol__quemchi__hornopiren",
    "lado_a": "quemchi",
    "lado_b": "hornopiren",
    "puntos": [
        {"lat": -42.0, "lon": -73.0, "lat_dms": "42 00 00 S", "lon_dms": "073 00 00 W"},
        {"lat": -42.5, "lon": -73.0, "lat_dms": "42 30 00 S", "lon_dms": "073 00 00 W"},
    ],
    "cita_lado_a": (
        "CP Quemchi: 'Por el Norte el paralelo 42 00 00 S DESDE EL MERIDIANO "
        "073 00 00 W hacia el Weste'. El meridiano es el extremo Este de su limite "
        "norte."),
    "cita_lado_b": (
        "CP Rio Negro Hornopiren: '...luego por el paralelo 42 30 00 S hacia el "
        "Weste hasta la Longitud 073 00 00 W, CONTINUANDO POR ESTE MERIDIANO HACIA "
        "EL NORTE HASTA LA LATITUD 42 00 00 S'. El meridiano es su borde Weste, "
        "entre esas dos latitudes."),
    "motivo_declaracion": (
        "Las dos mitades estan en el decreto y la derivacion automatica no las une: "
        "exige que las dos jurisdicciones transcriban los mismos vertices, y Quemchi "
        "nombra el meridiano como extremo de su limite norte, no como vertice de su "
        "cadena — su rol_cadena es 'S', o sea la cadena transcrita es su borde sur. "
        "Meter ahi un vertice del borde norte inventaria un segmento que el decreto "
        "no describe. Es el mismo patron de Ancud: la contrapartida existia y solo "
        "faltaba el lado. EXTENSION: el meridiano vale ENTRE 42 00 00 S y "
        "42 30 00 S, que es lo unico que el parrafo de Hornopiren entrega. Fuera de "
        "esas dos latitudes esta frontera no dice nada y no puede recortar. "
        + AUTORIZACION),
}


def escribir_json(ruta, doc):
    """Reescribe conservando la sangria que el archivo ya tenia.

    Un json.dump con la sangria por defecto reescribe el archivo entero y sepulta
    el cambio real bajo cientos de lineas de diff. En un archivo versionado que
    registra decisiones del owner, el diff ES la evidencia de que se decidio.
    """
    crudo = open(ruta, encoding="utf-8").read()
    lineas = [l for l in crudo.splitlines() if l.strip()]
    sangria = len(lineas[1]) - len(lineas[1].lstrip()) if len(lineas) > 1 else 2
    with open(ruta, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(doc, ensure_ascii=False, indent=sangria))


def main():
    # ── 1 ────────────────────────────────────────────────────────────────────
    adj = json.load(open(ADJ, encoding="utf-8"))
    clave = lambda r: (r["jurisdiccion"], round(r["desde"]["lat"], 6),          # noqa: E731
                       round(r["desde"]["lon"], 6), round(r["hasta"]["lat"], 6),
                       round(r["hasta"]["lon"], 6))
    ya = {clave(r) for r in adj["tramos"]}
    print("=" * 78)
    print("1. ADJUDICACION DEL TRAMO DE CHAITEN")
    print("=" * 78)
    if clave(TRAMO_CHAITEN) in ya:
        print("  YA REGISTRADA, no se toca.")
    else:
        adj["tramos"].append(TRAMO_CHAITEN)
        c = adj.setdefault("conteo", {})
        c["total"] = len(adj["tramos"])
        c["litoral"] = sum(1 for t in adj["tramos"] if t["tipo_adjudicado"] == "litoral")
        c["frontera"] = sum(1 for t in adj["tramos"] if t["tipo_adjudicado"] == "frontera")
        c["corregidos"] = sum(1 for t in adj["tramos"] if t["resolucion"] == "corregido")
        escribir_json(ADJ, adj)
        print(f"  {TRAMO_CHAITEN['desde']['lat']}, {TRAMO_CHAITEN['desde']['lon']}"
              f"  ->  {TRAMO_CHAITEN['hasta']['lat']}, {TRAMO_CHAITEN['hasta']['lon']}")
        print(f"  litoral -> frontera   resolucion=corregido")
        print(f"  conteo ahora: {json.dumps(c, ensure_ascii=False)}")

    # ── 2 ────────────────────────────────────────────────────────────────────
    v1 = json.load(open(V1, encoding="utf-8"))
    decl = v1.setdefault("fronteras_declaradas", [])
    print()
    print("=" * 78)
    print("2. FRONTERA DECLARADA QUEMCHI x RIO NEGRO HORNOPIREN")
    print("=" * 78)
    if any(d.get("id") == FRONTERA_QUEMCHI_HORNOPIREN["id"] for d in decl):
        print("  YA REGISTRADA, no se toca.")
    else:
        decl.append(FRONTERA_QUEMCHI_HORNOPIREN)
        escribir_json(V1, v1)
        print(f"  id       {FRONTERA_QUEMCHI_HORNOPIREN['id']}")
        print(f"  lados    {FRONTERA_QUEMCHI_HORNOPIREN['lado_a']} | "
              f"{FRONTERA_QUEMCHI_HORNOPIREN['lado_b']}")
        for p in FRONTERA_QUEMCHI_HORNOPIREN["puntos"]:
            print(f"  punto    {p['lat_dms']} / {p['lon_dms']}")

    # ── verificacion de extension, que es lo que pidio la owner ──────────────
    pts = FRONTERA_QUEMCHI_HORNOPIREN["puntos"]
    lats = sorted(p["lat"] for p in pts)
    lons = {p["lon"] for p in pts}
    print()
    print("  VERIFICACION DE EXTENSION")
    print(f"    longitudes distintas en la frontera : {sorted(lons)}")
    assert lons == {-73.0}, "la frontera no corre por un unico meridiano"
    print(f"    latitud minima declarada            : {lats[0]}   (42 30 00 S)")
    print(f"    latitud maxima declarada            : {lats[-1]}   (42 00 00 S)")
    assert lats == [-42.5, -42.0], "la extension no es la que entrega el decreto"
    print("    ok  es el meridiano 073 00 00 W ENTRE 42 00 00 S y 42 30 00 S,")
    print("        no el meridiano completo.")
    print()
    print("  QUE ALCANZA A RECORTAR, MEDIDO CONTRA LA BANDA DE CADA LADO")
    caps = {c["id"]: c for c in v1["capitanias"]}
    q = caps["quemchi"]
    qn, qs = q["limite_norte_dec"], q["limite_sur_dec"]
    print(f"    Quemchi vive entre {qn} y {qs}")
    dentro = lats[0] <= qs and qn <= lats[-1]
    print(f"    su banda cae entera dentro de la extension de la frontera: "
          f"{'SI' if dentro else 'NO'}")
    print("    -> sobre Quemchi la frontera no puede recortar de mas: no existe")
    print("       Quemchi fuera del tramo declarado.")
    print("    Rio Negro Hornopiren llega hasta 41 54 42 S (-41.911667), o sea")
    print("    0,088 grados AL NORTE del extremo de la frontera. Ahi la frontera")
    print("    ya no dice nada, y el constructor NO puede prolongarla: hay que")
    print("    medirlo al construir.")


if __name__ == "__main__":
    main()
