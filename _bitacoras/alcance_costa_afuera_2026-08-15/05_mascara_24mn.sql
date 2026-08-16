-- ============================================================================
-- LA MASCARA DE 24 mn: `ne_land` GRUESA CONTRA `costa_osm` FINA
--
-- Por que existe esta medicion. La mascara de 200 mn se bufferiza sobre el rol
-- `limite_exterior` (`ne_land`, 1:10m) y el constructor declara por que eso esta
-- bien: "el error de una costa 1:10m son cientos de metros, CUATRO ORDENES por
-- debajo de las 200 millas". A 24 mn (44.448 m) ese argumento pasa de cuatro
-- ordenes a DOS, y el error de la costa gruesa deja de ser despreciable contra
-- el borde que define. Elegir capa es del owner (CLAUDE.md 0.4: mueve el borde
-- que el patron ve), asi que aca se mide y no se elige.
--
-- SE MIDE SOBRE LA BANDA DE `arica` porque es el unico cliente con alcance
-- declarado hoy. Banda: 19 13 00 S (-19.216667, decreto) a 18 21 00 S (-18.35,
-- convencion del owner, D16). Margen de 0,6 grados = 66,8 km > 44,448 km del
-- buffer, para que ningun trozo de costa de afuera de la banda que alcance a
-- entrar quede sin bufferizar.
--
-- LO QUE SE MIDE, Y POR QUE NO ALCANZA CON LA RESTA. La resta de areas de dos
-- mascaras da el NETO y esconde que el borde se movio en los dos sentidos. Se
-- imprimen las TRES: lo que la fina tiene y la gruesa no, lo que la gruesa tiene
-- y la fina no, y recien despues el neto.
--
-- SHELL: se genero y se corrio con psql -f (CLAUDE.md 7.1: SQL largo a archivo).
-- Forma reproducible, PowerShell, desde la raiz del repositorio:
--   $env:PGPASSWORD = "<la del .env>"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 `
--       -U postgres -d mapa_navegacion `
--       -f "_bitacoras\alcance_costa_afuera_2026-08-15\05_mascara_24mn.sql" `
--       -o "_bitacoras\alcance_costa_afuera_2026-08-15\05_mascara_24mn.txt"
-- ============================================================================

-- CORRECCION DE INSTRUMENTO, 2026-08-15 (CLAUDE.md 3.3: se agrega, no se
-- reescribe). LA PRIMERA VERSION DE ESTE ARCHIVO NO TERMINO. Bufferizaba en
-- `geography` la union de las 2.664 piezas de `costa_osm` de la banda (86.688
-- vertices) y se corto sin dar resultado; la de `ne_land`, que son 1 pieza y 105
-- vertices, habia salido enseguida. El buffer en `geography` recalcula un
-- elipsoide por vertice y ahi es donde se va el tiempo.
--
-- SE CAMBIA EL INSTRUMENTO, NO LA PREGUNTA: el buffer pasa a EPSG:32719 (UTM 19S)
-- y las AREAS se siguen midiendo en `geography`, que es como las mide el
-- constructor. Por que 32719 no falsea el resultado: la mascara vive entre
-- 070,0 W y 071,0 W —el meridiano central de la zona 19S es 069 W— y a 24 mn de
-- la costa la distorsion de escala de UTM en ese rango es del orden de 1e-4, o
-- sea METROS sobre 44.448. Es dos ordenes por debajo de la diferencia que esta
-- medicion busca. Se declara y no se esconde: el numero que sale de aca es
-- comparativo entre las DOS capas, que es la pregunta, y no el borde definitivo
-- de ninguna figura.
--
-- Y lleva statement_timeout: un control que se cuelga no se distingue de uno que
-- no muerde.
SET statement_timeout = '25min';

\timing on
\pset footer off

-- Parametros, escritos una vez. 44448 m = 24 mn; el mismo numero que la
-- convencion de `arica` declara en el v1.
\set alcance 44448
\set sur   -19.216667
\set norte -18.35
\set margen 0.6
\set xw -85.0
\set xe -65.0

-- ── La caja de trabajo de la banda, con margen ──────────────────────────────
DROP TABLE IF EXISTS _caja_arica;
CREATE TEMP TABLE _caja_arica AS
SELECT ST_MakeEnvelope(:xw, :sur - :margen, :xe, :norte + :margen, 4326) AS g,
       ST_MakeEnvelope(:xw, :sur,           :xe, :norte,           4326) AS banda;

\echo ''
\echo '=== 0. LAS DOS CAPAS, EN LA CAJA DE LA BANDA ==============================='

SELECT 'ne_land'   AS capa, count(*) AS piezas,
       sum(ST_NPoints(ST_Intersection(ST_MakeValid(l.geom), c.g))) AS vertices
  FROM ne_land l, _caja_arica c WHERE ST_Intersects(l.geom, c.g)
UNION ALL
SELECT 'costa_osm', count(*),
       sum(ST_NPoints(ST_Intersection(ST_MakeValid(l.geom), c.g)))
  FROM costa_osm l, _caja_arica c WHERE ST_Intersects(l.geom, c.g);

\echo ''
\echo '=== 1. MASCARA DE 24 mn SOBRE `ne_land` (la capa que usa el limite exterior) ='

DROP TABLE IF EXISTS _m_gruesa;
CREATE TEMP TABLE _m_gruesa AS
SELECT ST_ReducePrecision(ST_MakeValid(ST_Transform(ST_Buffer(
         ST_Transform(ST_Union(ST_MakeValid(ST_Intersection(
           ST_MakeValid(l.geom), c.g))), 32719),
         :alcance), 4326)), 1e-8) AS geom
  FROM ne_land l, _caja_arica c
 WHERE ST_Intersects(l.geom, c.g);

\echo ''
\echo '=== 2. MASCARA DE 24 mn SOBRE `costa_osm` (el rol tierra, la fina) =========='

DROP TABLE IF EXISTS _m_fina;
CREATE TEMP TABLE _m_fina AS
SELECT ST_ReducePrecision(ST_MakeValid(ST_Transform(ST_Buffer(
         ST_Transform(ST_Union(ST_MakeValid(ST_Intersection(
           ST_MakeValid(l.geom), c.g))), 32719),
         :alcance), 4326)), 1e-8) AS geom
  FROM costa_osm l, _caja_arica c
 WHERE ST_Intersects(l.geom, c.g);

\echo ''
\echo '=== 3. LO QUE MIDE CADA UNA DENTRO DE LA BANDA DE `arica` =================='
\echo '    La figura de `arica` es la banda MENOS la tierra; lo que se compara aca'
\echo '    es el BORDE EXTERIOR que cada mascara pone, no la figura final.'

SELECT 'banda entera (sin alcance, hasta X_W)' AS que,
       round((ST_Area(c.banda::geography)/1e6)::numeric, 1) AS km2
  FROM _caja_arica c
UNION ALL
SELECT 'mascara 24 mn sobre ne_land   (∩ banda)',
       round((ST_Area(ST_Intersection(g.geom, c.banda)::geography)/1e6)::numeric, 1)
  FROM _m_gruesa g, _caja_arica c
UNION ALL
SELECT 'mascara 24 mn sobre costa_osm (∩ banda)',
       round((ST_Area(ST_Intersection(f.geom, c.banda)::geography)/1e6)::numeric, 1)
  FROM _m_fina f, _caja_arica c;

\echo ''
\echo '=== 4. EL BORDE SE MUEVE EN LOS DOS SENTIDOS — las tres cifras, no el neto =='

SELECT 'la fina TIENE y la gruesa NO' AS que,
       round((ST_Area(ST_Intersection(
         ST_Difference(f.geom, g.geom), c.banda)::geography)/1e6)::numeric, 1) AS km2
  FROM _m_fina f, _m_gruesa g, _caja_arica c
UNION ALL
SELECT 'la gruesa TIENE y la fina NO',
       round((ST_Area(ST_Intersection(
         ST_Difference(g.geom, f.geom), c.banda)::geography)/1e6)::numeric, 1)
  FROM _m_fina f, _m_gruesa g, _caja_arica c
UNION ALL
SELECT 'NETO (fina - gruesa) — el que ESCONDE lo de arriba',
       round(((ST_Area(ST_Intersection(f.geom, c.banda)::geography)
             - ST_Area(ST_Intersection(g.geom, c.banda)::geography))/1e6)::numeric, 1)
  FROM _m_fina f, _m_gruesa g, _caja_arica c;

\echo ''
\echo '=== 5. CUANTO SE APARTAN LOS DOS BORDES, EN METROS =========================='
\echo '    Distancia de Hausdorff entre los dos contornos dentro de la banda: la'
\echo '    peor separacion, que es la que decide si la capa gruesa alcanza.'

SELECT round(ST_MaxDistance(
         ST_Intersection(ST_Boundary(g.geom), c.banda),
         ST_Intersection(ST_Boundary(f.geom), c.banda))::numeric, 6)
         AS grados_maxdistance,
       round((ST_HausdorffDistance(
         ST_Intersection(ST_Boundary(g.geom), c.banda),
         ST_Intersection(ST_Boundary(f.geom), c.banda)) * 111320)::numeric, 1)
         AS hausdorff_m_aprox
  FROM _m_gruesa g, _m_fina f, _caja_arica c;

\echo ''
\echo '=== 6. LO QUE LA MASCARA DEL DEFAULT NO CAMBIA =============================='
\echo '    Control de que esta medicion NO toca la mascara de 200 mn: se mide la'
\echo '    de 200 mn sobre ne_land, que es la vigente, para tenerla al lado.'

SELECT round((ST_Area(ST_Intersection(z.geom, c.banda)::geography)/1e6)::numeric, 1)
         AS km2_mascara_200mn_en_la_banda
  FROM (SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(
          ST_SimplifyPreserveTopology(ST_Union(ST_MakeValid(ST_Intersection(
            ST_MakeValid(l.geom),
            ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326)))), 0.01)::geography,
          370400)::geometry), 1e-8) AS geom
          FROM ne_land l
         WHERE ST_Intersects(l.geom,
               ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326))) z,
       _caja_arica c;
