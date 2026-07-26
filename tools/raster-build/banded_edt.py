"""
EDT por bandas de latitud (spec TMAREA_SPEC_Router_Raster_v1.md Sec 5.5).

scipy.ndimage.distance_transform_edt siempre devuelve float64 y no acepta
float32. Para un tile de ~76 M celdas (AUSTRAL_N) eso son ~610 MB solo de
salida, mas los buffers internos del algoritmo -- pico realista de
1,5-2 GB en una sola pasada. Esta maquina de desarrollo tiene 8 GB de RAM
total y ~2 GB libres: una pasada completa es un riesgo real de OOM o de
que el proceso empiece a hacer swap.

Por eso el .bin de salida se crea como np.memmap desde el arranque y cada
banda se procesa, cuantiza y escribe directo en su posicion en disco. El
tile completo (agua booleana aparte, que es liviana: 1 byte/celda) nunca
existe como array de distancias/EDT completo en RAM -- solo una banda a
la vez, acotando el pico a ~una banda (~300 MB) sin importar el tamano
del tile. Con este procedimiento AUSTRAL_S (~270 M celdas) no exige mas
RAM que AUSTRAL_N, solo mas bandas y mas tiempo.

--- Por que 30 km de solape alcanzan, aunque el EDT quede impreciso mas alla ---

Una banda con solape de 30 km calcula bien cualquier distancia a costa
hasta ~30 km desde el borde de la banda. Mas alla de eso, la distancia
puede quedar subestimada porque la costa relevante cae fuera de la
ventana extendida. Esto NO afecta el ruteo, por dos razones que hay que
entender antes de "arreglar" este numero:

  1. El corte normativo mas lejano es CDC a 12 MN = 22.224 m, que cae
     holgado dentro de los 30.000 m de solape y queda exacto.
  2. La penalizacion de mar abierto (LUT de costo, spec Sec 7.1) satura
     en penalMax alrededor de los 25 km. Dos celdas a 35 km y 60 km
     reciben el mismo costo, asi que un error de EDT entre esos dos
     valores no cambia ninguna decision del A*.

Es decir: el EDT no es exacto en mar abierto lejano, pero SI es exacto en
todo el rango donde el costo o la normativa realmente distinguen. No subir
el solape "para mas precision" sin entender que no compra nada en el
router y sí cuesta más tiempo de build.
"""
import gc

import numpy as np
from scipy.ndimage import distance_transform_edt

from packing import pack_cells, DIST_MASK

OVERLAP_KM = 30
TARGET_BAND_CELLS = 25_000_000  # tamano de banda EXTENDIDA (con solape), spec Sec 5.5


def process_tile_banded(agua, res_m, unit_m, packed_memmap, progress=print):
    """
    agua: array booleano (rows, cols) en RAM -- True = navegable. Liviano
          (1 byte/celda), no es lo que se banda.
    packed_memmap: np.memmap uint16 (rows, cols), abierto en modo 'w+',
          donde se escribe el resultado final ya empaquetado.

    Devuelve stats: {'navegable': int, 'tierra': int, 'rojo': int}
    (verde=amarillo=0 en esta corrida: sin bafimetria ni KML, Fase 1).
    """
    rows, cols = agua.shape
    overlap_rows = int(np.ceil(OVERLAP_KM * 1000 / res_m))
    band_core_rows = max(1, TARGET_BAND_CELLS // cols - 2 * overlap_rows)

    stats = {"navegable": 0, "tierra": 0, "rojo": 0}
    n_bands = int(np.ceil(rows / band_core_rows))

    for i, start_row in enumerate(range(0, rows, band_core_rows)):
        end_row = min(start_row + band_core_rows, rows)
        ext_start = max(0, start_row - overlap_rows)
        ext_end = min(rows, end_row + overlap_rows)

        sub_agua = agua[ext_start:ext_end, :]
        dist_sub = distance_transform_edt(sub_agua, sampling=res_m)

        core_off_top = start_row - ext_start
        core_off_bottom = core_off_top + (end_row - start_row)
        dist_core = dist_sub[core_off_top:core_off_bottom, :]
        agua_core = sub_agua[core_off_top:core_off_bottom, :]

        dist_units = np.clip(np.round(dist_core / unit_m), 0, DIST_MASK).astype(np.uint16)
        confianza = agua_core.astype(np.uint16)  # 1 (ROJO) si navegable, 0 (TIERRA) si no
        kml = np.zeros_like(confianza)  # Fase 1: sin KML disponible en esta corrida

        packed_memmap[start_row:end_row, :] = pack_cells(kml, confianza, dist_units)

        stats["navegable"] += int(agua_core.sum())
        stats["tierra"] += int((~agua_core).sum())
        stats["rojo"] += int(agua_core.sum())  # todo lo navegable sale ROJO en esta corrida

        progress(f"  banda {i + 1}/{n_bands}: filas [{start_row}:{end_row}] "
                 f"(extendida [{ext_start}:{ext_end}], {ext_end - ext_start} filas)")

        del sub_agua, dist_sub, dist_core, agua_core, dist_units, confianza, kml
        gc.collect()

    packed_memmap.flush()
    return stats
