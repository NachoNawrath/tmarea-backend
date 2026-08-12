import io, os, sys, re, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import geopandas as gpd
SHP = os.path.join(os.getcwd(), "geodata", "lagos", "Inventario_Lagos.shp")
def norm(s):
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Z0-9]+", " ", s.upper()).strip()
gdf = gpd.read_file(SHP)
print("registros:", len(gdf), " columnas:", list(gdf.columns))
gdf["N"] = gdf["NOMBRE"].map(norm)
print()
print("BUSQUEDA DE LAS DOS GRAFIAS")
for patron in ("GALLETUE", "GUALLETUE", "ALLETUE", "ALLETU", "GALLET", "GUALLET"):
    hit = gdf[gdf["N"].str.contains(patron, na=False)]
    print(f"  contiene '{patron}': {len(hit)}")
    for _, r in hit.iterrows():
        g = gpd.GeoSeries([r.geometry], crs=gdf.crs).to_crs(4326).iloc[0]
        print(f"      {r['NOMBRE']}  | region={r.get('REGION')} | "
              f"area={r.geometry.area/1e6:.3f} u2 | centro=({g.centroid.y:.4f},{g.centroid.x:.4f})")
print()
print("VECINDARIO: cuerpos de la IX Region cuyo nombre empieza con G")
ix = gdf[(gdf.get("REGION").astype(str) == "IX") & (gdf["N"].str.startswith("LAGUNA G") | gdf["N"].str.startswith("LAGO G"))]
for _, r in ix.iterrows():
    print(f"      {r['NOMBRE']}  area={r.geometry.area/1e6:.3f}")
print()
print("CONTROL: los otros cuerpos del mismo parrafo (CP Lago Villarrica) SI estan?")
for nom in ("CONGUILLIO", "ICALMA", "COLICO", "CABURGA", "HUILIPILUN", "VILLARRICA"):
    hit = gdf[gdf["N"].str.contains(nom, na=False)]
    print(f"      {nom:<12} {len(hit)} coincidencia(s): {', '.join(hit['NOMBRE'].astype(str)[:3])}")
