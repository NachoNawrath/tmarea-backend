"""
Paso 10 (grid grueso, max-pooling factor 8 del campo distancia) y paso 11
(GeoTIFF de control) del pipeline. Ambos leen el .bin ya escrito (memmap
de solo lectura), nunca el tile completo "de una" en un array nuevo mas
alla de lo que ya vive en el .bin -- el propio .bin mapeado es la unica
copia de 76M celdas, no se duplica.
"""
import numpy as np
import rasterio
from rasterio.transform import Affine

from packing import unpack_cells

COARSE_FACTOR = 8
CONTROL_DOWNSAMPLE = 4

# 0 TIERRA negro, 1 ROJO, 2 AMARILLO, 3 VERDE (spec Sec 5.6)
CONTROL_COLORMAP = {
    0: (0, 0, 0, 255),
    1: (214, 39, 40, 255),
    2: (230, 200, 20, 255),
    3: (44, 160, 44, 255),
}


def write_coarse_bin(packed_memmap, out_path):
    """Max-pooling factor 8 SOLO del campo distancia (no de confianza/kml).
    Max, no promedio: preserva canales angostos (ej. Canal Tenglo) que un
    promedio o un submuestreo simple podrian cerrar."""
    rows, cols = packed_memmap.shape
    _, _, dist_units = unpack_cells(packed_memmap[:])

    pad_rows = (-rows) % COARSE_FACTOR
    pad_cols = (-cols) % COARSE_FACTOR
    if pad_rows or pad_cols:
        dist_units = np.pad(dist_units, ((0, pad_rows), (0, pad_cols)), mode="constant", constant_values=0)

    padded_rows, padded_cols = dist_units.shape
    coarse_rows, coarse_cols = padded_rows // COARSE_FACTOR, padded_cols // COARSE_FACTOR
    blocks = dist_units.reshape(coarse_rows, COARSE_FACTOR, coarse_cols, COARSE_FACTOR)
    coarse = blocks.max(axis=(1, 3)).astype(np.uint16)

    coarse.tofile(out_path)
    return coarse.shape


def write_control_tif(packed_memmap, out_path, origin_x, origin_y, res_m, crs_proj4):
    """GeoTIFF de control (spec Sec 5.6): instrumento de verificacion visual
    en QGIS, no un entregable. Submuestreado a 1/4 por decimacion simple
    (no agregacion) -- alcanza para chequear georreferenciacion a ojo."""
    _, confianza, _ = unpack_cells(packed_memmap[:])
    decim = confianza[::CONTROL_DOWNSAMPLE, ::CONTROL_DOWNSAMPLE].astype(np.uint8)

    control_res = res_m * CONTROL_DOWNSAMPLE
    transform = Affine(control_res, 0, origin_x, 0, -control_res, origin_y)

    with rasterio.open(
        out_path, "w",
        driver="GTiff",
        height=decim.shape[0],
        width=decim.shape[1],
        count=1,
        dtype=np.uint8,
        crs=crs_proj4,
        transform=transform,
        compress="deflate",
    ) as dst:
        dst.write(decim, 1)
        dst.write_colormap(1, CONTROL_COLORMAP)

    return decim.shape
