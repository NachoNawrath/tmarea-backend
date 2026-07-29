#!/usr/bin/env python3
"""
generar_contact_sheet.py

Genera un contact sheet (grilla de miniaturas PNG) para revisar visualmente
candidatas a "estructura artificial que corta un canal" (ver
tools/detectar-estructuras-artificiales.js): un recorte de ~4km x 4km
alrededor del punto mas angosto de cada candidata, con la way de OSM
dibujada encima en rojo, mas una imagen individual por candidata en una
carpeta aparte para el detalle.

Nota: el recorte NO sale de AUSTRAL_N.control.tif (200m/pixel -- a esa
resolucion un canal de 100-250m de ancho mide menos de un pixel, inutil
para esto) sino directo del .bin fino (50m/pixel), reconstruyendo el mismo
campo de confianza, con una paleta cartografica (agua celeste, tierra
color arena) en vez de la paleta tecnica del control.tif (0 negro/1 rojo/
2 amarillo/3 verde) -- esa paleta pondria el agua en rojo, el mismo color
pedido para la way, y las dos se confundirian.

Uso:
    python generar_contact_sheet.py <ids_separados_por_coma> <highways.json> <salida_dir>

Ejemplo:
    python generar_contact_sheet.py 25733319,320317359 \
        C:/tmarea-data/raw/AUSTRAL_N_highways.json \
        C:/tmarea-data/raw/contact_sheet
"""
import json
import sys
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import pyproj

TILES_DIR = "C:/tmarea-data/tiles"
TILE_ID = "AUSTRAL_N"
VENTANA_M = 2000  # +-2km alrededor del punto mas angosto
CELDA_PX_FINAL = 6  # cuanto mide cada celda de 50m en el PNG final (upscale nearest-neighbor)

COLOR_TIERRA = (222, 214, 189)
COLOR_AGUA = {1: (173, 216, 230), 2: (130, 190, 225), 3: (70, 150, 210)}
COLOR_NODATA = (40, 40, 40)
COLOR_WAY = (230, 30, 30)
COLOR_PUNTO_ANGOSTO = (255, 220, 0)


def cargar_tile():
    with open(f"{TILES_DIR}/{TILE_ID}.meta.json", encoding="utf-8") as f:
        meta = json.load(f)
    packed = np.fromfile(f"{TILES_DIR}/{TILE_ID}.bin", dtype="<u2")
    packed = packed.reshape(meta["rows"], meta["cols"])
    return meta, packed


def make_transformer(meta):
    proj_wgs84_to_tmerc = pyproj.Transformer.from_crs("EPSG:4326", meta["crs_proj4"], always_xy=True)
    proj_tmerc_to_wgs84 = pyproj.Transformer.from_crs(meta["crs_proj4"], "EPSG:4326", always_xy=True)
    return proj_wgs84_to_tmerc, proj_tmerc_to_wgs84


def lonlat_to_rowcol(lon, lat, meta, to_tmerc):
    x, y = to_tmerc.transform(lon, lat)
    col = int((x - meta["origin_x"]) / meta["res_m"])
    fila = int((meta["origin_y"] - y) / meta["res_m"])
    return fila, col


def renderizar_candidata(way, punto_angoso_latlon, meta, packed, to_tmerc, titulo_lineas):
    fila_c, col_c = lonlat_to_rowcol(punto_angoso_latlon[1], punto_angoso_latlon[0], meta, to_tmerc)
    margen_celdas = int(round(VENTANA_M / meta["res_m"]))

    row_min = max(0, fila_c - margen_celdas)
    row_max = min(meta["rows"], fila_c + margen_celdas)
    col_min = max(0, col_c - margen_celdas)
    col_max = min(meta["cols"], col_c + margen_celdas)

    sub = packed[row_min:row_max, col_min:col_max]
    h, w = sub.shape
    confianza = (sub >> 13) & 0b11

    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    rgb[:, :] = COLOR_NODATA
    rgb[confianza == 0] = COLOR_TIERRA
    for nivel, color in COLOR_AGUA.items():
        rgb[confianza == nivel] = color

    img = Image.fromarray(rgb, "RGB").resize(
        (w * CELDA_PX_FINAL, h * CELDA_PX_FINAL), Image.NEAREST
    )
    draw = ImageDraw.Draw(img)

    def rowcol_a_px(fila, col):
        return ((col - col_min) * CELDA_PX_FINAL, (fila - row_min) * CELDA_PX_FINAL)

    geom = way.get("geometry") or []
    pts_px = []
    for pt in geom:
        if pt is None:
            continue
        fila, col = lonlat_to_rowcol(pt["lon"], pt["lat"], meta, to_tmerc)
        pts_px.append(rowcol_a_px(fila, col))
    if len(pts_px) >= 2:
        draw.line(pts_px, fill=COLOR_WAY, width=max(2, CELDA_PX_FINAL // 2))

    fila_p, col_p = lonlat_to_rowcol(punto_angoso_latlon[1], punto_angoso_latlon[0], meta, to_tmerc)
    px, py = rowcol_a_px(fila_p, col_p)
    r = CELDA_PX_FINAL
    draw.ellipse([px - r, py - r, px + r, py + r], outline=COLOR_PUNTO_ANGOSTO, width=3)

    try:
        font = ImageFont.truetype("arial.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 13)
    except Exception:
        font = ImageFont.load_default()
        font_small = font

    banner_h = 20 * len(titulo_lineas) + 10
    final_img = Image.new("RGB", (img.width, img.height + banner_h), (255, 255, 255))
    final_img.paste(img, (0, banner_h))
    d2 = ImageDraw.Draw(final_img)
    for i, linea in enumerate(titulo_lineas):
        f = font if i == 0 else font_small
        d2.text((4, 4 + i * 18), linea, fill=(0, 0, 0), font=f)

    return final_img


def main():
    ids = [int(x) for x in sys.argv[1].split(",")]
    highways_path = sys.argv[2]
    out_dir = sys.argv[3]
    os.makedirs(out_dir, exist_ok=True)

    candidatas_path = highways_path.replace(".json", ".candidatas-exclusion.json")
    with open(candidatas_path, encoding="utf-8") as f:
        candidatas = {c["id"]: c for c in json.load(f)}

    with open(highways_path, encoding="utf-8") as f:
        highways = {w["id"]: w for w in json.load(f)["elements"]}

    meta, packed = cargar_tile()
    to_tmerc, _ = make_transformer(meta)

    imgs = []
    for wid in ids:
        if wid not in candidatas:
            print(f"AVISO: id {wid} no esta en candidatas-exclusion.json, salteando")
            continue
        c = candidatas[wid]
        way = highways.get(wid)
        if way is None:
            print(f"AVISO: id {wid} no esta en {highways_path}, salteando")
            continue

        nombre = c["tags"].get("name") or "(sin nombre)"
        titulo = [
            f"id={wid}  {c['tags'].get('highway','')}  \"{nombre}\"",
            f"ancho_min={c['anchoMinimoLocalM']}m  largo_agua={c['largoTramoAguaM']}m  lados={c['celdasLadoA']}/{c['celdasLadoB']}",
        ]
        img = renderizar_candidata(way, c["puntoMasAngosto"], meta, packed, to_tmerc, titulo)
        individual_path = os.path.join(out_dir, f"{wid}.png")
        img.save(individual_path)
        print(f"Generado: {individual_path} ({img.width}x{img.height})")
        imgs.append(img)

    if not imgs:
        print("Sin imagenes generadas.")
        return

    cols = 5
    rows = (len(imgs) + cols - 1) // cols
    cell_w = max(im.width for im in imgs)
    cell_h = max(im.height for im in imgs)
    sheet = Image.new("RGB", (cell_w * cols, cell_h * rows), (255, 255, 255))
    for i, im in enumerate(imgs):
        r, c = divmod(i, cols)
        sheet.paste(im, (c * cell_w, r * cell_h))

    sheet_path = os.path.join(out_dir, "_contact_sheet.png")
    sheet.save(sheet_path)
    print(f"\nContact sheet: {sheet_path} ({sheet.width}x{sheet.height}, {len(imgs)} candidatas)")


if __name__ == "__main__":
    main()
