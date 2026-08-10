-- FASE 3 — Evidencia de la capa construida.
-- Solo lectura. Se corre despues de scripts/fase3_capa_jurisdicciones.sql.

\echo ================================================================
\echo 1. ESTADO DE LAS GEOMETRIAS POR AMBITO
\echo ================================================================
SELECT
  ambito,
  count(*)                                                      AS total,
  count(*) FILTER (WHERE geom IS NULL)                          AS nulas,
  count(*) FILTER (WHERE geom IS NOT NULL AND ST_IsEmpty(geom)) AS vacias,
  count(*) FILTER (WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)
                     AND ST_Area(geom::geography) = 0)          AS area_cero,
  count(*) FILTER (WHERE geom IS NOT NULL AND NOT ST_IsValid(geom)) AS invalidas,
  count(*) FILTER (WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)
                     AND ST_IsValid(geom)
                     AND ST_Area(geom::geography) > 0)          AS validas
FROM jurisdicciones_decreto
GROUP BY ambito ORDER BY ambito;

\echo
\echo ================================================================
\echo 2. AREA TOTAL POR AMBITO (km2)
\echo ================================================================
SELECT
  ambito,
  count(*) FILTER (WHERE geom IS NOT NULL)             AS con_geom,
  round(sum(ST_Area(geom::geography))::numeric/1e6, 1) AS km2_total
FROM jurisdicciones_decreto
GROUP BY ambito ORDER BY ambito;

\echo
\echo ================================================================
\echo 3. CRITERIO DE FALLO — area cero o vacia NO declarada sin georreferenciar
\echo    (toda fila aqui es un fallo de la fase, no un resultado)
\echo ================================================================
SELECT id, nombre, ambito, estado_geometria, sin_georreferenciar,
       CASE WHEN geom IS NULL THEN 'NULA'
            WHEN ST_IsEmpty(geom) THEN 'VACIA'
            ELSE 'AREA CERO' END AS condicion
FROM jurisdicciones_decreto
WHERE (geom IS NULL OR ST_IsEmpty(geom) OR ST_Area(geom::geography) = 0)
  AND sin_georreferenciar = FALSE
ORDER BY ambito, nombre;

\echo
\echo ================================================================
\echo 4. SIN GEOMETRIA DECLARADAS (esperadas, no son fallo)
\echo ================================================================
SELECT id, nombre, ambito, estado_geometria
FROM jurisdicciones_decreto
WHERE sin_georreferenciar = TRUE ORDER BY nombre;

\echo
\echo ================================================================
\echo 5. TRASLAPES ENTRE JURISDICCIONES Y SU SUPERFICIE
\echo ================================================================
SELECT a.id AS id_a, a.nombre AS nombre_a, a.ambito AS ambito_a,
       b.id AS id_b, b.nombre AS nombre_b, b.ambito AS ambito_b,
       round((ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1e6)::numeric, 3) AS km2_traslape
FROM jurisdicciones_decreto a
JOIN jurisdicciones_decreto b
  ON a.id < b.id AND a.geom && b.geom AND ST_Intersects(a.geom, b.geom)
WHERE a.geom IS NOT NULL AND b.geom IS NOT NULL
  AND ST_Area(ST_Intersection(a.geom, b.geom)::geography) > 0
ORDER BY km2_traslape DESC;

\echo
\echo ================================================================
\echo 6. AREA POR JURISDICCION CONSTRUIDA (km2), por metodo
\echo ================================================================
SELECT metodo, id, nombre, ambito,
       round((ST_Area(geom::geography)/1e6)::numeric, 1) AS km2,
       ST_NPoints(geom) AS vertices
FROM jurisdicciones_decreto
WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)
ORDER BY metodo, km2 DESC;

\echo
\echo ================================================================
\echo 7. INDICES DE LA CAPA
\echo ================================================================
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'jurisdicciones_decreto' ORDER BY indexname;

\echo
\echo ================================================================
\echo 8. LA CAPA ANTERIOR SE CONSERVA
\echo ================================================================
SELECT relname, CASE relkind WHEN 'm' THEN 'matview' WHEN 'r' THEN 'table' END AS tipo,
       pg_size_pretty(pg_total_relation_size(oid)) AS tamano
FROM pg_class
WHERE relname IN ('bahia_jurisdicciones','bahia_jurisdicciones_v1_backup',
                  'jurisdicciones_decreto')
ORDER BY relname;
