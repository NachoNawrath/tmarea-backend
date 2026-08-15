-- 03 — ¿QUÉ ISLAS SOBREVIVEN AL ST_Simplify(0,01) DEL LÍMITE EXTERIOR?
--
-- SOLO LECTURA. No escribe nada.
--
-- QUÉ MIDE. El constructor simplifica la unión de la capa del rol
-- `limite_exterior` con tolerancia 0,01° ANTES de bufferizar las 200 mn
-- (`scripts/fase5_construir_capa_ds991.py`, bloque `_zee`). La tolerancia es
-- adecuada a propósito para el borde continental —el error de una costa 1:10m son
-- cientos de metros, cuatro órdenes por debajo de las 200 millas—, y el
-- manifiesto lo declara. Lo que nadie había medido es qué le hace a una isla
-- oceánica cuyo diámetro es del orden de la tolerancia.
--
-- ST_Simplify (Douglas-Peucker) puede eliminar un anillo entero; no es
-- ST_SimplifyPreserveTopology. Esta consulta lista las piezas al W de -77 antes y
-- después, con su área geodésica, para que la desaparición se vea y no se deduzca.
--
-- QUÉ NO MIDE. No mide Sala y Gómez ni Isla de Pascua: están fuera de la caja de
-- trabajo (-85..-65) y por lo tanto fuera del recorte que el constructor hace.
-- Si Sala y Gómez —más chica que San Félix— sobrevive al mismo simplify queda
-- NO DETERMINADO, y sólo se puede medir con la caja ampliada de la Opción A.
--
-- Reproducible (PowerShell, desde la raíz del repositorio):
--   $env:PGPASSWORD = "<la de .env>"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost `
--       -d mapa_navegacion -f _bitacoras\reclasificacion_insular_2026-08-15\03_simplify_islas.sql
\pset border 2

WITH recorte AS (
  SELECT ST_MakeValid(ST_Intersection(ST_MakeValid(l.geom),
           ST_MakeEnvelope(-85.0,-60.0,-65.0,-17.0,4326))) AS g
  FROM ne_land l
  WHERE ST_Intersects(l.geom, ST_MakeEnvelope(-85.0,-60.0,-65.0,-17.0,4326))
), u AS (SELECT ST_Union(g) AS g FROM recorte),
   s AS (SELECT ST_Simplify(g, 0.01) AS g FROM u)
SELECT 'ANTES' AS etapa,
       round(ST_X(ST_Centroid(d.geom))::numeric,4) AS lon,
       round(ST_Y(ST_Centroid(d.geom))::numeric,4) AS lat,
       round((ST_Area(d.geom::geography)/1e6)::numeric,3) AS km2
  FROM ST_Dump((SELECT g FROM u)) d
 WHERE ST_X(ST_Centroid(d.geom)) < -77
UNION ALL
SELECT 'DESPUES',
       round(ST_X(ST_Centroid(d.geom))::numeric,4),
       round(ST_Y(ST_Centroid(d.geom))::numeric,4),
       round((ST_Area(d.geom::geography)/1e6)::numeric,3)
  FROM ST_Dump((SELECT g FROM s)) d
 WHERE ST_X(ST_Centroid(d.geom)) < -77
 ORDER BY 1 DESC, 2;
