-- ===========================================================================
-- 02_piezas_borradas.sql - QUE PIEZAS BORRA EL SIMPLIFY, EN LA CAJA VIGENTE
-- 2026-08-15
--
-- QUE MIDE: pieza por pieza de la union recortada, cuanta area le queda
-- despues de ST_Simplify(0.01). Separa DESAPARECE (0,0000) de SE ACHICA.
-- Y mide donde cae el corte: la sobreviviente mas chica.
--
-- POR QUE POR AREA DE INTERSECCION Y NO POR ST_PointOnSurface: el test por
-- punto sobrecuenta. ST_PointOnSurface de la pieza ORIGINAL puede caer fuera
-- de la pieza simplificada aunque la pieza sobreviva; con ese test San Ambrosio
-- salia como borrada y no lo esta - se achica de 1,5117 a 0,7429 km2, que es
-- lo que ya habia medido _bitacoras/reclasificacion_insular_2026-08-15/. El
-- criterio que contesta la pregunta es el area que queda, no si un punto
-- particular sigue adentro. Queda escrito porque el primer instrumento estuvo
-- mal y CLAUDE.md §2 pide que la medicion pruebe lo que la afirmacion dice.
--
-- SOLO LECTURA. Todo a TEMP.
--
-- SHELL: ejecutado en Git Bash. Forma reproducible para el owner, PowerShell:
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 `
--       -U postgres -d mapa_navegacion -X `
--       -f _bitacoras\simplify_precondicion_2026-08-15\02_piezas_borradas.sql `
--       -o _bitacoras\simplify_precondicion_2026-08-15\02_piezas_borradas.txt
-- ===========================================================================

\pset border 2

CREATE TEMP TABLE clip AS
SELECT ST_Union(ST_MakeValid(ST_Intersection(ST_MakeValid(l.geom),
       ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326)))) AS g
FROM ne_land l
WHERE ST_Intersects(l.geom, ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326));

CREATE TEMP TABLE simp   AS SELECT ST_Simplify(g, 0.01) AS s FROM clip;
CREATE TEMP TABLE piezas AS SELECT (ST_Dump(g)).geom AS p FROM clip;

-- Las chicas: todo lo que la simplificacion puede llegar a borrar entero.
-- El umbral de 3 km2 es de PRESENTACION, no de criterio: acota el listado.
-- La consulta siguiente prueba que no esconde nada, midiendo la mas chica que
-- sobrevive (5,6316 km2), muy por encima del corte.
SELECT round((ST_Area(p::geography) / 1e6)::numeric, 4) AS km2_antes,
       round((ST_Area(ST_Intersection((SELECT s FROM simp), p)::geography)
              / 1e6)::numeric, 4)                       AS km2_despues,
       round(ST_X(ST_PointOnSurface(p))::numeric, 4)     AS lon,
       round(ST_Y(ST_PointOnSurface(p))::numeric, 4)     AS lat,
       ST_NPoints(p)                                     AS vert
FROM piezas
WHERE ST_Area(p::geography) / 1e6 < 3.0
ORDER BY km2_antes DESC;

-- Donde cae el corte: las 12 mas chicas que SI sobreviven. Es lo que dice si
-- un arreglo condicional por tamano tendria un umbral defendible o inventado.
SELECT round((ST_Area(p::geography) / 1e6)::numeric, 4) AS km2_sobrevive,
       round(ST_X(ST_PointOnSurface(p))::numeric, 4)     AS lon,
       round(ST_Y(ST_PointOnSurface(p))::numeric, 4)     AS lat,
       ST_NPoints(p)                                     AS vert
FROM piezas
WHERE ST_Area(ST_Intersection((SELECT s FROM simp), p)::geography) > 0
ORDER BY ST_Area(p::geography) ASC
LIMIT 12;
