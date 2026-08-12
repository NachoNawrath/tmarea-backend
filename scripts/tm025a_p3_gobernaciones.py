"""
P3 — LAS DIECISEIS GOBERNACIONES MARITIMAS Y EL ART. 2 ENTRAN AL INSUMO.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\tm025a_p3_gobernaciones.py

QUE ARREGLA
  El insumo tiene 64 entradas y las 64 son Capitanias. Los DIECISEIS parrafos de
  Gobernacion Maritima del Art. 1 no estaban en ninguna parte, y trece de ellos
  traen contenido que sus Capitanias no repiten. El mas caro: el de Aysen da el
  limite Sur de la XI Region con sus accidentes nombrados —cerro Chaltel o Fitz
  Roy, seno Iceberg o Tempano, canales Messier, Adalberto, Fallos y del Castillo—
  y dice que ese es el limite Sur de la Gobernacion. Ese parrafo cierra la
  ADJUDICACION de las bahias 127, 129 y 154.

  Entra tambien el ART. 2 completo, que INV-3.3 cita y el insumo no tenia: hasta
  hoy esa cita vivia solo en la transcripcion del contrato y no se reproducia
  desde el repositorio. Cierra D6.

  Medicion de origen: _bitacoras/cotejo_tm025a_2026-08-12.txt §3.b y §4.

NO SE TRANSCRIBE A MANO — SE EXTRAE
  Los textos NO se escriben en este archivo: se extraen del documento oficial
  versionado en data/decreto/fuente/, localizando cada parrafo por su encabezado.
  Por construccion no puede haber un error de transcripcion, que es exactamente
  la clase de defecto que este frente entero existe para cerrar. Si el documento
  cambia, el sha256 declarado deja de coincidir y el script se detiene.

TEXTO LITERAL, CON TILDES — a diferencia de las Capitanias
  Las Capitanias se completaron en el estilo del corpus porque `respaldo_textual()`
  del migrador cotea los puntos del contorno contra ese campo. Aca no aplica: NO
  SE CONSTRUYE GEOMETRIA DE GOBERNACION, asi que nada cotea contra estos textos y
  se guardan tal como el decreto los escribe.

QUE NO HACE, dicho para que no se lea como mas cerrado de lo que esta
  - NO deriva `limite_norte` ni `limite_sur` de las Gobernaciones. Sacar una
    coordenada de la prosa exige decidir que dice el decreto, y eso es del owner.
    Entran como texto y como vinculo; el dia que hagan falta sus limites, se
    adjudican.
  - NO georreferencia los accidentes del limite Sur de Aysen. El decreto nombra
    accidentes, no coordenadas. Lo que cierra es la adjudicacion, no la geometria.
  - NO toca `jurisdicciones`: sigue en 64 Capitanias. Las Gobernaciones son una
    lista HERMANA, no entradas nuevas de la misma lista.

POR QUE LISTA HERMANA Y NO ARCHIVO APARTE
  La cadena v1 -> v2 esta atada por conjunto de ids: el control B0 del auditor
  compara los ids del v1 con los del v2 y falla si difieren. Un archivo aparte
  necesita su propia cadena, su propio migrador y su propio control. Y hay un
  motivo de fondo: el contenido del parrafo de Gobernacion ES NORMATIVO PARA SUS
  CAPITANIAS — el limite Sur de la GM de Aysen es literalmente el limite Sur de
  baker y el limite Norte de puerto_eden. Separarlo en otro archivo separa la
  respuesta de la pregunta.

EL VINCULO SE DERIVA, NO SE ESCRIBE
  `capitanias: [ids]` sale del campo `gobernacion` de cada Capitania del v1. Si
  un encabezado oficial no calza con exactamente una Gobernacion del v1, o si
  sobra alguna, el script se detiene (§4.2: ningun mapeo con caso por defecto).

IDEMPOTENTE
  Correrlo dos veces deja el archivo igual, byte a byte.

Autorizado por el owner el 2026-08-11 como P3 de la propuesta
_bitacoras/cotejo_tm025a_propuesta_2026-08-12.txt, con D6 incluida en esta pasada.
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
FECHA_COTEJO = "2026-08-11"

RE_GM = r"^GOBERNACI[OÓ]N MAR[IÍ]TIMA"
RE_CP = r"^-\s*Capitan[ií]a de Puerto"
RE_ART = r"^Art\.\s*\d"


class Alto(Exception):
    pass


def sha256(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def slug(s):
    return re.sub(r"\s+", "_", norm(s))


def leer_lineas():
    """No usar splitlines(): pdftotext emite \\x0c en cada cambio de pagina y
    splitlines() lo cuenta como fin de linea, corriendo la numeracion una linea
    por pagina respecto de grep o de un editor."""
    if not os.path.exists(OFICIAL):
        raise Alto(f"no esta el texto oficial en {os.path.relpath(OFICIAL, REPO)}: "
                   f"P1 tiene que haberse aplicado antes")
    real = sha256(OFICIAL)
    if real != OFICIAL_SHA256:
        raise Alto(f"el texto oficial en disco tiene sha256 {real[:16]} y este script "
                   f"se escribio contra {OFICIAL_SHA256[:16]}. No se extrae de un "
                   f"documento que no es el que se cotejo")
    return open(OFICIAL, encoding="utf-8").read().replace("\x0c", "").split("\n")


def es_aparato(t):
    t = t.strip()
    return (not t
            or bool(re.match(r"^\d{1,3}\s+D\.S\.\s*\(M\)", t))
            or bool(re.search(r"FIJA JURISDICCI[OÓ]N DE LAS GOBERNACIONES", t, re.I))
            or bool(re.match(r"^ESTABLECE LAS CAPITAN", t, re.I)))


def cuerpo(lineas, ini, fin):
    """El texto del parrafo, sin aparato de imprenta y sin marcas de nota al pie."""
    txt = " ".join(l.strip() for l in lineas[ini:fin] if not es_aparato(l))
    txt = re.sub(r"\s+", " ", txt).strip()
    # marca de nota al pie pegada a palabra o puntuacion: 'Antofagasta.2' -> 'Antofagasta.'
    return re.sub(r"([A-Za-zÁÉÍÓÚÑáéíóúñ\),.;:])\d{1,2}\b", r"\1", txt).strip()


def bloques(lineas, patron_inicio):
    """Cada bloque va desde su encabezado hasta el siguiente encabezado o articulo."""
    out = []
    for i, l in enumerate(lineas):
        if not re.match(patron_inicio, l.strip()):
            continue
        fin = len(lineas)
        for j in range(i + 1, len(lineas)):
            t = lineas[j].strip()
            if re.match(RE_CP, t) or re.match(RE_GM, t) or re.match(RE_ART, t):
                fin = j
                break
        out.append({"encabezado": l.strip(), "linea": i + 1, "hasta": fin,
                    "texto": cuerpo(lineas, i + 1, fin)})
    return out


def escribir_json(ruta, doc):
    crudo = open(ruta, encoding="utf-8").read()
    ls = [l for l in crudo.splitlines() if l.strip()]
    sangria = len(ls[1]) - len(ls[1].lstrip()) if len(ls) > 1 else 2
    with open(ruta, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(doc, ensure_ascii=False, indent=sangria))


def main():
    lineas = leer_lineas()
    v1 = json.load(open(V1, encoding="utf-8"))

    print("=" * 78)
    print("P3 — LAS 16 GOBERNACIONES MARITIMAS Y EL ART. 2")
    print("=" * 78)
    print(f"  insumo    : data/decreto/jurisdicciones_capitanias.json (el v1, la fuente)")
    print(f"              sha256[:16] {sha256(V1)[:16]}")
    print(f"  documento : {DOCUMENTO}")
    print(f"              sha256[:16] {OFICIAL_SHA256[:16]}  ok")
    print()

    # ── el vinculo se DERIVA del v1 ──────────────────────────────────────────
    por_gob = {}
    for c in v1["capitanias"]:
        por_gob.setdefault(norm(c["gobernacion"]), []).append(c["id"])

    gms = bloques(lineas, RE_GM)
    if len(gms) != 16:
        raise Alto(f"se esperaban 16 Gobernaciones en el documento y se encontraron "
                   f"{len(gms)}")

    print("EXTRACCION Y VINCULO (derivado del campo 'gobernacion' del v1)")
    entradas, usadas = [], set()
    for b in gms:
        clave = norm(re.sub(RE_GM + r"( DE)?", "", b["encabezado"], flags=re.I))
        if clave not in por_gob:
            raise Alto(f"el encabezado '{b['encabezado']}' no calza con ninguna "
                       f"Gobernacion del v1. No se elige una por parecido")
        if clave in usadas:
            raise Alto(f"dos encabezados oficiales calzan con la misma Gobernacion "
                       f"del v1: '{clave}'")
        if not b["texto"]:
            raise Alto(f"'{b['encabezado']}' quedo con texto vacio tras limpiar el "
                       f"aparato: la extraccion no sirve")
        usadas.add(clave)
        entradas.append({
            "id": slug(clave),
            "nombre": re.sub(RE_GM + r"( DE)?\s*", "", b["encabezado"],
                             flags=re.I).strip(),
            "encabezado_oficial": b["encabezado"],
            "ambito": "gobernacion",
            "participa_matching": False,
            "receta": None,
            "capitanias": por_gob[clave],
            "texto_decreto": b["texto"],
            "limite_norte": None,
            "limite_sur": None,
            "nota_limites": ("El decreto describe los limites de esta Gobernacion en "
                             "prosa. NO se derivan a coordenadas aca: sacar un limite "
                             "de la prosa exige decidir que dice el decreto, y eso es "
                             "del owner. Entra el texto y el vinculo; los limites se "
                             "adjudican el dia que hagan falta."),
            "procedencia": {
                "documento": DOCUMENTO,
                "documento_sha256": OFICIAL_SHA256,
                "lineas_en_el_documento": [b["linea"], b["hasta"]],
                "extraido_por": "scripts/tm025a_p3_gobernaciones.py",
                "fecha_cotejo": FECHA_COTEJO,
                "nota": ("Texto EXTRAIDO del documento versionado, no transcrito a "
                         "mano. Literal, con tildes: nada cotea contra este campo "
                         "porque no se construye geometria de Gobernacion."),
            },
        })
        marca = "  <-- limite Sur de la XI Region" if clave == "aysen" else ""
        print(f"  {b['encabezado'][:44]:<46} {len(por_gob[clave])} cap  "
              f"{len(b['texto']):>5} car{marca}")

    faltan = set(por_gob) - usadas
    if faltan:
        raise Alto(f"Gobernaciones del v1 sin parrafo en el documento: {sorted(faltan)}")

    # ── Art. 2 ───────────────────────────────────────────────────────────────
    arts = bloques(lineas, r"^Art\.\s*2")
    if len(arts) != 1:
        raise Alto(f"se esperaba un unico Art. 2 y se encontraron {len(arts)}")
    a2 = arts[0]
    texto_a2 = (a2["encabezado"] + " " + a2["texto"]).strip()
    texto_a2 = re.sub(r"([A-Za-zÁÉÍÓÚÑáéíóúñ\),.;:])\d{1,2}\b", r"\1", texto_a2).strip()
    for exigido in ("mar territorial", "zona contigua", "plataforma continental",
                    "zona económica exclusiva"):
        if exigido not in texto_a2.lower():
            raise Alto(f"el Art. 2 extraido no contiene '{exigido}': la extraccion "
                       f"no sirve. INV-3.3 cita justamente esos terminos")
    print()
    print(f"  Art. 2 extraido: {len(texto_a2)} caracteres, linea {a2['linea']}")
    print(f"    {texto_a2[:100]}...")

    # ── escritura, idempotente ───────────────────────────────────────────────
    print()
    print("APLICACION")
    cambios = 0

    if v1.get("gobernaciones") == entradas:
        print("  --  gobernaciones  YA REGISTRADAS e identicas, no se tocan")
    else:
        v1["gobernaciones"] = entradas
        cambios += 1
        print(f"  ++  gobernaciones  {len(entradas)} entradas")

    art_entrada = {
        "id": "art_2",
        "titulo": "Art. 2 — ambito material de las jurisdicciones",
        "texto_decreto": texto_a2,
        "por_que_esta": ("INV-3.3 lo cita y el insumo no lo tenia: 'mar territorial', "
                         "'zona contigua' y 'plataforma continental' no aparecian en "
                         "ninguna parte del archivo, asi que esa cita del contrato no "
                         "se reproducia desde el repositorio (INV-3.7). Cierra D6."),
        "procedencia": {
            "documento": DOCUMENTO,
            "documento_sha256": OFICIAL_SHA256,
            "linea_en_el_documento": a2["linea"],
            "extraido_por": "scripts/tm025a_p3_gobernaciones.py",
            "fecha_cotejo": FECHA_COTEJO,
        },
    }
    if v1.get("articulos") == [art_entrada]:
        print("  --  articulos      YA REGISTRADO e identico, no se toca")
    else:
        v1["articulos"] = [art_entrada]
        cambios += 1
        print(f"  ++  articulos      Art. 2, {len(texto_a2)} caracteres")

    if cambios:
        escribir_json(V1, v1)

    print()
    print("=" * 78)
    print(f"  Capitanias en el insumo : {len(v1['capitanias'])}  (NO cambia)")
    print(f"  Gobernaciones           : {len(v1.get('gobernaciones', []))}")
    print(f"  Capitanias vinculadas   : {sum(len(g['capitanias']) for g in entradas)}"
          f"  (tiene que ser {len(v1['capitanias'])})")
    if sum(len(g["capitanias"]) for g in entradas) != len(v1["capitanias"]):
        raise Alto("el vinculo no cubre todas las Capitanias")
    if cambios:
        print(f"  v1 ahora                : sha256[:16] {sha256(V1)[:16]}")
        print()
        print("  EL V2 NO SE TOCA ACA. Se regenera con fase4_migrar_insumo_v2.py.")
    else:
        print("  Sin cambios. El archivo quedo igual.")
    print("=" * 78)


if __name__ == "__main__":
    try:
        main()
    except Alto as e:
        print()
        print(f"P3 DETENIDO: {e}")
        sys.exit(2)
