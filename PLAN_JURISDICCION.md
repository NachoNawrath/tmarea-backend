# PLAN DE TRABAJO — RESOLUCIÓN DE JURISDICCIÓN POR CAPITANÍA

> **Documento de trabajo, no informe.** Se actualiza **al cerrar cada etapa**, no al final.
> Cada etapa cierra con evidencia citada; cada decisión queda con su fecha y su motivo.
> Si algo se mide y contradice lo escrito acá, manda la medición y el documento se corrige.
>
> Rige `CONTRATO_MOTOR.md` v1.7. Este documento **no crea reglas**: donde una regla es
> del contrato, se cita; donde es de producto, se dice que lo es.

**Versión del documento:** 1.6 · **Escrito:** 2026-08-10 · **Última actualización:** 2026-08-11
**Estado:** plan aprobado. Especificación aprobada (S5 abierta como D4). **E0.1 cerrada; sigue E0.2/E0.3.**

**Objetivo:** que la app resuelva jurisdicción por **Capitanía de Puerto**, con la capa
derivada del **D.S. 991**, y con **R1** (el aviso de jurisdicción sin límite cargado)
funcionando sobre ella.

**Cómo refrescar el inventario del §1:**

```bash
node scripts/fase5_inventario_insumos.js
```

---

## 1. INVENTARIO DE INSUMOS

Medido el **2026-08-10**. Evidencia cruda: `_bitacoras/fase6A_inventario_2026-08-10/00_inventario.txt`.
Nada de esta sección es supuesto: sale del script de arriba.

### 1.1 Base de datos — PostgreSQL 16.14 / PostGIS 3.5

| relación | tipo | filas | geom nulas | geom vacías | km² |
|---|---|---:|---:|---:|---:|
| `bahia_jurisdicciones` | matview | 163 | 0 | **33** | 319.342 |
| `bahia_jurisdicciones_v1_backup` | matview | 163 | 0 | 28 | 4.725.948 |
| `bahias_sitport` | tabla | 163 | 0 | 0 | — (puntos) |
| `jurisdicciones_decreto` | tabla | 64 | **10** | 0 | 3.474.929 |
| `costa_osm` | tabla | 78.653 | 0 | 0 | 2.850.867 |
| `costa_osm_sub` | tabla | 130.537 | 0 | 0 | 2.850.893 |
| `ne_land` | tabla | 11 | 0 | 0 | 146.841.798 |
| `nodos_maritimos` | tabla | 781 | 0 | 0 | — (puntos) |
| `batimetria` | tabla | 1.179.451 | 0 | 0 | — (puntos) |
| `mapa_base_multipoligonos` | tabla | 76.196 | 0 | 0 | 5.102 |
| `jurisdicciones_ds991` | — | **NO EXISTE** | | | |

Índices GIST presentes en todas las capas que se consultan por geometría.

*Dos notas de lectura, para que la tabla no engañe:* "área 0" en tablas de puntos no es un
defecto, por eso la columna dice "—". Y `batimetria`, `mapa_base_multipoligonos`,
`nodos_maritimos` y `seamarks_puntos` **no son insumos de jurisdicción**: alimentan ruteo y
mapa. Se listan porque el inventario es del estado real de la base, y se dejan fuera del
análisis de "¿sirve / qué le falta?" a propósito.

**`bahia_jurisdicciones` — la capa que el motor consulta hoy.**
Contiene 163 celdas de Voronoi sobre los puntos SITPORT, recortadas contra `ne_land` y
acotadas a 80 km del punto de cada bahía.
*¿Sirve?* **No, y el contrato ya lo dice** (§7 bug 4: contradice INV-3.3). Se usa porque es
lo único que hay.
*¿Qué le falta?* Todo lo que la haría una capa de jurisdicción: sus límites no son los del
decreto, su unidad es la bahía y no la Capitanía, y **33 de sus 163 celdas están vacías**.
*¿Cómo se corrige?* Se reemplaza. E4 y E3.

**Las 33 celdas vacías, identificadas — y no son ruido.** Son, casi todas, **cuerpos de agua
interiores**: Lago Villarrica (y sus dos sectores), Llanquihue, Ranco, Maihue, Puyehue,
Rupanco, Chapo, Todos los Santos, Tagua Tagua, Calafquén, Riñihue, Neltume, Pirehuico,
Pellaifa, Pullinque, Panguipulli, General Carrera, O'Higgins, Vichuquén, Río Bueno, Río
Palena, Valdivia Fluvial, Valdivia Conectividad, Carahue Sector Lago, más Isla de Pascua,
Bahía Catalina, Fildes, Paraíso, Chile, Estero Pichicolo y Canal Utarupa.

> **Hallazgo principal del inventario.** La resta de tierra borra los lagos por definición —
> un cuerpo de agua interior está rodeado de tierra. Es exactamente lo que INV-3.5 advierte.
> **Consecuencia hoy: toda la navegación lacustre es invisible para el motor.** Una ruta en
> el Lago Llanquihue devuelve cero restricciones, siempre, sin error ni aviso. INV-3.5 declara
> las lacustres "jurisdicciones plenas, con Capitanía, condición de puerto y usuarios reales".
> Son 6 jurisdicciones lacustres del decreto y más de veinte bahías del catálogo.

**`jurisdicciones_decreto` — un build anterior de la capa del decreto.**
64 filas con la misma clave que el insumo (`id`, `nombre`, `gobernacion`, `ambito`), 54 con
geometría. Marcada **SUPERSEDIDA Y DESACTUALIZADA**.
*¿Sirve?* No para producción. **Sí como andamio de medición** (E1): tiene la forma y la clave
de la capa final, que es lo que hace falta para medir el cambio de unidad sin esperar a C3.

**`costa_osm` / `costa_osm_sub` — la costa fina, cargada y verificada.**
*¿Sirve?* Sí. Declarada con roles en `geodata/costa/capas_costa.json`, con procedencia y
sha256. *¿Qué le falta?* Nada para su rol; falta que la capa nueva la use en vez de `ne_land`.

### 1.2 Insumo del decreto — `data/decreto/jurisdicciones_v2.json` (324 KB, v2, 2026-08-09)

- **64 jurisdicciones**: 52 marítimas, 6 lacustres, 2 insulares remotas, 4 antárticas.
- `participa_matching`: **54 sí / 10 no**. `estado_geometria`: 54 cerrable / 10 no_cerrable.
- Punto representativo: **48 con testigo**, 6 sin testigo con causa declarada, 10 sin testigo
  y sin causa (son las 10 sin geometría).
- 25 con contorno y tramos; **0 con sectores**; 6 con cuerpos lacustres.
- 61 fronteras declaradas · 73 puntos notables · 7 convenciones.
- Recetas: `banda_paralelos` 26 · `corte_y_ancla` 17 · `anillo` 8 · `union_cuerpos` 6 · sin receta 7.

*¿Sirve?* Sí. Es la fuente versionada que INV-3.7 exige, con auditoría limpia y prueba de
mordida 12/12.
*¿Qué le falta?* Tres cosas concretas: **(a)** los 10 `no_cerrable`, cada uno con su causa ya
escrita; **(b)** el **Art. 2 del D.S. 991** que INV-3.3 cita no está en el archivo —
'mar territorial', 'zona contigua' y 'plataforma continental' no aparecen en ninguna parte,
así que esa cita no es reproducible desde el repositorio; **(c)** `sectores` está vacío en las
64, y SITPORT sí publica a nivel de sector.
*¿Cómo se corrige?* (a) es trabajo de fuente externa, declarado; (b) es decisión D6; (c) es
deuda de §8.

Acompañan: `adjudicacion_tramos.json` (16 KB), `cotejo_lacustre_adjudicado.json` (20 KB,
**el cotejo lacustre ya está adjudicado**), `zonas_aviso.json` (9 KB, R1 pieza 1),
`capa_consultada.json` (2 KB, la costura que hace que cambiar de capa sea cambiar un dato),
y `jurisdicciones_capitanias.json` (102 KB, el insumo v1 — histórico).

### 1.3 Mapa operativo — `src/data/bahia-capitania-map.json`

163 bahías, 0 sin teléfono, **24 sin Capitanía atribuida**, 38 nombres de Capitanía.

*¿Sirve?* Hoy sí, para lo que hace: poner nombre y teléfono en una tarjeta.
*¿Qué le falta?* **Es el insumo menos preparado para lo que viene.** Al cambiar la unidad
pasa de cosmético a normativo: decide si una restricción aplica. Su estado medido:

| problema | medida |
|---|---|
| bahías sin Capitanía atribuida | 24 |
| nombres de Capitanía que no calzan con el insumo | 4 |
| — `Hornopirén` → candidato `Rio Negro Hornopiren` | 8 bahías |
| — `Cisnes` → candidato `Puerto Cisnes` | 18 bahías |
| — `Chacabuco` → candidato `Puerto Chacabuco` | 10 bahías |
| — `Guayacán` → **sin candidato en el insumo** | 1 bahía (86) |
| jurisdicciones del decreto sin ninguna bahía atribuida (con nombre exacto) | **30 de 64** |
| discrepancias de clase C medidas | 5 jurisdicciones, 6 bahías |

Las 30 sin bahía bajan al resolver las 3 variantes de nombre, pero quedan casos reales:
`patache`, `tocopilla`, `taltal`, `chanaral`, `tongoy`, `papudo`, `algarrobo`, `pichilemu`,
`san_vicente`, `lota`, `melinka`, los seis lagos, los cuatro antárticos y las diez sin
geometría.

*¿Cómo se corrige?* E0. Y con validador que muerda, como el de `zonas_aviso.json`.

### 1.4 SITPORT — consultado en vivo el 2026-08-10

- `consultaRestricciones`: **52 registros** — `TODOS` 31, `FRENTE ATRAQUE` 18,
  `INSTALACION` 2, sin tipo 1. **36 bahías distintas.**
- Campos: `bahia, FCinicio, FCTermino, tipo, NombreInstalacion, FrenteAtraque, SitioAtraque,
  Detalle, Observacion, paralizar, nzarpe, nrecalada, tiporestriccion, MotivoRestriccion,
  **AreaRestriccion**, NaveRecibe, IDRestriccion, GLBahia, idipbahia, glnombre`
- `totalPronostico`: 48 registros · `consultaBahias`: **164 registros**

*¿Sirve?* Sí, y es la fuente autorizada del §5.
*¿Qué le falta?* **Nuestro catálogo está desincronizado.** SITPORT publica **164** bahías y
nuestras tres fuentes internas tienen 163. La que sobra es
`IDBahia 257 — RÍO COCHRANE`. Hoy, si Río Cochrane publica una restricción, el motor la
descarta en silencio: no tiene celda, no tiene entrada en `BAHIA_COORDS`, y el `continue` la
elimina sin dejar rastro. **Es un falso negativo silencioso vivo, verificado.**
*¿Cómo se corrige?* E0: detección de drift del catálogo, no una resincronización de una vez.

> **Corrección medida el 2026-08-11 (E0.1) — el párrafo de arriba se queda corto y no se
> borra (CLAUDE.md §3.3).** La divergencia **no es de una entrada**. `Totalpronostico`
> publica el id **108**, que no está en ninguna de nuestras cuatro fuentes internas **ni en
> `consultaBahias`**, el propio endpoint de catálogo de SITPORT. O sea que el catálogo de la
> fuente **no es el superconjunto de los ids que la fuente usa**, y compararse contra él deja
> pasar el caso que hoy está vivo: el 108 trae pronóstico ahora mismo y `/weather-ruta` lo
> descarta en cada llamada (`sitport-routes.js:383`), mientras que la 257 hoy no publica nada.
> Por eso el control compara contra la **unión de los tres endpoints**. Qué bahía es el 108 y
> desde cuándo aparece **no está determinado**: el pronóstico no trae nombre y no hay captura
> previa de ese endpoint en el repositorio. Evidencia: `_bitacoras/e01_drift_catalogo_2026-08-11.txt`.

`AreaRestriccion` existe en la fuente y el motor no lo lee. Es el campo que INV-3.4 nombra
para acotar el área dentro de la jurisdicción.

### 1.5 Capas en disco — `geodata/`

`costa/land-polygons-split-4326.zip` 903 MB (OSM, cargada) · `costa/DPA_2023.zip` 304 MB
(**descargada y NO cargada**) · `ne_10m_land.*` 7 MB (cargada) ·
`lagos/Inventario_Lagos.shp` 3 MB (cargada, con procedencia).
`capas_costa.json` declara cuatro capas con rol: `costa_osm`, `ne_land`, y dos **sin tabla**
(`dpa_2023`, `mma_linea_litoral`).

*¿Qué le falta?* `DPA_2023` está en disco y sin cargar. Es el insumo de P1 (límite exterior
desde tierra chilena en vez de argentina).

### 1.6 El código que resuelve jurisdicción hoy

| pieza | qué hace | estado |
|---|---|---|
| `bahiasEnRutaPostGIS` | `ST_Intersects` ruta × celdas → set de `bahia_id` | unidad equivocada (INV-3.3) |
| filtro de restricciones | descarta si su `bahia` no está en el set | contradice INV-3.4 |
| `BAHIA_COORDS` | 163 coords escritas en `sitport-routes.js` | duplica `bahias_sitport`; da `orden_en_ruta` y `fondeadero_previo` |
| `getCapitaniaByBahiaId` | id → nombre + teléfono | **caso por defecto silencioso** (`'Desconocida'`) |
| exclusión `zarpe_id`/`recalada_id` | excluye del listado de tránsito | **código muerto: la PWA nunca los envía** |
| `cobertura-jurisdiccional` | R1 pieza 2 | aplicada, **criterio en observación** |
| `zonas-aviso` | R1 pieza 1 | aplicada y limpia |

---

## 2. ESPECIFICACIÓN — QUÉ VE EL PATRÓN CUANDO ESTO ESTÉ TERMINADO

Escrita en términos de pantalla. De acá salen los criterios de aceptación de cada etapa.
Cada punto lleva de dónde sale: **[C]** contrato, **[P]** decisión de producto.

> **Los nueve puntos quedaron APROBADOS por el dueño del producto el 2026-08-10**, con una
> salvedad: **S5 queda abierta como D4**. Es el único [P] puro — no hay regla escrita en
> ninguna parte y el código que la implementaba esta muerto —, asi que lo que se decida ahi
> se convierte en la regla. El resto de los ocho puntos son criterio de aceptacion firme.

**S1 · Ve todas las Capitanías que su ruta atraviesa.** No las bahías cercanas: las
Capitanías cuyo territorio cruza. Si la ruta pasa por tres, ve tres. **[C** INV-3.1, INV-3.3**]**

**S2 · Ve toda restricción vigente de esas Capitanías, aplique o no a su nave.** Las que no le
aplican, en sección informativa, nunca ocultas. Una restricción publicada bajo el nombre de
una bahía le llega si su Capitanía está en la ruta, aunque su ruta no pase por esa bahía.
**[C** INV-1.2, INV-3.4**]**

**S3 · Si su ruta cruza una Capitanía sin límite cargado, se le dice.** En su propio bloque,
nunca entre las restricciones, con la Capitanía nombrada y su teléfono cuando se pueda
nombrar sin inventarla, y con la derivación genérica cuando no. Escala el veredicto a **U**,
nunca a U+V. **[C** INV-3.6**]**

**S4 · Si navega en un lago, ve la condición de su lago.** Hoy no ve nada. Las jurisdicciones
lacustres son plenas. **[C** INV-3.5**]**

**S5 · Ve el estado de su puerto de zarpe y de recalada una sola vez.** No duplicado entre el
bloque de puerto y el de tránsito. **[P]** — hoy no hay regla escrita y el código que la
implementaba está muerto.

**S6 · El veredicto es el máximo de todas las fuentes y nunca se contradice con lo que hay
debajo.** No hay verde con algo ámbar en la misma pantalla. **[C** INV-1.1, INV-1.3**]**

**S7 · Cada mensaje trae su cita, o dice explícitamente que no hay cita porque no hay norma
sino un dato que nos falta.** **[C** §10**]**

**S8 · Cuando el motor no puede evaluar algo, lo dice.** Nunca un fallo se presenta como
"no hay nada". **[C** INV-3.6, INV-0.2**]**

**S9 · Ninguna restricción publicada por SITPORT desaparece sin registro.** Si llega una
bahía que no conocemos, se registra como defecto; no se descarta en silencio. **[C** INV-3.6**]**

### Lo que esta especificación NO promete

- Nivel de **sector**: el motor evalúa a nivel de Capitanía, que es el envolvente — muestra de
  más, nunca de menos. `AreaRestriccion` queda como deuda declarada. **[C** nota de alcance de INV-3.4**]**
- **Cobertura completa del territorio**: 10 jurisdicciones seguirán sin geometría; lo que
  cambia es que se avisa en vez de callar.

---

## 3. ETAPAS

Revisadas contra §1 y §2. **Dos cambios respecto de la propuesta anterior**, los dos porque
el inventario los obligó:

1. **El ámbito lacustre se separa y se adelanta** (E3). Es la carencia más grande y completa
   que hay hoy, y **no depende de C3** — la separación lateral marítima no tiene nada que ver
   con un lago. Requiere una decisión: partir el gate de construcción por ámbito (D3).
2. **El andamio de medición usa `jurisdicciones_decreto`**, que existe con 54 geometrías y la
   clave correcta, en vez de fabricar uno disolviendo Voronoi. Más barato y más parecido a la
   forma final.

---

### E0 · Higiene del dato de identidad
**Depende de: nada. Empieza ya.** Frente dato.

Qué la hace necesaria: al cambiar de unidad, `bahia-capitania-map.json` decide si una
restricción aplica. Hoy tiene 24 bahías sin Capitanía, 3 variantes de nombre (36 bahías),
`Guayacán` sin contrapartida, 5 discrepancias de clase C, y el catálogo desincronizado de
SITPORT (bahía 257).

Qué desbloquea: E1, E5 y E6. Sin esto, el cambio de unidad se hace sobre un join roto.

**E0.1 · Río Cochrane — primero, y sin esperar al resto.** Bahía 257 existe en SITPORT y no en
ninguna de nuestras tres fuentes. Es un falso negativo vivo, de una entrada, y no depende de
nada. Va primero. Y el arreglo no es agregar la fila: es que **el drift del catálogo se
detecte y se reporte**, porque SITPORT va a volver a moverse. Agregar la bahía es la
consecuencia, no el trabajo.

**E0.2 · El registro de ámbitos publicados** (por D3). Dato declarado, hermano de
`zonas_aviso.json`: qué ámbitos están publicados en la capa que el motor consulta y cuáles no,
cada uno con su causa. Sin dependencias, y es lo que le permite a INV-3.6 avisar sobre un
ámbito entero que falta.

**E0.3 · El join** — las 24 sin atribución, las 3 variantes, `Guayacán`, las 5 clase C, y
separar cuáles de las 30 jurisdicciones sin bahía son un problema y cuáles son jurisdicciones
donde SITPORT no publica.

> **Insumo nuevo, encontrado en E0.1 (2026-08-11).** SITPORT expone **13 endpoints** y el
> proyecto consumía 3. Dos de los otros dan el join que esta sub-etapa tiene que reparar:
> `consultaCapuertoRestriccion` (64 filas: repartición → nombre de Capitanía) y
> `Totalgeneral` (64 elementos: Capitanía + su bahía de medición). Cruzados con
> `consultaBahias.CdReparticion` atribuyen Capitanía a **cada** bahía del catálogo.
> Comprobado sobre dos de las 24 sin atribuir: 128 Lago General Carrera y 203 Lago O'Higgins
> caen bajo la repartición 235 = Capitanía de Puerto Lago Gral. Carrera.
> **Es fuente operativa, no normativa**: el mapa no revoca al decreto (fase5R), así que cada
> atribución se coteja igual. Lo que cambia es que ahora hay contra qué cotejar.
> Crudo en `_bitacoras/e01d_d7_y_257_2026-08-11/`.

**Aceptación:** toda bahía del catálogo resuelve a una jurisdicción del insumo o declara por
qué no; el validador muerde si deja de calzar; el drift del catálogo SITPORT se detecta y se
reporta en vez de descartarse (S9); el registro de ámbitos coincide con lo que hay en la base
o la carga se detiene.

### E1 · Andamio de medición
**Depende de: E0.** Frente motor.

Qué la hace necesaria: todo lo del cambio de unidad se puede medir hoy si hay una capa por
Capitanía consultable. `jurisdicciones_decreto` lo es. Declararla en `capa_consultada.json`
como **andamio**, con un campo que lo marque y que impida promoverla.

Qué desbloquea: E2 sin esperar C3. **Es lo que saca al proyecto del camino crítico único.**

**Aceptación:** el arranque falla si la capa declarada es el andamio fuera de un contexto de
medición.

### E2 · Diseñar y medir el cambio de unidad
**Depende de: E1. No toca el motor: produce números y un diseño.**

Cuatro cosas que hoy no existen:

1. **Medición del volumen.** Cuántas restricciones más —o menos— por ruta. La dirección
   esperada es hacia arriba por INV-3.4, pero **no es certeza lógica**: las celdas Voronoi no
   están anidadas en las Capitanías del decreto. El caso "hoy se ve y mañana no" es el
   peligroso y hay que buscarlo explícitamente.
2. **La regla de zarpe y recalada** (S5). Diseñarla, no repararla.
3. **`orden_en_ruta` y `fondeadero_previo` sin punto de bahía.**
4. **`getCapitaniaByBahiaId` sin caso por defecto silencioso.**

**Entregable: informe con números + diseño.** Primer punto donde el owner decide con datos.

### E3 · Ámbito lacustre — la capa que no depende de C3
**Depende de: D3 — ya decidida. Paralela a E1/E2 y a E4.**

Qué la hace necesaria: **hoy los lagos son invisibles** (§1.1). Es la carencia más completa
del sistema y la que tiene el insumo más listo: 6 jurisdicciones con receta `union_cuerpos`,
cotejo lacustre ya adjudicado, shapefile cargado con procedencia.

Qué desbloquea: **el entregable visible más temprano** — S4.

**Aceptación:** las 6 jurisdicciones lacustres construidas y auditadas, ninguna con geometría
vacía (INV-3.5) — completo, no a medias (D3); una ruta en el Lago Llanquihue devuelve su
Capitanía y sus restricciones; y el registro de ámbitos pasa el lacustre a **publicado**, con
lo que su aviso de INV-3.6 se retira solo.

**Verificado en el constructor, y hace a esta etapa más barata de lo que parecía.**
`scripts/fase5_construir_capa_ds991.py` **ya trata el ámbito por separado**: la resta de
tierra y el límite exterior se aplican solo a `ambito = 'maritima'` (líneas 723-772), lo
lacustre y lo antártico toman su geometría base directamente (línea 756), la receta
`union_cuerpos` tiene su propio control que rechaza una lacustre vacía citando INV-3.5
(línea 545), y la tabla lleva índice por ámbito (línea 869).

> **O sea que la geometría lacustre probablemente ya se construye bien hoy, y lo único que la
> mantiene fuera de la base es el rollback compartido con C3, que es un defecto de las
> marítimas.** Lo que hay que cambiar es el **gate**, no la construcción. La opción barata es
> acotar el fallo de C3 a los pares marítimos —C3 ya reporta el ámbito de cada lado del par
> (línea 852)— en vez de construir dos tablas. **No lo doy por cerrado sin correr el build:**
> que la geometría se construya no prueba que pase sus controles.

### E4 · Ámbito marítimo — cerrar C3
**Depende de: nada nuevo. Frente lento, en paralelo.**

`P2 → P4' → P3`, **midiendo C3 después de cada uno** y sin construir lo que el paso anterior
ya arregló. **P1 no va al final por defecto:** cuando P4' y P3 estén, se mide qué fracción del
residuo sigue siendo borde de caja; si es material, P1 entra antes que P5. Lo decide el número.

**Aceptación:** C3 = 0 fuera de los traslapes declarados y los ocho controles pasan dentro de
la transacción, **acotados al ámbito marítimo** (D3); y el registro de ámbitos pasa el
marítimo a publicado.

**Queda pendiente de definir dentro de esta etapa:** qué hace C3 con un par cuyos dos lados
son de ámbitos distintos. C3 ya reporta el ámbito de cada lado (línea 852), así que el dato
está; lo que falta es la regla. No la invento acá.

### E5 · Prueba de realidad — las 163 bahías
**Depende de: E0 y (E3 / E4). Es lo que autoriza a promover la capa.**

Diseñada en `fase5R §3` con sus tres clases y su regla de adjudicación; **nunca se corrió**.
Gate: clase A2 = 0, clase B fuera de declarados = 0, toda clase C adjudicada con cita.
Las 38 acopladas se reportan aparte, siempre.

### E6 · Cambio de unidad en el motor
**Depende de: E2 + E5. Segundo entregable visible.**

Cambiar `capa_consultada.json` a la capa real y aplicar el diseño de E2.
**Aceptación:** S1, S2, S5; la ruta a Chacabuco ve su bahía de destino; regresión lado a lado
sobre las 8 rutas reales, y toda diferencia explicada.

### E7 · R1 sobre la capa nueva
**Depende de: E6. Tercer entregable visible.**

Pieza 1 ya está. Pieza 2: volver a correr el auditor de `fase5Y`. **Expectativa: el criterio
de silenciamiento sobra** — con costa fina y unidad Capitanía puede que no queden astillas. Si
sobra, se borra. Después piezas 3 y 4.
**Aceptación:** S3, S6, S8.

### E8 · Deudas declaradas
Art. 2 del decreto (D6) · P1 si no entró en E4 · sectores y `AreaRestriccion` · `DPA_2023`
cargada · retirar `BAHIA_COORDS` · retirar `bahia_jurisdicciones` y su backup ·
**declarar UNA fuente autoritativa del catálogo de bahías y derivar las demás** — hoy son
cinco copias sin jerarquía; E0.1 dejó el detector de divergencia entre ellas (incluido el
contenido, no solo los ids), pero el detector no es la cura. Se resuelve al retirar
`BAHIA_COORDS`, que ya está en esta lista y que E2 toca al reemplazar `orden_en_ruta` y
`fondeadero_previo`.

---

## 4. DEPENDENCIAS Y PARALELISMO

```
E0 ──┬──► E1 ──► E2 ─────────────┐
     │                           ├──► E6 ──► E7 ──► E8
     └──────────────► E5 ────────┘
                       ▲
E3 (lacustre) ─────────┤   ← entregable temprano, no espera a E4
E4 (maritimo, C3) ─────┘
```

**En paralelo sin pisarse:** E0 toca el mapa operativo; E1/E2 tocan servicios y scripts
nuevos; E3 y E4 tocan el insumo y el constructor. E3 y E4 sí se pisan en el constructor — por
eso D3 (partir el gate) es lo que las vuelve verdaderamente paralelas.

---

## 5. DECISIONES

| id | decisión | estado | qué se necesita para decidir |
|---|---|---|---|
| D1 | Join bahía→Capitanía: 5 clase C, `Guayacán`, 3 variantes, 24 sin atribuir | **abierta** — la **bahía 257 salió: adjudicada el 2026-08-11**, ver abajo | el párrafo del decreto de cada par; se prepara en E0 |
| D2 | P2 — frontera declarada Chaitén × Chonchi | **DECIDIDA 2026-08-10: autorizada** | — |
| D3 | Partir el gate de construcción por ámbito | **DECIDIDA 2026-08-10: sí** — ver abajo | — |
| D4 | Zarpe y recalada bajo unidad Capitanía — **resuelve S5**, el único punto de la especificación que quedó abierto | **abierta** | la medición de volumen de E2 |
| D5 | Cuánto "de más" es aceptable en la lista de restricciones | **abierta** | la medición de volumen de E2 |
| D6 | Art. 2 del D.S. 991: incorporarlo al insumo o declararlo no reproducible | **abierta** | — |
| D7 | **Ámbito A — seguridad** (`consultaRestricciones` y `Totalpronostico`) | **DECIDIDA 2026-08-11: A3** — aviso + escalamiento a **U**, tope duro, nunca U+V. **Implementada.** | El 0 de 5 la sostiene. Rige mientras no esté la consulta formal a DIRECTEMAR, que el owner gestiona por fuera: A3 es lo provisorio hecho bien, no la solución de fondo. `e01e_a3_2026-08-11.txt` |
| D8 | **Ámbito B — alineación** (`consultaBahias`): ¿el patrón se entera? | **DECIDIDA 2026-08-11: B1** — no se le avisa | condición cumplida: la divergencia deja rastro del lado del equipo sin correr nada a mano — aviso en el arranque + `data/catalogo/estado_drift.json` versionado. `e01d §4` |

### D7/D8 — por qué son dos y no una. Medido el 2026-08-11.

La partición no es por endpoint: es por **si el dato descartado puede bajar la bandera**.
`Totalpronostico` **no es degradación informativa** — `peorTramo` es un máximo sobre las
bahías matcheadas, así que un descarte solo puede quitarle un candidato y **bajar** el
veredicto; con ≥30 kt eso vale un U+V que el patrón no ve (`useVoyageVerification.js:165-169`).
Cae del mismo lado que `consultaRestricciones`. `consultaBahias` no alimenta ninguna
bandera y 103 de sus 164 ids no traen hoy dato asociado: su descarte no le quita nada al
viaje, solo corre el catálogo.

### Bahía 257 Río Cochrane — adjudicada el 2026-08-11 por el dueño del producto

**A la Capitanía de Puerto Lago General Carrera.** Fundamento del owner: el D.S. 991
le atribuye a esa Capitanía los lagos General Carrera, Cochrane y O'Higgins, y excluye
expresamente los dos últimos de Baker. **El río Cochrane se lee como continuidad del lago
adjudicado.** La agrupación de SITPORT —que pone 128, 203 y 257 bajo la misma repartición
235— **corrobora de forma independiente y no es el fundamento**: el mapa operativo no
revoca al decreto.

Aplicada en `src/data/bahia-capitania-map.json`. **No se agregó a las otras cuatro fuentes
del catálogo**: exigen lat/lng y SITPORT no entrega posición por ninguno de sus trece
endpoints; rellenarla sería fabricar una coordenada (INV-0.2). Queda declarada como
`incoherencia_interna` abierta hasta que haya posición, y **A3 la cubre mientras tanto**.

> **Lo primero que E0.3 tiene servido:** el mismo párrafo del decreto nombra los otros dos
> lagos, que son las bahías **128** (Lago General Carrera) y **203** (Lago O'Higgins), hoy
> con `capitania: null` entre las 24 sin atribuir. No se tocaron acá porque lo adjudicado
> fue la 257.

### D3 — el gate se parte por ámbito. Decidida el 2026-08-10.

Motivo del dueño del producto, textual en lo esencial: *que un lago no se construya porque dos
Capitanías marítimas se pisan en Magallanes no tiene fundamento — son problemas sin relación.*

**"La capa existe" pasa a ser por ámbito.** El lacustre existe cuando pasa sus controles; el
marítimo cuando pasa los suyos. Lo que **no** cambia: cada ámbito publicado tiene que estar
**completo y auditado**. Nada se promueve a medias dentro de su propio ámbito — partir el gate
no abre la puerta a publicar la mitad de los lagos.

**Y se registra explícitamente qué ámbitos están publicados y cuáles no**, para que INV-3.6
pueda avisar sobre el que falte. Esto no es contabilidad interna: es lo que convierte "el
ámbito lacustre todavía no está construido" en una **carencia declarada** — causa (a) de
INV-3.6 — en vez de en silencio.

Tres consecuencias de diseño que se siguen de eso:

1. El registro de ámbitos es **dato declarado**, hermano de `zonas_aviso.json`, y con la misma
   mecánica de retiro automático: cuando un ámbito pasa sus controles y se publica, su entrada
   deja de producir aviso, y el validador se detiene si la declaración y la base no coinciden.
2. Una ruta en un ámbito no publicado produce **el mismo aviso** que una jurisdicción sin
   geometría, con la misma bandera **U** y el mismo tope. Al patrón se le dice lo mismo, que es
   lo que INV-3.6 ya manda para sus dos causas.
3. El ámbito **antártico** queda igualmente cubierto por el registro, sin trabajo extra: hoy
   sus cuatro jurisdicciones tampoco están publicadas y hoy también callan.

**Decisiones ya tomadas en sesiones previas, registradas para no re-litigar:**
umbral de corrección de testigos 500 m (2026-08-10) · convención del paralelo compartido
(2026-08-10) · el mapa operativo no revoca al decreto, clase C se adjudica una por una
(fase5R) · la capa se construye antes que R1 (2026-08-10) · la adición 3 al contrato **no se
escribe**, porque compensaba que el motor filtre por bahía y sobra cuando filtre por Capitanía
(2026-08-10).

**No requieren decisión:** el andamio E1, la medición de volumen, `orden_en_ruta` /
`fondeadero_previo`, `getCapitaniaByBahiaId`, la prueba de las 163, la regresión.

---

## 6. RIESGOS

| riesgo | qué lo mitiga |
|---|---|
| C3 no cierra y la capa marítima nunca llega | E0–E3 no dependen de C3; con D3, lo lacustre entrega igual; y la conversación de alcance llega con números |
| El volumen sube tanto que la lista se vuelve ruidosa | E2 lo mide antes de comprometerse; la salida es sectores, no volver a la bahía |
| Una restricción que hoy se ve deja de verse | E2 la busca explícitamente; E6 la bloquea con la regresión lado a lado |
| El andamio de E1 se promueve por accidente | campo declarado que lo marca + fallo al arrancar |
| El join se corrige a ojo y queda peor | el mapa no revoca al decreto; validador que muerde |
| El catálogo SITPORT vuelve a moverse | E0 entrega detección de drift, no una resincronización de una vez |

---

## 7. ESTADO POR ETAPA

Se actualiza al cerrar cada etapa. "Cerrada" exige evidencia citada.

| etapa | estado | cerrada el | evidencia |
|---|---|---|---|
| E0 Higiene del dato de identidad | **E0.1 cerrada**; E0.2 y E0.3 no iniciadas | — | `e01_drift_catalogo_2026-08-11` |
| — E0.1 · A3, 257 y §0.4 | **cerrada** — A3 implementada de punta a punta (backend + PWA), mordida **10/10** + control negativo, y **verificada disparando contra SITPORT real**: una ruta por la costa de Carahue escala a **U** y nombra la Capitanía. Bahía 257 adjudicada y aplicada. §0.4 escrita en `CLAUDE.md`. | 2026-08-11 | `_bitacoras/e01e_a3_2026-08-11.txt` + `01_mordida_a3`, `02_control_tras_adjudicacion`, `respuesta_weather_ruta_carahue.json` |
| — E0.1 · cierre (D8 aplicada, D7 medida, 257) | **cerrada** — SITPORT tiene **13 endpoints** y consumíamos 3; dos de los nuevos dan la Capitanía de cada bahía. **257 → Capitanía de Puerto Lago Gral. Carrera** según SITPORT, que coincide con el decreto: la adjudicación del owner ya no es sobre un vacío. **108 → Capitanía de Puerto Carahue**; qué bahía es, no determinado. **Posición: no la entrega ningún endpoint.** D8 aplicada con su condición, probada contra insumo alterado. | 2026-08-11 | `_bitacoras/e01d_d7_y_257_2026-08-11.txt` + `00_endpoints_sitport`, `02_d7_rutas`, `03_mordida_arranque`, `04_npm_drift` |
| — E0.1 Drift del catálogo SITPORT | **cerrada** — cinco fuentes internas comparadas entre sí (ids **y** contenido) y contra la unión de los tres endpoints de SITPORT; cinco clases de divergencia; mordida **20/20** + control negativo. La bahía 257 **no se agregó**: exige atribuir Capitanía (D1). La **108 no es identificable** con las fuentes de hoy. Sube al owner solo la política: **D7** (ámbito seguridad) y **D8** (ámbito alineación). | 2026-08-11 | `_bitacoras/e01_drift_catalogo_2026-08-11.txt` + `.../propuesta_e01.md` · `_bitacoras/e01b_continuacion_2026-08-11.txt` + `01_mediciones`, `02_prueba_mordida_20`, `03_control_en_vivo` |
| E1 Andamio de medición | no iniciada | — | — |
| E2 Diseño y medición del cambio de unidad | no iniciada | — | — |
| E3 Ámbito lacustre | no iniciada — **desbloqueada, D3 decidida** | — | — |
| E4 Ámbito marítimo, cerrar C3 | en curso — P2 autorizado, sin aplicar | — | `fase5N`, `fase5O`, `fase5P`, `fase5Q` |
| E5 Prueba de las 163 | no iniciada | — | diseño en `fase5R §3` |
| E6 Cambio de unidad en el motor | no iniciada | — | — |
| E7 R1 sobre la capa nueva | pieza 1 cerrada; pieza 2 en observación | — | `fase5V`, `fase5W`, `fase5Y` |
| E8 Deudas declaradas | abierta | — | `fase5Z` |

**Trabajo ya hecho que sigue vigente:** insumo v2 auditado limpio, mordida 12/12 · costa OSM
cargada y verificada · testigos corregidos, 48 de 54 · topónimos IGM registrados · R1 pieza 1
completa con mordida 20/20 · el auditor de tramos silenciados (`fase5Y`) · el inventario
re-ejecutable de §1.

---

## 8. BITÁCORA DEL DOCUMENTO

| versión | fecha | qué cambió |
|---|---|---|
| 1.6 | 2026-08-11 | **D7 decidida (A3) e implementada**: aviso propio + escalamiento a U con tope duro en el código, en `restricciones-ruta` y `weather-ruta`, con su bloque en P3. Verificada disparando contra SITPORT real por la costa de Carahue. **Bahía 257 adjudicada** a Capitanía de Puerto Lago General Carrera y aplicada en el mapa operativo; sin posición, así que queda como `incoherencia_interna` declarada y A3 la cubre. **§0.4 escrita en `CLAUDE.md`.** E0.3 hereda 128 y 203 como lo primero servido. |
| 1.5 | 2026-08-11 | Cierre de E0.1. **D8 decidida (B1) y aplicada** con su condición: aviso de drift en el arranque + `estado_drift.json` versionado, probado contra insumo alterado. **D7 medida: 0 de 5 rutas del corredor**. Hallazgo que reordena varias cosas: **SITPORT expone 13 endpoints y consumíamos 3**; `consultaCapuertoRestriccion` y `Totalgeneral` dan la Capitanía de cada bahía y el puente que faltaba entre los espacios de `cdReparticion` — **257 → Lago Gral. Carrera** (coincide con el decreto), **108 → Carahue**. Ninguno entrega coordenadas. E0.3 suma ese insumo. |
| 1.4 | 2026-08-11 | Continuación de E0.1. **D7 se parte en D7 y D8**, y no por endpoint sino por si el descarte puede bajar la bandera: `Totalpronostico` resultó ser falso negativo de seguridad, no degradación informativa (`peorTramo` es un máximo; descartar solo baja). **La bahía 108 no es identificable** — el pronóstico no trae coordenadas ni nombre, `cdReparticion` vive en otro espacio de numeración (0 valores en común) y el id no ordena por geografía (rho 0,39, 55 inversiones). El control pasa a comparar **contenido** entre copias, no solo membresía, y suma **F5** (`bahia_jurisdicciones`). E8 suma la fuente autoritativa del catálogo. |
| 1.3 | 2026-08-11 | E0.1 cerrada: control de drift del catálogo SITPORT, con prueba de mordida contra insumo alterado. Dos hallazgos que corrigen el §1.4 de este documento — la divergencia **no es de una entrada**: además de la 257, `Totalpronostico` publica el id **108** que ni nuestro catálogo ni `consultaBahias` conocen, y ese sí está descartando dato hoy en `/weather-ruta`. De ahí que el control compare contra la **unión de los tres endpoints** y no contra `consultaBahias`. Se registra **D7**. |
| 1.2 | 2026-08-10 | El dueño del producto aprueba el plan y los nueve puntos de la especificación; S5 queda abierta como D4. Punto de entrada fijado en E0.1. |
| 1.1 | 2026-08-10 | D3 decidida: el gate se parte por ámbito y "la capa existe" pasa a ser por ámbito, con registro explícito de ámbitos publicados para que INV-3.6 avise sobre el que falte. Río Cochrane sube a E0.1. E3 desbloqueada. |
| 1.0 | 2026-08-10 | Primera versión. Inventario medido, especificación y ocho etapas. Respecto de la propuesta previa: se separa y adelanta el ámbito lacustre (hallazgo de las 33 celdas vacías); el andamio pasa a usar `jurisdicciones_decreto`; E1 pasa a depender de E0; D2 queda registrada como decidida. Verificado en el constructor que el ámbito ya se trata por separado, lo que abarata E3 y acota D3 al gate. |

---

## 9. LO QUE ESTE DOCUMENTO NO RESPONDE

Escrito para que no se lea como más cerrado de lo que está.

- **Si la geometría lacustre pasa sus controles.** Está construida y separada, pero no se
  corrió el build para verlo. E3 empieza por ahí.
- **Cuánto cambia el volumen de restricciones al pasar a Capitanía.** Es el número que E2
  existe para producir. Sin él, D4 y D5 no se pueden tomar.
- **Si C3 cierra con P2/P4'/P3/P5.** Sigue sin destrabarse la tensión entre "cero traslapes
  salvo Puyehue" y "los seis no se resuelven acá".
- **Cuántas de las 30 jurisdicciones sin bahía atribuida son un problema real** y cuántas son
  jurisdicciones donde SITPORT simplemente no publica. E0 lo separa.
- **Plazos.** No hay estimaciones acá a propósito: E4 depende de cuántas iteraciones tome C3,
  y eso no se sabe hasta medir después de P4' y P3.
