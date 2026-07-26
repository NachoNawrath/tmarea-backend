"""
Chequeo numerico de puntos de control sobre el .bin ya generado. No
reemplaza la revision visual en QGIS (spec Sec 5.6) -- la complementa,
porque un error de agujeros interiores en rasterize() (islas rellenadas
como agua) puede pasar desapercibido a simple vista en un raster de baja
resolucion, mientras que en un punto exacto se ve clarisimo.
"""
import argparse
import json

import numpy as np
from pyproj import Transformer

from packing import unpack_cells

CONTROL_POINTS = [
    # (lat, lon, esperado, descripcion)
    (-42.60, -73.95, "TIERRA", "interior de Isla Grande de Chiloe"),
    (-43.58, -74.73, "TIERRA", "Isla Guafo"),
    (-44.50, -72.30, "TIERRA", "cordillera continental"),
    (-45.40, -72.70, "TIERRA", "continente, sector Coyhaique"),
    (-44.00, -75.40, "AGUA", "Pacifico abierto"),
    (-43.30, -73.30, "AGUA", "Golfo Corcovado"),
    (-41.90, -73.10, "AGUA", "Golfo de Ancud"),
    (-44.60, -73.55, "AGUA", "Canal Moraleda"),
    # Puntos pedidos explicitamente tras la correccion del bbox (Sec 3.2,
    # limite norte -41.5 -> -39.5): antes caian fuera del tile, ahora deben
    # caer dentro Y dar AGUA. Anahuac/Puerto Montt y Paso Tenglo son los
    # extremos del trazado real del canal (ver test_connectivity.py), no
    # coordenadas de muelle -- por eso corresponde esperar AGUA aca.
    (-41.4776, -72.9388, "AGUA", "Anahuac / Puerto Montt"),
    (-41.4851, -72.9596, "AGUA", "Paso Tenglo"),
    (-39.8700, -73.4300, "AGUA", "Corral"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", default="AUSTRAL_N")
    ap.add_argument("--tiles-dir", default="C:/tmarea-data/tiles")
    args = ap.parse_args()

    with open(f"{args.tiles_dir}/{args.tile}.meta.json", encoding="utf-8") as f:
        meta = json.load(f)

    rows, cols = meta["rows"], meta["cols"]
    origin_x, origin_y, res_m = meta["origin_x"], meta["origin_y"], meta["res_m"]
    unit_m = meta["unit_m"]

    packed = np.memmap(f"{args.tiles_dir}/{args.tile}.bin", dtype=np.uint16, mode="r", shape=(rows, cols))

    to_proj = Transformer.from_crs("EPSG:4326", meta["crs_proj4"], always_xy=True)

    print(f"{'punto':45s} {'esperado':8s} {'obtenido':10s} {'dist_m':>8s}  resultado")
    print("-" * 95)

    n_fail = 0
    for lat, lon, esperado, desc in CONTROL_POINTS:
        x, y = to_proj.transform(lon, lat)
        col = int((x - origin_x) / res_m)
        fila = int((origin_y - y) / res_m)

        if not (0 <= fila < rows and 0 <= col < cols):
            print(f"{desc:45s} {esperado:8s} {'FUERA DE TILE':10s}")
            n_fail += 1
            continue

        raw = int(packed[fila, col])
        kml, confianza, dist_units = unpack_cells(np.array([raw]))
        confianza = int(confianza[0])
        dist_m = int(dist_units[0]) * unit_m

        if esperado == "DENTRO_DEL_TILE":
            # Solo valida membresia en el tile -- no clasificacion. Puntos
            # de muelle/rampa caen legitimamente en TIERRA (ver comentario
            # en CONTROL_POINTS); eso se resuelve con snap-to-navigable en
            # Fase 2, no es un defecto del raster.
            obtenido = "TIERRA" if confianza == 0 else "AGUA"
            ok = True  # llegar aca ya significa que paso el chequeo de "fuera de tile" de arriba
            marca = "OK (dentro del tile)"
        else:
            obtenido = "TIERRA" if confianza == 0 else "AGUA"
            ok = obtenido == esperado
            marca = "OK" if ok else "*** FALLA ***"

        if not ok:
            n_fail += 1
        print(f"{desc:45s} {esperado:8s} {obtenido:10s} {dist_m:8d}  {marca}  "
              f"(fila={fila}, col={col}, confianza_raw={confianza})")

    print("-" * 95)
    if n_fail == 0:
        print(f"TODOS LOS PUNTOS DE CONTROL OK ({len(CONTROL_POINTS)}/{len(CONTROL_POINTS)})")
    else:
        print(f"{n_fail} PUNTO(S) DE CONTROL FALLARON de {len(CONTROL_POINTS)}")
        print("Si los puntos TIERRA fallaron dando AGUA: rasterize() probablemente")
        print("ignoro los anillos interiores (islas) de los poligonos OSM. Hay que")
        print("revisar que las geometrias conserven sus holes al pasar por to_crs()")
        print("y rasterize(), y rehacer el tile.")


if __name__ == "__main__":
    main()
