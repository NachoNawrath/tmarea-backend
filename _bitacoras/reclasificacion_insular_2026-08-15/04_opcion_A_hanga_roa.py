# -*- coding: utf-8 -*-
r"""04 — EL COSTO DE LA OPCIÓN A PARA `hanga_roa`: CRECER LA CAJA.

SOLO LECTURA. No toca la base de datos y no escribe nada en el repositorio.

QUÉ MIDE
--------
`geodata/costa/capas_costa.json`, campo `recorte.advertencia_ambito`, deja
escritos desde el 2026-08-10 los dos caminos para el ámbito `insular_remota`:
"esta caja tiene que crecer o hay que declarar una capa de tierra propia".

Esto mide el costo del primero. Si `X_W` crece de -85 a -110 para que Isla de
Pascua (-109,37) y Sala y Gómez (-105,37) entren:

  · `receta_banda_paralelos` devuelve `box(X_W, sur, X_E, norte)`, así que TODAS
    las bandas se estiran 25° al Oeste;
  · el límite exterior se arma bufferizando `ne_10m_land` recortada a ESA MISMA
    caja, donde las dos islas sí están;
  · la intersección de las dos cosas adjudica la ZEE de las islas de `hanga_roa`
    a Capitanías continentales, sin que nadie lo decida.

C3 no lo caza: las bandas no se pisan entre sí, se pisan con nada.

QUÉ NO MIDE
-----------
No mide sobre la base. Aproxima el `ST_Buffer(::geography, 370400)` del
constructor con un buffer en proyección azimutal equidistante centrada en cada
isla, y las áreas con Lambert azimutal equivalente. A 370 km de radio la
distorsión es del orden del 1-2%: sirve para decidir entre dos caminos, no para
escribir un número en un dato. El número equivalente medido CONTRA LA BASE, para
`juan_fernandez`, está en `02_zee_insular.sql`.

Tampoco aplica el `ST_Simplify(0,01)` previo. Ver `03_simplify_islas.sql`: ese
simplify borra Isla San Félix (0,939 km²), y Sala y Gómez es más chica. O sea que
este número es un TECHO — la Opción A podría además entregar `hanga_roa` con una
isla de dos.

Intérprete (no es `python` ni `py`, ninguno de los dos sirve):
  tools\raster-build\.venv\Scripts\python.exe

Reproducible (PowerShell, desde la raíz del repositorio):
  .\tools\raster-build\.venv\Scripts\python.exe `
      _bitacoras\reclasificacion_insular_2026-08-15\04_opcion_A_hanga_roa.py
"""
import json
import os
import sys

import geopandas as gpd
import pyproj
from shapely.geometry import box
from shapely.ops import transform, unary_union

sys.stdout.reconfigure(encoding="utf-8")

# La raíz sale del propio archivo: dos niveles arriba de _bitacoras/<tema>/ (§3.4,
# no depende del disco de nadie).
AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))

ZEE_M = 370400.0                     # 200 millas náuticas, igual que el constructor
X_E, Y_S, Y_N = -65.0, -60.0, -17.0  # los tres bordes que la Opción A NO mueve
X_W_NUEVA = -110.0                   # el único que mueve: de -85 a -110

wgs = pyproj.CRS("EPSG:4326")


def buffer_geodesico(geom, metros):
    lon, lat = geom.centroid.x, geom.centroid.y
    aeqd = pyproj.CRS(f"+proj=aeqd +lat_0={lat} +lon_0={lon} +datum=WGS84 +units=m")
    ida = pyproj.Transformer.from_crs(wgs, aeqd, always_xy=True).transform
    vuelta = pyproj.Transformer.from_crs(aeqd, wgs, always_xy=True).transform
    return transform(vuelta, transform(ida, geom).buffer(metros))


def km2(geom):
    if geom.is_empty:
        return 0.0
    lon, lat = geom.centroid.x, geom.centroid.y
    laea = pyproj.CRS(f"+proj=laea +lat_0={lat} +lon_0={lon} +datum=WGS84 +units=m")
    ida = pyproj.Transformer.from_crs(wgs, laea, always_xy=True).transform
    return transform(ida, geom).area / 1e6


g = gpd.read_file(os.path.join(REPO, "geodata", "ne_10m_land.shp"))
caja = box(X_W_NUEVA, Y_S, X_E, Y_N)
# explode(): clip() devuelve MultiPolygons por fila y el continente entero viene en
# uno solo. Sin explotar, ninguna pieza tiene bounds de isla y el filtro de abajo
# devuelve cero — es el error que costó una corrida.
piezas = list(g.clip(caja).explode(index_parts=False).geometry)
print(f"piezas de ne_10m_land en la caja ampliada ({X_W_NUEVA}..{X_E}): {len(piezas)}")

pascua = [p for p in piezas if p.bounds[2] < -108]
salaygomez = [p for p in piezas if -106 < p.bounds[2] < -104]
print(f"  piezas de Isla de Pascua  (lon < -108):  {len(pascua)}")
print(f"  piezas de Sala y Gomez    (-106..-104):  {len(salaygomez)}")
if not pascua or not salaygomez:
    print("  !! ALTO: una de las dos NO esta en ne_10m_land. La Opcion A no la "
          "alcanzaria igual, y el numero de abajo no es el costo completo.")

zee_hr = unary_union([buffer_geodesico(p, ZEE_M) for p in pascua + salaygomez])
print(f"\nZEE de 200 mn de las dos islas de hanga_roa: {km2(zee_hr):,.1f} km2")

v2 = json.load(open(os.path.join(REPO, "data", "decreto", "jurisdicciones_v2.json"),
                    encoding="utf-8"))
bandas = [j for j in v2["jurisdicciones"]
          if j["ambito"] == "maritima" and j["estado_geometria"] == "cerrable"
          and j["receta"] == "banda_paralelos"]

print("\n=== A QUIEN SE LE ADJUDICA, con la caja ampliada y sin tocar nada mas ===")
total = 0.0
for j in sorted(bandas, key=lambda x: -(x["limite_norte"]["dec"] or 0)):
    n, s = j["limite_norte"]["dec"], j["limite_sur"]["dec"]
    if n is None or s is None:
        continue
    inter = box(X_W_NUEVA, s, X_E, n).intersection(zee_hr)
    if inter.is_empty:
        continue
    a = km2(inter)
    total += a
    print(f"  {j['id']:<14} N={n:>11.6f} S={s:>11.6f}   {a:12,.1f} km2")
print(f"\n  TOTAL que la Opcion A adjudica a Capitanias continentales: {total:,.1f} km2")
