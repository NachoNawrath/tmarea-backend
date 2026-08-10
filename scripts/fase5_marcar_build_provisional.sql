-- FASE 5, ETAPA B — Marca del build provisional del 10-AGO-2026.
-- La construccion corrio entera pero NO cumple dos criterios de la etapa. Se deja
-- declarado en la tabla misma para que no queden capas sin saber cual manda.

COMMENT ON TABLE jurisdicciones_ds991 IS
'CONSTRUCCION PROVISIONAL. NO APTA, NO CONSULTAR. Build del 10-AGO-2026 que NO '
'cumple dos de los criterios de la Etapa B: (1) 13 traslapes no deliberados entre '
'jurisdicciones maritimas de la zona de canales, todos en pares que no declaran '
'frontera compartida en el insumo; (2) 30 de 53 puntos representativos caen fuera '
'de su figura, porque ne_land (Natural Earth 1:10m) dibuja como tierra las bahias '
'y los puertos fluviales. Se conserva solo como evidencia medida. La capa que el '
'motor consulta sigue siendo bahia_jurisdicciones hasta nuevo aviso. Evidencia en '
'_bitacoras/fase5E_etapaB_construccion_2026-08-10.txt';

SELECT left(obj_description('public.jurisdicciones_ds991'::regclass), 60) AS marca;
