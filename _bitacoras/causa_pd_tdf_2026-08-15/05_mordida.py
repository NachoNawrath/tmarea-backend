"""LA MORDIDA — CLAUDE.md 4.6: DESPUES DE TOCAR UN CONTROL, SE COMPRUEBA QUE SIGUE
MORDIENDO. Se le inyecta el defecto que debe cazar y se confirma que lo caza.

Esta pieza toco DOS controles y los dos se muerden aca:

  A. `verificar_v2_contra_v1.py` — se le retiraron tres permisos: las dos
     `DIVERGENCIAS_ABIERTAS` (que ahora quedan cerradas) y los dos bloques que
     perdonaba a `fase5_registrar_toponimos_igm.py`. Un control al que se le
     sacan permisos puede quedar mordiendo o puede quedar roto, y la unica forma
     de saberlo es rompiendo el dato a proposito.

  B. `fase5_registrar_toponimos_igm.py` — dejo de escribir y paso a verificar.
     Un verificador que no puede fallar es peor que el escritor que reemplazo.

LOS CUATRO DEFECTOS, y por que cada uno:

  A1  la causa vieja de vuelta en el v2. Es LA divergencia que esta pieza cerro.
      Antes salia 3 porque estaba declarada; ahora tiene que salir 1.
  A2  `derivado_de` desfasado. Es el paso que se olvida — el owner lo nombro
      explicitamente: da exit 1, no 3, y por eso hay que verlo fallar.
  A3  un `puntos_notables` del v2 modificado. **Este defecto NO se cazaba antes
      de esta pieza**: la lista tenia permiso de apendice y el prefijo solo
      cubria los 72 primeros, asi que tocar uno de los 4 del IGM pasaba limpio.
      Que muerda es la prueba de que retirar el permiso aprieta de verdad.
  B1  un toponimo sacado del v1. El verificador nuevo tiene que dar ALTO.

COMO SE PROTEGE EL DATO REAL. Se guardan los BYTES de los dos insumos antes de
tocar nada y se restauran en un `finally`, y al final se comprueba por sha256
que los dos volvieron exactamente a donde estaban. Si no volvieron, este script
lo dice a gritos en vez de terminar en verde. La salida del control durante la
mordida va a un archivo temporal, no a la bitacora: una corrida con el dato roto
no es evidencia de nada y no se versiona.

SHELL DECLARADA (CLAUDE.md 7.3) — en PowerShell, desde la raiz:

    cd C:\\Users\\katia\\tmarea-backend
    .\\tools\\raster-build\\.venv\\Scripts\\python.exe _bitacoras\\causa_pd_tdf_2026-08-15\\05_mordida.py
"""

import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
PY = sys.executable
CONTROL = os.path.join(REPO, "_bitacoras", "arica_limite_norte_2026-08-15",
                       "verificar_v2_contra_v1.py")
TOPONIMOS = os.path.join(REPO, "scripts", "fase5_registrar_toponimos_igm.py")

CAUSA_VIEJA = ("El decreto define sus limites solo por accidentes geograficos sin "
               "coordenadas. Pendiente de carta SHOA. El motor NO debe evaluarla "
               "en silencio: si una ruta cae en esta zona, avisar que el limite no "
               "esta cargado.")


def sha(ruta):
    with open(ruta, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def leer(ruta):
    return json.load(io.open(ruta, encoding="utf-8"))


def escribir(ruta, d, indent):
    with open(ruta, "w", encoding="utf-8") as fh:
        json.dump(d, fh, ensure_ascii=False, indent=indent, sort_keys=False)


def correr(script, args=()):
    tmp = tempfile.mktemp(suffix=".txt")
    try:
        r = subprocess.run([PY, script, *args, *( [tmp] if not args else [] )],
                           capture_output=True, text=True, cwd=REPO)
        return r.returncode
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def control():
    """Corre el control mandando su .txt a un temporal. Devuelve el exit."""
    tmp = tempfile.mktemp(suffix=".txt")
    try:
        r = subprocess.run([PY, CONTROL, tmp], capture_output=True, text=True,
                           cwd=REPO)
        return r.returncode
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def verificador():
    r = subprocess.run([PY, TOPONIMOS], capture_output=True, text=True, cwd=REPO)
    return r.returncode


def main():
    L = []
    A = L.append
    A("=" * 78)
    A("MORDIDA DE LOS DOS CONTROLES QUE ESTA PIEZA TOCO — CLAUDE.md 4.6")
    A("=" * 78)
    A("")

    sha1_0, sha2_0 = sha(V1), sha(V2)
    A(f"  v1 antes  sha256 {sha1_0}")
    A(f"  v2 antes  sha256 {sha2_0}")
    A("")

    bytes1 = open(V1, "rb").read()
    bytes2 = open(V2, "rb").read()

    casos, fallos = [], 0
    try:
        # ── linea base ───────────────────────────────────────────────────────
        c = control()
        casos.append(("BASE", "el dato como quedo, sin defecto", 0, c,
                      "el control tiene que pasar antes de creerle a cualquier rojo"))

        # ── A1 ───────────────────────────────────────────────────────────────
        v2 = leer(V2)
        for j in v2["jurisdicciones"]:
            if j["id"] == "punta_delgada":
                j["causa_sin_geometria"] = CAUSA_VIEJA
        escribir(V2, v2, 1)
        c = control()
        casos.append(("A1", "la causa VIEJA de vuelta en el v2 (punta_delgada)",
                      1, c, "antes salia 3 por declarada; ahora es divergencia "
                            "NO declarada"))
        open(V2, "wb").write(bytes2)

        # ── A2 ───────────────────────────────────────────────────────────────
        v2 = leer(V2)
        v2["derivado_de"]["jurisdicciones_capitanias.json"] = "0" * 64
        escribir(V2, v2, 1)
        c = control()
        casos.append(("A2", "`derivado_de` desfasado (el paso que se olvida)",
                      1, c, "da 1 y no 3: no es una divergencia declarada, es el "
                            "v2 declarando derivar de un v1 que no esta"))
        open(V2, "wb").write(bytes2)

        # ── A3 ───────────────────────────────────────────────────────────────
        v2 = leer(V2)
        for p in v2["puntos_notables"]:
            if p["nombre"] == "Cabo San Vicente":
                p["lat"] = p["lat"] + 0.01
        escribir(V2, v2, 1)
        c = control()
        casos.append(("A3", "un toponimo del IGM movido 0,01° en el v2",
                      1, c, "ESTE NO SE CAZABA ANTES: el permiso de apendice "
                            "sobre `puntos_notables` lo dejaba pasar"))
        open(V2, "wb").write(bytes2)

        # ── B1 ───────────────────────────────────────────────────────────────
        v1 = leer(V1)
        v1["puntos_notables"] = [p for p in v1["puntos_notables"]
                                 if p["nombre"] != "Punta Harry"]
        escribir(V1, v1, 2)
        c = verificador()
        casos.append(("B1", "`Punta Harry` sacado del v1",
                      2, c, "el verificador nuevo tiene que dar ALTO: la causa "
                            "que nombra ese punto quedaria mintiendo"))
        open(V1, "wb").write(bytes1)

    finally:
        open(V1, "wb").write(bytes1)
        open(V2, "wb").write(bytes2)

    A("LOS CASOS")
    A("-" * 78)
    for cid, que, esperado, real, por_que in casos:
        ok = esperado == real
        fallos += 0 if ok else 1
        A(f"  {'CAZADO' if ok else 'NO CAZO':<8} {cid:<5} {que}")
        A(f"           esperaba exit {esperado} · dio exit {real}")
        A(f"           {por_que}")
    A("")

    A("EL DATO REAL VOLVIO A DONDE ESTABA")
    A("-" * 78)
    sha1_1, sha2_1 = sha(V1), sha(V2)
    intacto = (sha1_0 == sha1_1) and (sha2_0 == sha2_1)
    A(f"  v1 despues sha256 {sha1_1}   {'ok' if sha1_0 == sha1_1 else 'NO VOLVIO'}")
    A(f"  v2 despues sha256 {sha2_1}   {'ok' if sha2_0 == sha2_1 else 'NO VOLVIO'}")
    if not intacto:
        A("  ALTO: la mordida dejo el dato movido. Restaurar desde git ANTES de")
        A("        creerle una sola linea de esta corrida.")
    A("")

    A("=" * 78)
    if fallos == 0 and intacto:
        A("VEREDICTO: LOS DOS CONTROLES MUERDEN — exit 0.")
        A("           Los 4 defectos se cazaron y el dato quedo intacto.")
        codigo = 0
    else:
        A(f"VEREDICTO: {fallos} defecto(s) NO cazado(s)"
          f"{' y el dato NO volvio' if not intacto else ''} — exit 1.")
        codigo = 1
    A("=" * 78)

    texto = "\n".join(L) + "\n"
    with io.open(os.path.join(AQUI, "05_mordida.txt"), "w",
                 encoding="utf-8", newline="\n") as fh:
        fh.write(texto)
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    print(texto)
    return codigo


if __name__ == "__main__":
    sys.exit(main())
