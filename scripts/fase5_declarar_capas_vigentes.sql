-- FASE 5 — DECLARACION DEL ESTADO DE LAS CAPAS DE JURISDICCION
--
-- Motivo: en la base conviven capas que responden la misma pregunta ("¿de que
-- Capitania es este punto?") por metodos distintos y con distinta vigencia. Sin
-- declararlo, quien las encuentre no tiene como saber cual manda, y una de ellas
-- ya no corresponde a su fuente. Esto NO borra ni modifica ninguna geometria:
-- solo escribe el comentario de cada objeto, que es donde un tercero mira.
--
-- No toca el motor de reglas.

BEGIN;

COMMENT ON MATERIALIZED VIEW bahia_jurisdicciones IS
'VIGENTE EN EL MOTOR, PERO CONTRADICE INV-3.3. Es lo unico que src/routes/'
'sitport-routes.js consulta hoy para resolver jurisdiccion. Resuelve por teselado '
'Voronoi sobre puntos de bahia recortado por costa, NO por los limites del '
'D.S. 991. Registrada como bug abierto en CONTRATO_MOTOR.md seccion 7, punto 4. '
'Se reemplaza por jurisdicciones_ds991 cuando el owner autorice el cambio del '
'motor; hasta entonces sigue siendo la que responde.';

COMMENT ON TABLE jurisdicciones_decreto IS
'SUPERSEDIDA Y DESACTUALIZADA. NO CONSULTAR. Capa de la Fase 3 ter, construida '
'desde data/decreto/jurisdicciones_capitanias.json (insumo v1). Dos motivos por '
'los que no debe usarse: (1) su geometria NO corresponde a su fuente — la Etapa A '
'corrigio despues el cuarto vertice de Rio Negro Hornopiren y el limite sur de '
'Castro, y esta capa no se regenero, de modo que contradice INV-3.7; (2) su '
'metodo produce traslapes grandes entre vecinas (28.325 km2 entre Puerto Aguirre '
'y Puerto Chacabuco, medidos el 10-AGO-2026). Se conserva junto con el SQL que la '
'genero, scripts/fase3ter_capa_jurisdicciones.sql, como constancia de como se '
'construyo. Ningun archivo de src/ la consulta. La reemplaza jurisdicciones_ds991.';

COMMIT;

-- Verificacion
SELECT c.relname,
       CASE c.relkind WHEN 'r' THEN 'tabla' WHEN 'm' THEN 'vista materializada' END AS clase,
       left(obj_description(c.oid), 60) AS comentario
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('jurisdicciones_decreto', 'bahia_jurisdicciones')
ORDER BY 1;
