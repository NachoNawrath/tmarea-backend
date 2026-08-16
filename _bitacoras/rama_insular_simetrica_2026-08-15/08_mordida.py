r"""
PRUEBA DE MORDIDA DE LA RAMA INSULAR (CLAUDE.md §4.6).

  Lo que hay que probar no es que las insulares sigan `no_cerrable` — eso lo hacian
  igual ANTES del cambio, y por eso mismo el conteo quieto NO prueba nada. Lo que
  hay que probar es que la rama AHORA MIRA EL DATO: que con adjudicacion escrita
  cambia de estado, y que con el dato mal formado se detiene en vez de degradar.

  Con la rama vieja las tres pruebas de abajo darian el mismo resultado que sin
  archivo: `no_cerrable`, siempre, pasara lo que pasara con el insumo. Esa es
  exactamente la capacidad que se le agrego y la que se mide aca.

  Escribe data/decreto/cotejo_insular_adjudicado.json, corre el migrador, y LO
  BORRA. Al terminar deja el repositorio como lo encontro y lo verifica por sha256
  del v2 — si no coincide, falla ruidoso y lo dice.

SHELL: se corre con el interprete del repo (python no esta en el PATH).
  Forma reproducible, PowerShell, desde la raiz del repositorio:

    & "tools\raster-build\.venv\Scripts\python.exe" `
      "_bitacoras\rama_insular_simetrica_2026-08-15\08_mordida.py" `
      "_bitacoras\rama_insular_simetrica_2026-08-15\08_mordida.txt"
"""

import hashlib
import io
import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
PY = os.path.join(REPO, "tools", "raster-build", ".venv", "Scripts", "python.exe")
MIGRAR = os.path.join(REPO, "scripts", "fase4_migrar_insumo_v2.py")
TESTIGOS = os.path.join(REPO, "scripts", "fase5_corregir_testigos.py")
INSULAR = os.path.join(REPO, "data", "decreto", "cotejo_insular_adjudicado.json")
V2 = os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json")

out = io.StringIO()


def p(s=""):
    out.write(s + "\n")


def sha(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def correr(script, *args):
    r = subprocess.run([PY, script, *args], cwd=REPO, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def estados():
    d = json.load(open(V2, encoding="utf-8"))
    return {j["id"]: (j["estado_geometria"], j["receta"], j["participa_matching"],
                      j["causa_sin_geometria"])
            for j in d["jurisdicciones"] if j["ambito"] == "insular_remota"}


def escribir(doc):
    with open(INSULAR, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)


# Anclas de prueba. NO son una adjudicacion: son coordenadas de laboratorio para
# que la rama tenga algo que mirar. La adjudicacion real exige decidir que islas
# comprende el "Archipielago de Juan Fernandez", que es del owner.
ADJUDICADO = {
    "ES_DE_PRUEBA": "instrumento de _bitacoras/rama_insular_simetrica_2026-08-15/. "
                    "NO es una adjudicacion. Se escribe y se borra dentro de la "
                    "prueba de mordida.",
    "jurisdicciones": [
        {"id": "hanga_roa", "islas": [
            {"nombre_decreto": "isla de Pascua", "anclas": [{"lat": -27.11, "lon": -109.37}]},
            {"nombre_decreto": "isla Sala y Gomez", "anclas": [{"lat": -26.47, "lon": -105.47}]}]},
        {"id": "juan_fernandez", "islas": [
            {"nombre_decreto": "San Felix", "anclas": [{"lat": -26.27, "lon": -80.10}]},
            {"nombre_decreto": "San Ambrosio", "anclas": [{"lat": -26.35, "lon": -79.90}]},
            {"nombre_decreto": "Archipielago de Juan Fernandez",
             "anclas": [{"lat": -33.65, "lon": -78.85}]}]},
    ],
}

SOBRA = {"ES_DE_PRUEBA": "idem", "jurisdicciones": [
    {"id": "hanga_roa", "islas": []},
    {"id": "juan_fernandez", "islas": []},
    {"id": "isla_que_no_existe", "islas": []}]}

FALTA = {"ES_DE_PRUEBA": "idem", "jurisdicciones": [{"id": "hanga_roa", "islas": []}]}


def main():
    if os.path.exists(INSULAR):
        raise SystemExit(f"{INSULAR} ya existe; esta prueba no pisa un archivo real")

    sha_inicial = sha(V2)
    p("PRUEBA DE MORDIDA DE LA RAMA INSULAR (§4.6)")
    p("=" * 78)
    p(f"  v2 al abrir, sha256 : {sha_inicial}")
    p(f"  estado al abrir     : {json.dumps(estados(), ensure_ascii=False)}")
    p("")

    fallos = []
    try:
        # ── 1. CON ADJUDICACION: la rama tiene que CAMBIAR DE ESTADO ──────────
        p("1. CON ADJUDICACION ESCRITA — la rama tiene que pasar a `cerrable`")
        p("-" * 78)
        escribir(ADJUDICADO)
        cod, _ = correr(MIGRAR)
        est = estados()
        p(f"  migrador exit={cod}")
        for k, v in sorted(est.items()):
            p(f"  {k:<16} estado={v[0]:<12} receta={v[1]:<12} participa_matching={v[2]}")
        ok = cod == 0 and all(v[0] == "cerrable" and v[1] == "union_islas"
                              and v[2] is True for v in est.values())
        p(f"  -> {'MUERDE' if ok else 'NO MUERDE'}: con el dato escrito el estado cambia solo.")
        p("     Con la rama vieja esto habria dado `no_cerrable` igual, porque el")
        p("     `return` era incondicional. Esa es la capacidad que se midio.")
        if not ok:
            fallos.append("1: con adjudicacion no paso a cerrable/union_islas/true")
        p("")

        # ── 2. ID QUE SOBRA: tiene que DETENERSE ──────────────────────────────
        p("2. ID QUE NO EXISTE ENTRE LAS JURISDICCIONES — tiene que detenerse")
        p("-" * 78)
        escribir(SOBRA)
        cod, salida = correr(MIGRAR)
        linea = next((l.strip() for l in salida.splitlines()
                      if "cotejo insular" in l), "(sin linea)")
        p(f"  migrador exit={cod}")
        p(f"  motivo: {linea}")
        ok2 = cod != 0 and "isla_que_no_existe" in salida
        p(f"  -> {'MUERDE' if ok2 else 'NO MUERDE'}: no cae al caso por defecto (§4.2).")
        if not ok2:
            fallos.append("2: un id que sobra no detuvo la corrida")
        p("")

        # ── 3. INSULAR SIN ENTRADA: tiene que DETENERSE ───────────────────────
        p("3. UNA INSULAR SIN ENTRADA EN EL COTEJO — tiene que detenerse")
        p("-" * 78)
        escribir(FALTA)
        cod, salida = correr(MIGRAR)
        linea = next((l.strip() for l in salida.splitlines()
                      if "cotejo insular" in l), "(sin linea)")
        p(f"  migrador exit={cod}")
        p(f"  motivo: {linea}")
        ok3 = cod != 0 and "juan_fernandez" in salida
        p(f"  -> {'MUERDE' if ok3 else 'NO MUERDE'}: la ausencia no se supone vacia.")
        p("     Con un default, `juan_fernandez` habria quedado declarada 'sin islas")
        p("     adjudicadas', que seria una causa FALSA: el problema seria el id.")
        if not ok3:
            fallos.append("3: una insular sin entrada no detuvo la corrida")
        p("")

    finally:
        # ── RESTAURACION, y se verifica ───────────────────────────────────────
        if os.path.exists(INSULAR):
            os.remove(INSULAR)
        cod_m, _ = correr(MIGRAR)
        cod_t, sal_t = correr(TESTIGOS, "--aplicar")
        movidos = next((l.strip() for l in sal_t.splitlines() if "movidos al agua" in l),
                       "(sin linea)")

    p("RESTAURACION — el repositorio queda como se encontro")
    p("-" * 78)
    p(f"  cotejo de prueba borrado : {not os.path.exists(INSULAR)}")
    p(f"  migrador exit={cod_m} · corregir_testigos --aplicar exit={cod_t}")
    p(f"  {movidos}")
    sha_final = sha(V2)
    p(f"  v2 al abrir  : {sha_inicial}")
    p(f"  v2 al cerrar : {sha_final}")
    igual = sha_inicial == sha_final
    p(f"  -> {'IDENTICO BYTE A BYTE' if igual else 'DISTINTO — LA PRUEBA DEJO RASTRO'}")
    if not igual:
        fallos.append("restauracion: el v2 no volvio a su sha256")
    p("")

    p("VEREDICTO")
    p("-" * 78)
    if fallos:
        p("  LA PRUEBA DE MORDIDA FALLA:")
        for f in fallos:
            p(f"    - {f}")
    else:
        p("  LA RAMA MUERDE EN LAS TRES DIRECCIONES y no dejo rastro.")

    texto = out.getvalue()
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdout.write(texto)
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8", newline="\n") as fh:
            fh.write(texto)
    raise SystemExit(1 if fallos else 0)


if __name__ == "__main__":
    main()
