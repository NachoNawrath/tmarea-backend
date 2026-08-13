"""
MORDIDA de la validacion de forma de D13 — la carencia por cuerpo sin geometria.

CLAUDE.md §4.6: un control que no puede fallar no prueba nada. Esta mordida le
inyecta a `fase2_adjudicacion.py` los cuatro defectos que su validacion tiene que
cazar, y comprueba que los caza. Si algun dia alguien afloja uno de los cuatro,
esto se pone rojo.

LAS VARIANTES SE ARMAN SOBRE LA DECLARACION REAL, no sobre una copia escrita aca:
una copia envejece en cuanto el archivo cambie, que es la trampa que E0.1 ya pago.

INOCUIDAD (la otra trampa de E0.1, la del archivo de estado que se publico solo):
esta mordida NO puede escribir el cotejo de verdad. Redirige `SALIDA` del modulo a
un temporal y ademas COMPRUEBA POR sha256 que el archivo real quedo igual — porque
"creia que redirigia" ya fue una causa real en este repositorio, no una hipotesis.

Uso (desde la raiz del repo):
    tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\e3_prueba_mordida_carencia.py
"""

import copy
import hashlib
import io
import os
import sys
import tempfile
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fase2_adjudicacion as mod

REAL = mod.SALIDA
DECLARACION_REAL = copy.deepcopy(mod.CARENCIA_CUERPO_SIN_GEOMETRIA)


def sha256(ruta):
    h = hashlib.sha256()
    with open(ruta, "rb") as fh:
        for bloque in iter(lambda: fh.read(1 << 20), b""):
            h.update(bloque)
    return h.hexdigest()


def correr(declaracion):
    """Corre el generador con la declaracion dada, contra un archivo temporal.

    Devuelve (ok, mensaje). ok=False significa que el script se detuvo, que es lo
    que las variantes con defecto tienen que producir.
    """
    tmp = os.path.join(tempfile.gettempdir(), "mordida_carencia_cotejo.json")
    mod.SALIDA = tmp
    mod.CARENCIA_CUERPO_SIN_GEOMETRIA = declaracion
    try:
        with redirect_stdout(io.StringIO()):
            mod.main()
        return True, "corrio sin detenerse"
    except SystemExit as e:
        return False, str(e)
    finally:
        mod.SALIDA = REAL
        mod.CARENCIA_CUERPO_SIN_GEOMETRIA = copy.deepcopy(DECLARACION_REAL)
        if os.path.exists(tmp):
            os.remove(tmp)


CASOS = []


def caso(nombre, declaracion, debe_detenerse, fragmento_esperado=None):
    ok, msg = correr(declaracion)
    detuvo = not ok
    bien = (detuvo == debe_detenerse)
    if bien and fragmento_esperado is not None:
        bien = fragmento_esperado.lower() in msg.lower()
    CASOS.append((nombre, bien, msg))
    print(f"  [{'OK  ' if bien else 'FALLA'}] {nombre}")
    if not bien:
        print(f"          esperaba {'que se detuviera' if debe_detenerse else 'que pasara'}"
              f"{'' if fragmento_esperado is None else f' con: {fragmento_esperado}'}")
        print(f"          obtuvo  : {msg[:400]}")


def main():
    sha_antes = sha256(REAL)
    print("MORDIDA — validacion de forma de la carencia por cuerpo (D13)")
    print(f"Cotejo real: {os.path.relpath(REAL, mod.REPO)}")
    print(f"sha256 antes: {sha_antes}")
    print()

    # M1 — carencia declarada sobre un cuerpo que el cotejo NO tiene.
    d = copy.deepcopy(DECLARACION_REAL)
    d[("lago_ranco", "Rio Que No Existe")] = copy.deepcopy(d[("lago_ranco", "Rio Bueno")])
    caso("M1 carencia sobre un cuerpo inexistente se detiene", d, True,
         "no son cuerpos del cotejo")

    # M2 — la carencia SOBREVIVE A SU CAUSA: el cuerpo tiene geometria.
    # 'Lago Gris' esta adjudicado al fid 1102, o sea que tiene geometria.
    d = copy.deepcopy(DECLARACION_REAL)
    d[("lago_ranco", "Lago Gris")] = copy.deepcopy(d[("lago_ranco", "Rio Bueno")])
    caso("M2 carencia sobre un cuerpo CON geometria se detiene", d, True,
         "ahora tienen geometria")

    # M3 — EL SILENCIO, que es el defecto que este bloque existe para impedir.
    d = copy.deepcopy(DECLARACION_REAL)
    del d[("lago_ranco", "Rio Bueno")]
    caso("M3 un cuerpo sin geometria y sin carencia declarada se detiene", d, True,
         "sin carencia declarada")

    # M3bis — el silencio NO es un caso particular del rio Bueno: cualquiera de
    # los cuatro lo dispara. Si algun dia esto pasa, la regla se volvio un nombre
    # propio (CLAUDE.md §4.3).
    d = copy.deepcopy(DECLARACION_REAL)
    del d[("lago_panguipulli", "Rio Fuy")]
    caso("M3bis el silencio se caza en CUALQUIER cuerpo, no solo en el rio Bueno", d, True,
         "sin carencia declarada")

    # M4 — forma: los cuatro campos obligatorios, uno por uno.
    for campo in ("decidido", "causa", "que_implica_mientras_este_asi", "condicion_de_cierre"):
        d = copy.deepcopy(DECLARACION_REAL)
        del d[("lago_ranco", "Rio Bueno")][campo]
        caso(f"M4.{campo} ausente se detiene", d, True, f"no escribe '{campo}'")
        d = copy.deepcopy(DECLARACION_REAL)
        d[("lago_ranco", "Rio Bueno")][campo] = "   "
        caso(f"M4.{campo} en blanco se detiene", d, True, f"no escribe '{campo}'")

    # M-neg — CONTROL NEGATIVO: la declaracion REAL de hoy pasa.
    caso("M-neg la declaracion real de hoy pasa", copy.deepcopy(DECLARACION_REAL), False)

    # M-inocuidad — la mordida no escribio el cotejo de verdad.
    sha_despues = sha256(REAL)
    bien = sha_antes == sha_despues
    CASOS.append(("M-inocuidad el cotejo real no se toco", bien, sha_despues))
    print(f"  [{'OK  ' if bien else 'FALLA'}] M-inocuidad el cotejo real no se toco")
    if not bien:
        print(f"          sha256 antes  : {sha_antes}")
        print(f"          sha256 despues: {sha_despues}")

    print()
    verdes = sum(1 for _, ok, _ in CASOS if ok)
    print(f"VEREDICTO: {verdes}/{len(CASOS)}")
    return 0 if verdes == len(CASOS) else 1


if __name__ == "__main__":
    sys.exit(main())
