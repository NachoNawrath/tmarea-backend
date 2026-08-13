# Consulta a DIRECTEMAR — tres casos del sondeo de catálogo

Fecha: 2026-08-12
Origen: cierre del sondeo de catálogo (`sondeo_catalogo_cierre_2026-08-12.txt`)
Estado: **REDACTADA, NO ENVIADA.** El envío es del owner.

> **NOTA AGREGADA EL 2026-08-13 — este archivo ya no es el que se envía.**
> Nada de lo de abajo se reescribe (CLAUDE.md §3.3): queda como constancia de
> cómo se redactaron los tres primeros casos. El owner decidió el 2026-08-13 que
> la consulta sea **una sola y al final de la construcción**, así que los casos
> se acumulan en **`_bitacoras/consulta_directemar_registro.md`**, que es el
> archivo vivo. Los tres de acá ya están allá, con la evidencia nueva del
> 2026-08-13 sumada al Caso 1 (`resolver(146)` devuelve `null`, y SITPORT cuelga
> el sector nuevo del río Bueno de la repartición 188 y no de la 189).

---

## Dónde vive la consulta, y por qué estos tres van aparte

La consulta a DIRECTEMAR sobre **jurisdicción** ya existe y **no vive en este
archivo**: vive dentro de `data/decreto/join_bahia_jurisdiccion.json`, en el
campo `fuente_a_consultar` de cada una de las seis bahías sin resolver, y el
validador de `src/services/join-bahia-jurisdiccion.js` se detiene si a alguna le
falta la pregunta redactada. Ese es el lugar canónico y **no se toca acá**: el
join se compone con `scripts/e03join_construir_join.js` y nunca se edita a mano.

Los tres casos de abajo se redactan aparte porque **ninguno cabe en esa
estructura**:

| caso | por qué no va al join |
|---|---|
| 146 RIO BUENO | El join la tiene **resuelta** (`lago_ranco`, respaldo `decreto`). La pregunta no es de jurisdicción sino de si la repartición sigue operativa. Meterla ahí reabriría una entrada cerrada. |
| 137 BAHÍA CHILOTA | Su pregunta de jurisdicción **ya está** en el join (`solape_delgada_tdf`). Acá sólo se agrega la evidencia nueva que el sondeo aportó, sin duplicar ni modificar la pregunta. |
| Rada Covadonga (CdRep 291) | No es una bahía. No tiene entrada en el join ni puede tenerla. |

Si el owner decide que alguna de éstas debe quedar registrada dentro del join,
eso es un cambio de dato: se hace por el constructor, no por edición, y queda
fuera de esta tarea de documentación.

---

## Caso 1 — Bahía 146, RIO BUENO: repartición 189 sin ficha de Capitanía

**Qué está medido**

- El D.S. 991/1987 resuelve la jurisdicción y no hay duda: el párrafo de Lago
  Ranco dice *"Lagos Ranco, Maihue, Puyehue (hasta el límite con la Región de Los
  Lagos), Huishue y Gris. Incluye el río Bueno en los sectores Los Patos, La
  Goleta y El Manzanito"*. El join la tiene resuelta con respaldo `decreto`.
- SITPORT, en `consultaBahias`, le asigna a la bahía 146 la repartición
  **CdRep 189**.
- Pero **CdRep 189 no figura entre las 64 Capitanías** que devuelve el propio
  endpoint de catálogo de SITPORT (`consultaCapuertoRestriccion`), y por eso el
  nombre de su Capitanía sale nulo. Tampoco aparece en
  `capitanias_64_final.csv`, que se construyó desde las fichas de DIRECTEMAR.
- Es la misma clase de divergencia interna que el control de drift de E0.1 ya
  tiene declarada para el id 108: **SITPORT publica dato de una repartición que
  su propio catálogo no lista.**

**Qué NO se pregunta:** de quién es la jurisdicción. Eso lo da el decreto y está
cerrado. Preguntarlo invitaría a que una respuesta operativa contradiga al
decreto, que es lo que INV-3.3 prohíbe.

**Pregunta**

> En el sistema SITPORT, la bahía 146 (RIO BUENO) aparece asociada a la
> repartición con código 189, pero ese código no figura en el listado de
> Capitanías de Puerto que entrega el propio sistema, ni tiene ficha publicada en
> DIRECTEMAR.
>
> 1. ¿La repartición 189 sigue operativa?
> 2. Si sigue operativa, ¿cuál es su denominación actual y de qué Gobernación
>    Marítima depende?
> 3. Si fue suprimida o fusionada, ¿qué repartición atiende hoy el sector del río
>    Bueno (Los Patos, La Goleta, El Manzanito)?

---

## Caso 2 — Bahía 137, BAHÍA CHILOTA: la única donde las dos fuentes operativas discrepan entre sí

**Qué está medido**

- Es el **único caso de las 164** donde el mapa operativo y SITPORT se
  contradicen entre ellos, no contra el decreto:
  - `bahia-capitania-map.json` → **Punta Arenas**
  - SITPORT (CdRep 254) → **TIERRA DEL FUEGO**
- Coincide exactamente con el solapamiento de párrafos que E0.3 dejó abierto y
  que ya está registrado en el join bajo `solape_delgada_tdf`: los párrafos de
  `punta_delgada` (*"el Estrecho de Magallanes"* al Oriente de la línea Punta
  Harry–Cabo San Vicente) y de `tierra_del_fuego` (*"el área oriental"* de la
  línea Cabo San Vicente–Punta Anxius) cubren ambos la zona al Oriente de Cabo
  San Vicente, y el decreto no dice cómo se reparten.
- Medido en E0.3: la bahía está a 230 m de esa línea.

**Lo que esto agrega a la pregunta que ya está en el join:** que la ambigüedad
del texto **se refleja en las fuentes operativas**. No es una laguna sólo de
lectura: las dos fuentes que atienden la zona la resuelven distinto entre sí.
Refuerza que la respuesta tiene que venir de DIRECTEMAR y no de elegir una de las
dos fuentes.

**Pregunta** (complementa, no reemplaza, la de `solape_delgada_tdf`)

> En el D.S. 991/1987, las descripciones de la Capitanía de Puerto Punta Delgada
> y de la Capitanía de Puerto Tierra del Fuego cubren ambas la zona al Oriente de
> Cabo San Vicente, sin que el decreto indique cómo se reparten.
>
> Registramos además que las fuentes operativas discrepan entre sí sobre este
> punto: el directorio de contacto atribuye Bahía Chilota (Porvenir) a Punta
> Arenas, mientras SITPORT la asocia a la repartición de Tierra del Fuego.
>
> 1. ¿Bajo cuál de las dos Capitanías queda Bahía Chilota?
> 2. ¿Cómo se reparten esas dos jurisdicciones la zona al Oriente de Cabo San
>    Vicente?

---

## Caso 3 — Rada Covadonga (CdRep 291): las dos fuentes la clasifican distinto

**Qué está medido**

- SITPORT la publica como **Capitanía**: `consultaCapuertoRestriccion` devuelve
  `"CAPITANÍA DE PUERTO RADA COVADONGA"`, sigla `CAPUERTO ONGA`, CDZona 5,
  CDRepPersonal 3817.
- DIRECTEMAR la clasifica como **Alcaldía de Mar**, dependiente de la Gobernación
  Marítima Antártica Chilena, con ficha vacía: sin capitán, sin dirección y sin
  teléfono.
- Tiene **0 bahías asociadas** en SITPORT y 0 restricciones.
- En `capitanias_64_final.csv` es la única de las 64 filas con gobernación,
  región, teléfono, dirección y jefe todos vacíos.
- Su estado operativo **no está verificado** y no se puede verificar desde el
  repositorio.

**Por qué importa aunque no tenga bahías:** si en algún momento SITPORT le
publica una restricción, entraría al motor como Capitanía sin contacto. Hoy la
regla del owner cubre el hueco —*"Sin información de contacto disponible.
Comunicar por radio."*— pero la regla tapa el síntoma, no resuelve qué es esta
repartición.

**Pregunta**

> La repartición con código 291, Rada Covadonga, aparece en SITPORT como
> Capitanía de Puerto, mientras que en el sitio de DIRECTEMAR figura como Alcaldía
> de Mar dependiente de la Gobernación Marítima Antártica Chilena, con ficha sin
> datos de contacto.
>
> 1. ¿Cuál es su calidad actual: Capitanía de Puerto o Alcaldía de Mar?
> 2. ¿Se encuentra operativa?
> 3. Si lo está, ¿cuál es su contacto y qué sector atiende?

---

## Registro

- Los tres casos salen de `_bitacoras/sondeo_catalogo_2026-08-12/` (sondeo del 2026-08-12) cruzado
  contra el join de E0.3. Medición completa en
  `sondeo_catalogo_cierre_2026-08-12.txt` §3 y §6.
- Ninguno de los tres cambia una jurisdicción: 146 está resuelta por decreto, 137
  ya estaba abierta, y 291 no tiene bahías.
- **Las seis preguntas de jurisdicción de E0.3 siguen donde estaban**, dentro del
  join, y se responden todas juntas por decisión del owner. Esta consulta no las
  altera ni las adelanta.
