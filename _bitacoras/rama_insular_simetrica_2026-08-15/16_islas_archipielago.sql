-- ═══════════════════════════════════════════════════════════════════════════
-- QUE PIEZAS DE TIERRA HAY EN EL ARCHIPIELAGO DE JUAN FERNANDEZ
-- 2026-08-15 · sesion F3-INSULAR (Pieza A)
--
-- POR QUE ESTA CONSULTA. Tres sesiones de este frente escribieron "las SEIS
-- islas que el D.S. 991 enumera por nombre". El texto del v1 dice, literal:
--
--   hanga_roa       "Su jurisdiccion comprende la isla de Pascua e isla Sala y
--                    Gomez."
--   juan_fernandez  "Comprende las islas de San Felix, San Ambrosio y el
--                    ARCHIPIELAGO DE JUAN FERNANDEZ."
--
-- O sea: el decreto NOMBRA CUATRO islas y un COLECTIVO SIN ENUMERAR. Robinson
-- Crusoe y Alejandro Selkirk no aparecen en el texto — entran por
-- interpretacion de ese colectivo. Si entran ellas, la pregunta que nadie hizo
-- es QUE MAS entra. Eso es lo que se mide aca.
--
-- CONTRA QUE. `costa_osm`, que es la tabla que la construccion y el corrector de
-- testigos LEEN. No contra el zip de 925 MB, que es otra afirmacion — la
-- distincion que este frente ya pago una vez ("esta en la capa" contra "esta en
-- la capa cargada", _bitacoras/reclasificacion_insular_2026-08-15/ §1).
--
-- COMO SE CUENTAN LAS PIEZAS. Se unen las filas con ST_UnaryUnion y se parten
-- con ST_Dump. NO se cuentan filas de la tabla: la variante 'split' de OSM parte
-- la costa en una grilla y una isla puede venir en varias filas — la sesion
-- insular conto 55 filas para Robinson Crusoe y son una sola isla. Y NO se usa
-- ST_Collect, porque la capa se pisa a si misma (2.116 pares medidos) y un
-- MultiPolygon de piezas que se pisan es invalido.
--
-- EL AREA VA EN geography, que es metrica sobre el elipsoide. En 4326 plano
-- daria grados cuadrados.
--
-- SHELL: forma reproducible para el owner, PowerShell, desde la raiz del repo.
-- La salida va con -o y NUNCA con el '>' de PowerShell, que reencoda (§7.2).
--
--   $env:PGPASSWORD = "<DB_PASSWORD del .env>"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" `
--       -h localhost -p 5432 -U postgres -d mapa_navegacion `
--       -f "_bitacoras\rama_insular_simetrica_2026-08-15\16_islas_archipielago.sql" `
--       -o "_bitacoras\rama_insular_simetrica_2026-08-15\16_islas_archipielago.txt"
-- ═══════════════════════════════════════════════════════════════════════════

\pset footer off

\echo '=== 1. LA CAPA CONTRA LA QUE SE MIDE ==='
SELECT count(*) AS filas,
       round(ST_XMin(ST_Extent(geom))::numeric, 3) AS xmin,
       round(ST_XMax(ST_Extent(geom))::numeric, 3) AS xmax,
       round(ST_YMin(ST_Extent(geom))::numeric, 3) AS ymin,
       round(ST_YMax(ST_Extent(geom))::numeric, 3) AS ymax
  FROM costa_osm;

\echo ''
\echo '=== 2. PIEZAS DE TIERRA EN LA CAJA DEL ARCHIPIELAGO (-81..-78 / -34,5..-33) ==='
\echo '    La caja es de trabajo, elegida para cubrir Alejandro Selkirk (-80,79) y'
\echo '    el grupo de Robinson Crusoe (-78,85). No es del decreto.'
WITH d AS (
  SELECT (ST_Dump(ST_UnaryUnion(ST_Collect(ST_MakeValid(geom))))).geom AS g
    FROM costa_osm
   WHERE geom && ST_MakeEnvelope(-81.0, -34.5, -78.0, -33.0, 4326))
SELECT round(ST_X(ST_Centroid(g))::numeric, 4) AS lon,
       round(ST_Y(ST_Centroid(g))::numeric, 4) AS lat,
       round((ST_Area(g::geography) / 1e6)::numeric, 4) AS km2
  FROM d
 WHERE ST_Area(g::geography) / 1e6 > 0.5   -- corta los islotes de decimas de km2
 ORDER BY km2 DESC;

\echo ''
\echo '    TRES piezas por encima de 0,5 km2, no dos. La tercera —2,2356 km2 en'
\echo '    -78,9427 / -33,7065— es ISLA SANTA CLARA, al SO de Robinson Crusoe.'
\echo '    El nombre es IDENTIFICACION POR COORDENADA; lo medido son la coordenada'
\echo '    y el area.'

\echo ''
\echo '=== 3. LAS DOS QUE EL DECRETO SI NOMBRA PARA juan_fernandez ==='
WITH d AS (
  SELECT (ST_Dump(ST_UnaryUnion(ST_Collect(ST_MakeValid(geom))))).geom AS g
    FROM costa_osm
   WHERE geom && ST_MakeEnvelope(-80.5, -26.6, -79.5, -26.1, 4326))
SELECT round(ST_X(ST_Centroid(g))::numeric, 4) AS lon,
       round(ST_Y(ST_Centroid(g))::numeric, 4) AS lat,
       round((ST_Area(g::geography) / 1e6)::numeric, 4) AS km2
  FROM d
 ORDER BY km2 DESC;

\echo ''
\echo '    San Felix (-80,10) y San Ambrosio (-79,90). Nombradas las dos.'

\echo ''
\echo '=== 4. LAS DOS DE hanga_roa: FUERA DE LA CAJA CARGADA ==='
\echo '    Se mide para que la ausencia quede MEDIDA y no supuesta. costa_osm se'
\echo '    carga recortada a -85..-65 y Pascua (-109,37) y Sala y Gomez (-105,37)'
\echo '    estan afuera. Sobre ne_land, que se carga entera, ya estan medidas en'
\echo '    _bitacoras/simplify_precondicion_2026-08-15/03_caja_ancha.txt.'
SELECT count(*) AS piezas_en_costa_osm
  FROM costa_osm
 WHERE geom && ST_MakeEnvelope(-110.0, -28.0, -104.0, -26.0, 4326);
