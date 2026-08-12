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
cur.execute("select to_regclass('public.jurisdicciones_ds991')")
print("existe jurisdicciones_ds991 :", cur.fetchone()[0])
cur.execute("""select tablename from pg_tables where schemaname='public'
               and (tablename like '%jurisdicc%') order by 1""")
print("capas de jurisdicciones en la base:", [t for (t,) in cur.fetchall()])
print()
print("jurisdicciones_decreto — ambito antartico:")
cur.execute("""select id, (geom is not null),
                      case when geom is null then null
                           else round((st_area(geom::geography)/1e6)::numeric,1) end
               from jurisdicciones_decreto where ambito='antartica' order by id""")
for r in cur.fetchall(): print("   ", r[0], " geom:", r[1], " km2:", r[2])
cur.execute("select count(*) from jurisdicciones_decreto")
print("filas totales en jurisdicciones_decreto:", cur.fetchone()[0])
print()
cur.execute("""select count(*) from bahias_sitport b
               join jurisdicciones_decreto j on st_intersects(b.geom, j.geom)
               where j.ambito='antartica'""")
print("bahias SITPORT que caen en alguna figura antartica:", cur.fetchone()[0])
con.close()
