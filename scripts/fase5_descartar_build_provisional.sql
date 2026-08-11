-- FASE 5 — DESCARTE DEL BUILD PROVISIONAL DEL 10-AGO-2026 12:55.
--
-- POR QUE SE BORRA Y NO SE MARCA. Ya estaba marcada: fase5_marcar_build_provisional
-- le puso un COMMENT que dice "NO APTA, NO CONSULTAR". Un COMMENT no lo ve quien
-- hace un SELECT. Lo que quedaba era una tabla con el NOMBRE CANONICO de la capa
-- buena, 64 filas plausibles y una geometria que no cumple los controles de hoy: si
-- alguien la consulta, obtiene un resultado que parece bueno. Ese es el modo de
-- falla que INV-3.6 llama falso negativo silencioso, aplicado a la capa misma.
--
-- Al borrarla, el nombre canonico queda libre y cualquier consulta contra el falla
-- RUIDOSO — "relation does not exist" — en vez de devolver datos que no valen.
--
-- QUE SE PIERDE: nada que no este registrado. Era el build contra ne_land, y sus
-- mediciones estan en _bitacoras/fase5E_etapaB_construccion_2026-08-10.txt y
-- repetidas al pie de este archivo. No es reproducible: el script que la genero se
-- reescribio a las 14:18, asi que la tabla no se puede volver a obtener ni auditar
-- contra su propio generador. Un derivado que no se puede regenerar ni verificar no
-- es evidencia, es un residuo.
--
-- COMO LLEGO A EXISTIR, que es lo que hay que no repetir: la corrida de las 14:18
-- empieza con DROP TABLE IF EXISTS ... CREATE TABLE dentro de la transaccion, se
-- cayo en el RAISE de los controles, y el rollback RESTAURO esta tabla del 12:55.
-- La bitacora fase5K dedujo del rollback que no habia quedado capa. Lo que el
-- rollback hizo fue devolver la anterior. Una construccion que se cae NO deja el
-- terreno limpio: deja lo que hubiera antes.
--
-- LO QUE LA TABLA MEDIA, para el registro:
--   64 filas: maritima 44 construidas + 8 nulas declaradas, lacustre 6 construidas,
--             antartica 4 construidas, insular_remota 2 nulas declaradas
--   30 de 53 puntos representativos caian FUERA de su figura
--   13 traslapes no deliberados entre maritimas de la zona de canales
--   sin _verificacion, sin _procedencia, sin _sectores: es anterior al constructor
--   reestructurado, que crea esas tres en la misma transaccion
--
-- Uso, desde la raiz del repositorio:
--   psql -h localhost -U postgres -d mapa_navegacion -f scripts/fase5_descartar_build_provisional.sql

BEGIN;

-- Se deja constancia de que existio y de que se descarto a proposito. Esta tabla NO
-- es la capa: es una nota, y por eso lleva un nombre que no se puede confundir.
CREATE TABLE IF NOT EXISTS jurisdicciones_ds991_descartes (
  descartado_en TIMESTAMPTZ PRIMARY KEY DEFAULT now(),
  tabla TEXT NOT NULL,
  filas INT,
  motivo TEXT NOT NULL,
  evidencia TEXT NOT NULL);

INSERT INTO jurisdicciones_ds991_descartes (tabla, filas, motivo, evidencia)
SELECT 'jurisdicciones_ds991',
       (SELECT count(*) FROM jurisdicciones_ds991),
       'Build provisional del 10-AGO-2026 12:55, contra ne_land. No cumplia los '
       'controles: 30 de 53 puntos representativos fuera de su figura y 13 traslapes '
       'no deliberados. Sobrevivio al rollback de la corrida de las 14:18, que lo '
       'restauro al deshacer su propio DROP. Se borra en vez de marcarse porque '
       'ocupaba el nombre canonico de la capa buena con datos que parecen validos.',
       '_bitacoras/fase5E_etapaB_construccion_2026-08-10.txt y '
       '_bitacoras/fase5L_etapa1_2026-08-10.txt seccion 0.1'
WHERE to_regclass('public.jurisdicciones_ds991') IS NOT NULL;

DROP TABLE IF EXISTS jurisdicciones_ds991_sectores;
DROP TABLE IF EXISTS jurisdicciones_ds991_verificacion;
DROP TABLE IF EXISTS jurisdicciones_ds991_procedencia;
DROP TABLE IF EXISTS jurisdicciones_ds991_convenciones;
DROP TABLE IF EXISTS jurisdicciones_ds991;

-- El control de este script: despues de correr, el nombre canonico tiene que estar
-- LIBRE. Si algo lo dejo en pie, se detiene en vez de informar exito.
DO $$
BEGIN
  IF to_regclass('public.jurisdicciones_ds991') IS NOT NULL THEN
    RAISE EXCEPTION 'jurisdicciones_ds991 sigue existiendo despues del descarte';
  END IF;
END $$;

COMMIT;

SELECT descartado_en, tabla, filas FROM jurisdicciones_ds991_descartes ORDER BY 1;
