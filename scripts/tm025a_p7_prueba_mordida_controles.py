"""
P7 — PRUEBA DE MORDIDA DE LOS CONTROLES NUEVOS DEL AUDITOR (B10, B11, B12).

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\tm025a_p7_prueba_mordida_controles.py

CLAUDE.md §4.6: despues de tocar un auditor se comprueba que SIGUE MORDIENDO —
se le inyecta el defecto que debe cazar y se confirma que lo caza. Un control que
no puede fallar no prueba nada.

Cada caso: respalda los tres archivos, inyecta UN defecto, corre el auditor
completo, comprueba que el control esperado aparece entre los fallos, y restaura
verificando por sha256. El respaldo se restaura en un `finally`: si el script se
cae a la mitad, los archivos vuelven igual.

INCLUYE CONTROL NEGATIVO. Con el sello puesto y nada roto, los tres controles
tienen que PASAR. Sin eso, un control que falla siempre pareceria un control que
muerde.
"""

import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")
ADJ = os.path.join(REPO, "data", "decreto", "adjudicacion_tramos.json")
AUDITOR = os.path.join(REPO, "scripts", "fase4_auditoria_v2.py")
ARCHIVOS = [V1, V2, ADJ]


def sha256(r):
    return hashlib.sha256(open(r, "rb").read()).hexdigest()


def leer(r):
    return json.load(open(r, encoding="utf-8"))


def escribir(r, d):
    crudo = open(r, encoding="utf-8").read()
    ls = [l for l in crudo.splitlines() if l.strip()]
    sang = len(ls[1]) - len(ls[1].lstrip()) if len(ls) > 1 else 2
    with open(r, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(d, ensure_ascii=False, indent=sang))


def correr_auditor():
    p = subprocess.run([sys.executable, AUDITOR], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", cwd=os.path.join(REPO, "scripts"))
    return p.returncode, (p.stdout or "") + (p.stderr or "")


# ── defectos ─────────────────────────────────────────────────────────────────

def d_b10_sha_alterado():
    for r in (V1, V2):
        d = leer(r)
        d["cotejado_contra"]["sha256_texto_extraido"] = "0" * 64
        escribir(r, d)


def d_b10_sin_bloque():
    d = leer(V2)
    del d["cotejado_contra"]
    escribir(V2, d)


def d_b10_archivo_inexistente():
    for r in (V1, V2):
        d = leer(r)
        d["cotejado_contra"]["texto_extraido"] = "data/decreto/fuente/NO_EXISTE.txt"
        escribir(r, d)


def d_b11_gobernaciones_perdidas():
    d = leer(V2)
    del d["gobernaciones"]
    escribir(V2, d)


def d_b11_articulos_transformados():
    d = leer(V2)
    d["articulos"][0]["texto_decreto"] = d["articulos"][0]["texto_decreto"][:100]
    escribir(V2, d)


def d_b11_vinculo_roto():
    d = leer(V2)
    for g in d["gobernaciones"]:
        if g["capitanias"]:
            g["capitanias"] = g["capitanias"][1:]
            break
    escribir(V2, d)


def d_b12_sello_viejo():
    d = leer(ADJ)
    d.setdefault("insumo", {})["jurisdicciones_v2.json"] = "f" * 64
    escribir(ADJ, d)


def d_b12_sin_sello():
    d = leer(ADJ)
    d.pop("insumo", None)
    escribir(ADJ, d)


CASOS = [
    ("B10", "el sha256 del texto oficial declarado no es el del archivo", d_b10_sha_alterado),
    ("B10", "el insumo deja de declarar contra que se cotejo", d_b10_sin_bloque),
    ("B10", "el documento declarado no esta en el repositorio", d_b10_archivo_inexistente),
    ("B11", "la migracion pierde las Gobernaciones", d_b11_gobernaciones_perdidas),
    ("B11", "la migracion transforma el Art. 2 en vez de copiarlo", d_b11_articulos_transformados),
    ("B11", "el vinculo Gobernacion->Capitanias deja de cubrir las 64", d_b11_vinculo_roto),
    ("B12", "el sello apunta a un insumo que no es el de disco", d_b12_sello_viejo),
    ("B12", "adjudicacion_tramos.json no declara contra que insumo se adjudico", d_b12_sin_sello),
]


def main():
    tmp = tempfile.mkdtemp(prefix="p7_mordida_")
    respaldo = {r: os.path.join(tmp, os.path.basename(r)) for r in ARCHIVOS}
    sha_ini = {r: sha256(r) for r in ARCHIVOS}
    for r, d in respaldo.items():
        shutil.copy2(r, d)

    ok = fallos = 0
    restaurado = False
    try:
        print("=" * 78)
        print("P7 — PRUEBA DE MORDIDA DE B10, B11 Y B12")
        print("=" * 78)
        print(f"  respaldo en: {tmp}")
        print()

        # ── control negativo: con el sello puesto, los tres pasan ────────────
        print("CONTROL NEGATIVO — con todo correcto los tres controles PASAN")
        adj = leer(ADJ)
        adj.setdefault("insumo", {})["jurisdicciones_v2.json"] = sha256(V2)
        escribir(ADJ, adj)
        cod, salida = correr_auditor()
        neg_ok = all(f"[{c}]" not in salida for c in ("B10", "B11", "B12"))
        print(f"  auditor exit={cod}   B10/B11/B12 sin fallos: {'SI' if neg_ok else 'NO'}")
        if neg_ok:
            ok += 1
            print("  ok   los tres controles pueden pasar; no son un fallo permanente")
        else:
            fallos += 1
            print("  FALLA los controles fallan aun sin defecto: no prueban nada")
        for r, d in respaldo.items():
            shutil.copy2(d, r)
        print()

        # ── un defecto por vez ───────────────────────────────────────────────
        print("DEFECTOS INYECTADOS, UNO POR VEZ")
        for control, nombre, inyectar in CASOS:
            inyectar()
            cod, salida = correr_auditor()
            mordio = f"[{control}]" in salida and cod == 1
            if mordio:
                ok += 1
                print(f"  ok   {control}  {nombre}")
            else:
                fallos += 1
                print(f"  ✘    {control}  {nombre}")
                print(f"         auditor exit={cod}, '{control}' entre los fallos: "
                      f"{'[' + control + ']' in salida}")
            for r, d in respaldo.items():
                shutil.copy2(d, r)
    finally:
        for r, d in respaldo.items():
            shutil.copy2(d, r)
        restaurado = all(sha256(r) == sha_ini[r] for r in ARCHIVOS)
        print()
        print("RESTAURACION")
        for r in ARCHIVOS:
            print(f"  {os.path.basename(r):<34} {sha256(r)[:16]}  "
                  f"{'ok' if sha256(r) == sha_ini[r] else '<<< NO VOLVIO'}")
        shutil.rmtree(tmp, ignore_errors=True)

    # Fuera del finally a proposito: un `return` dentro de un finally se traga
    # cualquier excepcion que estuviera propagandose, y esta prueba tiene que
    # poder reventar ruidosamente si el auditor no corre.
    if not restaurado:
        print("  LOS ARCHIVOS NO VOLVIERON A SU ESTADO. Revisar a mano.")
        return 2

    print()
    print("=" * 78)
    print(f"  MORDIDA: {ok}/{ok + fallos}"
          f"{'  — HAY CONTROLES QUE NO MUERDEN' if fallos else ''}")
    print("=" * 78)
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
