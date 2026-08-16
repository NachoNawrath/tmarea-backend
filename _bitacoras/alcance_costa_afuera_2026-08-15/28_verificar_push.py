r"""
VERIFICACION DEL PUSH POR BLOB-SHA CONTRA LA API DE GITHUB.

POR QUE POR BLOB-SHA Y NO "git push dijo ok". `git push` informa que la
referencia se movio; no prueba que el CONTENIDO que quedo del otro lado sea el
que se subio. El blob-sha si: es el hash del objeto que GitHub tiene guardado, y
compararlo contra el que `git ls-tree` calcula localmente cierra el circulo.

HECHOS DE MAQUINA QUE ESTA VERIFICACION TIENE QUE RESPETAR:

  · `gh` NO ESTA INSTALADO. Se usa curl.exe —el ejecutable, no el alias de
    PowerShell— contra la API REST.

  · `git ls-tree` SEPARA EL PATH POR TAB, NO POR ESPACIO. El formato es
    "<modo> <tipo> <sha>\t<path>". Parsear por espacio parte los nombres con
    espacio y simula archivos huerfanos. Aca se corta por TAB, una sola vez.

  · SI EL LADO API VIENE VACIO SON 0 COMPARACIONES, NO 0 DISCREPANCIAS. Un
    listado remoto vacio y un listado remoto identico dan los dos "ninguna
    diferencia" si uno cuenta diferencias en vez de contar comparaciones. Este
    script cuenta COMPARACIONES y falla si son cero.

LA RUTA DE SALIDA VA POR ARGUMENTO, y no es adorno. Este control se corre una vez
por commit, y la salida por defecto vive en el directorio de UNA sesion: correrlo
de nuevo PISA LA CONSTANCIA del commit anterior. Es exactamente lo que le paso a
`verificar_v2_contra_v1.py` el 2026-08-15, y la correccion es la misma (CLAUDE.md
3.3: una bitacora publicada es constancia, no se sobrescribe).

SHELL: interprete del repo. Forma reproducible, PowerShell, desde la raiz:

    & "tools\raster-build\.venv\Scripts\python.exe" `
      "_bitacoras\alcance_costa_afuera_2026-08-15\28_verificar_push.py" `
      8267461 "_bitacoras\alcance_costa_afuera_2026-08-15\28_verificar_push.txt"
"""

import io
import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
OWNER, NOMBRE = "NachoNawrath", "tmarea-backend"
SALIDA_POR_DEFECTO = os.path.join(AQUI, "28_verificar_push.txt")

L = []
def p(s=""):
    L.append(s)
    print(s)


def git(*args):
    r = subprocess.run(["git"] + list(args), cwd=REPO, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise SystemExit(f"ALTO: git {' '.join(args)} -> {r.returncode}\n{r.stderr[:400]}")
    return r.stdout


def api(ruta):
    """curl.exe contra la API. gh no esta instalado."""
    url = f"https://api.github.com/repos/{OWNER}/{NOMBRE}/{ruta}"
    r = subprocess.run(["curl.exe", "-sS", "-H", "Accept: application/vnd.github+json",
                        "-H", "X-GitHub-Api-Version: 2022-11-28", url],
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace", timeout=180)
    if r.returncode != 0:
        raise SystemExit(f"ALTO: curl.exe fallo -> {r.returncode}\n{r.stderr[:400]}")
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        raise SystemExit(f"ALTO: la API no devolvio JSON.\n{r.stdout[:400]}")


def arbol_local(sha):
    """{path: blob_sha} desde git ls-tree. SE CORTA POR TAB."""
    out = git("ls-tree", "-r", sha)
    arbol = {}
    for linea in out.splitlines():
        if not linea.strip():
            continue
        if "\t" not in linea:
            raise SystemExit(f"ALTO: linea de ls-tree sin TAB: {linea!r}")
        meta, path = linea.split("\t", 1)       # UNA sola vez, por TAB
        partes = meta.split()                    # "<modo> <tipo> <sha>"
        if len(partes) != 3:
            raise SystemExit(f"ALTO: metadatos inesperados en ls-tree: {meta!r}")
        modo, tipo, blob = partes
        if tipo != "blob":
            continue
        arbol[path] = blob
    return arbol


def main():
    sha = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
    salida = sys.argv[2] if len(sys.argv) > 2 else SALIDA_POR_DEFECTO
    sha = git("rev-parse", sha).strip()

    p("=" * 78)
    p("VERIFICACION DEL PUSH POR BLOB-SHA CONTRA LA API")
    p("=" * 78)
    p(f"  repo   : {OWNER}/{NOMBRE}")
    p(f"  commit : {sha}")
    p("")

    # 1. La referencia remota
    ref = api("commits/" + sha)
    sha_remoto = ref.get("sha")
    p("-" * 78)
    p("1. EL COMMIT EXISTE DEL OTRO LADO")
    p("-" * 78)
    if sha_remoto != sha:
        p(f"  >>> ALTO: la API devuelve {sha_remoto!r} y se pidio {sha!r}")
        return 1
    p(f"  ok  la API lo devuelve con el mismo sha")
    p(f"      {ref.get('commit', {}).get('message', '').splitlines()[0][:90]}")
    p("")

    # 2. Los arboles
    local = arbol_local(sha)
    remoto_raw = api(f"git/trees/{sha}?recursive=1")
    remoto = {e["path"]: e["sha"] for e in remoto_raw.get("tree", [])
              if e.get("type") == "blob"}

    p("-" * 78)
    p("2. ARBOL COMPLETO, BLOB POR BLOB")
    p("-" * 78)
    p(f"  blobs locales (git ls-tree, cortado por TAB) : {len(local)}")
    p(f"  blobs en la API                               : {len(remoto)}")
    if remoto_raw.get("truncated"):
        p("  >>> ALTO: la API TRUNCO el arbol. La comparacion seria parcial y no")
        p("      se puede presentar como completa.")
        return 1

    comunes = sorted(set(local) & set(remoto))
    p(f"  COMPARACIONES efectivas                       : {len(comunes)}")
    if not comunes:
        p("  >>> ALTO: CERO COMPARACIONES. Un lado vino vacio. Esto NO es 'cero")
        p("      discrepancias': es que no se comparo nada.")
        return 1

    distintos = [(k, local[k], remoto[k]) for k in comunes if local[k] != remoto[k]]
    solo_local = sorted(set(local) - set(remoto))
    solo_api = sorted(set(remoto) - set(local))

    p(f"  blob-sha IGUALES                              : {len(comunes) - len(distintos)}")
    p(f"  blob-sha DISTINTOS                            : {len(distintos)}")
    p(f"  solo local                                    : {len(solo_local)}")
    p(f"  solo en la API                                : {len(solo_api)}")
    for k, a, b in distintos:
        p(f"    DISTINTO  {k}\n              local {a}\n              api   {b}")
    for k in solo_local:
        p(f"    SOLO LOCAL  {k}")
    for k in solo_api:
        p(f"    SOLO API    {k}")
    p("")

    # 3. Los archivos de esta sesion, nombrados
    p("-" * 78)
    p("3. LOS ARCHIVOS DE ESTA SESION, UNO POR UNO")
    p("-" * 78)
    mios = [k for k in comunes
            if k.startswith("_bitacoras/alcance_costa_afuera_2026-08-15/")
            or k in ("PLAN_JURISDICCION.md",
                     "data/decreto/adjudicacion_tramos.json",
                     "data/decreto/jurisdicciones_capitanias.json",
                     "data/decreto/jurisdicciones_v2.json",
                     "scripts/fase4_auditoria_v2.py",
                     "scripts/fase4_migrar_insumo_v2.py",
                     "scripts/fase5_construir_capa_ds991.py",
                     "scripts/fase5_validar_zonas_aviso.js",
                     "src/services/zonas-aviso.js")]
    for k in mios:
        estado = "ok " if local[k] == remoto[k] else "DIF"
        p(f"  {estado} {local[k][:12]}  {k}")
    p(f"\n  archivos de la sesion comparados: {len(mios)}")
    p("")

    # 4. Que lo excluido NO viajo
    p("-" * 78)
    p("4. LO QUE NO DEBIA VIAJAR, NO VIAJO")
    p("-" * 78)
    excluidos = ["_bitacoras/alcance_costa_afuera_2026-08-15/_v2_antes.json",
                 "_bitacoras/alcance_costa_afuera_2026-08-15/_sql_antes.sql",
                 "_bitacoras/alcance_costa_afuera_2026-08-15/_v2_respaldo_mordida.json",
                 "scripts/fase5_capa_ds991.sql"]
    fuga = [e for e in excluidos if e in remoto]
    for e in excluidos:
        p(f"  {'FUGA' if e in remoto else 'ok  '} {e}")
    p("")

    ok = not distintos and not solo_local and not solo_api and not fuga
    p("=" * 78)
    if ok:
        p(f"RESULTADO: {len(comunes)} blobs comparados, {len(comunes)} identicos,")
        p("0 discrepancias. El push quedo verificado contra la API.")
    else:
        p("RESULTADO: HAY DISCREPANCIAS. No se da por verificado.")
    p("=" * 78)
    io.open(SALIDA, "w", encoding="utf-8", newline="").write("\n".join(L) + "\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
