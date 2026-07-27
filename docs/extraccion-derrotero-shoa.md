# Tmarea — Especificación de extracción del Derrotero SHOA

**Versión:** 1.1 — incorpora los patrones reales detectados en la Etapa A
**Ubicación en el repo:** `tmarea-backend/docs/extraccion-derrotero-shoa.md`

**Objetivo:** convertir los datos náuticos del derrotero en tablas georreferenciadas que alimenten el motor de ruteo raster.

**Se extraen datos, no texto.** Sondas, anchos, coordenadas y nombres son hechos. No se copian párrafos, descripciones ni instrucciones de navegación redactadas — ni al archivo de trabajo ni al producto final.

---

## 0. Patrones reales del documento (verificados en Etapa A)

Reconocimiento hecho sobre el tomo de 623 páginas con capa de texto. **Estos son los formatos que efectivamente aparecen**, no supuestos.

### Coordenadas — tres variantes conviviendo

Aparecen los tres formatos en el mismo documento, y **el símbolo de grado es inconsistente**: a veces `º` (ordinal masculino, U+00BA), a veces `°` (grado real, U+00B0). Un regex que contemple solo uno pierde la mitad de los registros.

Cubrir ambos símbolos y las tres variantes. El formato con **coma decimal** es el español chileno y es fácil de pasar por alto.

### Unidades

| Magnitud | Unidad en el documento | Conversión |
|---|---|---|
| Sonda | **Siempre metros**, coma decimal. Cero ocurrencias de "braza" en 623 páginas | ninguna |
| Ancho de canal o paso | **Cables** para distancias cortas, **millas** para largas. Nunca metros | 1 cable = 185,2 m · 1 MN = 1.852 m |
| Dimensión de estructura (muelle, rampa) | Metros | ninguna |
| Calado | Metros | ninguna |
| Rumbo y demarcación | Grados verdaderos, tres dígitos | ninguna |

**Cuidado:** que un ancho venga en metros es señal de que se trata de una estructura, no de un canal. No mezclar en `pasos.csv`.

### Ruido a filtrar

- **Números de línea sueltos** (`10`, `20`, `30`, `40`) intercalados cada ~10 líneas de columna. **Es el riesgo principal**: un extractor ingenuo los toma como sondas o anchos. Filtrarlos por posición en la línea, no por valor
- Header repetido de actualización al Boletín de Noticias a los Navegantes
- Footer con marca de copia autorizada y la línea de TCPDF
- En páginas con carta o plano incrustado, etiquetas de mapa sueltas y desordenadas al inicio del texto extraído

### Paginación

La numeración oficial del derrotero (`VII-1-3`, `VIII-4-51`) **no coincide con la página física del PDF**. El campo `pagina` de todos los datasets es la **página física**, obligatoria. La referencia oficial va en un campo opcional `ref_derrotero`.

### Estructura del tomo

| Páginas | Contenido |
|---|---|
| 1–140 | Front matter: prefacio, balizamiento, disposiciones, acuicultura, cobertura de cartas |
| 141–~380 | Cap. VII — Canal Chacao a Boca del Guafo |
| ~380–623 | Cap. VIII — Golfo de Penas, Península de Taitao, Fiordo Aysén |

**El front matter no se procesa.** La extracción arranca en la página 141.

---

## 0.1 Regla que decide si un dato sirve

> **Todo registro necesita posición. Un dato sin coordenada no entra.**

"El paso tiene 12 metros de sonda" es inútil si no se sabe dónde está ese paso. Si el derrotero no da coordenada explícita, se ancla al accidente geográfico nombrado más cercano que sí la tenga (faro, baliza, punta, islote) y se marca el registro como posición aproximada.

Formato de coordenadas: **decimal, 6 decimales, negativo para sur y oeste.**
`41°28'32"S 72°57'21"W` → `-41.475556, -72.955833`

---

## 1. Alcance geográfico

Solo el corredor **Puerto Montt – Aysén**. Latitud −41,5 a −46,0 aproximadamente.

Canales y pasos a cubrir, en orden de prioridad:

**Prioridad 1 — corredor troncal**
Canal Tenglo · Seno de Reloncaví · Canal de Chacao · Golfo de Ancud · Golfo Corcovado · Boca del Guafo · Canal Moraleda · Fiordo Aysén y acceso a Puerto Chacabuco

**Prioridad 2 — rutas interiores de Chiloé**
Canal Dalcahue · Canal Quinchao · Canal Lemuy / Paso Imelev · Paso Queilen · acceso a Castro · acceso a Quellón

**Prioridad 3 — Guaitecas y Aysén interior**
Acceso a Melinka y Canal Tuamapu · Canal Jacaf · Canal Puyuhuapi · Canal King · Canal Pilcomayo

Si el volumen obliga a elegir, **la Prioridad 1 sola ya resuelve el problema principal**: es el trayecto donde hoy el router falla con naves de calado alto.

---

## 2. Los cuatro datasets

### 2.1 `pasos.csv` — el más importante

Un registro por paso, angostura o tramo con restricción descrita.

| Campo | Tipo | Obligatorio | Ejemplo |
|---|---|---|---|
| `nombre` | texto | sí | Angostura Inglesa – paso isla Medio-Canal |
| `canal` | texto | sí | Canal Messier |
| `lat_inicio` | decimal | sí | -48.916667 |
| `lon_inicio` | decimal | sí | -74.408333 |
| `lat_fin` | decimal | sí | -49.108333 |
| `lon_fin` | decimal | sí | -74.366667 |
| `ancho_util_m` | entero | si figura | 185 |
| `sonda_minima_m` | decimal | si figura | 12.5 |
| `calado_max_m` | decimal | si figura | 10.7 |
| `eslora_max_m` | entero | si figura | 180 |
| `corriente_max_kt` | decimal | si figura | 6.0 |
| `restriccion` | texto corto | no | solo en estoa; no con marea y viento de popa |
| `pagina` | entero | sí | 247 |

**Sobre `ancho_util_m`:** el derrotero suele expresarlo en cables. **1 cable = 185,2 m.** Convertir y anotar el original en `restriccion` si hay duda.

**`restriccion` es campo corto, no transcripción.** Máximo unas pocas palabras que resuman la condición. Si la condición es larga, se referencia por página y se consulta la fuente.

### 2.2 `peligros.csv`

Rocas, bajos, restingas, bancos, naufragios. Alimenta directamente las celdas intransitables del raster.

| Campo | Tipo | Obligatorio | Ejemplo |
|---|---|---|---|
| `nombre` | texto | sí | Bajo Cotopaxi |
| `tipo` | enum | sí | roca · bajo · restinga · banco · naufragio · escollo |
| `lat` | decimal | sí | -48.883000 |
| `lon` | decimal | sí | -74.367000 |
| `sonda_m` | decimal | si figura | 4.5 |
| `senalizado` | sí/no | si figura | sí |
| `pagina` | entero | sí | 251 |

Este dataset es el de mayor impacto inmediato: OSM aporta **37 peligros en toda la zona austral**, que es pobreza de datos, no ausencia de peligros.

### 2.3 `sondas_canal.csv`

Profundidades del eje navegable, para la capa de confianza batimétrica.

| Campo | Tipo | Obligatorio |
|---|---|---|
| `canal` | texto | sí |
| `tramo` | texto | sí |
| `lat` | decimal | sí |
| `lon` | decimal | sí |
| `sonda_m` | decimal | sí |
| `pagina` | entero | sí |

Un punto por cada sonda mencionada en el eje del canal. No hace falta densidad: cada sonda documentada convierte su entorno de tramo ROJO a VERDE.

### 2.4 `ayudas.csv`

Faros, balizas, boyas y enfilaciones. **No son peligros** — sirven para dos cosas: definir dónde está el eje navegable real de un canal, y anclar posiciones de otros registros que el derrotero describe por referencia.

| Campo | Tipo | Obligatorio |
|---|---|---|
| `nombre` | texto | sí |
| `tipo` | enum | faro · baliza luminosa · baliza ciega · boya · enfilación |
| `lat` | decimal | sí |
| `lon` | decimal | sí |
| `pagina` | entero | sí |

> **Este tomo no contiene la Lista de Faros.** Unas 150 páginas remiten a esa publicación aparte para las características lumínicas. De acá salen **nombre, posición y tipo**, que es todo lo que el modelo necesita. No perseguir color de luz, período ni alcance.

### 2.5 `corrientes.csv` — oportunista, tabla ya estructurada

Detectado en Etapa A: hay tablas de mareas y corrientes por localidad que `extract_tables()` levanta limpias. **El costo marginal de extraerlas es casi nulo** y habilitan una capa de costo que estaba anotada como mejora futura — Canal Chacao corre a 8–9 nudos y eso decide si un viaje es viable.

| Campo | Tipo | Obligatorio |
|---|---|---|
| `localidad` | texto | sí |
| `lat` | decimal | sí, si se puede anclar |
| `lon` | decimal | sí, si se puede anclar |
| `establecimiento_puerto` | texto | no |
| `rango_sicigias_m` | decimal | no |
| `velocidad_max_kt` | decimal | no |
| `pagina` | entero | sí |

### 2.6 `areas.csv` — oportunista, tabla ya estructurada

Polígonos de áreas protegidas y santuarios, con vértices numerados y coordenadas. Mismo argumento: la tabla ya está estructurada.

| Campo | Tipo | Obligatorio |
|---|---|---|
| `nombre` | texto | sí |
| `tipo` | texto | sí |
| `vertice_n` | entero | sí |
| `lat` | decimal | sí |
| `lon` | decimal | sí |
| `pagina` | entero | sí |

Un registro por vértice. Alimenta las alertas de bioseguridad de P4 y, eventualmente, zonas de exclusión normativa.

---

## 3. Qué NO extraer

- Párrafos, descripciones de paisaje, instrucciones de maniobra redactadas
- Historia, toponimia, referencias culturales
- Información de puertos que no sea posición y sonda
- Cualquier cosa que no tenga o no se pueda anclar a una coordenada

---

## 4. Método

**Confirmado en Etapa A: el PDF tiene capa de texto.** La extracción es por script, no manual. No hace falta OCR ni transcripción externa.

**Nunca leer el PDF completo en contexto.** 623 páginas no entran. Todo pasa por scripts que procesan y escriben a disco; solo se revisan muestras.

Herramienta: `pdfplumber`. `extract_text()` para la prosa, `extract_tables()` para las tablas de mareas y de vértices, que salen limpias.

**Volumen esperado para Prioridad 1:** del orden de 40–80 pasos, 150–400 peligros, 200–600 sondas y 100–300 ayudas. Estimación gruesa; el primer canal procesado la ajusta.

---

## 5. Entrega

Los archivos CSV con codificación **UTF-8**, separador coma, encabezado en la primera fila, exactamente los nombres de campo de este documento.

Cuatro obligatorios: `pasos.csv`, `peligros.csv`, `sondas_canal.csv`, `ayudas.csv`.
Dos oportunistas: `corrientes.csv`, `areas.csv`.

Un quinto archivo `fuente.txt` con: título exacto de la publicación, número de edición, año, y los tomos y rangos de página cubiertos. Necesario para la trazabilidad de cada dato y para la revisión legal.

---

## 6. Qué habilita cada dataset

| Dataset | Efecto en el modelo |
|---|---|
| `pasos.csv` | Calibra el margen mínimo con dato real en vez de criterio. Resuelve el problema abierto de §6.1 del spec del router |
| `peligros.csv` | Multiplica por diez la cobertura de peligros respecto de OSM. Celdas intransitables reales |
| `sondas_canal.csv` | Convierte tramos de confianza ROJO a VERDE. Hoy `AUSTRAL_N` está 100% en rojo |
| `ayudas.csv` | Define el eje navegable de canales y ancla posiciones descritas por referencia |
| `corrientes.csv` | Habilita la capa de corrientes de marea como costo. Chacao a 8–9 nudos decide viabilidad de viaje |
| `areas.csv` | Alerta de bioseguridad en P4 y zonas de exclusión normativa |

---

## 7. Nota legal

Los datos —sondas, coordenadas, anchos— son hechos y no están protegidos por derecho de autor. La compilación y la redacción del derrotero sí pueden estarlo.

Por eso esta especificación extrae valores y posiciones, y excluye explícitamente la prosa. El campo `restriccion` es la única excepción y se limita a resúmenes de pocas palabras.

**Conviene que el abogado que revise los T&C pendientes valide también este uso** antes de que los datos entren a producción.

---

*MisilUp SpA · Puerto Montt · Documento de trabajo interno*
