-- E0.2 reconocimiento — cobertura de la capa vigente, jurisdiccion por jurisdiccion.
-- Se corre con:  psql -U postgres -d mapa_navegacion -f <este archivo>
SET statement_timeout='600s';

SELECT '02a. Celda de las dos bahias lacustres de interes, respecto de su propio punto' AS bloque;
SELECT b.bahia_id, b.nombre,
       round((ST_Area(j.geom::geography) / 1000000.0)::numeric, 2) AS km2_celda,
       ST_Contains(j.geom, b.geom)                                 AS punto_dentro_de_su_celda,
       round(ST_Distance(b.geom::geography, j.geom::geography)::numeric, 0) AS dist_punto_a_su_celda_m
  FROM bahias_sitport b
  JOIN bahia_jurisdicciones j USING (bahia_id)
 WHERE b.bahia_id IN (96, 142)
 ORDER BY 1;

SELECT '02b. Cobertura de la capa vigente sobre CADA jurisdiccion lacustre del decreto' AS bloque;
WITH lac AS (SELECT id, geom FROM jurisdicciones_decreto WHERE ambito = 'lacustre'  AND geom IS NOT NULL),
     vig AS (SELECT ST_Union(geom) g FROM bahia_jurisdicciones WHERE NOT ST_IsEmpty(geom))
SELECT l.id,
       round((ST_Area(l.geom::geography) / 1000000.0)::numeric, 2) AS km2,
       round((ST_Area(ST_Intersection(l.geom, v.g)::geography) / 1000000.0)::numeric, 4) AS km2_cubierto,
       round(ST_Distance(l.geom::geography, v.g::geography)::numeric, 0) AS dist_a_cobertura_m
  FROM lac l CROSS JOIN vig v
 ORDER BY 1;

SELECT '02c. Idem para el ambito antartico' AS bloque;
WITH ant AS (SELECT id, geom FROM jurisdicciones_decreto WHERE ambito = 'antartica' AND geom IS NOT NULL),
     vig AS (SELECT ST_Union(geom) g FROM bahia_jurisdicciones WHERE NOT ST_IsEmpty(geom))
SELECT a.id,
       round((ST_Area(a.geom::geography) / 1000000.0)::numeric, 2) AS km2,
       round((ST_Area(ST_Intersection(a.geom, v.g)::geography) / 1000000.0)::numeric, 4) AS km2_cubierto,
       round(ST_Distance(a.geom::geography, v.g::geography)::numeric, 0) AS dist_a_cobertura_m
  FROM ant a CROSS JOIN vig v
 ORDER BY 1;
