import os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import psycopg2
env = {}
for ln in open(os.path.join(os.getcwd(), ".env"), encoding="utf-8"):
    ln = ln.strip()
    if ln and not ln.startswith("#") and "=" in ln:
        k, v = ln.split("=", 1); env[k.strip()] = v.strip().strip('"').strip("'")
con = psycopg2.connect(host=env.get("DB_HOST","localhost"), port=env.get("DB_PORT",5432),
                       dbname=env.get("DB_NAME"), user=env.get("DB_USER"), password=env.get("DB_PASSWORD"))
cur = con.cursor()
print("bbox de cada figura antartica (lat N, lat S, lon W, lon E):")
cur.execute("""select id, round(st_ymax(geom)::numeric,3), round(st_ymin(geom)::numeric,3),
                      round(st_xmin(geom)::numeric,3), round(st_xmax(geom)::numeric,3)
               from jurisdicciones_decreto where ambito='antartica' order by id""")
for r in cur.fetchall(): print("   %-18s N %-9s S %-9s W %-9s E %s" % r)
print()
print("traslapes entre las cuatro antarticas (km2):")
cur.execute("""select a.id, b.id, round((st_area(st_intersection(a.geom,b.geom)::geography)/1e6)::numeric,1)
               from jurisdicciones_decreto a join jurisdicciones_decreto b
                 on a.id < b.id and st_overlaps(a.geom,b.geom)
               where a.ambito='antartica' and b.ambito='antartica' order by 3 desc""")
f = cur.fetchall()
print("   ninguno" if not f else "")
for r in f: print("   %-18s x %-18s %s" % r)
print()
print("bahia_paraiso: sus vertices tal como estan en la base")
cur.execute("select st_astext(st_exteriorring(st_geometryn(geom,1))) from jurisdicciones_decreto where id='bahia_paraiso'")
print("  ", cur.fetchone()[0])
print()
print("la figura antartica mas al Norte llega a lat:")
cur.execute("select max(st_ymax(geom)) from jurisdicciones_decreto where ambito='antartica'")
print("  ", round(cur.fetchone()[0],3), " (una ruta chilena no baja de -56)")
con.close()
