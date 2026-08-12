"""
P4 — LAS DOS CORRECCIONES CUYO MOTIVO EL TEXTO OFICIAL DESMIENTE.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\tm025a_p4_remotivar_correcciones.py

SE CORRIGE EL MOTIVO, NO EL VALOR.
  Los dos valores —22 39 00 S en CP Mejillones y 52 30 30 S en CP Punta Arenas—
  coinciden con el texto oficial y se quedan exactamente como estan. Lo que se
  reescribe es el "que dice el decreto" que INV-3.7 exige registrar, porque en
  estos dos casos ese registro es falso:

    mejillones    decia "El decreto escribe 22 30 00 S".
                  El oficial escribe 22º39'00''.
    punta_arenas  decia "El decreto escribe '52 3030 S', sin apostrofe".
                  El oficial escribe 52º30'30" S.

  En los dos, la discrepancia era del CONSOLIDADO DE BCN contra el que se
  transcribio —renderizado o erratas de esa version—, no del decreto. El insumo
  afirmaba un defecto de la norma que la norma no tiene, que es exactamente lo
  que INV-3.7 existe para impedir.

  Las dos son de las TRES correcciones SIN FIRMA del owner (la tercera, achao,
  se sostiene: el "Longitud 073º12'00\" S" esta tal cual en el oficial). No son
  adjudicaciones del owner: son lectura del agente. Reescribir su motivo no
  revoca ninguna decision suya.

CUATRO REGISTROS, NO DOS
  La afirmacion falsa esta repetida en dos lugares derivados que tambien se
  corrigen: la nota de CP Tocopilla ("El parrafo de CP Mejillones daba 22 30 00 S
  para el mismo punto") y el punto notable "Punta Tames" ("Discrepancia de la
  fuente, no de OCR"). Una premisa falsa deja de serlo en todos los lugares donde
  se escribio, o vuelve por el que quedo.

NO SE BORRA LO SUPERADO (§3.3)
  El texto original se conserva en `motivo_anterior` / `nota_anterior`. Como se
  razono importa tanto como la conclusion, y el proximo que transcriba necesita
  saber que el consolidado de BCN se renderiza distinto del texto oficial. Por
  eso tampoco se descarto borrar las correcciones: borrarlas perderia ese dato.

AUTOVERIFICADO (§4.4)
  No afirma lo que dice el oficial: lo comprueba. Para cada caso verifica, contra
  el parrafo oficial de esa Capitania, que el valor correcto ESTA y que el valor
  que el motivo viejo atribuia al decreto NO esta. Si alguna de las dos falla, se
  detiene y no escribe nada.

IDEMPOTENTE
  Correrlo dos veces deja el archivo igual, byte a byte.

Autorizado por el owner el 2026-08-11 como P4 de la propuesta
_bitacoras/cotejo_tm025a_propuesta_2026-08-12.txt.
"""

import hashlib
import io
import json
import os
import re
import sys
import unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V1 = os.path.join(REPO, "data", "decreto", "jurisdicciones_capitanias.json")
OFICIAL = os.path.join(REPO, "data", "decreto", "fuente", "TM-025-A_2025-06-04.txt")

DOCUMENTO = "TM-025 A, actualizado al 4 de junio de 2025 (DIRECTEMAR)"
OFICIAL_SHA256 = "e14cb905b4895422e41a7741818b59a40578dd49ba049baf0b727a8928c522c8"
FECHA = "2026-08-11"
MARCA = "CORRECCION DE MOTIVO, 2026-08-11"


class Alto(Exception):
    pass


CASOS = [
    {
        "id": "mejillones",
        "encabezado": "- Capitanía de Puerto de Mejillones",
        "valor_correcto": "22 39 00",
        "valor_que_el_motivo_atribuia_al_decreto": "22 30 00",
        "motivo": (
            MARCA + " — EL VALOR NO CAMBIA: el limite Norte sigue siendo 22 39 00 S. "
            "Lo que cambia es el motivo registrado, que resulto falso. Decia 'El "
            "decreto escribe 22 30 00 S', y el texto oficial (" + DOCUMENTO + ", "
            "sha256 " + OFICIAL_SHA256[:16] + ") escribe 22º39'00'' en el parrafo de "
            "CP Mejillones: el mismo valor que el insumo ya tenia. La discrepancia "
            "era del consolidado de BCN contra el que se transcribio, NO del decreto. "
            "Verificado sobre el parrafo oficial: contiene 22 39 00 y no contiene "
            "22 30 00. LO QUE SIGUE EN PIE y no dependia de esa premisa: Punta Tames "
            "esta en 22 39 22 S (verificacion en terreno, Google Earth, 2026-08-09) y "
            "el parrafo de CP Tocopilla usa 22 39 00 S para el mismo punto. O sea que "
            "esto ya no es una correccion del decreto sino una correccion de la "
            "transcripcion contra una version desactualizada de la fuente."),
    },
    {
        "id": "punta_arenas",
        "encabezado": "- Capitanía de Puerto de Punta Arenas",
        "valor_correcto": "52 30 30",
        "valor_que_el_motivo_atribuia_al_decreto": "52 3030",
        "motivo": (
            MARCA + " — EL VALOR NO CAMBIA: el limite Norte sigue siendo 52 30 30 S. "
            "Lo que cambia es el motivo registrado, que resulto falso. Decia 'El "
            "decreto escribe 52 3030 S, sin apostrofe', y el texto oficial "
            "(" + DOCUMENTO + ", sha256 " + OFICIAL_SHA256[:16] + ") escribe "
            "52º30'30\" S. correctamente. Era un artefacto de renderizado del "
            "consolidado de BCN, no un defecto del decreto. Verificado sobre el "
            "parrafo oficial: contiene 52 30 30 y no contiene 52 3030. LO QUE SIGUE "
            "EN PIE: el parrafo inmediatamente anterior (CP Puerto Natales) cierra "
            "por el sur en 52 30 30 S y los dos provienen del mismo D.S. 391 Art. 1 "
            "N 21. O sea que esto ya no es una correccion del decreto sino una "
            "correccion de la transcripcion contra una version desactualizada de la "
            "fuente."),
    },
]

NOTA_TOCOPILLA = (
    MARCA + " — Valor confirmado: el limite Sur de CP Tocopilla es 22 39 00 S. La "
    "nota anterior decia que el parrafo de CP Mejillones daba 22 30 00 S para el "
    "mismo punto y que por eso se habia corregido alli. Eso era cierto del "
    "consolidado de BCN, no del decreto: el texto oficial (" + DOCUMENTO + ") "
    "escribe 22º39'00'' en LOS DOS parrafos. No hay discrepancia entre Capitanias "
    "que resolver.")

NOTA_PUNTA_TAMES = (
    MARCA + " — El texto oficial (" + DOCUMENTO + ") usa 22º39'00'' tanto en CP "
    "Tocopilla como en CP Mejillones: NO HAY DISCREPANCIA DE LA FUENTE. La nota "
    "anterior afirmaba que si la habia y que no era de OCR; se equivocaba de "
    "documento, no de lectura — el consolidado de BCN contra el que se transcribio "
    "trae 22 30 00 en CP Mejillones y el texto oficial vigente no. Ubicacion del "
    "punto, sin cambios y verificada aparte: 22 39 22 S (terreno, Google Earth, "
    "2026-08-09).")


def sha256(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[º°ª]", " ", s)
    s = re.sub(r"[’‘´`'\"“”′″]", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def leer_lineas():
    real = sha256(OFICIAL)
    if real != OFICIAL_SHA256:
        raise Alto(f"el texto oficial en disco tiene sha256 {real[:16]} y este script "
                   f"se escribio contra {OFICIAL_SHA256[:16]}")
    return open(OFICIAL, encoding="utf-8").read().replace("\x0c", "").split("\n")


def es_aparato(t):
    t = t.strip()
    return (not t
            or bool(re.match(r"^\d{1,3}\s+D\.S\.\s*\(M\)", t))
            or bool(re.search(r"FIJA JURISDICCI[OÓ]N DE LAS GOBERNACIONES", t, re.I))
            or bool(re.match(r"^ESTABLECE LAS CAPITAN", t, re.I)))


def parrafo(lineas, encabezado):
    objetivo = norm(encabezado)
    ini = next((i for i, l in enumerate(lineas) if norm(l) == objetivo), None)
    if ini is None:
        raise Alto(f"no se encontro el encabezado '{encabezado}' en el documento")
    fin = len(lineas)
    for j in range(ini + 1, len(lineas)):
        t = lineas[j].strip()
        if (re.match(r"^-\s*Capitan[ií]a de Puerto", t)
                or re.match(r"^GOBERNACI[OÓ]N MAR[IÍ]TIMA", t)
                or re.match(r"^Art\.\s*\d", t)):
            fin = j
            break
    return norm(" ".join(l for l in lineas[ini + 1:fin] if not es_aparato(l)))


def escribir_json(ruta, doc):
    crudo = open(ruta, encoding="utf-8").read()
    ls = [l for l in crudo.splitlines() if l.strip()]
    sangria = len(ls[1]) - len(ls[1].lstrip()) if len(ls) > 1 else 2
    with open(ruta, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(doc, ensure_ascii=False, indent=sangria))


def main():
    lineas = leer_lineas()
    v1 = json.load(open(V1, encoding="utf-8"))
    caps = {c["id"]: c for c in v1["capitanias"]}

    print("=" * 78)
    print("P4 — LAS DOS CORRECCIONES CON MOTIVO FALSIFICADO")
    print("=" * 78)
    print(f"  insumo    : sha256[:16] {sha256(V1)[:16]}")
    print(f"  documento : {DOCUMENTO}  sha256[:16] {OFICIAL_SHA256[:16]}  ok")
    print()

    print("VERIFICACION CONTRA EL PARRAFO OFICIAL (no se afirma, se comprueba)")
    for c in CASOS:
        p = parrafo(lineas, c["encabezado"])
        ok_si = norm(c["valor_correcto"]) in p
        ok_no = norm(c["valor_que_el_motivo_atribuia_al_decreto"]) not in p
        if not ok_si:
            raise Alto(f"{c['id']}: el parrafo oficial NO contiene el valor correcto "
                       f"{c['valor_correcto']}. El insumo podria estar mal y P4 no es "
                       f"el lugar para decidirlo")
        if not ok_no:
            raise Alto(f"{c['id']}: el parrafo oficial SI contiene "
                       f"{c['valor_que_el_motivo_atribuia_al_decreto']}, o sea que el "
                       f"motivo viejo NO era falso. No se reescribe")
        print(f"  ok  {c['id']:<14} contiene '{c['valor_correcto']}' y no contiene "
              f"'{c['valor_que_el_motivo_atribuia_al_decreto']}'")
    print()

    print("APLICACION")
    cambios = 0

    for c in CASOS:
        cap = caps.get(c["id"])
        if cap is None:
            raise Alto(f"'{c['id']}' no existe entre las capitanias del v1")
        actual = cap.get("correccion_aplicada")
        if actual is None:
            raise Alto(f"{c['id']} no tiene 'correccion_aplicada': P4 esperaba una")
        if actual.startswith(MARCA):
            print(f"  --  {c['id']:<14} YA REMOTIVADA, no se toca")
            continue
        cap["motivo_anterior"] = actual
        cap["correccion_aplicada"] = c["motivo"]
        cap["clase_correccion"] = ("transcripcion contra una version desactualizada de "
                                   "la fuente; NO es un defecto del decreto")
        cap["remotivada"] = {
            "fecha": FECHA, "documento": DOCUMENTO,
            "documento_sha256": OFICIAL_SHA256,
            "por": "scripts/tm025a_p4_remotivar_correcciones.py",
        }
        cambios += 1
        print(f"  ++  {c['id']:<14} motivo reescrito, valor intacto "
              f"({cap['limite_norte_dms']})")

    toco = caps["tocopilla"]
    if toco.get("nota", "").startswith(MARCA):
        print("  --  tocopilla      YA CORREGIDA, no se toca")
    else:
        toco["nota_anterior"] = toco.get("nota")
        toco["nota"] = NOTA_TOCOPILLA
        cambios += 1
        print("  ++  tocopilla      nota reescrita (repetia la misma premisa falsa)")

    pt = next((p for p in v1["puntos_notables"] if p.get("nombre") == "Punta Tames"), None)
    if pt is None:
        raise Alto("no esta el punto notable 'Punta Tames'")
    if pt.get("nota", "").startswith(MARCA):
        print("  --  Punta Tames    YA CORREGIDA, no se toca")
    else:
        pt["nota_anterior"] = pt.get("nota")
        pt["nota"] = NOTA_PUNTA_TAMES
        cambios += 1
        print("  ++  Punta Tames    nota reescrita (punto notable)")

    if cambios:
        escribir_json(V1, v1)

    print()
    print("=" * 78)
    print(f"  registros corregidos: {cambios} de 4")
    print(f"  valores tocados     : 0")
    for c in CASOS:
        print(f"      {c['id']:<14} limite_norte_dms = {caps[c['id']]['limite_norte_dms']}")
    print(f"      tocopilla      limite_sur_dms   = {caps['tocopilla']['limite_sur_dms']}")
    if cambios:
        print(f"  v1 ahora            : sha256[:16] {sha256(V1)[:16]}")
    else:
        print("  Sin cambios. El archivo quedo igual.")
    print("=" * 78)


if __name__ == "__main__":
    try:
        main()
    except Alto as e:
        print()
        print(f"P4 DETENIDO: {e}")
        sys.exit(2)
