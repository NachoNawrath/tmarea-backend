"""
Test 9 del spec (TMAREA_SPEC_Router_Raster_v1.md §10): round-trip del
empaquetado de 16 bits. Empaqueta y desempaqueta 10.000 combinaciones
aleatorias de (kml, confianza, distancia) y verifica que se recuperen
sin perdida. No requiere datos del pipeline -- es una prueba pura del
esquema de bits.
"""
import numpy as np
from packing import pack_cells, unpack_cells, DIST_MASK

N = 10_000
rng = np.random.default_rng(42)

kml_in = rng.integers(0, 2, size=N)
conf_in = rng.integers(0, 4, size=N)
dist_in = rng.integers(0, DIST_MASK + 1, size=N)  # 0..8191, unidades de unit_m

packed = pack_cells(kml_in, conf_in, dist_in)
kml_out, conf_out, dist_out = unpack_cells(packed)

ok_kml = np.array_equal(kml_in, kml_out)
ok_conf = np.array_equal(conf_in, conf_out)
ok_dist = np.array_equal(dist_in, dist_out)

print(f"N combinaciones probadas: {N}")
print(f"kml_bit round-trip:       {'OK' if ok_kml else 'FALLO'}")
print(f"confianza round-trip:     {'OK' if ok_conf else 'FALLO'}")
print(f"distancia round-trip:     {'OK' if ok_dist else 'FALLO'}")
print(f"valores uint16 unicos generados: {len(np.unique(packed))}")

if ok_kml and ok_conf and ok_dist:
    print("\nTEST 9: PASA")
else:
    print("\nTEST 9: FALLA")
    raise SystemExit(1)
