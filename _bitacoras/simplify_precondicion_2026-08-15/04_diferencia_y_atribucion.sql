-- ===========================================================================
-- 04_diferencia_y_atribucion.sql - CUANTA AGUA FALTA HOY, Y A QUIEN LE TOCA
-- 2026-08-15
--
-- QUE MIDE: la diferencia entre la mascara ZEE sin simplify y la de hoy, y a
-- que Capitanias marititimas ya construidas les llegaria esa agua. Contesta la
-- pregunta del owner: si sacar o bajar la tolerancia cambia la geometria de
-- las 44 maritimas ya construidas.
--
-- ============================ LIMITE DEL METODO ============================
-- La atribucion de la segunda consulta es APROXIMADA y no se puede firmar km2
-- por km2. La banda de cada jurisdiccion se RECONSTRUYE desde la extension
-- latitudinal de su figura ya construida (ST_YMin / ST_YMax de j.geom), no se
-- lee del insumo, y NO se aplica nada de lo que el constructor aplica despues:
-- ni contorno, ni fronteras declaradas, ni resta de tierra, ni el ensanche de
-- litoral. La separacion lateral entre vecinas redistribuiria parte de esta
-- agua.
--
-- SIRVE PARA: decidir SI las figuras construidas cambian. Cambian.
-- NO SIRVE PARA: firmar el km2 de cada Capitania. Eso exige correr el build.
--
-- Y NO SE PUEDE MEDIR RE-RECORTANDO j.geom CONTRA LA MASCARA NUEVA: j.geom ya
-- viene recortada por la mascara vieja, que esta contenida en la nueva, asi
-- que la interseccion devolveria j.geom sin cambio y el crecimiento seria
-- invisible. Por eso se reconstruye la banda.
-- ===========================================================================
--
-- FUENTE DE LAS FIGURAS: jurisdicciones_decreto, el ANDAMIO, que es la capa
-- que trae las 44 maritimas con geometria. NO jurisdicciones_ds991, que hoy
-- trae solo las 6 lacustres. Mismo criterio que uso 02_zee_insular.sql de
-- _bitacoras/reclasificacion_insular_2026-08-15/.
--
-- SOLO LECTURA. Todo a TEMP. jurisdicciones_decreto se lee, no se escribe.
--
-- SHELL: ejecutado en Git Bash. Forma reproducible para el owner, PowerShell:
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 `
--       -U postgres -d mapa_navegacion -X `
--       -f _bitacoras\simplify_precondicion_2026-08-15\04_diferencia_y_atribucion.sql `
--       -o _bitacoras\simplify_precondicion_2026-08-15\04_diferencia_y_atribucion.txt
-- ===========================================================================

\pset border 2

CREATE TEMP TABLE clip AS
SELECT ST_Union(ST_MakeValid(ST_Intersection(ST_MakeValid(l.geom),
       ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326)))) AS g
FROM ne_land l
WHERE ST_Intersects(l.geom, ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326));

CREATE TEMP TABLE m_hoy AS SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(
  ST_Simplify(g, 0.01)::geography, 370400)::geometry), 1e-8) AS z FROM clip;
CREATE TEMP TABLE m_sin AS SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(
  g::geography, 370400)::geometry), 1e-8) AS z FROM clip;

CREATE TEMP TABLE dif AS
SELECT (ST_Dump(ST_MakeValid(ST_Difference(
         (SELECT z FROM m_sin), (SELECT z FROM m_hoy))))).geom AS d;

-- LA ARITMETICA VA COMPLETA, CON LOS TRES NUMEROS, PORQUE DICEN COSAS
-- DISTINTAS Y CONFUNDIRLOS YA COSTO UNA CIFRA MAL REPORTADA:
--   GANA  = area de ST_Difference(sin_simplify, hoy)  -> agua que hoy falta
--   PIERDE= area de ST_Difference(hoy, sin_simplify)  -> agua que hoy sobra,
--           porque Douglas-Peucker tambien empuja el borde hacia AFUERA
--   NETO  = resta de las areas de las dos mascaras = GANA - PIERDE
-- El NETO solo no alcanza: esconde que el borde de hoy esta corrido en los dos
-- sentidos, no solamente adentro.
CREATE TEMP TABLE inv AS
SELECT (ST_Dump(ST_MakeValid(ST_Difference(
         (SELECT z FROM m_hoy), (SELECT z FROM m_sin))))).geom AS d;

SELECT 'GANA  - sin simplify menos hoy' AS que,
       round((ST_Area(ST_Collect(d)::geography) / 1e6)::numeric, 1) AS km2,
       count(*) AS piezas
FROM dif
UNION ALL
SELECT 'PIERDE - hoy menos sin simplify',
       round((ST_Area(ST_Collect(d)::geography) / 1e6)::numeric, 1), count(*)
FROM inv
UNION ALL
SELECT 'NETO  - resta de las areas de las dos mascaras',
       round(((SELECT ST_Area(z::geography) FROM m_sin)
            - (SELECT ST_Area(z::geography) FROM m_hoy))::numeric / 1e6, 1), NULL;

-- Las piezas > 1 km2. Las dos primeras son los discos de 200 mn de las islas
-- que el simplify borra; el resto son astillas del borde de la mascara.
SELECT round((ST_Area(d::geography) / 1e6)::numeric, 1) AS km2,
       round(ST_X(ST_Centroid(d))::numeric, 3) AS lon,
       round(ST_Y(ST_Centroid(d))::numeric, 3) AS lat,
       round(ST_YMin(d)::numeric, 2) AS lat_min,
       round(ST_YMax(d)::numeric, 2) AS lat_max
FROM dif
WHERE ST_Area(d::geography) / 1e6 > 1
ORDER BY km2 DESC;

-- Atribucion aproximada. Ver LIMITE DEL METODO en la cabecera.
SELECT j.nombre,
       round((ST_Area(ST_Intersection(ST_Collect(d.d),
              ST_MakeEnvelope(-85.0, ST_YMin(j.geom), -65.0, ST_YMax(j.geom), 4326)
             )::geography) / 1e6)::numeric, 1) AS km2_que_ganaria,
       round((ST_Area(j.geom::geography) / 1e6)::numeric, 1) AS km2_hoy
FROM jurisdicciones_decreto j, dif d
WHERE j.ambito = 'maritima' AND j.geom IS NOT NULL
GROUP BY j.nombre, j.geom
HAVING ST_Area(ST_Intersection(ST_Collect(d.d),
        ST_MakeEnvelope(-85.0, ST_YMin(j.geom), -65.0, ST_YMax(j.geom), 4326)
       )::geography) / 1e6 > 1
ORDER BY 2 DESC;

-- Cuantas maritimas construidas hay en total, para leer el "43 de 44".
SELECT 'maritimas construidas con geometria' AS que, count(*) AS n
FROM jurisdicciones_decreto WHERE ambito = 'maritima' AND geom IS NOT NULL;
