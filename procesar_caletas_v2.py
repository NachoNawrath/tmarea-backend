"""
procesar_caletas_v2.py — corregido para shapefile de caletas pesqueras Chile
"""
import json, sys, os

try:
    import shapefile
except ImportError:
    os.system(f"{sys.executable} -m pip install pyshp")
    import shapefile

BASE = r"C:\Users\katia\tmarea-backend"
# Buscar el .shp automáticamente
SHP = None
for root, dirs, files in os.walk(BASE):
    for f in files:
        if f.upper().endswith(".SHP"):
            SHP = os.path.join(root, f)
            break
    if SHP:
        break

if not SHP:
    print("ERROR: No se encontró .shp")
    sys.exit(1)

print(f"Procesando: {SHP}")

sf = shapefile.Reader(SHP, encoding='latin-1')
fields = [f[0] for f in sf.fields[1:]]
print(f"Campos: {fields[:10]}...")

caletas = []
omitidos = 0

for i, sr in enumerate(sf.shapeRecords()):
    try:
        rec  = dict(zip(fields, sr.record))
        geom = sr.shape

        # Imprimir primeros 3 para debug
        if i < 3:
            print(f"\nRegistro {i}: shapeType={geom.shapeType}, points={geom.points[:2] if geom.points else 'VACIO'}")
            print(f"  NOM_CALETA={rec.get('NOM_CALETA')}, REGION={rec.get('REGION')}, COMUNA={rec.get('COMUNA')}")

        # Extraer coordenadas según tipo de geometría
        if not geom.points:
            omitidos += 1
            continue

        if geom.shapeType == 1:  # Point
            lng, lat = geom.points[0]
        else:
            # Centroide de cualquier geometría
            xs = [p[0] for p in geom.points]
            ys = [p[1] for p in geom.points]
            lng = sum(xs) / len(xs)
            lat = sum(ys) / len(ys)

        # Debug coordenadas primeros 3
        if i < 3:
            print(f"  Coords calculadas: lat={lat}, lng={lng}")

        # Validación — ampliar rango por si están en otro sistema de coordenadas
        if not (-60 <= lat <= -14 and -80 <= lng <= -60):
            if i < 10:
                print(f"  FUERA DE RANGO: lat={lat}, lng={lng}")
            omitidos += 1
            continue

        nombre = str(rec.get('NOM_CALETA') or '').strip().title()
        region = str(rec.get('REGION') or '').strip()
        comuna = str(rec.get('COMUNA') or '').strip().title()
        provincia = str(rec.get('PROVINCIA') or '').strip().title()

        if not nombre:
            nombre = f"Caleta {i+1}"

        caletas.append({
            "id":        f"CAL-{str(i+1).zfill(4)}",
            "nombre":    nombre,
            "region":    region,
            "provincia": provincia,
            "comuna":    comuna,
            "latitud":   round(lat, 6),
            "longitud":  round(lng, 6),
        })

    except Exception as e:
        print(f"Error en registro {i}: {e}")
        omitidos += 1

caletas.sort(key=lambda c: (c['region'], c['nombre']))

OUT = os.path.join(BASE, "caletas_chile.json")
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(caletas, f, ensure_ascii=False, indent=2)

print(f"\n✓ {len(caletas)} caletas procesadas")
print(f"✗ {omitidos} omitidas")
print(f"Archivo: {OUT}")
if caletas:
    print("\nPrimeras 3:")
    for c in caletas[:3]:
        print(f"  {c['nombre']} | {c['region']} | {c['latitud']}, {c['longitud']}")
