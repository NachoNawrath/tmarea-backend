# Tmarea — Especificación de extracción del Derrotero SHOA

**Versión:** 2.0 — la unidad de extracción pasa de punto a tramo nombrado (hallazgo del piloto Canal Chacao)
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

> **La unidad de extracción es el TRAMO NOMBRADO, no el punto.**

**Hallazgo de la Etapa B (piloto Canal Chacao, pp. 141–173):** los peligros y pasos **no tienen coordenada propia en el derrotero**. Se posicionan relacionalmente — *"se encuentra al SW y a 3,5 millas de la punta Ahuenco"* — y los puntos ancla de esas cadenas tampoco la tienen. De 19 candidatos de peligro/paso en la sección, **cero** eran extraíbles por coordenada.

No es un defecto del extractor: **un derrotero está escrito para usarse con la carta náutica al lado**. El navegante ubica la punta en la carta y mide desde ahí; la coordenada absoluta sería redundante.

### Por qué no se resuelve con rumbo + distancia

Se evaluó y se descartó. Análisis de error para un peligro a 3,5 millas de su ancla:

| Fuente | Magnitud |
|---|---|
| Semilla (bahías marcadas "aprox.", mediana medida contra OSM) | ±1.000 m |
| Rumbo cardinal de 16 puntos (±11,25°) | ±1.265 m |
| Distancia declarada (±0,05 millas) | ±93 m |
| **Combinado** | **≈1.600 m = 32 celdas** |

Y las cadenas son de varios saltos, con error acumulativo. **Un peligro con 1,6 km de incertidumbre es peor que no tenerlo**: marca intransitable una zona que puede estar limpia y deja limpia la zona donde está la roca.

### Qué sí tiene coordenada directa

Bahías, caletas, radas y puertos, con el patrón `Nombre.- Carta N° X. Lat… Long… (aprox.)`. Unas 69 en el tomo completo. Sirven como **puntos ancla y referencia**, no como dato de seguridad — el "(aprox.)" es literal: mediana de 1.097 m de diferencia contra OSM, con rumbos distribuidos en todo el círculo, o sea ruido de centroide y no sesgo sistemático.

### Consecuencia sobre el esquema

`pasos.csv` **no lleva coordenadas**. Se une **por nombre de canal** a geometría que ya existe en el proyecto: los trazados propios de `red_nautica_chile_completa.geojson`, Canal Tenglo en `tmarea_nodos_nauticos_v1.json`, y la red OSM.

`peligros.csv` **no alimenta el raster**. Pasa a ser texto de advertencia por tramo.

---

## 0.2 Nota sobre el datum

No hay datum global declarado para el tomo. Verificado sobre las 623 páginas:

- **PSAD56: cero ocurrencias.** El escenario de 200–350 m de desplazamiento no aplica
- **SAD-69: 4 ocurrencias**, tres en front matter y una en el cuerpo (p. 158, Reserva Ostrícola Pullinque). Shift medido contra WGS84: **79 m**
- **WGS-84 / SIRGAS explícito:** 5 tablas en el cuerpo

**Las tablas de vértices se autoetiquetan**, cada una con su datum impreso justo antes. Es parseable y afecta solo a `areas.csv`, que debe transformar según la etiqueta.

Para la prosa se asume WGS-84, **documentado como supuesto no verificado**. El intento de validación empírica (emparejar bahías contra OSM) tiene ruido de ±1.100 m, un orden de magnitud sobre el shift SAD69 de 79 m: descarta un error a escala PSAD56, no un residuo chico. Riesgo acotado, no eliminado.

---

## 0.3 Regla de posición (aplica a los datasets que sí la llevan)

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

### 2.1 `pasos.csv` — el que resuelve el problema del margen

Un registro por paso, angostura o canal nombrado. **Sin coordenadas**: se une por nombre a geometría existente.

| Campo | Tipo | Obligatorio | Ejemplo |
|---|---|---|---|
| `nombre` | texto | sí | Angostura Inglesa – paso isla Medio-Canal |
| `canal` | texto | sí | Canal Messier |
| `geometria_ref` | texto | sí | id o nombre en `red_nautica_chile_completa.geojson`, o `SIN_GEOMETRIA` |
| `ancho_util_m` | entero | si figura | 185 |
| `sonda_minima_m` | decimal | si figura | 12.5 |
| `calado_max_m` | decimal | si figura | 10.7 |
| `eslora_max_m` | entero | si figura | 180 |
| `corriente_max_kt` | decimal | si figura | 6.0 |
| `restriccion` | texto corto | no | solo en estoa |
| `pagina` | entero | sí | 247 |

**Este es el dataset que justifica todo el esfuerzo.** `ancho_util_m` y `sonda_minima_m` son los valores que calibran el margen mínimo del router, hoy sin respaldo.

**Sobre `ancho_util_m`:** el derrotero lo expresa en cables. **1 cable = 185,2 m.**

**`geometria_ref` = `SIN_GEOMETRIA`** es válido y útil: indica un paso documentado cuya geometría todavía no está en el proyecto. Es la lista de qué vale digitalizar, derivada de dato en vez de intuición.

### 2.2 `peligros.csv` — advertencia textual, no geometría

Rocas, bajos, restingas, bancos y naufragios mencionados en el derrotero. **No alimentan el raster** — sin coordenada fiable no se pueden convertir en celdas intransitables (ver §0.1).

Su destino es el texto de advertencia del tramo: *"en este sector el derrotero menciona Bajo Lar, Rocas Guapacho y Banco Inglés — consulte carta N° 7320"*.

| Campo | Tipo | Obligatorio | Ejemplo |
|---|---|---|---|
| `nombre` | texto | sí | Bajo Lar |
| `tipo` | enum | sí | roca · bajo · restinga · banco · naufragio · escollo |
| `canal` | texto | sí | Canal Chacao |
| `carta_ref` | texto | si figura | 7320 |
| `sonda_m` | decimal | si figura | 4.5 |
| `senalizado` | sí/no | si figura | sí |
| `pagina` | entero | sí | 160 |

Es honesto y útil: le dice al patrón qué hay en el sector y a qué carta ir, sin fingir una precisión que el derrotero no da.

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
| `pasos.csv` | **Objetivo principal.** Calibra el margen mínimo con dato real. Resuelve el problema abierto de §6.1 del spec del router |
| `peligros.csv` | Advertencia textual por tramo con referencia de carta. **No** celdas intransitables |
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
