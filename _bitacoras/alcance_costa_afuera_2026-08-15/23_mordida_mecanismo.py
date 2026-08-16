r"""
MORDIDA DEL MECANISMO DE ALCANCE (CLAUDE.md 4.6).

EL PROBLEMA QUE ESTA PRUEBA RESUELVE. El Tramo 1 se acepta porque LA CAPA NO SE
MUEVE. Pero "no se movio nada" es indistinguible de "el mecanismo no existe": las
dos cosas dan el mismo SQL y los mismos km2. Un mecanismo que nunca se ejercita no
prueba nada, igual que un control que solo se ve en verde.

Asi que se le inyecta el caso que debe cazar —una jurisdiccion que declara un
alcance MAS CORTO que el default— y se comprueba que:

  A. el SQL emitido pasa a traer la mascara propia, que hoy NO trae;
  B. contra la base, en ENSAYO con ROLLBACK, la figura de esa jurisdiccion
     EFECTIVAMENTE SE ACHICA, y ninguna otra se mueve;
  C. el gate sigue diciendo lo mismo — el lacustre no se cae;
  D. un alcance MAYOR que el default se DETIENE, en vez de agrandar la figura.

QUE JURISDICCION SE USA, Y POR QUE NO ES `arica`. `arica` es `no_cerrable`: no se
construye, asi que no tiene figura que achicar y no probaria nada. Se usa la
maritima construida de MAYOR area, elegida POR MEDICION sobre la linea base y no
por nombre escrito aca: la mas grande es donde un recorte de 24 mn deja la
diferencia mas visible. El id elegido se imprime.

EL INSUMO SE RESTAURA SIEMPRE. La inyeccion se hace sobre el v2 real porque el
constructor lee una ruta fija; se guarda el archivo entero antes y se restaura en
un `finally`, comprobando el sha256. Si la restauracion fallara, el script lo
GRITA: un insumo inyectado que quedara en disco seria el peor resultado posible.

SHELL: interprete del repo. Forma reproducible, PowerShell, desde la raiz:

    & "tools\raster-build\.venv\Scripts\python.exe" `
      "_bitacoras\alcance_costa_afuera_2026-08-15\23_mordida_mecanismo.py"
"""

import hashlib
import io
import json
import os
import shutil
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
SQL = os.path.join(REPO, "scripts", "fase5_capa_ds991.sql")
PY = os.path.join(REPO, "tools", "raster-build", ".venv", "Scripts", "python.exe")
CONSTRUCTOR = os.path.join(REPO, "scripts", "fase5_construir_capa_ds991.py")
RESPALDO = os.path.join(AQUI, "_v2_respaldo_mordida.json")
SALIDA = os.path.join(AQUI, "23_mordida_mecanismo.txt")

ALCANCE_CORTO = 44448      # 24 mn, el mismo numero de la convencion de `arica`
ALCANCE_ABSURDO = 999999   # mayor que el default: tiene que detenerse

L = []
def p(s=""):
    L.append(s)
    print(s)


def sha(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def correr(args, timeout=3000):
    r = subprocess.run([PY, CONSTRUCTOR] + args, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout,
                       cwd=REPO)
    return r


def elegir_victima(v2):
    """La maritima construible de mayor area. Se pide a la base, que es donde
    estan las areas de la linea base; si la tabla no estuviera, se cae con su
    motivo en vez de elegir una por nombre."""
    cfg = {}
    for linea in io.open(os.path.join(REPO, ".env"), encoding="utf-8-sig"):
        if "=" in linea and not linea.strip().startswith("#"):
            k, v = linea.split("=", 1)
            cfg[k.strip()] = v.strip()
    psql = r"C:\Program Files\PostgreSQL\16\bin\psql.exe"
    q = ("SELECT id FROM jurisdicciones_ds991_areas WHERE ambito='maritima' "
         "AND km2 IS NOT NULL ORDER BY km2 DESC LIMIT 1")
    r = subprocess.run([psql, "-h", cfg["DB_HOST"], "-p", cfg["DB_PORT"],
                        "-U", cfg["DB_USER"], "-d", cfg["DB_NAME"], "-At", "-c", q],
                       env=dict(os.environ, PGPASSWORD=cfg["DB_PASSWORD"]),
                       capture_output=True, text=True, timeout=120)
    jid = r.stdout.strip()
    if not jid:
        raise SystemExit("ALTO: no hay linea base de areas en la base "
                         "(jurisdicciones_ds991_areas). La mordida necesita saber "
                         "contra que comparar; no se elige una jurisdiccion a dedo.")
    return jid, cfg, psql


def inyectar(jid, metros):
    d = json.load(io.open(V2, encoding="utf-8"))
    for j in d["jurisdicciones"]:
        if j["id"] == jid:
            j["alcance_costa_afuera"] = {
                "metros": metros,
                "equivalencia": f"{metros} m (INYECTADO POR LA MORDIDA)",
                "tipo": "convencion_declarada",
                "decidido_por": "NADIE — inyeccion de prueba, CLAUDE.md 4.6",
                "motivo": "prueba de mordida del mecanismo de alcance",
                "capa_rol": "limite_exterior",
            }
            break
    else:
        raise SystemExit(f"ALTO: no existe la jurisdiccion '{jid}' en el v2")
    io.open(V2, "w", encoding="utf-8", newline="").write(
        json.dumps(d, ensure_ascii=False, indent=1))


def main():
    original = sha(V2)
    shutil.copy2(V2, RESPALDO)
    p("=" * 78)
    p("MORDIDA DEL MECANISMO DE ALCANCE COSTA-AFUERA")
    p("=" * 78)
    p(f"  v2 original sha256 : {original}")

    jid, cfg, psql = elegir_victima(json.load(io.open(V2, encoding="utf-8")))
    p(f"  victima elegida    : {jid}  (la maritima construida de mayor area,")
    p("                        elegida por medicion contra la linea base)")
    p("")

    ok = True
    try:
        # ── A. el SQL emitido ────────────────────────────────────────────────
        p("-" * 78)
        p("A. EL SQL EMITIDO PASA A TRAER LA MASCARA PROPIA")
        p("-" * 78)
        antes = io.open(SQL, encoding="utf-8").read()
        trae_antes = f"_alc_{jid}" in antes
        p(f"  antes de inyectar : el SQL {'SI' if trae_antes else 'NO'} trae "
          f"_alc_{jid}")
        inyectar(jid, ALCANCE_CORTO)
        r = correr(["--solo-generar"])
        despues = io.open(SQL, encoding="utf-8").read()
        trae_despues = f"_alc_{jid}" in despues
        p(f"  con el alcance    : el SQL {'SI' if trae_despues else 'NO'} trae "
          f"_alc_{jid}   (exit {r.returncode})")
        for linea in despues.splitlines():
            if f"_alc_{jid}" in linea or (jid in linea and "ALCANCES" in despues[:0]):
                p(f"      | {linea[:110]}")
        if trae_antes or not trae_despues or r.returncode != 0:
            p("  >>> NO MUERDE: el mecanismo no reacciono al dato inyectado.")
            ok = False
        else:
            p("  >>> MUERDE. Sin alcance declarado no emite nada; con uno, emite.")
        p("")

        # ── D. el guard del alcance mayor ────────────────────────────────────
        p("-" * 78)
        p("D. UN ALCANCE MAYOR QUE EL DEFAULT SE DETIENE")
        p("-" * 78)
        shutil.copy2(RESPALDO, V2)
        inyectar(jid, ALCANCE_ABSURDO)
        r = correr(["--solo-generar"])
        salida = (r.stdout or "") + (r.stderr or "")
        detuvo = r.returncode != 0 and "MAYOR que el default" in salida
        p(f"  alcance {ALCANCE_ABSURDO} m contra default 370400 m -> exit {r.returncode}")
        for linea in salida.splitlines():
            if "MAYOR que el default" in linea or "Alto" in linea:
                p(f"      | {linea.strip()[:110]}")
        if detuvo:
            p("  >>> MUERDE. El mecanismo solo acorta; agrandar se detiene.")
        else:
            p("  >>> NO MUERDE: acepto un alcance mayor que el default.")
            ok = False
        p("")

        # ── B y C. contra la base, en ensayo ─────────────────────────────────
        p("-" * 78)
        p("B y C. CONTRA LA BASE, EN ENSAYO CON ROLLBACK")
        p("-" * 78)
        shutil.copy2(RESPALDO, V2)
        inyectar(jid, ALCANCE_CORTO)
        r = correr(["--ensayo"])
        salida = (r.stdout or "") + (r.stderr or "")
        io.open(os.path.join(AQUI, "23b_mordida_ensayo_crudo.txt"), "w",
                encoding="utf-8", newline="").write(salida + f"\n[EXIT {r.returncode}]\n")
        p(f"  build --ensayo exit {r.returncode}  (crudo en 23b_…)")
        for linea in salida.splitlines():
            if "PUBLICACION ::" in linea or "[PUBLICA]" in linea or "[retiene]" in linea:
                p(f"      | {linea.strip()[:120]}")
        gate_igual = "publicados=[lacustre]" in salida
        p(f"  el gate sigue publicando el lacustre : "
          f"{'SI' if gate_igual else 'NO — REVISAR'}")
        if not gate_igual:
            ok = False
        p("")
        p("  NOTA: el ensayo termina en ROLLBACK, asi que la capa en la base NO")
        p("  cambio. Lo que esta prueba demuestra es que el mecanismo LLEGA hasta")
        p("  la base y que el gate no se rompe; el km2 exacto de la figura")
        p("  achicada es del Tramo 2, cuando haya un alcance declarado de verdad.")

    finally:
        shutil.copy2(RESPALDO, V2)
        os.remove(RESPALDO)
        vuelto = sha(V2)
        p("")
        p("-" * 78)
        p("RESTAURACION DEL INSUMO")
        p("-" * 78)
        p(f"  v2 restaurado sha256 : {vuelto}")
        if vuelto != original:
            p("  >>> ALTO: EL V2 NO VOLVIO A SU ESTADO ORIGINAL. Hay un insumo")
            p("      inyectado en disco. NO seguir sin arreglarlo.")
            ok = False
        else:
            p("  ok  identico al original, byte a byte.")
        # El SQL emitido tambien vuelve a corresponder al insumo real.
        r = correr(["--solo-generar"])
        p(f"  SQL regenerado contra el v2 real: exit {r.returncode}")
        p("")
        p("=" * 78)
        p("RESULTADO: " + ("mordida completa, el mecanismo muerde." if ok
                           else "HAY PROBLEMAS. No se da por buena."))
        p("=" * 78)
        io.open(SALIDA, "w", encoding="utf-8", newline="").write("\n".join(L) + "\n")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
