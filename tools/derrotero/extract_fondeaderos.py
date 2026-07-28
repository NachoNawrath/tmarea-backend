"""
Extractor de fondeaderos.csv sobre el tomo completo (pp. 141-623).

NO es sondas_canal.csv del spec SS2.3 (eje navegable) -- se penso asi
originalmente y era un error: el patron detectado ("Nombre.- Carta N X.
Lat...; Long... (aprox.). ... fondeadero en N metros de agua" /
"sondandose N metros de profundidad") es sistematicamente la profundidad
DONDE SE FONDEA (bahias, caletas, ensenadas), no la profundidad del eje de
un canal navegable. Un fondeadero se elige a proposito poco profundo
(Fondeadero Stokes 2,6 m, Caleta Gualas 3,0 m) -- cargar eso como
sonda_canal_min_m declararia innavegables los lugares donde los barcos van
a resguardarse. Mismo tipo de error que Carbunco/Chauques (SS6.3 del spec
de router) pero en la direccion opuesta: alli una profundidad de peligro se
colaba como sonda de canal; aca una profundidad de fondeadero se colaba
como sonda de canal. El dato es real y valioso, solo que para otra cosa:
conecta con la regla R5 (refugio con mal tiempo) y los consejos de P3, no
con la capa de confianza batimetrica del router (SS5.2).

Conclusion de fondo (no arreglable extrayendo distinto): el Derrotero SHOA
describe COMO NAVEGAR, no es una fuente de batimetria de eje -- esas sondas
viven en las cartas nauticas del SHOA, no en este tomo. Ver evaluacion de
fuentes bbatimetricas alternativas (GMRT/IBCSO/GEBCO) para la capa de
confianza real.

Reutiliza exactamente lo mismo que extract_full.py para no duplicar bugs ya
corregidos ahi: ENTRY_RE (deteccion "Nombre.- ..." acotada a la siguiente
entrada, no ventana fija), clean_page (dehyphen + strip header/footer/
section-header), headers.py para atribucion de canal por encabezado de
pagina. coords.py para el parseo DMS->decimal (3 formatos, ambos simbolos
de grado, coma decimal).

Filtro de contaminacion por peligro (leccion real de Fase 2, ver
docs/handoff-fase2.md "sonda_minima_m separado en dos campos"): una entrada
cuyo parrafo menciona "bajo fondo", "escollo", "arrecife" o "restinga" se
descarta ENTERA para este dataset, aunque su nombre no sea un keyword de
peligro (ej. "Punta Animo.- ... un bajo fondo de 2,2 metros de profundidad")
-- la profundidad ahi describe un escollo a esquivar, no un fondeadero real.
"""
import csv
import pickle
import re
import sys

sys.path.insert(0, r"C:\Users\katia\tmarea-backend\tools\derrotero")
from headers import parse_header, extraer_canal_de_titulo
from coords import normalize, COORD_RE, parse_token, CoordError

TEXT_CACHE_COLS = r"C:\tmarea-data\raw\derrotero_cols_141_623.pkl"
TEXT_CACHE_FULL = r"C:\tmarea-data\raw\derrotero_full_text_141_623.pkl"
OUT_CSV = r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\fondeaderos_candidatos.csv"
OUT_LOG = r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\fondeaderos_descartes.csv"

# ---------------------------------------------------------------------------
# Reutilizado de extract_full.py (mismos regex, mismo comportamiento)
# ---------------------------------------------------------------------------

HEADER_LINE_RE = re.compile(r"^PUBLICACIÓN ACTUALIZADA AL BOLETÍN.*$", re.MULTILINE)
SECTION_HEADER_LINE_RE = re.compile(
    r"^(?:Cap\.\s*(?:VII|VIII)\s+.+?\s*\(3002\)\s*(?:VII|VIII)-[\dA-Za-z-]+"
    r"|(?:VII|VIII)-[\dA-Za-z-]+\s*\(3002\)\s*.+?\s*Cap\.\s*(?:VII|VIII))\s*$",
    re.MULTILINE,
)
FOOTER_LINE_RE = re.compile(r"^(Copia Autorizada.*|Powered by TCPDF.*|Cambio No.*|Original,.*)$", re.MULTILINE)
DEHYPHEN_RE = re.compile(r"([a-záéíóúñ])-\n([a-záéíóúñ])")

# El (?:\d{1,3}\s+)? opcional al inicio tolera el numero de linea suelto
# intercalado por el layout a dos columnas pegado justo antes del nombre
# (ej. "0 Fondeadero.-", visto en p.238) -- sin esto, ENTRY_RE no reconoce
# esa linea como inicio de entrada (no empieza con mayuscula) y su clausula
# se funde con la entrada anterior, contaminando el tramo con un nombre que
# no es el suyo (bug real encontrado validando p.238 "Cable submarino").
ENTRY_RE = re.compile(r"(?m)^(?:\d{1,3}\s+)?([A-ZÁÉÍÓÚÑ][^\n]{2,70}?)\.-\s")

PELIGRO_KEYWORDS = [
    re.compile(r"^Restos?\s+[Nn]áufragos?", re.IGNORECASE),
    re.compile(r"^Rocas?\b", re.IGNORECASE),
    re.compile(r"^Bajo\b", re.IGNORECASE),
    re.compile(r"^Restinga\b", re.IGNORECASE),
    re.compile(r"^Banco\b", re.IGNORECASE),
    re.compile(r"^Escollo\b", re.IGNORECASE),
]

HAZARD_PHRASE_RE = re.compile(r"bajo\s+fondo|escollo|arrecife|restinga", re.IGNORECASE)


def clean_page(text):
    text = DEHYPHEN_RE.sub(r"\1\2", text)
    text = HEADER_LINE_RE.sub("", text)
    text = SECTION_HEADER_LINE_RE.sub("", text)
    text = FOOTER_LINE_RE.sub("", text)
    return text


# ---------------------------------------------------------------------------
# Coordenada propia de la entrada: busca en los primeros 150 caracteres del
# parrafo (donde vive el bloque "Carta No X. Lat. ...; Long. ... (aprox.).")
# dos tokens de coordenada con hemisferios complementarios (uno N/S, uno
# E/W). No depende de las etiquetas "Lat."/"Long." en si -- el hemisferio ya
# viene en el propio token (SS de coords.py) y se valida con parse_token.
# ---------------------------------------------------------------------------

HEADER_WINDOW = 150


def coordenada_propia(clausula):
    window = clausula[:HEADER_WINDOW]
    tokens = [m.group(0) for m in COORD_RE.finditer(normalize(window))]
    lat = lon = None
    for tok in tokens:
        try:
            v = parse_token(tok, is_latitude=True)
            if lat is None:
                lat = v
            continue
        except CoordError:
            pass
        try:
            v = parse_token(tok, is_latitude=False)
            if lon is None:
                lon = v
        except CoordError:
            pass
    if lat is not None and lon is not None:
        return lat, lon
    return None


# ---------------------------------------------------------------------------
# Profundidad de fondeo: "N (a M) metros de profundidad/agua" o "profundidad
# (minima) de N metros". Toma el minimo del rango -- para un fondeadero el
# minimo es el dato relevante (cuanta agua hay en el punto mas somero donde
# se puede terminar posado el ancla), igual criterio que dMinM/pasos.csv.
# ---------------------------------------------------------------------------

PROFUNDIDAD_FONDEADERO_RE = re.compile(
    r"(?P<s1>\d{1,3}(?:[.,]\d+)?)\s*(?:a\s*(?P<s2>\d{1,3}(?:[.,]\d+)?)\s*)?metros\s+de\s+(?:profundidad|agua)"
    r"|profundidad\s+(?:m[ií]nima\s+)?de\s+(?P<s3>\d{1,3}(?:[.,]\d+)?)\s*metros",
    re.IGNORECASE,
)


def to_float(s):
    return float(s.replace(",", "."))


def profundidad_minima(clausula):
    vals = []
    for m in PROFUNDIDAD_FONDEADERO_RE.finditer(clausula):
        if m.group("s1"):
            v1 = to_float(m.group("s1"))
            v2 = to_float(m.group("s2")) if m.group("s2") else None
            vals.append(min(v1, v2) if v2 is not None else v1)
        else:
            vals.append(to_float(m.group("s3")))
    return min(vals) if vals else None


def extraer_pagina(pagina, text, canal, out_rows, descartes):
    text_clean = clean_page(text)
    matches = list(ENTRY_RE.finditer(text_clean))
    for idx, m in enumerate(matches):
        nombre = re.sub(r"\s+", " ", m.group(1)).strip()
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else min(len(text_clean), start + 700)
        clausula = text_clean[start:end]

        if any(pat.match(nombre) for pat in PELIGRO_KEYWORDS):
            continue  # catalogo de peligro, no eje navegable -- va a peligros.csv, no aca

        coord = coordenada_propia(clausula)
        if coord is None:
            continue  # SS0.3: sin coordenada propia, el dato no entra

        if HAZARD_PHRASE_RE.search(clausula):
            descartes.append({
                "nombre": nombre, "canal": canal, "pagina": pagina,
                "motivo": "clausula menciona bajo fondo/escollo/arrecife/restinga -- posible profundidad de peligro, no de fondeadero real",
            })
            continue

        profundidad_fondeo_m = profundidad_minima(clausula)
        if profundidad_fondeo_m is None:
            continue  # tiene coordenada pero no menciona profundidad -- no es dato para este dataset

        lat, lon = coord
        out_rows.append({
            "canal": canal, "nombre": nombre, "lat": lat, "lon": lon,
            "profundidad_fondeo_m": profundidad_fondeo_m, "pagina": pagina,
        })


def main():
    with open(TEXT_CACHE_FULL, "rb") as f:
        pages_full_width = pickle.load(f)
    with open(TEXT_CACHE_COLS, "rb") as f:
        pages_cols = pickle.load(f)

    out_rows = []
    descartes = []
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

        if canal_actual is None:
            continue

        extraer_pagina(pagina, text, canal_actual, out_rows, descartes)

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["canal", "nombre", "lat", "lon", "profundidad_fondeo_m", "pagina"])
        w.writeheader()
        for r in out_rows:
            w.writerow(r)

    with open(OUT_LOG, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["nombre", "canal", "pagina", "motivo"])
        w.writeheader()
        for r in descartes:
            w.writerow(r)

    print(f"fondeaderos_candidatos.csv: {len(out_rows)} filas (antes de validar contra el raster)")
    print(f"descartes por posible contaminacion de peligro: {len(descartes)} (ver {OUT_LOG})")
    print("Correr validar_fondeaderos.py despues de esto -- produce fondeaderos.csv (solo agua) y fondeaderos_validado.csv (auditoria completa).")


if __name__ == "__main__":
    main()
