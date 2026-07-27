# Handoff — Fase 2 (raster-router-service.js)

Interrumpido para asegurar el estado antes de quedarse sin contexto. Este documento existe para que la próxima sesión no tenga que re-descubrir nada de lo ya investigado hoy.

## Estado actual (actualizado tras cerrar la regresión)

**Regresión de Anahuac→Chacabuco: RESUELTA.** Causa raíz: el salto directo al fallback cuando el fino fallaba por `sin_camino` (`if (res.motivo === 'sin_camino') break;` en `runHierarchicalAstar`). Revertido según spec v1.9 §7.2 — dilatar el corredor no solo ensancha un paso, puede incorporar una ruta alternativa completa; las tres iteraciones de dilatación (3/6/12km) deben agotarse siempre. Confirmado: Anahuac→Chacabuco (dMinM=50) vuelve a 1.12–1.17s en 3 corridas consecutivas.

**Nuevo hallazgo bloqueante — tramo austral, no la salida de Puerto Montt:**

Al probar las 4 rutas del corredor real a dMinM=200/perfil PNM (§7.1), Puerto Montt→Chacabuco falla (`ruta_no_convergente`). Se aisló la variable con 5 corridas (Puerto Montt real —punto detrás de Canal Tenglo, no Anahuac— y Anahuac, cada uno a varios dMinM, mismo destino Chacabuco):

| Origen → Destino | dMinM | Resultado | Tiempo |
|---|---|---|---|
| Puerto Montt → Chacabuco | 50 | OK | 1.48s |
| Puerto Montt → Chacabuco | 80 | OK | 1.31s |
| Puerto Montt → Chacabuco | 150 | **FALLA** | 6.29s |
| Puerto Montt → Chacabuco | 200 | **FALLA** | 5.41s |
| Anahuac → Chacabuco | 200 | **FALLA** | 5.18s |

Anahuac también falla a 200 (no es un problema exclusivo de la salida de Puerto Montt/Tenglo), y el umbral de falla está entre dMinM=80 y dMinM=150 — es decir, **bloqueante**: dMinM=150 es calado 2,5–4,0m, el rango de barcazas salmoneras y transporte que hacen ese trayecto todos los días.

**Herramienta permanente para este tipo de caso:** `tools/detectar-chokepoints.js` (ver sección propia más abajo). Corrida para Puerto Montt→Chacabuco a dMinM=150 y dMinM=200 — devuelve los tramos exactos donde el margen real cae por debajo del objetivo, con coordenadas para identificar el canal. **No se investigó más allá del listado ni se agregó ninguna zona** — queda pendiente decidir, canal por canal, cuáles son pasos reales a declarar `canal_conocido`/`canal_acceso_derivado` y cuáles son estrechamientos donde el modelo tiene razón.

## Herramienta: `tools/detectar-chokepoints.js`

Para cualquier ruta que no converge a un `dMinM` objetivo pero sí converge a `dMinM=50` (el margen más laxo): corre el A* jerárquico completo a dMinM=50 (converge por definición, es el mínimo de la tabla de `perfiles-costo.js`), recorre esa ruta de referencia sobre el `.bin` fino, y lista los tramos contiguos donde el margen real (`d`, distancia a costa) cae por debajo del `dMinM` objetivo pedido. Duplica la lógica de `runHierarchicalAstar` de `raster-router-service.js` a propósito (no depende de sus exports) para seguir funcionando aunque el router cambie de forma.

```
node tools/detectar-chokepoints.js --origen=LAT,LON --destino=LAT,LON --dmin=150 [--tile=AUSTRAL_N]
```

Por cada chokepoint reporta: coordenadas WGS84 del centro, largo del tramo en metros, margen mínimo a la orilla (el `d` más chico dentro del tramo), un ancho estimado (`2 × margen mínimo`, asumiendo que la ruta corre centrada en el canal — es una aproximación, no una medición perpendicular real), si la celda más angosta cae dentro de una zona relajada (bit 15 del `.bin`, ground truth de `zonas-dragadas.json` ya rasterizado) y qué zonas de `zonas-dragadas.json` tienen el buffer lo bastante cerca como para candidatas (chequeo geométrico independiente del bit 15, informativo).

**Uso previsto:** cualquier caso futuro de "esta ruta no converge a tal margen y no sé por qué" — corridas contra dMinM=50 y compara. No agrega ni corrige nada, es solo diagnóstico.

### Resultado: Puerto Montt→Chacabuco a dMinM=150 (13 chokepoints)

Origen usado: `-41.46985128159208,-72.91715797729832` (2km detrás del extremo Anahuac/PM del trazado de Canal Tenglo — lado interior, no Anahuac). Destino: `-45.462,-72.807`.

| # | centro (lat, lon) | largo (m) | margen mín (m) | ancho est (m) | zona relajada | zonas_dragadas cercanas |
|---|---|---|---|---|---|---|
| 1 | -41.475671, -72.923714 | 141 | 50 | 100 | sí | Puerto Montt (centro/bahía interior), 1284m |
| 2 | -41.705142, -73.002712 | 200 | 100 | 200 | no | ninguna |
| 3 | -41.869497, -72.896225 | 141 | 140 | 280 | sí | Embarcadero Rampa Isla Queullin, 696m |
| 4 | -41.973258, -72.810777 | 0 | 140 | 280 | no | ninguna |
| 5 | -42.505961, -72.812758 | 212 | 140 | 280 | sí | Embarcadero Rampa Chumelden, 515m |
| 6 | -42.507736, -72.816432 | 141 | 140 | 280 | sí | Embarcadero Rampa Chumelden, 791m |
| 7 | -44.03345, -73.144713 | 0 | 140 | 280 | no | ninguna |
| 8 | -44.063856, -73.208354 | 0 | 140 | 280 | no | ninguna |
| 9 | -45.236393, -73.513241 | 0 | 140 | 280 | no | ninguna |
| 10 | -45.426587, -72.829304 | 391 | 50 | 100 | no | ninguna |
| 11 | -45.432138, -72.808291 | 71 | 140 | 280 | no | ninguna |
| 12 | -45.44301, -72.798217 | 483 | 100 | 200 | no | ninguna |
| 13 | -45.45823, -72.809943 | 121 | 50 | 100 | sí | Chacabuco, 464m |

### Resultado: Puerto Montt→Chacabuco a dMinM=200 (76 chokepoints)

Mismo origen/destino. La lista completa a 200m incluye los 13 de arriba (umbral más laxo) más 63 tramos adicionales, mayormente en tres zonas geográficas: cerca de la salida de Puerto Montt (lat -41.58 a -41.97, ~10 tramos), en el tramo -42.2 a -43.5 (canales interiores camino a Chiloé/Golfo Corcovado, ~20 tramos, casi ninguno con zona relajada cercana), y agrupados cerca de la llegada a Chacabuco/Puerto Aguirre (lat -45.1 a -45.46, ~15 tramos). La salida completa de la corrida (76 registros con coordenadas, largo, margen, ancho estimado y zonas cercanas) quedó en la transcripción de la sesión — se puede volver a generar en segundos con:

```
node tools/detectar-chokepoints.js --origen=-41.46985128159208,-72.91715797729832 --destino=-45.462,-72.807 --dmin=200
```

**Resumen de las 4 rutas del corredor a dMinM=200/perfil PNM (§7.1): 3 de 4 pasan.** Puerto Montt→Chacabuco es la única que falla, y falla desde dMinM=150, no solo desde 200 (ver tabla arriba) — es decir, el límite bloqueante está más cerca de lo que el test original a 200 hacía parecer.

### Conclusión: el margen mínimo escalado por calado está mal fundamentado

De los 13 chokepoints a dMinM=150, 8 fallan por exactamente 10 metros (margen real 140m contra un objetivo de 150m). Eso no es ruido de medición — es que el objetivo de 150m no tiene respaldo.

**Evidencia:** la Angostura Inglesa tiene 185m de ancho útil documentado y por ahí pasan, según DIRECTEMAR, naves de hasta 10,7m de calado. Exigir 300m de canal libre (2× margen para una nave de calado bajo, si el criterio actual escala linealmente) a una nave de 3m de calado es indefendible frente a ese dato real.

**El número de reemplazo no se define por criterio propio — se calibra con datos del derrotero.** Es exactamente el propósito de `pasos.csv` en la extracción del Derrotero SHOA (ver sección siguiente): cada paso documentado trae ancho útil real y, en algunos casos, calado máximo verificado, que reemplaza la fórmula actual por un límite ya validado en la práctica de navegación.

## Derrotero SHOA — extracción de datos (tarea paralela, independiente de esta regresión)

**Etapa A (reconocimiento) completa.** Esquema y patrones confirmados en `docs/extraccion-derrotero-shoa.md` v1.1: tres formatos de coordenadas conviviendo en el mismo tomo (grados-minutos enteros, grados-minutos con coma decimal, grados-minutos-segundos con coma decimal en segundos), símbolo de grado inconsistente (`º`/`°`), sondas siempre en metros sin brazas, anchos en cables/millas, números de línea sueltos como ruido principal a filtrar, página física del PDF vs. numeración oficial del derrotero, y la Lista de Faros (características lumínicas) no está en este tomo.

Seis datasets definidos: `pasos.csv`, `peligros.csv`, `sondas_canal.csv`, `ayudas.csv` (obligatorios) más `corrientes.csv` y `areas.csv` (oportunistas, de tablas ya estructuradas que `extract_tables()` levanta limpias).

**Esperando Etapa B** (los cuatro extractores). `pasos.csv` es el dataset que directamente calibra el margen mínimo escalado por calado mencionado arriba.

## Estado de commits

- **HEAD = `12992ed`** — `wip: fase 2 con regresion en Anahuac-Chacabuco, ver docs/handoff-fase2.md`. Contiene TODO el trabajo de Fase 2 de hoy, incluida la regresión sin resolver. Se commiteó a propósito roto, por instrucción explícita del usuario, para no perder trabajo.
- `2b211ba` — `feat: pipeline de build del raster de ruteo (Fase 1)`. **Verificado y bueno.** Tile `AUSTRAL_N` (106.819.740 celdas), sin zonas de margen relajado (`kml_bit` siempre 0). Si hace falta un punto de partida limpio para descartar todo lo de Fase 2, es este.
- `ef5e500`, `824950b`, etc. — sesiones anteriores, motor viejo (`nautical-graph-router.js`), no relacionado.

El tile en disco (`C:\tmarea-data\tiles\AUSTRAL_N.bin`, fuera del repo) fue reconstruido por última vez con las 288 zonas que coinciden con `src/config/zonas-dragadas.json` tal como está commiteado en HEAD — el tile en disco y el HEAD del repo son consistentes entre sí ahora mismo.

## Último estado bueno dentro de Fase 2 (no tiene commit propio — hay que reconstruirlo)

En algún punto de hoy, después de implementar la jerarquía de A* de 3 niveles con arrays tipados (`astar-bbox.js`, `typed-heap.js`, `multi-level.js`) y **antes** de tocar nada de `snap.js`, la optimización de "saltar dilatación" o `zonas-dragadas.json`, se verificó:

```
Anahuac -> Chacabuco, calado=1.2m (dMinM=50): 1.13-1.14s, 3 corridas consecutivas, sin OOM
warmup(): 119-153ms
```

Ese código SÍ está en HEAD (nunca se revirtió), pero el **comportamiento** se rompió por cambios posteriores dentro del mismo commit. Para reconstruir ese estado exacto desde HEAD:

1. `src/services/raster/snap.js`: revertir `snapToNavigable` para que tome `dMinM` numérico directo (no `perfilCosto` completo), sin la relajación por bit 15. (Este cambio arregló un bug real de coherencia snap/A* — probablemente NO es la causa, pero está sin descartar.)
2. `src/services/raster-router-service.js`: en `runHierarchicalAstar`, quitar el `if (res.motivo === 'sin_camino') break;` de la pasada medio→fino (buscar el comentario "spec §7.2: si el fino falla por 'sin_camino'").
3. `src/config/zonas-dragadas.json`: reemplazar por `[]` y reconstruir el tile (`cd tools/raster-build && ./.venv/Scripts/python.exe build_tile.py --tile AUSTRAL_N`).
4. `src/services/raster/cost-lut.js`: en `buildCoarseCostLUT`, revertir a usar `dMinM` real del perfil en vez de la constante `DMIN_GRUESO_INVARIANTE = 50` (ver diff en la Prueba B más abajo).

## La regresión

**Síntoma:** `calcularRuta(perfilCosto({calado_m:1.2}), Anahuac, Chacabuco)` (dMinM=50) devuelve `{ok:false, motivo:'ruta_no_convergente'}` en ~2.6–3.5s. Antes daba `{ok:true}` en 1.13–1.14s.

**Confirmado reproducible en proceso Node aislado** (no es contaminación de estado entre llamadas de un mismo script — se corrió una sola llamada en un proceso nuevo y falló igual).

## Bisect hecho (2 pruebas, instrucción explícita de no analizar más allá de esto)

**Prueba A** — tile reconstruido con `zonas-dragadas.json = []` (0 zonas) + `cost-lut.js` tal como está en HEAD (con `DMIN_GRUESO_INVARIANTE = 50`):
```
FALLA, motivo=ruta_no_convergente, ~2.6s
```

**Prueba B** — tile con las 288 zonas de HEAD + `cost-lut.js` con `buildCoarseCostLUT` revertido a usar `dMinM` real del perfil (no el invariante fijo):
```
FALLA, motivo=ruta_no_convergente, ~2.6s
```

**Conclusión: ninguno de los dos cambios explica la regresión por sí solo.** Después de la Prueba B se restauró `cost-lut.js` a su versión de HEAD (`git diff` confirma cero diferencias) y se restauró `zonas-dragadas.json` a las 288 zonas, y se reconstruyó el tile una vez más para dejarlo consistente con HEAD. **El repo y el tile en disco quedaron en el mismo estado que HEAD, no en el estado de la Prueba A o B.**

### Candidatos no descartados (no se testearon aislados, por instrucción explícita de parar)

1. El cambio de `snapToNavigable` (firma + lógica `dMinEfectivo` con bit 15).
2. El salto de dilatación (`if (res.motivo === 'sin_camino') break;`) — sospecha principal: ahora que la LUT gruesa es más permisiva (Prueba A/B ya lo aíslan como no-causa-única, pero en combinación con esto sí podría cortar una dilatación que a un radio mayor habría conectado).
3. Interacción entre ambos.

**Prueba que probablemente aísla la causa real y no se llegó a hacer:** repetir con `zonas-dragadas.json=[]` Y `cost-lut.js` revertido AL MISMO TIEMPO (las dos reversiones juntas, no una por vez). Si esa combinación pasa, la causa es la interacción entre el invariante de LUT y algo del corredor. Si sigue fallando, la causa es `snap.js` o el salto de dilatación, no la LUT ni las zonas.

## Archivos tocados hoy (todos ya en HEAD `12992ed`)

- `src/services/raster-router-service.js` (nuevo) — orquestador principal, `warmup()`/`calcularRuta()`
- `src/services/raster/tile-loader.js` (nuevo) — carga `.bin`/`.coarse.bin`/`.meta.json`, deriva nivel grueso
- `src/services/raster/multi-level.js` (nuevo) — dilatación, bitmap de corredor, derivación de grueso
- `src/services/raster/astar-bbox.js` (nuevo) — A* con arrays tipados dimensionados al bbox del corredor
- `src/services/raster/typed-heap.js` (nuevo) — binary heap sobre `Int32Array`
- `src/services/raster/cost-lut.js` (nuevo) — LUT de costo fina y gruesa (con el invariante `DMIN_GRUESO_INVARIANTE`)
- `src/services/raster/snap.js` (nuevo) — snap-to-navigable, coherente con la LUT (bug real corregido hoy)
- `src/services/raster/string-pull.js` (nuevo) — simplificación de camino a waypoints
- `src/config/perfiles-costo.js` (nuevo) — tabla de calado, `MAX_EXPANSIONES_ASTAR`
- `src/config/zonas-dragadas.json` (nuevo, generado) — 288 zonas (277 `area_portuaria`, 1 `canal_conocido`, 10 `canal_acceso_derivado`)
- `tools/raster-build/generar_zonas_dragadas.py` (nuevo) — genera las 277 zonas `area_portuaria`
- `tools/raster-build/build_tile.py` (modificado) — rasteriza `zonas-dragadas.json` en el bit 15
- `tools/raster-build/banded_edt.py` (modificado) — acepta `zona_relajada` opcional
- `derivar-zonas-canal.js` (nuevo, raíz del repo) — deriva `canal_conocido`/`canal_acceso_derivado` con BFS a resolución FINA (ver hallazgo crítico abajo)
- `test-tenglo.js`, `test-sanidad-puertos.js`, `test-raster-router-casos.js`, `test-raster-router-smoke.js` (nuevos, raíz) — scripts de prueba manuales
- `package.json`/`package-lock.json` — se agregó `proj4` como dependencia

## Hallazgos que NO hay que redescubrir

1. **`proj4` da resultados idénticos a `pyproj`** para la proyección TM custom del spec — verificado byte a byte contra un punto de control. Usar `proj4('EPSG:4326', crs_proj4, [lon,lat])`.

2. **`Map`/`Set` no escalan para el A* fino.** Un intento con estado disperso (`Map` para gScore/cameFrom) agotó el heap de V8 (>1.7GB) sin converger en Anahuac→Chacabuco. La solución correcta (ya implementada) es dimensionar arrays tipados al **bounding box del corredor**, no al tile completo — memoria acotada y predecible incluso para el caso "sin restricción" (bbox = tile completo, ~1.3GB, denso y por lo tanto seguro, a diferencia de `Map`).

3. **Jerarquía de 3 niveles, no 2.** Grueso (factor 32, ~1600m) → medio (factor 8, ~400m) → fino (factor 1, 50m). El nivel grueso se deriva en Node desde `medio.bin` vía un max-pool adicional de factor 4 — matemáticamente idéntico a max-poolear desde fino directamente.

4. **Invariante de monotonía (spec §7.2):** un nivel agregado nunca puede ser más restrictivo que el fino. `buildCoarseCostLUT` debe usar `dMinM=50` (el mínimo absoluto) SIEMPRE, sin importar el perfil real — porque `medio.bin`/`grueso.bin` no llevan el bit 15 (zona relajada/KML), así que si la LUT gruesa usara el `dMinM` real, un canal relajado a 50m quedaría excluido del corredor antes de que el A* fino (que sí ve el bit 15) tuviera oportunidad de usarlo. **Este cambio, aislado, NO explica la regresión actual** (ver bisect arriba) pero sigue siendo conceptualmente correcto y no hay que revertirlo sin una razón nueva.

5. **`snapToNavigable` debe usar el mismo criterio `dMinEfectivo` que `buildCostLUT`** (incluyendo el bit 15), no `dMinM` crudo. Bug real, encontrado y corregido — antes el snap podía aceptar o rechazar una celda con un criterio distinto al que después aplicaba el A*, causando fallos "sin motivo aparente".

6. **`medio.bin`/`grueso.bin` NO tienen bit de zona relajada** (solo distancia cruda, por diseño del pipeline — spec dijo "max-pooling SOLO del campo distancia"). Esto es la causa real de que Puyuhuapi/Apiao siguieran fallando con el router de producción aunque un test de sanidad "consciente de zonas" (implementado a mano en JS, fuera del router) diera 100%. La corrección es el invariante del punto 4, NO cambiar el formato del `.bin` (evaluado y descartado por indicación explícita del usuario).

7. **CRÍTICO — un BFS/derivación de caminos a nivel MEDIO produce geometría inválida.** La primera versión de `derivar-zonas-canal.js` derivaba el camino de acceso usando el CENTRO de cada celda media (400m) como vértice del polígono a bufferizar. Resultado: **69 de 176 puntos del camino derivado para Puyuhuapi caían literalmente en TIERRA** a resolución fina. Causa: el max-pooling que hace "navegable" una celda media puede estar en cualquier esquina del bloque de 8×8 celdas finas, no necesariamente en el centro. **Corrección aplicada y verificada:** derivar el camino con BFS a RESOLUCIÓN FINA (el mismo `.bin` que usa el A*, arrays tipados `Uint8Array`/`Int32Array` reutilizados entre llamadas en vez de `Map`, no reasignados cada vez — reutilizar buffers y limpiar solo las celdas tocadas). Los 10 caminos derivados así dieron **0 huecos en tierra**, verificado explícitamente. **Cualquier trabajo futuro de derivación automática de geometría DEBE ser a resolución fina, nunca a medio/grueso.**

8. **Clasificación costero vs. lacustre/fluvial interior:** un puerto que no alcanza mar abierto (celda con distancia > 5000m) ni con `dMinM=50` (el margen más laxo posible) está genuinamente desconectado del océano en la máscara de agua actual — es lacustre/fluvial interior (correcto, coincide con el test 8 del spec: los water polygons de OSM son solo océano) **o** tiene una discontinuidad real en la máscara. No usar una lista a mano — se deriva de los datos.

9. **Valdivia (ciudad) no es una discontinuidad de datos — es que los ríos no están en la máscara.** Los water polygons de OSM son SOLO océano; el tramo Corral→Valdivia por el río Calle-Calle (~15 mn río arriba) simplemente no existe como agua en la máscara actual. El usuario agregó la fuente 8 al spec (§4): riberas fluviales vía Overpass (`natural=water` + `water=river`, más `waterway=riverbank`), a unir a la máscara en el paso 2 del pipeline, ANTES de rasterizar. Filtrar por navegabilidad no hace falta — un río de 20m de ancho no pasa ni con `dMinM=50`, la geometría lo descarta sola. **Esto no se implementó todavía** (pendiente, requiere Overpass + rebuild).

10. **10 zonas `canal_acceso_derivado` derivadas y verificadas (0 huecos en tierra) para:** Rampa de Fleteros de Angelmo, Rampa Las Papas - Sector Angelmo, Embarcadero Rampa Añihue, Embarcadero Rampa Isla Apiao Sector Ostricultura, Embarcadero Muelle de Puyuhuapi, Embarcadero Muelle Fiscal de Puyuhuapi, Embarcadero Conectividad Rio Exploradores, Rampa Hoffman, Borde Costero de Ichuac, Embarcadero Rampa De Puyuhuapi. Verificado con el router real tras el fix del invariante de LUT: **Apiao→Quellón pasa (54.27mn, 127ms)**. Puyuhuapi→Chacabuco seguía fallando al momento de la interrupción — no se determinó si es la regresión general o algo específico de esa ruta larga, dado que la regresión general (Anahuac→Chacabuco) apareció en paralelo y hay que resolverla primero.

11. **Canal Tenglo, criterio de test corregido (spec v1.6+):** NO se espera que el canal se cierre a calados altos — Tenglo se navega con calado de 3m en la práctica, así que si el modelo lo cerraba, ESE era el bug (ya corregido por las zonas de margen relajado). El criterio correcto es: la ruta debe mantenerse a menos de 150m del eje del canal para TODOS los calados de la tabla de §6.1.

12. **La derivación automática de `canal_acceso_derivado` requiere que exista un camino al margen MÁS LAXO (dMinM=50).** Si un puerto no alcanza mar abierto ni a 50m, no hay nada que derivar — es un problema de máscara (ver punto 9), no de margen.

## Próximos pasos sugeridos (en orden)

1. ~~Encontrar la causa real de la regresión~~ — **hecho**, ver "Estado actual" arriba.
2. Revisar, canal por canal, los chokepoints de dMinM=150/200 listados arriba (coordenadas ya generadas). Para cada uno: ¿es un paso real que se navega en la práctica (→ declarar `canal_conocido`/`canal_acceso_derivado` en `zonas-dragadas.json`) o un estrechamiento genuino donde el modelo tiene razón en cerrar? Esto es decisión del usuario, no automatizable.
3. Una vez resueltos los chokepoints bloqueantes, confirmar Puyuhuapi→Chacabuco y re-correr el test de rendimiento original (Anahuac→Chacabuco dMinM=50, meta <1.5s) — ya en 1.12-1.17s, sigue cumpliendo.
4. Overpass de riberas fluviales (fuente 8, §4) + rebuild, para resolver Valdivia.
5. Re-correr el test de sanidad completo (meta: 100% de puertos costeros a dMinM=200, incluyendo Valdivia).
6. Re-correr el test de Tenglo con el criterio corregido (punto 11).
7. Recién ahí: medir el daño del buffer portuario de 2km y considerar bajarlo a 800m (spec §7.1, secuencia de calibración) — no se llegó a esto.
