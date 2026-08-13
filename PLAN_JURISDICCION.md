# PLAN DE TRABAJO — RESOLUCIÓN DE JURISDICCIÓN POR CAPITANÍA

> **Documento de trabajo, no informe.** Se actualiza **al cerrar cada etapa**, no al final.
> Cada etapa cierra con evidencia citada; cada decisión queda con su fecha y su motivo.
> Si algo se mide y contradice lo escrito acá, manda la medición y el documento se corrige.
>
> Rige `CONTRATO_MOTOR.md` v1.7. Este documento **no crea reglas**: donde una regla es
> del contrato, se cita; donde es de producto, se dice que lo es.

**Versión del documento:** 2.0 · **Escrito:** 2026-08-10 · **Última actualización:** 2026-08-11
**Estado:** plan aprobado. Especificación aprobada (S5 abierta como D4). **E0, E1 y E2 CERRADAS.** El cambio de unidad tiene su número: **+11 restricciones, piso +7**. Quedan E3, E4, E5 y E6.

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

> **Corrección medida el 2026-08-12 (§3.3: el párrafo de arriba no se borra).** Las tres cosas
> que faltaban eran más. **(b)** el Art. 2 **ya está**, extraído del documento oficial
> versionado: D6 cerrada. **(d), no listada entonces:** diez Capitanías no conservaban el texto
> literal de su párrafo, lo que es un incumplimiento de INV-3.7 y no una carencia del dato;
> nueve quedaron completas y la décima, `bahia_paraiso`, declarada y diferida. **(e), tampoco
> listada:** los dieciséis párrafos de Gobernación no estaban en el insumo ni en el v1 — entran
> como lista hermana, con `participa_matching: false` y `receta: null`, porque **no se construye
> geometría de Gobernación**. **(a) y (c) siguen en pie** sin cambios.

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

#### Decisión sobre regenerar el andamio — 2026-08-12: NO se regenera

Decidido por el owner tras medirlo. **No se ejecutó nada**: la capa vigente sigue siendo la
que E2 midió.

**Si alguna vez se regenera, va DESPUÉS de regenerar `cotejo_lacustre_adjudicado.json`, nunca
antes.** Ese archivo es uno de los dos insumos de `scripts/fase3ter_construir_capa.py`, y E3 lo
va a regenerar como precondición suya (§ *Corrección al alcance de E3*). Regenerar el andamio
antes es trabajo tirado: habría que rehacerlo apenas E3 toque el cotejo.

**Exposición medida sin regenerar** (`_bitacoras/e1_exposicion_ancud_chonchi_2026-08-12.txt`):
de las 64 jurisdicciones, sólo **ancud** y **chonchi** cambian campos que afecten la geometría
desde que la capa se construyó — las dos recuperaron un límite Sur omitido en la transcripción.
Lo que eso toca de lo ya medido:

- **95,87 de los 2.076,06 km — el 4,6 %**, en 3 de las 8 rutas. Las otras cinco no las tocan.
- **1 de las 26 restricciones**: bahía 155 Queilén, cuya Capitanía es chonchi.

**Esa 1 está en el margen blando.** 155 Queilén es una de las cuatro apariciones que E2
clasificó como apoyadas en traslape, y la más extrema: `ruta∩J 9,91 km · en traslape 9,91 ·
exclusivo 0,00`. Se apoya **enteramente**. Esas cuatro son las que separan el **+11** de su piso
**+7**, así que la figura de chonchi toca la parte más frágil del número. La exposición es chica
en volumen y no es despreciable en dónde cae.

Nada de esto predice cuánto se movería el +11: para eso hay que regenerar y volver a medir. Dice
de qué depende, que es lo que E2 se propuso declarar y lo que D4 y D5 necesitan.

**Ojo con el generador:** lee el insumo **v1**, no el v2. Regenerar tal como está hoy saldaría la
deuda contra el v1 vigente (las 2 correcciones de límite Sur) y **no** la deuda contra v2 (las 11
diferencias de contorno, reverificadas el 2026-08-12: siguen siendo 11, ninguna se resolvió).
Saldar esa segunda exige que el generador lea v2, que es cambio de código. Texto propuesto para
la deuda declarada, sin aplicar, en `_bitacoras/e1_texto_propuesto_deuda_andamio_2026-08-12.md`.

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

#### Los seis pasos de E3 — enumerados acá el 2026-08-12

> **Por qué esto se escribe hoy.** La etapa se venía contando "paso 1 de 6", "paso 2 de 6"
> desde el 2026-08-12, y esa numeración **nunca estuvo en este documento**: vivía en una
> respuesta de sesión y en la memoria de trabajo. Al abrir la sesión del paso 2 hubo que
> reconstruirla, y sólo se pudo recuperar cuáles eran el 1, el 2 y el 5. Es exactamente la
> clase de cosa que se pierde entre sesiones, así que baja al plan. Los pasos 3, 4 y 6
> quedaron escritos como **no determinados** —no se rellenaron por deducción— hasta que el
> owner cerró la enumeración el mismo día, por el **camino A**.

| # | paso | estado |
|---|---|---|
| 1 | **Reconocimiento**: ¿la geometría lacustre pasa sus controles? | **CERRADO** 2026-08-12 · `_bitacoras/e3_recon_2026-08-12.txt` |
| 2 | **Partir el gate por ámbito** sin bajarle la severidad a C3 | **CERRADO** 2026-08-12 · `_bitacoras/e3_gate_2026-08-12.txt` |
| 3 | **Reconocimiento del cableado**: qué cuesta que un tramo de ruta resuelva contra la capa publicada, y por dónde se llega de la Capitanía a sus restricciones (join de E0.3) | **CERRADO** 2026-08-13 · `_bitacoras/e3_recon_cableado_2026-08-13.txt` |
| 4 | **Escribir el cableado y su prueba de mordida, sin aplicar** | por delante — **dimensionado**: 4 archivos, 1 función |
| 5 | **Aplicar el build · mover el registro · activar el cableado** — un solo movimiento, tres piezas | por delante |
| 6 | **Verificación de punta a punta y regresión** | por delante |

**Camino A, decidido por el owner el 2026-08-12.** Fundamento textual en lo esencial: *E3
existe para que los lagos dejen de ser invisibles.*

**El camino B queda descartado POR MEDICIÓN, no por preferencia.** B era: E3 cierra en la capa
—las 6 en la base, ámbito publicado, aviso retirado— y S4 espera a E6. Es más barato, dos
pasos en vez de cuatro, y no toca el motor. Lo hunden dos cosas medidas: deja los lagos
**dibujados y sin usar**, que es lo contrario de lo que la etapa existe para entregar; y
**retirar el aviso sin cablear registra como defecto de construcción algo que no lo es.** Hoy
un tramo lacustre no resuelve jurisdicción, el ámbito lacustre lo reclama, y sale la causa (a)
de INV-3.6 — carencia declarada. Publicado el ámbito, `ambitoQueReclama` deja de reclamarlo y
ese mismo tramo cae a la **causa (b)**, que el contrato define como *"un defecto de
construcción nuestro"* sobre *"una zona que ninguna jurisdicción reclama"*, y manda registrar
como defecto además de mostrarlo. Las dos mitades serían falsas: la capa está, no se consulta.
Al patrón le diría lo mismo, pero adentro sería mentira — y esa separación es justamente lo
que INV-3.6 existe para sostener.

#### E3 SE LLEVA UN PEDAZO DE E6, ACOTADO AL ÁMBITO PUBLICADO — declarado, no silencioso

La aceptación (b) de E3 —*"una ruta en el Lago Llanquihue devuelve su Capitanía y sus
restricciones"*— **se solapa con E6**. `bahiasEnRutaPostGIS` (`sitport-routes.js:557`) consulta
la capa que nombra `capa_consultada.json` y selecciona **`bahia_id`**; la capa nueva está
indexada por **`jurisdiccion_id`**. Esa diferencia *es* el cambio de unidad. Queda escrito acá
para que E6 no termine hecho de a pedazos en silencio, que es el modo de falla que este plan
persigue en otros lados.

**Fundamento medido de por qué el pedazo es seguro: para lo lacustre el cambio de unidad es
ADITIVO, no sustitutivo.** La capa vigente cubre **0,0000 km²** del área de los seis lagos, y
su cobertura más cercana a cualquiera de ellos está **entre 16 y 84 km** (medido el
2026-08-11, E0.2). No se reemplaza nada: se suma donde hoy no hay nada. Y una ruta marítima no
puede caer en un lago, así que **por construcción no puede mover una bandera marítima**.

**Eso último no se afirma: lo mide el paso 6**, sobre las 8 rutas reales del arnés, igual que
E0.2 midió sus 0 cambios de bandera antes de dar nada por bueno.

**Paso 5 — son TRES piezas, no dos, y no pueden separarse:**

1. **aplicar el build** (la corrida real, ~13 min, que confirma en vez de deshacerse);
2. **mover `ambitos_publicados.json`** — el lacustre pasa a `publicado: true`;
3. **activar el cableado** que el paso 4 dejó escrito y probado.

Por qué 1 y 2 no se separan: en cuanto la construcción confirme las seis lacustres, el retiro
automático de E0.2 —control C3 de `ambitos-publicados.js`— **detiene la carga**, porque el
ámbito está declarado no publicado y la base ya lo tiene. Eso no es un defecto: es ese control
haciendo lo suyo. Pero implica que aplicar sin mover el registro deja el repositorio en un
estado que **no arranca**, y por eso el paso 2 no aplicó el build aunque el gate ya esté
partido y probado.

Por qué 3 tampoco se separa: es el mismo motivo por el que cayó el camino B. Entre mover el
registro y activar el cableado hay una ventana en la que cada tramo lacustre se registra como
defecto de construcción. La ventana no se acorta: se elimina.

**El paso 4 queda SIN DIMENSIONAR hasta que el paso 3 lo mida.** No se sabe cuánto es el
cableado: al enumerar esto no se habían leído `cobertura-jurisdiccional.js` (329 líneas) ni el
resto de `sitport-routes.js` (886). Estimarlo sin medirlo es exactamente lo que §1.2 no admite,
y por eso el paso 3 es un reconocimiento y no una construcción.

#### Paso 3 CERRADO — 2026-08-13. El paso 4 queda dimensionado

Bitácora: `_bitacoras/e3_recon_cableado_2026-08-13.txt`. Nada escrito, nada aplicado.

**El resultado es mejor de lo esperado: el cableado mínimo no cambia la unidad del pipeline,
la ensancha.** El pipeline trabaja por bahía de punta a punta y el filtro que decide qué se
muestra es una línea —`sitport-routes.js:735`, `if (!bahiaIdsEnRuta.has(bahiaId)) continue;`—.
Una restricción lacustre no llega hoy porque su bahía no está en ese Set: su celda Voronoi la
borró el recorte contra `ne_land`. No hace falta reemplazar la unidad; hace falta que el Set
incluya además las bahías que cuelgan de una Capitanía cuya geometría del D.S. 991 intersecta
la ruta: `ruta ∩ jurisdicciones_ds991 → jurisdiccion_id → join de E0.3 → bahia_id`. Aditivo
sobre un Set, sin sacar ninguna de las que hoy entran. **El cambio de unidad propiamente
—dejar de filtrar por bahía— sigue entero en E6.**

**Dimensión del paso 4: cuatro archivos, una función.** `capa_consultada.json` (un bloque de
dato) · `cobertura-jurisdiccional.js` (dos puntos: verificar el nombre nuevo y unir las dos
capas en el CTE `cob`) · `sitport-routes.js` (**sólo** `bahiasEnRutaPostGIS`, :557) ·
`join-bahia-jurisdiccion.js` (sin cambios de código, pero **pasa a consumirse en producción por
primera vez** — hoy sólo lo usan dos scripts, medido — y su validador empieza a poder detener
el arranque).

**Cuatro cosas que rompen si se tocan mal, las cuatro medidas:**

1. **El camino obvio está cerrado por un control vivo.** Repuntar `capa_jurisdicciones` a
   `jurisdicciones_ds991` **detiene la carga**: el C7 de `ambitos-publicados.js:58` exige que la
   capa publicada no sea la que el motor consulta. El control es correcto y no se afloja: el
   cableado declara un **nombre nuevo**. Que C7 tenga un horizonte —se escribió para la era en
   que las dos deben diferir— lo mira E6; E3 no lo necesita.
2. **Son dos consumidores, no uno.** Cablear la lista y dejar el SQL de cobertura contra la capa
   vieja hace que la restricción lacustre aparezca *y al mismo tiempo* el mismo tramo se
   registre como hueco de nuestra capa. Es la ventana que hundió al camino B, ahora dentro de un
   solo paso: los dos puntos se cablean juntos.
3. **El contacto lacustre está mal atribuido hoy y el cableado lo haría visible.** Medido sobre
   las 21 entradas lacustres del join: **17 de 21 no nombran bien su Capitanía** — 14 con
   `capitania: null` en el mapa **que devuelven teléfono igual**, y 3 (`159`, `160`, `161`) que
   nombran "Puerto Montt" donde el decreto dice `puerto_varas` y `lago_ranco`. Es el hallazgo de
   E0.3 con su caso lacustre. **No lo resuelve E3** —el contacto es el frente lateral de §7.1—;
   lo que el paso 4 decide es de dónde sale el **nombre** (del decreto, vía el join, que es lo
   que INV-3.3 manda) y qué hace con el teléfono cuando no se puede nombrar sin inventarlo, que
   S3 ya resuelve para el aviso.
4. **Ensanchar el Set le cambia el alcance al control de drift** de E0.1 (A3), que recibe
   `bahiaIdsEnRuta`. No le hace daño; le cambia lo que mide. Se mide en el paso 6.

**Agujero chico y concreto:** `BAHIA_COORDS` tiene 163 bahías y **la 257 no está**, aunque el
join la adjudica a `lago_general_carrera` y el mapa de contacto la tiene. `sitport-routes.js:737`
la descartaría **en silencio**. Hoy no molesta porque nunca entra al Set. Probablemente ya la
cubre A3 — **no verificado**, anotado.

**Discrepancia CERRADA el 2026-08-13 — ver la nota al pie de D11, más arriba.** Eran dos
criterios distintos, no un error: el **18** cuenta coincidencia de nombre (identificación) y el
**21** cuenta atribución del join (alcance). El que corresponde a E3 es **21**, 20 con
coordenada, y **el paso 4 dimensiona sobre eso**. El mismo día quedaron cerrados los otros dos
pendientes de este paso: el agujero de la **257 — A3 sí la cubre**, verificado —, y la decisión
del owner sobre de dónde sale el nombre de la Capitanía: **del join, no del mapa**; el teléfono
sigue saliendo del mapa.

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

#### Corrección al alcance de E3 — 2026-08-12

**E3 ya no arranca sobre el insumo que este plan inventarió.** La pasada de alineación
contra el TM-025 A (commits `8e22ef5`…`cb140d5`) cambió el insumo del que E3 depende, y de
tres formas distintas.

**(1) Cuatro de las nueve Capitanías completadas tocan agua interior.** `carahue` recuperó
sus ríos Imperial, Queule, Moncul y Toltén y sus lagos Budi y Queule más la laguna
Trovolhue; `valdivia`, sus ríos Calle Calle, Lingue, Cruces, Angachilla, Tornagaleones y
Valdivia; `corral`, el río Colún; `talcahuano`, las lagunas Chica y Grande de San Pedro.
Ninguno de esos cuerpos existía en el insumo cuando se escribió este plan.

**(2) `lago_ranco` tiene geometría que antes no había.** El decreto entrega coordenadas para
los tres sectores del río Bueno —Los Patos `40 17 03 S / 073 31 43 W`, La Goleta
`40 17 13 S / 073 36 52 W`, El Manzanito `40 15 06 S / 073 41 01 W`— y el insumo las había
omitido. Hoy el río Bueno está `rechazado` en el cotejo lacustre por falta de geometría, y
esto es geometría. `lago_villarrica` recuperó además el alcance del río Toltén, *"desde su
origen hasta la jurisdicción de la comuna de Pitrufquén"*, que es la costura con Carahue:
sin él las dos Capitanías reclaman el río entero.

**(3) `cotejo_lacustre_adjudicado.json` NO se regeneró y no lo sabe.** Su sha256 sigue siendo
`86f96658…`, el mismo de antes de la pasada: se derivó del v1 tal como estaba y no vio nada
de lo anterior. **E3 construye desde ese archivo.** Regenerarlo es precondición de E3, no una
tarea de E3.

##### Lo que la pasada hizo visible y este plan no tenía medido

**El cotejo lacustre sólo mira las Capitanías de ámbito `lacustre` — 6 de 64**
(`fase2_cotejo_lacustre.py:140`). Los cuerpos de agua que el decreto nombra dentro de
Capitanías **marítimas** quedan fuera de su alcance por construcción. Medido sobre el insumo
de hoy, son **once**:

| Capitanía | cuerpos que el decreto le nombra | |
|---|---|---|
| `constitucion` | lagos Teno, Vichuquén, Colbún, Maule | ya estaba |
| `lebu` | lagos Lanalhue y Lleu Lleu | ya estaba |
| `puerto_montt` | lago Chapo | ya estaba |
| `maullin` | río Maicolpué | ya estaba |
| `cochamo` | lagos Tagua-Tagua e Inferior | ya estaba |
| `chaiten` | lagos Yelcho y Palena | ya estaba |
| `puerto_chacabuco` | canales interiores hasta la Laguna San Rafael | ya estaba |
| `talcahuano` | lagunas Chica y Grande de San Pedro | **nuevo** |
| `carahue` | lagos Budi y Queule, laguna Trovolhue, cuatro ríos | **nuevo** |
| `valdivia` | seis ríos y sus afluentes navegables | **nuevo** |
| `corral` | río Colún | **nuevo** |

**Siete de esas once son anteriores a la pasada.** El hueco no lo creó la alineación: lo hizo
visible y lo agrandó en cuatro. Ninguna de las once tiene `cuerpos_lacustres` en el insumo,
así que ninguno de esos cuerpos tiene geometría hoy.

Eso abre una pregunta que **es del owner y este plan no la tenía planteada**: si el ámbito
lacustre que E3 publica es *"las 6 Capitanías lacustres"* o *"el agua interior que el decreto
adjudica, esté en la Capitanía que esté"*. Con la primera respuesta, once Capitanías siguen
sin sus cuerpos y hay que declararlo. Con la segunda, E3 crece y `fase2_cotejo_lacustre.py`
cambia de alcance. Queda registrada como **D11**.

##### D11 DECIDIDA — 2026-08-12: opción estrecha, con las 11 declaradas

**E3 publica las 6 Capitanías de ámbito lacustre** (18 bahías del catálogo). **Las 11
Capitanías marítimas con cuerpos quedan DECLARADAS como carencia** — no en silencio, que es
lo único que la opción estrecha no puede permitirse: sin la declaración, INV-3.6 tendría un
hueco.

**Fundamento del owner, y corrige la pregunta que yo había planteado:** no había delta que
medir. Esos cuerpos **no tienen geometría hoy**, así que la opción estrecha **no le quita
nada al patrón** — no se puede perder lo que nunca se publicó. Pedir el efecto medido de (a)
antes de decidir habría sido medir contra la nada. Queda anotado porque es el tipo de
medición que parece rigurosa y no lo es.

**La (b) queda como frente propio**, con su alcance medido **antes** de comprometerlo. Lo que
falta medir cuando se retome, y hoy no está: cuántos cuerpos hay que cotejar, si el catastro
los tiene, y cuánto crece `fase2_cotejo_lacustre.py`, que hoy filtra por ámbito `lacustre` en
su línea 140 y deja las 11 fuera **por construcción**.

**Urgencia de la (b), medida el 2026-08-12** —para priorizar el frente, no para decidir esto—.
De las 8 bahías del catálogo que quedan fuera con la opción estrecha, sobre la captura
versionada de E0.1 (39 restricciones, 2026-08-11):

| bahía | Capitanía | restricción en la captura |
|---|---|---|
| 141 CARAHUE - SECTOR RÍO | `carahue` | — |
| 142 CARAHUE - SECTOR LAGO | `carahue` | — |
| **153 LAGO TAGUA TAGUA** | `cochamo` | **1 — LÍMITES OPERACIONALES** |
| 162 LAGO CHAPO | `puerto_montt` | — |
| 221 ESTERO QUITRALCO | `puerto_chacabuco` | — |
| 222 ESTERO CUPQUELAN | `puerto_chacabuco` | — |
| 229 LAGO VICHUQUEN | `constitucion` | — |
| 234 RÍO PALENA | `chaiten` | — |

**1 de 8.** Para calibrar: de las 18 bahías que la opción estrecha **sí** cubre, también hay
**1** con restricción (106, Panguipulli). O sea que la (b) duplicaría la cobertura de
restricciones lacustres reales, sobre una base de una sola. **Urgencia baja, no nula.**

Dos salvedades sobre este número: la captura es una foto del 2026-08-11 y **SITPORT cambia por
hora**, así que mide el orden de magnitud, no el estado de hoy; y la 153 es una de las cuatro
bahías cuya Capitanía se resolvió recién el 2026-08-12 —antes tenía `capitania: null`—, con lo
cual este cruce no era posible antes de esa corrección.

> **NOTA AL PIE DE D11 — 2026-08-13. El número se corrige; la decisión no se mueve.**
> Arriba dice *"(18 bahías del catálogo)"*. Ese 18 **no está mal, pero es de otra pregunta**, y
> el texto de arriba no se reescribe (§3.3). Sale de
> `_bitacoras/e03join_recon_2026-08-11.txt:177`, textual: *"18 bahías del catálogo **tienen por
> nombre** uno de esos cuerpos"* — cuenta **coincidencia de nombre** entre una bahía del catálogo
> y un cuerpo de agua que el decreto nombra, y era un instrumento de **identificación**: servía
> para resolver 13 bahías sin atribuir sin interpretar nada.
>
> Lo que E3 publica es un **ámbito**, y de un ámbito cuelga la **atribución**, no la coincidencia
> de nombre. Ese número es **21**: entradas de `join_bahia_jurisdiccion.json` cuya
> `jurisdiccion_id` es de ámbito lacustre — `lago_panguipulli` 7, `lago_ranco` 4,
> `lago_general_carrera` 3, `lago_villarrica` 3, `puerto_varas` 3, `lago_rapel` 1. Con coordenada
> en `BAHIA_COORDS` son **20** (falta la 257). **El paso 4 dimensiona sobre 21/20.**
>
> Lo que no se reprodujo, dicho en vez de tapado: **no se recalculó el 18 con el mismo
> comparador**. El contador vive en `scripts/e03join_reconocimiento.js` y es el que manda; un
> recuento independiente con un comparador propio más laxo da **19** — corrobora el orden de
> magnitud y no reproduce el número. Las dos entradas lacustres cuyo nombre no es un cuerpo
> adjudicado son **250 Lago Pirehuico** y **257 Río Cochrane**.
>
> **D11 no se mueve**: decidió alcance estrecho contra amplio, y esa decisión no depende de si el
> número es 18, 20 o 21.

##### El contacto del ámbito lacustre — DECIDIDO por el owner el 2026-08-13

**El NOMBRE de la Capitanía sale del join de E0.3; el TELÉFONO sigue saliendo del mapa
operativo.** El paso 4 lo toma como dado.

Motivo del owner: el join es dato declarado con respaldo del decreto, y el mapa **tiene 17 de 21
mal** — 14 entradas con `capitania: null` que devuelven teléfono igual, y `159`/`160`/`161`
nombrando "Puerto Montt", una Capitanía marítima, donde el decreto dice `puerto_varas` y
`lago_ranco`. Es el archivo que E0.3 ya declaró insuficiente para esto. El teléfono se queda
donde está porque el mapa es su autoridad por `CONTRATO_MOTOR.md` §5. Coherente con INV-3.3 —el
mapa operativo no revoca al decreto— y con la separación que E0.3 hizo a propósito.

**Esto no arregla el mapa: lo deja de consultar para el nombre en el ámbito lacustre.** El frente
de contacto de §7.1 sigue abierto y ahora tiene una razón más, con caso concreto: en cuanto se
cablee, un patrón navegando el Lago Puyehue vería "Puerto Montt" si el nombre saliera de ahí. La
decisión lo evita en lo lacustre y **no lo evita en ningún otro ámbito**.

##### La bahía 257 sí está cubierta por A3 — verificado el 2026-08-13

Quedaba anotado como "probablemente, no verificado". Verificado leyendo el camino entero:
`evaluarDriftCatalogo` arma sus candidatas con `!BAHIA_COORDS[r.id_bahia]`, o sea que la 257
entra **justamente por no estar** en el catálogo; corre en `:724`, **antes** del `continue` de
`:737` que la sacaría; y en `drift-ambito-a.js:97` el **defecto se registra siempre**, resuelva o
no su Capitanía — si no se la puede ubicar cae en `no_ubicable`, que avisa igual. **No hay
descarte silencioso**: el `continue` la saca de la lista de restricciones, no del registro.

Efecto lateral que conviene tener escrito: **el cableado mejora este caso.** Hoy la 257 no puede
producir aviso porque ninguna bahía lacustre matchea y su repartición nunca entra en
`repsEnRuta`; cableado el ámbito, una ruta por el Lago General Carrera matchearía 128 y 203, y la
257 pasaría de defecto registrado a **defecto + aviso**.

##### Un cierre servido, medido y sin aplicar

La laguna que `lago_villarrica` llama **Galletué** está hoy `ausente` en el cotejo: sin
coincidencia en el catastro. El párrafo de la **Gobernación** de Valdivia la escribe
**Gualletué**, y esa grafía calza con un registro único en los 2.067 del catastro —
`LAGO GUALLETUE`, fid 965, Región IX, comuna Lonquimay, 13,075 km², *"Laguna Principal"*.
Cae a 8,6 km de Icalma y 24,7 de Conguillío, los otros dos cuerpos de la misma frase del
decreto, contra 51,9 km del siguiente. Es el instrumento del caso Ancud con el vecino de
arriba.

**DECIDIDA 2026-08-12 (D12): se adjudica.** Fundamento: coincidencia única en los 2.067 del
catastro, respaldo en el propio decreto —la grafía sale del párrafo de la Gobernación, no de
una fuente externa— y coherencia geográfica con margen de 2× contra el siguiente candidato.
Dejarla `ausente` habría dejado sin geometría un cuerpo que el decreto nombra, por una
diferencia de una letra que el mismo decreto resuelve unas líneas más abajo.

> ### ⚠ ADVERTENCIA DE APLICACIÓN — LEER ANTES DE REGENERAR EL COTEJO LACUSTRE
>
> **La laguna se adjudica por `fid 965`. NUNCA por geometría.**
>
> El registro **`fid 960` no tiene nombre y su geometría es IDÉNTICA a la del 965.** Son dos
> filas del catastro para el mismo cuerpo de agua.
>
> - Un `INSERT` o un cotejo que **seleccione por geometría** —o que acepte "el que calce
>   espacialmente"— **trae los dos y duplica la laguna.**
> - Un cotejo que empareje **por nombre** se queda solo con el 965, porque el 960 no tiene.
>   Esa es la vía correcta, y funciona por accidente: no confiar en el accidente, filtrar
>   por `fid` explícito.
> - El duplicado **no se ve como error**: dos polígonos idénticos unidos dan el mismo área,
>   así que un control de superficie pasa igual. Se ve contando filas, no midiendo km².
>
> Quien regenere `cotejo_lacustre_adjudicado.json` tiene que llevar esta condición al
> artefacto que la haga cumplir —un `fid` explícito en la adjudicación, o un control que
> falle si el cuerpo aparece dos veces—. **Escrito acá no alcanza para que se cumpla; acá
> sólo queda constancia de que se sabía.**

Medición completa en `_bitacoras/cotejo_tm025a_2026-08-12/16_galletue/`.

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

> **Estado de esa pendiente al 2026-08-12 (E3 paso 2).** El gate por ámbito tuvo que hacer
> *algo* con esos pares para poder existir, y lo que hace es **negarse a elegir**: un par con
> un lado en cada ámbito no se le imputa a ninguno de los dos, va al alcance `(capa)` y su
> falla no publica ningún ámbito. Eso **no es la regla** —sigue siendo de E4—: es la opción
> conservadora mientras la regla no esté, y se eligió así para que el día que aparezca un par
> cruzado no se resuelva solo y en silencio a favor del ámbito que se estuviera publicando.
> **Medido: hoy hay cero pares cruzados**, así que no cambia ningún resultado.

**Segunda pendiente de E4, medida el 2026-08-12 y que antes no estaba escrita:** el control C4
de `ambitos-publicados.js` exige que las jurisdicciones **con geometría en la base** igualen a
`jurisdicciones_esperadas`, y para marítima son **52 esperadas contra 44 construibles** — las
otras 8 son `nula_declarada` porque el decreto no permite cerrarlas. Con esa cuenta, marítima
no puede declararse publicada aunque C3 cierre. Lacustre no lo toca (6 de 6 con geometría),
así que no bloquea E3 y no se corrigió por anticipado: cambiar la cuenta de un control que
decide si un ámbito se declara publicado, sin el caso que lo necesita delante, es aflojarlo
antes de tiempo (§0.3). Confirmado por el owner el 2026-08-12: se deja anotada, no tocada.

Las ocho son `arica`, `lirquen`, `talcahuano`, `baker`, `puerto_eden`, `punta_delgada`,
`tierra_del_fuego` y `puerto_williams` — todas `nula_declarada` **con su causa**, que es el
estado que INV-3.6 exige, no un defecto de construcción. Lo que E4 tiene que decidir es contra
qué se compara: contra las **esperadas** (52, y entonces el ámbito no cierra nunca mientras el
decreto no permita cerrar esas ocho) o contra las **cerrables** (44, y entonces "completo"
significa *todas las que se pueden construir están construidas, y las que no, declaradas*).
La segunda lectura es la que D3 parece querer —"completo y auditado"— pero cambiarlo mueve el
criterio con que un ámbito se declara publicado, así que se decide con el caso delante.

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
| D1 | Join bahía→Capitanía: 5 clase C, `Guayacán`, 3 variantes, 24 sin atribuir | **RESUELTA 2026-08-11 en E0.3**, salvo 6 bahías declaradas sin resolver con su fuente. 158 de 164 atribuidas; las "3 variantes" resultaron **dos** y una sobre-atribución; `Guayacán` cerró en Coquimbo; las 5 clase C cerraron salvo la 137 | — |
| D2 | P2 — frontera declarada Chaitén × Chonchi | **DECIDIDA 2026-08-10: autorizada** | — |
| D3 | Partir el gate de construcción por ámbito | **DECIDIDA 2026-08-10: sí** — ver abajo | — |
| D4 | Zarpe y recalada bajo unidad Capitanía — **resuelve S5**, el único punto de la especificación que quedó abierto | **abierta** | la medición de volumen de E2 |
| D5 | Cuánto "de más" es aceptable en la lista de restricciones | **abierta** | la medición de volumen de E2 |
| D6 | Art. 2 del D.S. 991: incorporarlo al insumo o declararlo no reproducible | **CERRADA 2026-08-12: se incorporó.** La pregunta original tenía dos ramas y ya no las tiene. El Art. 2 entró al insumo en `5d62466` (P3 de la pasada de alineación) y está en **v1 y en v2**, o sea en la fuente y en el derivado: bloque `articulos`, entrada `art_2`, con `texto_decreto` literal, `titulo` y `procedencia` completa —TM-025 A al 4-jun-2025, `documento_sha256 e14cb905…`, línea 815, extraído por `scripts/tm025a_p3_gobernaciones.py`, cotejado el 2026-08-11—. **Los tres términos que faltaban cuando se abrió la decisión están:** medido sobre el archivo, `mar territorial`, `zona contigua` y `plataforma continental` aparecen, junto a `aguas interiores` que ya estaba. Con eso la cita de INV-3.3 **se reproduce desde el repositorio**, que es lo que INV-3.7 exige y lo único que D6 discutía. | — (cerrada) |
| D7 | **Ámbito A — seguridad** (`consultaRestricciones` y `Totalpronostico`) | **DECIDIDA 2026-08-11: A3** — aviso + escalamiento a **U**, tope duro, nunca U+V. **Implementada.** | El 0 de 5 la sostiene. Rige mientras no esté la consulta formal a DIRECTEMAR, que el owner gestiona por fuera: A3 es lo provisorio hecho bien, no la solución de fondo. `e01e_a3_2026-08-11.txt` |
| D8 | **Ámbito B — alineación** (`consultaBahias`): ¿el patrón se entera? | **DECIDIDA 2026-08-11: B1** — no se le avisa | condición cumplida: la divergencia deja rastro del lado del equipo sin correr nada a mano — aviso en el arranque + `data/catalogo/estado_drift.json` versionado. `e01d §4` |
| D9 | **El ámbito antártico no existe en el contrato** (INV-3.5 nombra tres, el insumo tiene cuatro) | **DECIDIDA 2026-08-11: P1** — se suma a INV-3.5 | texto propuesto en `e02_texto_propuesto_inv35_2026-08-11.md`; **lo escribe el owner** (§6). Hasta entonces la entrada del registro lleva `categoria_contractual: pendiente`. Descartadas P2 (fuera de alcance: la ruta necesita respuesta igual) y P3 (plegarlas a insular remoto: mete imprecisión en el dato fuente, contra INV-3.7) |
| D11 | **Alcance del ámbito lacustre**: ¿E3 publica las 6 Capitanías de ámbito lacustre, o todo el agua interior que el decreto adjudica, incluida la de las 11 Capitanías marítimas que nombran cuerpos? | **DECIDIDA 2026-08-12: opción (a), la estrecha** — E3 publica las **6 Capitanías de ámbito lacustre** (18 bahías), y las **11 Capitanías marítimas con cuerpos quedan DECLARADAS como carencia**, no en silencio. **Fundamento del owner, que corrige la pregunta:** no había delta que medir. Esos cuerpos **no tienen geometría hoy**, así que la opción estrecha no le quita nada al patrón — no se puede perder lo que nunca se publicó. Pedir una medición previa del efecto habría sido medir contra la nada. La **(b) queda como frente propio**, con su alcance medido **antes** de comprometerlo, no después. | — (decidida) |
| D12 | **Galletué / Gualletué**: ¿se acepta la grafía del párrafo de la Gobernación para adjudicar la laguna que hoy está `ausente`? | **DECIDIDA 2026-08-12: sí, se adjudica el `fid 965`** a `lago_villarrica`. Evidencia: coincidencia **única** en los 2.067 del catastro (`LAGO GUALLETUE`, Región IX, Lonquimay, 13,075 km²), respaldo en el **propio decreto** —el párrafo de la Gobernación de Valdivia escribe *Gualletué*— y coherencia geográfica con margen de 2× (8,6 km de Icalma y 24,7 de Conguillío, los otros dos cuerpos de la misma frase, contra 51,9 del siguiente candidato). **⚠ SE ADJUDICA POR `fid`, NUNCA POR GEOMETRÍA — ver la advertencia en §E3.** | — (decidida) |
| D10 | El ámbito **marítimo** entra al registro como no publicado, y la geografía de reclamo es `jurisdicciones_decreto` | **RESUELTA POR EL AGENTE 2026-08-11 (§0.4), aceptada por el owner** | criterio declarado: "publicado" = la capa del D.S. 991 de ese ámbito pasó sus controles y está en la base, que es lo que D3 ya fijó. Hoy C3 falla y `jurisdicciones_ds991` no existe. Enrutada de este lado porque el efecto sobre lo que el patrón ve está **medido en 0 cambios de bandera** sobre 10 rutas. `e02_propuesta §R1/§R2` |

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
| El andamio de E1 se promueve por accidente | **MITIGADO 2026-08-11 (E1)**: campo declarado que lo marca, guard de arranque bloqueante probado levantando el proceso, y el comentario de la base atado al archivo por un control que se detiene si dejan de decir lo mismo |
| El join se corrige a ojo y queda peor | el mapa no revoca al decreto; validador que muerde |
| El catálogo SITPORT vuelve a moverse | E0 entrega detección de drift, no una resincronización de una vez |

---

## 7. ESTADO POR ETAPA

Se actualiza al cerrar cada etapa. "Cerrada" exige evidencia citada.

| etapa | estado | cerrada el | evidencia |
|---|---|---|---|
| E0 Higiene del dato de identidad | **CERRADA — E0.1, E0.2 y E0.3.** Desbloquea **E1, E5 y E6**. | 2026-08-11 | `e01_drift_catalogo_2026-08-11`, `e02_construccion_2026-08-11`, `e03join_recon/medicion/cierre/construccion_2026-08-11` |
| — E0.3 · El join (construcción, camino 2) | **cerrada** — el join deja de vivir dentro del mapa de contactos y pasa a ser dato declarado propio, con la clave del decreto: `data/decreto/join_bahia_jurisdiccion.json`, **164 entradas**, compuesto por script y nunca a mano (INV-3.7). **158 resueltas · 6 sin resolver.** El `respaldo` de cada atribución queda en el dato y no se pierde: **69 decreto · 88 operativo · 1 declaración versionada** — las 88 descansan en que el mapa y SITPORT coinciden, no en el decreto, y son la deuda que **E5** existe para probar. **La deuda de E0.2 quedó saldada por donde correspondía**: la regla de coincidencia de nombre existía porque el join era *por nombre*; con `jurisdiccion_id` deja de ser regla y pasa a ser lookup, y lo que queda del nombre —cotejar el contacto contra la jurisdicción del decreto— vive en `src/utils/coincidencia-nombres.js`, un solo lugar, consumido por `zonas-aviso.js:19` y `ambitos-publicados.js:25`. **Las 6 sin resolver llevan su fuente dentro del archivo** y el validador se detiene si a una le falta `a_quien`, `que_falta` o la pregunta redactada; se resuelven **todas juntas** cuando lleguen las respuestas (`politica_de_resolucion`). **INV-3.7 no se cumplía y se arregló**: medido, regenerar daba sha256 distinto en cada corrida por el sello de tiempo, con lo cual "se regeneró igual" y "se regeneró distinto" eran indistinguibles; ahora tres corridas seguidas dan el mismo archivo. Mordida **16/16** + control negativo, suite **76/76**. **No cableado al motor** — medido con grep: nada en producción consume el join todavía; eso es E6. | 2026-08-11 | `_bitacoras/e03join_construccion_2026-08-11.txt` · `.../e03join_construccion_2026-08-11/` (`01_mordida_join`, `02_suite`, `03_reproducibilidad`) |
| — E0.3 · El join (cierre de las 34) | **pasada de cierre hecha: 27 de las 34 quedan cerradas con lo que ya había en el repositorio**, cada una con su cita. El instrumento que más cerró es el del **caso Ancud** —la contrapartida en el párrafo de la vecina—: cuatro líneas compartidas declaradas resolvieron 15 bahías (Canal Moraleda 7, meridiano 073 15 00 W 4, Punta Harry–Cabo San Vicente 3, Cayo Blanco–Isla Traiguén 1). **Hallazgo:** 251, 252 y 253 están al Norte del paralelo 43 44 25 S, que es el límite Norte de Melinka **y** de Puerto Cisnes — o sea que las dos fuentes operativas proponen jurisdicciones que el decreto excluye por su propia banda; el decreto las pone en **Quellón**. **Con el addendum, 28 cerradas y 6 abiertas, ninguna sin fuente identificada**: 3 dependen de un mismo límite Sur (DPA_2023 en disco + DIRECTEMAR), 1 de dos párrafos que se solapan al Este de Cabo San Vicente (137), y 2 del informante austral (239, 241) — pregunta que además toca la costura Oeste de Puerto Aguirre, causa del C3 de E4. **La bahía 90 se cerró, pero no como dije:** la capa del IGM de fase5S **no tiene** el dato (6.617 topónimos, todos australes; 0 hits de Juan Fernández, San Félix, San Ambrosio y Crusoe — medido, `02_igm_bahia_90.txt`). La cierra `zonas_aviso.json`, que desde R1 pieza 1 ya declara que la 90 está "en su territorio" y tiene un validador que se detiene si dejara de discrepar. Queda dicho que esa cita es una afirmación nuestra, no autoridad externa, y que una línea en la consulta a DIRECTEMAR la respalda si el owner la quiere. **Cuatro falsos cierres cazados en la propia pasada** y escritos con su arreglo (§3 de la bitácora). Nada construido. | — | `_bitacoras/e03join_cierre_2026-08-11.txt` · `.../e03join_cierre_2026-08-11/01_pasada.txt` · `cierre.json` · `scripts/e03join_cierre_34.js` |
| — E0.3 · El join (medición previa a aplicar) | **medida antes de aplicar, como el owner pidió.** Con las 42 re-atribuciones de los cajones B/C/D puestas: **0 banderas movidas** sobre las 10 rutas del arnés de E0.2, suite **76/76**, control de drift con el mismo veredicto que el baseline. Pero **41 tarjetas de 164 cambian**, y **34 de las 42 quedarían mostrando el nombre de una Capitanía con el teléfono de otra** — porque 33 de las Capitanías de destino no tienen teléfono en el mapa, al no tener ninguna bahía. Ese es el hallazgo que decide la forma del arreglo: el archivo mezcla **quién tiene jurisdicción** con **a quién se llama**. Y el **retiro automático de R1 pieza 1 mordió**: la corrida completa aborta en la bahía 97 (Lirquén) con una única causa, porque re-atribuirla borra la discrepancia que justificaba su `sin_contacto`. La medición vale para HOY: el join es cosmético para la bandera hasta E6, y ahí hay que rehacerla. | — | `_bitacoras/e03join_medicion_2026-08-11.txt` · `.../e03join_medicion_2026-08-11/` (`00_medicion`, `01_medicion_sin_97`, salidas crudas de las 3 corridas) |
| — E0.3 · El join (reconocimiento) | **reconocimiento cerrado** — las 164 bahías quedan repartidas en una partición verificada (el script aborta si no suma 164): **88 sanas o de puro nombre**, **42 que decide el propio decreto** (25 por la banda de paralelos que él mismo escribe, 4+13 por identidad del cuerpo de agua ya adjudicada en `cotejo_lacustre_adjudicado.json`), **34 que suben al owner** en cinco familias. Tres correcciones medidas al §1.3 y al §9 de este documento: **(1) las "3 variantes de nombre (36 bahías)" son dos** (`Chacabuco`→`puerto_chacabuco`, `Hornopirén`→`hornopiren`, establecidas por **igualdad de conjunto** contra SITPORT, no por parecido de texto) **y una sobre-atribución** — `Cisnes` cuelga 18 bahías y SITPORT le da 2; renombrarla habría dejado 16 mal atribuidas con el nombre correcto. **(2) De las 29 jurisdicciones sin bahía, SITPORT sí les atribuye a 27**: la hipótesis "SITPORT no publica ahí" explica 2 (`papudo`, `rada_covadonga`); las otras 27 el mapa las colapsa en la Capitanía vecina. **(3) La bahía 146 (Río Bueno) es la única que SITPORT no atribuye, y la resuelve el decreto** — lo nombra literal bajo `lago_ranco`. Instrumento nuevo con su alcance medido: la banda de latitud declarada (41 de 64 jurisdicciones, 9 de 820 pares se pisan) **excluye, no adjudica** — y se midió el caso que la rompe: en 4 bahías el mapa está dentro y SITPORT fuera, y en 3 ninguna de las dos las contiene. **13 de las 24 bahías con restricción publicada hoy** caen en un cajón a arreglar; 5 de ellas son adjudicación. Sin construir: no se tocó ningún dato ni servicio. | — | `_bitacoras/e03join_recon_2026-08-11.txt` · `_bitacoras/e03join_recon_2026-08-11/01_reconocimiento.txt` (547 líneas) · `scripts/e03join_reconocimiento.js` |
| — E0.2 · Registro de ámbitos publicados | **cerrada** — `ambitos_publicados.json` declara los **4 ámbitos**, los 4 no publicados con su causa. Validador con **8 controles** que muerde en las dos direcciones, incluido el **retiro automático** (declarado ausente + la base ya lo tiene → se detiene). Mordida **11/11** + control negativo contra la base real. La causa (a) de INV-3.6 pasa a leerse de la **base** y no del insumo, con dos orígenes: `jurisdiccion_no_cerrable` y `ambito_no_publicado`. **21,82 km lacustres y 47,57 km antárticos dejan de registrarse como defecto de construcción.** Verificado de punta a punta sobre 10 rutas: **0 cambios de bandera**, como la propuesta prometió antes de construir. Suite unitaria **76/76**. | 2026-08-11 | `_bitacoras/e02_recon_2026-08-11.txt` · `_bitacoras/e02_propuesta_2026-08-11.txt` · `_bitacoras/e02_construccion_2026-08-11/` (`01_mordida_ambitos`, `02_verificacion_e2e`, `03_suite_unitaria`) |
| — E0.1 · A3, 257 y §0.4 | **cerrada** — A3 implementada de punta a punta (backend + PWA), mordida **10/10** + control negativo, y **verificada disparando contra SITPORT real**: una ruta por la costa de Carahue escala a **U** y nombra la Capitanía. Bahía 257 adjudicada y aplicada. §0.4 escrita en `CLAUDE.md`. | 2026-08-11 | `_bitacoras/e01e_a3_2026-08-11.txt` + `01_mordida_a3`, `02_control_tras_adjudicacion`, `respuesta_weather_ruta_carahue.json` |
| — E0.1 · cierre (D8 aplicada, D7 medida, 257) | **cerrada** — SITPORT tiene **13 endpoints** y consumíamos 3; dos de los nuevos dan la Capitanía de cada bahía. **257 → Capitanía de Puerto Lago Gral. Carrera** según SITPORT, que coincide con el decreto: la adjudicación del owner ya no es sobre un vacío. **108 → Capitanía de Puerto Carahue**; qué bahía es, no determinado. **Posición: no la entrega ningún endpoint.** D8 aplicada con su condición, probada contra insumo alterado. | 2026-08-11 | `_bitacoras/e01d_d7_y_257_2026-08-11.txt` + `00_endpoints_sitport`, `02_d7_rutas`, `03_mordida_arranque`, `04_npm_drift` |
| — E0.1 Drift del catálogo SITPORT | **cerrada** — cinco fuentes internas comparadas entre sí (ids **y** contenido) y contra la unión de los tres endpoints de SITPORT; cinco clases de divergencia; mordida **20/20** + control negativo. La bahía 257 **no se agregó**: exige atribuir Capitanía (D1). La **108 no es identificable** con las fuentes de hoy. Sube al owner solo la política: **D7** (ámbito seguridad) y **D8** (ámbito alineación). **ADDENDUM 2026-08-12 — este control estuvo CIEGO 3 h 36 min y la etapa no puede describirse sin decirlo.** `a4ea1c1` (15:00:30) escribió `src/data/bahia-capitania-map.json` con un **BOM UTF-8**; los cinco servicios lo leen con `require()`, que lo descarta, así que la suite siguió en 76/76 — pero `catalogo-bahias.js:111` lo lee con `JSON.parse(fs.readFileSync(...))`, que no lo descarta, y de ese lector cuelga `leerFuentesInternas()`. Desde entonces y hasta `22530b6` (18:36:53) `npm run drift` salía **exit 1** con `FUENTE INTERNA ILEGIBLE`, muriendo en `e01_control_drift_catalogo.js:295`, **antes** de la escritura del estado en la 328. **El BOM apagó los dos rastros a la vez**: no hubo línea de log útil y tampoco el diff de git del estado versionado, que es justamente el rastro diseñado para que la divergencia se vea sin mirar la consola. El control que caza la 108 no habría cazado nada. **Guard nuevo que lo impide**: `src/services/__tests__/datos-sin-bom.test.js` recorre `src/data/` y falla si un `.json` arranca con BOM o si el lector estricto no lo puede parsear, con la aserción de que encontró al menos un archivo para que no pase en verde vacío (§0.3). Verificado en sus dos estados: 79/79 limpio, y en rojo con un fixture al que se le inyectó un BOM. **La etapa sigue cerrada**: el control volvió a su línea base (exit 3, `DRIFT_DECLARADO_ABIERTO`, las mismas 3 divergencias declaradas), que es lo que el `estado_drift.json` commiteado del 2026-08-11 ya registraba. | 2026-08-11 | `_bitacoras/e01_drift_catalogo_2026-08-11.txt` + `.../propuesta_e01.md` · `_bitacoras/e01b_continuacion_2026-08-11.txt` + `01_mediciones`, `02_prueba_mordida_20`, `03_control_en_vivo` |
| E1 Andamio de medición | **CERRADA** — `jurisdicciones_decreto` queda declarada como **andamio** en `capa_consultada.json`, con `es_andamio`, para qué sirve y **tres motivos medidos** por los que no se promueve. **`capa_jurisdicciones` no se tocó**: sigue en `bahia_jurisdicciones`, y el andamio NO se declara ahí a propósito, porque ese campo es el que lo promovería con una línea. **Los dos guards dejaron de poder divergir** (camino 2): el texto del comentario de la base vive en el archivo, `e1_aplicar_andamio.js` lo escribe y `verificarComentarioEnLaBase()` comprueba que la base dice exactamente eso — el comentario viejo decía "NO CONSULTAR" sin condición y contradecía la declaración. **"Contexto de medición" se demuestra, no se declara** (camino B): el nombre de la capa sólo sale de `capaDeMedicion()`, que producción no tiene cableada; sin variable de entorno, porque una variable se queda puesta y viaja. **Aceptación cumplida y no simulada:** se deformó el archivo, se levantó `src/index.js` como proceso y no arrancó. Mordida **14/14** con control negativo primero, incluido **el comentario de la base editado a mano** y el borrado, con restauración verificada. Suite **76/76**. **ADDENDUM 2026-08-12: el andamio NO se regenera**, decidido por el owner tras medirlo — ver *"Decisión sobre regenerar el andamio"* en §E1. Dos motivos: el generador lee el insumo **v1** y no el v2, así que regenerar saldaría la deuda equivocada; y `cotejo_lacustre_adjudicado.json` es su otro insumo y **E3 lo va a regenerar como precondición suya**, con lo cual hacerlo antes es trabajo tirado. Exposición medida sin regenerar: **4,6 % de los km** (95,87 de 2.076,06, en 3 de las 8 rutas) y **1 de las 26 restricciones** —bahía 155 Queilén→`chonchi`—, que es una de las cuatro apariciones apoyadas en traslape y la más extrema (`exclusivo 0,00 km`): la exposición es chica en volumen y cae en el margen que separa el +11 de su piso +7. **Reverificado el mismo día: las 11 que difieren entre v1 y v2 siguen siendo 11**, ninguna se resolvió; a `ancud` y `chonchi` la pasada de alineación les corrigió el límite Sur en v1 y ese campo ya coincide con v2, pero el contorno sigue difiriendo. | 2026-08-11 | `_bitacoras/e1_construccion_2026-08-11.txt` · `.../e1_construccion_2026-08-11/` (`01_mordida_andamio`, `02_aplicacion`, `03_suite`, `04_declaracion`) |
| — E1 · Propuesta | **cerrada** — aprobados el camino 2 (guards) y el camino B (contexto). Midió lo que decidía: **11 de 64 jurisdicciones difieren de verdad entre v1 y v2** (no 2 como decía la marca vieja, ni 64 como daba una comparación que medía el renombre de esquema), todas del corredor de Chiloé y el sur de Valdivia. Cruce contra el join de E0.3: **40 de 42 coinciden**; las 2 que no incluyen la 131, donde el andamio arrastra el error que E0.3 ya corrigió. **Corrigió además una afirmación mía del reconocimiento**: el motivo (1) de la marca no quedaba probado por el test de vértices, porque un polígono recortado pierde vértices declarados sin que eso sea discrepancia con la fuente. | 2026-08-11 | `_bitacoras/e1_propuesta_2026-08-11.txt` · `.../e1_propuesta_2026-08-11/01_medicion.txt` |
| — E1 · Reconocimiento | **cerrado** — `jurisdicciones_decreto` sirve: 64 filas, 64 ids, 10 geom nulas, y sus ids son **el mismo conjunto** que los 64 del insumo, comprobado en los dos sentidos. **El solapamiento que E0.2 anotó está verificado y sus dos motivos siguen en pie:** (1) la geometría no corresponde a su fuente — `hornopiren` tiene 3 de sus 4 puntos de contorno declarados sin vértice en la capa y `castro` 4 de 11; (2) los traslapes existen y son **peores de lo que la marca cuenta**: el comentario cita un par (Aguirre × Chacabuco, 28.325,1 km² medidos ahora, coincide al km²) y la capa tiene **60 pares traslapados, 44.875,6 km²** — E2 tiene que decir qué hace con eso, no descubrirlo. **El conflicto real:** el guard que ya está dice `NO CONSULTAR` sin condición y el que E1 pide dice "consultable sólo para medir"; no alcanza con agregar un campo al repositorio, porque el comentario de la base es donde mira quien la abre sin el repo al lado. **Riesgo de promoción, localizado:** `cobertura-jurisdiccional.js` consulta la capa que `capa_consultada.json` nombra, así que declarar el andamio ahí como `capa_jurisdicciones` lo promovería con una línea de dato; y `ambitos-publicados.js:59` (C7) ya compara contra ese mismo campo. **El arranque tiene un hook y es de otra naturaleza**: el de E0.1 declara y cumple "no bloquea ni demora el arranque", y el de E1 debe detener. Sin construir. | — | `_bitacoras/e1_recon_2026-08-11.txt` |
| E2 Diseño y medición del cambio de unidad | **CERRADA — el número es +11, con piso +7. El volumen SUBE al pasar a Capitanía, y el signo no depende de nada abierto.** | 2026-08-12 | `_bitacoras/e2_cobertura_2026-08-12.txt` · `.../e2_cobertura_2026-08-12/01_cobertura.txt` · `scripts/e2_cobertura_andamio.js` |
| — E2 · Volumen del cambio de unidad | **cerrada. EL NÚMERO DE E2 ES +11**, con el método decidido por el owner el 2026-08-12: las jurisdicciones sin geometría se **excluyen** del neto, porque su ausencia ya la cubre el aviso de INV-3.6 y contarlas como pérdida las contaría dos veces. **Ninguna restricción se pierde por el cambio de unidad** (0); las 11 que aparecen son INV-3.4 funcionando. **Condición del owner, aplicada en la salida**: el número declara aparte y de forma visible que **16 restricciones caen en jurisdicciones sin geometría y NO se le listan al patrón** —14 de `arica` y 2 de `puerto_williams`—, que **hoy sí se le muestran**, y que el aviso de INV-3.6 dice que la jurisdicción no está cargada pero **no dice qué restricciones hay**: esa parte no la tapa. Una más (bahía 239) cae en las 6 que E0.3 dejó sin resolver y a ésa no la cubre ningún aviso. Ocho rutas, 39 restricciones de la captura versionada de E0.1. Lo de hoy no se reimplementa: sale del mismo SQL que `bahiasEnRutaPostGIS` usa en `sitport-routes.js:562`. La unidad nueva usa el andamio de E1 y el join de E0.3. **Crudo: 26 → 20, −6 (−23 %), 11 aparecen y 17 desaparecen.** Pero descompuesto por causa: **16 desaparecen porque su Capitanía no tiene geometría** (`arica`, `puerto_williams` — dos de las diez que el decreto no permite cerrar, así que **regenerar no las arregla**), **1 porque su bahía es una de las 6 que E0.3 dejó sin resolver** (239), y **0 por el cambio de unidad**. Descontando lo que no es unidad, el neto es **+11**: ninguna restricción se pierde por pasar a Capitanía, y las que aparecen son INV-3.4 funcionando. **El SIGNO del resultado lo decide un artefacto del andamio, no el cambio de unidad** — el owner pidió que se avisara si el número podía irse para cualquier lado, y se va. Precisión que evita gastar la reevaluación en el lugar equivocado: **el salto de signo no lo produce la parte desactualizada (v1↔v2), que regenerar sí bajaría; lo producen las jurisdicciones sin geometría, que regenerar no toca.** Exposición declarada junto al número: 32,1 % de km en las 11 desactualizadas, 10,5 % en traslape. | 2026-08-12 | `_bitacoras/e2_volumen_2026-08-12.txt` · `.../e2_volumen_2026-08-12/01_volumen.txt` |
| — E2 · Las apariciones cruzadas contra el traslape | **cerrada — era lo único que podía bajar el +11.** De las 11 apariciones, **7 son firmes** (la ruta toca su Capitanía sobre km exclusivos) y **4 se apoyan en traslape**: tres son `233 Seno Reloncaví → puerto_montt` (ruta∩J de 2,59 y 0,46 km, enteras en zona ambigua) y una es `155 Queilén → chonchi` (9,91 km, entera). Son los **mismos pares** que la medición de cobertura había señalado —calbuco+puerto_montt, maullin+puerto_montt, castro+chonchi—, así que las dos mediciones se corroboran. **El número con el que se decide es +11 y su piso es +7: los dos positivos.** El cruce no hace saltar el signo — como sea que se resuelva la ambigüedad, el volumen sube. No se afirma que esas cuatro atribuciones sean erróneas: se afirma de qué dependen. Quién tiene razón en esos tramos lo resuelve la capa del D.S. 991 cuando exista (E3/E4). | 2026-08-12 | `_bitacoras/e2_volumen_2026-08-12.txt` (addendum 2) · `.../03_cruce_apariciones.txt` |
| — E2 · Cobertura del andamio sobre rutas reales | **cerrada** — lo que E1 dejó sin contestar. Ocho rutas reales, **2.076,06 km** medidos sobre la geometría que el backend recibe (sin `aproximacion_final`): **58,3 % resuelven a UNA jurisdicción · 31,2 % caen en ninguna · 10,5 % caen en zona de traslape**. La capa se pidió por `capaDeMedicion()`, o sea que el contrato de E1 se ejerció de verdad. **Corrección de mi propia medición antes de reportarla:** la primera versión partía la ruta en segmentos y daba **40,3 %** de ambigüedad — medía cruces de frontera, no traslape, porque un tramo que cruza un límite toca dos jurisdicciones sin superposición. El número real es **cuatro veces menor**. **Los 218,65 km ambiguos están concentrados**: sólo 9 de los 60 pares declarados aportan kilómetros, y dos —Aguirre × Chacabuco (84,59) y Calbuco × Maullín (48,14)— son el 61 %; el área traslapada total no predice lo que una ruta toca. **La deuda se leyó y se declaró, no se mencionó**: **666,36 km, el 32,1 % de lo medido, cae en alguna de las 11 jurisdicciones que difieren entre v1 y v2** — sin afirmar en qué dirección cambiaría una regeneración, que exige regenerar y volver a medir. **El 10,5 % es el factor de contaminación** de cualquier medición de volumen sobre este andamio. | 2026-08-12 | `_bitacoras/e2_cobertura_2026-08-12.txt` |
| E3 Ámbito lacustre | **no iniciada — PRECONDICIÓN CUMPLIDA el 2026-08-12: el cotejo está regenerado.** `cotejo_lacustre_adjudicado.json` pasa de `86f96658…` a `4de61b9a…`, con **D11 y D12 incorporadas en la regeneración, no aplicadas después a mano**. Delta: `aceptado 9→10`, `ausente 3→2`, con geometría **27→28 de 32**; se suma el bloque `alcance_d11` con las **11 Capitanías marítimas declaradas como carencia**; Galletué pasa a `fid 965` anclada **por FID**. **Hallazgo del control nuevo: los gemelos geométricos eran 3 pares, no 1** — `[960,965]` Gualletué, `[962,966]` e `[963,967]` Icalma, todos con la forma «fila con nombre + fila sin nombre, geometría idéntica». La adjudicación vigente de Icalma ya tomaba las correctas, pero **por accidente**: empareja por nombre y los gemelos no lo tienen. Los tres quedan declarados. Mordida **11/11** con control negativo primero. Reproducible: dos corridas dan el mismo sha256. **E2 no se movió** — verificado, +11 sobre 26 y 58,3/31,2/10,5 idénticos. Antecedente: no vio la pasada de alineación hasta hoy. · **RECONOCIMIENTO CERRADO el 2026-08-12 (paso 1 de 6): el "probablemente" del plan queda medido y es SÍ.** Build corrido (9 min 48 s): las **6 lacustres salen `construida`** con receta `union_cuerpos`, y **7 de los 8 controles pasan**. El único que falla es **C3, y sus 6 pares son todos marítimos** — Castro×Chonchi 28,254 · Chaitén×Chonchi 1.798,518 · Cochamó×Río Negro Hornopirén 531,757 · Cochamó×Maullín 2.947,340 · Maullín×Puerto Montt 755,491 · Calbuco×Maullín 40,833. **Ninguna lacustre aparece en ningún par.** El único traslape lacustre×lacustre es Puyehue (Lago Ranco×Puerto Varas, 155,426 km²) y **C3 lo acepta porque está declarado**: lo lacustre no pasa por no tener traslapes, pasa teniendo uno y declarándolo bien. **El rollback compartido está localizado:** los controles escriben en una tabla `_verificacion` **única para todos los ámbitos** y un solo `RAISE EXCEPTION` con `WHERE NOT ok` mira la capa entera (`fase5_construir_capa_ds991.py` ~960-980); C3 mete una fila en falla y se lleva las seis lacustres, que no aportaron ninguna. **Río Bueno NO afecta INV-3.5**: `lago_ranco` tiene 5 de 6 cuerpos con geometría y `cumple_inv_3_5: true` — el invariante exige que la jurisdicción no quede vacía, no que todos sus cuerpos tengan geometría; las 6 cumplen. **E3 no tiene que construir geometría nueva: tiene que dejar salir la que ya se construye bien.** Paso 2 = partir el gate por ámbito, sin bajarle la severidad a C3. Hallazgo lateral anotado: `jurisdicciones_ds991_descartes` sobrevive al rollback. Bitácora: `_bitacoras/e3_recon_2026-08-12.txt` · **PASO 2 CERRADO el 2026-08-12: el gate está partido por ámbito, probado, y C3 no se aflojó.** Los ocho controles pasan a medirse **por ámbito** (`_verificacion` gana columna `ambito`, clave `(control, ambito)`) y el `RAISE` único se reemplaza por un gate que decide ámbito por ámbito: entra el que está **habilitado**, no tiene **controles suyos en falla** y trae **al menos una geometría**; el que no entra se **retira de la capa** en la misma transacción con su causa en `jurisdicciones_ds991_publicacion`. Si no entra ninguno, el final es el de antes: RAISE y no queda capa. **Ensayo del build completo sobre datos reales** (`--ensayo`, corre todo y termina en ROLLBACK): `publicados=[lacustre] retenidos_por_falla=[maritima] retenidos_por_declaracion=[antartica,insular_remota]`, exit **3 = publicación parcial**. **C3 falla igual, con los seis mismos pares y los mismos km²** — ni uno se movió; Puyehue sigue pasando por declarado y no por vacío; y los pares **cruzados entre ámbitos son cero**, así que la regla conservadora que se les puso (van al alcance `(capa)` y no publican nada, porque decidir cuál lado sobra es de E4) no cambia ningún resultado de hoy. **Mordida del gate 10/10** con control negativo primero, en `scripts/e3_prueba_mordida_gate.py`, que **importa los emisores del constructor en vez de copiarlos**; el caso 03 es el que prueba §0.3 — si el traslape es lacustre, lo lacustre **no** sale. Mordida de E0.2 **14/14** (C9 nuevo), suite **79/79**. **HALLAZGO, Y DECIDIDO EL MISMO DÍA: partir el gate no libera sólo al ámbito de la etapa, libera a todos los que pasen — y el antártico pasa.** Medido en el ensayo: sus siete controles en ok y 4/4 con geometría, o sea que un gate puro lo publicaba solo en la misma corrida, retirando su aviso de INV-3.6 en un ámbito que el contrato no nombra (D9). **El owner decidió que NO se habilita, y que se habilitará el día que él escriba INV-3.5, no antes.** Dos motivos independientes, cada uno suficiente, escritos en el `motivo_habilitacion` del registro: **de autoridad** —el contrato no nombra el ámbito, el registro le lleva `categoria_contractual: pendiente`, y publicarlo retiraría el aviso antes que la carencia que lo justifica— y **de producto** —el ámbito no está listo aunque su geometría pase: de sus cuatro jurisdicciones, `bahia_paraiso` está diferida con sus **cuatro tramos sin adjudicar** y `rada_covadonga` es la que DIRECTEMAR lista como alcaldía con ficha vacía, que del lado del repositorio se corrobora dos veces: es una de las dos únicas a las que SITPORT no atribuye ninguna bahía y una de las tres Capitanías sin página en el índice de resoluciones locales. Por eso la habilitación es **dato declarado** en `ambitos_publicados.json` (`habilitado_para_publicar` + motivo, con control **C9** en `ambitos-publicados.js`): marítima y lacustre habilitadas, antártica y insular remota no. **El build NO se aplicó a propósito**: aplicarlo confirma las 6 lacustres y ahí el retiro automático de E0.2 detiene la carga hasta que `ambitos_publicados.json` se mueva — que es el paso 5. Aplicar y mover el registro son el mismo movimiento. **Hallazgo lateral del recon, cerrado y era lo contrario**: `jurisdicciones_ds991_descartes` no es una excepción al rollback — el constructor **no la crea ni la toca**, la escribió `fase5_descartar_build_provisional.sql` en su propia transacción ya confirmada, con una fila del 2026-08-10 17:22. Lo que sí faltaba era su comentario en la base (puesto, desde el script). Y al aplicarlo apareció una tercera cosa: el `WHERE to_regclass(...)` de ese `INSERT` **nunca protegió nada** —la subconsulta nombra la tabla y rompe en el análisis, antes del WHERE—, así que el script sólo podía correr el día que la capa mala existía; corregido con `EXECUTE` y verificado. Se le agregó además una guarda que lo detiene si `_publicacion` declara algún ámbito publicado, porque con el gate partido ese `DROP` pasa a apuntarle a una capa buena. **Deuda medida para E4, no bloquea E3**: el control C4 de `ambitos-publicados.js` exige `con geometría == jurisdicciones_esperadas`, y marítima son **52 esperadas contra 44 construibles** (8 `nula_declarada` por decreto), así que con esa cuenta marítima nunca puede declararse publicada. Lacustre no lo toca (6/6). Bitácora: `_bitacoras/e3_gate_2026-08-12.txt` **Las dos decisiones que la tocaban quedaron DECIDIDAS el 2026-08-12: D11** — alcance **estrecho**, las 6 Capitanías lacustres (18 bahías), con las **11 Capitanías marítimas con cuerpos declaradas como carencia**, porque esos cuerpos no tienen geometría hoy y la opción estrecha no le quita nada al patrón; **D12** — se adjudica la laguna **Gualletué por `fid 965`**, con la advertencia de aplicación del `fid 960` (geometría idéntica, sin nombre) escrita en §E3. **Ya no le queda nada bloqueado del lado del owner: E3 depende sólo de regenerar su insumo.** | — | `_bitacoras/cotejo_tm025a_2026-08-12.txt` |
| E4 Ámbito marítimo, cerrar C3 | en curso — P2 autorizado, sin aplicar | — | `fase5N`, `fase5O`, `fase5P`, `fase5Q` |
| E5 Prueba de las 163 | **no iniciada — pero el sondeo del 2026-08-12 ya le adelantó parte de la evidencia.** E5 existe para probar los **88 respaldos `operativo`** del join, los que descansan en que el mapa y SITPORT coinciden y no en el decreto. El sondeo cruzó las 164 bahías en tres columnas (join / mapa / SITPORT por `CdReparticion`) y midió: **85 donde los tres coinciden · 57 donde el mapa quedó atrás sin efecto en la medición · 16 conflictos decreto vs SITPORT · 6 sin resolver**. Los 16 se resuelven **a favor del decreto por INV-3.3** y no abren decisión. **Lo que esto le ahorra a E5**: 142 de las 164 ya tienen a SITPORT de acuerdo con el decreto o con el mapa, y los 16 conflictos están nombrados uno por uno. **Lo que NO reemplaza**: SITPORT es fuente operativa, así que coincidir con él no prueba un respaldo `operativo` contra el decreto — sólo acota dónde mirar. | — | diseño en `fase5R §3` · `_bitacoras/sondeo_catalogo_cierre_2026-08-12.txt` §2-§4 |
| E6 Cambio de unidad en el motor | no iniciada | — | — |
| E7 R1 sobre la capa nueva | pieza 1 cerrada; pieza 2 en observación | — | `fase5V`, `fase5W`, `fase5Y` |
| E8 Deudas declaradas | abierta | — | `fase5Z` |

### 7.1 Frentes laterales — no son etapas y no deberían fingir que lo son

Trabajo que nació fuera de E0–E8, se cerró, y toca el plan sin pertenecerle. Se registra acá
para que no quede huérfano ni se le fuerce un número de etapa que no le corresponde.

| frente | estado | qué dejó |
|---|---|---|
| **Sondeo de catálogo y contacto** (2026-08-12) | **cerrado sin aplicar** | Contra-prueba medida de que **SITPORT no sirve como fuente de jurisdicción**: es el intento más completo hecho —164 bahías, 64 Capitanías, 16 Gobernaciones, cinco endpoints— y **no resolvió ninguna** de las seis que el decreto deja abiertas. `diff_capitanias.csv` **no se aplica**. Evidencia podada a 169 KB con `PROCEDENCIA.txt` de los 18 HTML borrados. Cinco aseveraciones de esa sesión que no resistieron la medición, escritas para que quien lea `capitanias_64_final.csv` re-verifique contra los raw. Bitácora: `sondeo_catalogo_cierre_2026-08-12.txt` |
| **Resoluciones locales de DIRECTEMAR** (2026-08-12) | **cerrado — la vía no delimita jurisdicciones** | 19 resoluciones leídas: cuando hablan de límites hablan de **límites de puerto**, y cuando citan jurisdicción **transcriben el D.S. 991 sin agregar un metro**. Sus coordenadas son de fondeaderos, escala de cientos de metros, contra las decenas de kilómetros de los casos abiertos. Cierra una vía que parecía prometedora. Bitácora: `recon_resoluciones_locales_2026-08-12.txt` |
| **Fix del BOM y guard de forma del dato** (2026-08-12) | **cerrado y aplicado** | Ver el addendum de E0.1. Commits `22530b6` (fix) y el guard `datos-sin-bom.test.js` |

#### El frente de CONTACTO — abierto, y no cabe en E0–E6

El sondeo dejó una cosa que sí vale y que **ninguna etapa de este plan cubre**: el contacto.
Medido — con `capitanias_64_final.csv` cambiarían de **teléfono 150 bahías** y de
**gobernación 10**, y aparecería `direccion`, que hoy no existe como campo.

**Por qué no va dentro de E0–E6, y no es una omisión que haya que corregir metiéndolo:** este
plan construye *quién tiene jurisdicción*. El contacto es *a quién se llama*, y E0.3 separó las
dos cosas a propósito — el join no tiene ni un campo de contacto, y el propio archivo lo declara
en `que_NO_es`. Meter el contacto en una etapa de jurisdicción volvería a mezclar lo que E0.3
midió que había que separar: 34 de 42 re-atribuciones dejaban el nombre de una Capitanía con el
teléfono de otra.

**Dónde vive, entonces:** frente propio, gobernado por `CONTRATO_MOTOR.md` §5, que es la
autoridad sobre el contacto y ya declara `bahia-capitania-map.json` como su fuente autorizada.
No necesita etapa acá; necesita que este plan **no lo reclame**. Queda anotado como frente
abierto con su medición, y su decisión es del owner.

**Obstáculo medido antes de aplicar nada:** seis teléfonos del CSV no son atómicos —traen `ó`,
`/` o la palabra `Móvil:`— y el contrato los renderiza como enlaces `tel:` clickeables.
Aplicarlos verbatim rompe el enlace.

### 7.2 Control del estado del plan — DECIDIDO (camino A), pendiente de implementar

> **Decisión del owner, 2026-08-12: se hace, por el camino A — dentro de `npm test`.** No se
> implementó ese día. Queda como trabajo pendiente con su forma ya definida; lo de abajo es la
> especificación, no una propuesta abierta.
>
> **Alcance declarado, y hay que respetarlo cuando se construya: caza que el plan MIENTA, no
> que esté INCOMPLETO.** Comprueba que las afirmaciones verificables sigan siendo ciertas
> contra el repositorio. Que E0.1 estuviera ciego 3 h 36 min sin quedar escrito **no lo
> habría detectado**, y ningún control de esta familia lo detectaría.
>
> **El otro hueco hace falta igual, y es otro control.** El de "el plan no dice algo que
> debería decir" no se cubre con éste. Hoy lo tapa parcialmente el guard del dato
> (`datos-sin-bom.test.js` caza que un control se rompa), pero nada caza que un hecho quede
> sin escribir. Los dos huecos son distintos y ninguno sustituye al otro; construir sólo éste
> y darse por cubierto sería el error que §0.3 persigue.

**El problema, medido el 2026-08-12:** §7 se escribe a mano y su única regla es la línea del
encabezado. Ese día se cerraron cuatro frentes, se rompió y se arregló E0.1, y **§7 y §8 no se
actualizaron hasta que el owner lo pidió**. No hay nada que lo cace: el estado es tan fiable
como la última sesión que se acordó de escribirlo. Es el mismo modo de falla que §3.3 persigue
en las bitácoras, pero acá no hay control.

**Lo que un control puede comprobar de verdad.** No "si el plan está al día" —eso no es
medible— sino algo más estrecho y suficiente: **que las afirmaciones verificables del plan sigan
siendo ciertas contra el repositorio.** Hoy hay varias, y ya se cazó una divergencia a mano:

- una etapa **CERRADA** cita evidencia → esos archivos tienen que existir;
- el plan declara sha256 (`cotejo_lacustre_adjudicado.json` en `86f96658…`) → tiene que calzar;
- una etapa dice **"sin aplicar"** → su artefacto no debe existir (`jurisdicciones_ds991`);
- el plan cita números medidos (`+11`, `2.076,06 km`, `58,3/31,2/10,5`) → los scripts que los
  producen tienen que seguir dándolos;
- el plan cita `archivo:línea` → esa línea tiene que seguir diciendo lo que el plan dice.

**La forma, copiada de lo que ya funciona en este repositorio** — el control de drift de E0.1 y
los dos guards de E1:

1. **Las afirmaciones se declaran en dato, no se deducen del texto.** Un
   `data/plan/afirmaciones_verificables.json` con una entrada por afirmación:
   `{etapa, tipo, objetivo, valor_esperado, declarada_el}`. Tipos: `archivo_existe`,
   `sha256`, `tabla_existe`, `tabla_no_existe`, `linea_dice`, `salida_de_script`.
   Parsear la prosa de §7 sería adivinar; declararlas es el camino 2 de E1.
2. **Códigos de salida con la misma semántica que E0.1**, para que "hay divergencia conocida"
   no se confunda con "algo se rompió": `0` sin divergencia · `1` **divergencia no declarada**
   · `2` no se pudo medir · `3` divergencia declarada y abierta.
3. **Estado versionado** `data/plan/estado_plan.json`, para que una divergencia nueva aparezca
   como **diff de git** aunque nadie mire la consola. Es lo que E0.1 hace, y —lección del BOM—
   el script debe escribir el estado **aunque una comprobación falle**, o el rastro se apaga
   junto con el control.
4. **Prueba de mordida con control negativo primero:** deformar una afirmación y comprobar que
   el control la caza, antes de creerle cuando pasa.

**Dónde engancharlo — ELEGIDO: (A), dentro de `npm test`.**

- **(A) Dentro de `npm test` — el camino decidido.** Un plan desactualizado pone la suite en
  rojo, que es el lugar más ruidoso que tiene este repositorio y donde el guard del BOM ya
  demostró que funciona. *Gana:* imposible de ignorar; se ve en la misma corrida que todo lo
  demás. *Pierde:* mezcla documentación con código, y un `sha256` que cambia por una razón
  legítima bloquea a quien esté haciendo otra cosa. **Esa pérdida se mitiga con el código `3`:
  una divergencia DECLARADA no rompe la suite; sólo rompe la no declarada.** Quien construya
  esto tiene que respetar esa distinción, o el control se vuelve un estorbo y termina
  aflojándose, que es lo que §0.3 prohíbe.
- **(B) Comando aparte `npm run plan`, más el estado versionado. Descartado.** *Gana:* no
  interrumpe; el diff de git deja el rastro igual. *Pierde, y por eso se descarta:* es
  exactamente el mecanismo que falló el 2026-08-12 — depende de que alguien se acuerde de
  correrlo. El BOM ya mostró que un rastro que nadie mira no es un control.

Descartado: derivar §7 automáticamente del repositorio. El estado de una etapa incluye
juicio —qué se midió, qué se corrigió, qué queda debiendo— y eso no sale de un `git log`.
El control comprueba afirmaciones; no escribe el plan.

**Alcance honesto:** esto caza que el plan **mienta**, no que esté **incompleto**. Que E0.1
haya estado ciego 3 h 36 min sin quedar escrito no lo habría detectado ningún control de este
tipo — eso lo caza el guard del dato, que ya existe. Son dos huecos distintos y hace falta
tener los dos.

---

**Trabajo ya hecho que sigue vigente:** insumo v2 auditado limpio, mordida 12/12 · costa OSM
cargada y verificada · testigos corregidos, 48 de 54 · topónimos IGM registrados · R1 pieza 1
completa con mordida 20/20 · el auditor de tramos silenciados (`fase5Y`) · el inventario
re-ejecutable de §1.

---

## 8. BITÁCORA DEL DOCUMENTO

| versión | fecha | qué cambió |
|---|---|---|
| 2.2 | 2026-08-12 | **Día de higiene y de cierres laterales. Ninguna etapa avanzó; una estuvo rota y nadie lo vio.** **(1) E0.1 estuvo CIEGO 3 h 36 min** — `a4ea1c1` (15:00:30) le metió un BOM UTF-8 al mapa de contactos; `require()` lo descarta y por eso la suite siguió en 76/76, pero `catalogo-bahias.js:111` usa `JSON.parse(fs.readFileSync(...))`, que no, y de ahí cuelga el control de drift. Salía exit 1 y **moría antes de escribir el estado versionado**, con lo cual el BOM apagó los dos rastros que E0.1 tiene para no ser silencioso: el log y el diff de git. Arreglado en `22530b6`; **guard nuevo** `datos-sin-bom.test.js` que recorre `src/data/` y falla si un `.json` arranca con BOM, verificado en verde (79/79) y en rojo con fixture. Addendum en la fila de E0.1. **(2) El andamio NO se regenera** (decisión del owner): el generador lee v1 y no v2, así que saldaría la deuda equivocada, y `cotejo_lacustre_adjudicado.json` es su otro insumo y E3 lo va a regenerar primero. Exposición medida sin regenerar: 4,6 % de km y 1 de 26 restricciones, esa 1 en el margen que separa el +11 del piso +7. **Reverificado: las 11 siguen siendo 11**, contra el supuesto de que ancud y chonchi ya estaban resueltas. **(3) Sondeo de catálogo cerrado sin aplicar** — contra-prueba de que SITPORT no sirve como fuente de jurisdicción; evidencia bajada a `_bitacoras/` y podada de 1,2 MB a 169 KB con `PROCEDENCIA.txt`. **(4) Resoluciones locales de DIRECTEMAR: vía cerrada** — hablan de límites de puerto, no de jurisdicción. **(5) §7.1 nueva**: los frentes laterales y el de **contacto**, que se declara explícitamente **fuera de E0–E6** en vez de forzarlo dentro. **Contradicción detectada en D6, y zanjada por el owner el mismo día.** Se detectó que la tabla de decisiones decía `abierta` mientras la entrada 2.1 de acá abajo decía "D6 se cierra" — dos afirmaciones opuestas en el mismo documento, ninguna de las dos con evidencia citada al lado. **Zanjada a favor de la bitácora: la desactualizada era la tabla**, y se corrigió la fila con la evidencia que faltaba (el Art. 2 en `articulos`/`art_2`, en v1 y v2, con procedencia al TM-025 A y los tres términos que faltaban, medidos). **El registro de que la contradicción existió no se borra** (§3.3): la fila vieja decía `abierta` sin nada en la columna "qué se necesita para decidir", y ése era el síntoma — una decisión sin evidencia citada a ninguno de los dos lados puede quedar desincronizada sin que nada lo cace. Es exactamente la clase de divergencia que §7.2 propone cazar. **Corrección al mensaje del commit `22530b6`**: dice que el control salía exit 1 "desde el 2026-08-11", y es falso — el 2026-08-11 es la última escritura del estado, no el inicio de la falla. La ventana real es de hoy, `a4ea1c1` 15:00:30 → `22530b6` 18:36:53. El mensaje no se reescribe; queda corregido acá y en el addendum de E0.1. **Deuda de proceso que este día dejó visible: §7 se actualiza a mano y hoy no se actualizó** hasta que el owner lo pidió — ver §7.2. |
| 2.1 | 2026-08-12 | **Pasada de alineación del insumo contra el TM-025 A (4-jun-2025), cerrada en siete pasos.** El insumo no reproducía el decreto: faltaba contenido en diez Capitanías, faltaban los dieciséis párrafos de Gobernación y el Art. 2, dos correcciones tenían un motivo que el texto oficial desmiente, y no había forma de saber contra qué versión se había transcrito. Todo eso queda cerrado y declarado; el texto oficial entra al repositorio con su procedencia y su sha256. **Correcciones a este documento:** §1.2 decía que al insumo le faltaban tres cosas y eran más; el Art. 2 deja de ser "no reproducible" y **D6 se cierra**; **E3 cambia de insumo** y suma la precondición de regenerar el cotejo lacustre; se registran **D11 y D12**. **Hallazgo propio:** `adjudicacion_tramos.json` declaraba derivar de un v2 que no existe en ningún commit, y ni se escribía ni se verificaba — ahora lo escribe un script con autorización del owner y lo verifica **B12**. Tres controles nuevos en el auditor (**B10**, **B11**, **B12**) con mordida 9/9 y control negativo. **Bahía Paraíso queda diferida y declarada**: su cláusula del límite Sur dispara la adjudicación de sus cuatro tramos, así que texto y figura van juntos en su propia etapa. |
| 2.0 | 2026-08-12 | **E2 cerrada: el cambio de unidad tiene su número.** +11 restricciones sobre ocho rutas reales, con piso +7 tras cruzar las apariciones contra el traslape — **los dos positivos, así que el volumen sube pase lo que pase con la ambigüedad**. **Ninguna restricción se pierde por el cambio de unidad**: las 17 que caían en el número crudo eran 16 de jurisdicciones sin geometría y 1 de las 6 que E0.3 dejó abiertas. Método de conteo decidido por el owner —las sin geometría se excluyen, porque el aviso de INV-3.6 ya las cubre y contarlas sería contarlas dos veces— **con la condición de que el número declare aparte y de forma visible las 16 que no se listan al patrón y que hoy sí se muestran**. Dos errores de medición propios, cazados antes de reportar: contar segmentos que cruzan una frontera como si fueran traslape (daba 40,3 % en vez de 10,5 %) y comparar v1 con v2 por nombre de campo cuando no comparten esquema (daba 64 de 64 en vez de 11). |
| 1.9 | 2026-08-11 | **E1 cerrada.** El andamio queda declarado y con dos guards que no pueden divergir. Lo que la etapa corrigió, además de construir: la marca vieja de la capa decía que dos jurisdicciones estaban desactualizadas y **son 11**, todas del corredor donde corren las rutas reales; el conteo de bahías que caen fuera de la capa (110 de 163) **no se usa para juzgarla**, porque los puntos de bahía son de orilla y este repositorio ya pagó una vez ese error; y una afirmación del propio reconocimiento se corrigió al pie por medir el recorte y presentarlo como fidelidad a la fuente. Regenerar desde v2 queda como **deuda declarada dentro del dato**, con las 11 nombradas. |
| 1.8 | 2026-08-11 | **E0.3 cerrada, y con ella E0 entera** — quedan desbloqueadas E1, E5 y E6. El join pasa a ser dato declarado propio con la clave del decreto (`join_bahia_jurisdiccion.json`, 164 entradas, 158 resueltas). **Tres cosas que el plan daba por sentadas y la medición corrigió:** las "3 variantes de nombre (36 bahías)" son **dos** (18 bahías) y una **sobre-atribución** —`Cisnes` cuelga 18 y SITPORT le da 2—; de las 29 jurisdicciones sin bahía, **SITPORT sí le atribuye a 27**, o sea que el mapa las colapsa en la vecina en vez de que SITPORT no publique; y la bahía 146, la única que SITPORT no atribuye, **la resuelve el decreto**. **El instrumento que más cerró fue el del caso Ancud**: cuatro líneas compartidas declaradas resolvieron 15 bahías. **Hallazgo:** 251, 252 y 253 están al Norte del límite Norte de Melinka *y* de Puerto Cisnes — las dos fuentes operativas proponen jurisdicciones que el decreto excluye; van a Quellón. **La deuda de E0.2 quedó saldada por la raíz**, no por copia: con `jurisdiccion_id` la regla de coincidencia deja de ser regla. **Medido antes de aplicar** (0 banderas movidas, y el hallazgo del teléfono que decidió la forma del arreglo) y **medido después de construir** (mordida 16/16, suite 76/76, regeneración byte a byte, que no se cumplía y se arregló). Quedan **6 bahías sin resolver, cada una con su fuente dentro del dato**, que se resuelven todas juntas. |
| 1.7 | 2026-08-11 | **E0.2 cerrada.** Registro de ámbitos publicados como dato declarado, hermano de `zonas_aviso.json` en mecánica y no en archivo — ese validador exige `participa_matching=false` y las 6 lacustres son `true`, así que meterlas ahí habría exigido aflojar el control (§0.3). **Hallazgo que reordena INV-3.6:** el contrato define la causa (a) como "no tiene geometría **cargada**", que es un hecho de la base, y el código la decidía preguntándole al **insumo**; por ese desfase un ámbito nunca construido salía etiquetado (b), o sea "defecto de construcción nuestro" sobre una capa que para ese ámbito no existe. No hizo falta tocar el contrato. **Hallazgo normativo abierto:** INV-3.5 nombra tres ámbitos y el insumo tiene cuatro — `antartica` no aparece en el contrato. **P1 aprobada:** se suma a INV-3.5; texto propuesto en `_bitacoras/e02_texto_propuesto_inv35_2026-08-11.md`, lo escribe el owner. **D9 y D10** registradas. Corregido además `estado_drift.json`, que publicaba el resultado de su propia mordida desde `01d3901`. |
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
- ~~**Cuántas de las 30 jurisdicciones sin bahía atribuida son un problema real** y cuántas son
  jurisdicciones donde SITPORT simplemente no publica.~~ **CONTESTADA en E0.3 (2026-08-11):** son 29, y
  SITPORT le atribuye bahías a **27** de ellas. "SITPORT no publica ahí" explica solo 2 (`papudo` y
  `rada_covadonga`); las otras 27 el mapa operativo las colapsa en la Capitanía vecina.
- **Plazos.** No hay estimaciones acá a propósito: E4 depende de cuántas iteraciones tome C3,
  y eso no se sabe hasta medir después de P4' y P3.
