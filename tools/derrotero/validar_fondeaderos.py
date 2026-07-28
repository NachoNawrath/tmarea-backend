"""
Valida fondeaderos_candidatos.csv contra el raster AUSTRAL_N.bin: cada
fondeadero DEBE caer en agua (test de sanidad de la extraccion, no de
confianza batimetrica -- ese dato es para R5/P3, no para el router).
Reutiliza el CRS/indexado documentado en el meta.json del tile -- misma
proyeccion que usa el router en runtime (TMAREA_SPEC_Router_Raster_v1.md
Sec 3.1), sin dependencias de Node.

Semantica de la celda (Sec 5, build_tile.py paso 5): distance_transform_edt
se corre sobre la mascara booleana "agua" (True=agua). scipy da, para cada
celda True, la distancia a la celda False mas cercana -- o sea las celdas de
TIERRA quedan en 0 y las de AGUA quedan en su distancia real a la costa en
metros. Bits 12-0 del uint16 = esa distancia en unidades de unit_m (10 m).
Por lo tanto: distancia == 0 -> tierra (o exactamente en el borde). Esto NO
depende de la capa de confianza batimetrica (bits 14-13), que Fase 3
confirmo que no tiene fuente publica utilizable (docs/handoff-fase2.md) --
agua/tierra es una pregunta anterior y mas simple, ya resuelta en Fase 1.

Dos salidas:
  - fondeaderos_validado.csv: auditoria completa, las N filas candidatas
    con su estado (agua/tierra/fuera_de_bbox) y la celda del tile que les
    toco. Para revisar despues por que una entrada quedo en tierra.
  - fondeaderos.csv: SOLO las filas en agua, con el esquema original (sin
    las columnas de auditoria) -- es el entregable real que consume R5/P3.
"""
import csv
import json
import numpy as np
from pyproj import Transformer

META_PATH = r"C:\tmarea-data\tiles\AUSTRAL_N.meta.json"
BIN_PATH = r"C:\tmarea-data\tiles\AUSTRAL_N.bin"
IN_CSV = r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\fondeaderos_candidatos.csv"
OUT_AUDIT_CSV = r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\fondeaderos_validado.csv"
OUT_FINAL_CSV = r"C:\Users\katia\tmarea-backend\tools\derrotero\piloto_chacao\fondeaderos.csv"
CAMPOS_ORIGINALES = ["canal", "nombre", "lat", "lon", "profundidad_fondeo_m", "pagina"]

with open(META_PATH, encoding="utf-8") as f:
    meta = json.load(f)

origin_x, origin_y = meta["origin_x"], meta["origin_y"]
res_m = meta["res_m"]
cols, rows = meta["cols"], meta["rows"]
unit_m = meta["unit_m"]
dist_mask = (1 << (meta["packing"]["dist_bits"][0] + 1)) - 1  # bits 12-0

transformer = Transformer.from_crs("EPSG:4326", meta["crs_proj4"], always_xy=True)

arr = np.memmap(BIN_PATH, dtype="uint16", mode="r", shape=(rows, cols))

rows_out = []
with open(IN_CSV, encoding="utf-8") as f:
    for row in csv.DictReader(f):
        lat, lon = float(row["lat"]), float(row["lon"])
        x, y = transformer.transform(lon, lat)
        col = int((x - origin_x) / res_m)
        fila = int((origin_y - y) / res_m)

        if not (0 <= col < cols and 0 <= fila < rows):
            estado = "fuera_de_bbox"
            dist_m = None
        else:
            raw = int(arr[fila, col])
            dist_units = raw & dist_mask
            dist_m = dist_units * unit_m
            estado = "agua" if dist_m > 0 else "tierra"

        rows_out.append({**row, "proj_x": round(x, 1), "proj_y": round(y, 1),
                          "col": col, "fila": fila, "dist_costa_m": dist_m, "estado": estado})

with open(OUT_AUDIT_CSV, "w", newline="", encoding="utf-8") as f:
    fieldnames = list(rows_out[0].keys())
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(rows_out)

filas_agua = [r for r in rows_out if r["estado"] == "agua"]
with open(OUT_FINAL_CSV, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=CAMPOS_ORIGINALES)
    w.writeheader()
    for r in filas_agua:
        w.writerow({k: r[k] for k in CAMPOS_ORIGINALES})

from collections import Counter
c = Counter(r["estado"] for r in rows_out)
print(f"Total candidatos: {len(rows_out)}")
for k, v in c.items():
    print(f"  {k}: {v}")
print(f"Auditoria completa: {OUT_AUDIT_CSV}")
print(f"Entregable final ({len(filas_agua)} filas, solo agua): {OUT_FINAL_CSV}")
