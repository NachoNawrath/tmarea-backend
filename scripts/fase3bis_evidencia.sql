-- FASE 3 bis — Evidencia. Solo lectura.

\echo ================================================================
\echo 1. ESTADO DE LAS GEOMETRIAS POR AMBITO
\echo ================================================================
SELECT ambito, count(*) AS total,
  count(*) FILTER (WHERE geom IS NULL)                              AS nulas,
  count(*) FILTER (WHERE geom IS NOT NULL AND ST_IsEmpty(geom))     AS vacias,
  count(*) FILTER (WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)
                     AND ST_Area(geom::geography) = 0)              AS area_cero,
  count(*) FILTER (WHERE geom IS NOT NULL AND NOT ST_IsValid(geom)) AS invalidas,
  count(*) FILTER (WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)
                     AND ST_IsValid(geom) AND ST_Area(geom::geography) > 0) AS validas
FROM jurisdicciones_decreto GROUP BY ambito ORDER BY ambito;

\echo
\echo ================================================================
\echo 2. AREA TOTAL POR AMBITO (km2)
\echo ================================================================
SELECT ambito, count(*) FILTER (WHERE geom IS NOT NULL) AS con_geom,
       round(sum(ST_Area(geom::geography))::numeric/1e6, 1) AS km2_total
FROM jurisdicciones_decreto GROUP BY ambito ORDER BY ambito;

\echo
\echo ================================================================
\echo 3. CONTEO DE NULAS POR CAUSA
\echo ================================================================
SELECT estado_geometria,
       CASE
         WHEN causa_sin_geom LIKE 'poligonal incompleta%'   THEN 'poligonal incompleta (giros no transcritos)'
         WHEN causa_sin_geom LIKE 'cadena abierta%'         THEN 'cadena abierta sin rol declarado'
         WHEN causa_sin_geom LIKE 'el decreto no entrega%'  THEN 'falta un paralelo limite'
         WHEN causa_sin_geom LIKE 'el decreto nombra islas%' THEN 'islas sin coordenadas'
         ELSE causa_sin_geom END AS causa,
       count(*) AS n
FROM jurisdicciones_decreto
WHERE geom IS NULL
GROUP BY 1, 2 ORDER BY n DESC;

\echo
\echo ================================================================
\echo 4. DETALLE DE CADA NULA
\echo ================================================================
SELECT nombre, ambito, estado_geometria, left(causa_sin_geom, 88) AS causa
FROM jurisdicciones_decreto WHERE geom IS NULL ORDER BY ambito, nombre;

\echo
\echo ================================================================
\echo 5. CRITERIO DE FALLO — sin geometria y NO declarada sin georreferenciar
\echo ================================================================
SELECT count(*) AS jurisdicciones_en_fallo
FROM jurisdicciones_decreto
WHERE (geom IS NULL OR ST_IsEmpty(geom) OR ST_Area(geom::geography) = 0)
  AND sin_georreferenciar = FALSE;

\echo
\echo ================================================================
\echo 6. TRASLAPES ENTRE JURISDICCIONES Y SU SUPERFICIE
\echo ================================================================
SELECT a.nombre AS a, a.ambito AS amb_a, b.nombre AS b, b.ambito AS amb_b,
       round((ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1e6)::numeric, 3) AS km2
FROM jurisdicciones_decreto a
JOIN jurisdicciones_decreto b ON a.id < b.id AND a.geom && b.geom
                             AND ST_Intersects(a.geom, b.geom)
WHERE a.geom IS NOT NULL AND b.geom IS NOT NULL
  AND ST_Area(ST_Intersection(a.geom, b.geom)::geography) > 0
ORDER BY km2 DESC;

\echo
\echo ================================================================
\echo 7. AREA POR JURISDICCION CONSTRUIDA, POR METODO
\echo ================================================================
SELECT metodo, nombre, ambito,
       round((ST_Area(geom::geography)/1e6)::numeric, 1) AS km2,
       ST_NPoints(geom) AS vertices
FROM jurisdicciones_decreto
WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)
ORDER BY metodo, km2 DESC;

\echo
\echo ================================================================
\echo 8. INDICES Y CAPAS ANTERIORES
\echo ================================================================
SELECT indexname FROM pg_indexes WHERE tablename='jurisdicciones_decreto' ORDER BY 1;
SELECT relname, CASE relkind WHEN 'm' THEN 'matview' WHEN 'r' THEN 'table' END AS tipo,
       pg_size_pretty(pg_total_relation_size(oid)) AS tamano
FROM pg_class WHERE relname IN ('bahia_jurisdicciones','bahia_jurisdicciones_v1_backup',
                                'jurisdicciones_decreto') ORDER BY relname;
