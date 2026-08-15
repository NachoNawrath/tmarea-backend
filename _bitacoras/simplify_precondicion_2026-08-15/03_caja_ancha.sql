-- ===========================================================================
-- 03_caja_ancha.sql - ISLA DE PASCUA Y SALA Y GOMEZ BAJO EL MISMO SIMPLIFY
-- 2026-08-15
--
-- QUE MIDE: si las dos islas que el D.S. 991 nombra para hanga_roa sobreviven
-- a ST_Simplify(0.01). Quedo declarado NO DETERMINADO en
-- _bitacoras/reclasificacion_insular_2026-08-15/ y en PLAN_JURISDICCION.md §9.
--
-- POR QUE SE PUEDE MEDIR HOY, contra lo que decia esa declaracion. §9 afirmaba
-- que "solo se puede medir con la caja ampliada de la Opcion A". Es falso, y la
-- confusion es entre dos capas distintas:
--   * costa_osm  (rol 'tierra')            se carga YA RECORTADA a -85..-65,
--                                          y ahi las dos islas no estan.
--   * ne_land    (rol 'limite_exterior')   se carga ENTERA - 11 filas,
--                                          -180..180 / -90..83,634 - y el
--                                          recorte lo hace ST_MakeEnvelope
--                                          dentro de la consulta del
--                                          constructor, no el cargador.
-- El simplify corre sobre ne_land. Cambiar el envelope de esta consulta NO
-- toca ninguna caja declarada, ninguna constante y ningun dato: es leer otra
-- ventana de una tabla que ya esta completa. La Opcion A no hace falta para
-- medir; hace falta para CONSTRUIR.
--
-- SOLO LECTURA. Todo a TEMP. No modifica capas_costa.json ni el constructor.
--
-- SHELL: ejecutado en Git Bash. Forma reproducible para el owner, PowerShell:
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 `
--       -U postgres -d mapa_navegacion -X `
--       -f _bitacoras\simplify_precondicion_2026-08-15\03_caja_ancha.sql `
--       -o _bitacoras\simplify_precondicion_2026-08-15\03_caja_ancha.txt
-- ===========================================================================

\pset border 2

-- Caja ANCHA: x_w -110 en vez de -85. Unico cambio respecto de 01 y 02.
CREATE TEMP TABLE clipA AS
SELECT ST_Union(ST_MakeValid(ST_Intersection(ST_MakeValid(l.geom),
       ST_MakeEnvelope(-110.0, -60.0, -65.0, -17.0, 4326)))) AS g
FROM ne_land l
WHERE ST_Intersects(l.geom, ST_MakeEnvelope(-110.0, -60.0, -65.0, -17.0, 4326));

CREATE TEMP TABLE simpA   AS SELECT ST_Simplify(g, 0.01) AS s FROM clipA;
CREATE TEMP TABLE piezasA AS SELECT (ST_Dump(g)).geom AS p FROM clipA;

SELECT 'ANTES'   AS etapa, ST_NumGeometries(g) AS piezas, ST_NPoints(g) AS vertices FROM clipA
UNION ALL
SELECT 'DESPUES', ST_NumGeometries(s), ST_NPoints(s) FROM simpA;

-- Las dos de hanga_roa. El filtro por longitud las aisla: no hay nada mas
-- chileno al oeste de -100.
SELECT round((ST_Area(p::geography) / 1e6)::numeric, 4) AS km2_antes,
       round((ST_Area(ST_Intersection((SELECT s FROM simpA), p)::geography)
              / 1e6)::numeric, 4)                        AS km2_despues,
       round(ST_X(ST_PointOnSurface(p))::numeric, 4)      AS lon,
       round(ST_Y(ST_PointOnSurface(p))::numeric, 4)      AS lat,
       ST_NPoints(p)                                      AS vert
FROM piezasA
WHERE ST_X(ST_PointOnSurface(p)) < -100
ORDER BY km2_antes DESC;
