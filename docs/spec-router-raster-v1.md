# Tmarea — Especificación técnica: Motor de ruteo raster nacional

**Versión:** 1.9 — revierte el salto de dilatación (causó regresión); geometría siempre a resolución fina
**Destinatario:** Claude Code
**Repositorios:** `NachoNawrath/tmarea-backend` (motor, §2–14) y `NachoNawrath/tmarea-pwa` (integración, §15)
**Reemplaza:** `corridor-router-service.js`, `nautical-graph-router.js`, `osm-router-service.js`, `coastline-guard.js`

---

## 0. Por qué se reescribe el motor

El router actual enruta sobre un **grafo de líneas** (ways OSM + 14 canales KML) y después intenta corregir los cruces de tierra con un guardia post-hoc (`coastline-guard.js`). Esa arquitectura no converge: cada corrección resuelve un cruce y aparece otro más adelante. El último ciclo pasó de 3 a 2 cruces sin resolver con 62 s de warmup.

**No se debe continuar por esa vía.** El enfoque correcto, y el que usan todas las apps náuticas de referencia, es enrutar sobre una **máscara de agua rasterizada**: la ruta no puede cruzar tierra porque el grafo *es* el agua.

**No hay que densificar los KML.** Esa tarea queda cancelada — era trabajo manual sin fin para un problema que el raster resuelve por construcción.

---

## 1. Cadena lógica de la app (contexto obligatorio)

El router es **un eslabón**, no el punto de partida. El flujo completo es:

```
1. Tipo de licencia del patrón          (registro / P1)
2. → qué naves está habilitado a pilotar (cruce licencia × nave)
3. Descripción de la embarcación         (P1: eslora, manga, calado, TRG/AB, tipo)
4. → tipo de navegación a realizar       (P2: origen, destino, duración)
5. → cotejo normativo (licencia + nave)  ← BLOQUEANTE
6. → trazado de ruta                     ← ESTE DOCUMENTO
7. → consejos de navegación segura
```

Consecuencia de diseño: **el router no recibe "el tipo de licencia". Recibe un perfil de navegación ya resuelto** por el paso 5. Si el paso 5 determina que la licencia no habilita a pilotar esa nave, **el router no traza nada** — no tiene sentido dibujar una ruta correcta para una combinación ilegal.

Ver contrato en §6.

---

## 2. Definiciones vigentes (no reintroducir valores antiguos)

| Concepto | Valor vigente | Fuente |
|---|---|---|
| Nave menor | AB < 100 / menos de 100 TRG | Circular DIRECTEMAR O-72/023 |
| Alcance de la app | **Solo naves menores** | Decisión de producto |
| Licencias en el selector | **PNM** (comercial) + **PLDB, PDB, CDC, CDAM** (deportivas) | Se eliminan: Patrón de Nave Mayor, Capitán de Nave, "Otra" |
| PLDB / PDB — límite | Aguas protegidas, límite fijado por la Autoridad Marítima local. **Sin valor nacional** | TM-002 Art. 14 a, b |
| CDC — límite | **60 MN de costa** (el 12 está derogado) | TM-002 Art. 14 c |
| CDAM — límite | Sin restricción | TM-002 Art. 14 d |
| Clasificación de nave | ALTA_MAR / COSTERA_60 / COSTERA_12 / BAHIA_VELA / BAHIA_MOTOR | Circular A-41/014 |
| Umbral viento costera | 26 kt | Circular DGTM A-41/013 |

> ⚠️ Valores obsoletos que aparecen en el código o en documentos antiguos y **no deben usarse**: `CDC_MAX_COAST_NM = 12` (el vigente es 60), `PDB_MAX_DISTANCE_NM = 2` (sin respaldo normativo), "25 TRG", "100 AB" como equivalente directo de TRG, y "4 MN de bahía" (reglamento derogado de 2004).

**Art. 45 / pilotaje obligatorio queda fuera de alcance.** Las reglas R1 y R2 de `tmarea_rutas_australes.json` aplican a naves mayores y comerciales. La R4 del mismo archivo establece que para embarcaciones menores las rutas son *"ruta de referencia de seguridad"*, sin obligación de práctico. El router opera **siempre** en modo A* libre con perfil de costo. No se implementa modo "selector de ruta autorizada".

---

## 3. Sistema de referencia y tiles

### 3.1 CRS único nacional

Un solo Transverse Mercator con meridiano central en −72°, para todo Chile, sin costuras entre tiles:

```
+proj=tmerc +lat_0=0 +lon_0=-72 +k=0.9996 +x_0=500000 +y_0=10000000 +datum=WGS84 +units=m
```

La costa chilena real va de −76° a −67° (−4° a +5° del meridiano central). Distorsión de escala máxima **0,16%** — despreciable para todos los cálculos de esta app.

Todos los tiles son **sub-ventanas del mismo grid global**. No hay reproyección al cruzar de un tile a otro.

### 3.2 Tiles

| ID | bbox WGS84 (lon / lat) | Resolución | Celdas aprox. | Uint16 |
|---|---|---|---|---|
| `NORTE` | −75,0 a −69,5 / −40,0 a −17,5 | 100 m | ~28 M | ~56 MB |
| `AUSTRAL_N` | −75,6 a −71,9 / −47,0 a **−39,5** | 50 m | ~103 M | ~206 MB |
| `AUSTRAL_S` | −76,5 a −66,8 / −56,2 a −47,0 | 50 m | ~270 M | ~540 MB |

> ⚠️ **Las cifras de celdas son estimaciones, no parámetros.** El pipeline **debe calcular** `origin_x`, `origin_y`, `cols` y `rows` proyectando el bbox WGS84 al CRS de §3.1 y alineando a múltiplo de `res_m`. Nunca leerlos de una constante. Los valores del ejemplo en §5.3 son ilustrativos del **formato**, no de los parámetros reales.

El pipeline reporta las dimensiones calculadas al terminar cada tile, y esas son las que valen.

**Por qué `AUSTRAL_N` llega hasta −39,5 y no hasta −41,5:** la primera versión de este documento cortaba en −41,5, lo que dejaba **Puerto Montt (−41,47), Canal Tenglo y Corral (−39,87) fuera del tile** — es decir, fuera justamente la zona de operación de los usuarios y dos de los puntos de control obligatorios de §5.6 y §10. El borde de un tile debe caer donde no hay tráfico, nunca en medio de un corredor de navegación.

Con −39,5 quedan dentro de un solo tile: Valdivia y Corral, el Seno de Reloncaví completo, Puerto Montt, Canal Tenglo, Calbuco, Maullín, la boca del Canal de Chacao, Chiloé entero, Golfo Corcovado, Canal Moraleda y hasta Aysén. **Ninguna ruta de la base de usuarios actual cruza un borde de tile.**

`NORTE` se recorta a −40,0 para dejar 0,5° de solape con `AUSTRAL_N` y evitar huecos en el borde.

**Ruteo entre tiles:** no está resuelto en esta especificación y **no hace falta resolverlo todavía**. Con el bbox corregido, el caso solo aparece en rutas del norte del país, que no son el caso de uso inmediato. Cuando llegue, la vía es tratar los tiles como una grilla virtual única — el CRS compartido de §3.1 lo permite sin reproyección.

**Sobre `AUSTRAL_S`:** a ~540 MB es el único que puede requerir subdivisión. Se evalúa en la Fase 6 con las dimensiones reales en mano; buena parte de su extensión es continente patagónico y océano abierto sin valor navegacional, así que un recorte por banda costera efectiva puede bajarlo bastante. No es un problema de la Fase 1.

**Orden de generación:** `AUSTRAL_N` primero (es la zona de los usuarios actuales y donde está la geometría difícil). El engine debe escribirse multi-tile desde el inicio, aunque solo exista un tile generado.

---

## 4. Fuentes de datos

Todas gratuitas. Ninguna requiere licencia comercial.

| # | Fuente | Uso | Licencia | Nota de descarga |
|---|---|---|---|---|
| 1 | **OSM water polygons** (`water-polygons-split-4326`, osmdata.openstreetmap.de) | Máscara base de agua | ODbL (atribución obligatoria en T&C) | Viene pre-troceado. Bajar solo los shapefiles que intersecten cada tile. **Contiene únicamente océano — no incluye ríos ni lagos.** Ver fuente 8 |
| 8 | **Riberas fluviales OSM** vía Overpass | Completar la máscara en puertos fluviales | ODbL | `natural=water` + `water=river`, y `waterway=riverbank`. **Obligatorio**: sin esto, Valdivia ciudad (15 mn río arriba por el Calle Calle) queda invisible, igual que Río Bueno, Maullín y cualquier otro puerto fluvial. **No filtrar por navegabilidad** — un río de 20 m no pasa ni con `dMinM = 50`, la geometría los descarta sola |
| 2 | **GSHHG** (NOAA) | Validación cruzada de (1); genera directo el EDT offline grueso | Dominio público / LGPL | Trae 5 niveles ya decimados (f/h/i/l/c). Usar `i` (intermediate) para el offline |
| 3 | **OSM seamarks** vía Overpass API | Peligros sumergidos | ODbL | Query por bbox de tile, fragmentada. Tags: `seamark:type` ∈ {`rock`, `wreck`, `obstruction`, `shoal`} |
| 4 | **GEBCO 2024** (15″ ≈ 450 m) | Sondas < 10 m | Sin restricción | **Solo tile NORTE.** En fiordos australes es interpolada y no confiable — no usar en `AUSTRAL_*` |
| 5 | **GMRT** (Global Multi-Resolution Topography, Lamont-Doherty) | Batimetría multihaz real → confianza VERDE | Sin restricción, API pública | Agrega pasadas de buques científicos. En fiordos chilenos hay campañas CIMAR con resolución de decenas de metros. Descarga por bbox vía web service |
| 6 | **IBCSO v2** | Batimetría al sur de 50°S | Sin restricción | Mejor que GEBCO en `AUSTRAL_S`. Grilla de 500 m |
| 7 | **Derroteros de la Costa de Chile** (SHOA, PDF público) | Sondas mínimas de canales y pasos | Publicación oficial, texto | No es dato geoespacial. Extracción manual de sondas de canales clave → tabla `sondas_canal.json`. Trabajo acotado, alto valor |

**Sobre (3):** no es batimetría ni la sustituye. Las celdas de peligro se marcan intransitables con buffer de 100 m.

**Sobre (5), (6) y (7):** ninguna da cobertura completa de los fiordos. Su función no es garantizar profundidad sino **determinar qué tramos pueden declararse VERDE** en la capa de confianza batimétrica (§5.3). Donde no llega ninguna, el tramo se declara AMARILLO o ROJO y la app lo dice.

**Sobre las descargas:** todas se hacen **una sola vez, offline, en el pipeline de build**. Nada de esto se descarga en runtime. Si un archivo pesa demasiado, bajarlo por bbox fragmentado y fusionar en el paso de rasterización.

---

## 5. Pipeline de build (Python, offline, una vez por tile)

Ubicación: `tools/raster-build/`. Dependencias: `rasterio`, `shapely`, `geopandas`, `scipy`, `pyproj`, `numpy`.

```
build_tile.py --tile AUSTRAL_N
```

Pasos:

1. **Recortar** los water polygons OSM al bbox del tile (en WGS84), reproyectar al CRS de §3.1
2. **Rasterizar** a la resolución del tile → máscara booleana `agua`. **Unir las riberas fluviales** (fuente 8 de §4) antes de rasterizar: los water polygons de OSM son solo océano y sin este paso los puertos fluviales quedan desconectados
3. **Rasterizar peligros** (seamarks) con buffer 100 m → restar de `agua`
4. **[Solo NORTE]** GEBCO < 10 m → restar de `agua`
5. **EDT**: `scipy.ndimage.distance_transform_edt` sobre `agua`, `sampling` = resolución del tile → distancia en metros. **Ver §5.5 — este paso se procesa siempre por bandas, no de una pasada**
6. **Capa de confianza batimétrica** (ver §5.2) → 2 bits por celda
7. **Capa KML** — rasterizar buffer de 300 m sobre las 14 geometrías KML → 1 bit por celda
8. **Empaquetar** los tres datos en un solo `uint16` (§5.1)
9. **Escribir** `{tile}.bin` (raw Uint16 little-endian, row-major, fila 0 = norte) + `{tile}.meta.json`
10. **Grid grueso**: max-pooling factor 8 **solo del campo distancia** → `{tile}.coarse.bin` (Uint16). Max-pooling, **no** promedio: preserva canales angostos como Canal Tenglo, que a 400 m desaparecerían con cualquier otra agregación
11. **GeoTIFF de control** → `{tile}.control.tif`

### 5.1 Empaquetado de la celda (`uint16`)

Los tres datos caben en la misma palabra sin memoria adicional:

```
bit 15      : huella KML          (1 = la celda está bajo un canal KML conocido)
bits 14–13  : confianza batimétrica  (0 = TIERRA/peligro, 1 = ROJO, 2 = AMARILLO, 3 = VERDE)
bits 12–0   : distancia a costa, en unidades de 10 m  (tope 8.191 → 81,9 km)
```

Celda no navegable ⇔ `confianza === 0`. El campo distancia se ignora en ese caso.

81,9 km de tope sobra: el corte normativo más lejano es 12 MN (22,2 km) y la penalización de mar abierto satura mucho antes.

**Ventaja de este empaquetado:** la LUT de costo se indexa por el valor crudo de 16 bits y resuelve distancia, confianza y bonus KML en un solo acceso a memoria. No hay branches ni arrays paralelos en el bucle caliente del A*.

### 5.2 Capa de confianza batimétrica

Este es el mecanismo por el cual la app **advierte antes de trazar**, en lugar de fingir que conoce la profundidad. El patrón ya tiene ecosonda para el metro a metro; lo que la app no puede hacer es dibujar con cara de certeza por donde nadie midió.

Asignación por celda, en orden de prioridad:

| Nivel | Condición | Significado |
|---|---|---|
| **VERDE** (3) | Cubierta por GMRT multihaz, IBCSO, GEBCO (solo NORTE), o sonda de derrotero, **y** profundidad ≥ 10 m | Hay dato de profundidad real que respalda el tramo |
| **AMARILLO** (2) | Sin dato batimétrico, pero bajo huella KML | Sin dato, pero hay evidencia de que ahí se navega |
| **ROJO** (1) | Agua navegable sin ninguna de las anteriores | Solo geometría de costa. Nadie confirmó profundidad |
| **TIERRA** (0) | Tierra, peligro, o profundidad conocida < 10 m | Intransitable |

El umbral de 10 m es conservador respecto del calado máximo de una nave menor (~4 m). Se define en `src/config/perfiles-costo.js`, no hardcodeado.

**El router no prohíbe ROJO.** En buena parte del sur austral no existe nada mejor y prohibirlo dejaría a la app sin trazar. Se penaliza por costo (§7.1) y se declara por tramo en la respuesta (§7.5).

**Las ways `route=ferry` de OSM quedan explícitamente excluidas como fuente de AMARILLO.** Son rutas de nave mayor: cruzan mar abierto por Hornopirén/Chaitén en lugar de los canales interiores, y ese sesgo es exactamente el defecto que motivó reescribir el motor (§0). Marcarlas AMARILLO les daría un 18% de descuento frente a ROJO y reintroduciría el problema por la puerta de atrás. Si más adelante se quieren usar, debe ser con evidencia de que la derrota sirve también a nave menor, no por el solo hecho de existir en OSM.

**Consecuencia para la Fase 1:** sin KML disponibles y sin batimetría, **todas las celdas navegables salen ROJO**. Eso es correcto y esperado. Un factor de confianza uniforme es una constante multiplicativa y no altera el camino óptimo, así que la Fase 1 rutea igual que si la capa no existiera. La capa empieza a discriminar recién en la Fase 3.

### 5.3 Formato `{tile}.meta.json`

```json
{
  "tile_id": "AUSTRAL_N",
  "crs_proj4": "+proj=tmerc +lat_0=0 +lon_0=-72 +k=0.9996 +x_0=500000 +y_0=10000000 +datum=WGS84 +units=m",
  "origin_x": 380000.0,
  "origin_y": 5407000.0,
  "res_m": 50,
  "cols": 4600,
  "rows": 12245,
  "dtype": "uint16",
  "unit_m": 10,
  "packing": { "kml_bit": 15, "confianza_bits": [14, 13], "dist_bits": [12, 0] },
  "nodata": 0,
  "coarse_factor": 8,
  "cobertura_batimetrica": { "verde": 0.11, "amarillo": 0.19, "rojo": 0.70 },
  "build": {
    "fecha": "2026-07-25",
    "fuentes": { "osm_water": "...", "seamarks_overpass": "...", "gmrt": "...", "ibcso": null, "gebco": null }
  }
}
```

`origin_x/origin_y` = esquina **superior izquierda** en coordenadas proyectadas.
Índice de celda: `idx = fila * cols + col`, `fila = (origin_y - y) / res_m`, `col = (x - origin_x) / res_m`.

`cobertura_batimetrica` se calcula al build sobre las celdas navegables. Es el dato honesto de cuánto del tile tiene respaldo de profundidad, y debe quedar visible en la documentación del producto — no enterrado en un JSON.

### 5.4 EDT offline (un solo archivo nacional)

```
build_offline_edt.py
```

- Fuente: GSHHG nivel `i`
- Cobertura: todo Chile, banda costera de 60 km
- Resolución: 500 m · `unit_m` = 200 · `dtype` = uint8 (tope 51 km)
- Salida: `chile_costa_500m.bin` — **1,0 MB**, ~120 KB gzip
- Precisión: ±200 m sobre 22.224 m (12 MN) = 0,9%. Suficiente para cotejo normativo

Este archivo se sirve al PWA y se cachea en el service worker. Ver §8.

### 5.5 EDT por bandas (obligatorio en todos los tiles)

`scipy.ndimage.distance_transform_edt` devuelve **float64** y no admite float32. Para `AUSTRAL_N` (~76 M celdas) eso son ~610 MB solo de salida, más los buffers internos del algoritmo: **pico realista de 1,5–2 GB**. No se procesa de una pasada ni en máquinas holgadas — hacerlo por bandas siempre elimina una clase entera de fallas intermitentes.

**Procedimiento:**

1. Crear el `.bin` de salida completo como `np.memmap` en disco, modo `w+`, dtype `uint16`
2. Dividir el tile en bandas horizontales de ~25 M celdas, con **solape de 30 km** (600 filas a 50 m, 300 a 100 m) a cada lado
3. Por banda: extraer la sub-máscara con solape → EDT → recortar el solape → cuantizar a uint16 → escribir en la posición correspondiente del memmap
4. Liberar explícitamente (`del`, `gc.collect()`) antes de la siguiente banda
5. `flush()` al final

El pico de RAM queda acotado al de una banda (~300 MB), independiente del tamaño del tile.

**Por qué 30 km de solape bastan, aunque el EDT quede impreciso más allá:**

Una banda con solape de 30 km calcula bien cualquier distancia a costa hasta ~30 km. Más allá, el valor puede quedar subestimado porque la costa relevante cae fuera de la ventana. Eso **no afecta el ruteo**, por dos razones:

- El corte normativo más lejano es CDC a 12 MN = 22,2 km, que cae holgado dentro del solape y queda exacto
- La penalización de mar abierto satura en `penalMax` alrededor de los 25 km. Dos celdas a 35 y 60 km reciben idéntico costo, así que un error entre ellas no cambia ninguna decisión del A*

Es decir: el EDT no queda exacto en mar abierto lejano, pero sí queda **exacto en todo el rango donde importa**. Documentar esto en el código para que nadie "arregle" el solape después sin entender por qué es suficiente.

**El build corre en cualquier máquina de desarrollo.** Con este procedimiento el pico de RAM no depende del tamaño del tile, así que `AUSTRAL_S` (~270 M celdas) no exige más memoria que `AUSTRAL_N` — solo más bandas y más tiempo. No se requiere hardware especial ni infraestructura externa para el build.

### 5.6 GeoTIFF de control (verificación obligatoria de Fase 1)

Junto al `.bin`, el pipeline escribe un GeoTIFF con **la misma georreferenciación exacta**, submuestreado a 1/4 de resolución para que pese poco, con el campo confianza mapeado a colores (0 negro, 1 rojo, 2 amarillo, 3 verde).

**No es un entregable, es un instrumento de verificación.** Los tests de §10 confirman que los bits están bien empaquetados, pero **ninguno detecta un error de georreferenciación**: si `origin_x` queda corrido, o la proyección se aplica invertida, el `.bin` pasa todos los tests numéricos igual y el error solo aparece cuando una ruta sale trazada sobre una isla.

Procedimiento de aceptación de la Fase 1:

1. Abrir `{tile}.control.tif` en QGIS 3.44 (ya instalado en el equipo de desarrollo)
2. Superponer el mapa base de OSM
3. Verificar visualmente en tres puntos de control: **Canal Tenglo** (debe aparecer como agua continua, no cerrado), **Canal de Chacao**, y **borde exterior de Isla Guafo**
4. La costa del raster debe calzar con la costa del mapa base. Cualquier desfase visible invalida el tile

Sin este chequeo, la Fase 1 no se da por cerrada aunque los tests estén en verde.


---

## 6. Contrato de entrada del router

`raster-router-service.js` **no** recibe el tipo de licencia. Recibe el perfil ya resuelto por el módulo de cotejo:

```js
/**
 * @typedef {Object} PerfilNavegacion
 *
 * @property {'deportivo'|'comercial'} ambito
 *   Derivado del uso declarado de la nave en P1. Determina qué cuerpo
 *   reglamentario aplica. NO se deriva de la licencia.
 *
 * @property {string}  licencia
 *   Deportivas: 'PLDB' | 'PDB' | 'CDC' | 'CDAM'
 *   Comercial:  'PNM'
 *
 * @property {string}  clasificacionNave
 *   'ALTA_MAR' | 'COSTERA_60' | 'COSTERA_12' | 'BAHIA_VELA' | 'BAHIA_MOTOR'
 *   Solo ámbito deportivo. Se pregunta en P1, viene en el certificado
 *   de matrícula. No se infiere.
 *
 * @property {boolean} habilitado      - false ⇒ el router NO traza
 * @property {string[]} bloqueos       - motivos si habilitado === false
 *
 * @property {Object}  limites
 * @property {number|null} limites.maxDistCostaM
 *   min(límite de licencia, límite de clasificación de nave).
 *   Vela sin motor auxiliar operativo ⇒ tope adicional de 12 MN.
 *   null en ámbito comercial y en CDAM con nave de alta mar.
 *
 * @property {Object}  nave
 *   { eslora_m, manga_m, calado_m, trg, ab, propulsion,
 *     tiene_motor_auxiliar, motor_operativo, uso }
 *
 * @property {Object}  costo  - { dMinM, bandaMinM, bandaMaxM, penalMax }
 * @property {string[]} advertencias
 *   Ej: "límite de bahía fijado por su Capitanía — verifíquelo"
 */
```

Constantes de referencia: 12 MN = 22.224 m · 60 MN = 111.120 m.

### 6.1 Resolución del perfil de costo

**`dMinM` es un margen geométrico de separación de la orilla. No es, y no debe presentarse como, una garantía de profundidad.** La profundidad la resuelven dos cosas distintas: la ecosonda de la nave en tiempo real, y la capa de confianza batimétrica (§5.2) que declara qué respalda cada tramo. Confundir ambos planos fue un error de diseño en la primera versión de este documento.

| Calado | `dMinM` | `bandaMinM` | `bandaMaxM` |
|---|---|---|---|
| < 1,5 m | 50 | 150 | 2500 |
| 1,5 – 2,5 m | 80 | 250 | 3000 |
| 2,5 – 4,0 m | 150 | 400 | 3000 |
| > 4,0 m | 200 | 500 | 3000 |

> ⚠️ **Valores preliminares, pendientes de calibración operacional.** No los valida un ingeniero naval — los valida un patrón con experiencia en la zona, o los tracks reales. Implementar como constante exportada y editable en un solo lugar (`src/config/perfiles-costo.js`), nunca hardcodeada dentro del router.

Dos observaciones para la calibración futura:

- El margen probablemente depende de **calado × tipo de agua**, no solo de calado. En canal conocido el patrón se pega porque conoce el fondo; en costa abierta o desconocida se abre. El bit KML de la celda ya distingue ambos casos y puede modular `dMinM` mejor de lo que hace hoy (§7.1).
- La vía más barata para medirlo en vez de estimarlo es un **receptor AIS** (dongle RTL-SDR, ~US$30). Dos o tres semanas de tracks en Puerto Montt dan la banda de resguardo real de barcazas y lanchas salmoneras, y sirven además para validar el motor completo contra lo que la gente efectivamente navega.

Ajuste sobre esa base, por licencia y clasificación:

| Perfil | Ajuste | Motivo |
|---|---|---|
| **PLDB / PDB** | `bandaMaxM` = 1500 | No debe alejarse de aguas protegidas |
| **CDC** con nave Costera 12 MN | Sin ajuste de banda | El corte de 12 MN ya limita la exposición |
| **CDC** con nave Costera 60 MN o Alta Mar | Sin ajuste | Corte de 60 MN |
| **CDAM** | `penalMax` = 1.2 en vez de 2.2 | Alta mar quiere la ruta directa, no el resguardo |
| **PNM** (comercial) | Sin ajuste | Perfil de resguardo base, sin cortes de distancia |

### 6.2 Habilitación licencia × nave

**Fuente:** Reglamento General de Deportes Náuticos y Buceo Deportivo, TM-002, D.S. (M) N° 214 de 2015, modificado por D.S. (M) N° 126 del 2 de marzo de 2022 (D.O. 43.238, 27 de abril de 2022). Última actualización abril 2022. **Texto verificado contra el PDF oficial.**

#### Matriz del Art. 14

| Licencia | Naves que puede comandar | Límite de zona |
|---|---|---|
| **PLDB** — Patrón de Lancha Deportiva de Bahía | Embarcaciones deportivas de bahía, **propulsadas exclusivamente a motor** | Aguas protegidas dentro de puertos, bahías, ríos y lagos, hasta el límite fijado por la Autoridad Marítima competente |
| **PDB** — Patrón Deportivo de Bahía | **Todo tipo** de embarcaciones deportivas de bahía (vela y motor) | Ídem |
| **CDC** — Capitán Deportivo Costero | Todo tipo de costeras y de alta mar, **más** bahía | **60 MN de costa** |
| **CDAM** — Capitán Deportivo de Alta Mar | Todo tipo de alta mar, costeras y bahía | Sin límite, incluye oceánica |

La diferencia PLDB / PDB **no es de zona sino de propulsión**: PLDB no habilita para comandar veleros.

#### Correcciones obligatorias a `license-rules.js`

| Constante | Valor actual | Valor correcto | Gravedad |
|---|---|---|---|
| `CDC_MAX_COAST_NM` | 12 | **60** | **Crítica.** El 12 proviene del reglamento derogado de 1997/2005. Tal como está, la app declara infracción a un patrón que navega dentro de su licencia |
| `PDB_MAX_DISTANCE_NM` | 2 (desde puerto de zarpe) | **Sin valor nacional** | Alta. Ese número no aparece en el reglamento. Ver abajo |

#### Bahía: no existe un límite nacional

Tanto PLDB como PDB están limitadas por "el límite fijado por la Autoridad Marítima competente", es decir **por jurisdicción de Capitanía**. No corresponde codificar un número nacional.

Opciones, en orden de preferencia:

1. Tabla por jurisdicción (`src/config/limites-bahia.json`), poblada con el límite oficial de cada Capitanía relevante — empezando por Puerto Montt, Calbuco, Ancud, Quellón, Melinka
2. Restricción geométrica a aguas protegidas (puertos, bahías, ríos, lagos), aproximable con el raster
3. **Provisional:** no aplicar corte automático; mostrar "límite de bahía: verificar con su Capitanía" y dejar la ruta sin restricción de zona

Implementar (3) hasta tener los datos de (1). **No inventar un número.**

#### Clasificación de la embarcación — campo nuevo obligatorio en P1

**Fuente:** Circular D.G.T.M. y M.M. Ord. N° A-41/014, de 16 de marzo de 2015 (cambio 1, 9 de mayo de 2016).

Las embarcaciones deportivas se clasifican en cinco categorías, y las costeras llevan sub-clasificación por millas según el equipamiento disponible a bordo:

| Clasificación | Límite propio |
|---|---|
| Alta Mar | Sin límite |
| **Costera 60 MN** | 60 MN de costa |
| **Costera 12 MN** | 12 MN de costa |
| Bahía Vela | Aguas protegidas |
| Bahía Motor | Aguas protegidas |

La sub-clasificación costera **se registra en los certificados de matrícula y de navegabilidad**. El usuario la tiene por escrito: se pregunta en P1 como desplegable de cinco opciones, **no se infiere** de la eslora ni del tipo de casco.

Sin este campo el cotejo normativo es incorrecto por diseño.

#### La regla del mínimo

Existen **dos límites independientes** y el efectivo es el menor:

```js
maxDistCostaM = min(limiteLicencia, limiteClasificacionNave)
```

Un Capitán Deportivo Costero (60 MN por licencia) al mando de una embarcación Costera 12 MN **está limitado a 12 MN**. La licencia habilita a la persona; la clasificación habilita al casco. Ambas restringen.

Esto es exactamente la cadena licencia → nave → navegación de §1, aplicada al corte de distancia.

#### Corte adicional: vela sin motor auxiliar

Las embarcaciones deportivas de alta mar y costeras propulsadas a vela que no cuenten con motor auxiliar, o que no lo tengan operativo, quedan limitadas a **12 MN de la costa**, independiente de su clasificación y de la licencia del patrón.

Requiere dos campos booleanos en P1: `tiene_motor_auxiliar` y `motor_operativo`. Solo se preguntan si la propulsión declarada es a vela.

#### Reglas de habilitación verificadas

Art. 25 — Los menores de edad con licencia deportiva náutica **no pueden comandar lanchas deportivas de bahía que excedan 6 metros de eslora ni 135 HP de potencia**.

Art. 26 — Las motos de agua y similares solo pueden navegar entre el orto y el ocaso. Los menores que las operen no pueden transportar pasajeros ni remolcar.

Art. 53 — No requieren licencia: embarcaciones a vela menores de 5 m de eslora, y embarcaciones con motor de hasta 10 HP.

Art. 22 — Los tripulantes de la Marina Mercante y de naves especiales, incluidas las de pesca, **pueden acceder** a licencias deportivas con solo un examen práctico. Es decir: **no las poseen automáticamente**. Los universos deportivo y comercial están separados y el puente es trámite, no equivalencia.

> **Regla dura derivada:** una licencia deportiva **no habilita actividad comercial**. Si el usuario declara nave de trabajo (pesca, acuicultura, transporte) y licencia deportiva, el cotejo bloquea y el router no traza.

#### Equipamiento con efecto en los consejos (paso 7)

Las embarcaciones costeras de 12 MN deben contar con balsa salvavidas y/o bote de goma cuando emprendan una travesía distante de un centro poblado con medios de asistencia para salvamento. **Aplica a prácticamente toda ruta austral**: Corcovado, Moraleda, cualquier tramo al sur de Quellón.

El traje antiexposición de supervivencia figura como recomendado específicamente para navegación en aguas australes o antárticas.

Ambos son candidatos directos a recordatorio contextual en P3.

#### Derivación de AB desde la eslora (Art. 28)

Para embarcaciones deportivas de menos de 24 m, el reglamento fija el arqueo bruto por tabla, sin requerir planos:

| Eslora | AB | | Eslora | AB |
|---|---|---|---|---|
| Hasta 23,99 m | 50,0 | | Hasta 15 m | 22,3 |
| Hasta 22 m | 42,5 | | Hasta 13 m | 17,5 |
| Hasta 20 m | 36,5 | | Hasta 12 m | 15,0 |
| Hasta 18 m | 30,5 | | Hasta 10 m | 10,0 |
| Hasta 16 m | 25,0 | | Hasta 8 m | 5,0 |

Esto **resuelve parcialmente el backlog #4**: el AB se deriva de la eslora que el usuario ya ingresa en P1, sin pedirle un certificado de arqueo. Aplica solo a embarcaciones deportivas.

#### Zarpe: los deportivos no lo requieren (Art. 34)

Las embarcaciones deportivas nacionales que naveguen en aguas jurisdiccionales chilenas **no requieren autorización de zarpe**. Solo deben informar su intención de movimiento al club de yates, club de deportes náuticos o entidad náutica desde donde zarpen; si no existe ninguno, a la Autoridad Marítima local.

P3 debe distinguir el flujo deportivo del comercial. Hoy no lo hace.

#### Umbral de nave menor: depende del ámbito

No hay contradicción entre las cifras, son dos universos normativos distintos:

| Ámbito | Umbral de nave menor | Fuente |
|---|---|---|
| **Deportivo** | 50 TRG o menos | Art. 29, TM-002 |
| **Comercial** (pesca, acuicultura, transporte) | Menos de 100 TRG / AB | Circular O-72/023 |

Las embarcaciones deportivas rara vez se acercan a las 50 TRG; las de trabajo de 25, 50 y 100 TRG son habituales en pesca, salmonicultura, mitilicultura y transporte.

**Consecuencia:** `PerfilNavegacion` requiere un campo `ambito: 'deportivo' | 'comercial'`, derivado del uso declarado de la nave en P1. Ese campo determina qué cuerpo reglamentario aplica, qué umbral de tonelaje rige, si se exige zarpe, y qué licencias son válidas.

**No se deriva de la licencia.** Una lancha de 12 m puede ser deportiva o de trabajo, y el reglamento aplicable cambia por completo.

#### Ámbito comercial: sin validación de habilitación

Para naves de trabajo (`ambito: 'comercial'`, licencia PNM), la app **no valida habilitación licencia × nave**. El permiso de zarpe ya lo resolvió la Autoridad Marítima antes de que el patrón abra la app, y duplicar ese control sería redundante y frágil.

El router usa el perfil de costo de resguardo sin cortes normativos de distancia. Esto es consistente con el principio ya establecido de que el manejo de zarpe en Tmarea es informativo: el patrón navega con permiso aprobado.

---

## 7. Runtime del router

Archivo nuevo: `src/services/raster-router-service.js`

### 7.1 LUT de costo

**Una sola tabla de 65.536 entradas**, indexada por el valor crudo de la celda. Se construye una vez por request (< 1 ms) y resuelve distancia, confianza batimétrica y bonus KML en un único acceso a memoria, sin branches en el bucle caliente del A*.

```js
function buildCostLUT(perfil) → Float32Array(65536)
```

Para cada valor `v` de 0 a 65535 se desempaqueta `kml`, `confianza` y `d = (v & 0x1FFF) * unit_m`, y se resuelve:

```
confianza === 0                  → Infinity        // tierra, peligro, o sonda < 10 m
d > limites.maxDistCostaM        → Infinity        // corte normativo CDC
d < dMinEfectivo                 → Infinity        // margen geométrico
dMinEfectivo ≤ d < bandaMinM     → lerp(1.6 → 1.0) // no pegarse al roquerío
bandaMinM ≤ d ≤ bandaMaxM        → 1.0             // banda de resguardo
d > bandaMaxM                    → min(1.0 + (d - bandaMaxM)/8000, penalMax)

× factor de confianza:  VERDE 1.00 · AMARILLO 1.15 · ROJO 1.40
× bonus KML (si kml):   0.85, con piso global de 0.80

dMinEfectivo = kml ? min(dMinM, 50) : dMinM
```

**Por qué el KML relaja `dMinM`:** la distancia a la orilla no dice nada de la profundidad. En Canal Tenglo, angosto pero navegable, un `dMinM` de 150 m lo cerraría — y una nave de 90 TRG sí pasa por Tenglo. La huella KML representa conocimiento empírico de que ahí se navega, y eso pesa más que una regla geométrica ciega.

**Por qué ROJO se penaliza pero no se prohíbe:** en buena parte del sur austral no existe respaldo batimétrico de ningún tipo. Prohibir ROJO dejaría a la app sin trazar en la mitad de su zona objetivo. El factor 1.40 hace que el router prefiera claramente lo respaldado cuando existe alternativa, y la respuesta declara el nivel por tramo (§7.5) para que P4 lo muestre.

**El corte normativo de las 12 MN cae dentro de la misma tabla.** El mismo mecanismo que produce el resguardo produce el cumplimiento: la ruta que el motor entrega es normativamente imposible de violar por construcción.

#### Zonas de margen relajado (áreas dragadas)

**Problema detectado en Fase 2:** con `dMinM = 150` (calado 2,5–4,0 m) el router no encuentra salida desde Puerto Montt ni con 15 M de expansiones sin restricción. El modelo declara inalcanzable un puerto del que zarpan barcazas de ese calado a diario.

La causa es estructural, no un bug: **el EDT mide distancia a la orilla, no profundidad**. Canal Tenglo tiene 250 m de ancho navegable; aplicar 150 m de margen a cada lado lo cierra aritméticamente aunque en la práctica se navegue. Lo mismo ocurre en dársenas, canales dragados y aproximaciones portuarias.

**Mecanismo:** un tercer tipo de zona en el build, junto a los peligros y las exclusiones.

```
src/config/zonas-dragadas.json
  [{ nombre, tipo, geometria_wgs84, buffer_m, dMinM_max: 50, fuente }]
```

Tres tipos, en orden de confiabilidad:

| `tipo` | Geometría | Origen | Confianza resultante |
|---|---|---|---|
| `area_portuaria` | Punto + buffer | `puertos_chile_nacional.json` | Según batimetría disponible |
| `canal_conocido` | Línea + buffer 300 m | Geometría digitalizada (ej. Tenglo, 39 pts en `tmarea_nodos_nauticos_v1.json`) | Según batimetría |
| `canal_acceso_derivado` | Línea + buffer 300 m | **Generada por el propio router** (ver abajo) | **Forzada a ROJO** |

Las celdas dentro de cualquiera de estas zonas tienen `dMinM` acotado a **50 m** independientemente del calado, con el mismo bit 15 del empaquetado que la huella KML (§7.1) — funcionalmente son el mismo caso: *"acá se navega, aunque la geometría diga que no"*.

#### Derivación automática de canales de acceso

No se dibujan a mano ni se espera geometría externa. **Si un puerto es inalcanzable a `dMinM=200` pero alcanzable a `dMinM=50`, el camino existe y el router puede trazarlo.**

```
Para cada puerto que falla a 200 pero pasa a 50:
    ruta = A*(puerto → mar abierto, dMinM = 50)
    zona = buffer(ruta, 300 m)
    agregar como tipo 'canal_acceso_derivado'
    regenerar tile
```

Resuelve tránsitos largos por canal angosto —Río Valdivia hasta Corral, fiordo de Puyuhuapi— que un buffer puntual alrededor del puerto nunca alcanza a cubrir, sin trabajo manual y sin inventar trazados.

**Condición de honestidad:** estas zonas se fuerzan a confianza **ROJO** y el tramo correspondiente lleva advertencia explícita en la respuesta. Se permite el paso por geometría; **no se afirma que haya profundidad**. Un `canal_acceso_derivado` no puede promoverse a VERDE aunque más adelante aparezca batimetría cercana — solo una fuente batimétrica que cubra ese tramo específico lo justifica.

#### Calibración del buffer portuario

Un buffer de 2 km alrededor de cada puerto es una aproximación grosera y **puede sobre-relajar**: son 277 zonas con margen a 50 m, y existe riesgo de que el router produzca rutas pegadas a la costa donde no hay dragado.

**No reducirlo a ciegas.** Un buffer menor deja descubiertos los canales que hoy funcionan por accidente: Canal Tenglo está a ~3 km del centro de Puerto Montt y volvería a cerrarse con un radio de 800 m.

Secuencia correcta:

1. **Medir el daño:** correr las rutas de prueba y contar cuántos puntos quedan a menos de 100 m de costa **fuera** de canal conocido o derivado. Si son cero, el buffer no está causando problemas y no urge tocarlo
2. **Cubrir los canales por su propia geometría** (`canal_conocido` y `canal_acceso_derivado`), no por el radio del puerto
3. **Recién entonces** reducir el buffer portuario a ~800 m y volver a correr el test de sanidad

Ese orden garantiza que la cobertura no dependa de que el buffer sea accidentalmente lo bastante ancho.

> **Nunca resolver este problema moviendo el punto de prueba.** Si un test falla porque un puerto quedó aislado, el defecto está en el modelo, no en el test. Mover el origen hasta que converja deja el fallo latente en producción, donde aparece cuando un patrón con calado real pide ruta desde su puerto.

#### Test de sanidad del modelo (obligatorio, Fase 2)

Antes de dar la Fase 2 por cerrada:

```
Para cada puerto de puertos_chile_nacional.json dentro del tile:
  para cada dMinM de {50, 80, 150, 200}:
    verificar que existe camino hasta un punto de mar abierto
```

Cualquier puerto **costero** inalcanzable con `dMinM = 200` (el calado mayor de nave menor) es un defecto del modelo que debe corregirse por derivación automática de canal de acceso, **no ajustando el test**.

**Excluir del criterio los puertos lacustres y fluviales interiores** — Lago Ranco, Lago General Carrera, Lago Yelcho, Lago Tagua Tagua, Todos los Santos/Petrohué y similares. Su inalcanzabilidad es correcta: los water polygons de OSM son solo océano (ver test 8). Filtrarlos por proximidad a la costa oceánica o por lista explícita, y reportarlos aparte.

Resultado como cobertura: *N de M puertos costeros alcanzables a cada margen*. **Meta: 100% a `dMinM = 200`.**

Referencia de la primera corrida (v1.6, antes de la derivación automática): 218/269 a 200 m, de los cuales ~50 fallos eran lagos interiores y **2 eran puertos costeros reales** — Valdivia ciudad y Puyuhuapi, ambos por tránsito largo en canal angosto no cubierto por el buffer puntual.

### 7.2 A* jerárquico (obligatorio)

Puerto Montt → Chacabuco son ~250 nm ⇒ **~9.260 celdas de camino mínimo**. A* plano sobre decenas de millones de celdas expande millones de nodos: decenas de segundos o directamente OOM. Inaceptable.

#### Tres niveles, no dos

La primera versión de este documento especificaba dos niveles y dilatación fija de 3 km. **Insuficiente para rutas largas**: en Anahuac→Chacabuco el corredor de 3 km queda desconectado y el router cae al fallback sin restricción, que agota el heap de V8 antes de converger.

| Nivel | Factor | Resolución efectiva | Celdas aprox. | Rol |
|---|---|---|---|---|
| Grueso | 32 | 1.600 m | ~104 K | Corredor global. Camino de ~290 celdas: instantáneo |
| Medio | 8 | 400 m | ~1,7 M | Refina el corredor dentro del grueso dilatado |
| Fino | 1 | 50 m | restringido | Ruta final, solo dentro del corredor medio |

Ambos niveles agregados se construyen con **max-pooling del campo distancia**, igual que el `coarse.bin` actual — preserva canales angostos que a 1.600 m desaparecerían con cualquier otra agregación.

**El max-pooling es permisivo por diseño y sobrestima la conectividad.** Es intencional: un corredor es una *hipótesis*, y el nivel fino la valida. Que el medio conecte y el fino no, es el mecanismo funcionando, no un defecto.

#### Invariante de monotonía (crítico)

> **Ningún nivel agregado puede ser más restrictivo que el fino.** Si lo es, poda opciones válidas antes de que el fino llegue a evaluarlas, y el fallo aparece como `sin_camino` en una ruta que sí existe.

El max-pooling de la distancia ya respeta el invariante. **El margen también debe respetarlo:** los niveles grueso y medio usan `dMinM = 50` —el mínimo absoluto— sin importar el perfil de calado.

Motivo: las celdas agregadas **no llevan el bit 15** de zona relajada (§5.1), así que una LUT gruesa que aplicara el `dMinM` del perfil vería un canal angosto como intransitable y lo excluiría del corredor. El fino, que sí tiene el bit, nunca llegaría a intentarlo.

```js
// cost-lut.js
buildCoarseCostLUT(perfil)  →  usa dMinM = 50 siempre
buildCostLUT(perfil)        →  usa dMinEfectivo real (bit 15 + calado)
```

**No hace falta propagar el bit 15 a los niveles agregados.** Sería un cambio de formato en `coarse_and_control.py`, `multi-level.js` y el runtime, con rebuild completo, para lograr lo mismo que una constante en la LUT gruesa. El corredor solo debe decir *"por acá podría haber camino"*; decidir si lo hay es trabajo del fino.

#### Nunca saltar la dilatación iterativa

> ⚠️ **Corrección de la v1.6.** Ese documento especificaba que si el fino falla por `sin_camino` (y no por tope de expansiones), se saltara directo al fallback sin restricción, con el argumento de que "el paso no existe a resolución fina y dilatar no ayuda".
>
> **Ese razonamiento es falso y causó una regresión.** Dilatar el corredor no solo ensancha un paso: puede **incorporar una ruta alternativa completa** que el corredor previo no contenía. El corredor es una región, no un pasillo.
>
> Consecuencia observada: Anahuac→Chacabuco pasó de resolver en 1,13 s a devolver `ruta_no_convergente`, porque en vez de reintentar a 6 y 12 km saltaba al fallback sin restricción, que en 250 mn agota el tope de 3 M de expansiones.

**Las tres iteraciones de dilatación se agotan siempre, sin importar el motivo del fallo del nivel fino.** El fallback sin restricción es el último recurso, no un atajo.

#### Herramientas que derivan geometría: siempre a resolución fina

El sobre-optimismo del max-pooling afecta a cualquier herramienta que use los niveles agregados para **generar** geometría, no solo para buscar corredores.

Caso detectado: la derivación de canales de acceso (§7.1) corría BFS sobre `medio.bin` y tomaba el centro de cada celda de 400 m como vértice del camino. **69 de 176 puntos del camino derivado para Puyuhuapi caían en tierra a resolución fina** — el max-pooling que hace navegable una celda agregada puede provenir de una esquina, no del centro.

**Regla:** los niveles agregados sirven para *acotar la búsqueda*, nunca para producir coordenadas. Toda geometría que se persista —zonas derivadas, waypoints, polilíneas— se deriva del `.bin` fino.

#### Dilatación iterativa, nunca salto directo al fallback

```
para radio en [3 km, 6 km, 12 km]:          ← SIEMPRE los tres
    dilatar corredor, correr A* del nivel siguiente
    si conecta → continuar al nivel siguiente
    si falla   → siguiente radio, sea cual sea el motivo
si ningún radio conecta:
    A* sin restricción, weighted ε = 1.5, TOPE DURO de expansiones
si se supera el tope:
    error explícito { ok: false, motivo: 'ruta_no_convergente' }
```

**No cortar el bucle por el motivo del fallo.** Ver la corrección más abajo.

**Un OOM nunca es un modo de falla aceptable.** El tope de expansiones se define en `src/config/perfiles-costo.js`; valor inicial sugerido: 3 M.

#### Estructuras de datos: arrays tipados dimensionados al corredor

`Map` y `Set` dispersos no escalan a esta magnitud. Pero **no hace falta dimensionar los arrays al tile completo** — esa es la razón por la que se descartan erróneamente.

El A* fino corre restringido a un corredor. Los arrays se dimensionan al **bounding box del corredor con índice local**, no al tile:

```
bbox típico Anahuac→Chacabuco: ~6.000 × 600 = 3,6 M celdas
  gScore    Float32Array   14 MB
  cameFrom  Int32Array     14 MB
  closed    bitset          450 KB
```

Trivial en memoria, y elimina las estructuras dispersas del bucle caliente.

Heurística: octile × costo mínimo posible (1.0 × res_m), admisible.
Cola de prioridad: binary heap sobre `Int32Array` de índices locales, **no** array de objetos.

### 7.3 Snap-to-navigable

**Esto resuelve el bug del backlog #2** (la ruta no aparece cuando el destino es un centro de cultivo). Los centros están en caletas chicas; muchos caen en celdas con `d < dMinM` o directamente sobre tierra en la máscara OSM, que no resuelve ensenadas pequeñas. El A* no encuentra meta y no devuelve nada.

```js
function snapToNavigable(x, y, tile, dMinM, maxRadioM = 2000) → { idx, distSnapM } | null
```

Búsqueda en espiral. Se aplica a origen **y** destino.

> ⚠️ **El snap debe usar exactamente el mismo criterio de navegabilidad que el A\*.** Si el snap acepta celdas por `confianza > 0` mientras el A* exige además `d ≥ dMinM`, devuelve un punto que el A* considera intransitable y la ruta falla sin motivo aparente. Ambos consumen la misma LUT. El tramo entre el punto real y el punto snapeado se devuelve como `tramo.tipo = 'aproximacion_final'` y el frontend lo dibuja **punteado**, con la nota de que queda a criterio del patrón.

### 7.4 String-pulling

La verificación de línea de vista usa un umbral **más estricto** que el de ruteo: `d ≥ 2 × dMinM`. Así la polilínea simplificada es más conservadora que el camino de celdas y ninguna tangente queda rozando un vértice rocoso. Si un tramo no cumple, se conserva el vértice intermedio.

Salida: waypoints con rumbo verdadero y distancia por tramo — que es lo que el patrón necesita leer, no una polilínea de 9.000 vértices.

### 7.5 Formato de respuesta

### 7.6 Los 14 KML: clasificación y mecanismo

**Naturaleza:** son trazados geométricos de referencia sobre el agua, **no** tracks GPS de navegación real. No deben autodensificarse asumiendo que sus vértices son sondas de carta.

**No existe ningún filtro de costa que aplicarles.** La máscara de agua del raster es el único juez de tierra/agua y el A* no puede salirse de ella. Cualquier referencia a `coastline-guard` o a "proyectar los nodos sobre una máscara HD" pertenece al motor eliminado (§9) y no aplica acá.

#### Grupo A — Decisión topológica (KML 1–6)

Casos donde la elección de vía **no se deriva de la geometría** sino de norma, resguardo o acceso oficial:

| # | Vía | Alternativa que descarta |
|---|---|---|
| 1 | Canal Tenglo (acceso Anahuac / Puerto Montt) | Bahía abierta |
| 2 | Paso Poniente Isla Maillén | Ruta exterior hacia Calbuco |
| 3 | Acceso Melinka por SE de Isla Ascensión | Paso La Tranca / Puquitín |
| 4 | Paso Imelev / Canal Lemuy | Salir al Golfo Corcovado |
| 5 | Barra del Río Valdivia / Corral | — (única boca) |
| 6 | Canal de Chacao | — (única puerta Pacífico ↔ Ancud) |

> ⚠️ **Estos seis son hipótesis a verificar, no implementación inmediata.** Un waypoint forzado parte el A* en tramos y le quita optimalidad; solo se justifica donde el router falla por sí solo.

Procedimiento en Fase 2:

1. Construir el router **sin** waypoints obligatorios
2. Correr las rutas de prueba de §10
3. Verificar caso por caso si el A* elige la vía correcta por costo de resguardo
4. **Solo lo que falle** pasa a ser restricción dura

Predicción: los casos 5 y 6 son redundantes — son las únicas conexiones de agua existentes, el raster ya lo sabe y no hay alternativa que prohibir. Los casos 1, 2 y 4 sí tienen alternativa real y son los que ponen a prueba la banda de resguardo.

#### Grupo B — Referencia geométrica (KML 7–14)

Ejes de trayectoria en canales abiertos y mar exterior: corredor Pacífico Valdivia→Chacao, troncal Golfo de Ancud, cruce de Corcovado, Canal Calbuco/Paso Huar, Paso Queilen, interconexión Quinchao/Chaulinec/Apiao, borde Anahuac→Panitao, enlace Chiloé Sur→Boca del Guafo.

Se usan **solo como bonus de costo** según §7.1 (0.85×, buffer 300 m) y como fuente de nivel AMARILLO en §5.2. El router los sigue cuando conviene y los abandona cuando no. Un trazado impreciso de este grupo no puede romper una ruta.

#### Inventario real (verificado en repo, julio 2026)

> ⚠️ **La lista conceptual de vías relevantes y el inventario de geometrías digitalizadas NO coinciden.** Que ambas sumaran 14 fue casualidad de conteo. Esta sección refleja lo que existe, no lo que se desearía tener.

**Geometrías que existen** — 14 features con `source: "tmarea_custom"` dentro de `red_nautica_chile_completa.geojson` (347 = 333 OSM + 14 propias):

| Vía | Puntos | | Vía | Puntos |
|---|---|---|---|---|
| Canal de Chacao | 5 | | Acceso Fiordo Castro | 3 |
| Golfo de Ancud | 8 | | Canal Yelcho | 3 |
| Golfo Corcovado | 5 | | Canal Jacaf | 3 |
| Canal Dalcahue | 8 | | Canal Puyuhuapi | 3 |
| Canal Moraleda | 5 | | Fiordo Aysén | 3 |
| Seno Reloncaví | 5 | | Canal Guaitecas | 3 |
| Paso Hornopirén | 4 | | Canal Messier | 5 |

Además: **Canal Tenglo** existe por separado en `tmarea_nodos_nauticos_v1.json` con **39 puntos** — la geometría más densa del proyecto.

**Vías identificadas como relevantes pero sin geometría digitalizada:** Paso Poniente Isla Maillén, acceso Melinka por SE de Isla Ascensión, Paso Imelev / Canal Lemuy, Barra del Río Valdivia, Canal Calbuco / Paso Huar, Paso Queilen, interconexión Quinchao / Chaulinec / Apiao, borde Anahuac → Panitao, enlace Chiloé Sur → Boca del Guafo.

#### Decisión: no digitalizar por adelantado

**El router se construye sin capa KML.** Solo después de que las rutas de prueba de §10 corran, se identifica qué vías el A* falla en resolver por sí solo, y **únicamente esas** se digitalizan.

Evidencia que sustenta la decisión: el test de conectividad de **Canal Tenglo pasó con 250 m de ancho mínimo navegable sin usar ningún KML**. Ese era el caso más exigente de la lista —canal angosto con alternativa evidente por bahía abierta— y el raster lo resolvió solo por geometría y costo de resguardo.

Digitalizar diez vías a mano para descubrir después que ocho eran innecesarias es el mismo error que la densificación de canales que ya se canceló en §0.

**Las 14 que sí existen se rasterizan como bonus de costo cuando llegue el momento.** Cubren el corredor austral completo hacia el sur (Moraleda, Jacaf, Puyuhuapi, Aysén, Messier, Guaitecas), y por ser preferencia y no topología, su baja densidad de puntos no las invalida.

#### Dos mecanismos distintos

Una restricción de vía puede expresarse de dos formas, y **no son equivalentes**:

| Forma | Implementación | Cuándo |
|---|---|---|
| "Pasa por aquí" | Waypoint forzado; A* rutea origen → nodo → nodo → destino | La vía correcta no es deducible del raster |
| "No pases por allá" | Celdas marcadas intransitables (confianza 0) en el build | Existe una vía incorrecta identificable |

**Preferir siempre la exclusión.** Es más robusta: el A* encuentra la vía correcta por sí mismo en vez de recibirla impuesta, y si más adelante aparece otra vía legítima, el router la aprovecha sin tocar código.

El KML 3 es el caso claro: en vez de forzar el paso por el SE de Isla Ascensión, se marca **La Tranca / Puquitín como zona de exclusión**. El acceso correcto queda como única opción sin necesidad de waypoint.

Las zonas de exclusión se definen en `src/config/exclusiones.json` (polígonos WGS84 + motivo + fuente) y se rasterizan en el paso 3 del pipeline, junto a los peligros de Overpass.

#### Calibración futura

Los 14 quedan sin validación empírica. Tres vías, en orden de valor real:

1. **GPX de plotters locales** — tres o cuatro archivos de un patrón que haga Puerto Montt–Melinka. Es la única fuente que da la derrota real de una embarcación del tamaño correcto, y la única que puede cerrar la tabla de calado de §6.1. Prioridad alta.
2. **Global Fishing Watch** — datasets AIS públicos, descargables por zona. Advertencia: el AIS es obligatorio sobre cierto tonelaje, así que los tracks son mayormente de naves más grandes que la base objetivo. Sirve para **confirmar dónde hay agua navegable**, no para calibrar la banda de resguardo de una lancha de 12 m.
3. **OpenSeaMap** — ya incorporado. No es fuente distinta de OSM: los seamarks son tags de OSM y la línea de costa es la misma que ya usa el pipeline. No hay capa de costa HD adicional que conseguir, y las isobatas para Chile austral son casi inexistentes (37 peligros en todo `AUSTRAL_N`).

Mantener compatible con el consumidor actual en `P4_ActiveVoyage.jsx`:

```json
{
  "ok": true,
  "motor": "raster-v1",
  "tramos": [
    { "tipo": "ruta", "confianza_batimetrica": "VERDE", "coords": [[lon,lat], ...],
      "rumbo_verdadero": 187.4, "distancia_mn": 12.3 },
    { "tipo": "ruta", "confianza_batimetrica": "ROJO", "coords": [...],
      "rumbo_verdadero": 201.0, "distancia_mn": 31.8,
      "nota": "Sin datos de profundidad en este tramo. Navegue con sonda." },
    { "tipo": "aproximacion_final", "confianza_batimetrica": "ROJO", "coords": [...] }
  ],
  "distancia_mn": 148.2,
  "max_dist_costa_mn": 8.7,
  "pct_en_resguardo": 0.82,
  "pct_batimetria": { "verde": 0.14, "amarillo": 0.31, "rojo": 0.55 },
  "advertencias": []
}
```

El campo `confianza` pasa a llamarse `confianza_batimetrica` y **deja de ser decorativo**: se calcula como el nivel mínimo de las celdas del tramo. Los tramos se cortan donde cambia el nivel, para que P4 pueda dibujarlos distinto — VERDE línea sólida, AMARILLO segmentada, ROJO segmentada con la nota visible.

Tres campos que salen gratis y alimentan el paso 7 de la cadena (consejos):

- `max_dist_costa_mn` — punto de máxima exposición de la ruta. Dato normativo (cotejo CDC) y de seguridad.
- `pct_en_resguardo` — fracción del trayecto dentro de la banda preferente. Indicador de qué tan protegida es la ruta; alimenta la regla R5 (priorizar canales interiores con mal tiempo).
- `pct_batimetria` — cuánto del viaje va sobre fondo conocido. Es el dato que impide que la app se presente como más segura de lo que es.



---

## 8. Offline en el dispositivo

El PWA **no** descarga el raster. Al analizar qué necesita realmente sin señal:

| Necesidad | Qué requiere | Peso |
|---|---|---|
| Dibujar la ruta | Polilínea ya calculada, persistida en IndexedDB | pocos KB |
| Alerta CDC 12 MN | `chile_costa_500m.bin` | 1,0 MB |
| Alerta PDB 2 MN | Haversine contra el puerto de zarpe | 0 |
| Detección de desvío | Geometría contra la polilínea guardada | 0 |

Total: **1 MB**. Se cachea en el service worker junto al bundle.

Esto encaja con que la app sea descriptiva y la ruta se recalcule solo al reabrirla: **el ruteo requiere señal, la vigilancia normativa no.**

Módulo nuevo en el PWA: `src/utils/edt-offline.js` — carga el `.bin`, expone `distanciaCostaM(lat, lon)`.

**Reemplaza a `estimateDistanceToCoastNM()` de `maritime-geo.js`**, que hoy aproxima por Haversine contra una lista de puntos de referencia y se equivoca gravemente en fiordos, donde la costa está a 800 m en tres direcciones distintas. `getMaxCoastDistanceOnRoute()` debe pasar a consumir el mismo módulo.

---

## 9. Qué se elimina

| Archivo / tarea | Acción |
|---|---|
| `coastline-guard.js` | **Eliminar.** No hay cruces que detectar |
| `nautical-graph-router.js` | Eliminar |
| `corridor-router-service.js` | Eliminar |
| `osm-router-service.js` | Eliminar |
| Densificación de los 14 KML | **Cancelada.** Los KML se usan como capa de preferencia, no como topología |
| `red_nautica_chile_completa.geojson` | Degradar a capa visual únicamente |
| `estimateDistanceToCoastNM()` | Reemplazar por `edt-offline.js` |
| Opciones "Patrón de Nave Mayor", "Capitán de Nave", "Otra" en el selector de licencias | Eliminar del registro |
| Dependencias `networkx` y `searoute` | Quedan huérfanas al eliminar el motor de grafos. Desinstalar en la Fase 7 |

---

## 10. Criterios de aceptación

Tests en `tests/router/`, ejecutables sin servidor:

> ⚠️ **Los puntos de control deben usar coordenadas de muelle verificadas, no redondeadas.** Un redondeo a dos decimales desplaza el punto hasta ~2 km y lo puede dejar en tierra. Ocurrió con Corral: (−39,87 / −73,43) cae tierra adentro; la coordenada real de muelle (−39,887417 / −73,427446) da agua a 50 m. En producción este caso lo resuelve `snapToNavigable()` (§7.3); en los tests, no.

1. **Cero cruces de tierra.** Muestrear la polilínea de salida cada 25 m y verificar `confianza > 0` en el 100% de los puntos. Rutas de prueba: Anahuac→Melinka, Corral→Anahuac, Anahuac→Chacabuco, Quellón→Melinka
2. **Canal Tenglo — la ruta debe pasar POR el canal.** El origen **no** debe ser "Anahuac real" de `puertos_chile_nacional.json`: ese punto queda ~1,4 km al oeste de la boca del canal, ya del lado exterior, y una ruta desde ahí no tiene motivo para pasar por Tenglo.

   Derivar los puntos del propio dato: tomar el KML de Tenglo de `tmarea_nodos_nauticos_v1.json` (39 puntos), extraer sus dos extremos, y ubicar origen y destino más allá de cada uno sobre celda navegable. Existe alternativa real: rodear Isla Tenglo por el sur.

   **Criterio:** para **todos** los calados de la tabla de §6.1, la ruta debe mantenerse a menos de 150 m del eje del canal en su tramo central.

   > ⚠️ **Corrección respecto de versiones anteriores.** La v1.5 exigía que con `dMinM = 150` el canal se cerrara y el A* rodeara. **Esa predicción era errónea:** Canal Tenglo se navega con calado de 3 m en la práctica, y que el modelo lo cerrara era exactamente el defecto descrito en §7.1. El comportamiento correcto es que **esté abierto para todos los calados**. Un test que exija lo contrario valida el bug en vez de detectarlo.

3. **Corte CDC.** Perfil CDC: ninguna celda de la ruta con `d > 22.224 m`
4. **Radio PDB.** Perfil PDB: ningún punto a más de 3.704 m del puerto de zarpe
5. **Decisión canal interior vs. exterior — medida, no opinada.** Aplica a Paso Poniente Maillén, Paso Imelev/Lemuy y el cruce del Golfo Corcovado.

   Un test de decisión topológica solo es concluyente si cumple **tres condiciones**, verificables antes de correrlo:

   a. Origen y destino en **lados opuestos** del paso
   b. El paso es la ruta corta
   c. **Existe alternativa exterior navegable** — verificar con flood-fill previo: si al bloquear el paso el destino sigue siendo alcanzable, hay alternativa y el test sirve

   La condición (c) es la que invalida los casos con destinos muy cercanos: producen rutas triviales que no ponen a prueba ninguna decisión.

   Ubicación de los pasos, a derivar del raster (no de coordenadas de memoria): **Isla Maillén** al suroeste de Puerto Montt en el Seno de Reloncaví — el paso poniente corre entre isla y continente, la alternativa es rodearla por el este. **Isla Lemuy** al este de Chiloé frente a Chonchi — canales interiores entre Lemuy, Quinchao y Chiloé versus salir al Corcovado.

   **Criterio de evaluación objetivo.** No se juzga mirando el mapa. Correr tres variantes y comparar `max_dist_costa_mn` y `pct_en_resguardo` (§7.5):

   | Variante | Uso |
   |---|---|
   | Ruta libre (perfil PNM) | La que se evalúa |
   | Perfil PDB (`bandaMaxM` = 1500) | Cota inferior: máximo resguardo posible |
   | Línea recta origen–destino | Cota superior: máxima exposición |

   Si `max_dist_costa_mn` de la libre se acerca a la forzada, fue por canales. Si se dispara hacia la recta, salió al exterior. Queda como test permanente y reproducible.
6. **Destino centro de cultivo.** Devuelve tramos, incluido `aproximacion_final` cuando corresponda
7. **Rendimiento.** Anahuac→Chacabuco < 1,5 s con la jerarquía de tres niveles de §7.2. Warmup < 5 s. **Ningún caso puede terminar en OOM**: si no converge, error explícito
8. **No hay lagos.** Ninguna ruta atraviesa Llanquihue ni Todos los Santos. Los water polygons de OSM son solo océano y las riberas fluviales que se agregan (fuente 8) son ríos, no lagos, así que sale gratis — el test lo confirma
9. **Empaquetado correcto.** Round-trip de los 16 bits: empaquetar y desempaquetar 10.000 combinaciones aleatorias de (kml, confianza, distancia) debe devolver los valores originales sin pérdida
10. **Preferencia batimétrica.** Construir un caso sintético con dos rutas de longitud casi igual, una VERDE y otra ROJA: el router debe elegir la VERDE. Con la roja 40% más corta, debe elegir la roja (el factor 1.40 no debe ser prohibitivo)
11. **Declaración honesta.** `pct_batimetria` de cada ruta de prueba debe sumar 1.0 y coincidir con el conteo real de celdas por nivel. Este test protege contra que la app se presente como más segura de lo que es
12. **Corte de tramos.** Los tramos de la respuesta deben cortarse exactamente donde cambia el nivel de confianza, sin tramos de nivel mixto

---

## 11. Fases

| Fase | Contenido | Verificable por | Depende de |
|---|---|---|---|
| 1 | ✅ **COMPLETADA** — pipeline + tile `AUSTRAL_N` (6.177 × 12.345 = 76,3 M celdas antes del rebbox; regenerado a −39,5). Test 9, 10/10 puntos de control, conectividad Tenglo 250 m, QGIS verificado | Test 9 + inspección visual (§5.6) | — |
| 2 | `raster-router-service.js` con A* jerárquico **de 3 niveles**, LUT, snap, string-pulling | Tests 1, 2, 5, 6, 7, 12 | Fase 1 |
| 3 | Capa batimétrica: GMRT + IBCSO + sondas de derrotero → niveles VERDE | Tests 10, 11 | Fase 1 |
| 4 | Contrato `PerfilNavegacion` + perfiles por calado, licencia y clasificación **+ integración frontend §15** | Tests 3, 4 | — (normativa cerrada, §14) |
| 5 | EDT offline + `edt-offline.js` en el PWA | Alerta CDC funciona en modo avión | Fase 1 |
| 6 | Tiles `NORTE` y `AUSTRAL_S` | Cobertura nacional | Fase 3 |
| 7 | Limpieza: eliminar motores viejos (§9) | Repo sin código muerto | Fase 2 |

**No pasar a la fase siguiente sin los tests de la anterior en verde.**

Dos notas de secuencia:

- **La Fase 1 se genera deliberadamente sin batimetría.** Todas las celdas navegables salen ROJO o AMARILLO. Eso permite tener el router funcionando y verificable antes de pelear con GMRT, y la capa batimétrica de la Fase 3 se superpone sin tocar el router — solo cambia el contenido de 2 bits.
- **Ninguna fase queda bloqueada por normativa.** El cotejo está verificado y cerrado (§14); el único pendiente es el límite de bahía por Capitanía, que no impide implementar.

---

## 12. Mejoras sugeridas (no solicitadas, para evaluación)

1. **Caché de rutas por `(origen, destino, perfil)`.** Los puertos son finitos y los viajes se repiten mucho. Un hash simple ahorra la mayoría de los cálculos.
2. **Corrientes de marea como capa de costo adicional.** Canal Chacao corre a 8–9 nudos y decide si un viaje es viable o no. La arquitectura raster lo admite como otro `Uint8Array` alineado al mismo grid, sin tocar el A*. Es la mejora de mayor impacto operacional después de esto.
3. **Exportar la ruta como GPX.** Los patrones que tienen plotter la van a querer cargar. Son ~30 líneas de código y es un diferenciador comercial real.
4. **Receptor AIS propio para calibración.** Ver §6.1. Un dongle RTL-SDR de ~US$30 en Puerto Montt entrega tracks reales de barcazas y lanchas salmoneras. Es la forma más barata de convertir la banda de resguardo de estimación en medición, y sirve además para validar el motor completo contra lo que la gente efectivamente navega.
5. **Usar `pct_en_resguardo` en el consejo de zarpe.** Con viento sobre umbral, una ruta con 85% en resguardo es sustancialmente distinta de una con 40%. Ese matiz hoy no existe en P3 y sale gratis.

---

## 13. Advertencia que debe quedar en la interfaz

La evitación de tierra es **geométrica**. La profundidad solo está respaldada donde la capa de confianza batimétrica declara VERDE, y esa fracción es minoritaria en la zona austral.

Texto sugerido para el disclaimer permanente de P4:

> La línea trazada evita tierra según cartografía abierta y señala qué tramos cuentan con datos de profundidad. **Los tramos marcados en rojo no tienen batimetría disponible.** No reemplaza la carta náutica oficial del SHOA ni la ecosonda de la nave. La decisión de navegación es responsabilidad exclusiva del patrón.

El indicador `pct_batimetria` debe ser visible en P3 antes del zarpe, no solo en P4. Un viaje con 15% de fondo conocido es una decisión distinta a uno con 80%, y el patrón tiene derecho a saberlo antes de salir.

---

## 14. Estado del cotejo normativo

### Verificado y cerrado

| Materia | Fuente | Estado |
|---|---|---|
| Las 4 licencias deportivas y qué faculta cada una | TM-002, Art. 12 y 14 (D.S. 214/2015 mod. D.S. 126/2022) | ✅ |
| Límite CDC = 60 MN | TM-002, Art. 14 c | ✅ Corrige el 12 que hay en el código |
| Clasificación de embarcación y sub-clasificación costera | Circular A-41/014 | ✅ |
| Regla del mínimo entre ambos límites | Derivada de las dos anteriores | ✅ |
| Vela sin motor auxiliar ⇒ 12 MN | Circular A-41/014, C.2 | ✅ |
| Tabla eslora → AB | TM-002, Art. 28 | ✅ Resuelve backlog #4 para deportivos |
| Zarpe no exigido a deportivos | TM-002, Art. 34 | ✅ |
| Umbrales de nave menor por ámbito | TM-002 Art. 29 / Circular O-72/023 | ✅ |
| Umbral de viento costeras 26 kt | Circular A-41/013 | ✅ Ya implementado |

### Fuera de alcance (decisión de producto)

**Personal embarcado y dotación mínima.** Se rige por el permiso de zarpe, que la Autoridad Marítima resuelve antes de que el patrón abra la app. Tmarea no re-verifica habilitación en ámbito comercial: sería duplicar un control existente. Consistente con el principio ya establecido de que el zarpe en Tmarea es informativo.

### Único pendiente

**Límite de bahía por jurisdicción.** El TM-002 delega el número en la Autoridad Marítima competente y la Circular A-41/014 no lo repite. **No existe valor nacional vigente** — el reglamento derogado de 2004 fijaba 4 MN, pero la circular de 2015 clasifica bahía sin asignarle millas.

Se obtiene consultando cada Capitanía. Prioridad: Puerto Montt, Calbuco, Ancud, Quellón, Melinka.

Mientras no exista el dato, PLDB y PDB operan sin corte automático de distancia, con la advertencia visible en P3 y la restricción de banda (`bandaMaxM` = 1500) como único límite práctico. **No inventar un número.**

## 15. Integración con el flujo existente

> **Esta sección existe para evitar que se invente una estructura nueva.** El flujo de pantallas, el almacenamiento y el objeto de traspaso **ya están construidos y funcionando**. Lo que sigue son adiciones y correcciones puntuales, no un rediseño.

### 15.1 Lo que ya existe y no se toca

```
P1    Perfil del patrón      → localStorage 'user_profile'   { licenseType, ... }
P1.1  Perfil técnico de nave → localStorage 'vessel_profile' { eslora, manga,
                                calado, vel_crucero, consumo_nominal, ... }
P2    Voyage setup           → construye voyageData
P3    Verificación           → consume voyageData
P4    Navegación activa      → consume la ruta
```

`voyageData` ya transporta: `vessel` (con `licenseType` mergeado desde `user_profile`), `puerto_zarpe`, `destinos[]`, fechas de zarpe y recalada, combustible, `is_sport_profile`, `license_validation` y `nearest_capitania`.

**Principio de diseño ya establecido:** el patrón no siempre comanda la misma nave. P1.1 pide los datos de la embarcación *que operará en este viaje*, no una nave fija del usuario. Todo campo que dependa del casco vive en P1.1 y se revalida por viaje.

### 15.2 Campos nuevos en P1.1

| Campo | Valores | Condición de aparición |
|---|---|---|
| `uso` | `pesca` \| `acuicultura` \| `transporte` \| `recreativo` | Siempre |
| `propulsion` | `vela` \| `motor` \| `mixto` | Siempre |
| `clasificacion` | `ALTA_MAR` \| `COSTERA_60` \| `COSTERA_12` \| `BAHIA_VELA` \| `BAHIA_MOTOR` | Solo si `ambito === 'deportivo'` |
| `tiene_motor_auxiliar` | boolean | Solo si `propulsion === 'vela'` |
| `motor_operativo` | boolean | Solo si `tiene_motor_auxiliar === true` |

**`clasificacion` se pregunta, no se infiere.** Está escrita en el certificado de matrícula y en el certificado de navegabilidad del usuario. Derivarla de la eslora o del tipo de casco produce un cotejo incorrecto.

**`ab` se autocompleta** desde `eslora` con la tabla del Art. 28 (§6.2) cuando `ambito === 'deportivo'`, con el valor editable. Para ámbito comercial se sigue pidiendo.

### 15.3 Corrección conceptual: el ámbito no sale de la licencia

Hoy `is_sport_profile` se deriva de `SPORT_LICENSE_SET`, es decir del tipo de licencia. **Eso debe cambiar.**

```js
// Actual — incorrecto
const is_sport_profile = SPORT_LICENSE_SET.has(licenseType);

// Correcto
const ambito = nave.uso === 'recreativo' ? 'deportivo' : 'comercial';
```

**Por qué importa:** licencia y ámbito son independientes, y su combinación inválida es justamente lo que hay que detectar. Una licencia deportiva no habilita actividad comercial (§6.2, Art. 22). Si el ámbito se deduce de la licencia, ese caso se clasifica como deportivo y la infracción nunca se ve.

```js
// Regla de bloqueo, nueva
if (ambito === 'comercial' && LICENCIAS_DEPORTIVAS.has(licenciaPatron)) {
  bloqueos.push('Una licencia deportiva no habilita actividad comercial');
  habilitado = false;   // el router no traza
}
```

`is_sport_profile` puede conservarse como alias de `ambito === 'deportivo'` para no romper los componentes que ya lo consumen (`DeportiveAlerts.jsx`, tabs de destino en P2, badge de perfil).

### 15.4 Correcciones a `license-rules.js`

| Ítem | Acción |
|---|---|
| `CDC_MAX_COAST_NM` | 12 → **60** |
| `PDB_MAX_DISTANCE_NM = 2` | **Eliminar.** Sin respaldo normativo; se reemplaza por advertencia de Capitanía |
| `LICENSE_ALIAS_MAP` | Agregar **PLDB** (Patrón de Lancha Deportiva de Bahía) con sus slugs. Hoy solo están las tres antiguas |
| `SPORT_LICENSE_SET` | Renombrar a `LICENCIAS_DEPORTIVAS` e incluir PLDB. Deja de usarse para determinar ámbito; pasa a usarse solo para el bloqueo de §15.3 |

**Función nueva:**

```js
/**
 * Límite efectivo de distancia a costa, en metros.
 * Aplica el mínimo entre licencia y clasificación de nave,
 * más el tope de 12 MN por vela sin motor auxiliar operativo.
 * Devuelve null si no hay límite aplicable.
 */
function limiteEfectivoM(licencia, clasificacion, nave) → number | null
```

Tabla base (§6.2):

```
Licencia:        PLDB, PDB → null + advertencia Capitanía
                 CDC       → 111120   (60 MN)
                 CDAM      → null
                 PNM       → null     (ámbito comercial)

Clasificación:   ALTA_MAR     → null
                 COSTERA_60   → 111120
                 COSTERA_12   → 22224
                 BAHIA_*      → null + advertencia Capitanía

Tope por vela:   propulsion === 'vela' && !motor_operativo → 22224
```

El resultado es el **menor de los no nulos**; si todos son nulos, no hay corte.

### 15.5 Dónde se ejecuta cada cosa

| Cálculo | Pantalla | Motivo |
|---|---|---|
| Ámbito y bloqueo licencia × uso | **P2** | Primera vez que coexisten licencia y nave |
| `limiteEfectivoM()` | **P2** | Ídem. Alimenta `license_validation` |
| Perfil de costo por calado y licencia | **P2** | Entra al `PerfilNavegacion` que consume el router |
| Trazado de ruta | **P3** | Ya con el perfil resuelto |
| `max_dist_costa_mn` vs límite | **P3** | Verificación posterior al trazado (§7.5) |
| Vigilancia en vivo del límite | **P4** | Con el EDT offline (§8) |

`license_validation` mantiene su forma actual dentro de `voyageData`; solo cambian los números que devuelve y se le agrega el motivo del límite (licencia, clasificación o vela sin motor), para que P3 pueda explicar **por qué** aplica ese tope y no otro.

### 15.6 Efecto sobre las advertencias de P3

Dos recordatorios contextuales nuevos, ambos verificados (§6.2):

- **Balsa salvavidas** — nave `COSTERA_12` en travesía distante de centro poblado con medios de asistencia. Aplica a casi toda ruta austral: Corcovado, Moraleda, cualquier tramo al sur de Quellón
- **Traje antiexposición** — recomendado para navegación en aguas australes

Y uno derivado del router:

- **`pct_batimetria`** visible antes del zarpe (§13). Un viaje con 15% de fondo conocido es una decisión distinta a uno con 80%

---

*MisilUp SpA · Puerto Montt · Documento de trabajo interno*
