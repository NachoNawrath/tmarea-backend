"""
Conversor DMS -> decimal para las coordenadas del Derrotero SHOA Pub. 3002.

Alcance deliberado (spec en docs/extraccion-derrotero-shoa.md): este modulo
SOLO convierte un token de coordenada ya localizado en texto (ej. "41deg 48'
39,29\" S") a grados decimales, y transforma el datum cuando corresponde.
NO empareja Lat con Long, NO decide que token pertenece a que registro y NO
recorre el PDF -- eso es tarea del extractor de la Etapa Paso 3, que puede
usar find_coordinates() como insumo pero debe resolver el contexto (a que
peligro/paso/ayuda pertenece cada par) por su cuenta.

Formatos cubiertos (verificados contra el PDF real, ver muestras/ y el
reporte de Etapa A):
  A) DMS completo, coma decimal en segundos      -- p.242
  B) grados + minutos decimales (coma)           -- p.288, p.45
  C) grados + minutos enteros, sin segundos      -- p.288, p.143, p.550

Variantes adicionales pedidas explicitamente aunque no aparecieron en las
muestras iniciales: decimas de segundo, tokens sin espacios, hemisferio
antepuesto. Se verificaron contra las 623 paginas: no hay ocurrencias reales
de "sin espacios" ni de rangos en prosa ("entre X y Y") en este tomo, pero
se cubren igual porque son variantes documentadas de SHOA en general y
porque no cuesta nada dejarlas cubiertas.

Simbolo de grado: el documento mezcla '°' (grado real) y 'º'
(ordinal masculino) sin que el simbolo correlacione con la variante -- un
mismo formato (ej. B) aparece con ambos simbolos en paginas distintas. El
regex acepta ambos siempre.

Sobre la coma "despues del apostrofo" (ej. "55º 21',0 S", p.45):
verificado a nivel de glifo (pdfplumber page.chars, x0 creciente y sin
saltos) que es asi en el PDF original, no un artefacto de como pdfplumber
ordena palabras. Por eso se normaliza (mover la coma antes del apostrofo)
en vez de descartarse como variante invalida.

Datum: el documento NO declara un datum global. Las tablas de vertices de
areas/reservas/santuarios (que alimentan areas.csv) se autoetiquetan cada
una con su propio datum en el texto justo antes de la tabla ("Coordenadas
Geograficas (WGS-84)", "(SAD 69)", "DATUM: SIRGAS (WGS-84)"). Verificado
sobre las 623 paginas: de 6 tablas de este tipo en el cuerpo a extraer
(pag. >=141), 4 son WGS-84, 1 es SIRGAS (compatible con WGS84 a esta
escala) y 1 -- la Reserva Ostricola Pullinque, p.158, DENTRO del corredor
Canal Chacao del piloto -- es SAD-69 explicito. PSAD56 no aparece nunca en
el documento (0 ocurrencias en 623 paginas).
Las coordenadas en prosa (pasos, peligros, sondas, ayudas) no llevan
etiqueta de datum por punto: no hay señal parseable para decidirlo caso a
caso, asi que se asumen WGS-84 (consistente con lo que el propio derrotero
dice de sus cartas modernas, p.9: "datum geodesico reconocido
internacionalmente"), pero es un supuesto no verificado por dato individual
-- el Paso 4 (validacion contra el raster) es el control de sanidad real:
un desplazamiento sistematico de 200-350 m en una zona es la señal de un
datum distinto sin marcar.
"""
import re
from dataclasses import dataclass

from pyproj import Transformer

# ---------------------------------------------------------------------------
# Normalizacion de texto previa al regex
# ---------------------------------------------------------------------------

# Mueve la coma decimal cuando el PDF la tipografia despues del apostrofo
# de minutos ("21',0" -> "21,0'"). Confirmado real en el PDF (no artefacto
# de extraccion), pero se normaliza para no duplicar el regex principal.
_COMMA_AFTER_APOSTROPHE_RE = re.compile(r"(\d{1,2})(['’])\s*,(\d+)")


def normalize(text: str) -> str:
    text = text.replace("’", "'").replace("´", "'")
    text = text.replace("″", '"').replace("”", '"').replace("''", '"')
    text = _COMMA_AFTER_APOSTROPHE_RE.sub(r"\1,\3'", text)
    return text


# ---------------------------------------------------------------------------
# Regex de un token de coordenada (un valor, no un par lat/long)
# ---------------------------------------------------------------------------

# Grados + minutos obligatorios (con o sin decimal), segundos opcionales
# (con o sin decimal), hemisferio antes o despues, espacios opcionales en
# todas las posiciones para cubrir el formato "sin espacios".
COORD_RE = re.compile(
    r"""
    (?:(?P<hemi_pre>[NSEW])\s*)?
    (?P<deg>\d{1,3})\s*[°º]\s*
    (?P<min>\d{1,2}(?:[.,]\d+)?)\s*'\s*
    (?:(?P<sec>\d{1,2}(?:[.,]\d+)?)\s*"\s*)?
    (?P<hemi_post>[NSEWnsew])?
    """,
    re.VERBOSE,
)


class CoordError(ValueError):
    pass


def _to_float(s: str) -> float:
    return float(s.replace(",", "."))


def dms_to_decimal(deg: float, minutes: float, seconds: float, hemi: str, *, is_latitude: bool) -> float:
    """Convierte grados/minutos/segundos + hemisferio a decimal con signo.
    Sur y Oeste son siempre negativos. Valida rangos; no los tolera en
    silencio porque un valor fuera de rango entrando al raster es peor
    que un extractor que se detiene."""
    hemi = hemi.upper()
    if hemi not in ("N", "S", "E", "W"):
        raise CoordError(f"hemisferio invalido: {hemi!r}")
    if is_latitude and hemi not in ("N", "S"):
        raise CoordError(f"hemisferio {hemi!r} invalido para latitud")
    if not is_latitude and hemi not in ("E", "W"):
        raise CoordError(f"hemisferio {hemi!r} invalido para longitud")

    max_deg = 90 if is_latitude else 180
    if not (0 <= deg <= max_deg):
        raise CoordError(f"grados fuera de rango ({deg}, max {max_deg})")
    if not (0 <= minutes < 60):
        raise CoordError(f"minutos fuera de rango ({minutes})")
    if not (0 <= seconds < 60):
        raise CoordError(f"segundos fuera de rango ({seconds})")

    value = deg + minutes / 60 + seconds / 3600
    if hemi in ("S", "W"):
        value = -value
    return round(value, 6)


def parse_token(text: str, *, is_latitude: bool) -> float:
    """Convierte un unico token de coordenada ya normalizado/aislado a
    decimal. Lanza CoordError si el token no matchea o el hemisferio falta."""
    normalized = normalize(text)
    m = COORD_RE.search(normalized)
    if not m:
        raise CoordError(f"no se pudo parsear como coordenada: {text!r}")

    hemi = m.group("hemi_pre") or m.group("hemi_post")
    if not hemi:
        raise CoordError(f"token sin hemisferio explicito: {text!r}")

    deg = _to_float(m.group("deg"))
    minutes = _to_float(m.group("min"))
    seconds = _to_float(m.group("sec")) if m.group("sec") else 0.0

    return dms_to_decimal(deg, minutes, seconds, hemi, is_latitude=is_latitude)


# ---------------------------------------------------------------------------
# Deteccion de rangos en prosa ("entre 41 28' y 41 30'")
# ---------------------------------------------------------------------------

_RANGO_RE = re.compile(r"\bentre\b", re.IGNORECASE)


@dataclass
class FoundCoord:
    raw: str
    start: int
    end: int
    is_range_context: bool


def find_coordinates(text: str) -> list[FoundCoord]:
    """Ubica todos los tokens de coordenada en un bloque de texto. No
    empareja lat/long ni decide a que registro pertenecen -- eso es del
    extractor. Marca is_range_context=True cuando el token cae dentro de
    una construccion "entre X y Y", para que el extractor decida que hacer
    en vez de tomar el primer valor y listo."""
    normalized = normalize(text)
    out = []
    for m in COORD_RE.finditer(normalized):
        window_start = max(0, m.start() - 40)
        in_range = bool(_RANGO_RE.search(normalized[window_start:m.start()]))
        out.append(FoundCoord(raw=m.group(0), start=m.start(), end=m.end(), is_range_context=in_range))
    return out


# ---------------------------------------------------------------------------
# Datum
# ---------------------------------------------------------------------------

# EPSG:4618 = SAD69 geografico. EPSG:4326 = WGS84. El shift parametrico que
# trae pyproj para este par es del orden de la magnitud que describiste
# (~200-350 m en Chile); se verifica en el test, no se asume.
_SAD69_TO_WGS84 = Transformer.from_crs("EPSG:4618", "EPSG:4326", always_xy=True)


def normalize_datum_label(label: str) -> str:
    key = label.upper().replace(" ", "").replace("-", "").replace("_", "")
    key = key.replace("(", "").replace(")", "")
    if key in ("WGS84", "SIRGAS", "SIRGASWGS84"):
        return "WGS84"
    if key == "SAD69":
        return "SAD69"
    if key == "LOCAL":
        return "LOCAL"
    raise CoordError(f"datum desconocido, no tiene transformacion definida: {label!r}")


def to_wgs84(lat: float, lon: float, datum: str = "WGS84") -> tuple[float, float]:
    """Transforma (lat, lon) al datum declarado hacia WGS84 decimal.
    'LOCAL' no tiene parametros de transformacion conocidos (por definicion
    -- ver p.9 del derrotero) y se rechaza en vez de pasar sin convertir:
    un dato con datum local sin resolver debe marcarse para revision
    manual, no entrar al CSV como si fuera WGS84."""
    datum_norm = normalize_datum_label(datum)
    if datum_norm == "WGS84":
        return round(lat, 6), round(lon, 6)
    if datum_norm == "SAD69":
        lon_out, lat_out = _SAD69_TO_WGS84.transform(lon, lat)
        return round(lat_out, 6), round(lon_out, 6)
    raise CoordError(
        f"datum {datum!r} no tiene transformacion conocida -- registro debe "
        "marcarse para revision manual, no asumir WGS84"
    )


DATUM_HEADER_RE = re.compile(
    r"(?:Coordenadas\s+Geogr[aá]ficas\s*\(\s*(?P<label1>WGS[\s-]?84|SAD[\s-]?69|SIRGAS(?:\s*\(?\s*WGS[\s-]?84\s*\)?)?)\s*\)"
    r"|D[aá]tum\s*:?\s*\(?\s*(?P<label2>WGS[\s-]?84|SAD[\s-]?69|SIRGAS(?:\s*\(?\s*WGS[\s-]?84\s*\)?)?|Local)\s*\)?)",
    re.IGNORECASE,
)


def find_datum_label(text: str) -> str | None:
    """Busca la etiqueta de datum que el propio derrotero imprime antes de
    una tabla de vertices de area/reserva/santuario. Devuelve None si no
    hay etiqueta (caso de las coordenadas en prosa: sin señal, se asume
    WGS84 en el llamador, no aca)."""
    m = DATUM_HEADER_RE.search(text)
    if not m:
        return None
    label = m.group("label1") or m.group("label2")
    return normalize_datum_label(label)
