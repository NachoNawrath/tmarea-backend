"""
scraper_caletas.py
Intenta 3 fuentes en orden:
1. SUBPESCA ArcGIS REST (completo, oficial)
2. Wikipedia Anexo caletas pesqueras Chile
3. Fusiona con las 76 del shapefile ya procesado
"""
import json, os, sys, math

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    os.system(f"{sys.executable} -m pip install requests beautifulsoup4")
    import requests
    from bs4 import BeautifulSoup

BASE    = r"C:\Users\katia\tmarea-backend"
OUT     = os.path.join(BASE, "caletas_chile.json")
EXISTENTES = os.path.join(BASE, "caletas_chile.json")

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'es-CL,es;q=0.9',
}

caletas = []

# ── FUENTE 1: SUBPESCA ArcGIS REST ──────────────────────────────────────────
print("="*50)
print("FUENTE 1: SUBPESCA ArcGIS REST")
print("="*50)

try:
    # Primero obtener el total de registros
    url_count = (
        "https://geoportal.subpesca.cl/server/rest/services/IDE_PUBLICO/"
        "SRMPUB_CALETAS_PESQUERAS/MapServer/0/query"
        "?where=1%3D1&returnCountOnly=true&f=json"
    )
    r = requests.get(url_count, headers=headers, timeout=20)
    total = r.json().get('count', 0)
    print(f"Total registros disponibles: {total}")

    # Descargar en páginas de 1000
    offset = 0
    pagina = 0
    while offset < total or pagina == 0:
        url_q = (
            "https://geoportal.subpesca.cl/server/rest/services/IDE_PUBLICO/"
            "SRMPUB_CALETAS_PESQUERAS/MapServer/0/query"
            f"?where=1%3D1&outFields=*&outSR=4326&f=json"
            f"&resultOffset={offset}&resultRecordCount=1000"
        )
        r2 = requests.get(url_q, headers=headers, timeout=30)
        data = r2.json()
        features = data.get('features', [])
        if not features:
            break

        for feat in features:
            att  = feat.get('attributes', {})
            geom = feat.get('geometry', {})

            # Coordenadas en WGS84 directo
            lng = geom.get('x') or geom.get('longitude') or geom.get('X')
            lat = geom.get('y') or geom.get('latitude')  or geom.get('Y')

            if lat is None or lng is None:
                continue

            nombre    = str(att.get('NOMBRE_CAL') or att.get('NOM_CALETA') or att.get('NOMBRE') or '').strip().title()
            region    = str(att.get('REGION')     or att.get('NOM_REGION') or '').strip()
            comuna    = str(att.get('COMUNA')     or att.get('NOM_COMUNA') or '').strip().title()
            provincia = str(att.get('PROVINCIA')  or '').strip().title()

            if not nombre:
                continue

            caletas.append({
                "id":        f"CAL-ARC-{len(caletas)+1:04d}",
                "nombre":    nombre,
                "region":    region,
                "provincia": provincia,
                "comuna":    comuna,
                "latitud":   round(float(lat), 6),
                "longitud":  round(float(lng), 6),
                "fuente":    "subpesca_arcgis"
            })

        offset += len(features)
        pagina += 1
        print(f"  Página {pagina}: {len(features)} registros → total acum: {len(caletas)}")
        if len(features) < 1000:
            break

    print(f"SUBPESCA: {len(caletas)} caletas obtenidas")

except Exception as e:
    print(f"SUBPESCA falló: {e}")

# ── FUENTE 2: Wikipedia ──────────────────────────────────────────────────────
if len(caletas) < 100:
    print("\n" + "="*50)
    print("FUENTE 2: Wikipedia")
    print("="*50)

    try:
        url_wiki = "https://es.wikipedia.org/wiki/Anexo:Caletas_pesqueras_de_Chile"
        r = requests.get(url_wiki, headers=headers, timeout=20)
        soup = BeautifulSoup(r.text, 'html.parser')

        tablas = soup.find_all('table', class_='wikitable')
        print(f"Tablas encontradas: {len(tablas)}")

        region_actual = "Sin región"
        wiki_caletas  = []

        # Buscar también headings de región
        contenido = soup.find('div', {'id': 'mw-content-text'})
        if contenido:
            for elem in contenido.find_all(['h2', 'h3', 'table']):
                if elem.name in ['h2', 'h3']:
                    texto = elem.get_text(strip=True).replace('[editar]', '').strip()
                    if 'Región' in texto or 'región' in texto or 'REGIÓN' in texto:
                        region_actual = texto

                elif elem.name == 'table':
                    filas = elem.find_all('tr')
                    for fila in filas[1:]:  # skip header
                        celdas = fila.find_all(['td', 'th'])
                        if len(celdas) >= 2:
                            nombre = celdas[0].get_text(strip=True).title()
                            comuna = celdas[1].get_text(strip=True).title() if len(celdas) > 1 else ''

                            # Coordenadas desde span de coordenadas Wikipedia
                            lat_span = fila.find('span', class_='latitude')
                            lng_span = fila.find('span', class_='longitude')

                            lat = float(lat_span.get_text()) if lat_span else None
                            lng = float(lng_span.get_text()) if lng_span else None

                            if nombre and nombre not in ['', 'Caleta', 'Nombre']:
                                wiki_caletas.append({
                                    "id":        f"CAL-WIKI-{len(wiki_caletas)+1:04d}",
                                    "nombre":    nombre,
                                    "region":    region_actual,
                                    "provincia": '',
                                    "comuna":    comuna,
                                    "latitud":   lat,
                                    "longitud":  lng,
                                    "fuente":    "wikipedia"
                                })

        print(f"Wikipedia: {len(wiki_caletas)} caletas encontradas")
        caletas.extend(wiki_caletas)

    except Exception as e:
        print(f"Wikipedia falló: {e}")

# ── FUENTE 3: Fusionar con shapefile existente ───────────────────────────────
print("\n" + "="*50)
print("FUENTE 3: Fusión con shapefile existente")
print("="*50)

try:
    if os.path.exists(EXISTENTES):
        with open(EXISTENTES, encoding='utf-8') as f:
            existentes = json.load(f)

        nombres_ya = {c['nombre'].lower() for c in caletas}
        agregadas  = 0
        for c in existentes:
            if c.get('nombre', '').lower() not in nombres_ya:
                c['fuente'] = 'shapefile_sernapesca'
                caletas.append(c)
                agregadas += 1

        print(f"Shapefile: {agregadas} caletas únicas agregadas")
except Exception as e:
    print(f"Fusión falló: {e}")

# ── Deduplicar por nombre ─────────────────────────────────────────────────────
vistos   = set()
unicos   = []
for c in caletas:
    key = c['nombre'].lower().strip()
    if key not in vistos:
        vistos.add(key)
        unicos.append(c)

unicos.sort(key=lambda c: (c.get('region', ''), c.get('nombre', '')))

# ── Guardar ──────────────────────────────────────────────────────────────────
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(unicos, f, ensure_ascii=False, indent=2)

print(f"\n{'='*50}")
print(f"✓ TOTAL: {len(unicos)} caletas únicas guardadas")
print(f"Archivo: {OUT}")
print(f"{'='*50}")
if unicos:
    print("\nPrimeras 5:")
    for c in unicos[:5]:
        print(f"  {c['nombre']} | {c.get('region','')} | {c.get('latitud')}, {c.get('longitud')}")
