"""
P2 — COMPLETAR EL TEXTO LITERAL DE LAS DIEZ CAPITANIAS A LAS QUE LES FALTA.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\tm025a_p2_completar_texto.py

QUE ARREGLA
  INV-3.7 dice: "Cada Capitania conserva el texto literal del decreto que la
  define." Diez no lo conservaban. El cotejo del 2026-08-11 contra el texto
  oficial TM-025 A (actualizado al 4 de junio de 2025) las midio una por una:
  _bitacoras/cotejo_tm025a_2026-08-12.txt §3.a.

  No es una correccion de un error: es contenido del parrafo que nunca llego al
  campo. Por eso no usa 'correccion_aplicada', que registra otra cosa.

DONDE SE ESCRIBE
  En el V1 (data/decreto/jurisdicciones_capitanias.json), que es la FUENTE. El
  v2 es derivado y se regenera; escribir ahi se perderia en la proxima
  migracion. Esa leccion la dejo la compuerta P0 sobre Valdivia.

EN QUE ESTILO
  El corpus del insumo esta transcrito en un estilo propio: sin tildes, DMS como
  "dd mm ss S", coordenadas como "lat / lon", y sin el "Su jurisdiccion
  comprende" inicial. El agregado RESPETA ESE ESTILO en vez de pegar el texto
  oficial crudo, por dos motivos medidos:
    1. `respaldo_textual()` del migrador cotea cada punto del contorno contra
       este campo buscando sus ejes escritos. Cambiar el estilo del corpus
       moveria ese cotejo, que es lo que decide que puntos se usan para
       construir. Agregar solo puede sumar coincidencias, nunca quitarlas.
    2. La fidelidad a la letra ya no depende de este campo: desde P1 el texto
       oficial vive versionado en data/decreto/fuente/ con su sha256. Este campo
       es la transcripcion; aquel es la letra.
  Cada agregado viaja con su CITA LITERAL del documento oficial, que si conserva
  tildes y puntuacion.

AUTOVERIFICADO (§4.4)
  - Comprueba el sha256 del documento oficial contra el declarado aca. Si no
    coincide, se detiene: no se completa un insumo contra un texto que no es el
    que se cotejo.
  - Comprueba que CADA cita literal aparezca de verdad DENTRO DEL PARRAFO de su
    jurisdiccion, localizado por su encabezado oficial. Una cita mal atribuida
    detiene el script. Eso es
    lo que impide que este archivo se convierta en una lista de afirmaciones que
    nadie vuelve a verificar.

IDEMPOTENTE
  Una Capitania que ya trae su agregado no se vuelve a tocar. Correrlo dos veces
  deja el archivo igual, byte a byte.

Autorizado por el owner el 2026-08-11 como P2 de la propuesta
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
FECHA_COTEJO = "2026-08-11"


class Alto(Exception):
    pass


# ── las diez ─────────────────────────────────────────────────────────────────
# `agregado`: lo que se suma a texto_decreto, en el estilo del corpus.
# `cita`    : el texto oficial literal, con tildes, tal como esta en el PDF.
# `encabezado`: el encabezado oficial del parrafo. El script lo busca en el
#              documento y verifica ahi adentro; no hay numeros de linea que mantener.
FALTANTES = [
    {
        "id": "carahue",
        "encabezado": "- Capitanía de Puerto de Carahue",
        "agregado": ("Incluye los rios Imperial, Queule, Moncul, Tolten (lo que "
                     "comprende la jurisdiccion de la comuna de Tolten, hasta su "
                     "desembocadura al mar), los lagos Budi, Queule y laguna "
                     "Trovolhue."),
        "cita": ("Incluye los ríos Imperial, Queule, Moncul, Toltén (lo que comprende "
                 "la jurisdicción de la comuna de Toltén, hasta su desembocadura al "
                 "mar), los lagos Budi, Queule y laguna Trovolhue."),
        "motivo": ("La clausula entera falta en el insumo. Es la que nombra los "
                   "cuerpos de agua de la Capitania, y acota que bahia puede ser el "
                   "id 108 de SITPORT, atribuido a Carahue por Totalgeneral."),
    },
    {
        "id": "lago_villarrica",
        "encabezado": "- Capitanía de Puerto de Lago Villarrica",
        "agregado": (" El Rio Tolten, desde su origen hasta la jurisdiccion de la "
                     "comuna de Pitrufquen."),
        "cita": ("el Río Toltén (desde su origen hasta la jurisdicción de la comuna "
                 "de Pitrufquén)"),
        "motivo": ("El insumo nombra el Rio Tolten sin su alcance. El alcance es la "
                   "costura con Carahue, que tiene el mismo rio 'hasta su "
                   "desembocadura al mar': sin el, las dos jurisdicciones reclaman el "
                   "rio entero."),
    },
    {
        "id": "lago_ranco",
        "encabezado": "- Capitanía de Puerto de Lago Ranco",
        "agregado": (" Los sectores del rio Bueno con sus coordenadas: Los Patos "
                     "40 17 03 S / 073 31 43 W; La Goleta 40 17 13 S / 073 36 52 W; "
                     "El Manzanito 40 15 06 S / 073 41 01 W."),
        "cita": ("Los Patos, latitud: 40°17’03\" S. y longitud 073°31’43\" W.; La "
                 "Goleta, latitud 40°17’13\" S. y longitud 073°36’52\" W y El "
                 "Manzanito, latitud 40°15’06\" S. y longitud 073º41’01\" W."),
        "motivo": ("El insumo nombra los tres sectores y omite sus coordenadas. El "
                   "decreto SI las entrega. Hoy el rio Bueno esta 'rechazado' en el "
                   "cotejo lacustre por falta de geometria, y estas son geometria."),
    },
    {
        "id": "valdivia",
        "encabezado": "- Capitanía de Puerto de Valdivia",
        "agregado": (" Incluye los Rios Calle Calle, Lingue, Cruces, Angachilla, "
                     "Tornagaleones, Valdivia y sus afluentes navegables."),
        "cita": ("Incluye los Ríos Calle Calle, Lingue, Cruces, Angachilla, "
                 "Tornagaleones, Valdivia y sus afluentes navegables."),
        "motivo": ("La clausula fluvial entera falta. Es la que sostiene que Valdivia "
                   "es un frente fluvial, que es el fundamento de la declaracion del "
                   "owner del 2026-08-10 sobre su punto representativo."),
    },
    {
        "id": "corral",
        "encabezado": "- Capitanía de Puerto de Corral",
        "agregado": " Incluye el rio Colun.",
        "cita": "Incluye el río Colún.",
        "motivo": "La clausula falta en el insumo.",
    },
    {
        "id": "talcahuano",
        "encabezado": "- Capitanía de Puerto de Talcahuano",
        "agregado": " Incluye tambien las lagunas Chica y Grande de San Pedro.",
        "cita": ("Incluye la isla Quiriquina y las lagunas Chica y Grande de San "
                 "Pedro."),
        "motivo": ("El insumo transcribio 'Incluye la isla Quiriquina' y corto antes "
                   "de las dos lagunas. Nota medida: el cotejo lacustre de Fase 2 "
                   "rechazo 'LAGUNA GRANDE DE SAN PEDRO' como candidata del Rio San "
                   "Pedro de lago_panguipulli por estar en la Region VIII; el texto "
                   "oficial muestra que ese cuerpo tiene dueno, y es esta Capitania."),
    },
    {
        "id": "cochamo",
        "encabezado": "- Capitanía de Puerto de Cochamó",
        "agregado": " Los dos lagos en la frontera con la Republica Argentina.",
        "cita": ("los Lagos Tagua - Tagua e Inferior en la frontera con la República "
                 "Argentina."),
        "motivo": ("El insumo nombra los lagos y omite el calificador que los ubica. "
                   "Es descriptivo, y aun asi es texto del decreto que faltaba."),
    },
    {
        "id": "tierra_del_fuego",
        "encabezado": "- Capitanía de Puerto de Tierra del Fuego",
        "agregado": (" Asimismo, todas aquellas aguas que estan en Tierra del Fuego y "
                     "tienen su acceso por el Norte y se extienden al Sur de la "
                     "latitud 54 33 00 S: senos Martinez y Fontaine, Brazo O'Ryan, "
                     "senos Agostini, Serrano y Hyatt y bahias Parry y Blanca."),
        "cita": ("Asimismo, todas aquellas aguas que están en Tierra del Fuego y tiene "
                 "su acceso por el Norte y se extienden al Sur de la latitud 54°33’00\" "
                 "Sur, senos Martínez y Fontaine, Brazo O’Ryan, senos Agostini, "
                 "Serrano y Hyatt y bahías Parry y Blanca."),
        "motivo": ("La oracion final entera falta. Es una de las dos mitades del "
                   "reparto en el paralelo 54 33 00 S; la otra esta en el parrafo de "
                   "Puerto Williams y tambien faltaba. Es el caso Ancud con los dos "
                   "lados ausentes."),
    },
    {
        "id": "puerto_williams",
        "encabezado": "GOBERNACIÓN MARÍTIMA DE PUERTO WILLIAMS",
        "agregado": (" Incluye ademas aquellas aguas que estan en Tierra del Fuego y "
                     "tienen su entrada por el Sur, hasta el Canal Ocasion, el que se "
                     "divide en la latitud 54 33 00 S y de alli por dicho paralelo "
                     "hacia el Oceano Pacifico. Comprende tambien los rios, lagos y "
                     "lagunas contenidos en dicha jurisdiccion."),
        "cita": ("y aquellas aguas que están en Tierra del Fuego y tienen su entrada "
                 "por el Sur, hasta el Canal Ocasión el que se divide en la Latitud "
                 "54°33’00\" S y de allí por dicho paralelo hacia el Océano Pacífico."),
        "motivo": ("Faltaban dos trozos: la clausula del Canal Ocasion —contrapartida "
                   "de la de Tierra del Fuego— y el cierre 'Comprende tambien los "
                   "rios, lagos y lagunas contenidas en dicha jurisdiccion', que es "
                   "lo unico que le da ambito fluvial y lacustre."),
        "cita_2": ("Comprende también los ríos, lagos y lagunas contenidas en dicha "
                   "jurisdicción."),
    },
]


# ── DIFERIDA, DECLARADA, NO AUSENTE ──────────────────────────────────────────
# bahia_paraiso NO entra en P2. Se aplico, se midio y se retiro el 2026-08-11.
#
# QUE PASO AL APLICARLA: el migrador deriva el tipo de cada tramo del texto del
# parrafo. Al sumar "las costas mas australes", el tramo de cierre —el que va de
# 069 15 00 S / 090 00 00 W a 070 00 00 S / 053 00 00 W, que es el que el decreto
# NO escribe— paso de "frontera" a "litoral" y sigue_litoral paso a true. Eso es
# CORRECTO: ese lado es la costa y el decreto lo dice.
#
# POR QUE SE RETIRA IGUAL: con el parrafo mencionando la costa, el control B8 del
# auditor exige adjudicacion del owner para LOS CUATRO tramos de la jurisdiccion
# —no solo para el que cambio—, porque ninguna regla de posicion acierta cuando el
# parrafo nombra costa. Medido: la auditoria pasa de LIMPIA a 4 fallos en B8. B8 no
# se afloja (CLAUDE.md §0.3) y la adjudicacion es del owner (§0.4: interpretar una
# fuente normativa).
#
# LO QUE ESTO CORRIGE DE LA PROPUESTA: la propuesta separaba "el texto ahora, la
# figura en su propia etapa". La medicion muestra que en esta jurisdiccion no se
# pueden separar: el texto ES lo que dispara la decision sobre la figura. Van
# juntos, en la etapa de Bahia Paraiso: texto + adjudicacion de sus 4 tramos +
# reparacion de la figura + comprobar que la capa de tierra declarada cubra la
# Antartida.
#
# La entrada queda escrita para que se aplique ahi, no se reescribe de memoria:
DIFERIDAS = [
    {
        "id": "bahia_paraiso",
        "encabezado": "- Capitanía de Puerto Bahía Paraíso.",
        "agregado": (" Los cuatro puntos anteriores son el limite NORTE. Por el Sur, "
                     "el limite son las costas mas australes de la provincia Antartica "
                     "Chilena entre los meridianos 053 00 00 W y 090 00 00 W."),
        "cita": ("Y por el Sur, con las costas más australes de la provincia Antártica "
                 "Chilena entre los meridianos 53°00’00W y 90°00’00” W."),
        "motivo": ("El insumo transcribio los cuatro puntos y omitio que son el limite "
                   "NORTE y que el Sur es la costa. Por esa omision la figura se "
                   "construye como anillo cerrado y el segmento que la cierra por el "
                   "Sur NO esta en el decreto (INV-0.2). ESTE AGREGADO ARREGLA EL "
                   "TEXTO, NO LA FIGURA: la figura se repara en su propia etapa, con "
                   "la comprobacion previa de que la capa de tierra declarada cubra la "
                   "Antartida. Medido el 2026-08-11: hoy la figura mala esta contenida "
                   "— jurisdicciones_ds991 no existe, el ambito antartico esta no "
                   "publicado, no hay traslapes entre las cuatro antarticas y la mas "
                   "al Norte llega a -57,700, mientras una ruta chilena no baja "
                   "de -56."),
    },
]


def sha256(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def normalizar(s):
    """Sin tildes, sin comillas ni primas, minusculas, espacios colapsados.

    Sirve para preguntar si una cita esta en el documento sin que la respuesta
    dependa de como pdftotext partio la linea o de que comilla uso la imprenta.
    """
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[º°ª]", " ", s)
    s = re.sub(r"[’‘´`'\"“”′″]", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def escribir_json(ruta, doc):
    """Reescribe conservando la sangria que el archivo ya tenia, para que el diff
    muestre el cambio real y no una reindentacion completa."""
    crudo = open(ruta, encoding="utf-8").read()
    lineas = [l for l in crudo.splitlines() if l.strip()]
    sangria = len(lineas[1]) - len(lineas[1].lstrip()) if len(lineas) > 1 else 2
    with open(ruta, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(doc, ensure_ascii=False, indent=sangria))


def leer_lineas(ruta):
    """Lineas del documento, numeradas COMO LAS NUMERA GREP O UN EDITOR.

    No usar str.splitlines(): pdftotext emite un salto de pagina (\\x0c) en cada
    cambio de pagina y splitlines() lo cuenta como fin de linea, con lo cual la
    numeracion de Python se corre una linea por pagina — nueve de diferencia ya
    en Carahue. El salto de pagina se limpia como el resto del aparato.
    """
    crudo = open(ruta, encoding="utf-8").read()
    return crudo.replace("\x0c", "").split("\n")


def bloque_de(lineas, encabezado):
    """El parrafo oficial de una jurisdiccion: desde su encabezado hasta el
    siguiente encabezado o articulo. Se localiza por el texto del encabezado y
    no por un numero de linea, para que no haya un dato frágil que alguien tenga
    que mantener sincronizado a mano."""
    objetivo = normalizar(encabezado)
    ini = None
    for i, l in enumerate(lineas):
        if normalizar(l) == objetivo:
            if ini is not None:
                raise Alto(f"el encabezado '{encabezado}' aparece mas de una vez en "
                           f"el documento: no identifica un parrafo")
            ini = i
    if ini is None:
        raise Alto(f"no se encontro el encabezado '{encabezado}' en el documento oficial")
    for j in range(ini + 1, len(lineas)):
        t = lineas[j].strip()
        if (re.match(r"^-\s*Capitan[ií]a de Puerto", t)
                or re.match(r"^GOBERNACI[OÓ]N MAR[IÍ]TIMA", t)
                or re.match(r"^Art\.\s*\d", t)):
            return ini + 1, j, lineas[ini:j]
    return ini + 1, len(lineas), lineas[ini:]


def verificar_documento():
    if not os.path.exists(OFICIAL):
        raise Alto(f"no esta el texto oficial en {os.path.relpath(OFICIAL, REPO)}. "
                   f"P1 tiene que haberse aplicado antes que P2")
    real = sha256(OFICIAL)
    if real != OFICIAL_SHA256:
        raise Alto(f"el texto oficial en disco tiene sha256 {real[:16]} y este "
                   f"script se escribio contra {OFICIAL_SHA256[:16]}. No se completa "
                   f"un insumo contra un texto que no es el que se cotejo")
    return leer_lineas(OFICIAL)


def sin_aparato(lineas):
    """Quita el aparato de imprenta: notas al pie y cabecera repetida de pagina.

    Hace falta porque una clausula del decreto puede quedar PARTIDA por un salto
    de pagina — a Carahue la corta un bloque de seis notas al pie y la cabecera
    de la pagina 11 justo en medio de 'Incluye los rios Imperial, / Queule,
    Moncul, Tolten...'. Sin esto, la cita existe en el documento y la
    verificacion diria que no. Es el mismo filtro que usa cotejo.js.
    """
    fuera = []
    for l in lineas:
        t = l.strip()
        if not t:
            continue
        if re.match(r"^\d{1,3}\s+D\.S\.\s*\(M\)", t):
            continue
        if re.search(r"FIJA JURISDICCI[OÓ]N DE LAS GOBERNACIONES", t, re.I):
            continue
        if re.match(r"^ESTABLECE LAS CAPITAN", t, re.I):
            continue
        fuera.append(t)
    return fuera


def verificar_citas(lineas_doc):
    """Cada cita tiene que aparecer de verdad en el parrafo que dice.

    Sin esto, la lista de arriba es un conjunto de afirmaciones que nadie vuelve
    a comprobar — que es exactamente el defecto que P2 existe para cerrar.
    """
    print("VERIFICACION DE LAS CITAS CONTRA EL DOCUMENTO OFICIAL")
    for e in FALTANTES:
        d, h, bloque = bloque_de(lineas_doc, e["encabezado"])
        ventana = normalizar(" ".join(sin_aparato(bloque)))
        n = 0
        for clave in ("cita", "cita_2"):
            cita = e.get(clave)
            if not cita:
                continue
            if normalizar(cita) not in ventana:
                raise Alto(f"{e['id']}: la {clave} NO aparece en el parrafo de "
                           f"'{e['encabezado']}' (lineas {d}-{h}).\n"
                           f"    cita: {cita[:90]}")
            n += 1
        print(f"  ok  {e['id']:<18} {n} cita(s) en '{e['encabezado']}'  lineas {d}-{h}")
    print()


def main():
    lineas_doc = verificar_documento()
    print("=" * 78)
    print("P2 — COMPLETAR EL TEXTO LITERAL DE LAS DIEZ CAPITANIAS")
    print("=" * 78)
    print(f"  insumo    : data/decreto/jurisdicciones_capitanias.json (el v1, la fuente)")
    print(f"              sha256[:16] {sha256(V1)[:16]}")
    print(f"  documento : {DOCUMENTO}")
    print(f"              data/decreto/fuente/TM-025-A_2025-06-04.txt")
    print(f"              sha256[:16] {OFICIAL_SHA256[:16]}  ok")
    print()

    verificar_citas(lineas_doc)

    v1 = json.load(open(V1, encoding="utf-8"))
    caps = {c["id"]: c for c in v1["capitanias"]}
    faltan_ids = [e["id"] for e in FALTANTES if e["id"] not in caps]
    if faltan_ids:
        raise Alto(f"ids que no existen entre las capitanias del v1: {faltan_ids}")

    print("APLICACION")
    aplicadas, ya = 0, 0
    for e in FALTANTES:
        cap = caps[e["id"]]
        registro = cap.setdefault("completado_desde_oficial", [])
        if any(r["agregado"] == e["agregado"] for r in registro):
            print(f"  --  {e['id']:<18} YA APLICADO, no se toca")
            ya += 1
            continue

        # Un solo espacio entre el texto que ya estaba y el agregado, sin
        # depender de como venga escrito cada literal de la lista.
        cap["texto_decreto"] = cap["texto_decreto"].rstrip() + " " + e["agregado"].strip()
        registro.append({
            "agregado": e["agregado"],
            "cita_oficial": e["cita"],
            **({"cita_oficial_2": e["cita_2"]} if e.get("cita_2") else {}),
            "parrafo_oficial": e["encabezado"],
            "motivo": e["motivo"],
            "documento": DOCUMENTO,
            "documento_sha256": OFICIAL_SHA256,
            "fecha_cotejo": FECHA_COTEJO,
            "aplicado_por": "scripts/tm025a_p2_completar_texto.py",
        })
        aplicadas += 1
        print(f"  ++  {e['id']:<18} +{len(e['agregado'])} caracteres")
        print(f"      {e['agregado'].strip()[:88]}...")

    if aplicadas:
        escribir_json(V1, v1)

    print()
    print("=" * 78)
    print(f"  aplicadas: {aplicadas}   ya estaban: {ya}   total: {len(FALTANTES)}")
    if aplicadas:
        print(f"  v1 ahora  : sha256[:16] {sha256(V1)[:16]}")
        print()
        print("  EL V2 NO SE TOCA ACA. Es derivado: se regenera con")
        print("  fase4_migrar_insumo_v2.py y los dos pasos que le siguen.")
    else:
        print("  Sin cambios. El archivo quedo igual.")
    print("=" * 78)


if __name__ == "__main__":
    try:
        main()
    except Alto as e:
        print()
        print(f"P2 DETENIDO: {e}")
        sys.exit(2)
