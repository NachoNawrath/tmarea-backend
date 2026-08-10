"""
FASE 5 — Correcciones de transcripcion sobre el insumo fuente del D.S. 991.

INV-3.7: cuando la fuente contiene un error evidente, la correccion se aplica en
el ARCHIVO FUENTE registrando que dice el decreto, que se leyo y por que. Estas
son omisiones de transcripcion, no errores del decreto: el dato estaba en el
parrafo y no llego al campo estructurado. Mismo caso que Castro y Rio Negro
Hornopiren en la Etapa A.

Se aplica sobre data/decreto/jurisdicciones_capitanias.json (el v1), que es la
fuente. El v2 es derivado y se REGENERA con fase4_migrar_insumo_v2.py: corregir
el v2 a mano lo perderia en la proxima migracion.

El script es IDEMPOTENTE: una capitania que ya trae 'correccion_aplicada' no se
vuelve a tocar. Correrlo dos veces no cambia nada.

Autorizado por la owner el 2026-08-10, una por una, con la cita de su parrafo.

Uso (desde scripts/):
    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe fase5_correcciones_transcripcion.py
"""

import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")


def vertice_terminal(nombre, lat_dms, lat):
    """Vertice que cierra por un paralelo hacia el lado abierto.

    La longitud va nula a proposito: es 'por este paralelo hasta donde el decreto
    ya no acota'. La resuelve el migrador contra el lado abierto declarado, y deja
    constancia de que esa longitud es convencion nuestra y no del decreto. Misma
    forma que el vertice terminal de Castro.
    """
    return {"nombre": nombre, "lat_dms": lat_dms, "lon_dms": None,
            "lat": lat, "lon": None}


# ── Las correcciones, cada una con la cita literal de su parrafo ──────────────
# 'set' fija campos; 'append' y 'prepend' agregan al recorrido poligonal.
CORRECCIONES = {
    "chonchi": {
        "set": {"limite_sur_dms": "42 50 00 S", "limite_sur_dec": -42.833333},
        "append": vertice_terminal("Paralelo 42 50 00 S hacia el Weste",
                                   "42 50 00 S", -42.833333),
        "cita": ("...luego la diagonal hasta el punto ubicado en 42 55 20 S / "
                 "073 36 10 W, luego hacia el Norte por esta longitud hasta la "
                 "Latitud 42 53 10 S, desde este punto la diagonal hasta el punto "
                 "ubicado en 42 50 00 S / 073 45 00 W, SIGUIENDO POR ESTA LATITUD "
                 "HACIA EL WESTE."),
        "correccion": (
            "Omision de transcripcion, no error del decreto. El parrafo cierra con "
            "'siguiendo por esta Latitud hacia el Weste' despues de llegar a "
            "42 50 00 S / 073 45 00 W. Ese punto ya estaba en la poligonal, pero el "
            "tramo terminal quedo solo como prosa en el campo cierre y el paralelo "
            "no se declaro como limite sur. Sin limite sur, la figura se derramaba "
            "hacia el Sur: 5.997 km2 de traslape con Chaiten y 3,4 km2 con Achao, "
            "medidos el 2026-08-10. Se declara limite_sur 42 50 00 S y se agrega el vertice "
            "terminal por ese paralelo hacia el lado abierto W. Es lectura directa "
            "del parrafo, no interpretacion. Autorizado por la owner el 2026-08-10."),
    },
    "ancud": {
        "set": {"limite_sur_dms": "42 00 00 S", "limite_sur_dec": -42.0},
        "append": vertice_terminal("Paralelo 42 00 00 S hacia el Weste",
                                   "42 00 00 S", -42.0),
        "cita": ("Por el Norte, el paralelo 41 44 40 S hasta Punta Chocoi "
                 "(41 44 40 S / 073 45 00 W), y desde alli la linea imaginaria que "
                 "une Punta Chocoi con los puntos ubicados en 41 47 00 S / "
                 "073 31 30 W, 42 00 00 S / 073 00 00 W; Y DESDE ALLI HACIA EL WESTE."),
        "correccion": (
            "Omision de transcripcion, no error del decreto. El parrafo cierra con "
            "'y desde alli hacia el Weste' despues de llegar a 42 00 00 S / "
            "073 00 00 W. El vertice ya estaba en la poligonal; faltaba declarar el "
            "paralelo como limite sur y el tramo terminal. LA CONTRAPARTIDA YA "
            "ESTABA EN EL INSUMO: CP Quemchi declara 'Por el Norte el paralelo "
            "42 00 00 S desde el meridiano 073 00 00 W hacia el Weste'. Las dos "
            "mitades de la misma frontera estan en el decreto y solo faltaba este "
            "lado, igual que en Castro faltaba el suyo y Chonchi si lo declaraba. "
            "Sin limite sur, Ancud se derramaba sobre Castro, Quemchi, Achao y Rio "
            "Negro Hornopiren: 8.957 km2 de traslape sumados, medidos el 2026-08-10. "
            "Es lectura directa del parrafo, no interpretacion. Autorizado por la "
            "owner el 2026-08-10."),
    },
    "chaiten": {
        "set": {},
        "prepend": {"nombre": "Interseccion 42 30 00 S / 072 38 00 W, costa Este "
                              "estero Renihue",
                    "lat_dms": "42 30 00 S", "lon_dms": "072 38 00 W",
                    "lat": -42.5, "lon": -72.633333},
        "cita": ("Por el Norte el paralelo 42 30 00 S desde su interseccion con "
                 "Longitud 073 12 00 W hacia el Este, HASTA LA INTERSECCION DEL "
                 "PARALELO 42 30 00 S CON LA LONGITUD 072 38 00 W EN LA COSTA ESTE "
                 "DEL ESTERO RENIHUE."),
        "correccion": (
            "Omision de transcripcion, no error del decreto. El parrafo describe el "
            "limite norte corriendo por el paralelo 42 30 00 S desde 073 12 00 W "
            "hacia el Este hasta 072 38 00 W, y la poligonal arrancaba en el extremo "
            "Weste sin el extremo Este. El punto que faltaba, 42 30 00 S / "
            "072 38 00 W, YA ESTABA TRANSCRITO en la poligonal de CP Rio Negro "
            "Hornopiren, que comparte ese mismo vertice: no hubo que leerlo de nuevo, "
            "solo ponerlo tambien aqui. Se agrega al comienzo del recorrido, que "
            "queda Norte y despues Weste. Es lectura directa del parrafo, no "
            "interpretacion. Autorizado por la owner el 2026-08-10. "
            "NO SE TRANSCRIBE el cierre sur 'y desde alli hacia el Este': el propio "
            "campo cierre dice que al Este cierra contra la costa continental, y una "
            "costa no es una coordenada. Queda como los casos de Cochamo y Maullin, "
            "que dependen de la capa de costa."),
    },
}


def main():
    doc = json.load(open(V1, encoding="utf-8"))
    caps = {c["id"]: c for c in doc["capitanias"]}

    faltan = sorted(set(CORRECCIONES) - set(caps))
    if faltan:
        raise SystemExit(f"FALLO: {faltan} no existen en el insumo. No se corrige "
                         f"un id que el decreto no define.")

    cambios = 0
    for cid, corr in CORRECCIONES.items():
        cap = caps[cid]
        print("=" * 78)
        print(f"{cap['nombre']}  ({cid})")
        if cap.get("correccion_aplicada"):
            print("  YA CORREGIDA, no se toca. Registro existente:")
            print(f"    {cap['correccion_aplicada'][:120]}...")
            continue

        for k, v in corr["set"].items():
            print(f"  set      {k:<20} {cap.get(k)!r}  ->  {v!r}")
            cap[k] = v

        pc = cap.get("poligonal_completa")
        if pc is None:
            raise SystemExit(f"FALLO: {cid} no trae poligonal_completa; el vertice "
                             f"no tiene donde ir.")
        for modo in ("append", "prepend"):
            v = corr.get(modo)
            if not v:
                continue
            ya = any(p.get("lat") == v["lat"] and p.get("lon") == v["lon"] for p in pc)
            if ya:
                print(f"  {modo:<8} el vertice ya estaba; no se duplica")
                continue
            print(f"  {modo:<8} {v['lat_dms']} / {v['lon_dms'] or '(hacia el lado abierto)'}")
            if modo == "append":
                pc.append(v)
            else:
                pc.insert(0, v)

        cap["correccion_aplicada"] = corr["correccion"]
        cap["cita_correccion"] = corr["cita"]
        print(f"  cita     \"{corr['cita'][:100]}...\"")
        cambios += 1

    if not cambios:
        print()
        print("Sin cambios: las tres ya estaban aplicadas.")
        return

    with open(V1, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
    print()
    print(f"Escrito: {os.path.relpath(V1, REPO)}   ({cambios} correccion/es)")
    print()
    print("SIGUIENTE PASO OBLIGATORIO: regenerar el v2 con")
    print("  fase4_migrar_insumo_v2.py   y volver a auditar con")
    print("  fase4_auditoria_v2.py")
    print("El v2 es derivado. Sin regenerar, estas correcciones no llegan a la capa.")


if __name__ == "__main__":
    main()
