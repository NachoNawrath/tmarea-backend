"""
P5 — EL INSUMO DECLARA CONTRA QUE SE COTEJO, Y QUE DIFERENCIAS NO INCORPORO.

    ..\\tools\\raster-build\\.venv\\Scripts\\python.exe scripts\\tm025a_p5_declarar_cotejo.py

DOS BLOQUES, UNA MISMA IDEA
  1. `cotejado_contra`  — contra que documento se coteja este insumo, con su
     sha256 y su fecha, y CON QUE ALCANCE: que se comparo y que no. Sin esto, el
     insumo vuelve a ser un archivo del que no se sabe contra que version se
     transcribio, que es la causa raiz de todo este frente.
  2. `diferencias_no_incorporadas` — las diferencias que existen entre el texto
     oficial y el insumo y que se decidio NO incorporar, cada una con lo que el
     oficial dice literalmente, que se hizo, por que, y quien lo decide.

  Una diferencia declarada no es una ausencia. La diferencia entre las dos es
  todo lo que este frente vino a arreglar: lo que falta sin decirlo se descubre
  seis meses despues; lo que falta dicho es una decision que alguien tomo.

QUE NO SE DECIDE ACA
  Las inconsistencias internas del propio texto oficial —el mismo punto llamado
  NE en un parrafo y NW en el de al lado, una longitud escrita con hemisferio
  Sur, dos nombres distintos para la misma laguna— NO se resuelven. Resolverlas
  exige decidir que dice el decreto, y eso es del owner (CLAUDE.md §0). Se
  declaran para que esten a la vista cuando haga falta decidirlas, con lo que
  las reabre escrito al lado.

AUTOVERIFICADO (§4.4)
  Cada cita literal se comprueba contra el documento versionado antes de
  escribir nada. Una diferencia que se declara citando algo que el documento no
  dice es peor que no declararla: detiene el script.

IDEMPOTENTE. Correrlo dos veces deja el archivo igual, byte a byte.

Autorizado por el owner el 2026-08-11 como P5 de la propuesta
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
DEL_OWNER = ("no se decide aca: resolverlo exige decidir que dice el decreto, y eso "
             "es del owner (CLAUDE.md §0)")


class Alto(Exception):
    pass


COTEJADO_CONTRA = {
    "documento": DOCUMENTO,
    "norma": ("D.S. (M) N 991 del 26-10-1987, D.O. 32.931 del 27-11-1987, con las "
              "modificaciones de D.S. 020/1996, 163/1997, 058/2000, 080/2004, "
              "224/2012 y 391/2019"),
    "archivo_en_el_repo": "data/decreto/fuente/TM-025-A_2025-06-04.pdf",
    "texto_extraido": "data/decreto/fuente/TM-025-A_2025-06-04.txt",
    "sha256_texto_extraido": OFICIAL_SHA256,
    "procedencia": "data/decreto/fuente/PROCEDENCIA.md",
    "fecha_cotejo": FECHA,
    "herramienta": "_bitacoras/cotejo_tm025a_2026-08-12/cotejo.js",
    "evidencia": "_bitacoras/cotejo_tm025a_2026-08-12.txt",
    "alcance": {
        "que_se_comparo": (
            "El campo `texto_decreto` de las 64 Capitanias contra el parrafo oficial "
            "de cada una, token a token, con tildes y notacion DMS normalizadas. Las "
            "16 Gobernaciones y el Art. 2 no se compararon: no estaban, y se "
            "extrajeron del documento en P3."),
        "que_NO_se_comparo": [
            "La GEOMETRIA. El cotejo mide texto contra texto. Que el contorno "
            "construido corresponda al parrafo es otra cosa, y la audita el auditor.",
            "Los LIMITES de las Gobernaciones. Entraron como texto; derivarlos a "
            "coordenadas exige decidir que dice el decreto y no se hizo.",
            "Las notas al pie y la cabecera de pagina del documento, que son aparato "
            "de imprenta y se filtran antes de comparar.",
        ],
        "convenciones_de_transcripcion_del_corpus": (
            "El campo `texto_decreto` de las Capitanias esta transcrito en un estilo "
            "propio —sin tildes, DMS como 'dd mm ss S', coordenadas como 'lat / lon', "
            "sin el 'Su jurisdiccion comprende' inicial, numeros de Region en romanos— "
            "y esas diferencias de forma NO se listan una por una: son sistematicas y "
            "estan declaradas aca. El motivo de no re-estilar el corpus es que "
            "`respaldo_textual()` del migrador cotea los puntos del contorno contra "
            "ese campo. La fidelidad a la letra vive en el documento versionado, no "
            "en este campo. Las Gobernaciones si van literales, con tildes, porque "
            "nada cotea contra ellas."),
    },
}


DIFERENCIAS = [
    {
        "id": "meulin_ne_vs_nw",
        "donde": "CP Quemchi y CP Achao",
        "dice_el_oficial": [
            "Latitud 42°23’30\" y Longitud 073°17’00\" W, Punta NE de isla Meulín",
            "con la punta NW de la isla Meulín en el punto de Latitud 42°23’30\" S. y "
            "Longitud 073°17’00\" W.",
        ],
        "que_pasa": ("El mismo punto —42 23 30 S / 073 17 00 W— es 'Punta NE' en el "
                     "parrafo de Quemchi y 'punta NW' en el de Achao."),
        "que_hicimos": ("Se transcribieron los dos tal como estan, cada uno en su "
                        "jurisdiccion. El insumo reproduce la inconsistencia en vez "
                        "de elegir un cardinal."),
        "por_que_no_se_incorpora": (
            "Elegir NE o NW es decidir que dice el decreto. Ademas no cambia nada "
            "medible: las coordenadas son identicas en los dos parrafos y es de ahi "
            "de donde sale la geometria, no del nombre. " + DEL_OWNER),
        "reabre_si": ("alguna vez hiciera falta nombrar ese vertice en pantalla, o si "
                      "apareciera una fuente que diga cual de los dos cardinales es"),
    },
    {
        "id": "achao_longitud_con_hemisferio_sur",
        "donde": "CP Achao",
        "dice_el_oficial": ["Longitud 073°12’00\" S."],
        "que_pasa": ("El decreto escribe una LONGITUD con hemisferio S, que no "
                     "existe. El error esta en el texto oficial vigente, no en la "
                     "transcripcion: se verifico."),
        "que_hicimos": ("INCORPORADA COMO CORRECCION, no diferida. `achao` la lee "
                        "como 073 12 00 W y lo registra en `correccion_aplicada`, "
                        "porque los parrafos de CP Chonchi y CP Chaiten usan "
                        "073 12 00 W para ese mismo meridiano. Se lista aca para "
                        "dejar constancia de que el defecto es de la fuente oficial "
                        "y sobrevivio a la version del 4 de junio de 2025."),
        "por_que_no_se_incorpora": "no aplica: si se incorporo, como correccion.",
        "reabre_si": "DIRECTEMAR publica una fe de erratas",
    },
    {
        "id": "galletue_vs_gualletue",
        "donde": "GM Valdivia y CP Lago Villarrica",
        "dice_el_oficial": [
            "las lagunas Conguillío, Gualletué",
            "Lagunas Conguillío, Galletué e Icalma",
        ],
        "que_pasa": ("La misma laguna se escribe 'Gualletué' en el parrafo de la "
                     "Gobernacion y 'Galletué' en el de la Capitania."),
        "que_hicimos": ("Cada texto quedo como el decreto lo escribe. En el cotejo "
                        "lacustre esa laguna esta con resolucion 'ausente': sin "
                        "ninguna coincidencia en el catastro."),
        "por_que_no_se_incorpora": (
            "No es una diferencia con el insumo sino una inconsistencia del oficial, "
            "y elegir grafia es decidir que dice el decreto. " + DEL_OWNER),
        "reabre_si": ("HAY UN HILO CONCRETO, y este es el motivo de listarla: la "
                      "segunda grafia 'Gualletue' nunca se probo contra el shapefile "
                      "de lagos. Si calza, esa laguna deja de estar sin geometria. "
                      "Eso es medicion, no adjudicacion, y se puede hacer sin decidir "
                      "nada."),
    },
    {
        "id": "hemisferio_omitido_en_dos_parrafos",
        "donde": "CP Mejillones y CP Quemchi",
        "dice_el_oficial": [
            "desde el paralelo 22º39'00'' (Punta Tames) por el Norte",
            "ubicado en Latitud 42°23’30\" y Longitud 073°17’00\" W",
        ],
        "que_pasa": ("Los dos omiten el 'S.' del hemisferio en una latitud. El resto "
                     "de los parrafos lo escribe."),
        "que_hicimos": ("El insumo transcribio '22 39 00 S' y '42 23 30 S', o sea "
                        "SUPLIO el hemisferio en silencio. Se declara aca para que "
                        "deje de ser silencioso."),
        "por_que_no_se_incorpora": (
            "El valor no esta en duda —Chile esta entero en el hemisferio Sur y las "
            "dos Capitanias estan a esas latitudes— asi que no se revierte. Lo que se "
            "corrige es que el insumo lo hacia sin decirlo."),
        "reabre_si": "nunca; queda como constancia de una omision de la fuente",
    },
    {
        "id": "o_higgins_con_y_sin_general",
        "donde": "GM San Antonio y CP Pichilemu",
        "dice_el_oficial": [
            "sur de la Sexta Región del Libertador Bernardo O´Higgins",
            "la Sexta Región del Libertador General Bernardo O´Higgins",
        ],
        "que_pasa": ("La misma Region se nombra con y sin 'General' en dos parrafos "
                     "contiguos."),
        "que_hicimos": ("El insumo abrevia los nombres de Region ('VI Region'), asi "
                        "que la diferencia no llega al dato. Se declara para que el "
                        "cotejo no la reporte como hallazgo cada vez."),
        "por_que_no_se_incorpora": "es nomenclatura, no delimita nada.",
        "reabre_si": "nunca",
    },
    {
        "id": "bahia_paraiso_limite_sur",
        "donde": "CP Bahía Paraíso",
        "dice_el_oficial": [
            "Y por el Sur, con las costas más australes de la provincia Antártica "
            "Chilena entre los meridianos 53°00’00W y 90°00’00” W.",
        ],
        "que_pasa": ("El decreto declara que los cuatro puntos de esta Capitania son "
                     "su limite NORTE y que por el Sur el limite es la costa "
                     "antartica. El insumo transcribio los cuatro puntos y omitio "
                     "esa oracion, y por eso la figura se construye como ANILLO "
                     "CERRADO: el segmento que la cierra por el Sur —de "
                     "069 15 00 S / 090 00 00 W a 070 00 00 S / 053 00 00 W— NO ESTA "
                     "EN EL DECRETO (INV-0.2)."),
        "que_hicimos": ("DIFERIDA A SU PROPIA ETAPA, con el texto ya redactado y "
                        "verificado en la constante DIFERIDAS de "
                        "scripts/tm025a_p2_completar_texto.py. Se aplico y se midio "
                        "el 2026-08-11: al sumar la oracion, el migrador pasa el "
                        "tramo de cierre de 'frontera' a 'litoral' y sigue_litoral a "
                        "true —lo cual es correcto—, pero con el parrafo nombrando la "
                        "costa el control B8 exige adjudicacion del owner para LOS "
                        "CUATRO tramos y la auditoria pasa de LIMPIA a 4 fallos."),
        "por_que_no_se_incorpora": (
            "Porque incorporarla sin la adjudicacion deja el insumo sin auditar, y "
            "B8 no se afloja (CLAUDE.md §0.3). En esta jurisdiccion el texto ES lo "
            "que dispara la decision sobre la figura, asi que van juntos. " + DEL_OWNER),
        "contenido_hoy": (
            "El defecto es real y esta CONTENIDO, medido el 2026-08-11: "
            "jurisdicciones_ds991 no existe, el ambito antartico esta declarado no "
            "publicado, no hay traslapes entre las cuatro antarticas, y la figura mas "
            "al Norte llega a -57,700 mientras una ruta chilena no baja de -56. Hoy "
            "no alcanza ninguna ruta ni ninguna bandera."),
        "reabre_si": ("el owner adjudica el tipo de los cuatro tramos de Bahia "
                      "Paraiso. Ahi entra el texto, se repara la figura y se "
                      "comprueba antes que la capa de tierra declarada cubra la "
                      "Antartida"),
    },
]


def sha256(ruta):
    return hashlib.sha256(open(ruta, "rb").read()).hexdigest()


def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[º°ª]", " ", s)
    s = re.sub(r"[’‘´`'\"“”′″]", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def texto_oficial():
    real = sha256(OFICIAL)
    if real != OFICIAL_SHA256:
        raise Alto(f"el texto oficial en disco tiene sha256 {real[:16]} y este script "
                   f"se escribio contra {OFICIAL_SHA256[:16]}")
    crudo = open(OFICIAL, encoding="utf-8").read().replace("\x0c", "")
    lineas = [l.strip() for l in crudo.split("\n")
              if l.strip()
              and not re.match(r"^\d{1,3}\s+D\.S\.\s*\(M\)", l.strip())
              and not re.search(r"FIJA JURISDICCI[OÓ]N DE LAS GOBERNACIONES", l, re.I)
              and not re.match(r"^ESTABLECE LAS CAPITAN", l.strip(), re.I)]
    return norm(" ".join(lineas))


def escribir_json(ruta, doc):
    crudo = open(ruta, encoding="utf-8").read()
    ls = [l for l in crudo.splitlines() if l.strip()]
    sangria = len(ls[1]) - len(ls[1].lstrip()) if len(ls) > 1 else 2
    with open(ruta, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(doc, ensure_ascii=False, indent=sangria))


def main():
    doc = texto_oficial()
    v1 = json.load(open(V1, encoding="utf-8"))

    print("=" * 78)
    print("P5 — COTEJADO_CONTRA Y DIFERENCIAS_NO_INCORPORADAS")
    print("=" * 78)
    print(f"  insumo    : sha256[:16] {sha256(V1)[:16]}")
    print(f"  documento : {DOCUMENTO}  sha256[:16] {OFICIAL_SHA256[:16]}  ok")
    print()

    print("VERIFICACION DE LAS CITAS CONTRA EL DOCUMENTO")
    for d in DIFERENCIAS:
        for cita in d["dice_el_oficial"]:
            if norm(cita) not in doc:
                raise Alto(f"{d['id']}: la cita NO aparece en el documento oficial.\n"
                           f"    {cita[:100]}")
        print(f"  ok  {d['id']:<38} {len(d['dice_el_oficial'])} cita(s)")
    print()

    print("APLICACION")
    cambios = 0
    if v1.get("cotejado_contra") == COTEJADO_CONTRA:
        print("  --  cotejado_contra             YA DECLARADO, no se toca")
    else:
        v1["cotejado_contra"] = COTEJADO_CONTRA
        cambios += 1
        print("  ++  cotejado_contra             declarado")

    if v1.get("diferencias_no_incorporadas") == DIFERENCIAS:
        print("  --  diferencias_no_incorporadas YA DECLARADAS, no se tocan")
    else:
        v1["diferencias_no_incorporadas"] = DIFERENCIAS
        cambios += 1
        print(f"  ++  diferencias_no_incorporadas {len(DIFERENCIAS)} entradas")
        for d in DIFERENCIAS:
            print(f"        {d['id']:<38} {d['donde']}")

    if cambios:
        escribir_json(V1, v1)

    print()
    print("=" * 78)
    if cambios:
        print(f"  v1 ahora: sha256[:16] {sha256(V1)[:16]}")
        print("  EL V2 NO SE TOCA ACA. Se regenera con fase4_migrar_insumo_v2.py.")
    else:
        print("  Sin cambios. El archivo quedo igual.")
    print("=" * 78)


if __name__ == "__main__":
    try:
        main()
    except Alto as e:
        print()
        print(f"P5 DETENIDO: {e}")
        sys.exit(2)
