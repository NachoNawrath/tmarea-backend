# PROCEDENCIA — toponimos_12100_47_2026-08-20

Qué fuente se consultó, cuándo, cómo, y qué clase tiene cada una.

**Clase de toda esta sesión: RECONOCIMIENTO.** Fuentes citables, **no incorporadas**.
Nada de esto se promovió a `data/`, ni a la base, ni a la capa. No se construyó
geometría. No se tocó `src/` de ningún repo.

---

## 1. La resolución — insumo heredado, no re-descargado

`_bitacoras/limite_puerto_12100_47_2026-08-20/` — Res. D.G.T.M. y M.M. Ex.
12100/47, ANEXO "A" punto 1. Descargada y verificada por la sesión del
2026-08-20, con su `sha256` y su `.gitattributes` propio.

Esta sesión **no la volvió a bajar**. Consumió sus dos salidas derivadas:
`entradas_punto1.json` (49 entradas con su cuerpo literal) y
`clasificacion_punto1.json` (los ejes de formato y de coordenadas).

## 2. Las coordenadas de las bahías — insumo del propio árbol

`scripts/seed-bahias-sitport.js`, 162 bahías con `lat`/`lng`.
El par entrada→bahía sale de `06_cruzar.txt` del 2026-08-20: calce EXACTO
(11) y calce PROBABLE **aceptado** (33). **Los 6 pares rechazados no anclan
nada**: si la revisión manual los mató, no pueden servir de ancla.

## 3. OpenStreetMap, vía Overpass API

- **Consultado:** 2026-08-20, entre 20:44 y 21:30 (UTC-04:00).
- **Base OSM:** `timestamp_osm_base` 2026-08-21T00:19Z.
- **Instancias:** `overpass-api.de`, `overpass.kumi.systems`,
  `overpass.private.coffee`. Son **tres instancias del mismo servicio sobre la
  misma base**: rotar reparte carga, **no agrega procedencia**. No son tres
  fuentes y no se cuentan como tres.
- **Sin cuenta, sin instalar nada.** POST, `User-Agent` propio.
- **Vocabulario de la consulta**, declarado y aplicado igual en las 39 cajas:
  todo elemento **con `name`** dentro del bbox, filtrado a
  `natural=(cape|island|islet|rock|reef|peak|hill|bay|beach|spit|shoal|strait|coastline|water|bare_rock)`
  · `place=(island|islet|locality|isolated_dwelling|village|hamlet)`
  · `man_made=(lighthouse|beacon|pier|breakwater|quay|jetty)`
  · `seamark:type=*` · `waterway=(river|stream)` · `landuse=cemetery`
  · `amenity=grave_yard` · `bridge=*`.
- **Licencia: ODbL.** Ver §6.

### El fallo de instrumento que se declara y no se esconde

`06_buscar_osm.js` corrió con 1,8 s entre consultas. `overpass-api.de`
respondió **429 en la cuarta** y después **cortó la conexión (http 0) en 28
más**: **7 de 39 cajas** quedaron traídas.

**Eso es un cero del instrumento, no del dato.** Si esas 32 cajas se hubieran
leído como «no hay candidatos», la medición habría reportado 32 entradas sin
resultado que **nunca se consultaron** — y el número que evita una compra
habría salido de un silencio. `06b_buscar_osm_reintento.js` reanuda solo lo que
no tiene `http 200` guardado, con 8 s entre consultas, backoff de 45 s y
reintento. **Toda caja que siga sin traerse se reporta como CAJA NO TRAÍDA, en
su propia casilla, nunca dentro de «no encontrado».**

## 4. GeoNames — dump de Chile

- **URL:** `https://download.geonames.org/export/dump/CL.zip`
- **Consultado:** 2026-08-20, 20:52 (UTC-04:00). HTTP 200, `curl.exe -sS -L`.
- **sha256 del zip:** `9a54f3122ed5314294870a7a4c14cf477d78a678da0f5a07e879b96173e2f50e`
- **Tamaño:** 1.421.152 B comprimido · `CL.txt` 6.056.038 B · **46.468 filas**.
- **De clase relevante:** 21.207 filas, sobre 33 `feature codes` declarados en
  `07_buscar_geonames.js`.
- **Sin cuenta.** El *API* de GeoNames pide usuario; **el dump no**. No se creó
  ninguna cuenta.
- **Licencia: CC-BY 4.0.**
- **Dónde vive:** en el scratchpad de la sesión, **no en el repo**. Son 6 MB y
  lo que la bitácora necesita es la evidencia derivada (`geonames_crudo.json`),
  no el gazetteer entero. El `sha256` de arriba es lo que permite reproducirlo.

**Por qué esta fuente vale y no es redundante con OSM:** el sondeo midió que
**490 de los 1.156 `natural=cape` de Chile en OSM traen `source=IGM`**. OSM-Chile
bebe del gazetteer del Estado. GeoNames no. Dos fuentes que se copian una a
otra no son dos fuentes; ésta es la única de las tres con origen independiente.

## 5. Nominatim — solo para las anclas de respaldo

- **Consultado:** 2026-08-20, 20:47. 5 consultas, 1 cada 1,2 s (política de uso:
  1/s), `User-Agent` propio, `countrycodes=cl`.
- **Para qué:** geocodificar el nombre del puerto de las 5 entradas sin bahía.
- **Un falso positivo cazado y publicado:** para `#3 JUNIN` devolvió
  *«Eleuterio Ramírez, Población Naval Marinero Ugarte, Iquique»*,
  `highway/tertiary` — **una calle**. Ver §11 de `04_criterio_busqueda.txt`.

## 6. LICENCIAS — lo que hoy no obliga a nada y mañana sí

**Sostener estas coordenadas en la bitácora como RECONOCIMIENTO no activa
ninguna cláusula.** Es la misma clase que la resolución del 2026-08-20: fuente
citable, no incorporada.

Lo que cambia si esto alguna vez alimenta una **capa publicada**:

| | costo | condición |
|---|---|---|
| **OSM** | gratis | **ODbL: compartir-igual.** Una base de datos derivada que se distribuya queda bajo ODbL, y hay que atribuir |
| **GeoNames** | gratis | **CC-BY 4.0: atribuir.** Sin compartir-igual |
| **Derrotero SHOA** | **cuesta** | sin compartir-igual, y hoy **sin licencia propia del proyecto** |

**Las dos cosas pesan y por eso van juntas:** OSM es gratis y trae esa
condición; el derrotero cuesta y no la trae. Ninguna de las dos es
gratis-y-sin-condiciones. **La decisión es del owner y queda escrita como fila
propia del declarativo, no como nota al pie de una bitácora.**

## 7. Lo que NO se usó, con su motivo

- **API de GeoNames** — pide crear cuenta. No se crean cuentas. El dump da lo
  mismo sin ninguna.
- **`chile-latest.osm.pbf`** (344 MB en `C:/Users/katia/`) — sin lector en el
  PATH. Decisión del owner: no se instala nada ni se escribe un lector de PBF.
  Overpass da lo mismo y más fresco.
- **IDE Chile / IGM por separado** — declarado probablemente redundante: el
  gazetteer del Estado ya está dentro de OSM (§4).
- **Cualquier derrotero** — el proyecto no tiene licencia propia y los
  ejemplares existentes están licenciados a otra empresa. **No se abrió, no se
  consultó, no se citó.** Tampoco se usó como fuente de coordenadas
  `docs/TMAREA_Extraccion_Derrotero_SHOA.md`, que es una espec del propio
  proyecto pero podría contener datos de esa publicación: el filo se respeta
  del lado seguro.

### El reintento tampoco pudo, y eso cambia qué instrumento midió qué

`06b_buscar_osm_reintento.js` no llegó a correr útilmente. Al momento del
reintento:

- **`overpass-api.de`** dejó de conectar por completo (`curl: (28) Could not
  connect`, 21 s) — el rebote del 429 se convirtió en corte de conexión.
- **`overpass.kumi.systems`** y **`overpass.private.coffee`** devuelven
  `HTTP 500 Internal Server Error` **hasta para la consulta más trivial que
  existe** (`[out:json];node(240109189);out;`). Eso descarta que el problema
  fuera mi consulta: es el servicio.

**Quedaron 7 cajas de 39 traídas por Overpass** (entradas 1, 2, 3, 8, 9, 12, 13
— 773 elementos). Las otras 32 **no se consultaron por Overpass** y así se
reportan: **CAJA NO TRAÍDA**, nunca «sin candidatos».

**Sustitución declarada:** `06c_buscar_nominatim.js`, mismo OSM por otra
puerta. Nominatim acota con `viewbox` + `bounded=1`, devuelve `class/type`
(sirve a V3) y `display_name` con la región resuelta (sirve a V2). **No es una
cuarta fuente**: es la misma base OSM. No suma procedencia.

**Lo que la sustitución sí pierde:** Overpass volcaba *la caja entera*, que es
la evidencia con que un «no encontrado» se sostiene y el único modo de cazar
*otro nombre para el mismo lugar*. Nominatim consulta por nombre, no vuelca
cajas. **Ese hueco lo cubre GeoNames**, que está **entero y en local** (21.207
filas de clase relevante) y no depende de ningún servicio: el volcado de caja
del pase 2 sale de ahí.
