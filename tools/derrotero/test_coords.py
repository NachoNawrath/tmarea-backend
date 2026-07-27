"""
Test unitario de coords.py. Script plano (no pytest, no esta instalado en
el venv de raster-build) -- mismo estilo que
tools/raster-build/test_09_packing_roundtrip.py: assert por caso, imprime
PASA/FALLA, exit(1) si algo falla.

Los casos textuales son literales tomados del PDF real (derrotero-3002-
ano-2023_compress.pdf), con el numero de pagina fisica en el comentario,
para que queden verificables contra el documento en vez de contra esta
conversacion. Los casos marcados "sintetico" no aparecen en el tomo -- se
agregan igual porque el pedido explicito fue cubrir esas variantes aunque
no estuvieran en las muestras.
"""
import math

from pyproj import Geod

from coords import (
    CoordError,
    dms_to_decimal,
    find_coordinates,
    find_datum_label,
    parse_token,
    to_wgs84,
)

failures = []


def check(label, condition):
    status = "OK" if condition else "FALLO"
    print(f"[{status}] {label}")
    if not condition:
        failures.append(label)


def close(a, b, tol=1e-6):
    return abs(a - b) < tol


# ---------------------------------------------------------------------------
# Variante A -- DMS completo, coma decimal en segundos (p.242, tabla de
# vertices "Santuario de la Naturaleza Isla Kaikue - Lagartija")
# ---------------------------------------------------------------------------

check(
    "A: 41° 48' 39,29\" S -> -41.810914 (p.242, vertice 25)",
    close(parse_token("41° 48' 39,29\" S", is_latitude=True), -(41 + 48 / 60 + 39.29 / 3600)),
)
check(
    "A: 73° 17' 16,48\" W -> negativo (p.242, vertice 25)",
    close(parse_token("73° 17' 16,48\" W", is_latitude=False), -(73 + 17 / 60 + 16.48 / 3600)),
)
check(
    "A: 41° 48' 38,14\" S (p.242, vertice 1)",
    close(parse_token("41° 48' 38,14\" S", is_latitude=True), -(41 + 48 / 60 + 38.14 / 3600)),
)

# ---------------------------------------------------------------------------
# Variante B -- grados + minutos decimales, coma ANTES del apostrofo
# (p.288, Isla Capeaguapi / Zona espera de Practico)
# ---------------------------------------------------------------------------

check(
    "B (coma antes): 41° 31,8' S -> -(41 + 31.8/60) (p.288)",
    close(parse_token("41° 31,8' S", is_latitude=True), -(41 + 31.8 / 60)),
)

# ---------------------------------------------------------------------------
# Variante B -- grados + minutos decimales, coma DESPUES del apostrofo.
# Verificado a nivel de glifo (pdfplumber page.chars) que es formato real
# del PDF, no artefacto de extraccion -- ver docstring de coords.py.
# (p.45, posiciones de practicaje Estrecho de Magallanes)
# ---------------------------------------------------------------------------

check(
    "B (coma despues, quirk real): 55º 21',0 S -> -(55 + 21.0/60) (p.45)",
    close(parse_token("55º 21',0 S", is_latitude=True), -(55 + 21.0 / 60)),
)
check(
    "B (coma despues): 67º 12',5 W -> -(67 + 12.5/60) (p.45)",
    close(parse_token("67º 12',5 W", is_latitude=False), -(67 + 12.5 / 60)),
)

# ---------------------------------------------------------------------------
# Variante C -- grados + minutos enteros, sin segundos, sin decimales
# ---------------------------------------------------------------------------

check(
    "C: 41º 31' S -> -(41 + 31/60) (p.288, Bahia Chincui)",
    close(parse_token("41º 31' S", is_latitude=True), -(41 + 31 / 60)),
)
check(
    "C: 41º 48' S -> -(41 + 48/60) (p.143, Caleta Guabun)",
    close(parse_token("41º 48' S", is_latitude=True), -(41 + 48 / 60)),
)
check(
    "C: 45º 28' S -> -(45 + 28/60) (p.550, Caleta Bluff)",
    close(parse_token("45º 28' S", is_latitude=True), -(45 + 28 / 60)),
)

# ---------------------------------------------------------------------------
# Ambos simbolos de grado dan el mismo resultado (confirmado: el simbolo no
# correlaciona con la variante, aparecen ambos en cualquiera de las tres)
# ---------------------------------------------------------------------------

check(
    "Simbolo °(U+00B0) == º(U+00BA) para el mismo valor",
    parse_token("41°48'S", is_latitude=True) == parse_token("41º48'S", is_latitude=True),
)

# ---------------------------------------------------------------------------
# Variantes adicionales pedidas (no confirmadas en el tomo, cubiertas igual)
# ---------------------------------------------------------------------------

check(
    "Decimas de segundo (1 decimal en vez de 2): 41° 28' 32,5\" S (sintetico)",
    close(parse_token("41° 28' 32,5\" S", is_latitude=True), -(41 + 28 / 60 + 32.5 / 3600)),
)
check(
    "Sin espacios: 41°28'32\"S (sintetico)",
    close(parse_token("41°28'32\"S", is_latitude=True), -(41 + 28 / 60 + 32 / 3600)),
)
check(
    "Hemisferio antepuesto: S 41° 28' 32\" (sintetico)",
    close(parse_token("S 41° 28' 32\"", is_latitude=True), -(41 + 28 / 60 + 32 / 3600)),
)

# ---------------------------------------------------------------------------
# Casos limite: deben rechazarse, no normalizarse en silencio
# ---------------------------------------------------------------------------

try:
    parse_token("41° 60' S", is_latitude=True)
    check("Minutos >= 60 debe lanzar CoordError", False)
except CoordError:
    check("Minutos >= 60 debe lanzar CoordError", True)

try:
    parse_token("41° 28' 60\" S", is_latitude=True)
    check("Segundos >= 60 debe lanzar CoordError", False)
except CoordError:
    check("Segundos >= 60 debe lanzar CoordError", True)

try:
    parse_token("95° 00' S", is_latitude=True)
    check("Grados fuera de rango en latitud (>90) debe lanzar CoordError", False)
except CoordError:
    check("Grados fuera de rango en latitud (>90) debe lanzar CoordError", True)

try:
    parse_token("185° 00' W", is_latitude=False)
    check("Grados fuera de rango en longitud (>180) debe lanzar CoordError", False)
except CoordError:
    check("Grados fuera de rango en longitud (>180) debe lanzar CoordError", True)

try:
    parse_token("41° 28' 32\"", is_latitude=True)
    check("Token sin hemisferio debe lanzar CoordError", False)
except CoordError:
    check("Token sin hemisferio debe lanzar CoordError", True)

# ---------------------------------------------------------------------------
# Hemisferio S/W siempre negativo, N/E siempre positivo
# ---------------------------------------------------------------------------

check("S -> negativo", parse_token("10° 00' S", is_latitude=True) < 0)
check("W -> negativo", parse_token("10° 00' W", is_latitude=False) < 0)
check("N -> positivo", parse_token("10° 00' N", is_latitude=True) > 0)
check("E -> positivo", parse_token("10° 00' E", is_latitude=False) > 0)

# ---------------------------------------------------------------------------
# Rangos en prosa: el extractor debe poder detectarlos, no tomar el primer
# valor y listo. "entre X y Y" (sintetico -- no se encontro ningun rango en
# prosa real en las 623 paginas, se cubre igual por pedido explicito).
# ---------------------------------------------------------------------------

rango_texto = "El bajo se extiende entre 41° 28' S y 41° 30' S aproximadamente."
encontrados = find_coordinates(rango_texto)
check(
    "find_coordinates detecta 2 tokens en el rango sintetico",
    len(encontrados) == 2,
)
check(
    "find_coordinates marca is_range_context=True para ambos tokens del rango",
    all(c.is_range_context for c in encontrados),
)

texto_normal = 'Bahía Chincui.- Carta No 7322. Lat. 41º 31\' S; Long. 73º 02\' W (aprox.).'
encontrados_normal = find_coordinates(texto_normal)
check(
    "find_coordinates NO marca is_range_context en texto normal (p.288)",
    len(encontrados_normal) == 2 and not any(c.is_range_context for c in encontrados_normal),
)

# ---------------------------------------------------------------------------
# Datum -- deteccion de etiqueta desde el encabezado real de las tablas de
# areas/reservas/santuarios
# ---------------------------------------------------------------------------

check(
    "find_datum_label: 'Coordenadas Geográficas (WGS-84)' (p.242) -> WGS84",
    find_datum_label("Coordenadas Geográficas (WGS-84)") == "WGS84",
)
check(
    "find_datum_label: 'Coordenadas Geográficas (SAD 69)' (p.158, Reserva Ostrícola Pullinque) -> SAD69",
    find_datum_label("Coordenadas Geográficas (SAD 69)") == "SAD69",
)
check(
    "find_datum_label: 'DÁTUM : SIRGAS (WGS-84)' (p.367, Fondeadero Rhone) -> WGS84",
    find_datum_label("DÁTUM : SIRGAS (WGS-84)") == "WGS84",
)
check(
    "find_datum_label: texto sin etiqueta -> None (coordenadas en prosa, sin señal)",
    find_datum_label("Caleta Guabún.- Carta No 7000. Lat. 41º 48' S;") is None,
)

# ---------------------------------------------------------------------------
# Datum -- transformacion SAD69 -> WGS84. Vertice A de la Reserva Ostricola
# Pullinque (p.158, Bahia Ancud, DENTRO del corredor Canal Chacao del
# piloto): "A 41° 50' 45,5" S 73° 56' 08,5" W", etiquetado (SAD 69).
# ---------------------------------------------------------------------------

lat_sad69 = parse_token("41° 50' 45,5\" S", is_latitude=True)
lon_sad69 = parse_token("73° 56' 08,5\" W", is_latitude=False)
lat_wgs, lon_wgs = to_wgs84(lat_sad69, lon_sad69, datum="SAD69")

geod = Geod(ellps="WGS84")
_, _, dist_m = geod.inv(lon_sad69, lat_sad69, lon_wgs, lat_wgs)

check(
    "SAD69->WGS84 (p.158) cambia el valor (no es passthrough)",
    not close(lat_wgs, lat_sad69, tol=1e-7) or not close(lon_wgs, lon_sad69, tol=1e-7),
)
check(
    # OJO: la cifra de 200-350 m citada originalmente es para PSAD56, que
    # NO aparece en este documento (0 ocurrencias verificadas en 623
    # paginas). SAD69 es un datum distinto, con ajuste sudamericano mas
    # cercano a WGS84 -- el shift real medido en este punto es ~79 m, no
    # ~200-350 m. Igual es mas de una celda del raster (50 m), asi que
    # sigue siendo un error real si se deja sin convertir.
    f"SAD69->WGS84 (p.158) desplazamiento {dist_m:.0f} m dentro de 20-150 m esperado (SAD69, no PSAD56)",
    20 <= dist_m <= 150,
)

check(
    "WGS84 passthrough: to_wgs84 no cambia el valor",
    to_wgs84(-41.5, -73.5, datum="WGS84") == (-41.5, -73.5),
)
check(
    "SIRGAS se trata como WGS84 (equivalente a esta escala, p.367)",
    to_wgs84(-41.5, -73.5, datum="SIRGAS") == (-41.5, -73.5),
)

try:
    to_wgs84(-44.0, -73.7, datum="Local")
    check("Datum 'Local' debe rechazarse (sin parametros conocidos, no pasar como WGS84)", False)
except CoordError:
    check("Datum 'Local' debe rechazarse (sin parametros conocidos, no pasar como WGS84)", True)

# ---------------------------------------------------------------------------

print()
if failures:
    print(f"TEST_COORDS: FALLA ({len(failures)} de {len(failures)} listados arriba)")
    raise SystemExit(1)
else:
    print("TEST_COORDS: PASA")
