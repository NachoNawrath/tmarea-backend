r"""
COMPARADOR DE AREAS — la aceptacion del Tramo 1: LA CAPA NO SE MOVIO.

Contrasta `jurisdicciones_ds991_areas` de la base contra la linea base que se
volco a 22_areas_antes.csv, jurisdiccion por jurisdiccion.

UNA TRAMPA QUE CASI SE LLEVA ESTA MEDICION, ESCRITA PARA LA PROXIMA SESION:
`jurisdicciones_ds991_areas` ES A LA VEZ LA LINEA BASE Y UNA SALIDA DEL BUILD. El
constructor la DROPea y la vuelve a crear dentro de su transaccion, asi que en
cuanto el build commitea, la linea base DEJA DE EXISTIR. Hay que volcarla ANTES.
Aca se volco con el build ya corriendo y todavia sin commitear —la transaccion
abierta no la habia borrado para las demas sesiones—, que salio bien por poco. La
forma correcta es volcarla antes de lanzar el build.

NO SE COMPARA EL TOTAL, SE COMPARA FILA POR FILA. Dos totales iguales no prueban
que ninguna figura se movio: una que gana lo que otra pierde da el mismo total. Y
se imprimen las tres cifras —cuantas suben, cuantas bajan, cuantas quedan— porque
el neto esconde que el borde se movio en los dos sentidos, que es la leccion que
este repositorio ya pago en la sesion del operador.

SHELL: interprete del repo. Forma reproducible, PowerShell, desde la raiz:

    & "tools\raster-build\.venv\Scripts\python.exe" `
      "_bitacoras\alcance_costa_afuera_2026-08-15\22_comparar_areas.py"
"""

import csv
import io
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
ANTES = os.path.join(AQUI, "22_areas_antes.csv")
DESPUES = os.path.join(AQUI, "22_areas_despues.csv")
SALIDA = os.path.join(AQUI, "22_areas_antes_despues.txt")
PSQL = r"C:\Program Files\PostgreSQL\16\bin\psql.exe"

# Tolerancia de comparacion. Es UMBRAL TECNICO (CLAUDE.md 0.4): no decide nada de
# lo que el patron ve, sirve para no confundir ruido de coma flotante con un
# cambio real. Las areas vienen redondeadas a 2 decimales desde el SQL, asi que
# cualquier diferencia real es >= 0,01 km2.
TOL = 0.005

L = []
def p(s=""):
    L.append(s)
    print(s)


def leer_env():
    cfg = {}
    for linea in io.open(os.path.join(REPO, ".env"), encoding="utf-8-sig"):
        if "=" in linea and not linea.strip().startswith("#"):
            k, v = linea.split("=", 1)
            cfg[k.strip()] = v.strip()
    return cfg


def volcar(cfg, destino):
    q = ("COPY (SELECT id,nombre,ambito,estado_geometria,km2,vertices,piezas "
         "FROM jurisdicciones_ds991_areas ORDER BY id) TO STDOUT WITH CSV HEADER")
    r = subprocess.run([PSQL, "-h", cfg["DB_HOST"], "-p", cfg["DB_PORT"],
                        "-U", cfg["DB_USER"], "-d", cfg["DB_NAME"], "-c", q],
                       env=dict(os.environ, PGPASSWORD=cfg["DB_PASSWORD"]),
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=300)
    if r.returncode != 0 or not r.stdout.strip():
        raise SystemExit(f"ALTO: no se pudo volcar la tabla de areas.\n{r.stderr[:400]}")
    io.open(destino, "w", encoding="utf-8", newline="").write(r.stdout)


def cargar(ruta):
    with io.open(ruta, encoding="utf-8", newline="") as fh:
        return {f["id"]: f for f in csv.DictReader(fh)}


def num(v):
    return None if v in (None, "", "\\N") else float(v)


def main():
    if not os.path.exists(ANTES):
        raise SystemExit(f"ALTO: falta la linea base {os.path.relpath(ANTES, REPO)}. "
                         f"Sin ella no hay contra que comparar y NO se inventa una.")
    cfg = leer_env()
    volcar(cfg, DESPUES)
    a, b = cargar(ANTES), cargar(DESPUES)

    p("=" * 78)
    p("AREAS POR JURISDICCION — ANTES CONTRA DESPUES")
    p("=" * 78)
    p(f"  antes  : {len(a)} filas   ({os.path.relpath(ANTES, REPO)})")
    p(f"  despues: {len(b)} filas   (jurisdicciones_ds991_areas, recien construida)")
    p("")

    faltan = sorted(set(a) - set(b))
    sobran = sorted(set(b) - set(a))
    if faltan:
        p(f"  DESAPARECIERON: {faltan}")
    if sobran:
        p(f"  APARECIERON   : {sobran}")

    suben, bajan, quedan, estado_cambio = [], [], 0, []
    for jid in sorted(set(a) & set(b)):
        ka, kb = num(a[jid]["km2"]), num(b[jid]["km2"])
        if a[jid]["estado_geometria"] != b[jid]["estado_geometria"]:
            estado_cambio.append(
                (jid, a[jid]["estado_geometria"], b[jid]["estado_geometria"]))
        if ka is None and kb is None:
            quedan += 1
            continue
        if ka is None or kb is None:
            suben.append((jid, ka, kb, None))
            continue
        d = kb - ka
        if d > TOL:
            suben.append((jid, ka, kb, d))
        elif d < -TOL:
            bajan.append((jid, ka, kb, d))
        else:
            quedan += 1

    p("-" * 78)
    p("LAS TRES CIFRAS, NO EL NETO")
    p("-" * 78)
    p(f"  suben  : {len(suben)}")
    p(f"  bajan  : {len(bajan)}")
    p(f"  quedan : {quedan}   (dentro de {TOL} km2)")
    for etiqueta, lista in (("SUBEN", suben), ("BAJAN", bajan)):
        for jid, ka, kb, d in lista:
            p(f"    [{etiqueta}] {jid:<22} {ka} -> {kb}"
              + (f"   ({d:+.2f} km2)" if d is not None else "   (de/a NULL)"))
    p("")

    p("-" * 78)
    p("CAMBIOS DE estado_geometria")
    p("-" * 78)
    if estado_cambio:
        for jid, ea, eb in estado_cambio:
            p(f"    {jid:<22} {ea} -> {eb}")
    else:
        p("    ninguno.")
    p("")

    # Totales por ambito, al lado y no en lugar de lo de arriba.
    p("-" * 78)
    p("TOTALES POR AMBITO (constancia, NO es la comprobacion)")
    p("-" * 78)
    for fuente, nombre in ((a, "antes"), (b, "despues")):
        por = {}
        for f in fuente.values():
            k = num(f["km2"])
            if k is not None:
                por[f["ambito"]] = por.get(f["ambito"], 0.0) + k
        p(f"  {nombre:<8}" + "   ".join(f"{amb}={v:,.1f}" for amb, v in sorted(por.items())))
    p("")

    ok = not suben and not bajan and not faltan and not sobran and not estado_cambio
    p("=" * 78)
    if ok:
        p("RESULTADO: LA CAPA NO SE MOVIO. Ninguna jurisdiccion cambio de area ni")
        p("de estado. Es la aceptacion del Tramo 1.")
    else:
        p("RESULTADO: LA CAPA SE MOVIO. El Tramo 1 se acepta SOLO si no se mueve;")
        p("esto hay que explicarlo antes de darlo por bueno.")
    p("=" * 78)
    io.open(SALIDA, "w", encoding="utf-8", newline="").write("\n".join(L) + "\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
