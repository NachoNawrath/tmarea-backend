import io, os, sys, re, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import geopandas as gpd
SHP = os.path.join(os.getcwd(), "geodata", "lagos", "Inventario_Lagos.shp")
def norm(s):
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Z0-9]+", " ", s.upper()).strip()
g = gpd.read_file(SHP); g["N"] = g["NOMBRE"].map(norm)
m = g.to_crs(32719)
def uno(pat): return m[m["N"].str.contains(pat, na=False)].iloc[0]
gu = uno("GUALLETUE")
print("CANDIDATO")
print(f"  NOMBRE   {gu['NOMBRE']}   fid={gu.name}  NUM={gu['NUM']}")
print(f"  REGION   {gu['REGION']}   PROVINCIA {gu['PROVINCIA']}   COMUNA {gu['COMUNA']}")
print(f"  AREA_KM2 {gu['AREA_KM2']}   TIPO {gu['TIPO']}")
print(f"  LAT/LON del catastro: {gu['LATITUD']} / {gu['LONGITUD']}")
print()
print("DISTANCIA A LOS OTROS CUERPOS DEL MISMO PARRAFO (CP Lago Villarrica)")
for pat in ("ICALMA", "CONGUILLIO", "COLICO", "CABURGA", "HUILIPILUN", "VILLARRICA"):
    o = m[m["N"].str.contains(pat, na=False)]
    d = min(gu.geometry.distance(x) for x in o.geometry) / 1000
    print(f"  {pat:<12} {d:8.1f} km")
print()
print("COMPETENCIA: otros cuerpos a menos de 25 km del candidato")
cerca = m[(m.geometry.distance(gu.geometry) < 25000) & (m.index != gu.name)]
for _, r in cerca.iterrows():
    print(f"  {r['NOMBRE']:<28} {gu.geometry.distance(r.geometry)/1000:6.1f} km  "
          f"region={r['REGION']}  area={r['AREA_KM2']}")
