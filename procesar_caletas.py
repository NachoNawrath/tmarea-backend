"""
procesar_caletas.py
Lee el shapefile oficial de Caletas Pesqueras Decretadas de Chile
y genera caletas_chile.json listo para el backend de Tmarea.

Uso: python procesar_caletas.py
Requiere: pip install dbfread pyshp
"""

import json
import sys
import os

# ── Instalar dependencias si no están ───────────────────────────────────────
try:
    from dbfread import DBF
    import shapefile
except ImportError:
    print("Instalando dependencias...")
    os.system(f"{sys.executable} -m pip install dbfread pyshp")
    from dbfread import DBF
    import shapefile

# ── Rutas ────────────────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
SHP  = os.path.join(BASE, "CALETAS PESQUERAS DECRETADAS", "CALETAS PESQUERAS DECRETADAS.shp")
OUT  = os.path.join(BASE, "caletas_chile.json")

# Si la carpeta extraída tiene otro nombre, buscarla automáticamente
if not os.path.exists(SHP):
    for root, dirs, files in os.walk(BASE):
        for f in files:
            if f.upper().endswith(".SHP") and "CALETA" in f.upper():
                SHP = os.path.join(root, f)
                print(f"Shapefile encontrado en: {SHP}")
                break

if not os.path.exists(SHP):
    print("ERROR: No se encontró el archivo .shp")
    print(f"Buscado en: {BASE}")
    print("Verifica que extrajiste el RAR en la carpeta correcta.")
    sys.exit(1)

print(f"Procesando: {SHP}")

# ── Leer shapefile ────────────────────────────────────────────────────────────
caletas = []
errores = 0

try:
    sf = shapefile.Reader(SHP, encoding='latin-1')
    fields = [f[0] for f in sf.fields[1:]]  # skip DeletionFlag
    print(f"Campos disponibles: {fields}")

    for i, sr in enumerate(sf.shapeRecords()):
        try:
            rec  = dict(zip(fields, sr.record))
            geom = sr.shape

            # Coordenadas — pueden ser Point o centroide de Polygon
            if geom.shapeType == 1:  # Point
                lng, lat = geom.points[0]
            elif geom.shapeType in (3, 5) and geom.points:  # Polyline o Polygon
                # Centroide simple
                xs = [p[0] for p in geom.points]
                ys = [p[1] for p in geom.points]
                lng = sum(xs) / len(xs)
                lat = sum(ys) / len(ys)
            else:
                errores += 1
                continue

            # Validación geográfica Chile
            if not (-56 <= lat <= -15 and -76 <= lng <= -65):
                errores += 1
                continue

            # Extraer campos — intentamos múltiples nombres posibles
            def campo(*keys):
                for k in keys:
                    for fk in rec:
                        if fk.upper() == k.upper():
                            v = rec[fk]
                            return str(v).strip().title() if v else ''
                return ''

            nombre   = campo('NOMBRE', 'NOM_CALETA', 'CALETA', 'NAME', 'NOMBRE_CAL')
            region   = campo('REGION', 'NOM_REGION', 'REGION_', 'REG')
            comuna   = campo('COMUNA', 'NOM_COMUNA', 'COMUNA_')
            provincia= campo('PROVINCIA', 'PROV', 'NOM_PROV')

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
            errores += 1
            continue

except Exception as e:
    print(f"ERROR leyendo shapefile: {e}")
    sys.exit(1)

# ── Ordenar por región y nombre ───────────────────────────────────────────────
caletas.sort(key=lambda c: (c['region'], c['nombre']))

# ── Guardar ───────────────────────────────────────────────────────────────────
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(caletas, f, ensure_ascii=False, indent=2)

print(f"\n✓ {len(caletas)} caletas procesadas correctamente")
print(f"✗ {errores} registros omitidos (geometría inválida o fuera de Chile)")
print(f"\nArchivo generado: {OUT}")

# Preview de las primeras 5
print("\nPrimeras 5 caletas:")
for c in caletas[:5]:
    print(f"  {c['id']} | {c['nombre']} | {c['region']} | {c['latitud']}, {c['longitud']}")
