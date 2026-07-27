"""
Extractor de tramo nombrado para pasos.csv y peligros.csv sobre el tomo
completo (pp. 141-623). Unidad de extraccion = tramo nombrado, no punto
(spec v2.0, docs/extraccion-derrotero-shoa.md). No usa coordenadas.

Prioridad: pasos.csv (calibra el margen del router). peligros.csv es
secundario -- ver docs para el porque.

Controles de calidad pedidos:
  - texto_aproximado: 'si' cuando el fragmento trae lenguaje aproximado
    ("poco mas de", "alrededor de", "varia desde", "unos", "cerca de") y
    el campo numerico correspondiente quedo vacio por esa razon.
  - es_duplicado_de: pagina de la primera aparicion del mismo nombre
    dentro del mismo canal (canonico), cuando se repite.
  - canal: nombre canonico de corredor (headers.canonical_corredor) si
    matchea Prioridad 1-3; si no, el titulo crudo del encabezado de pagina.
"""
import csv
import pickle
import re
import sys

sys.path.insert(0, r"C:\Users\katia\tmarea-backend\tools\derrotero")
from headers import parse_header, extraer_canal_de_titulo, prioridad_1_de

TEXT_CACHE = r"C:\tmarea-data\raw\derrotero_cols_141_623.pkl"

# ---------------------------------------------------------------------------
# Ruido a filtrar (spec Sec 0, "Ruido a filtrar")
# ---------------------------------------------------------------------------

HEADER_LINE_RE = re.compile(r"^PUBLICACIÓN ACTUALIZADA AL BOLETÍN.*$", re.MULTILINE)
# Encabezado corrido de seccion (ej. "VII-1-18 (3002) CANAL CHACAO Cap. VII"):
# hay que sacarlo del cuerpo antes de buscar entradas "Nombre.-", si no
# "CANAL CHACAO" (sin punto) se pega al siguiente parrafo real y contamina
# el nombre extraido (bug encontrado en la validacion sobre pp.141-173).
SECTION_HEADER_LINE_RE = re.compile(
    r"^(?:Cap\.\s*(?:VII|VIII)\s+.+?\s*\(3002\)\s*(?:VII|VIII)-[\dA-Za-z-]+"
    r"|(?:VII|VIII)-[\dA-Za-z-]+\s*\(3002\)\s*.+?\s*Cap\.\s*(?:VII|VIII))\s*$",
    re.MULTILINE,
)
FOOTER_LINE_RE = re.compile(r"^(Copia Autorizada.*|Powered by TCPDF.*|Cambio No.*|Original,.*)$", re.MULTILINE)
CARTAS_LINE_RE = re.compile(r"^Cartas?:\s*[\d\s-]+$", re.MULTILINE)


# Guionado de fin de linea por justificado ("aproxima-\ndamente"): se junta
# ANTES de buscar frases, si no partes como "aproximadamente" quedan rotas
# en dos lineas y los regex de ancho/sonda/corriente no matchean (bug real
# encontrado en Paso Sur, p.165, validando contra Chacao).
DEHYPHEN_RE = re.compile(r"([a-záéíóúñ])-\n([a-záéíóúñ])")


def clean_page(text):
    text = DEHYPHEN_RE.sub(r"\1\2", text)
    text = HEADER_LINE_RE.sub("", text)
    text = SECTION_HEADER_LINE_RE.sub("", text)
    text = FOOTER_LINE_RE.sub("", text)
    return text


# ---------------------------------------------------------------------------
# Deteccion de entradas "Nombre.- ..." y su clausula acotada (hasta la
# siguiente entrada, nunca por ventana de caracteres fija -- ese fue el bug
# de "Bajo Amazonas" en el piloto Chacao).
# ---------------------------------------------------------------------------

ENTRY_RE = re.compile(r"(?m)^([A-ZÁÉÍÓÚÑ][^\n]{2,70}?)\.-\s")

PASO_KEYWORDS = re.compile(
    r"^(Canal|Paso|Angostura|Boca|Estrecho|Freo|Golfo|Seno|Fiordo)\b", re.IGNORECASE
)
PELIGRO_KEYWORDS = [
    (re.compile(r"^Restos?\s+[Nn]áufragos?", re.IGNORECASE), "naufragio"),
    (re.compile(r"^Rocas?\b", re.IGNORECASE), "roca"),
    (re.compile(r"^Bajo\b", re.IGNORECASE), "bajo"),
    (re.compile(r"^Restinga\b", re.IGNORECASE), "restinga"),
    (re.compile(r"^Banco\b", re.IGNORECASE), "banco"),
    (re.compile(r"^Escollo\b", re.IGNORECASE), "escollo"),
]

APROX_RE = re.compile(
    r"poco\s+m[aá]s\s+de|alrededor\s+de|var[ií]a\s+desde|\bunos\b|\bunas\b|cerca\s+de",
    re.IGNORECASE,
)

CABLE_M = 185.2
MILLA_M = 1852.0

# Tolerancia a un numero de linea suelto (10/20/30/40...) intercalado por el
# layout a dos columnas justo entre el valor y su unidad -- ej. "tiene 1,6
# 20 millas de ancho". El recorte por columnas (ver main) ya elimina la
# mezcla de texto de la OTRA columna, pero el numero de linea en si puede
# seguir cayendo ahi. No se filtra globalmente porque no se puede distinguir
# de forma segura de un dato real (ese es justamente el riesgo que describe
# el spec); se tolera solo en el punto exacto donde se espera la unidad.
_NOISE_NUM = r"(?:\d{1,2}\s+)?"

# ancho: numero + unidad (cable/milla) + "de ancho" en cualquier orden usual.
# "de" y "aproximadamente" aparecen en cualquier orden segun la pagina
# ("ancho navegable de aproximadamente X" vs "aproximadamente de X").
ANCHO_RE = re.compile(
    r"(?:ancho\s+(?:medio\s+)?(?:navegable\s+)?(?:de\s+)?(?:aproximadamente\s+)?(?:de\s+)?(?P<a1>\d{1,4}(?:[.,]\d+)?)\s*" + _NOISE_NUM + r"(?P<u1>cables?|millas?)"
    r"|(?:tiene\s+)?(?P<a2>\d{1,4}(?:[.,]\d+)?)\s*" + _NOISE_NUM + r"(?P<u2>cables?|millas?)\s+de\s+ancho"
    # "reducido ancho —menos de 1 cable—": el valor es una cota superior
    # (el paso es MENOS ancho que eso), pero es el unico numero disponible.
    r"|ancho\s*[—\-]*\s*menos\s+de\s+(?P<a3>\d{1,4}(?:[.,]\d+)?)\s*" + _NOISE_NUM + r"(?P<u3>cables?|millas?))",
    re.IGNORECASE,
)

SONDA_RE = re.compile(
    r"(?:de\s+)?(?P<s1>\d{1,3}(?:[.,]\d+)?)\s*(?:a\s*(?P<s2>\d{1,3}(?:[.,]\d+)?)\s*)?" + _NOISE_NUM + r"metros\s+de\s+profundidad"
    # orden invertido: "profundidad (minima) de X metros" (sin "de profundidad" despues)
    r"|profundidad\s+(?:m[ií]nima\s+)?de\s+(?P<s3>\d{1,3}(?:[.,]\d+)?)\s*" + _NOISE_NUM + r"metros",
    re.IGNORECASE,
)

CORRIENTE_RE = re.compile(
    r"(?P<c1>\d{1,2}(?:[.,]\d+)?)\s*(?:a\s*(?P<c2>\d{1,2}(?:[.,]\d+)?)\s*)?" + _NOISE_NUM + r"nudos",
    re.IGNORECASE,
)

CALADO_RE = re.compile(
    r"calado\s+(?:menor|inferior)\s+(?:de|a)\s+(?P<cal>\d{1,2}(?:[.,]\d+)?)\s*metros",
    re.IGNORECASE,
)

ESLORA_RE = re.compile(
    r"(?:hasta\s+)?(?P<esl>\d{1,3}(?:[.,]\d+)?)\s*metros\s+de\s+eslora",
    re.IGNORECASE,
)


def to_float(s):
    return float(s.replace(",", "."))


def carta_ref_de(text):
    m = re.search(r"Cartas?:\s*([\d\s-]+)", text)
    if not m:
        return ""
    nums = [n.strip() for n in m.group(1).split("-") if n.strip()]
    specific = [n for n in nums if n != "7000"]
    return specific[0] if specific else (nums[0] if nums else "")


def extraer_pagina(pagina, text, canal, carta_ref, pasos_out, peligros_out, dup_tracker_pasos, dup_tracker_peligros):
    text_clean = clean_page(text)
    matches = list(ENTRY_RE.finditer(text_clean))
    for idx, m in enumerate(matches):
        nombre = re.sub(r"\s+", " ", m.group(1)).strip()
        start = m.end()
        # Si es la ultima entrada de la pagina no hay "siguiente Nombre.-"
        # que la acote; 400 caracteres resulto insuficiente en la practica
        # (Canal Tenglo, p.291: la sonda quedaba justo despues del corte).
        end = matches[idx + 1].start() if idx + 1 < len(matches) else min(len(text_clean), start + 700)
        clausula = text_clean[start:end]
        clausula_full = (nombre + ".- " + clausula).strip()

        if PASO_KEYWORDS.match(nombre):
            # Si la propia entrada nombra un corredor de nivel superior
            # (Canal/Golfo/Boca/Estrecho/Freo/Seno/Fiordo X), el canal es
            # el propio nombre, no el de la pagina que lo contiene -- evita
            # que una mencion de "Boca del Guafo" en una pagina de Canal
            # Chacao quede atribuida a Canal Chacao.
            es_top_level = re.match(r"^(Canal|Golfo|Boca|Estrecho|Freo|Seno|Fiordo)\b", nombre, re.IGNORECASE)
            canal_fila = extraer_canal_de_titulo(nombre) if es_top_level else canal
            canal_fila = canal_fila or canal

            aprox_hit = bool(APROX_RE.search(clausula_full))

            ancho_m = None
            am = ANCHO_RE.search(clausula_full)
            if am:
                val = am.group("a1") or am.group("a2") or am.group("a3")
                unit = (am.group("u1") or am.group("u2") or am.group("u3") or "").lower()
                factor = MILLA_M if unit.startswith("milla") else CABLE_M
                ancho_m = round(to_float(val) * factor)

            sonda_m = None
            sm = SONDA_RE.search(clausula_full)
            if sm:
                if sm.group("s1"):
                    v1 = to_float(sm.group("s1"))
                    v2 = to_float(sm.group("s2")) if sm.group("s2") else None
                    sonda_m = min(v1, v2) if v2 is not None else v1
                else:
                    sonda_m = to_float(sm.group("s3"))

            corriente_kt = None
            cm = CORRIENTE_RE.search(clausula_full)
            if cm:
                v1 = to_float(cm.group("c1"))
                v2 = to_float(cm.group("c2")) if cm.group("c2") else None
                corriente_kt = max(v1, v2) if v2 is not None else v1

            calado_m = None
            clm = CALADO_RE.search(clausula_full)
            if clm:
                calado_m = to_float(clm.group("cal"))

            eslora_m = None
            elm = ESLORA_RE.search(clausula_full)
            if elm:
                eslora_m = round(to_float(elm.group("esl")))

            texto_aproximado = "si" if (aprox_hit and (ancho_m is None or sonda_m is None)) else "no"

            key = (canal_fila, nombre.lower())
            es_dup = dup_tracker_pasos.get(key, "")
            if not es_dup:
                dup_tracker_pasos[key] = str(pagina)

            pasos_out.append({
                "nombre": nombre, "canal": canal_fila, "geometria_ref": "",
                "ancho_util_m": ancho_m if ancho_m is not None else "",
                "sonda_minima_m": sonda_m if sonda_m is not None else "",
                "calado_max_m": calado_m if calado_m is not None else "",
                "eslora_max_m": eslora_m if eslora_m is not None else "",
                "corriente_max_kt": corriente_kt if corriente_kt is not None else "",
                "restriccion": "", "pagina": pagina,
                "texto_aproximado": texto_aproximado,
                "es_duplicado_de": es_dup,
                "contexto": clausula_full[:200].replace("\n", " ").strip(),
            })
            continue

        for pat, tipo in PELIGRO_KEYWORDS:
            if pat.match(nombre):
                key = (canal, nombre.lower())
                es_dup = dup_tracker_peligros.get(key, "")
                if not es_dup:
                    dup_tracker_peligros[key] = str(pagina)
                sonda_m = ""
                sm = re.search(r"(\d{1,2}(?:[.,]\d+)?)\s*metros\s+de\s+agua", clausula_full, re.IGNORECASE)
                if sm:
                    sonda_m = to_float(sm.group(1))
                senalizado = ""
                if re.search(r"baliza|se[ñn]al", clausula_full, re.IGNORECASE):
                    senalizado = "si"
                peligros_out.append({
                    "nombre": nombre, "tipo": tipo, "canal": canal, "carta_ref": carta_ref,
                    "sonda_m": sonda_m, "senalizado": senalizado, "pagina": pagina,
                    "es_duplicado_de": es_dup,
                })
                break


def main():
    # El encabezado corrido (ej. "VII-1-18 (3002) CANAL CHACAO Cap. VII")
    # ocupa el ancho completo de la pagina: recortar en columnas izq/der lo
    # parte a la mitad. Por eso se usa el texto SIN recortar (extraccion
    # original, ancho completo) solo para detectar el titulo de seccion, y
    # el texto por columnas (mas limpio, sin mezcla entre columnas) para el
    # cuerpo -- de donde sale el dato real.
    with open(r"C:\tmarea-data\raw\derrotero_full_text_141_623.pkl", "rb") as f:
        pages_full_width = pickle.load(f)
    with open(TEXT_CACHE, "rb") as f:
        pages_cols = pickle.load(f)

    pasos_out = []
    peligros_out = []
    dup_tracker_pasos = {}
    dup_tracker_peligros = {}
    header_log = []
    canal_actual = None
    titulo_crudo_actual = None

    for pagina in sorted(pages_cols):
        text_header_source = pages_full_width[pagina]
        text = pages_cols[pagina]["full"]
        lines = text_header_source.split("\n")
        titulo = parse_header(lines[1]) if len(lines) > 1 else None
        if titulo:
            titulo_crudo_actual = titulo
            nuevo_canal = extraer_canal_de_titulo(titulo)
            if nuevo_canal:
                canal_actual = nuevo_canal
            # si nuevo_canal es None (bahia/puerto/instrucciones/etc.), se
            # mantiene canal_actual: continuacion geografica del corredor.
        header_log.append((pagina, titulo_crudo_actual, canal_actual))

        if canal_actual is None:
            continue

        carta_ref = carta_ref_de(text_header_source)
        extraer_pagina(pagina, text, canal_actual, carta_ref, pasos_out, peligros_out, dup_tracker_pasos, dup_tracker_peligros)

    with open(r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\pasos_full.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "nombre", "canal", "geometria_ref", "ancho_util_m", "sonda_minima_m",
            "calado_max_m", "eslora_max_m", "corriente_max_kt", "restriccion",
            "pagina", "texto_aproximado", "es_duplicado_de", "contexto",
        ])
        w.writeheader()
        for r in pasos_out:
            w.writerow(r)

    with open(r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\peligros_full.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["nombre", "tipo", "canal", "carta_ref", "sonda_m", "senalizado", "pagina", "es_duplicado_de"])
        w.writeheader()
        for r in peligros_out:
            w.writerow(r)

    with open(r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\header_log.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["pagina", "titulo_crudo", "canal_atribuido"])
        for row in header_log:
            w.writerow(row)

    print(f"pasos_full.csv: {len(pasos_out)} filas")
    print(f"peligros_full.csv: {len(peligros_out)} filas")
    print(f"paginas sin encabezado reconocido / sin canal atribuido: {sum(1 for _, _, c in header_log if c is None)}")


if __name__ == "__main__":
    main()
