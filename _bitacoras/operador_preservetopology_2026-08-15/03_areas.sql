-- ===========================================================================
-- 03_areas.sql - EL AREA DE CADA JURISDICCION, TAL COMO LA DEJO EL BUILD
-- 2026-08-15
--
-- QUE MIDE: vuelca jurisdicciones_ds991_areas, la tabla de constancia que el
-- constructor emite ANTES del gate por ambito. Es el unico lugar del que se
-- puede leer el km2 de una jurisdiccion RETENIDA: el gate borra de la capa los
-- ambitos que no publica (D3), _publicacion guarda la cuenta y no el area, y
-- _ensanche solo mira las que tienen tramo litoral — hoy tres de cuarenta y
-- cuatro.
--
-- ESTE MISMO ARCHIVO SE CORRE DOS VECES, con -o distinto, para tener el antes y
-- el despues del cambio de operador del limite exterior:
--     03_areas_antes.txt      build con ST_Simplify(0.01)
--     03_areas_despues.txt    build con ST_SimplifyPreserveTopology(0.01)
-- La comparacion se arma despues desde los dos .txt (ver 05).
--
-- SOLO LECTURA.
--
-- SHELL: ejecutado en Git Bash. Forma reproducible para el owner, PowerShell:
--   $env:PGPASSWORD = "<DB_PASSWORD de .env>"
--   $env:PGCLIENTENCODING = "UTF8"
--   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 `
--       -U postgres -d mapa_navegacion -X `
--       -f _bitacoras\operador_preservetopology_2026-08-15\03_areas.sql `
--       -o _bitacoras\operador_preservetopology_2026-08-15\03_areas_antes.txt
-- Se usa -o y NO el '>' de PowerShell: el redirector reencoda la salida.
-- ===========================================================================

\pset border 2

-- Una fila con km2 nulo es una nula_declarada de INV-3.6, no un error: son las
-- diez que el insumo trae como no_cerrable, y se listan para que el conteo
-- 54/10 se pueda leer aca mismo y no haya que buscarlo en otro lado.
SELECT ambito, estado_geometria, count(*) AS n,
       round(sum(km2), 1) AS km2_total
FROM jurisdicciones_ds991_areas
GROUP BY ambito, estado_geometria
ORDER BY 1, 2;

SELECT nombre, ambito, km2, vertices, piezas
FROM jurisdicciones_ds991_areas
WHERE estado_geometria = 'construida'
ORDER BY ambito, km2 DESC NULLS LAST;

SELECT nombre, ambito
FROM jurisdicciones_ds991_areas
WHERE estado_geometria = 'nula_declarada'
ORDER BY ambito, nombre;
