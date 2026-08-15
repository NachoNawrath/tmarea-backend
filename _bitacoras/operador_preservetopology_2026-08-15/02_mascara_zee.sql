-- ===========================================================================
-- 02_mascara_zee.sql - LA MASCARA DEL LIMITE EXTERIOR, ANTES Y DESPUES
-- 2026-08-15
--
-- QUE MIDE: la union de la capa del rol 'limite_exterior' (ne_land) recortada a
-- la caja de trabajo, y la mascara ZEE que sale de bufferizarla, con los DOS
-- operadores: el de antes de esta sesion, ST_Simplify(0.01), y el de despues,
-- ST_SimplifyPreserveTopology(0.01). Misma tolerancia en los dos.
--
-- POR QUE EXISTE SI 01_variantes.sql DE simplify_precondicion_2026-08-15/ YA LO
-- MIDIO: para que el antes/despues de ESTA sesion tenga su propia medicion y no
-- descanse en la de otra. Los numeros de aquella corrida son la REFERENCIA
-- contra la que se compara, y estan transcriptos abajo. Si esta corrida no los
-- reproduce, el hallazgo es ese y la sesion para (no serian dos numeros
-- distintos: seria que la capa o la caja se movieron sin que nadie lo anotara).
--
--   REFERENCIA, de _bitacoras/simplify_precondicion_2026-08-15/01_variantes.txt
--     ST_Simplify 0.01                 168 piezas   5980 vert   6.669.307,3 km2
--     ST_SimplifyPreserveTopology 0.01 176 piezas   5950 vert   6.706.183,5 km2
--
-- REPRODUCE el pipeline de scripts/fase5_construir_capa_ds991.py:854-859
--   recorte a la caja -> ST_Union -> <operador>(0.01) -> buffer 370400 m en
--   geography -> ST_ReducePrecision(1e-8)
-- Constantes del mismo archivo: LIMITE_ZEE_M = 370400 (:114), X_W/X_E = -85/-65
-- (:115), Y_S/Y_N = -60/-17 (:116).
--
-- SOLO LECTURA. Todo a TEMP, que muere con la sesion. No toca ninguna tabla
-- persistente, ningun insumo y ninguna capa publicada.
--
-- SHELL: ejecutado en Git Bash. Forma reproducible para el owner, PowerShell:
--   $env:PGPASSWORD = "<DB_PASSWORD de .env>"
--   $env:PGCLIENTENCODING = "UTF8"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 `
--       -U postgres -d mapa_navegacion -X `
--       -f _bitacoras\operador_preservetopology_2026-08-15\02_mascara_zee.sql `
--       -o _bitacoras\operador_preservetopology_2026-08-15\02_mascara_zee.txt
-- Se usa -o y NO el '>' de PowerShell: el redirector reencoda la salida.
-- ===========================================================================

\pset border 2

CREATE TEMP TABLE clip AS
SELECT ST_Union(ST_MakeValid(ST_Intersection(ST_MakeValid(l.geom),
       ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326)))) AS g
FROM ne_land l
WHERE ST_Intersects(l.geom, ST_MakeEnvelope(-85.0, -60.0, -65.0, -17.0, 4326));

-- Piezas y vertices de la union, con cada operador.
SELECT 'ANTES  - ST_Simplify 0.01'               AS operador,
       ST_NumGeometries(ST_Simplify(g, 0.01))    AS piezas,
       ST_NPoints(ST_Simplify(g, 0.01))          AS vertices FROM clip
UNION ALL
SELECT 'DESPUES - ST_SimplifyPreserveTopology 0.01',
       ST_NumGeometries(ST_SimplifyPreserveTopology(g, 0.01)),
       ST_NPoints(ST_SimplifyPreserveTopology(g, 0.01)) FROM clip;

CREATE TEMP TABLE m_antes AS SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(
  ST_Simplify(g, 0.01)::geography, 370400)::geometry), 1e-8) AS z FROM clip;
CREATE TEMP TABLE m_desp AS SELECT ST_ReducePrecision(ST_MakeValid(ST_Buffer(
  ST_SimplifyPreserveTopology(g, 0.01)::geography, 370400)::geometry), 1e-8) AS z
  FROM clip;

SELECT 'ANTES  - ST_Simplify 0.01' AS operador,
       round((ST_Area(z::geography) / 1e6)::numeric, 1) AS mascara_km2,
       ST_NPoints(z) AS vertices FROM m_antes
UNION ALL
SELECT 'DESPUES - ST_SimplifyPreserveTopology 0.01',
       round((ST_Area(z::geography) / 1e6)::numeric, 1), ST_NPoints(z) FROM m_desp;

-- LAS DOS DIRECCIONES POR SEPARADO, NUNCA EL NETO SOLO. La resta de las areas
-- de dos mascaras esconde que el borde se movio en los dos sentidos, y eso ya
-- costo una cifra mal reportada en la sesion de la precondicion.
SELECT 'GANA  - despues menos antes' AS que,
       round((ST_Area(ST_Difference((SELECT z FROM m_desp),
              (SELECT z FROM m_antes))::geography) / 1e6)::numeric, 1) AS km2
UNION ALL
SELECT 'PIERDE - antes menos despues',
       round((ST_Area(ST_Difference((SELECT z FROM m_antes),
              (SELECT z FROM m_desp))::geography) / 1e6)::numeric, 1)
UNION ALL
SELECT 'NETO  - resta de las areas de las dos mascaras',
       round(((SELECT ST_Area(z::geography) FROM m_desp)
            - (SELECT ST_Area(z::geography) FROM m_antes))::numeric / 1e6, 1);

-- Las seis islas que el D.S. 991 enumera por nombre, bajo cada operador. Se
-- mide por AREA DE INTERSECCION y no con ST_PointOnSurface: ese test sobrecuenta
-- la supervivencia — el punto de la pieza original puede caer fuera de la pieza
-- simplificada aunque la pieza viva. Costo una cifra en la sesion anterior y
-- queda escrito aca para que el proximo no repita el atajo.
-- Las dos de hanga_roa caen FUERA de la caja de trabajo (-85..-65), asi que su
-- fila sale en cero por construccion en las dos columnas: no es que el operador
-- las borre, es que el recorte no las incluye. Se listan igual para que la
-- ausencia quede medida y no supuesta.
WITH islas(nombre, lon, lat) AS (VALUES
  ('Robinson Crusoe',   -78.8400, -33.6300),
  ('Alejandro Selkirk', -80.7600, -33.7500),
  ('San Ambrosio',      -79.8984, -26.3539),
  ('San Felix',         -80.0967, -26.2704),
  ('Isla de Pascua',   -109.3465, -27.1324),
  ('Sala y Gomez',     -105.4656, -26.4592))
SELECT i.nombre,
       round((ST_Area(ST_Intersection(ST_Simplify(c.g, 0.01),
              ST_Buffer(ST_SetSRID(ST_Point(i.lon, i.lat), 4326), 0.05)
             )::geography) / 1e6)::numeric, 4) AS km2_antes,
       round((ST_Area(ST_Intersection(ST_SimplifyPreserveTopology(c.g, 0.01),
              ST_Buffer(ST_SetSRID(ST_Point(i.lon, i.lat), 4326), 0.05)
             )::geography) / 1e6)::numeric, 4) AS km2_despues
FROM islas i, clip c ORDER BY 1;
