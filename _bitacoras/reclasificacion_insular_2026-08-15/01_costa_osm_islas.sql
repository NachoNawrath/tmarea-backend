-- 01 — ¿ESTÁN LAS SEIS ISLAS EN LA CAPA OSM *CARGADA*?
--
-- SOLO LECTURA. No escribe nada.
--
-- QUÉ MIDE, y qué no. Mide la tabla `costa_osm`, que es la que el constructor y
-- el corrector de testigos leen. NO mide el zip de 925 MB
-- (`geodata/costa/land-polygons-split-4326.zip`), que es otra afirmación: el
-- barrido del 2026-08-14 midió el zip y encontró las seis. El cargador recorta a
-- la caja declarada en `geodata/costa/capas_costa.json` (`recorte`), así que
-- "está en la capa" y "está en la capa cargada" no son lo mismo — y la segunda es
-- la que gobierna la construcción.
--
-- Reproducible (PowerShell, desde la raíz del repositorio):
--   $env:PGPASSWORD = "<la de .env>"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost `
--       -d mapa_navegacion -f _bitacoras\reclasificacion_insular_2026-08-15\01_costa_osm_islas.sql
--
-- Las coordenadas de las seis salen del barrido del 2026-08-14/15
-- (`_bitacoras/no_cerrables_2026-08-15/02_canales_y_islas.txt` y `03_...txt`), no
-- de esta corrida.
\pset border 2

SELECT 'costa_osm' AS tabla, count(*) AS filas,
       round(ST_XMin(ST_Extent(geom))::numeric,3) AS xmin,
       round(ST_XMax(ST_Extent(geom))::numeric,3) AS xmax,
       round(ST_YMin(ST_Extent(geom))::numeric,3) AS ymin,
       round(ST_YMax(ST_Extent(geom))::numeric,3) AS ymax
  FROM costa_osm;

WITH isla(jurisdiccion, nombre, lon, lat) AS (
  VALUES ('hanga_roa',      'Isla de Pascua',    -109.37,  -27.11),
         ('hanga_roa',      'Isla Sala y Gomez', -105.365, -26.472),
         ('juan_fernandez', 'San Felix',          -80.098, -26.272),
         ('juan_fernandez', 'San Ambrosio',       -79.903, -26.355),
         ('juan_fernandez', 'Robinson Crusoe',    -78.868, -33.624),
         ('juan_fernandez', 'Alejandro Selkirk',  -80.738, -33.733))
SELECT i.jurisdiccion, i.nombre, i.lon, i.lat,
       -- la caja del manifiesto: x_w -85, y_s -60, x_e -65, y_n -17
       (i.lon BETWEEN -85 AND -65 AND i.lat BETWEEN -60 AND -17) AS dentro_de_la_caja,
       (SELECT count(*) FROM costa_osm c
         WHERE c.geom && ST_Expand(ST_SetSRID(ST_MakePoint(i.lon,i.lat),4326), 0.25))
         AS poligonos_en_costa_osm
  FROM isla i
 ORDER BY i.jurisdiccion, i.nombre;
