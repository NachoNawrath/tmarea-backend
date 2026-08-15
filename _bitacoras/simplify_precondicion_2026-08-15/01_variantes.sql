-- ===========================================================================
-- 01_variantes.sql - PRECONDICION DEL FRENTE DE ALCANCE COSTA-AFUERA
-- 2026-08-15
--
-- QUE MIDE: las cuatro variantes de simplificacion de la union de la capa del
-- rol 'limite_exterior' (ne_land), con piezas, vertices y area de la mascara
-- ZEE resultante. La tolerancia de hoy es ST_Simplify(geom, 0.01).
--
-- REPRODUCE el pipeline EXACTO de scripts/fase5_construir_capa_ds991.py:854-859
--   recorte a la caja -> ST_Union -> ST_Simplify(0.01) -> buffer 370400 m en
--   geography -> ST_ReducePrecision(1e-8)
-- Las constantes salen de ese mismo archivo:
--   LIMITE_ZEE_M = 370400   (:114)
--   X_W, X_E     = -85, -65 (:115)
--   Y_S, Y_N     = -60, -17 (:116)
--
-- SOLO LECTURA. No crea ni modifica ninguna tabla persistente: todo va a TEMP,
-- que muere con la sesion. No toca jurisdicciones_v2.json, ni el constructor,
-- ni capas_costa.json, ni la capa publicada.
--
-- SHELL: ejecutado en Git Bash. Forma reproducible para el owner, PowerShell:
--   $env:PGPASSWORD = "<DB_PASSWORD de .env>"
--   $env:PGCLIENTENCODING = "UTF8"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 `
--       -U postgres -d mapa_navegacion -X `
--       -f _bitacoras\simplify_precondicion_2026-08-15\01_variantes.sql `
--       -o _bitacoras\simplify_precondicion_2026-08-15\01_variantes.txt
-- Se usa -o y NO el '>' de PowerShell: el redirector reencoda la salida.
-- Los tiempos de \timing salen por consola, no al archivo de -o; van
-- transcriptos en la bitacora declarando de donde salieron.
-- ===========================================================================

\timing on
\pset border 2

CREATE TEMP TABLE clip AS
SELECT ST_Union(ST_MakeValid(ST_Intersection(ST_MakeValid(l.geom),
       ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326)))) AS g
FROM ne_land l
WHERE ST_Intersects(l.geom, ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326));

-- ne_land NO esta recortada en la carga: el recorte lo hace esta consulta.
-- Se deja medido aca porque es lo que habilito medir Sala y Gomez (03) sin
-- tocar la caja de trabajo ni la Opcion A de hanga_roa.
SELECT 'ne_land (tabla cruda)' AS que,
       count(*)::text AS filas,
       round(ST_XMin(ST_Extent(geom))::numeric, 3)::text || ' / ' ||
       round(ST_XMax(ST_Extent(geom))::numeric, 3)::text AS lon,
       round(ST_YMin(ST_Extent(geom))::numeric, 3)::text || ' / ' ||
       round(ST_YMax(ST_Extent(geom))::numeric, 3)::text AS lat
FROM ne_land;

-- Piezas y vertices de cada variante, sobre la union ya recortada.
SELECT 'A. sin simplify'                  AS variante,
       ST_NumGeometries(g)                AS piezas,
       ST_NPoints(g)                      AS vertices FROM clip
UNION ALL SELECT 'B. ST_Simplify 0.01 (HOY)',
       ST_NumGeometries(ST_Simplify(g, 0.01)),
       ST_NPoints(ST_Simplify(g, 0.01)) FROM clip
UNION ALL SELECT 'C. ST_Simplify 0.001',
       ST_NumGeometries(ST_Simplify(g, 0.001)),
       ST_NPoints(ST_Simplify(g, 0.001)) FROM clip
UNION ALL SELECT 'D. ST_SimplifyPreserveTopology 0.01',
       ST_NumGeometries(ST_SimplifyPreserveTopology(g, 0.01)),
       ST_NPoints(ST_SimplifyPreserveTopology(g, 0.01)) FROM clip;

-- Las cuatro mascaras ZEE. Cada CREATE lleva su propio \timing: ese es el
-- costo real del buffer, que es lo unico que el simplify existe para abaratar.
CREATE TEMP TABLE m_sin AS SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(
  g::geography, 370400)::geometry), 1e-8) AS z FROM clip;

CREATE TEMP TABLE m_hoy AS SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(
  ST_Simplify(g, 0.01)::geography, 370400)::geometry), 1e-8) AS z FROM clip;

CREATE TEMP TABLE m_001 AS SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(
  ST_Simplify(g, 0.001)::geography, 370400)::geometry), 1e-8) AS z FROM clip;

CREATE TEMP TABLE m_spt AS SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(
  ST_SimplifyPreserveTopology(g, 0.01)::geography, 370400)::geometry), 1e-8) AS z FROM clip;

SELECT 'A. sin simplify' AS variante,
       round((ST_Area(z::geography) / 1e6)::numeric, 1) AS mascara_km2,
       ST_NPoints(z) AS vertices FROM m_sin
UNION ALL SELECT 'B. ST_Simplify 0.01 (HOY)',
       round((ST_Area(z::geography) / 1e6)::numeric, 1), ST_NPoints(z) FROM m_hoy
UNION ALL SELECT 'C. ST_Simplify 0.001',
       round((ST_Area(z::geography) / 1e6)::numeric, 1), ST_NPoints(z) FROM m_001
UNION ALL SELECT 'D. ST_SimplifyPreserveTopology 0.01',
       round((ST_Area(z::geography) / 1e6)::numeric, 1), ST_NPoints(z) FROM m_spt;

-- Isla San Felix bajo la variante que preserva anillos. El decreto la nombra.
SELECT 'San Felix bajo ST_SimplifyPreserveTopology' AS que,
       round((ST_Area(ST_Intersection(ST_SimplifyPreserveTopology(g, 0.01),
              ST_Buffer(ST_SetSRID(ST_Point(-80.0967, -26.2704), 4326), 0.05)
             )::geography) / 1e6)::numeric, 4) AS km2
FROM clip;
