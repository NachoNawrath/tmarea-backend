"""
Parseo de encabezados de pagina del derrotero (Cap. VII y VIII) y deteccion
del canal/paso/golfo actualmente en curso. Usado por extract_full.py para
atribuir cada pagina a un canal antes de correr el extractor de tramos.

Diseno: la Seccion 1 del spec (Prioridad 1-3) es una lista de PRIORIZACION
para donde enfocar el esfuerzo de revision, no un filtro exhaustivo de que
canales existen en el tomo -- hay muchos mas (Canal Ferronave, Canal
Calbuco, Canal Darwin, Canal Chacabuco, etc.). Por eso el canal se toma del
propio titulo de encabezado del derrotero, no de una lista curada: se busca
la palabra de tipo corredor (Canal/Golfo/Boca/Estrecho/Freo/Seno/Fiordo/
Paso/Angostura) donde sea que aparezca en el titulo y se usa ese fragmento
como nombre. Titulos que no traen ninguna de esas palabras (bahias,
puertos, paginas de instrucciones de derrota) se consideran continuacion
geografica del ultimo canal detectado, no un canal nuevo -- exactamente el
mismo criterio aplicado a mano en el piloto Chacao (Bahia Ancud -> Canal
Chacao), ahora sistematizado.
"""
import re
import unicodedata

HEADER_RE = re.compile(
    r"^(?:Cap\.\s*(?:VII|VIII)\s+(?P<t1>.+?)\s*\(3002\)\s*(?:VII|VIII)-[\dA-Za-z-]+"
    r"|(?:VII|VIII)-[\dA-Za-z-]+\s*\(3002\)\s*(?P<t2>.+?)\s*Cap\.\s*(?:VII|VIII))\s*$"
)

CORREDOR_KEYWORD_RE = re.compile(
    r"\b(CANAL|GOLFO|BOCA|ESTRECHO|FREO|SENO|FIORDO|PASO|ANGOSTURA)\s+"
    r"(?:DE\s+|DEL\s+)?([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]*?)(?:\s*$|\s+(?:Y|E)\s+[A-ZÁÉÍÓÚÑ])"
)

# Prioridad 1 (Seccion 1 del spec) -- para el reporte de cobertura de
# corredor troncal, por fragmento normalizado (sin acentos, mayusculas).
PRIORIDAD_1 = {
    "Canal Tenglo": ["TENGLO"],
    "Seno de Reloncavi": ["RELONCAVI"],
    "Canal de Chacao": ["CHACAO"],
    "Golfo de Ancud": ["GOLFO DE ANCUD", "GOLFO ANCUD"],
    "Golfo Corcovado": ["GOLFO CORCOVADO"],
    "Boca del Guafo": ["BOCA DEL GUAFO", "BOCA GUAFO"],
    "Canal Moraleda": ["MORALEDA"],
    "Fiordo Aysen": ["FIORDO AYSEN", "AYSEN", "CHACABUCO"],
}


def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def parse_header(second_line):
    m = HEADER_RE.match(second_line.strip())
    if not m:
        return None
    return (m.group("t1") or m.group("t2")).strip()


def extraer_canal_de_titulo(titulo):
    """Busca 'Canal/Golfo/Boca/.../Paso X' en cualquier posicion del titulo
    y devuelve el nombre normalizado en Title Case, o None si el titulo no
    trae ninguna palabra de tipo corredor (bahia, puerto, instrucciones,
    etc.) -- en cuyo caso el llamador debe mantener el canal anterior."""
    if not titulo:
        return None
    m = CORREDOR_KEYWORD_RE.search(titulo.upper())
    if not m:
        return None
    tipo, nombre = m.group(1), m.group(2).strip()
    texto = f"{tipo} {nombre}"
    return " ".join(w.capitalize() if w not in ("de", "del", "y") else w for w in texto.lower().split())


def prioridad_1_de(canal):
    if not canal:
        return None
    key = strip_accents(canal.upper())
    for canonico, fragmentos in PRIORIDAD_1.items():
        for frag in fragmentos:
            if strip_accents(frag) in key:
                return canonico
    return None
