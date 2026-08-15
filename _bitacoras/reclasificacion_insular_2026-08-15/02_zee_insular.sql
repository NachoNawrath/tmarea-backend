-- 02 — ¿DE QUIÉN ES HOY EL MAR DE JUAN FERNÁNDEZ?
--
-- SOLO LECTURA. Crea tablas TEMP (mueren con la sesión) y no toca ninguna tabla
-- del esquema. No escribe nada en disco.
--
-- QUÉ MIDE. Cuánta agua de la capa marítima CONSTRUIDA existe únicamente porque
-- las cuatro islas de `juan_fernandez` están dentro de la caja de trabajo y por
-- lo tanto dentro del buffer de 200 mn del límite exterior. Reproduce el pipeline
-- del constructor (`scripts/fase5_construir_capa_ds991.py`, bloque `_zee`):
--   recorte a la caja -> ST_Union -> ST_Simplify(0,01) -> ST_Buffer(::geography, 370400)
-- y lo parte en dos por el centroide de cada pieza: insulares al W de -77, resto.
-- Después resta el buffer continental, para quedarse SOLO con el agua que ninguna
-- costa del continente alcanza con 200 mn.
--
-- CONTRA QUÉ CAPA. `jurisdicciones_decreto` — el andamio, 52 marítimas de las
-- cuales 44 con geometría. NO es `jurisdicciones_ds991`, que hoy sólo trae las 6
-- lacustres porque el gate por ámbito (D3) retiró el resto. El andamio está
-- marcado SUPERSEDIDO en `capa_consultada.json` y es la única geometría marítima
-- construida que hay en la base: por eso se mide ahí, y por eso el número es del
-- build anterior, no de uno nuevo.
--
-- QUÉ NO MIDE. No dice de quién DEBE ser esa agua. Eso es el Art. 2 del D.S. 991
-- y es del owner.
--
-- El corte en -77 no es una convención escondida: las islas están entre -80,84 y
-- -78,76 y la costa continental más occidental de la caja está al Este de -77 en
-- toda la latitud donde caen. La consulta imprime las piezas para que el corte se
-- pueda auditar.
--
-- OJO CON EL CONTEO, y por eso la auditoría del corte va primero: las islas de
-- `juan_fernandez` son CUATRO y este buffer se arma con TRES. La cuarta —Isla San
-- Félix, 0,939 km²— la borra el `ST_Simplify(0,01)` que este mismo pipeline
-- aplica antes de bufferizar (medido en `03_simplify_islas.sql`). O sea que el
-- número de abajo es un PISO: con San Félix adentro, la ZEE que existe sólo por
-- las islas sería mayor, no menor. Decir "las cuatro islas" acá sería afirmar
-- algo que la medición no midió.
--
-- Reproducible (PowerShell, desde la raíz del repositorio):
--   $env:PGPASSWORD = "<la de .env>"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost `
--       -d mapa_navegacion -f _bitacoras\reclasificacion_insular_2026-08-15\02_zee_insular.sql
\pset border 2

CREATE TEMP TABLE _piezas AS
WITH recorte AS (
  SELECT ST_MakeValid(ST_Intersection(ST_MakeValid(l.geom),
           ST_MakeEnvelope(-85.0,-60.0,-65.0,-17.0,4326))) AS g
  FROM ne_land l
  WHERE ST_Intersects(l.geom, ST_MakeEnvelope(-85.0,-60.0,-65.0,-17.0,4326))
), u AS (SELECT ST_Union(g) AS g FROM recorte),
   s AS (SELECT ST_Simplify(g, 0.01) AS g FROM u)
SELECT d.geom, ST_X(ST_Centroid(d.geom)) < -77 AS es_isla
  FROM ST_Dump((SELECT g FROM s)) d;

-- auditoría del corte: qué piezas quedaron de cada lado
SELECT es_isla, count(*) AS piezas,
       round(min(ST_X(ST_Centroid(geom)))::numeric,3) AS lon_min_centroide,
       round(max(ST_X(ST_Centroid(geom)))::numeric,3) AS lon_max_centroide
  FROM _piezas GROUP BY es_isla ORDER BY 1;

CREATE TEMP TABLE _zee AS
SELECT es_isla,
       ST_ReducePrecision(ST_MakeValid(
         ST_Buffer(ST_Union(geom)::geography, 370400)::geometry), 1e-8) AS g
  FROM _piezas GROUP BY es_isla;

SELECT es_isla, round((ST_Area(g::geography)/1e6)::numeric,1) AS km2_del_buffer
  FROM _zee ORDER BY 1;

CREATE TEMP TABLE _solo_isla AS
SELECT ST_Difference((SELECT g FROM _zee WHERE es_isla),
                     (SELECT g FROM _zee WHERE NOT es_isla)) AS g;

SELECT 'ZEE que SOLO existe por las islas de juan_fernandez que sobreviven al simplify (3 de 4)' AS q,
       round((ST_Area(g::geography)/1e6)::numeric,1) AS km2 FROM _solo_isla;

SELECT j.nombre, j.ambito, j.estado_geometria,
       round((ST_Area(ST_Intersection(j.geom, s.g)::geography)/1e6)::numeric,1) AS km2_insular,
       round((ST_Area(j.geom::geography)/1e6)::numeric,1) AS km2_totales,
       round((100*ST_Area(ST_Intersection(j.geom, s.g)::geography)
              / ST_Area(j.geom::geography))::numeric,1) AS pct
  FROM jurisdicciones_decreto j, _solo_isla s
 WHERE j.geom IS NOT NULL AND ST_Intersects(j.geom, s.g)
   AND ST_Area(ST_Intersection(j.geom, s.g)::geography) > 1e6   -- umbral técnico: 1 km²
 ORDER BY 4 DESC;

SELECT 'TOTAL adjudicado a Capitanias continentales' AS q, count(*) AS jurisdicciones,
       round((sum(ST_Area(ST_Intersection(j.geom, s.g)::geography))/1e6)::numeric,1) AS km2
  FROM jurisdicciones_decreto j, _solo_isla s
 WHERE j.geom IS NOT NULL AND ST_Intersects(j.geom, s.g)
   AND ST_Area(ST_Intersection(j.geom, s.g)::geography) > 1e6;
