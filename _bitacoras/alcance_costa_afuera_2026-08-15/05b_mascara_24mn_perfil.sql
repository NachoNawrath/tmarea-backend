-- ============================================================================
-- SEGUNDO INSTRUMENTO PARA LA MISMA PREGUNTA: EL PERFIL DEL BORDE
--
-- POR QUE HAY UN SEGUNDO. El primero (05_mascara_24mn.sql) bufferiza la union
-- entera de cada capa y compara areas. Es el instrumento fiel —hace lo mismo que
-- haria el constructor— y es CARO: `costa_osm` son 2.664 piezas y 86.688
-- vertices en la banda de `arica`, contra 1 pieza y 105 vertices de `ne_land`.
-- Este archivo NO lo reemplaza: contesta la parte que decide, por otra via y
-- barato, para que la pregunta del owner no quede sin numero si el otro no
-- termina.
--
-- LA IDEA. El borde exterior de una mascara de alcance corto es, en cada
-- latitud, la costa que mira al oceano corrida 44.448 m hacia el Oeste. Asi que
-- en vez de construir las dos mascaras y restarlas, se mide DONDE ESTA ESA COSTA
-- en cada capa, latitud por latitud. La diferencia entre las dos columnas ES el
-- corrimiento del borde, que es lo que decide si la capa gruesa alcanza.
--
-- LO QUE ESTE INSTRUMENTO NO CONTESTA, Y SE DICE: no da el area de la
-- diferencia ni distingue el borde que se movio hacia adentro del que se movio
-- hacia afuera. Da el CORRIMIENTO por latitud —minimo, maximo, promedio— y con
-- el se acota el area, no se calcula. Si hace falta el area exacta, la da el
-- instrumento caro.
--
-- SHELL: PowerShell, desde la raiz del repositorio.
--   $env:PGPASSWORD = "<la del .env>"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 `
--       -U postgres -d mapa_navegacion `
--       -f "_bitacoras\alcance_costa_afuera_2026-08-15\05b_mascara_24mn_perfil.sql" `
--       -o "_bitacoras\alcance_costa_afuera_2026-08-15\05b_mascara_24mn_perfil.txt"
-- ============================================================================

SET statement_timeout = '10min';
\timing on
\pset footer off

\echo ''
\echo '=== EL BORDE OCEANICO DE CADA CAPA, LATITUD POR LATITUD ===================='
\echo '    Paso de 0,005 grados (~556 m) entre 19 13 00 S y 18 21 00 S.'
\echo '    lon_* = longitud de la costa que mira al oceano (la mas al Oeste).'

DROP TABLE IF EXISTS _perfil;
CREATE TEMP TABLE _perfil AS
WITH lats AS (
  SELECT generate_series(-19.216667, -18.35, 0.005) AS lat
), corte AS (
  SELECT l.lat,
         ST_SetSRID(ST_MakeLine(ST_MakePoint(-72.0, l.lat),
                                ST_MakePoint(-69.0, l.lat)), 4326) AS linea
    FROM lats l
)
SELECT c.lat,
       (SELECT min(ST_XMin(ST_Intersection(ST_MakeValid(g.geom), c.linea)))
          FROM ne_land g   WHERE ST_Intersects(g.geom, c.linea))  AS lon_gruesa,
       (SELECT min(ST_XMin(ST_Intersection(ST_MakeValid(o.geom), c.linea)))
          FROM costa_osm o WHERE ST_Intersects(o.geom, c.linea))  AS lon_fina
  FROM corte c;

\echo ''
\echo '=== 1. CUANTAS LATITUDES RESUELVEN EN CADA CAPA ============================'
\echo '    Una latitud sin costa en una capa y con costa en la otra NO es ruido:'
\echo '    es la capa gruesa perdiendo un trozo de litoral entero.'

SELECT count(*)                                              AS latitudes,
       count(lon_gruesa)                                     AS con_costa_gruesa,
       count(lon_fina)                                       AS con_costa_fina,
       count(*) FILTER (WHERE lon_gruesa IS NULL
                          AND lon_fina IS NOT NULL)          AS solo_la_fina,
       count(*) FILTER (WHERE lon_fina IS NULL
                          AND lon_gruesa IS NOT NULL)        AS solo_la_gruesa
  FROM _perfil;

\echo ''
\echo '=== 2. EL CORRIMIENTO DEL BORDE, EN METROS ================================='
\echo '    Positivo = la costa FINA esta mas al Oeste que la gruesa, o sea que el'
\echo '    borde de 24 mn de la fina cae mas afuera. Negativo = al reves.'
\echo '    El promedio NO alcanza: se dan tambien los dos extremos, porque un'
\echo '    borde corrido en los dos sentidos se compensa en el promedio.'

SELECT round(min(d)::numeric, 1)                       AS corrimiento_min_m,
       round(max(d)::numeric, 1)                       AS corrimiento_max_m,
       round(avg(d)::numeric, 1)                       AS corrimiento_medio_m,
       round(avg(abs(d))::numeric, 1)                  AS corrimiento_medio_abs_m,
       round((max(abs(d)) / 44448.0 * 100)::numeric, 2) AS peor_en_pct_de_24mn
  FROM (SELECT (lon_gruesa - lon_fina) * 111320 * cos(radians(lat)) AS d
          FROM _perfil WHERE lon_gruesa IS NOT NULL AND lon_fina IS NOT NULL) t;

\echo ''
\echo '=== 3. COTA DEL AREA QUE SEPARA A LAS DOS MASCARAS ========================='
\echo '    Integra |corrimiento| por el alto de cada franja. Es una COTA de la'
\echo '    suma de las dos diferencias (lo que una tiene y la otra no, en los dos'
\echo '    sentidos), no el neto — el neto esconde justamente eso.'

SELECT round((sum(abs(d) * 0.005 * 110570) / 1e6)::numeric, 1) AS km2_cota_diferencia
  FROM (SELECT (lon_gruesa - lon_fina) * 111320 * cos(radians(lat)) AS d
          FROM _perfil WHERE lon_gruesa IS NOT NULL AND lon_fina IS NOT NULL) t;

\echo ''
\echo '=== 4. LAS DIEZ LATITUDES DONDE MAS SE APARTAN ============================='

SELECT round(lat::numeric, 4) AS lat,
       round(lon_gruesa::numeric, 5) AS lon_gruesa,
       round(lon_fina::numeric, 5)   AS lon_fina,
       round(((lon_gruesa - lon_fina) * 111320 * cos(radians(lat)))::numeric, 1) AS dif_m
  FROM _perfil
 WHERE lon_gruesa IS NOT NULL AND lon_fina IS NOT NULL
 ORDER BY abs(lon_gruesa - lon_fina) DESC
 LIMIT 10;
