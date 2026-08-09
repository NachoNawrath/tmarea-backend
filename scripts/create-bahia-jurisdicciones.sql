-- bahia_jurisdicciones: polígonos Voronoi recortados por costa Y por buffer de distancia.
--
-- Doble recorte:
--   1. ST_Difference contra tierra (ne_land) → respeta topología costera (fiordos OK)
--   2. ST_Intersection con ST_Buffer(80km) del punto de la bahía → acota extensión
--      en mar abierto (elimina falsos positivos a cientos de km)
--
-- El parámetro buffer_distancia_m (80000 = 80 km) es el único valor a ajustar.
-- ST_Buffer se aplica sobre geography para que los metros sean reales.
--
-- Requiere: bahias_sitport (puntos), ne_land (polígonos de tierra).

DROP MATERIALIZED VIEW IF EXISTS bahia_jurisdicciones;

CREATE MATERIALIZED VIEW bahia_jurisdicciones AS
WITH
  buffer_distancia_m AS (SELECT 80000 AS val),
  bbox AS (
    SELECT ST_MakeEnvelope(-82, -60, -64, -17, 4326) AS geom
  ),
  puntos AS (
    SELECT ST_Collect(geom) AS geom FROM bahias_sitport
  ),
  voronoi_raw AS (
    SELECT (ST_Dump(ST_VoronoiPolygons(puntos.geom, 0::float, bbox.geom))).geom AS geom
    FROM puntos, bbox
  ),
  voronoi_asignado AS (
    SELECT b.bahia_id, b.nombre, b.geom AS punto_geom,
           ST_Intersection(v.geom, bbox.geom) AS geom
    FROM voronoi_raw v
    JOIN bahias_sitport b ON ST_Contains(v.geom, b.geom)
    CROSS JOIN bbox
  ),
  tierra_chile AS (
    SELECT ST_Union(ST_Intersection(l.geom, bbox.geom)) AS geom
    FROM ne_land l, bbox
    WHERE ST_Intersects(l.geom, bbox.geom)
  )
SELECT
  va.bahia_id,
  va.nombre,
  ST_Intersection(
    COALESCE(ST_Difference(va.geom, tc.geom), va.geom),
    ST_Buffer(va.punto_geom::geography, bd.val)::geometry
  ) AS geom
FROM voronoi_asignado va
CROSS JOIN tierra_chile tc
CROSS JOIN buffer_distancia_m bd;

CREATE INDEX idx_bahia_jurisdicciones_geom
  ON bahia_jurisdicciones USING GIST(geom);
