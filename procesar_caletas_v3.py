"""
procesar_caletas_v3.py
Convierte shapefile de caletas pesqueras Chile (UTM zona 19S) a GeoJSON limpio.
"""
import json, sys, os, math

try:
    import shapefile
except ImportError:
    os.system(f"{sys.executable} -m pip install pyshp")
    import shapefile

# ── Conversión UTM → Grados decimales ────────────────────────────────────────
def utm_a_latlong(easting, northing, zona=19, hemisferio='S'):
    """Convierte coordenadas UTM a latitud/longitud WGS84."""
    k0 = 0.9996
    a  = 6378137.0
    e  = 0.00669438
    e2 = e * e
    e3 = e2 * e
    e_p2 = e / (1 - e)

    x = easting - 500000
    y = northing
    if hemisferio == 'S':
        y -= 10000000

    lon_origen = (zona - 1) * 6 - 180 + 3
    M = y / k0
    mu = M / (a * (1 - e/4 - 3*e2/64 - 5*e3/256))

    p1 = (3*e/2 - 27*e3/32) * math.sin(2*mu)
    p2 = (21*e2/16 - 55*e3/32*e2) * math.sin(4*mu)  # simplificado
    p3 = (151*e3/96) * math.sin(6*mu)
    phi1 = mu + p1 + p2 + p3

    n1  = a / math.sqrt(1 - e * math.sin(phi1)**2)
    t1  = math.tan(phi1)**2
    c1  = e_p2 * math.cos(phi1)**2
    r1  = a * (1 - e) / (1 - e * math.sin(phi1)**2)**1.5
    d   = x / (n1 * k0)

    lat = phi1 - (n1 * math.tan(phi1) / r1) * (
        d**2/2 - (5 + 3*t1 + 10*c1 - 4*c1**2 - 9*e_p2) * d**4/24 +
        (61 + 90*t1 + 298*c1 + 45*t1**2 - 252*e_p2 - 3*c1**2) * d**6/720
    )
    lon = (d - (1 + 2*t1 + c1)*d**3/6 +
           (5 - 2*c1 + 28*t1 - 3*c1**2 + 8*e_p2 + 24*t1**2) * d**5/120) / math.cos(phi1)

    lat_deg = math.degrees(lat)
    lon_deg = math.degrees(lon) + lon_origen
    return round(lat_deg, 6), round(lon_deg, 6)

# ── Rutas ─────────────────────────────────────────────────────────────────────
BASE = r"C:\Users\katia\tmarea-backend"
SHP  = None
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

sf     = shapefile.Reader(SHP, encoding='latin-1')
fields = [f[0] for f in sf.fields[1:]]
print(f"Campos: {fields[:8]}...")

caletas  = []
omitidos = 0

for i, sr in enumerate(sf.shapeRecords()):
    try:
        rec  = dict(zip(fields, sr.record))
        geom = sr.shape

        if not geom.points:
            omitidos += 1
            continue

        # Centroide UTM
        xs  = [p[0] for p in geom.points]
        ys  = [p[1] for p in geom.points]
        utm_e = sum(xs) / len(xs)
        utm_n = sum(ys) / len(ys)

        # Detectar zona UTM según easting
        # Chile usa mayormente zona 18S y 19S
        if utm_e < 400000:
            zona = 18
        else:
            zona = 19

        lat, lng = utm_a_latlong(utm_e, utm_n, zona=zona, hemisferio='S')

        # Debug primeros 3
        if i < 3:
            print(f"  {rec.get('NOM_CALETA')} → UTM({utm_e:.0f}, {utm_n:.0f}) → lat={lat}, lng={lng}")

        # Validación Chile
        if not (-56 <= lat <= -14 and -76 <= lng <= -64):
            omitidos += 1
            continue

        nombre    = str(rec.get('NOM_CALETA') or '').strip().title()
        region    = str(rec.get('REGION')     or '').strip()
        comuna    = str(rec.get('COMUNA')     or '').strip().title()
        provincia = str(rec.get('PROVINCIA')  or '').strip().title()

        if not nombre:
            nombre = f"Caleta {i+1}"

        caletas.append({
            "id":        f"CAL-{str(i+1).zfill(4)}",
            "nombre":    nombre,
            "region":    region,
            "provincia": provincia,
            "comuna":    comuna,
            "latitud":   lat,
            "longitud":  lng,
        })

    except Exception as e:
        omitidos += 1

caletas.sort(key=lambda c: (c['region'], c['nombre']))

OUT = os.path.join(BASE, "caletas_chile.json")
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(caletas, f, ensure_ascii=False, indent=2)

print(f"\n✓ {len(caletas)} caletas procesadas")
print(f"✗ {omitidos} omitidas")
print(f"Archivo: {OUT}")
if caletas:
    print("\nPrimeras 5:")
    for c in caletas[:5]:
        print(f"  {c['nombre']} | {c['region']} | {c['latitud']}, {c['longitud']}")
