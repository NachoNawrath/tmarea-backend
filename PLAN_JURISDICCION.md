# PLAN DE TRABAJO — RESOLUCIÓN DE JURISDICCIÓN POR CAPITANÍA

> **Documento de trabajo, no informe.** Se actualiza **al cerrar cada etapa**, no al final.
> Cada etapa cierra con evidencia citada; cada decisión queda con su fecha y su motivo.
> Si algo se mide y contradice lo escrito acá, manda la medición y el documento se corrige.
>
> Rige `CONTRATO_MOTOR.md` v1.7. Este documento **no crea reglas**: donde una regla es
> del contrato, se cita; donde es de producto, se dice que lo es.

**Versión del documento:** 2.5 · **Escrito:** 2026-08-10 · **Última actualización:** 2026-08-15
**Estado:** plan aprobado. Especificación aprobada (S5 abierta como D4). **E0, E1, E2 y E3 CERRADAS** — el ámbito lacustre está publicado y consultado, con una restricción real llegando al patrón (§7). El cambio de unidad tiene su número: **+11 restricciones, piso +7**. Quedan **E4, E5 y E6**. **E4 en curso**: el límite Norte de `arica` quedó **declarado y no construido** (D16, 2026-08-15) — se cerró el registro, **no** la jurisdicción, y el conteo del ámbito **marítimo sigue en 44 cerrable / 8 no_cerrable** (sobre las 64: **54 / 10**).

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
*¿Cómo se corrige?* ~~(a) es trabajo de fuente externa, declarado;~~ (b) es decisión D6; (c) es
deuda de §8.

> **Corrección medida el 2026-08-15 (§3.3: la línea de arriba no se borra). "(a) es trabajo de
> fuente externa" era cierto de las diez y ya no lo es de ninguna de tres.** El barrido de las
> `no_cerrable` (`_bitacoras/no_cerrables_2026-08-15/`) y el trabajo sobre `arica`
> (`_bitacoras/arica_limite_norte_2026-08-15/`) las separan por lo que de verdad les falta:
> **`lirquen` y `talcahuano` no esperan dato** —la costa de la Bahía de Concepción está en la
> capa OSM, 1.627 polígonos medidos, y lo que falta es la **regla** P4' de E4—; **`arica`
> tampoco espera dato desde hoy** —su límite Norte está **declarado** como convención del owner
> y lo que falta es el **mecanismo de alcance**, que es construcción nuestra—; y
> **`puerto_williams`** necesitaba un ancla que la convención `punto_interior` ya resolvía sin
> fuente ninguna (aplicada en `e2db84b`, y **no lo volvió construible**: destapó el hito Nº 26).
> **Siguen siendo trabajo de fuente externa** `punta_delgada` y `tierra_del_fuego` (Cabo del
> Espíritu Santo, IGN argentino o Tratado de 1881) y, **parcialmente**, `baker` y `puerto_eden`
> (DPA_2023 da la línea hasta lon −73,97 y faltan ~127 km por los canales). Las dos
> `insular_remota` son otra cosa y se tratan aparte.

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
**Remedido el 2026-08-14 — la línea de arriba es la medición del 2026-08-10 y no se borra
(§3.3): 164 entradas · 0 sin teléfono · 17 sin Capitanía atribuida · 39 nombres de
Capitanía.** Las 17 sin atribuir son 96, 105, 106, 127, 129, 139, 140, 154, 209, 210, 231,
245, 246, 247, 248, 249 y 250. El nombre nuevo es `Lago Ranco`: las bahías 144, 145 y 146
pasaron de `null` a la Capitanía que el decreto les da, con lo que la atribución de la 146
—decidida por el owner ese mismo día— deja de vivir sólo en su bitácora.

*¿Sirve?* Hoy sí, para lo que hace: poner nombre y teléfono en una tarjeta.
*¿Qué le falta?* **Es el insumo menos preparado para lo que viene.** Al cambiar la unidad
pasa de cosmético a normativo: decide si una restricción aplica. Su estado medido:

| problema | medida |
|---|---|
| bahías sin Capitanía atribuida | ~~24~~ **17** (2026-08-14) |
| nombres de Capitanía que no calzan con el insumo | ~~4~~ **2 vigentes de 4 medidas** (2026-08-14) |
| — `Hornopirén` → candidato `Rio Negro Hornopiren` | 8 bahías |
| — ~~`Cisnes` → candidato `Puerto Cisnes`~~ **APLICADO en `f421949` (2026-08-14)** | 18 bahías |
| — `Chacabuco` → candidato `Puerto Chacabuco` | 10 bahías |
| — ~~`Guayacán` → **sin candidato en el insumo**~~ **RESUELTO en `Coquimbo`, `f421949` (2026-08-14)** | 1 bahía (86) |
| jurisdicciones del decreto sin ninguna bahía atribuida (con nombre exacto) | **30 de 64** |
| discrepancias de clase C medidas | 5 jurisdicciones, 6 bahías |

**Los dos renombres de `f421949` cierran contra el insumo, medido el 2026-08-14:** `Puerto
Cisnes` calza con `puerto_cisnes` ("Puerto Cisnes") y `Coquimbo` con `coquimbo`
("Coquimbo"). Los nombres viejos no calzaban con ningún `id` ni `nombre` del insumo.
**Siguen sin calzar dos**, que son las que la fila de arriba deja vigentes: `Hornopirén`
contra `hornopiren` ("Rio Negro Hornopiren") y `Chacabuco` contra `puerto_chacabuco`
("Puerto Chacabuco").

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
  > **Al día el 2026-08-15 (§3.3: el bullet no se borra porque el número no cambió).** Siguen
  > siendo **10**, y conviene decir por qué el trabajo de `arica` de ese día **no lo movió**:
  > la Opción D **declara** su límite Norte y **no construye geometría**, a propósito. El
  > conteo por ámbito, que es como hay que leerlo siempre: **marítima 44 cerrable / 8
  > no_cerrable**; sobre las 64, **54 / 10**. Si alguna vez esto dice 45/7 marítimas sin que se
  > haya construido el mecanismo de alcance, alguien escribió `limite_norte_dec`.

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
| 4 | **Escribir el cableado y su prueba de mordida, sin aplicar** | **CERRADO** 2026-08-13 · `_bitacoras/e3_cableado_2026-08-13.txt` |
| 5 | **Aplicar el build · mover el registro · activar el cableado** — un solo movimiento, tres piezas | **CERRADO** 2026-08-13 · `_bitacoras/e3_paso5_2026-08-13.txt` |
| 6 | **Verificación de punta a punta y regresión** | **CERRADO** 2026-08-13 · `_bitacoras/e3_paso6_2026-08-13.txt` |

> **Los seis pasos están cerrados, y la ETAPA también: el 2026-08-13.** La secuencia
> queda escrita porque también es registro — al cerrar el paso 6 el cierre de la etapa
> se **propuso** al owner con su evidencia, no se dio por hecho (§5.1 de `CLAUDE.md`:
> cada fase termina con alto explícito), y **el owner lo aprobó ese mismo día**. **La
> marca de estado y la evidencia punto por punto viven en §7**, no acá.

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

#### Paso 4 CERRADO — 2026-08-13. El cableado está escrito, probado y APAGADO

Bitácora: `_bitacoras/e3_cableado_2026-08-13.txt`. **No se aplicó nada**:
`consultada: false` en el dato, `ambitos_publicados.json` sin tocar,
`jurisdicciones_ds991` sin existir. Verificado levantando el backend y pegándole al
endpoint: la respuesta de `restricciones-ruta` es la de siempre.

**El interruptor es dato, no código.** El bloque nuevo `capa_publicada_por_ambito`
de `capa_consultada.json` lleva `consultada: false`; ponerlo en `true` es el tercer
movimiento del paso 5. **El nombre de la capa no se escribe ahí**: sale de
`capa_publicada` de `ambitos_publicados.json`, que es donde viven los controles que
lo comprueban contra la base — dos textos que sincronizar es lo que E1 ya corrigió
una vez.

**Fueron seis archivos y no cuatro**, y las dos diferencias se declaran en vez de
aparecer en el diff:

- **`join-bahia-jurisdiccion.js` sí cambió** (el paso 3 dijo "sin cambios de
  código"): el join sólo sabía ir de bahía a jurisdicción y el cableado necesita el
  sentido inverso. `bahiasDeJurisdicciones(ids)` vive en el módulo dueño de la
  atribución, no en la ruta.
- **`capitania-de-bahia.js` es nuevo**, y con él se tocó `sitport-routes.js:781`
  además de `bahiasEnRutaPostGIS`. Sin eso, el paso 5 activaría el cableado y un
  patrón en el Lago Puyehue vería "Puerto Montt", que es justo lo que el owner
  decidió evitar: el paso 5 es *aplicar*, no *escribir*. La regla **no nombra a
  nadie** (§4.3) — dice *"las bahías cuya jurisdicción es de un ámbito publicado"*—
  y con la lista vacía, que es hoy, se comporta idéntico a antes.

**Decisión propia declarada: el guard de arranque.** El paso 3 midió que el join
*"empieza a poder detener el arranque"*, y escrito el cableado eso no pasaba solo —
`cargarJoin()` se llama dentro de la consulta, así que un join inválido habría
reventado en la primera ruta. `verificarCableadoEnArranque()` + su bloque en
`src/index.js`, hermano del de E1: **con el cableado activo** el join se valida antes
de escuchar; **con el cableado apagado no se toca**, porque hacerlo capaz de tumbar
un backend que no lo consume sería ensanchar el radio de falla sin decidirlo.

**La 257, decidida:** sigue sin listarse —sin coordenada no se la puede ubicar en el
orden de tránsito— y **deja de descartarse en silencio**: el `continue` lleva su
motivo y a quién le corresponde, que es A3. §4.2 sin cambiar comportamiento.

**Mordida 21/21** (`scripts/e3_prueba_mordida_cableado.js`), **contra el ensayo**
porque la capa no existe: se materializa dentro de una transacción que se deshace,
con la geometría del andamio y **con las 44 marítimas adentro a propósito**. Las dos
direcciones, medidas:

- **lo lacustre entra** — ruta en el Lago Llanquihue: hoy `{}`, con el cableado
  `{111, 159, 160, 161}`;
- **ninguna marítima sale** — Anahuac → Melinka: 14 bahías antes, las mismas 14
  después, el ensanche agrega **0**. Y ese cero lo produce el filtro por ámbito, no
  una consulta rota: **con `maritima` también publicada agregaría 31**;
- **la cobertura se cableó junto con la lista**, que era la trampa 2: el tramo
  lacustre pasa de **18,992 km descubiertos a 0,000**, y la ruta marítima no se
  mueve (22,0256 km antes y después). Sin esto, la restricción aparecería *y* su
  tramo se registraría como defecto de construcción nuestro.

**Hallazgo de la mordida, y la que estaba mal era la expectativa:** las bahías de
`puerto_varas` son **cuatro, no tres**. La **160 (Lago Puyehue)** tiene
`jurisdiccion_id: lago_ranco` y `jurisdicciones_adicionales: [puerto_varas]` — el
decreto parte el lago en el límite regional, y es la única entrada del join con
jurisdicción adicional en las 164. La expansión mira principal **más** adicionales,
que es INV-3.4 leído al revés: muestra de más, nunca de menos.

**Regresión:** suite **79/79**, las cuatro mordidas de al lado en exit 0 (E0.2, E0.3,
E1, A3), el backend arranca y el endpoint responde igual.

**Lo que este paso no midió, y dónde se mide:** cuánto tarda el SQL sobre la capa
real y la geometría lacustre definitiva (paso 5); el efecto sobre las 8 rutas del
arnés y el alcance nuevo del control de drift (paso 6); la rama activa del guard de
arranque (paso 5, es una línea con mordida propia 16/16).

#### Paso 5 CERRADO — 2026-08-13. La capa existe, el registro no miente, el cableado está activo

Bitácora: `_bitacoras/e3_paso5_2026-08-13.txt`. **La aceptación de E3 se cumple.**

**Los tres movimientos se hicieron juntos**, precedidos por la declaración de D13:

1. **Build aplicado** — 13 min 12 s, **exit 3, publicación parcial**. Gate: publica
   `lacustre` (6/6 con geometría, 4.479,4 km², ocho controles en ok); retiene `maritima`
   por C3; retiene `antartica` (7 controles ok, 4/4 con geometría) e `insular_remota`
   **por declaración, no por control** — el antártico no se tocó, como el owner fijó.
   **C3 falla con los mismos seis pares y los mismos km² que el 2026-08-12, al milésimo**,
   y el Puyehue sigue pasando por declarado y no por vacío.
2. **`ambitos_publicados.json`** — el lacustre a `publicado: true`. Se le retiró la `causa`
   (decía "toda la navegación lacustre es invisible para el motor", y dejó de ser cierto),
   con su texto histórico conservado dentro de `como_entro`; y la `geografia_de_reclamo`
   pasó a `null` con su motivo escrito, porque **un ámbito publicado no reclama** y dejarla
   sería dato muerto que alguien puede leer como vigente.
3. **`capa_consultada.json`** — `consultada: true`.

**Aceptación, medida contra la capa real** (no contra el ensayo del paso 4): el Lago
Llanquihue pasa de `{}` a `{111, 159, 160, 161}` y devuelve su Capitanía **del decreto**
—Puerto Varas, ya no "Puerto Montt"— con el teléfono del mapa; **su aviso de INV-3.6 se
retiró solo**, de 18,992 km de hueco a **0,000**; y la ruta marítima Anahuac→Melinka no se
movió: 14 bahías antes y después, el ensanche agrega 0, y sus 22,0256 km de defecto de
recorte son los mismos. **Todos los números del paso 4 se reprodujeron exactos sobre la
geometría definitiva.**

**Una cosa escrita y cerrada resultó inexacta, y queda corregida al pie (§3.3):** este plan
y la bitácora del paso 2 dicen que aplicar sin mover el registro deja el repositorio *"en un
estado que no arranca"*. Se midió antes de mover nada y **el backend arranca**; el retiro
automático de E0.2 (C3) muerde en la **primera consulta** —HTTP 502, veredicto U—, porque
`cargarAmbitosPublicados` se llama dentro de la ruta y no en el boot. La conclusión no
cambia —aplicar y mover siguen siendo el mismo movimiento— pero **el modo de falla es peor
de lo que estaba escrito**: un backend caído se ve; uno en pie que devuelve 502 en cada
ruta, no.

**D13 se escribió, y no era sólo el río Bueno.** Ver la sección de D13 más abajo.

**Tres cosas envejecieron el mismo día, las tres por nombrar al ámbito lacustre** (§4.3 de
`CLAUDE.md` cobrándose tres veces): la suite quedó **14 de 80 en rojo** porque su pool falso
tenía escrito a mano *"la capa publicada no existe"*; la **mordida de E0.2 cayó a 11/14**
porque tres casos nombraban al lacustre —y uno de ellos, el 09, estaba saliendo **CAZADO por
el control equivocado**, C4 en vez de C6—; y la **mordida del cableado dio 4 fallos** porque
su parte B materializaba la capa con un `CREATE TABLE` y su B7 afirmaba que la capa no
existía. **Ninguna era un defecto del producto: las tres afirmaban el estado que el paso 5
existía para terminar.** Las tres quedaron re-apuntadas construyendo su escenario en vez de
heredarlo del estado del día, y el resultado es **más fuerte que antes**: la parte B corre
ahora contra la **capa real**, B4 conserva su contrafáctico inyectando las 44 marítimas
dentro de un `SAVEPOINT` que se deshace, B7 pasa a probar que la mordida **no tocó** la capa,
y **A13 ejerce las dos ramas del guard de arranque**, que era el pendiente que el paso 4 dejó
escrito para este paso.

**Regresión:** suite **80/80** · cableado **21/21** · carencia **14/14** (nueva) · E0.2
**14/14** · join **16/16** · andamio **14/14** · A3 **10/10** · gate **10/10**. El guard
estrenó su rama activa: `[cableado E3] activo — join de E0.3 validado: 158 resueltas, 6 sin
resolver de 164`. **El drift no trae ninguna divergencia nueva**: la única contra el
respaldo es la **258**, ya medida y decidida (D14) antes de esta sesión; `estado_drift.json`
se restauró al estado commiteado, verificado por sha256.

**Dos cosas subieron al owner porque deciden qué ve el patrón. Las dos quedaron resueltas el
mismo día, y las dos terminaron en el frente de contacto de §7.1** — medición completa en
`_bitacoras/e3_medicion_160_2026-08-13.txt`:

- **La gobernación de la bahía 160 dice "Puerto Montt" y su Capitanía dice "Lago Ranco".**
  El owner decidió que la gobernación saliera del join, igual que el nombre, y **retiró la
  decisión el mismo día**: aplicarla sola dejaba tres campos contradiciéndose en la misma
  tarjeta —Capitanía Lago Ranco, Gobernación Valdivia, teléfono de Puerto Varas—, peor que hoy.
  **Queda como está.** El intento hizo visible que el defecto está en la **clave** del archivo y
  no en el valor de un campo, y con eso **el frente de contacto cambió de naturaleza**: no es
  aplicar el CSV de las 64, es que el contacto está indexado **por bahía**. Ver §7.1.
- **La bahía 160 tiene dos jurisdicciones y se muestra una.** **Queda sin resolver, y va al
  frente de contacto.** Elegir una principal **es inventar una partición que la fuente no da**
  —el decreto parte el lago, el shapefile trae un solo polígono y el criterio no está
  determinado—, y arreglarlo sólo para la 160 sería un caso particular en el código (§4.3): es
  la única de las 164 con `jurisdicciones_adicionales`. **Lo que sí quedó decidido:** la
  combinación de hoy —la Capitanía que SITPORT no usa para esa bahía con el teléfono de la que
  sí usa— es **la peor de las dos posibles**, y **no se deja así a propósito**; se deja porque
  arreglarla bien es ese frente.
- **Al registro de DIRECTEMAR entró la entrada 6** (el Puyehue): se pregunta **quién atiende y
  quién publica**, no de quién es —eso lo contesta el decreto—, y **no** se les pide la
  georreferencia del límite regional, que es `DPA_2023` y está en disco sin cargar.

**Lo que el paso 5 no midió, y es del paso 6:** las otras seis rutas del arnés; el alcance
nuevo del control de drift (el Set que A3 recibe creció en lo lacustre); una restricción
lacustre real en pantalla —**SITPORT no publica ninguna hoy** en esas cuatro bahías, así que
la aceptación se probó hasta el matching y el contacto—; y la 257 en vivo.

#### Paso 6 CERRADO — 2026-08-13. La regresión da cero y la aceptación se cerró con dato real

Bitácora: `_bitacoras/e3_paso6_2026-08-13.txt`. Instrumento nuevo y versionado:
`scripts/e3_verificacion_paso6.js`. **No se tocó ningún archivo de `src/`.**

**El instrumento es un CONTRAFÁCTICO, no un baseline, y el motivo es la lección del
paso 5.** El script corre el mismo motor **dos veces sobre las mismas coordenadas**
—una con el cableado como está y otra con el ensanche apagado **en memoria**, sin
tocar el archivo en disco, comprobado por sha256 en cada pasada— y compara las dos
salidas. Un número copiado de una bitácora vieja envejece; una diferencia medida en
la misma corrida, no. Las 8 rutas se rutean **una sola vez** y sus waypoints quedan
en disco, para que una diferencia entre pasadas no pueda venir del ruteo.

**LA REGRESIÓN QUE LA ETAPA SE COMPROMETIÓ A MEDIR EN VEZ DE AFIRMAR: CERO.** Sobre
**19 rutas** —el arnés entero de E0.2 (8 ruteadas + 2 directas), la del Llanquihue
del paso 5, seis cuerdas lacustres, un control negativo y la recta de abajo—, de las
cuales **11 no son lacustres**: **0 banderas movidas · 0 bahías agregadas · 0 km de
cobertura movidos**. Las ocho del arnés coinciden además con lo que E0.2 midió el
2026-08-11.

**El fundamento declarado del plan quedó medido contra la capa publicada**, y
reproduce el rango al kilómetro: traslape de la capa vigente con las seis lacustres
**0,000000 km²**, y distancia a la celda más cercana **de 16,178 a 84,178 km** —los
extremos son `puerto_varas` y `lago_villarrica`—. Deja de ser una cita del andamio.

**EL PUNTO QUE EL PASO 5 NO PUDO EJERCER SE CERRÓ EN VIVO, Y NO HUBO QUE FABRICAR
NADA.** Hoy SITPORT publica **dos restricciones lacustres reales** —bahías 105 Lago
Villarrica y 106 Panguipulli, las dos de tipo TODOS, captura cruda versionada— y las
dos llegan a pantalla. Sobre la ruta **210 → 209 del arnés de E0.2** —elegida el
2026-08-11, antes de que esta capa existiera, que es lo que la hace la evidencia que
más pesa—: HTTP 200, **veredicto UV, puerto cerrado**, Capitanía **Lago Villarrica**
con `capitania_fuente: decreto`. **Ese es el falso negativo de seguridad que E3
existía para cerrar, y estaba activo hoy**: ayer ese mismo patrón, con el puerto
cerrado por su propia Capitanía, veía el aviso de INV-3.6 y ninguna restricción. El
contrafáctico no se argumenta: con el ensanche apagado el Set de esa ruta es
**vacío**, y `sitport-routes.js:757` descarta toda restricción cuya bahía no esté en
el Set. **Y la fuente corrobora INV-3.4 con sus propias palabras**: el texto dice
*"en todos los lagos de la jurisdicción"*.

**Las seis lacustres, no sólo la que la aceptación nombra**, con una cuerda por
jurisdicción: las seis pasan de `{}` a su conjunto de bahías, las seis de U a Q, las
seis con hueco 0,000 km, y las 21 bahías con el nombre del decreto. **Declarado sin
suavizar: las seis cuerdas se derivaron de la propia capa, así que para el MATCHING
son circulares por construcción**; lo que prueban de verdad es todo lo que viene
después —join, contacto, cobertura y filtro por ámbito—. Las dos rutas independientes
son la de E0.2 y la del paso 5.

**El alcance nuevo del control de drift A3, medido**: las reparticiones que entran al
Set no cambian en ninguna de las 8 marítimas ni en la antártica, y crecen sólo en lo
lacustre (186, 201, 184, 188, 235, 97). **Efecto en vivo hoy: ninguno** — de las 6
restricciones de tránsito, cero caen bajo una bahía que `BAHIA_COORDS` no tenga, así
que A3 da 0 avisos con el cableado y sin él. Lo que creció es la **capacidad** del
control, no su salida de hoy.

**La 257: el mecanismo se cumple, el dato real no existe hoy.** Entra al Set por el
ensanche (`{128, 203, 257}`), A3 la resuelve a la repartición 235, y con un registro
**sintético y declarado como tal** pasa de `defecto (fuera de la ruta)` con bandera Q
a **defecto + aviso** con bandera U, que es exactamente lo que el paso 4 dejó medido.
**SITPORT no publica nada bajo la 257 hoy**, así que verlo con dato real depende de
DIRECTEMAR y no de nosotros; fabricarlo habría sido inventar el dato.

**Dos números que parecen una regresión y no lo son, medidos en vez de argumentados:**
`Anahuac → Melinka` da acá 11 bahías y 32,841 km y el paso 5 dice 14 y 22,0256. Son
**dos geometrías**: aquélla es la **recta de dos puntos**, ésta la **ruteada** (21
waypoints, 306,6 km contra 275,3). La recta se agregó al arnés de este script y
**reproduce los números del paso 5 exactos**.

**Dos hallazgos laterales que no son de E3 y quedan anotados con su dueño:** SITPORT
atribuye **seis de las siete bahías de `lago_panguipulli`** a la repartición 186
(Villarrica) —conflicto decreto-vs-SITPORT que **E5 existe para probar**, y que
INV-3.3 resuelve a favor del decreto—; y la restricción de Panguipulli **acota su
área en el texto** (excepúa el Lago Calafquén, bahía 247) mientras el motor la muestra
a las siete: **es la nota de alcance de INV-3.4 funcionando como está escrita** —el
motor no implementa el nivel de sector y muestra de más, nunca de menos—, y es el
**primer caso real observado** de esa nota.

**Regresión:** suite **80/80** · cableado **21/21** · E0.2 **14/14** · join **16/16**
· andamio **14/14** · A3 **10/10** · carencia **14/14** · gate **10/10**. Nada
envejeció, y era el riesgo: el paso 5 movió el estado del mundo, este paso sólo lo
midió. La capa quedó con sus 6 lacustres, verificado después de la mordida del gate.
**Sin divergencias nuevas en el drift** (la 258, ya decidida por D14);
`estado_drift.json` restaurado y verificado por sha256.

**Lo que este paso NO midió:** la 257 con dato real; una restricción lacustre
**informativa** (las dos de hoy aplican); el nivel de sector; **la PWA** —todo se midió
contra el backend, la tarjeta no se vio en pantalla—; y rutas lacustres **ruteadas**,
porque el raster router no tiene tile lacustre.

#### Lo que D13 necesita y hoy no existe — medido el 2026-08-13, antes de construir nada

**El owner pidió que se le dijera antes de construirlo, y la respuesta es que hay que
partir su instrucción en dos mitades, porque una se cumple hoy y la otra no.**

**Lo que sí existe: declarar.** El precedente que la decisión invoca —las 11 Capitanías
de D11— es un bloque `alcance_d11` dentro de `cotejo_lacustre_adjudicado.json`, con su
`carencia_declarada`. Escribir el río Bueno igual es **aditivo y no toca el contrato**.

**Lo que NO existe: que esa declaración cambie algo.** `alcance_d11` lo **escribe**
`scripts/fase2_adjudicacion.py` y **no lo lee ningún archivo de `src/`** — medido con
`grep` sobre `src/` y `scripts/`: los catorce consumidores del cotejo son todos scripts.
O sea que **la declaración de D11 es documentación del insumo, no un mecanismo del
motor**: no reclama ningún tramo, no produce aviso y no evita nada.

De ahí se sigue el punto que decide: **con el mecanismo de D11, un tramo por el río Bueno
se sigue registrando como defecto de construcción nuestro.** El camino está leído en el
código: publicada la lacustre, `ambitos-publicados.js` la saca de `con_geografia`
—`publicado === false` es la condición para reclamar—, ninguna zona de aviso la nombra, y
`cobertura-jurisdiccional.js` cae a `hueco_de_capa`, la causa (b) de INV-3.6.

**¿Toca INV-3.6? No, y el precedente es E0.2.** La causa (a) es *"no tiene geometría
cargada"*, que es un hecho de la base, y el río Bueno no la tiene. E0.2 ya agregó un
segundo origen de la causa (a) sin tocar el contrato; esto sería el **tercero**: *cuerpo
declarado sin geometría dentro de una jurisdicción publicada*. Aditivo en dato y en
código.

**El costo real no es el mecanismo: es la geografía de reclamo.** Para el ámbito salía del
andamio. Para el río Bueno **no hay geometría en ninguna fuente cargada** —por eso el
cotejo lo rechazó—, así que un reclamo exige dibujar una: un corredor sobre los tres
puntos del decreto (Los Patos, La Goleta, El Manzanito), una banda, o una capa
hidrográfica que hoy no está cargada. Convertir esos tres puntos en geometría es
**interpretar el decreto**, que este plan ya declaró que es del owner — y además choca con
la dependencia que D13 declara: si la respuesta de DIRECTEMAR mueve la jurisdicción del
sector, la figura dibujada antes sobra.

**Recomendación, con sus dos alternativas declaradas (§0.2):**

| | qué hace | qué cuesta | qué deja abierto |
|---|---|---|---|
| **A — declarar sin reclamo** *(recomendada)* | escribe la carencia del río Bueno donde se escribió la de D11, con su causa y su dependencia | bajo, aditivo, no toca el contrato ni el clasificador | **un tramo por el río Bueno se sigue registrando como defecto (b)**. Queda como deuda escrita, acotada y visible |
| **B — tercer origen de la causa (a)** | registro nuevo + rama en `cobertura-jurisdiccional.js`, hermano de E0.2 | mecanismo ≈ E0.2 (dato + validador + mordida + una rama), **más una geografía de reclamo que hay que dibujar** | la figura depende de DIRECTEMAR: se puede tirar entera |
| **C — no publicar `lago_ranco`** | espera a que el río Bueno tenga geometría | frena E3 entero por un cuerpo de seis | contradice la decisión de publicar |

**Por qué A y no B**: B es correcto y llega tarde o temprano, pero hoy su única pieza
cara —la figura— depende de una consulta sin enviar. A deja el defecto (b) registrado en
un caso acotado, **declarado y visible en el registro interno**, que es exactamente la
asimetría que INV-3.6 pide sostener; B lo evita al precio de dibujar una geometría que la
respuesta puede invalidar. La diferencia para el patrón es **nula**: en los dos casos ve
el mismo aviso; lo que cambia es el registro interno.

##### D13 DECIDIDA — 2026-08-13, por el owner: OPCIÓN A, declarar sin reclamo

**Fundamento del owner:** para el patrón la diferencia es **nula** —ve el mismo aviso en
los dos casos— y lo que cambia es el registro interno. La B pide **dibujar una figura
decidiendo qué implican tres puntos sueltos del decreto**, que es interpretar la fuente, y
esa figura puede quedar tirada cuando DIRECTEMAR conteste.

**LA DEUDA, SIN SUAVIZAR.** Mientras esto esté así, **el sistema registra internamente
como defecto de construcción propio algo que no lo es**: un tramo de ruta por el río Bueno
cae en la causa (b) de INV-3.6 —*"una zona que ninguna jurisdicción reclama"*, *"un
defecto de construcción nuestro"*— y las dos mitades son falsas. La jurisdicción existe,
el decreto se la da a `lago_ranco` con tres sectores nombrados, y no está mal construida
sino **sin construir por falta de geometría anclable**.

**Es tolerable porque está declarada y porque no sale al patrón. No porque sea
correcta.** Es exactamente la misma forma de falsedad interna que hundió al camino B de
E3; la diferencia —la única, y hay que decirla— es que allá era el ámbito entero y sin
declarar, y acá es un cuerpo de seis, acotado, escrito y con condición de cierre.

**Condición de cierre, para que la deuda no sobreviva a su causa:**

- **se pasa a B cuando DIRECTEMAR conteste** el sector del río Bueno (registro
  acumulativo `_bitacoras/consulta_directemar_registro.md`, entradas 1 y 4); o
- **antes, si aparece una capa hidrográfica cargada** que dé la geometría del río
  **sin interpretarla** — ahí la figura deja de ser una lectura del decreto y pasa a
  ser un dato, y B se vuelve barato y sin riesgo de quedar tirado.

**Lo que el paso 5 tiene que escribir, y todavía no está escrito:** la declaración de la
carencia del río Bueno con esta causa y esta condición de cierre, en el lugar donde vive
la de D11, más su validación de forma. Es aditivo, no toca el contrato ni el clasificador,
y **no evita el registro (b)** — que es justamente lo que esta deuda declara.

##### ESCRITA el 2026-08-13 (paso 5) — Y NO ERA SÓLO EL RÍO BUENO: SON CUATRO CUERPOS

Vive en `data/decreto/cotejo_lacustre_adjudicado.json`, bloque
`carencia_cuerpo_sin_geometria`, hermano de `alcance_d11` y escrito por
`scripts/fase2_adjudicacion.py` (el JSON no se edita a mano, INV-3.7).

**Al escribirla se midió cuántos cuerpos están en esa misma situación —dentro del alcance
de D11, en una de las seis Capitanías lacustres, y sin geometría— y son CUATRO, no uno:**

| jurisdicción | cuerpo | resolución del cotejo | por qué no tiene geometría |
|---|---|---|---|
| `lago_ranco` | Río Bueno | rechazado | el candidato LAGUNA ACHIBUENO está en la Región VII |
| `lago_villarrica` | Río Toltén | ausente | el shapefile de lagos no contiene ríos |
| `lago_panguipulli` | Río Fuy | ausente | el shapefile de lagos no contiene ríos |
| `lago_panguipulli` | Río San Pedro | rechazado | LAGUNA GRANDE DE SAN PEDRO está en la VIII — **el gemelo exacto del caso del río Bueno** |

**Los cuatro caen en la causa (b) al publicarse el ámbito, no sólo el río Bueno.** Declarar
uno y callar tres habría repuesto el silencio que INV-3.6 persigue, y habría dejado una
regla que nombra a una entidad concreta (§4.3).

**Declarar los cuatro se resolvió del lado del ingeniero** (§0.4: es estructura del dato, es
aditivo y no cambia nada de lo que el patrón ve). **La decisión del owner sigue siendo sobre
el río Bueno**: su entrada lleva el texto de D13 y dice `"decidido": "2026-08-13, por el
owner"`; las otras tres dicen *"declarado por el ingeniero, mismo criterio que D13"*. El
bloque declara de dónde salió su alcance, y **el owner lo revoca si corresponde**.

**Las condiciones de cierre no son la misma.** La del río Bueno es la de D13 —DIRECTEMAR, o
antes una capa hidrográfica cargada—. **Las otras tres no dependen de DIRECTEMAR**: no hay
ninguna pregunta abierta sobre ellas, sólo falta la fuente.

**Validación de forma, en los dos sentidos** y con mordida propia **14/14**
(`scripts/e3_prueba_mordida_carencia.py`): se detiene si (1) se declara la carencia de un
cuerpo que el cotejo no tiene; (2) el cuerpo **ya tiene geometría** —una carencia no puede
sobrevivir a su causa, mismo criterio que el C3 de `ambitos-publicados.js`—; (3) **un cuerpo
sin geometría queda sin declarar**, que es el silencio que este bloque existe para impedir y
el que hoy alcanzaba a tres de los cuatro; o (4) a una entrada le falta `decidido`, `causa`,
`que_implica_mientras_este_asi` o `condicion_de_cierre`. Incluye el caso que prueba que **el
silencio se caza en cualquiera de los cuatro** —no es un nombre propio— y una comprobación
de inocuidad por sha256 sobre el cotejo real.

**Regenerar no movió nada cerrado**, verificado clave por clave: la única clave nueva es
`carencia_cuerpo_sin_geometria`, ninguna se perdió, y sólo cambiaron `generado` y `fase`, a
propósito. Adjudicación, `alcance_d11`, conteo y los sha256 de los dos insumos: idénticos.

**La dependencia de D13 tiene dónde vivir**: la pregunta por el sector del río Bueno
—y la de la bahía 258, que apareció el mismo día— están en
**`_bitacoras/consulta_directemar_registro.md`**, el registro acumulativo que el owner
abrió el 2026-08-13. **Se cierra y se envía cuando la construcción termine**: una sola
consulta, no tres parciales. Ahí también entró la evidencia dura del Caso 1 (la
repartición 189 ausente de los dos endpoints de catálogo y `resolver(146) → null`) y la
evidencia de práctica del Caso 2 (12 resoluciones de Tierra del Fuego contra 1 de Punta
Delgada, ninguna de ésta sobre Porvenir).

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
estado que INV-3.6 exige, no un defecto de construcción.

> **AL DÍA EL 2026-08-15 — siguen siendo ocho, y hay que decir por qué, porque dos cosas de
> esta semana parecían moverlo y no lo movieron (§3.3: el párrafo de arriba no se toca).**
>
> **(1) LAS OCHO DE ACÁ NO SON LAS OCHO DE LA FASE 8. Son dos intersecciones distintas y las
> dos son correctas en su universo**, medido en `_bitacoras/no_cerrables_2026-08-15/` §0. Las
> `no_cerrable` del insumo son **DIEZ**. Las de esta lista son las de ámbito **marítima**, que
> son las que cuentan para C4; las de la Fase 8 son las que además estaban entre las 23 sin
> par, e incluyen `hanga_roa` y `juan_fernandez` —que son `insular_remota` y **no cuentan para
> C4**— y excluyen `lirquen` y `talcahuano` —que tienen su par de límites completo—. Seis están
> en las dos. **Cada vez que aparezca un conteo, va con su ámbito al lado.**
>
> **(2) EL ANCLA DE `puerto_williams` NO LO VOLVIÓ CONSTRUIBLE** (`e2db84b`). Lo que hizo fue
> destapar el bloqueo real, que es el **hito Nº 26 del Beagle**, borde con Argentina.
>
> **(3) EL LÍMITE NORTE DE `arica` QUEDÓ DECLARADO Y `arica` SIGUE `no_cerrable`** — Opción D
> del owner, 2026-08-15, `_bitacoras/arica_limite_norte_2026-08-15/`. **Lo que se cerró es el
> registro, no la jurisdicción, y la distinción no es formal**: quien lea "Arica cerrada" va a
> buscar una geometría que no está. El paralelo 18 21 00 S y su ancla retrocalculada
> 070 22 49,7 W están escritos en el v1 como convención, con su procedencia, su precisión
> (1,23 m en longitud entre dos capas independientes) y el rótulo de datum; **`limite_norte_dec`
> queda en `null` a propósito**. Motivo medido: la única receta para una jurisdicción sin
> contorno es `banda_paralelos`, que devuelve la franja entera hasta las 200 mn, y eso
> adjudicaría como chilena el agua entre 24 y 200 mn que el propio paquete de DIFROL niega —su
> línea de ZEE termina 108,3 mn al Sur del paralelo—. **Marítima sigue 44/8.**
>
> **Lo que eso le deja escrito a E4:** falta un **mecanismo genérico de alcance costa-afuera**,
> y se diseña **genérico y no como caso de `arica`** (§4.3). Es P5 llegando temprano, y sus dos
> clientes siguientes ya están identificados: **`baker` y `puerto_eden` tienen exactamente la
> misma forma** —`receta: "-"`, contorno vacío, un paralelo faltante y la misma causa genérica
> palabra por palabra—. Lo que ese mecanismo abre y esta sesión **no** contestó: si el hueco de
> 24 a 200 mn es causa (a) o (b) de INV-3.6, y que `estado_geometria` hoy es binario mientras
> una jurisdicción construida en parte necesita un tercer estado, que los dos validadores de
> `zonas_aviso.json` no admiten (`zonas-aviso.js:196` y `:216`).

Lo que E4 tiene que decidir es contra
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
| D13 | **El río Bueno dentro de `lago_ranco`**: la jurisdicción se publica en el paso 5 con **5 de sus 6 cuerpos**; el río Bueno está `rechazado` sin geometría en el cotejo. ¿Se publica igual, y con qué mecanismo se declara la carencia? | **DECIDIDA 2026-08-13 por el owner en dos tiempos. (1) SÍ se publica**, con el río Bueno **DECLARADO como carencia** dentro de la jurisdicción, no en silencio, y con la dependencia escrita: la respuesta de DIRECTEMAR puede mover la jurisdicción del sector, y si la mueve, cualquier figura dibujada antes sobra. **(2) OPCIÓN A — declarar SIN reclamo**, medido antes de construir nada: para el patrón la diferencia es nula y la B exige dibujar una figura decidiendo qué implican tres puntos sueltos del decreto. | **La deuda queda escrita sin suavizar**: mientras esto esté así, el sistema registra como defecto de construcción propio algo que no lo es. **Tolerable porque está declarada y porque no sale al patrón; no porque sea correcta.** Cierra cuando DIRECTEMAR conteste, o antes si aparece una capa hidrográfica cargada que dé la geometría sin interpretarla. Todo en §E3, *"Lo que D13 necesita y hoy no existe"* + *"D13 DECIDIDA"*. |
| D14 | **La bahía 258** (`RÍO BUENO, SECTOR LLANCACURA`, repartición 188 = Lago Ranco), aparecida en el catálogo de SITPORT entre el 2026-08-12 y el 2026-08-13 | **DECIDIDA 2026-08-13 por el owner: NO se declara. Queda como divergencia ABIERTA**, que es lo honesto — SITPORT creció y nosotros no, y no sabemos dónde está. **No se le rellena coordenada** desde `puertos_chile_nacional.json` ni de ninguna otra fuente: rige el precedente de la 257. | Consecuencia anotada y **correcta**: con el cableado de E3 activo pasa de **defecto registrado** a **defecto + aviso**, porque la repartición 188 entra en la ruta por las bahías 144 y 145. El patrón se entera. Medición completa en `_bitacoras/e01_drift_258_2026-08-13.txt` |
| D16 | **El límite Norte de `arica`**: el decreto lo remite al límite político internacional con el Perú y no lo da. ¿Se declara una convención, y se construye? | **DECIDIDA 2026-08-15 por el owner: OPCIÓN D — se DECLARA y NO se construye.** Paralelo 18 21 00 S, ancla retrocalculada 070 22 49,7 W, alcance 24 mn; más allá no se cubre. **`limite_norte_dec` queda en `null` y `arica` sigue `no_cerrable`: lo que se cerró es el REGISTRO, no la jurisdicción.** Marítima sigue **44/8**; sobre las 64, **54/10**. Detalle y fundamento abajo, en *"D16 — el límite Norte de `arica`"*. | — (decidida). Lo que queda es de construcción y va a su propia sesión: el **mecanismo genérico de alcance costa-afuera**, con `baker` y `puerto_eden` como clientes siguientes |
| D15 | **Política de contacto: qué se le muestra al patrón, y dónde.** ¿Con qué prelación sale el contacto en el punto de zarpe/recalada, y qué dice el mensaje de una restricción cuando no hay teléfono? | **DECIDIDA 2026-08-13 por el owner. Es decisión de PRODUCTO, sin cita normativa, y NO la necesita** — se escribe así explícitamente para que nadie la lea como respaldada por una norma ni salga a buscarle una (§1.1: presentar una regla de producto como si la norma la respaldara es fabricar autoridad). **Son dos contextos distintos, y tratarlos como uno era el error de fondo.** **(1) En ZARPE y RECALADA** se muestra la Capitanía con su **teléfono y su dirección**, en esta prelación: *teléfono de la Capitanía* si lo hay; si no, *el de su Gobernación, **rotulado como Gobernación**, nunca como Capitanía* —que es exactamente el defecto que este frente existe para corregir—; y si no hay ninguno de los dos, **el campo no se muestra**: sin texto de reemplazo y sin mensaje sustituto. **(2) En las RESTRICCIONES** el mensaje es **"confirma con la Capitanía respectiva"**, y ahí termina: **sin teléfono y sin canal de radio**. Fundamento del owner: *el patrón no necesita que se le explique cómo hacer algo que hace siempre*. **(3) El Canal 16 NO es contenido de la app, y la decisión que se venía armando queda RETIRADA.** El 2026-08-13, más temprano, se había decidido un texto de fallback —*"Sin información de contacto disponible. Comunicar por radiotelefonía, VHF Canal 16."*— y se estaba por registrar dónde debía vivir. **No se borra el intento: se registra que se consideró y por qué se retiró**, que es la misma regla con la que quedó escrita la reversión de la gobernación de la bahía 160. La retira (1): si no hay teléfono, no hay campo, así que no hay nada que reemplazar. **(4) Rada Covadonga es Capitanía ESTACIONAL y su contacto es la Gobernación Marítima Antártica Chilena** — queda como el **primer caso de la regla general de (1)**, no como excepción, y por eso no abre rama en el código (§4.3). | **Nada del lado del owner.** Lo que falta es de construcción y está medido el 2026-08-13: aplicada la prelación sobre las 64, quedarían **52 con teléfono de Capitanía · 11 con teléfono de Gobernación rotulado · 1 sin campo**. Ese 1 es `rada_covadonga`, y **es el punto donde la política no se puede aplicar con los datos que hay**: su Gobernación —Antártica Chilena— **no existe en ningún archivo vivo del repositorio**, ni en la tabla de `src/utils/capitanias.js` ni entre las 15 gobernaciones de `src/data/bahia-capitania-map.json`; DIRECTEMAR publica su teléfono (`+56 32 2208557`) y hoy sólo sobrevive en los HTML crudos, recuperables de `297b220^`. Los otros dos insumos que la política exige y que la fuente autorizada **no tiene**: la **dirección** —no es campo de `bahia-capitania-map.json`, y el CSV la trae 63/64— y los **teléfonos de Capitanía** —el CSV los trae 63/64, verificados **63/63** contra los raw—. Las dos cosas dependen de que se decida §5 del contrato, que declara la clave del archivo. Medición en `_bitacoras/e3_paso6_2026-08-13/11_contacto_lacustre.txt` y en el reconocimiento del frente. |

### D16 — el límite Norte de `arica`. Decidida el 2026-08-15.

**La decisión: se DECLARA la convención y NO se construye la geometría (Opción D).** El
paralelo **18 21 00 S**, con ancla en **070 22 49,7 W** y **alcance de 24 mn** desde la costa;
más allá de 24 mn **no se cubre**. Razón operativa del owner: *el patrón no se acerca a la
frontera*.

**Dos cosas quedan escritas en el dato porque implícitas no sirven** (condición del owner):
**(1)** el ancla es un **RETROCÁLCULO nuestro**, no una coordenada que DIFROL publique —el
paquete la deja implícita en el trazado de dos líneas—; **(2)** el datum es un **RÓTULO**
(`DefineProjection` sobre datos hechos en WGS84, sin época), **no hay transformación
pendiente**, y quien reproyecte creyendo que la hay mueve el dato sin motivo.

**Por qué D y no escribir el valor (fundamento del owner, textual en lo esencial):** *todo el
texto de convención que escribe D es el mismo que B va a necesitar; la única diferencia es
`limite_norte_dec`, que es el campo peligroso. Si se escribiera ese campo ahora y el mecanismo
de alcance después, cualquiera que regenere en el medio produce una capa que adjudica agua que
el propio paquete de DIFROL niega. D no abre esa ventana.*

**La objeción que produjo la decisión, medida antes de proponerla:** `receta_banda_paralelos`
devuelve `box(X_W, sur, X_E, norte)` recortado por el buffer de 200 mn, y **no hay ningún campo
de alcance en el insumo** —`alcance` aparece 0 veces en `jurisdicciones_v2.json`—. O sea que
"hasta 24 mn" **no es expresable con las recetas de hoy**: escribir el paralelo produce la
banda entera. Estimación de rectángulo, declarada como tal: de los ~35.700 km² de la figura,
~31.400 quedarían fuera de lo autorizado. Y el propio paquete lo niega: su línea de ZEE termina
en 20 09 42,993 S, **108,3 mn al Sur** del paralelo del ancla.

**LA DECISIÓN DE 24 mn NO SE REVIERTE.** Queda como convención declarada, sin geometría.

**Lo que D NO decide, y va a la sesión del mecanismo:** si el hueco de 24 a 200 mn es causa (a)
o (b) de INV-3.6 · el tercer estado de `estado_geometria` y los dos validadores de
`zonas_aviso.json` que hoy no lo admiten · re-correr los testigos y que dejen de reproducir byte
a byte. **El mecanismo se diseña GENÉRICO, no como caso de `arica`** (§4.3): `baker` y
`puerto_eden` tienen la misma forma y son sus clientes siguientes.

Evidencia: `_bitacoras/arica_limite_norte_2026-08-15/`.

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
| — E0.3 · El join (reconocimiento) | **reconocimiento cerrado** — las 164 bahías quedan repartidas en una partición verificada (el script aborta si no suma 164): **88 sanas o de puro nombre**, **42 que decide el propio decreto** (25 por la banda de paralelos que él mismo escribe, 4+13 por identidad del cuerpo de agua ya adjudicada en `cotejo_lacustre_adjudicado.json`), **34 que suben al owner** en cinco familias. Tres correcciones medidas al §1.3 y al §9 de este documento: **(1) las "3 variantes de nombre (36 bahías)" son dos** (`Chacabuco`→`puerto_chacabuco`, `Hornopirén`→`hornopiren`, establecidas por **igualdad de conjunto** contra SITPORT, no por parecido de texto) **y una sobre-atribución** — `Cisnes` cuelga 18 bahías y SITPORT le da 2; renombrarla habría dejado 16 mal atribuidas con el nombre correcto. **[CORRECCIÓN 2026-08-14, §3.3: el texto de arriba no se borra, y las dos cosas que afirma están mal. (1) EL RENOMBRE NO DEJABA NADA MAL ATRIBUIDO: la sobre-atribución ya existía bajo el nombre viejo y el renombre sólo cambia la etiqueta, no la atribución. Se aplicó en `f421949` y hoy `Puerto Cisnes` calza con el insumo (`puerto_cisnes`, "Puerto Cisnes"), que es lo que `Cisnes` no hacía: no era `id` ni `nombre` de ninguna jurisdicción del insumo. (2) EL NÚMERO ES 17, NO 16. Remedido sobre las 18: SITPORT atribuye **1** a la repartición 241 Puerto Cisnes (la bahía 123), **9** a la 234 Melinka y **8** a la 239 Puerto Aguirre. El 16 salía de restarle a 18 las 2 bahías que cuelgan de la 241, pero sólo una de esas dos está entre las 18 — la otra es la 234 Río Palena, que el mapa rotula `Chaitén`. Fuentes: `src/data/bahia-capitania-map.json` · `_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json` · `_bitacoras/sondeo_catalogo_2026-08-12/totalgeneral.json`.]** **(2) De las 29 jurisdicciones sin bahía, SITPORT sí les atribuye a 27**: la hipótesis "SITPORT no publica ahí" explica 2 (`papudo`, `rada_covadonga`); las otras 27 el mapa las colapsa en la Capitanía vecina. **(3) La bahía 146 (Río Bueno) es la única que SITPORT no atribuye, y la resuelve el decreto** — lo nombra literal bajo `lago_ranco`. Instrumento nuevo con su alcance medido: la banda de latitud declarada (41 de 64 jurisdicciones, 9 de 820 pares se pisan) **excluye, no adjudica** — y se midió el caso que la rompe: en 4 bahías el mapa está dentro y SITPORT fuera, y en 3 ninguna de las dos las contiene. **13 de las 24 bahías con restricción publicada hoy** caen en un cajón a arreglar; 5 de ellas son adjudicación. Sin construir: no se tocó ningún dato ni servicio. | — | `_bitacoras/e03join_recon_2026-08-11.txt` · `_bitacoras/e03join_recon_2026-08-11/01_reconocimiento.txt` (547 líneas) · `scripts/e03join_reconocimiento.js` |
| — E0.2 · Registro de ámbitos publicados | **cerrada** — `ambitos_publicados.json` declara los **4 ámbitos**, los 4 no publicados con su causa. Validador con **8 controles** que muerde en las dos direcciones, incluido el **retiro automático** (declarado ausente + la base ya lo tiene → se detiene). Mordida **11/11** + control negativo contra la base real. La causa (a) de INV-3.6 pasa a leerse de la **base** y no del insumo, con dos orígenes: `jurisdiccion_no_cerrable` y `ambito_no_publicado`. **21,82 km lacustres y 47,57 km antárticos dejan de registrarse como defecto de construcción.** Verificado de punta a punta sobre 10 rutas: **0 cambios de bandera**, como la propuesta prometió antes de construir. Suite unitaria **76/76**. | 2026-08-11 | `_bitacoras/e02_recon_2026-08-11.txt` · `_bitacoras/e02_propuesta_2026-08-11.txt` · `_bitacoras/e02_construccion_2026-08-11/` (`01_mordida_ambitos`, `02_verificacion_e2e`, `03_suite_unitaria`) |
| — E0.1 · A3, 257 y §0.4 | **cerrada** — A3 implementada de punta a punta (backend + PWA), mordida **10/10** + control negativo, y **verificada disparando contra SITPORT real**: una ruta por la costa de Carahue escala a **U** y nombra la Capitanía. Bahía 257 adjudicada y aplicada. §0.4 escrita en `CLAUDE.md`. | 2026-08-11 | `_bitacoras/e01e_a3_2026-08-11.txt` + `01_mordida_a3`, `02_control_tras_adjudicacion`, `respuesta_weather_ruta_carahue.json` |
| — E0.1 · cierre (D8 aplicada, D7 medida, 257) | **cerrada** — SITPORT tiene **13 endpoints** y consumíamos 3; dos de los nuevos dan la Capitanía de cada bahía. **257 → Capitanía de Puerto Lago Gral. Carrera** según SITPORT, que coincide con el decreto: la adjudicación del owner ya no es sobre un vacío. **108 → Capitanía de Puerto Carahue**; qué bahía es, no determinado. **Posición: no la entrega ningún endpoint.** D8 aplicada con su condición, probada contra insumo alterado. | 2026-08-11 | `_bitacoras/e01d_d7_y_257_2026-08-11.txt` + `00_endpoints_sitport`, `02_d7_rutas`, `03_mordida_arranque`, `04_npm_drift` |
| — E0.1 Drift del catálogo SITPORT | **cerrada** — cinco fuentes internas comparadas entre sí (ids **y** contenido) y contra la unión de los tres endpoints de SITPORT; cinco clases de divergencia; mordida **20/20** + control negativo. La bahía 257 **no se agregó**: exige atribuir Capitanía (D1). La **108 no es identificable** con las fuentes de hoy. Sube al owner solo la política: **D7** (ámbito seguridad) y **D8** (ámbito alineación). **ADDENDUM 2026-08-12 — este control estuvo CIEGO 3 h 36 min y la etapa no puede describirse sin decirlo.** `a4ea1c1` (15:00:30) escribió `src/data/bahia-capitania-map.json` con un **BOM UTF-8**; los cinco servicios lo leen con `require()`, que lo descarta, así que la suite siguió en 76/76 — pero `catalogo-bahias.js:111` lo lee con `JSON.parse(fs.readFileSync(...))`, que no lo descarta, y de ese lector cuelga `leerFuentesInternas()`. Desde entonces y hasta `22530b6` (18:36:53) `npm run drift` salía **exit 1** con `FUENTE INTERNA ILEGIBLE`, muriendo en `e01_control_drift_catalogo.js:295`, **antes** de la escritura del estado en la 328. **El BOM apagó los dos rastros a la vez**: no hubo línea de log útil y tampoco el diff de git del estado versionado, que es justamente el rastro diseñado para que la divergencia se vea sin mirar la consola. El control que caza la 108 no habría cazado nada. **Guard nuevo que lo impide**: `src/services/__tests__/datos-sin-bom.test.js` recorre `src/data/` y falla si un `.json` arranca con BOM o si el lector estricto no lo puede parsear, con la aserción de que encontró al menos un archivo para que no pase en verde vacío (§0.3). Verificado en sus dos estados: 79/79 limpio, y en rojo con un fixture al que se le inyectó un BOM. **La etapa sigue cerrada**: el control volvió a su línea base (exit 3, `DRIFT_DECLARADO_ABIERTO`, las mismas 3 divergencias declaradas), que es lo que el `estado_drift.json` commiteado del 2026-08-11 ya registraba. | 2026-08-11 | `_bitacoras/e01_drift_catalogo_2026-08-11.txt` + `.../propuesta_e01.md` · `_bitacoras/e01b_continuacion_2026-08-11.txt` + `01_mediciones`, `02_prueba_mordida_20`, `03_control_en_vivo` |
| E1 Andamio de medición | **CERRADA** — `jurisdicciones_decreto` queda declarada como **andamio** en `capa_consultada.json`, con `es_andamio`, para qué sirve y **tres motivos medidos** por los que no se promueve. **`capa_jurisdicciones` no se tocó**: sigue en `bahia_jurisdicciones`, y el andamio NO se declara ahí a propósito, porque ese campo es el que lo promovería con una línea. **Los dos guards dejaron de poder divergir** (camino 2): el texto del comentario de la base vive en el archivo, `e1_aplicar_andamio.js` lo escribe y `verificarComentarioEnLaBase()` comprueba que la base dice exactamente eso — el comentario viejo decía "NO CONSULTAR" sin condición y contradecía la declaración. **"Contexto de medición" se demuestra, no se declara** (camino B): el nombre de la capa sólo sale de `capaDeMedicion()`, que producción no tiene cableada; sin variable de entorno, porque una variable se queda puesta y viaja. **Aceptación cumplida y no simulada:** se deformó el archivo, se levantó `src/index.js` como proceso y no arrancó. Mordida **14/14** con control negativo primero, incluido **el comentario de la base editado a mano** y el borrado, con restauración verificada. Suite **76/76**. **ADDENDUM 2026-08-12: el andamio NO se regenera**, decidido por el owner tras medirlo — ver *"Decisión sobre regenerar el andamio"* en §E1. Dos motivos: el generador lee el insumo **v1** y no el v2, así que regenerar saldaría la deuda equivocada; y `cotejo_lacustre_adjudicado.json` es su otro insumo y **E3 lo va a regenerar como precondición suya**, con lo cual hacerlo antes es trabajo tirado. Exposición medida sin regenerar: **4,6 % de los km** (95,87 de 2.076,06, en 3 de las 8 rutas) y **1 de las 26 restricciones** —bahía 155 Queilén→`chonchi`—, que es una de las cuatro apariciones apoyadas en traslape y la más extrema (`exclusivo 0,00 km`): la exposición es chica en volumen y cae en el margen que separa el +11 de su piso +7. **Reverificado el mismo día: las 11 que difieren entre v1 y v2 siguen siendo 11**, ninguna se resolvió; a `ancud` y `chonchi` la pasada de alineación les corrigió el límite Sur en v1 y ese campo ya coincide con v2, pero el contorno sigue difiriendo. | 2026-08-11 | `_bitacoras/e1_construccion_2026-08-11.txt` · `.../e1_construccion_2026-08-11/` (`01_mordida_andamio`, `02_aplicacion`, `03_suite`, `04_declaracion`) |
| — E1 · Propuesta | **cerrada** — aprobados el camino 2 (guards) y el camino B (contexto). Midió lo que decidía: **11 de 64 jurisdicciones difieren de verdad entre v1 y v2** (no 2 como decía la marca vieja, ni 64 como daba una comparación que medía el renombre de esquema), todas del corredor de Chiloé y el sur de Valdivia. Cruce contra el join de E0.3: **40 de 42 coinciden**; las 2 que no incluyen la 131, donde el andamio arrastra el error que E0.3 ya corrigió. **Corrigió además una afirmación mía del reconocimiento**: el motivo (1) de la marca no quedaba probado por el test de vértices, porque un polígono recortado pierde vértices declarados sin que eso sea discrepancia con la fuente. | 2026-08-11 | `_bitacoras/e1_propuesta_2026-08-11.txt` · `.../e1_propuesta_2026-08-11/01_medicion.txt` |
| — E1 · Reconocimiento | **cerrado** — `jurisdicciones_decreto` sirve: 64 filas, 64 ids, 10 geom nulas, y sus ids son **el mismo conjunto** que los 64 del insumo, comprobado en los dos sentidos. **El solapamiento que E0.2 anotó está verificado y sus dos motivos siguen en pie:** (1) la geometría no corresponde a su fuente — `hornopiren` tiene 3 de sus 4 puntos de contorno declarados sin vértice en la capa y `castro` 4 de 11; (2) los traslapes existen y son **peores de lo que la marca cuenta**: el comentario cita un par (Aguirre × Chacabuco, 28.325,1 km² medidos ahora, coincide al km²) y la capa tiene **60 pares traslapados, 44.875,6 km²** — E2 tiene que decir qué hace con eso, no descubrirlo. **El conflicto real:** el guard que ya está dice `NO CONSULTAR` sin condición y el que E1 pide dice "consultable sólo para medir"; no alcanza con agregar un campo al repositorio, porque el comentario de la base es donde mira quien la abre sin el repo al lado. **Riesgo de promoción, localizado:** `cobertura-jurisdiccional.js` consulta la capa que `capa_consultada.json` nombra, así que declarar el andamio ahí como `capa_jurisdicciones` lo promovería con una línea de dato; y `ambitos-publicados.js:59` (C7) ya compara contra ese mismo campo. **El arranque tiene un hook y es de otra naturaleza**: el de E0.1 declara y cumple "no bloquea ni demora el arranque", y el de E1 debe detener. Sin construir. | — | `_bitacoras/e1_recon_2026-08-11.txt` |
| E2 Diseño y medición del cambio de unidad | **CERRADA — el número es +11, con piso +7. El volumen SUBE al pasar a Capitanía, y el signo no depende de nada abierto.** | 2026-08-12 | `_bitacoras/e2_cobertura_2026-08-12.txt` · `.../e2_cobertura_2026-08-12/01_cobertura.txt` · `scripts/e2_cobertura_andamio.js` |
| — E2 · Volumen del cambio de unidad | **cerrada. EL NÚMERO DE E2 ES +11**, con el método decidido por el owner el 2026-08-12: las jurisdicciones sin geometría se **excluyen** del neto, porque su ausencia ya la cubre el aviso de INV-3.6 y contarlas como pérdida las contaría dos veces. **Ninguna restricción se pierde por el cambio de unidad** (0); las 11 que aparecen son INV-3.4 funcionando. **Condición del owner, aplicada en la salida**: el número declara aparte y de forma visible que **16 restricciones caen en jurisdicciones sin geometría y NO se le listan al patrón** —14 de `arica` y 2 de `puerto_williams`—, que **hoy sí se le muestran**, y que el aviso de INV-3.6 dice que la jurisdicción no está cargada pero **no dice qué restricciones hay**: esa parte no la tapa. Una más (bahía 239) cae en las 6 que E0.3 dejó sin resolver y a ésa no la cubre ningún aviso. Ocho rutas, 39 restricciones de la captura versionada de E0.1. Lo de hoy no se reimplementa: sale del mismo SQL que `bahiasEnRutaPostGIS` usa en `sitport-routes.js:562`. La unidad nueva usa el andamio de E1 y el join de E0.3. **Crudo: 26 → 20, −6 (−23 %), 11 aparecen y 17 desaparecen.** Pero descompuesto por causa: **16 desaparecen porque su Capitanía no tiene geometría** (`arica`, `puerto_williams` — dos de las diez que el decreto no permite cerrar, así que **regenerar no las arregla**), **1 porque su bahía es una de las 6 que E0.3 dejó sin resolver** (239), y **0 por el cambio de unidad**. Descontando lo que no es unidad, el neto es **+11**: ninguna restricción se pierde por pasar a Capitanía, y las que aparecen son INV-3.4 funcionando. **El SIGNO del resultado lo decide un artefacto del andamio, no el cambio de unidad** — el owner pidió que se avisara si el número podía irse para cualquier lado, y se va. Precisión que evita gastar la reevaluación en el lugar equivocado: **el salto de signo no lo produce la parte desactualizada (v1↔v2), que regenerar sí bajaría; lo producen las jurisdicciones sin geometría, que regenerar no toca.** **AL DÍA EL 2026-08-15, y es un puntero, NO una enmienda: la nota de las 16 NO envejeció.** Se revisó explícitamente porque parecía que sí. Habría envejecido si `arica` se hubiera cerrado —las 14 suyas dejarían de estar en riesgo—, y con la Opción D **`arica` no se cerró**: su límite Norte quedó declarado y su geometría no se construyó, así que **las 16 siguen siendo 16** y la afirmación sigue siendo cierta palabra por palabra. Lo único que cambia es que **la causa de las 14 ya no es "falta dato del decreto"**: hoy es "falta el mecanismo de alcance", escrita en `limite_norte_convencion` dentro del v1 y en D16. Tacharla habría sido escribir algo falso. Exposición declarada junto al número: 32,1 % de km en las 11 desactualizadas, 10,5 % en traslape. | 2026-08-12 | `_bitacoras/e2_volumen_2026-08-12.txt` · `.../e2_volumen_2026-08-12/01_volumen.txt` |
| — E2 · Las apariciones cruzadas contra el traslape | **cerrada — era lo único que podía bajar el +11.** De las 11 apariciones, **7 son firmes** (la ruta toca su Capitanía sobre km exclusivos) y **4 se apoyan en traslape**: tres son `233 Seno Reloncaví → puerto_montt` (ruta∩J de 2,59 y 0,46 km, enteras en zona ambigua) y una es `155 Queilén → chonchi` (9,91 km, entera). Son los **mismos pares** que la medición de cobertura había señalado —calbuco+puerto_montt, maullin+puerto_montt, castro+chonchi—, así que las dos mediciones se corroboran. **El número con el que se decide es +11 y su piso es +7: los dos positivos.** El cruce no hace saltar el signo — como sea que se resuelva la ambigüedad, el volumen sube. No se afirma que esas cuatro atribuciones sean erróneas: se afirma de qué dependen. Quién tiene razón en esos tramos lo resuelve la capa del D.S. 991 cuando exista (E3/E4). | 2026-08-12 | `_bitacoras/e2_volumen_2026-08-12.txt` (addendum 2) · `.../03_cruce_apariciones.txt` |
| — E2 · Cobertura del andamio sobre rutas reales | **cerrada** — lo que E1 dejó sin contestar. Ocho rutas reales, **2.076,06 km** medidos sobre la geometría que el backend recibe (sin `aproximacion_final`): **58,3 % resuelven a UNA jurisdicción · 31,2 % caen en ninguna · 10,5 % caen en zona de traslape**. La capa se pidió por `capaDeMedicion()`, o sea que el contrato de E1 se ejerció de verdad. **Corrección de mi propia medición antes de reportarla:** la primera versión partía la ruta en segmentos y daba **40,3 %** de ambigüedad — medía cruces de frontera, no traslape, porque un tramo que cruza un límite toca dos jurisdicciones sin superposición. El número real es **cuatro veces menor**. **Los 218,65 km ambiguos están concentrados**: sólo 9 de los 60 pares declarados aportan kilómetros, y dos —Aguirre × Chacabuco (84,59) y Calbuco × Maullín (48,14)— son el 61 %; el área traslapada total no predice lo que una ruta toca. **La deuda se leyó y se declaró, no se mencionó**: **666,36 km, el 32,1 % de lo medido, cae en alguna de las 11 jurisdicciones que difieren entre v1 y v2** — sin afirmar en qué dirección cambiaría una regeneración, que exige regenerar y volver a medir. **El 10,5 % es el factor de contaminación** de cualquier medición de volumen sobre este andamio. | 2026-08-12 | `_bitacoras/e2_cobertura_2026-08-12.txt` |
| E3 Ámbito lacustre | **CERRADA — el ámbito lacustre dejó de ser invisible: una restricción real de "puerto cerrado" llega al patrón, y la regresión que la etapa se comprometió a medir da CERO.** **Los cuatro puntos de la aceptación, cada uno con su evidencia. (1) Las 6 lacustres construidas y auditadas, ninguna con geometría vacía (INV-3.5), completo y no a medias (D3)**: build aplicado en 13 min 12 s, exit 3 por publicación parcial, **6/6 con geometría y 4.479,4 km²**, los ocho controles del ámbito en ok y C3 fallando **sólo en pares marítimos** — `e3_paso5_2026-08-13/03_build_aplicado.txt`; el gate que lo hizo posible sin aflojar C3 está en `e3_gate_2026-08-12.txt` con su mordida **10/10** (`scripts/e3_prueba_mordida_gate.py`), y el reconocimiento que predijo que la geometría ya se construía bien, en `e3_recon_2026-08-12.txt`. **(3) El registro pasa el lacustre a publicado**: `data/decreto/ambitos_publicados.json` con `publicado: true` y `publicado_el`, la `causa` retirada **conservando su texto histórico** dentro de `como_entro`, y la `geografia_de_reclamo` a `null` con su motivo escrito — `e3_paso5_2026-08-13.txt` §5. **(4) Su aviso de INV-3.6 se retiró solo**: de **18,992 km** de hueco a **0,000**, con **0 avisos y 0 defectos** en el endpoint real — `e3_paso5_2026-08-13/09_medicion_aceptacion.txt` y `08_endpoint_llanquihue.json`, reproducido sobre la capa definitiva en `e3_paso6_2026-08-13/05_verificacion.txt` §3. · **(2) UNA RUTA EN EL LAGO DEVUELVE SU CAPITANÍA Y SUS RESTRICCIONES — CUMPLIDO, Y SE ACREDITA EN DOS LUGARES QUE NO SE DISIMULAN.** La aceptación dice **"Lago Llanquihue"**, y sus dos mitades se cumplieron en lagos distintos del mismo ámbito. **La Capitanía, en el Llanquihue que la aceptación nombra**: de `{}` a `{111, 159, 160, 161}`, devolviendo **Puerto Varas —el nombre del decreto, no "Puerto Montt"—** con `capitania_fuente: decreto` (`e3_paso5_2026-08-13/09_medicion_aceptacion.txt`). **Las restricciones, en el Lago Villarrica**, porque **el Llanquihue está hoy en condición NORMAL**. **El fundamento va escrito y medido, no sobreentendido: la ausencia en SITPORT es condición Normal, no dato faltante.** En la misma captura la fuente lista las cuatro bahías del Llanquihue con `color: "default"`, `valor: 0` y las bahías 105 y 106 con `color: "danger"`, `valor: 1` — **distingue los dos estados en el mismo campo y responde por las dos** (`e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json`). **Un lago sin restricciones publicadas está respondiendo bien**, y atar el cierre de una etapa a que se dicte una restricción en un lago concreto sería atarlo a un evento que no controlamos y que, si ocurre, **es una emergencia para un patrón**. **Decisión del owner, 2026-08-13.** · **La evidencia de esa mitad es la NO CIRCULAR, y es lo que la hace valer.** La ruta **210 → 209 del arnés de E0.2**, que entró al repositorio en **`737e74c` el 2026-08-11** —**dos días antes de que `jurisdicciones_ds991` existiera**, medido con `git log -S`— devuelve contra el backend en vivo **HTTP 200, veredicto UV, "puerto cerrado"**, Capitanía **Lago Villarrica** con `capitania_fuente: decreto`; y **el texto de la propia fuente dice *"en todos los lagos de la jurisdicción"***, que es INV-3.4 en palabras de DIRECTEMAR — `e3_paso6_2026-08-13/07_endpoint_villarrica.json`. **Ese era el falso negativo de seguridad que E3 existía para cerrar, y estaba activo ese día**; el contrafáctico no se argumenta: con el ensanche apagado el Set de esa ruta es **vacío**, y `sitport-routes.js:757` descarta toda restricción cuya bahía no esté en él. **Las seis cuerdas lacustres del paso 6 NO son evidencia de este punto y no se usan como tal**: se derivaron de la propia capa, así que **para el matching son circulares por construcción**. Lo que sí prueban —y por eso están— es todo lo que viene después del matching: join, contacto, cobertura y filtro por ámbito, **en las seis jurisdicciones y no sólo en la que la aceptación nombra**. · **LA REGRESIÓN DA CERO, Y EL INSTRUMENTO ES UN CONTRAFÁCTICO Y NO UN BASELINE.** `scripts/e3_verificacion_paso6.js` corre **el mismo motor dos veces sobre las mismas coordenadas** —una con el cableado y otra con el ensanche apagado **en memoria**, sin tocar el archivo en disco y comprobándolo por sha256 en cada pasada—, y las 8 rutas se rutean **una sola vez** para que una diferencia no pueda venir del ruteo. **Importa que sea contrafáctico y no baseline porque un número copiado de una bitácora vieja envejece**: es la lección del paso 5, donde publicar el ámbito puso en rojo tres cosas que afirmaban el estado del calendario y una salía **cazada por el control equivocado**. Sobre **19 rutas, 11 de ellas no lacustres: 0 banderas movidas · 0 bahías agregadas · 0 km de cobertura movidos**, y las ocho del arnés coinciden además con lo que E0.2 midió el 2026-08-11 (`e3_paso6_2026-08-13.txt` §1, crudo en `.../05_verificacion.txt` y `.../04_comparacion.json`). **El fundamento declarado del plan quedó MEDIDO contra la capa publicada en vez de repetido**: traslape de la capa vigente con las seis lacustres **0,000000 km²** y distancia a la celda más cercana **de 16,178 a 84,178 km**, que reproduce al kilómetro el "entre 16 y 84" que el plan venía citando del andamio. **Regresión completa en verde**: suite **80/80** · cableado **21/21** · E0.2 **14/14** · join **16/16** · andamio **14/14** · A3 **10/10** · carencia **14/14** · gate **10/10** (`e3_paso6_2026-08-13/12_regresion.txt`). · **LO QUE ESTA ETAPA DEJA ABIERTO, EN SU PROPIA FILA Y NO MANDADO A OTRO LADO EN SILENCIO. (a) La deuda de D13**: **cuatro** cuerpos sin geometría dentro de jurisdicciones publicadas —río Bueno (`lago_ranco`), Toltén (`lago_villarrica`), Fuy y San Pedro (`lago_panguipulli`)— que al publicarse el ámbito **caen en la causa (b) de INV-3.6**, o sea que el sistema registra internamente como defecto de construcción propio algo que no lo es. Está **declarada, acotada y con condición de cierre** en `data/decreto/cotejo_lacustre_adjudicado.json`, bloque `carencia_cuerpo_sin_geometria`, mordida **14/14** (`scripts/e3_prueba_mordida_carencia.py`); es tolerable **porque está declarada y no sale al patrón, no porque sea correcta**. **(b) La bahía 257 sin dato real**: entra al Set por el ensanche y su mecanismo se ejerció con un registro **sintético y declarado como tal** —pasa de defecto a **defecto + aviso**—, pero **SITPORT no publica nada bajo esa bahía**, así que verlo con dato real **depende de DIRECTEMAR y no de nosotros** (`e3_paso6_2026-08-13.txt` §6). **(c) El frente de contacto de §7.1**, que esta etapa **subió de urgencia con medición**: un teléfono sale hoy para **tres Capitanías** —el que el CSV de las 64 le da a **Valdivia, que es marítima**— y **20 de 21** entradas lacustres discrepan contra ese CSV emparejando **por repartición**; afirma que las dos fuentes discrepan, **no** que lo mostrado esté mal (`e3_paso6_2026-08-13/11_contacto_lacustre.txt`). **(d) La bahía 160, con dos jurisdicciones y una sola mostrada: PENDIENTE DE DECISIÓN DEL OWNER**, subida en el paso 5 y todavía sin decidir, porque **cuál de las dos se muestra es qué ve el patrón** (§0.4). **Lo que hay que sopesar al decidirlo, no el motivo por el que ya se dejó así**: elegir una principal sería fijar una partición que ninguna fuente cargada entrega —el decreto parte el lago, el shapefile trae un solo polígono— y arreglarlo sólo para ella sería un caso particular en el código, ya que es la única de las 164 con `jurisdicciones_adicionales`; contra eso pesa que la combinación de hoy —la Capitanía que SITPORT no usa con el teléfono de la que sí usa— está medida como **la peor de las dos posibles** (`e3_medicion_160_2026-08-13.txt`, §7.1). **(e) Lo que el paso 6 declaró NO medido**: la 257 con dato real, una restricción lacustre **informativa**, el **nivel de sector** —el motor muestra a las siete bahías de `lago_panguipulli` una restricción cuyo texto exceptúa el Lago Calafquén, que es la **nota de alcance de INV-3.4 funcionando** y su **primer caso real observado**—, **la PWA** (todo se midió contra el backend, la tarjeta no se vio en pantalla) y **rutas lacustres ruteadas**, porque el raster router no tiene tile lacustre (`e3_paso6_2026-08-13.txt` §11). · **PASO 6 CERRADO el 2026-08-13: la regresión da CERO y la aceptación se cerró con una restricción lacustre REAL en pantalla** — `_bitacoras/e3_paso6_2026-08-13.txt`, instrumento en `scripts/e3_verificacion_paso6.js`. **No se tocó ningún archivo de `src/`.** El instrumento es un **contrafáctico y no un baseline**, que es la lección del paso 5: el mismo motor corre **dos veces sobre las mismas coordenadas** —una con el cableado y otra con el ensanche apagado **en memoria**, sin tocar el archivo en disco, comprobado por sha256— y las 8 rutas se rutean **una sola vez** para que una diferencia no pueda venir del ruteo. **Sobre 19 rutas, 11 de ellas no lacustres: 0 banderas movidas · 0 bahías agregadas · 0 km de cobertura movidos**, y las ocho del arnés coinciden con lo que E0.2 midió el 2026-08-11. **El fundamento declarado del plan quedó MEDIDO contra la capa publicada y reproduce el rango al kilómetro**: traslape **0,000000 km²** y distancias **de 16,178 a 84,178 km**. **Hoy SITPORT publicaba dos restricciones lacustres reales** —bahías 105 y 106— y las dos llegan a pantalla: sobre la ruta **210 → 209 del arnés de E0.2**, elegida antes de que esta capa existiera, el endpoint devuelve **veredicto UV, puerto cerrado, Capitanía Lago Villarrica con `capitania_fuente: decreto`**. **Ese es el falso negativo de seguridad que E3 existía para cerrar, y estaba activo hoy**; el contrafáctico no se argumenta —con el ensanche apagado el Set de esa ruta es **vacío** y `sitport-routes.js:757` descarta toda restricción cuya bahía no esté en él—. **Las seis lacustres se midieron, no sólo la que la aceptación nombra**, con una cuerda por jurisdicción, y queda declarado sin suavizar que esas seis cuerdas **son circulares por construcción para el matching** porque se derivaron de la propia capa: lo que prueban es el join, el contacto, la cobertura y el filtro por ámbito. **El alcance de A3 crece sólo en lo lacustre** (reparticiones 186, 201, 184, 188, 235, 97) y **su efecto en vivo hoy es ninguno**: cero restricciones bajo una bahía fuera de `BAHIA_COORDS`. **La 257: el mecanismo se cumple** —entra al Set, y con un registro **sintético y declarado** pasa de defecto a **defecto + aviso**—, pero **SITPORT no publica nada bajo ella hoy**, así que el dato real depende de DIRECTEMAR. **Dos números que parecen regresión y no lo son, medidos en vez de argumentados**: `Anahuac → Melinka` da 11 bahías/32,841 km **ruteada** y 14/22,0256 como **recta de dos puntos**, que es la que midió el paso 5 — la recta se agregó al arnés y reproduce sus números exactos. **Dos hallazgos laterales anotados con su dueño**: SITPORT atribuye **6 de las 7 bahías de `lago_panguipulli`** a la repartición 186 (E5, y INV-3.3 lo resuelve a favor del decreto), y la restricción de Panguipulli **acota su área en el texto** exceptuando el Lago Calafquén mientras el motor la muestra a las siete — **es la nota de alcance de INV-3.4 funcionando, y el primer caso real observado**. **El contacto lacustre se midió y va a §7.1 con su urgencia cambiada**: un teléfono para **tres** Capitanías —el que el CSV le da a **Valdivia, marítima**—, y **20 de 21 discrepan** contra el CSV emparejando por repartición; afirma que las fuentes discrepan, no que el mostrado esté mal. Regresión: suite **80/80** · cableado **21/21** · E0.2 **14/14** · join **16/16** · andamio **14/14** · A3 **10/10** · carencia **14/14** · gate **10/10**; **nada envejeció**, drift sin divergencias nuevas y `estado_drift.json` restaurado por sha256. **Lo que NO midió**: la 257 con dato real, una restricción lacustre **informativa**, el nivel de sector, **la PWA** y rutas lacustres **ruteadas** (no hay tile lacustre). · **PASO 5 CERRADO el 2026-08-13: la capa existe, el registro no miente y el cableado está activo** — `_bitacoras/e3_paso5_2026-08-13.txt`. Los tres movimientos juntos, precedidos por la declaración de D13. Build aplicado en **13 min 12 s, exit 3 (publicación parcial)**: el gate publica el **lacustre 6/6 con geometría (4.479,4 km²)** y sus ocho controles en ok, retiene la marítima por C3 —**los mismos seis pares y los mismos km² que el 2026-08-12, al milésimo**— y retiene el **antártico por declaración, no por control** (7 controles ok, 4/4 con geometría): no se tocó. **La aceptación de E3 se cumple, medida contra la capa REAL y no contra el ensayo**: el Lago Llanquihue pasa de `{}` a `{111,159,160,161}`, devuelve su Capitanía **del decreto** —Puerto Varas, ya no "Puerto Montt"— con el teléfono del mapa, y **su aviso de INV-3.6 se retiró solo**: de 18,992 km de hueco a **0,000**, 0 avisos y 0 defectos en el endpoint real. **La marítima no se movió**: 14 bahías antes y después, ensanche 0, 22,0256 km y sus 6 defectos de recorte idénticos. **Una cosa escrita y cerrada resultó inexacta y queda corregida al pie**: aplicar sin mover el registro **no deja el backend sin arrancar** —arranca— sino que C3 muerde en la **primera consulta**, HTTP 502 con veredicto U; la conclusión no cambia (aplicar y mover son el mismo movimiento) pero el modo de falla es **peor** de lo escrito, porque un servicio en pie que devuelve 502 no se ve. **D13 escrita, y no era sólo el río Bueno: son CUATRO cuerpos** —río Bueno, Toltén, Fuy y San Pedro—, los cuatro cayendo en la causa (b) al publicar el ámbito; declarar los otros tres se resolvió del lado del ingeniero (§0.4) y la decisión del owner sigue siendo sobre el río Bueno. Validación de forma en los dos sentidos, mordida **14/14**. **Tres cosas envejecieron el mismo día, las tres por nombrar al ámbito lacustre (§4.3)**: la suite cayó a **14 de 80 en rojo**, la mordida de E0.2 a **11/14** —con un caso saliendo CAZADO por el control equivocado— y la del cableado con **4 fallos**, porque su parte B materializaba una capa que ahora existe. Ninguna era defecto del producto: las tres afirmaban el estado que el paso 5 existía para terminar. Re-apuntadas construyendo su escenario en vez de heredarlo, y el resultado es **más fuerte**: la parte B corre contra la **capa real**, B4 conserva su contrafáctico con un `SAVEPOINT` que se deshace, B7 pasa a probar que la mordida **no tocó** la capa, y **A13 ejerce las dos ramas del guard de arranque** —el pendiente que el paso 4 dejó escrito para este paso—. Regresión: suite **80/80** · cableado **21/21** · carencia **14/14** · E0.2 **14/14** · join **16/16** · andamio **14/14** · A3 **10/10** · gate **10/10**. **Sin divergencias nuevas en el drift**: la única contra el respaldo es la **258**, ya decidida (D14) antes de esta sesión. **Dos cosas suben al owner porque deciden qué ve el patrón**: la **gobernación de la bahía 160** dice "Puerto Montt" mientras su Capitanía dice "Lago Ranco" (el frente de contacto de §7.1, ahora con discrepancia medida), y la **160 tiene dos jurisdicciones y se muestra una** —el matching mira las dos por INV-3.4, el contacto sólo la principal—. · **PASO 4 CERRADO el 2026-08-13: el cableado está escrito, probado y APAGADO** **PASO 4 CERRADO el 2026-08-13: el cableado está escrito, probado y APAGADO** — `_bitacoras/e3_cableado_2026-08-13.txt`. Nada aplicado: `consultada: false` en el bloque nuevo `capa_publicada_por_ambito` de `capa_consultada.json`, `ambitos_publicados.json` sin tocar, `jurisdicciones_ds991` sin existir. **Mordida 21/21 contra un ENSAYO** dentro de una transacción que se deshace, porque la capa no existe todavía; las dos direcciones medidas: **lo lacustre entra** (Lago Llanquihue: hoy `{}` → `{111,159,160,161}`) y **ninguna marítima sale** (Anahuac→Melinka: 14 antes, las mismas 14 después, el ensanche agrega **0** — y ese cero lo produce el filtro por ámbito, porque con `maritima` publicada agregaría **31**). **Los dos consumidores se cablearon juntos** y ahora viven en el mismo módulo: el tramo lacustre pasa de **18,992 km de hueco a 0,000** mientras la ruta marítima no se mueve (22,0256 km antes y después). Regresión: suite **79/79**, las cuatro mordidas de al lado en exit 0, el backend arranca y el endpoint responde igual. **Tres decisiones propias declaradas** (§0.4): el **guard de arranque** del join —activo sólo con el cableado activo—; la **257** deja de descartarse en silencio sin cambiar comportamiento (A3 responde por ella); y **fueron seis archivos y no cuatro**, con `join-bahia-jurisdiccion.js` cambiando (necesitaba el sentido inverso) y `capitania-de-bahia.js` nuevo, que es lo que evita que el paso 5 muestre "Puerto Montt" en el Lago Puyehue. **Hallazgo de la mordida:** las bahías de `puerto_varas` son **cuatro**, no tres — la 160 entra por `jurisdicciones_adicionales`, la única entrada del join que las tiene, y es INV-3.4 al revés. · **PRECONDICIÓN CUMPLIDA el 2026-08-12: el cotejo está regenerado.** `cotejo_lacustre_adjudicado.json` pasa de `86f96658…` a `4de61b9a…`, con **D11 y D12 incorporadas en la regeneración, no aplicadas después a mano**. Delta: `aceptado 9→10`, `ausente 3→2`, con geometría **27→28 de 32**; se suma el bloque `alcance_d11` con las **11 Capitanías marítimas declaradas como carencia**; Galletué pasa a `fid 965` anclada **por FID**. **Hallazgo del control nuevo: los gemelos geométricos eran 3 pares, no 1** — `[960,965]` Gualletué, `[962,966]` e `[963,967]` Icalma, todos con la forma «fila con nombre + fila sin nombre, geometría idéntica». La adjudicación vigente de Icalma ya tomaba las correctas, pero **por accidente**: empareja por nombre y los gemelos no lo tienen. Los tres quedan declarados. Mordida **11/11** con control negativo primero. Reproducible: dos corridas dan el mismo sha256. **E2 no se movió** — verificado, +11 sobre 26 y 58,3/31,2/10,5 idénticos. Antecedente: no vio la pasada de alineación hasta hoy. · **RECONOCIMIENTO CERRADO el 2026-08-12 (paso 1 de 6): el "probablemente" del plan queda medido y es SÍ.** Build corrido (9 min 48 s): las **6 lacustres salen `construida`** con receta `union_cuerpos`, y **7 de los 8 controles pasan**. El único que falla es **C3, y sus 6 pares son todos marítimos** — Castro×Chonchi 28,254 · Chaitén×Chonchi 1.798,518 · Cochamó×Río Negro Hornopirén 531,757 · Cochamó×Maullín 2.947,340 · Maullín×Puerto Montt 755,491 · Calbuco×Maullín 40,833. **Ninguna lacustre aparece en ningún par.** El único traslape lacustre×lacustre es Puyehue (Lago Ranco×Puerto Varas, 155,426 km²) y **C3 lo acepta porque está declarado**: lo lacustre no pasa por no tener traslapes, pasa teniendo uno y declarándolo bien. **El rollback compartido está localizado:** los controles escriben en una tabla `_verificacion` **única para todos los ámbitos** y un solo `RAISE EXCEPTION` con `WHERE NOT ok` mira la capa entera (`fase5_construir_capa_ds991.py` ~960-980); C3 mete una fila en falla y se lleva las seis lacustres, que no aportaron ninguna. **Río Bueno NO afecta INV-3.5**: `lago_ranco` tiene 5 de 6 cuerpos con geometría y `cumple_inv_3_5: true` — el invariante exige que la jurisdicción no quede vacía, no que todos sus cuerpos tengan geometría; las 6 cumplen. **E3 no tiene que construir geometría nueva: tiene que dejar salir la que ya se construye bien.** Paso 2 = partir el gate por ámbito, sin bajarle la severidad a C3. Hallazgo lateral anotado: `jurisdicciones_ds991_descartes` sobrevive al rollback. Bitácora: `_bitacoras/e3_recon_2026-08-12.txt` · **PASO 2 CERRADO el 2026-08-12: el gate está partido por ámbito, probado, y C3 no se aflojó.** Los ocho controles pasan a medirse **por ámbito** (`_verificacion` gana columna `ambito`, clave `(control, ambito)`) y el `RAISE` único se reemplaza por un gate que decide ámbito por ámbito: entra el que está **habilitado**, no tiene **controles suyos en falla** y trae **al menos una geometría**; el que no entra se **retira de la capa** en la misma transacción con su causa en `jurisdicciones_ds991_publicacion`. Si no entra ninguno, el final es el de antes: RAISE y no queda capa. **Ensayo del build completo sobre datos reales** (`--ensayo`, corre todo y termina en ROLLBACK): `publicados=[lacustre] retenidos_por_falla=[maritima] retenidos_por_declaracion=[antartica,insular_remota]`, exit **3 = publicación parcial**. **C3 falla igual, con los seis mismos pares y los mismos km²** — ni uno se movió; Puyehue sigue pasando por declarado y no por vacío; y los pares **cruzados entre ámbitos son cero**, así que la regla conservadora que se les puso (van al alcance `(capa)` y no publican nada, porque decidir cuál lado sobra es de E4) no cambia ningún resultado de hoy. **Mordida del gate 10/10** con control negativo primero, en `scripts/e3_prueba_mordida_gate.py`, que **importa los emisores del constructor en vez de copiarlos**; el caso 03 es el que prueba §0.3 — si el traslape es lacustre, lo lacustre **no** sale. Mordida de E0.2 **14/14** (C9 nuevo), suite **79/79**. **HALLAZGO, Y DECIDIDO EL MISMO DÍA: partir el gate no libera sólo al ámbito de la etapa, libera a todos los que pasen — y el antártico pasa.** Medido en el ensayo: sus siete controles en ok y 4/4 con geometría, o sea que un gate puro lo publicaba solo en la misma corrida, retirando su aviso de INV-3.6 en un ámbito que el contrato no nombra (D9). **El owner decidió que NO se habilita, y que se habilitará el día que él escriba INV-3.5, no antes.** Dos motivos independientes, cada uno suficiente, escritos en el `motivo_habilitacion` del registro: **de autoridad** —el contrato no nombra el ámbito, el registro le lleva `categoria_contractual: pendiente`, y publicarlo retiraría el aviso antes que la carencia que lo justifica— y **de producto** —el ámbito no está listo aunque su geometría pase: de sus cuatro jurisdicciones, `bahia_paraiso` está diferida con sus **cuatro tramos sin adjudicar** y `rada_covadonga` es la que DIRECTEMAR lista como alcaldía con ficha vacía, que del lado del repositorio se corrobora dos veces: es una de las dos únicas a las que SITPORT no atribuye ninguna bahía y una de las tres Capitanías sin página en el índice de resoluciones locales. Por eso la habilitación es **dato declarado** en `ambitos_publicados.json` (`habilitado_para_publicar` + motivo, con control **C9** en `ambitos-publicados.js`): marítima y lacustre habilitadas, antártica y insular remota no. **El build NO se aplicó a propósito**: aplicarlo confirma las 6 lacustres y ahí el retiro automático de E0.2 detiene la carga hasta que `ambitos_publicados.json` se mueva — que es el paso 5. Aplicar y mover el registro son el mismo movimiento. **Hallazgo lateral del recon, cerrado y era lo contrario**: `jurisdicciones_ds991_descartes` no es una excepción al rollback — el constructor **no la crea ni la toca**, la escribió `fase5_descartar_build_provisional.sql` en su propia transacción ya confirmada, con una fila del 2026-08-10 17:22. Lo que sí faltaba era su comentario en la base (puesto, desde el script). Y al aplicarlo apareció una tercera cosa: el `WHERE to_regclass(...)` de ese `INSERT` **nunca protegió nada** —la subconsulta nombra la tabla y rompe en el análisis, antes del WHERE—, así que el script sólo podía correr el día que la capa mala existía; corregido con `EXECUTE` y verificado. Se le agregó además una guarda que lo detiene si `_publicacion` declara algún ámbito publicado, porque con el gate partido ese `DROP` pasa a apuntarle a una capa buena. **Deuda medida para E4, no bloquea E3**: el control C4 de `ambitos-publicados.js` exige `con geometría == jurisdicciones_esperadas`, y marítima son **52 esperadas contra 44 construibles** (8 `nula_declarada` por decreto), así que con esa cuenta marítima nunca puede declararse publicada. Lacustre no lo toca (6/6). Bitácora: `_bitacoras/e3_gate_2026-08-12.txt` **Las dos decisiones que la tocaban quedaron DECIDIDAS el 2026-08-12: D11** — alcance **estrecho**, las 6 Capitanías lacustres (18 bahías), con las **11 Capitanías marítimas con cuerpos declaradas como carencia**, porque esos cuerpos no tienen geometría hoy y la opción estrecha no le quita nada al patrón; **D12** — se adjudica la laguna **Gualletué por `fid 965`**, con la advertencia de aplicación del `fid 960` (geometría idéntica, sin nombre) escrita en §E3. **Ya no le queda nada bloqueado del lado del owner: E3 depende sólo de regenerar su insumo.** | 2026-08-13 | `_bitacoras/e3_paso6_2026-08-13.txt` · `.../e3_paso6_2026-08-13/` (`05_verificacion.txt`, `07_endpoint_villarrica.json`, `01_sitport_crudo/`, `11_contacto_lacustre.txt`, `12_regresion.txt`, `04_comparacion.json`) · `_bitacoras/e3_paso5_2026-08-13.txt` · `.../e3_paso5_2026-08-13/` (`03_build_aplicado.txt`, `09_medicion_aceptacion.txt`, `08_endpoint_llanquihue.json`) · `_bitacoras/e3_cableado_2026-08-13.txt` · `_bitacoras/e3_recon_cableado_2026-08-13.txt` · `_bitacoras/e3_gate_2026-08-12.txt` · `_bitacoras/e3_recon_2026-08-12.txt` · `_bitacoras/e3_medicion_160_2026-08-13.txt` · `scripts/e3_verificacion_paso6.js` · `scripts/e3_prueba_mordida_cableado.js` · `scripts/e3_prueba_mordida_gate.py` · `scripts/e3_prueba_mordida_carencia.py` |
| E4 Ámbito marítimo, cerrar C3 | en curso — P2 autorizado, sin aplicar. **2026-08-15: el límite Norte de `arica` quedó DECLARADO y `arica` sigue `no_cerrable` (D16, Opción D).** No se cerró la jurisdicción: se cerró el registro. El paralelo 18 21 00 S y su ancla retrocalculada 070 22 49,7 W viven en el v1 como convención, con procedencia versionada, y **`limite_norte_dec` queda en `null` a propósito** — escribirlo sin mecanismo de alcance haría que cualquiera que regenere produzca una capa que adjudica agua entre 24 y 200 mn que el propio paquete de DIFROL niega. **Marítima sigue 44 cerrable / 8 no_cerrable; sobre las 64, 54/10.** Lo que E4 hereda escrito: un **mecanismo genérico de alcance costa-afuera** (P5 temprano), con `baker` y `puerto_eden` como clientes siguientes por tener la misma forma. La inserción quirúrgica en el v2 fue con control: `verificar_v2_contra_v1.py` regenera el v2 aparte y exige que toda diferencia esté declarada — **0 no declaradas**, y **cazó 2 divergencias anteriores a la sesión** (`punta_delgada` y `tierra_del_fuego` traen en el v2 una causa que el v1 no tiene en ningún campo, y su texto del v1 además está vencido). Auditoría del insumo **limpia**, B12 re-sellado con autorización del owner, suite **84/84**. | — | `fase5N`, `fase5O`, `fase5P`, `fase5Q` · `_bitacoras/arica_limite_norte_2026-08-15/` · `_bitacoras/no_cerrables_2026-08-15/` |
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

> **CAMBIÓ DE TAMAÑO el 2026-08-13, y el cambio es de naturaleza, no de volumen.** Este frente
> se venía describiendo como *"aplicar `capitanias_64_final.csv`"*: una corrección de datos con
> 150 teléfonos y 10 gobernaciones para actualizar. **No lo es.** La causa de raíz es que **el
> contacto está indexado por BAHÍA**, y mientras esa sea la clave, ningún dato mejor lo arregla.
> Ver *"La causa de raíz"* más abajo. **Es un rediseño chico, no una actualización de valores.**

> **LA POLÍTICA DE CONTACTO ESTÁ DECIDIDA — 2026-08-13. Es `D15` en §5, y §5 es donde vive.**
> Fija **qué se le muestra al patrón y dónde**, y lo primero que hace es separar dos contextos que
> este frente venía tratando como uno: **en zarpe/recalada** va la Capitanía con teléfono y
> dirección, con la prelación *Capitanía → Gobernación **rotulada como tal** → el campo no se
> muestra*; **en las restricciones** el mensaje es *"confirma con la Capitanía respectiva"* y ahí
> termina. **El Canal 16 deja de ser contenido de la app**, y el texto de fallback que se venía
> armando ese mismo día queda **retirado, con su registro** (punto 3 de D15). **Es decisión de
> producto, sin cita normativa, y no la necesita.**
>
> **Lo que la política le cambia a este frente:** deja de necesitar un mensaje sustituto, y pasa a
> necesitar **dos datos que la fuente autorizada no tiene** —la dirección y el teléfono de
> Capitanía— más **uno que no existe en ningún archivo vivo del repositorio**: el teléfono de la
> Gobernación Marítima **Antártica Chilena**, que la regla (4) necesita para Rada Covadonga.
> Medido el 2026-08-13: aplicada la prelación sobre las 64, **52 mostrarían teléfono de Capitanía,
> 11 de Gobernación rotulada y 1 ninguno**.

##### Lo que las mediciones dejaron pendiente — 2026-08-13, con INV-10.1 ya escrito

`CONTRATO_MOTOR.md` v1.8 (`d9f7f9e`) convirtió la política en **INV-10.1**, con verificación
propia: *"ningún mensaje del catálogo contiene `[tel]`; ninguna tarjeta muestra un número de
Gobernación bajo la etiqueta Capitanía"*. **Con el invariante escrito, lo que sigue abierto
deja de ser una lista de mejoras y pasa a ser la distancia entre el código y el contrato.**
Cuatro cosas, cada una con su medición:

1. **El segundo escalón de INV-10.1 se apoya en una tabla que el contrato acaba de declarar
   `PENDIENTE`, y que tiene números muertos.** El teléfono de Gobernación **no sale de ninguna
   fuente declarada**: sale de la tabla hardcodeada de `src/utils/capitanias.js` (14
   Gobernaciones + Hanga Roa), **duplicada palabra por palabra en la PWA** —listas de nombres y
   de teléfonos idénticas, comprobado— y §5 la declara *"POR DEFINIR — hoy vive hardcodeado…
   sin declarar acá"*. Contra lo que DIRECTEMAR publicaba el 2026-08-12: **12 coinciden, 3
   difieren** (Arica, Talcahuano, Puerto Montt) **y 1 falta** (Antártica Chilena). **El CSV no
   la reemplaza: no trae ningún teléfono de Gobernación** — su columna `Gobernacion` es un
   nombre, y sus 64 teléfonos son todos de Capitanía.

2. **La dirección que INV-10.1 exige no existe en ninguna fuente autorizada.** Los campos de
   `src/data/bahia-capitania-map.json` son exactamente tres —`capitania`, `gobernacion`,
   `telefono`— y **ninguno es dirección**. La trae **sólo el CSV, 63 de 64** (la que falta es
   Rada Covadonga), sin ninguna truncada. O sea que **el primer escalón de INV-10.1 no se puede
   cumplir hoy ni en teléfono ni en dirección**: los dos datos están fuera de `src/`.

3. **El criterio de desempate de las 7 ambiguas sigue abierto, y dos son de ámbito
   publicado.** La llave entre el decreto y el CSV no existe declarada; se compone del join
   (bahía → jurisdicción) por `consultaBahias` (bahía → repartición), **sin comparar nombres**,
   y da **52 de 64 con una sola repartición · 7 ambiguas · 5 sin bahía** (idéntico con las
   capturas del 12 y del 13, así que no depende del día). Las dos publicadas son
   **`lago_panguipulli`** (184 PANGUIPULLI / 186 VILLARRICA) y **`lago_ranco`** (188 LAGO RANCO
   / 189 —la que no existe— / 201 PUERTO VARAS). **En las dos el CSV trae teléfono para la
   Capitanía que el decreto nombra**: lo que falta no es el dato, es el criterio, y elegir es
   adjudicar. Va con los 16 conflictos decreto-vs-SITPORT de **E5**.

4. **Los 3 números muertos están en pantalla hoy, y no dependen de §5 ni de la promoción.**
   `+56 58 220 6402` (Arica), `+56 41 226 6100` (Talcahuano) y `+56 65 256 1100` (Puerto Montt)
   alimentan **41 de las 164 entradas** del mapa —1 + 12 + 28, contadas por teléfono— y
   DIRECTEMAR ya no los publica para esas Gobernaciones. **Es el único punto del frente que se
   puede corregir sin decidir nada de estructura**: es un valor desactualizado dentro de la
   fuente que el contrato **ya** autoriza. Ninguna de las 11 jurisdicciones que caerían al
   segundo escalón usa uno de los tres —sus Gobernaciones son Valdivia, Coquimbo, Valparaíso,
   Castro, Aysén y Punta Arenas, **las seis coinciden con DIRECTEMAR**—, así que el defecto vive
   en el punto de zarpe y recalada de hoy, no en la política de mañana.

   > **CORRECCIÓN 2026-08-14, §3.3: el párrafo de arriba no se borra. El número sobrevive; el
   > mecanismo y la conclusión, no.**
   >
   > **(a) El 41 es correcto y lo que este punto dice de él es falso.** Los tres teléfonos **no
   > alimentan ninguna entrada del mapa**: medido sobre las 164, `+56 58 220 6402` → 0,
   > `+56 41 226 6100` → 0, `+56 65 256 1100` → 0. Estuvieron —los puso `35c63d9`— y los
   > repusieron `85bc68a` y `df684d7` el 2026-08-13, **ocho horas después de escribirse este
   > apartado**. Hoy viven **sólo** en la tabla hardcodeada de `src/utils/capitanias.js`, que es
   > lo que el **punto 1 de este mismo apartado ya dice bien**: el apartado se contradecía
   > consigo mismo. El 41 reproduce exacto —1 Arica + 12 Talcahuano + 28 Puerto Montt— pero
   > cuenta **entradas cuya Gobernación es una de las tres**, no entradas que lleven el número.
   >
   > **(b) Para el fallback la población es 31, no 41, y los dos conjuntos no están anidados.**
   > Cuando el fallback dispara, el teléfono sale de `getCapitania(lat,lng)` —franjas de
   > latitud— y no del mapa. Medido sobre las 163 bahías con coordenada: **31** reciben uno de
   > los tres números por esa vía. **28 están en las dos cuentas**; **13 sólo en el 41** —103,
   > 121, 160, 161, 181, 182, 183, 184, 185, 186, 187, 229, 234— y **3 sólo en el 31** —118,
   > 213, 214—. La 257 queda fuera de las dos: sin coordenada en `BAHIA_COORDS`, la función no
   > puede evaluarla.
   >
   > **(c) "El único punto del frente que se puede corregir sin decidir nada de estructura" ya
   > no se sostiene, por tres motivos medidos.** **Uno:** el valor a corregir **no está** en la
   > fuente que el contrato autoriza — está en `src/utils/capitanias.js`, que §5 declara *"POR
   > DEFINIR — hoy vive hardcodeado… sin declarar acá"*. **Dos:** el insumo de reemplazo **no
   > existe en el repositorio** — `capitanias_64_final.csv` tiene ocho columnas (`CdRep`,
   > `Codigo`, `Capitania`, `Gobernacion`, `Region`, `Telefono`, `Direccion`, `Jefe`), su única
   > columna de teléfono es de **Capitanía** y `Gobernacion` es un nombre; 14 de las 15 franjas
   > tienen una Capitanía homónima en el CSV, pero usar ese número sería rotular un teléfono de
   > Capitanía como Gobernación, que es la mezcla de categorías que INV-10.1 existe para cerrar,
   > con los roles invertidos. **Tres:** la fuente que alimenta el fallback **devuelve la
   > Gobernación equivocada en 28 de 163 casos** —17 %— contra el campo `gobernacion` del mapa,
   > y hay 3 más que no resuelve. Reponer los tres números sigue siendo barato de teclear y
   > **deja intacto el defecto mayor**: el teléfono correcto de la Gobernación equivocada no
   > sirve. Sigue siendo necesario; dejó de ser suficiente.
   >
   > Medido el 2026-08-14. ~~**La evidencia cruda de esta medición todavía no está en
   > `_bitacoras/`** (§3.1) — se tomó en sesión y la enmienda se escribió antes de bajarla.~~
   > **SALDADO el mismo día (§3.3): la evidencia está en
   > `_bitacoras/frente_contacto_fallback_2026-08-14.txt`**, con su instrumento re-ejecutable en
   > `_bitacoras/frente_contacto_fallback_2026-08-14/medir_fallback.js` — sólo lee, no escribe
   > nada, y la sección 1 de la bitácora es su salida sin editar. La frase tachada fue cierta
   > entre que se escribió esta enmienda y que se bajó la bitácora, y se conserva porque el
   > orden importa: **la enmienda se escribió antes que su respaldo**, que es lo que §3.1 pide
   > no hacer.

> **REGISTRO del 2026-08-14 — cuatro hechos medidos que no enmiendan nada de arriba y no abren
> tramo.** Van acá porque son del mismo camino de código que este apartado describe, y entre
> sesiones se pierden.
>
> - **El par mezclado está armado y sin disparar.** Si el backend recibe un `bahia_id` que el
>   mapa no tiene, `getCapitaniaByBahiaId` devuelve `gobernacion: 'Desconocida'` —truthy, así que
>   el `||` **no** cae al fallback— y `telefono: null` —falsy, así que **sí** cae—: la pantalla
>   quedaría con un nombre del backend y un teléfono de la tabla de franjas, sin nada que lo
>   señale. El `||` de `PortStatusBlock.jsx:76-77` y de `useVoyageVerification.js:535-538` opera
>   **campo por campo, no por registro**. Medido contra la captura del 2026-08-13: de los 165 ids
>   de `consultaBahias`, **uno solo** no está en el mapa —la **258**— y ninguna clave del mapa
>   falta en la fuente. SITPORT no publica restricción bajo la 258 hoy, así que el caso existe y
>   no dispara. Es la divergencia que **D14** dejó abierta a propósito.
> - **El fallback completo sí es alcanzable.** `bahiaId` llega vacío cuando no hay restricción
>   que matchee **y** el nombre no resuelve, y `resolverBahiaIdPorNombre` sólo puede devolver
>   claves de `BAHIA_COORDS` —las 163, todas en el mapa—. Con destinos no portuarios devuelve
>   `null`: probado con "Marina del Sur", "Centro de cultivo 103421", "Fondeadero Quicavi",
>   "Caladero 42S" y un par de coordenadas, los cinco `null`. Ahí caen al hardcodeado **el nombre
>   y el teléfono**. Es el bug 1 de `CONTRATO_MOTOR.md` §7 llegando al contacto.
> - **42 de los 163 nombres resuelven a OTRA bahía.** Corrido el resolutor sobre su propio
>   universo: 1 devuelve `null` (79 "Tal Tal") y **42 devuelven un id distinto del suyo** —98
>   Talcahuano → 97 Lirquén, 140 Bahía Paraíso → 92 Valparaíso, y 175/176 Repolla → 83 Punta
>   Totoralillo, entre otras—. La causa está localizada: `'sector'` **no** está en el set de
>   palabras a saltar, así que todo nombre que la contenga matchea primero contra
>   `83 "Sector Punta Totoralillo"`. No es de este frente; queda con su causa escrita para no
>   tener que volver a encontrarla.
> - **La Antártica tiene teléfono y no cabe en la estructura.** `+56 32 2208557`, recuperado y
>   verificado en `_bitacoras/frente_contacto_2026-08-13/`, con los HTML crudos en `297b220^`.
>   Pero las franjas terminan en `lat_sur: -56.0` y `getCapitania(-64.8167, -63.0)` devuelve
>   `null`: las tres bahías antárticas —139 Fildes, 140 Paraíso, 231 Chile— la función no las
>   resuelve, y el mapa se las adjudica a "Puerto Williams". Sumarla **no es una fila más**: es
>   decidir qué hace la tabla al sur del paralelo 56, y eso toca lo que el patrón ve.

**La distancia entre el código y INV-10.1, medida y no arreglada** (es insumo de la promoción,
no la promoción):

| dónde | qué incumple | ¿se puede cumplir hoy? |
|---|---|---|
| `data/decreto/zonas_aviso.json`, `mensaje.capa_2_con_capitania` | transcribe la **v1.7**: *"Verifica con la Capitanía {nombre}: **{telefono}**…"*. El §10 v1.8 dice *"Confirma con la Capitanía [nombre]"*, sin teléfono | **sí** — es quitar |
| `src/services/zonas-aviso.js:163-165` | **exige que el mensaje incluya `{telefono}`** y se detiene si falta. Hoy el guard **impide cumplir el contrato**: hay que invertirlo | **sí** — es invertir |
| `src/services/cobertura-jurisdiccional.js:421-424` | sustituye `{telefono}` en el mensaje | **sí** — es quitar |
| `src/routes/sitport-routes.js:817` + `TransitRestrictionsBlock.jsx:74-82` | la tarjeta de **tránsito** muestra `📞 {Capitanía} — {teléfono}`; INV-10.1 pone el contacto **sólo** en zarpe y recalada | **sí** — es quitar |
| `P3_VoyageVerification.jsx:249-258` | el bloque de arribada forzosa muestra *"Teléfono: …"* dentro de un mensaje del catálogo | **sí** — es quitar (el **VHF Canal 16** de esa misma frase **se conserva**: viene de la norma citada, y la Regla de uso v1.8 lo dice) |
| `WeatherBlock.jsx:193-205` | muestra teléfono por tramo, fuera de zarpe/recalada | **sí** — es quitar |
| `DeportiveAlerts.jsx:187, 287, 488` | tres enlaces `tel:` desde la tabla hardcodeada de la PWA | **sí** — es quitar |
| los **7** puntos de render con `tel:` | ninguno comprueba que el valor sea **atómico**: todos hacen `replace(/\s+/g,'')` y arman el enlace. INV-10.1 manda mostrarlo como texto si no lo es | **sí**, y **hoy no puede fallar** —los 15 números en uso son atómicos—; **se vuelve real con el CSV**, que trae **6 no atómicos** |
| **escalón 1** de INV-10.1 (teléfono y dirección de Capitanía) | no hay dato en ninguna fuente viva | **NO** — depende de §5 |
| **escalón 2** para `rada_covadonga` | falta el teléfono de la GM Antártica Chilena | **NO** con lo que hay en `src/`; el valor está **recuperado y verificado** en `_bitacoras/frente_contacto_2026-08-13/` |

> **El corte es limpio y conviene tenerlo escrito: todo lo que INV-10.1 pide QUITAR se puede
> hacer hoy y sin datos nuevos; todo lo que pide MOSTRAR depende de que §5 se decida.** Son dos
> trabajos separables, y el primero cierra por sí solo la verificación *"ningún mensaje del
> catálogo contiene `[tel]`"*.

> **Un hallazgo lateral que no es del frente y hay que anotar igual: el dato divergió del
> contrato y nada lo detectó.** `zonas_aviso.json` declara en su propia `procedencia` que el
> texto está *"TRANSCRITO"* del §10 y que *"si el catálogo cambia, cambia acá y se nota"* —
> pero **no hay ningún control que compare los dos textos**, así que la v1.8 lo dejó
> desactualizado en silencio. Es exactamente lo que §7.2 propone cazar.

El sondeo dejó una cosa que sí vale y que **ninguna etapa de este plan cubre**: el contacto.
Medido — con `capitanias_64_final.csv` cambiarían de **teléfono 150 bahías** y de
**gobernación 10**, y aparecería `direccion`, que hoy no existe como campo. **Ese número
dimensiona el dato desactualizado, no el frente**: aplicarlo entero dejaría el defecto de
estructura intacto.

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

##### Una decisión que se tomó y se revirtió el mismo día — 2026-08-13

**El registro de que se intentó vale tanto como la decisión, así que no se borra.**

**Lo decidido, por la mañana:** *la gobernación sale del join, igual que el nombre; el mapa
queda sólo para el teléfono.* Fundamento del owner: el join es dato declarado con respaldo del
decreto y el mapa es el que está mal — el mismo fundamento con el que se decidió el nombre.

**Lo que la disparó, medido** (`_bitacoras/e3_medicion_160_2026-08-13.txt`): con el cableado de
E3 activo, la bahía 160 muestra Capitanía **"Lago Ranco"** con gobernación **"Puerto Montt"**,
mientras sus tres hermanas de la misma Capitanía —144, 145 y 146— muestran **"Valdivia"**. Es
la única incoherente de las siete bahías que devuelve una ruta por el Puyehue.

**RETIRADA el mismo día por el owner, y el motivo es la objeción que la tumba: aplicarla sola
deja TRES campos contradiciéndose en la misma tarjeta, y eso se lee peor que hoy.** El teléfono
de la 160 es `+56 65 256 1100`, el de Puerto Varas; las otras tres de `lago_ranco` traen
`+56 63 227 6905`. Aplicada la decisión, la 160 diría **Capitanía Lago Ranco · Gobernación
Valdivia · teléfono de Puerto Varas**: dos campos del decreto y uno de otra Capitanía. **Queda
como está** hasta que el frente se resuelva entero.

**Lo que este intento dejó, y es lo que valía:** hizo visible que el defecto no está en el valor
de un campo sino en la clave del archivo. Sin él, el frente se habría seguido dimensionando como
una actualización de datos.

##### La causa de raíz — POR QUÉ ESTE FRENTE ES UN REDISEÑO Y NO UNA CORRECCIÓN DE DATOS

**El contacto está indexado por BAHÍA.** `bahia-capitania-map.json` tiene una entrada por
`bahia_id` con `capitania`, `gobernacion` y `telefono` juntos. De ahí se sigue todo lo demás:
**para una bahía que el mapa mis-atribuye, el teléfono viaja con la Capitanía equivocada**, y
ninguna decisión sobre qué campo sale de qué fuente puede arreglarlo, porque el problema no es
de qué fuente sale el valor sino **de quién es el valor**.

La medición que lo sostiene, sobre las siete bahías que devuelve una ruta por el Puyehue:

| bahía | jurisdicción (join) | Capitanía mostrada | gobernación | teléfono |
|---|---|---|---|---|
| 111 | `puerto_varas` | Puerto Varas | Puerto Montt | +56 65 256 1100 |
| 144 | `lago_ranco` | Lago Ranco | Valdivia | +56 63 227 6905 |
| 145 | `lago_ranco` | Lago Ranco | Valdivia | +56 63 227 6905 |
| 146 | `lago_ranco` | Lago Ranco | Valdivia | +56 63 227 6905 |
| 159 | `puerto_varas` | Puerto Varas | Puerto Montt | +56 65 256 1100 |
| **160** | **`lago_ranco`** | **Lago Ranco** | **Puerto Montt** | **+56 65 256 1100** |
| 161 | `puerto_varas` | Puerto Varas | Puerto Montt | +56 65 256 1100 |

> **La tabla de arriba es la medición del 2026-08-13 y NO se toca por dentro: es la evidencia
> del argumento, no un cuadro de datos vigentes.** Tachar celdas adentro la volvería inútil como
> snapshot — dejaría de mostrar qué se midió ese día, que es lo que sostiene la causa raíz. La
> corrección va acá abajo, fechada (§3.3).
>
> **CORREGIDA el 2026-08-14: la columna `teléfono` murió en 4 de las 7 filas.** Ocho horas
> después de escribirse esta medición, `85bc68a` (21:52) y `df684d7` (22:10) repusieron en el
> mapa el teléfono de la Capitanía declarada. Lo que dice el mapa hoy:
>
> | bahía | teléfono medido el 2026-08-13 | teléfono hoy |
> |---|---|---|
> | 111 | ~~`+56 65 256 1100`~~ | `+56 65 2235237` |
> | 144 | `+56 63 227 6905` | `+56 63 227 6905` — vigente |
> | 145 | `+56 63 227 6905` | `+56 63 227 6905` — vigente |
> | 146 | `+56 63 227 6905` | `+56 63 227 6905` — vigente |
> | 159 | ~~`+56 65 256 1100`~~ | `+56 65 2205100` |
> | 160 | ~~`+56 65 256 1100`~~ | `+56 65 2205100` |
> | 161 | ~~`+56 65 256 1100`~~ | `+56 65 2205100` |
>
> **Las otras dos columnas siguen vigentes, y se midió que lo siguen:** `jurisdicción (join)` no
> cambió, y `Capitanía mostrada` es salida del motor vía el join —no el campo `capitania` del
> mapa—, así que "Puerto Varas" en 111/159/161 y "Lago Ranco" en la 160 es lo que la pantalla
> sigue renderizando.
>
> **El argumento que esta tabla sostiene NO se mueve**, y por eso la enmienda es de la columna y
> no del párrafo: cuatro bahías de `lago_ranco` con dos teléfonos distintos sigue siendo cierto
> hoy —144, 145 y 146 traen `+56 63 227 6905` y la 160 trae `+56 65 2205100`—, y la causa sigue
> siendo que la clave del archivo es la bahía.

**Cuatro bahías de `lago_ranco` y dos teléfonos distintos.** El teléfono correcto de Lago Ranco
**ya está en el archivo** —lo traen 144, 145 y 146— y la 160 no lo alcanza, porque la clave es
la bahía y a esa bahía el mapa le puso Puerto Montt. Es el mismo hallazgo de E0.3 en su versión
lacustre: **34 de 42 re-atribuciones dejaban el nombre de una Capitanía con el teléfono de
otra**, y el paso 3 de E3 midió **17 de 21** entradas lacustres mal atribuidas.

**LA SOLUCIÓN, ANOTADA: indexar el contacto por CAPITANÍA, y resolver la Capitanía por el
join.** El contacto pasa a ser *un dato por Capitanía* —que es la unidad que INV-3.3 manda— y
la bahía deja de tenerlo: se le pregunta al join de quién es y se busca el contacto de esa
Capitanía. Con eso, los tres campos salen siempre de la misma entidad y no pueden contradecirse,
y el CSV de las 64 pasa a ser lo que siempre debió ser — **el contenido de la tabla nueva, no un
parche sobre la vieja**.

**Sigue siendo del owner y sigue tocando lo que ve el patrón**; lo que cambia es que ahora está
dimensionado: un rediseño chico con su fundamento medido, no una lista de valores por actualizar.

##### La urgencia cambió el 2026-08-13 (E3 paso 6): el teléfono ya está impreso al lado de un "puerto cerrado"

Hasta el paso 5 ninguna bahía lacustre entraba al matching, así que la discrepancia de
contacto era **interna**. Con el ámbito publicado **se le muestra al patrón**, y el mismo
día se midió una restricción real de "puerto cerrado" en el Lago Villarrica que sale en
pantalla **con un teléfono al lado**. Medición completa en
`_bitacoras/e3_paso6_2026-08-13/11_contacto_lacustre.txt`:

- **Un teléfono para tres Capitanías distintas.** `+56 63 227 6905` sale hoy para **Lago
  Villarrica, Lago Panguipulli y Lago Ranco**. Ese número es identificable —la
  identificación se hizo **por el número**, no por el nombre, así que no supone ninguna
  equivalencia—: `capitanias_64_final.csv` se lo da a **VALDIVIA, repartición 175, que es
  una Capitanía MARÍTIMA**.
- **Una Capitanía con dos teléfonos:** `Lago Ranco`, por la bahía 160, que ya estaba escrita
  más abajo.
- **Contra el CSV, emparejando por CÓDIGO DE REPARTICIÓN y no por nombre: discrepan 20 de
  las 21** (la 21ª es la bahía 146, repartición 189, que el CSV no lista — "la que no
  existe", entrada 1 del registro de DIRECTEMAR). **Actualizado el 2026-08-14: la ATRIBUCIÓN
  de la 146 ya no está pendiente, y el dato ya está escrito.** El owner la decidió y la cerró
  ese día —la bahía 146 pertenece a la CAPITANÍA DE PUERTO LAGO RANCO, por SITPORT, con el
  decreto coincidiendo de forma independiente
  (`_bitacoras/atribucion_bahia_146_2026-08-14.txt`)— y `src/data/bahia-capitania-map.json`
  dice hoy `Lago Ranco` en la 146 y también en la **144 y la 145**, que colgaban del mismo
  párrafo del decreto y estaban en `null` por el mismo motivo. Lo que sigue abierto en la
  entrada 1 del registro es sólo **qué es** la repartición 189, más la relación entre la 146
  y la 258, que se sumó como segunda pregunta el mismo día.

> **Qué afirma esa medición y qué no.** Afirma que **las dos fuentes discrepan**. NO afirma
> que el teléfono mostrado esté mal: la fuente autorizada del contacto es
> `bahia-capitania-map.json` por `CONTRATO_MOTOR.md` §5, y el CSV **no es autoridad** — el
> sondeo del 2026-08-12 se cerró sin aplicar y su propia bitácora pide re-verificar contra
> los raw.
>
> Y una trampa pagada en el acto: la primera versión de ese script emparejó **por nombre** y
> devolvió "NO ENCONTRADA" para dos de las seis, porque el CSV las llama VILLARRICA y
> PANGUIPULLI y el decreto `lago_villarrica` y `lago_panguipulli`. Es la equivalencia que
> `CLAUDE.md` §2 persigue; se rehízo por repartición, que es la clave que A3 ya había fijado
> para el mismo problema.

**Esto no cambia la solución anotada —indexar por Capitanía y resolverla por el join—; le
cambia la prioridad.** El frente sigue siendo del owner y sigue sin resolverse acá.

##### La bahía 160 queda SIN RESOLVER, y va a este frente

**No se elige una Capitanía principal, y el motivo es que elegirla es inventar una partición que
la fuente no da.** El decreto **sí** parte el lago —Lago Ranco *"hasta el límite con la Región
de Los Lagos"*, el resto Puerto Varas—; el shapefile trae **un solo polígono**; y el criterio de
partición **no está determinado en ninguna fuente cargada**. Por eso el insumo adjudicó el mismo
`fid 1110` a las dos y declaró el traslape, y por eso la capa publicada tiene **0,000000 km² que
pertenezcan a una sola** de las dos.

**Y arreglarlo sólo para la 160 sería un caso particular en el código**, que es lo que
`CLAUDE.md` §4.3 prohíbe: una regla que nombra a una entidad no es una regla. Es la única de las
164 con `jurisdicciones_adicionales`, así que cualquier arreglo puntual sería literalmente una
rama con su número adentro.

**Lo que SÍ está decidido, y hay que dejarlo escrito para que nadie lo lea como descuido:** la
combinación que se muestra hoy —**la Capitanía que SITPORT no usa para esa bahía, con el
teléfono de la que sí usa**— es **la peor de las dos posibles**. SITPORT publica el Puyehue
entero bajo la repartición **201 (Puerto Varas)**, y nuestro join puso a `lago_ranco` como
principal, que es lo que decide el nombre. **No se deja así a propósito: se deja porque
arreglarla bien es este frente**, y arreglarla a medias —eligiendo una principal, o parchando
la 160— cuesta más de lo que ahorra.

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
| 2.5 | 2026-08-15 | **La causa de `punta_delgada` y `tierra_del_fuego` baja al v1 — Opción 2 del owner. El control de consistencia v1/v2 pasa de exit 3 a exit 0.** Era el primer punto de la sesión por orden del owner, y la precondición del reconocimiento de complemento. **El rótulo, porque se lee mal solo: cierra la DIVERGENCIA, no las jurisdicciones.** Las dos siguen `no_cerrable`; **marítima sigue 44/8, sobre las 64 54/10**; sigue faltando Cabo del Espíritu Santo y el ancla de Tierra del Fuego. **La pieza fue más lejos que la orden y el motivo se midió antes de proponerlo:** la orden hablaba del texto, pero el texto del v1 **era exacto respecto del estado del v1** — los **4 topónimos del IGM vivían sólo en el v2** (`puntos_notables` v1 **72** · v2 **76**) y el bloque **`pendientes` no existía en la fuente**. Ésa era la inversión que INV-3.7 prohíbe; el texto era el síntoma. Bajaron los tres, y con eso el v1 pasa a sostener lo que su propio texto afirma. **Corrección a la v2.4 y a la bitácora de `arica`, que son mías:** esa divergencia se describió como *"conocimiento que sólo vive en el DERIVADO"* y *"la misma forma que la trampa de Galletué"* — **había escritor versionado**, `scripts/fase5_registrar_toponimos_igm.py:196-215`, con las dos causas literales, y Galletué era el v1 adelantado con el v2 atrasado, o sea al revés. La imprecisión no era inocua: hacía parecer imposible la opción de declarar el bloque en el control, que era **legítima** y había que descartarla con su motivo (§0.2), no en silencio. Va por **nota al pie en las dos bitácoras**, no reescribiendo (§3.3). **El tercer escritor del v2 se retira:** `fase5_registrar_toponimos_igm.py` **deja de escribir y pasa a verificar** contra el v1, con ALTO si el v1 dejó de decir lo que la consulta al IGM dejó registrado — verificar y no borrar, porque la causa está **acoplada** a los topónimos y un script borrado no puede avisar de que quedó mintiendo (§4.4). **El control quedó MÁS ESTRICTO, no más permisivo:** se le retiraron `BLOQUES_AGREGADOS['pendientes']` y `LISTAS_CON_APENDICE['puntos_notables']`, que perdonaban un bloque entero y 4 elementos de cola; y se le agregó **ruta de salida por argumento**, porque correrlo donde nació pisaba la constancia de la sesión que lo produjo (§3.3). **El gate que el owner exigió medido ANTES de escribir**, no después: el auditor del v1 corrido dos veces —contra el v1 real y contra una sombra con los 4 puntos y el bloque puestos— da **391 líneas contra 391, 0 diferencias**, y cero vértices del v1 nombran alguno de los 4, así que A0 no gana ni una comparación. Nota que va con ese verde: **el auditor del v1 ya venía en exit 1 con 50 fallos**, idéntico antes y después; esta pieza no lo produce y no lo arregla. **Mordida 4/4 (§4.6)**, y una importa especialmente: mover un topónimo del IGM en el v2 **no se cazaba antes** de retirar el permiso de apéndice, y ahora sale exit 1 — la prueba de que apretar el control fue real. Regresión: **B0..B12 LIMPIA**, **B12 re-sellado** con la autorización literal del owner (22/22 adjudicaciones siguen aplicando, verificado antes de sellar), validador de `zonas_aviso.json` limpio con mordida 22/22, suite **84/84**. `zonas_aviso.json` **no se tocó**: se midió y ya estaba vigente. **Descartada y escrita (§0.2): la Opción 3** —declarar el bloque en el control—, que cerraba el código 3 en una línea sin tocar el dato: es la opción que deja todo en verde sin cambiar nada de fondo (§0.3) y dejaba el v1 vencido. **Diferido por decisión del owner:** mudar el control a `scripts/`, que es su casa natural, pero como movimiento propio — hacerlo dentro de una corrección de dato mezcla dos cosas. |
| 2.4 | 2026-08-15 | **El límite Norte de `arica` queda DECLARADO y `arica` sigue `no_cerrable` — D16, Opción D del owner.** El rótulo importa y por eso se repite en cada lugar que se tocó: **no se cerró la jurisdicción, se cerró el registro**; quien lea "Arica cerrada" va a buscar una geometría que no está. **La objeción que produjo la decisión se midió antes de proponerla:** `receta_banda_paralelos` devuelve la franja entera hasta las 200 mn y **no existe ningún campo de alcance en el insumo** (`alcance`: 0 apariciones), así que "hasta 24 mn" no es expresable con las recetas de hoy — escribir `limite_norte_dec` produciría una capa que adjudica como chilena el agua que el propio paquete de DIFROL niega, y su línea de ZEE termina **108,3 mn al Sur** del paralelo. **La precondición se cumplió antes de escribir nada**, y no era trámite: el valor `070 22 49,7 W` **no existía en el repositorio** —vivía sólo en una memoria de sesión—, así que se bajó el paquete, se midió y quedó en `_bitacoras/arica_limite_norte_2026-08-15/` con derivados versionados, instrumento re-ejecutable y `PROCEDENCIA.txt`. **Tres correcciones de instrumento hechas antes de reportar, y las tres quedan escritas porque el método vale tanto como el número:** (i) el identificador por nombre de la línea de ZEE **estaba mal** —el paquete trae CINCO features y TRES mencionan ZEE/Plataforma—, y se rehizo por geografía con un `Alto` si alguna vez devuelve más de una; (ii) el retrocálculo se hizo primero sobre una **geodésica**, que **no es un paralelo** y se aparta ~29 m, y las dos versiones quedan corridas a la vista; (iii) escribí que el `.cpg` del paquete mentía sobre la codificación y **era falso** — los bytes crudos son UTF-8 válido y el carácter roto lo ponía la consola de Windows, la misma familia que la ausencia falsa de Sala y Gómez. **La inserción quirúrgica en el v2 fue con control, por condición del owner** (*el atajo que evita regenerar también evita enterarse*): `verificar_v2_contra_v1.py` regenera el v2 a un archivo aparte y exige que **toda** diferencia caiga en lo que los otros dos scripts escriben. Resultado: **0 no declaradas** — y **cazó 2 divergencias anteriores a esta sesión**, medidas contra `HEAD e2db84b`: `punta_delgada` y `tierra_del_fuego` traen en el v2 una `causa_sin_geometria` que el v1 **no tiene en ningún campo**, y el texto del v1 además está **vencido** (dice que faltan coordenadas de Punta Harry, Cabo San Vicente y Punta Anxious, que ya están verificadas contra el IGM en `puntos_notables`). Es la forma de la trampa de Galletué y **no se arregló acá**: queda declarada con código de salida **3**, la semántica que E0.1 fijó para divergencia conocida y abierta, nombrada una por una para que una tercera siga saliendo **1**. **Un fallo del propio control, arreglado con su lección:** moría con `UnicodeEncodeError` al imprimir en la consola cp1252 y **dejaba en disco el .txt de la corrida anterior** — el rastro se apagaba junto con el control, que es exactamente el BOM del 2026-08-12; ahora la evidencia se escribe **antes** de imprimir. Regresión: auditoría del insumo **LIMPIA**, **B12 re-sellado** con la autorización literal del owner (las 22 adjudicaciones siguen aplicando, verificado antes de sellar), suite **84/84**, `zonas_aviso.json` **sin tocar** — la zona de `arica` sigue viva porque `participa_matching` no se movió, y con ella la frase que ya anticipaba todo esto: *"Cerrar la banda por el Norte es una convención del dueño del producto, no dato del decreto."* **Una enmienda que el owner pidió y NO se hizo, con su motivo:** la nota de E2 sobre las *"16 restricciones que no se le listan al patrón — 14 de `arica` y 2 de `puerto_williams`"* **no envejeció**, porque envejecería si `arica` se hubiera cerrado y con D no se cerró; tacharla habría sido escribir algo falso. Se le agregó en cambio un puntero a dónde vive ahora la causa. |
| 2.3 | 2026-08-13 | **E3 CERRADA, aprobada por el owner con la evidencia del paso 6.** La etapa entera cayó en un día: los pasos 3, 4, 5 y 6. **El resultado no es que la capa exista, es que una restricción real de "puerto cerrado" en el Lago Villarrica le llega al patrón** — y le llegó sobre la ruta del arnés de E0.2, escrita dos días antes de que la capa existiera, o sea que la evidencia no es circular. **La regresión que la etapa se comprometió a medir en vez de afirmar da CERO** sobre 19 rutas, con un instrumento que es **contrafáctico y no baseline** (`scripts/e3_verificacion_paso6.js`): el mismo motor dos veces sobre las mismas coordenadas, porque un número copiado de una bitácora vieja envejece —lección del paso 5, donde publicar el ámbito puso en rojo tres cosas que afirmaban el estado del calendario—. **Decisión del owner sobre el punto 2 de la aceptación**, que es lo único que faltaba resolver: la aceptación nombra el Lago Llanquihue y sus dos mitades se acreditan en lagos distintos del mismo ámbito —la Capitanía en el Llanquihue, las restricciones en el Villarrica—, porque **la ausencia de restricción en SITPORT es condición Normal, no dato faltante**, y está medida como tal en la captura (`color: "default"`, `valor: 0` contra `danger`/`1`). Atar el cierre a que se dicte una restricción en un lago concreto sería atarlo a un evento que no controlamos y que, si ocurre, es una emergencia para un patrón. **Lo que la etapa deja abierto queda en su propia fila y no mandado a otro lado**: la deuda de D13 (cuatro cuerpos en causa (b)), la 257 sin dato real, el frente de contacto de §7.1 —que esta etapa **subió de urgencia con medición**: un teléfono para tres Capitanías, 20 de 21 discrepando—, la bahía 160 **pendiente de decisión del owner**, y lo que el paso 6 declaró no medido. **CUATRO marcadores de estado vencidos se actualizaron en el mismo acto** y se declara cuáles, porque un marcador vencido en un documento que se lee como autoridad es la contradicción de D6 otra vez: **(i)** el encabezado del documento decía "E3 en curso, pasos 1 a 4" —y arrastraba además la versión **2.0** con el historial ya en 2.2, un desfase anterior a esta edición, corregido a **2.3 / 2026-08-13**—; **(ii)** la nota de la tabla de los seis pasos decía "espera su visto bueno"; **(iii)** la celda de §7 decía lo mismo; y **(iv)** el primer bullet de §9 decía *"no se corrió el build para verlo. E3 empieza por ahí"*, cuando el build corrió, se aplicó y publicó el ámbito — **§9 es donde alguien mira para saber qué falta, así que un bullet falso ahí es peor que en cualquier otro lado**. Ese cuarto **no se sobrescribió**: se tachó y se le agregó la respuesta al pie, que es la convención que §9 ya tenía de E0.3 (§3.3). **Ninguno de los cuatro es registro de lo que pasó** —eso queda intacto, verificado byte a byte en la celda de §7— sino el estado de hoy, que es lo que esta edición existe para mover. |
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

- ~~**Si la geometría lacustre pasa sus controles.** Está construida y separada, pero no se
  corrió el build para verlo. E3 empieza por ahí.~~ **CONTESTADA en E3 (2026-08-12 el
  reconocimiento, 2026-08-13 el cierre): pasa.** El build corrió —primero en ensayo y después
  aplicado, exit 3 por publicación parcial— y las **6 lacustres salen con geometría, 4.479,4
  km²**, con **sus ocho controles en ok**; el único que falla es **C3, y sus seis pares son
  todos marítimos**. El único traslape lacustre —el Puyehue— **pasa por declarado, no por
  vacío**. La etapa fue más lejos que la pregunta: el ámbito está **publicado y consultado**, y
  una restricción real de "puerto cerrado" **le llega al patrón**. Ver la fila de E3 en §7.
- **Cuánto cambia el volumen de restricciones al pasar a Capitanía.** Es el número que E2
  existe para producir. Sin él, D4 y D5 no se pueden tomar.
- **Si C3 cierra con P2/P4'/P3/P5.** Sigue sin destrabarse la tensión entre "cero traslapes
  salvo Puyehue" y "los seis no se resuelven acá".
- ~~**Cuántas de las 30 jurisdicciones sin bahía atribuida son un problema real** y cuántas son
  jurisdicciones donde SITPORT simplemente no publica.~~ **CONTESTADA en E0.3 (2026-08-11):** son 29, y
  SITPORT le atribuye bahías a **27** de ellas. "SITPORT no publica ahí" explica solo 2 (`papudo` y
  `rada_covadonga`); las otras 27 el mapa operativo las colapsa en la Capitanía vecina.
- **Cómo se construye una jurisdicción con alcance costa-afuera acotado.** Abierta el
  2026-08-15 con D16 y **diferida a propósito**. Hoy `receta_banda_paralelos` devuelve la franja
  entera hasta el límite exterior de 200 mn y el insumo no tiene ningún campo de alcance
  (`alcance`: 0 apariciones, medido). Tres preguntas cuelgan de ahí y **ninguna se contestó**:
  si el hueco entre 24 y 200 mn en la banda de `arica` es causa **(a)** o **(b)** de INV-3.6;
  qué es el **tercer estado** de `estado_geometria`, hoy binario, que una jurisdicción
  construida en parte necesita —y que los dos validadores de `zonas_aviso.json` no admiten
  (`zonas-aviso.js:196` exige `participa_matching === false` para que exista una zona, y `:216`
  exige que toda jurisdicción sin geometría tenga una)—; y qué pasa al re-correr
  `fase5_corregir_testigos.py` con una jurisdicción más, que **deja de reproducir byte a byte**.
  Se diseña **genérico**, no como caso de `arica` (§4.3): `baker` y `puerto_eden` tienen la
  misma forma.
- **Si `hanga_roa` y `juan_fernandez` están mal clasificadas, y qué son.** El barrido del
  2026-08-15 midió que ~~**las seis islas están en la capa OSM cargada**~~ y que su
  `causa_sin_geometria` —*"el insumo no trae capa de islas; requiere fuente externa"*— es falsa
  en su segunda mitad. Pero **no** contesta qué es la jurisdicción de una Capitanía insular
  remota (isla sola, o isla más límite exterior), que es interpretación de la fuente normativa
  y es del owner. **No cuentan para C4**: son `insular_remota`, no marítimas. Trabajo no
  iniciado, y no pertenece a ninguna etapa de E0–E8.
  > **TACHADO Y CORREGIDO el 2026-08-15 (§3.3). "Las seis islas están en la capa OSM cargada"
  > es FALSO para `hanga_roa`.** Medido contra `costa_osm`, que es la tabla que la construcción
  > lee —no contra el zip de 925 MB—: las cuatro de `juan_fernandez` están (Alejandro Selkirk
  > **36** polígonos · Robinson Crusoe **55** · San Ambrosio **54** · San Félix **54**); las dos
  > de `hanga_roa` traen **0 polígonos cada una**, porque el cargador recorta a la caja
  > `-85..-65` declarada en `geodata/costa/capas_costa.json` y **Isla de Pascua está en
  > `-109,37` y Sala y Gómez en `-105,37`**, las dos afuera. La extensión real de `costa_osm`
  > es `xmin -80,838 / xmax -63,999`.
  >
  > **La bitácora original lo tenía bien y lo que envejeció fue el resumen:**
  > `_bitacoras/no_cerrables_2026-08-15/no_cerrables_2026-08-15.txt` §2 dice, en su cuadro,
  > *"hanga_roa — ESTA. Las 2 FUERA de la caja"* y *"juan_fernandez — ESTA. Las 4 dentro de la
  > caja"*. Al condensarse en este bullet se perdió la mitad que decide. **Es el modo de falla
  > del §2: "está en la capa" y "está en la capa cargada" no son la misma afirmación**, y la
  > segunda es la que gobierna la construcción.
  >
  > **Consecuencia sobre el rótulo de la pieza:** para `juan_fernandez` esto es
  > **reclasificación** —el dato está cargado—; para `hanga_roa` sigue siendo **carga de capa**,
  > que es trabajo distinto y más caro. Evidencia y forma reproducible en
  > `_bitacoras/reclasificacion_insular_2026-08-15/`.
  >
  > **Y la mala clasificación no vive en un campo del insumo: vive en el código.**
  > `scripts/fase4_migrar_insumo_v2.py:369-372` devuelve `no_cerrable` **incondicionalmente**
  > para todo el ámbito `insular_remota`, con la causa escrita en el `return`. La rama vecina
  > —`lacustre`— sí interroga al dato (`if not [f for c in cuerpos ...]`). Reclasificar no es
  > editar un campo: es hacer esa rama simétrica con la lacustre y agregar una receta insular a
  > la tabla `RECETAS` del constructor, que hoy tiene cuatro y ninguna sirve.
  >
  > **PASA A FRENTE PROPIO, con una decisión normativa por delante (owner, 2026-08-15).** No se
  > ejecuta hasta que el owner lea el **Art. 2 del D.S. 991** y adjudique qué es la jurisdicción
  > de una Capitanía insular remota. **Recomendación ya registrada para cuando esa decisión esté
  > tomada: OPCIÓN B para `hanga_roa` —capa de tierra propia para el ámbito `insular_remota`—,
  > no la Opción A de crecer la caja.** Las dos están escritas desde el 2026-08-10 en
  > `capas_costa.json`, campo `recorte.advertencia_ambito`. **El número que decide, medido:**
  > crecer `X_W` a `-110` estira **todas** las bandas de `receta_banda_paralelos` 25° al Oeste
  > y mete a Pascua y Sala y Gómez en el buffer del límite exterior, con lo que **543.337,9 km²
  > de la ZEE de las islas de `hanga_roa` quedan adjudicados a ocho Capitanías continentales**
  > —taltal 134.499,5 · caldera 112.444,1 · huasco 101.287,7 · antofagasta 84.947,4 · chañaral
  > 53.156,0 · coquimbo 46.338,7 · tongoy 8.479,7 · mejillones 2.184,8— **como efecto lateral
  > de mover una constante, y C3 no lo ve porque las bandas no se pisan entre sí.** Es la forma
  > exacta de D16: producir una capa que adjudica agua que nadie adjudicó.
  >
  > **DESCARTADA por el owner, con su motivo (§0.2): la tercera vía** —construir
  > `juan_fernandez` sola ahora y dejar `hanga_roa` `no_cerrable`—. Es viable técnicamente y
  > deja el ámbito **partido en dos estados**, obligando a declarar un insular medio construido:
  > justo el **tercer estado de `estado_geometria`** que este mismo §9 tiene abierto y sin
  > resolver en el bullet del alcance costa-afuera.
  >
  > **Hallazgo lateral anotado y NO tocado:** el v1 declara `participa_matching: true` para las
  > dos, y el v2 lo deriva `false` (`fase4_migrar_insumo_v2.py:1177`,
  > `participa_matching = (estado == "cerrable")`). Es **campo muerto en la fuente, contradicho
  > por su propio derivado**. No se corrige acá: entra al frente insular, o al de los 50 fallos
  > del auditor del v1, que ya reclama por estas dos.
- **De quién es el mar de las islas oceánicas — el buffer ZEE del límite exterior.** Frente
  abierto el 2026-08-15, **medido y NO diagnosticado**. El límite exterior se materializa
  bufferizando 200 mn la unión de la capa del rol `limite_exterior` (`ne_10m_land`) recortada a
  la caja de trabajo, y **las cuatro islas de `juan_fernandez` caen dentro de esa caja**. Medido
  contra la capa construida real —`jurisdicciones_decreto`, el andamio, 44 marítimas con
  geometría—, reproduciendo el pipeline del constructor (recorte → `ST_Simplify(0,01)` → buffer
  de 370.400 m en `geography`) y restando el buffer continental para quedarse sólo con lo que
  ninguna costa del continente alcanza:

  | | km² |
  |---|---|
  | ZEE que existe **únicamente** por las islas de `juan_fernandez` | **976.448,7** |
  | de eso, ya adjudicado a **15 Capitanías continentales** | **742.627,0** |

  **Los dos números son un PISO, no el total, y la propia medición lo delata:** la auditoría
  del corte del instrumento cuenta **3 piezas insulares, no 4**, porque el `ST_Simplify(0,01)`
  del frente de abajo ya había borrado Isla San Félix antes del buffer. Con las cuatro adentro
  la cifra sube, no baja. Se escribe así y no "las cuatro islas" porque eso afirmaría algo que
  la medición no midió (§2).

  Taltal 103.998,2 (64,4% de su área) · Constitución 92.684,2 (68,6%) · Caldera 86.372,1
  (64,1%) · Los Vilos 83.905,1 (65,5%) · Pichilemu 65.912,7 (64,8%) · Huasco 58.221,8 (54,8%) ·
  Antofagasta 52.322,7 (51,2%) · Chañaral 42.787,6 (65,7%) · Papudo 39.749,9 (69,6%) · San
  Antonio 33.917,8 (70,7%) · Valparaíso 31.737,7 (71,4%) · Quintero 23.451,2 (70,3%) ·
  Algarrobo 22.432,3 (70,9%) · Tongoy 3.345,3 · Coquimbo 1.788,4.

  **Esto PASA HOY, sin ninguna insular construida.** Siete de cada diez km² de la jurisdicción
  de San Antonio, Valparaíso, Algarrobo, Quintero y Papudo son agua que ninguna costa
  continental alcanza con 200 mn: existe porque Robinson Crusoe está en la capa del límite
  exterior. Encaja con lo que E4 ya tenía escrito y nadie había cruzado —*"conectividad global:
  descartada y medida, deja 5 de 6 pares en cero pero borra la ZEE de las islas oceánicas"*—,
  sólo que ahora tiene número.

  **La pregunta abierta es NORMATIVA y es del owner: el Art. 2 del D.S. 991.** No se contesta
  midiendo. Darle alcance costa-afuera propio a `juan_fernandez` es disputarle 742.627,0 km² a
  quince Capitanías continentales; no dárselo es dejar que quince continentales sigan siendo
  dueñas del mar de Juan Fernández. **Las dos son adjudicación, no construcción.** Y el Art. 2
  no está en el insumo —ver el pendiente de trazabilidad de INV-3.7—, así que la lectura no se
  reproduce desde el repositorio. **Probablemente exija consulta a DIRECTEMAR**, como Cabo del
  Espíritu Santo: entra al registro acumulativo de `_bitacoras/consulta_directemar_registro.md`,
  que se cierra y se envía cuando la construcción termine. **Acá no se diagnostica.** Evidencia
  y forma reproducible en `_bitacoras/reclasificacion_insular_2026-08-15/`.

- **`ST_Simplify(geom, 0.01)` borra una isla antes de bufferizar el límite exterior.** Frente
  abierto el 2026-08-15, **medido y NO arreglado**. El constructor simplifica la unión de
  `ne_10m_land` con tolerancia 0,01° antes del buffer de 200 mn. Medido pieza por pieza:

  | isla | antes | después |
  |---|---|---|
  | Robinson Crusoe | 91,682 km² | 88,916 km² |
  | Alejandro Selkirk | 51,165 km² | 47,540 km² |
  | San Ambrosio | 1,512 km² | 0,743 km² |
  | **San Félix** (`-80,0977 / -26,2720`) | **0,939 km²** | **desaparece** |

  **Hoy no importa**: nadie reclama esa agua y la jurisdicción insular no está construida. **El
  día que `juan_fernandez` se construya, se construye con 3 islas de 4 y ningún control avisa**
  —C1 sólo mira que la geometría no sea nula, vacía, inválida o de área cero, y la figura que
  queda cumple las cuatro cosas—. Es **defecto del límite exterior, no de la pieza insular**, y
  arreglarlo dentro de ella sería un caso particular (§4.3): la tolerancia la fija el mecanismo
  del buffer, que sirve a las 44 marítimas. **NO DETERMINADO:** si Sala y Gómez —más chica que
  San Félix— sobrevive al mismo simplify. Es una consulta y no se corrió.

- **Si alguna `no_cerrable` se resuelve por complemento** — o sea si su geometría es el hueco
  entre vecinas ya construidas. Reconocimiento **no hecho**. Su condición previa tampoco está
  medida: si el decreto reparte el territorio **sin vacíos**. Si dejara zonas sin asignar, el
  complemento adjudicaría de más y el enfoque completo queda descartado.
  > ~~**ORDEN FIJADO POR EL OWNER, 2026-08-15: primero baja al v1 la causa vigente de
  > `punta_delgada` y `tierra_del_fuego`, y recién después el reconocimiento de complemento.**
  > No es preferencia de secuencia: el complemento pregunta **justamente por esas dos**, y el
  > v1 dice hoy de ellas que *"el decreto define sus límites solo por accidentes geográficos sin
  > coordenadas"* — texto **vencido**, porque Punta Harry, Cabo San Vicente y Punta Anxious
  > están verificados contra el IGM y viven en `puntos_notables`. Entrar al reconocimiento
  > leyendo ese v1 es razonar sobre una carencia que ya no existe. Es la divergencia que el
  > control de `_bitacoras/arica_limite_norte_2026-08-15/` dejó abierta con código 3.~~
  >
  > **LA PRECONDICIÓN ESTÁ CUMPLIDA (2026-08-15, Opción 2 del owner).** El control pasa de
  > **exit 3 a exit 0**: 114 diferencias, 114 declaradas, **0 abiertas, 0 no declaradas**.
  > Evidencia en `_bitacoras/causa_pd_tdf_2026-08-15/`. **El reconocimiento de complemento
  > queda desbloqueado y sigue sin hacerse**, igual que su condición previa.
  >
  > **La pieza fue más lejos que la orden, y por qué:** la orden hablaba del texto, pero medir
  > mostró que el texto del v1 **era exacto respecto del estado del v1** — los cuatro topónimos
  > del IGM vivían **sólo en el v2** (`puntos_notables` v1 72 · v2 76) y el bloque `pendientes`
  > tampoco existía en la fuente. Ésa era la inversión que INV-3.7 prohíbe; el texto era el
  > síntoma. Bajaron los tres. `fase5_registrar_toponimos_igm.py` **deja de escribir el derivado
  > y pasa a verificar contra el v1**, y el control queda **más estricto**: se le retiraron los
  > dos permisos que perdonaban un bloque entero y cuatro elementos de cola.
  >
  > **Corrección a lo que dice el tachado y a la bitácora que lo originó:** esa divergencia se
  > describió como *"conocimiento que sólo vive en el derivado, la forma de Galletué"*. **Había
  > escritor versionado** (`fase5_registrar_toponimos_igm.py:196-215`); Galletué era el v1
  > adelantado y el v2 atrasado, y esto era al revés. Nota al pie en las dos bitácoras.
  >
  > **Marítima sigue 44/8; sobre las 64, 54/10.** Cerró la divergencia, **no** las
  > jurisdicciones: las dos siguen `no_cerrable`, falta Cabo del Espíritu Santo y falta el
  > ancla de Tierra del Fuego.
- **Por qué el auditor del insumo v1 sale en rojo, y qué de eso es defecto.** `scripts/fase4_auditoria_insumo.py`
  (Etapa A) termina en **exit 1 con 50 fallos**: **A0 3 · A1 12 · A2 9 · A4 12 · A5 14**. Es
  **anterior** a todo lo del 2026-08-15 y ninguna pieza de ese día lo movió —medido: el mismo
  informe, 391 líneas contra 391, antes y después de bajar los 4 topónimos y el bloque
  `pendientes` al v1—. **Se anota como frente propio, con fecha, en vez de quedar como pendiente
  suelto de la sesión que lo encontró**, que es como un número así se pierde. **No está
  diagnosticado y acá no se diagnostica**: por decisión del owner del 2026-08-15 no se abre ese
  día. Lo único que está medido es que los fallos **no son todos de la misma naturaleza** —A4
  reclama que `arica`, `baker`, `hanga_roa` y `juan_fernandez` no declaren `sin_georreferenciar`
  en el v1, y eso es el auditor de la Etapa A midiendo contra un esquema que el v2 ya reemplazó
  con `estado_geometria`—, así que **cuántos de los 50 son defecto real y cuántos son el auditor
  viejo mirando el campo que dejó de ser el vigente es exactamente la pregunta abierta.**
  Mientras no se conteste, **el que vale para decidir es el auditor del v2** (`fase4_auditoria_v2.py`,
  B0..B12), que sale **limpio**.
- **Mudar `verificar_v2_contra_v1.py` a `scripts/` — pendiente chico, y NO es movimiento puro.**
  El control vive hoy en `_bitacoras/arica_limite_norte_2026-08-15/`, que es una constancia de
  sesión, y **no es evidencia de una sesión: hay que correrlo cada vez que se toque el v2
  quirúrgicamente**, así que `scripts/` es su casa. Se anotó como movimiento propio el
  2026-08-15. **Corrección de forma aceptada por el owner el mismo día: un `git mv` lo deja
  roto, son tres constantes de ruta.** (1) `:51` resuelve `REPO` con **dos** `dirname()` porque
  hoy cuelga dos niveles abajo de la raíz; en `scripts/` cuelga uno solo y apuntaría al padre
  del repositorio. (2) `V2_PATRON` (`:55`) se escribe junto al script — quedaría dentro de
  `scripts/`. (3) La salida por defecto (`:409-410`) es `AQUI/04_v2_contra_v1.txt`, que también
  caería en `scripts/`, y **§3.5 prohíbe evidencia fuera de `_bitacoras/`**. El argumento de
  ruta de salida ya existe y sigue mandando; lo que hay que corregir es el defecto. Se hace en
  un solo paso y **con la mordida de §4.6 después**: el control tiene que seguir cazando lo
  mismo desde su casa nueva, y hoy sale **exit 0** (114 diferencias · 114 declaradas · 0
  abiertas · 0 no declaradas).
- **Plazos.** No hay estimaciones acá a propósito: E4 depende de cuántas iteraciones tome C3,
  y eso no se sabe hasta medir después de P4' y P3.
