"""
Empaquetado/desempaquetado de la celda uint16 del raster de ruteo.

Layout (spec TMAREA_SPEC_Router_Raster_v1.md §5.1):
    bit 15      : huella KML          (0/1)
    bits 14-13  : confianza batimetrica (0 TIERRA, 1 ROJO, 2 AMARILLO, 3 VERDE)
    bits 12-0   : distancia a costa, en unidades de unit_m (tope 8191)
"""
import numpy as np

KML_SHIFT = 15
CONF_SHIFT = 13
CONF_MASK = 0b11
DIST_MASK = 0x1FFF  # 13 bits -> 0..8191


def pack_cells(kml, confianza, dist_units):
    """Empaqueta arrays numpy (mismo shape) en un uint16. dist_units ya en
    unidades de unit_m (no metros), enteros 0..8191."""
    kml = np.asarray(kml, dtype=np.uint16)
    confianza = np.asarray(confianza, dtype=np.uint16)
    dist_units = np.clip(np.asarray(dist_units, dtype=np.int64), 0, DIST_MASK).astype(np.uint16)

    out = (kml & 0b1) << KML_SHIFT
    out |= (confianza & CONF_MASK) << CONF_SHIFT
    out |= dist_units & DIST_MASK
    return out.astype(np.uint16)


def unpack_cells(values):
    """Inversa de pack_cells. Devuelve (kml, confianza, dist_units)."""
    values = np.asarray(values, dtype=np.uint16)
    kml = (values >> KML_SHIFT) & 0b1
    confianza = (values >> CONF_SHIFT) & CONF_MASK
    dist_units = values & DIST_MASK
    return kml, confianza, dist_units
