# REGISTRO ACUMULATIVO — lo que hay que preguntarle a DIRECTEMAR

**Estado: ABIERTO. NO SE ENVÍA TODAVÍA.**
**Se cierra y se envía cuando la construcción termine** — decisión del owner,
2026-08-13. Una sola consulta al final, no tres parciales.

Creado: 2026-08-13 · Última entrada agregada: 2026-08-13

---

## Cómo se usa este archivo

- **Acumula.** Cada caso nuevo que aparezca durante la construcción se agrega
  acá, con la misma estructura: **qué se pregunta · por qué se pregunta · qué se
  midió antes de preguntar**. No se reescriben las entradas viejas; si una queda
  superada, se le agrega la corrección al pie y se marca (CLAUDE.md §3.3).
- **El envío es del owner**, y es uno solo.
- **Ninguna pregunta de acá revoca al decreto.** Donde el D.S. 991 resuelve, la
  pregunta es operativa —si una repartición sigue viva, qué coordenada tiene un
  punto, quién atiende en la práctica— nunca *de quién es la jurisdicción*. Es
  INV-3.3: una respuesta operativa no puede contradecir al decreto, y preguntar
  mal invitaría exactamente a eso.
- **Antecedente:** `_bitacoras/sondeo_catalogo_consulta_directemar_2026-08-12.md`
  redactó los tres primeros casos. Ese archivo queda como constancia de cómo se
  redactaron; **este registro es el que se envía.**

### Dónde vive cada pregunta, que no es lo mismo que dónde se manda

Las **seis bahías sin resolver de E0.3** tienen su pregunta redactada **dentro de
`data/decreto/join_bahia_jurisdiccion.json`**, en el campo `fuente_a_consultar`, y
el validador de `src/services/join-bahia-jurisdiccion.js` detiene la carga si a
alguna le falta. **Ese archivo es la autoridad y no se edita a mano** — se compone
con `scripts/e03join_construir_join.js`.

Lo que está acá abajo (entrada 5) es un **espejo** de esas seis, transcrito el
2026-08-13 para que la consulta se pueda leer entera de un tirón. **Antes de
enviar hay que releerlas del join**, no de acá: si el join cambió, manda el join.

---

## 1 · Bahía 146 — RÍO BUENO: la repartición 189 no existe en el propio SITPORT

**Qué se pregunta**

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

**Por qué se pregunta.** No es de jurisdicción: el decreto la resuelve y el join
la tiene cerrada con respaldo `decreto` — el párrafo de Lago Ranco dice *"Incluye
el río Bueno en los sectores Los Patos, La Goleta y El Manzanito"*. Se pregunta
porque una repartición que la propia fuente no lista deja al motor **sin poder
nombrar la Capitanía** de esa bahía.

**Qué se midió antes de preguntar**

- `consultaBahias` le da a la 146 el `CdReparticion 189`.
- La 189 **no está** entre las 64 reparticiones de `consultaCapuertoRestriccion`
  ni entre las 64 de `Totalgeneral` (medido el 2026-08-13; la 188, en cambio, sí
  está en las dos).
- Tampoco está en `capitanias_64_final.csv`, construido desde las fichas de
  DIRECTEMAR.
- **Consecuencia medida en el código, agregada el 2026-08-13:**
  `construirResolutorCapitania` arma su tabla desde
  `consultaCapuertoRestriccion`, así que **`resolver(146)` devuelve `null`**.
  De ahí se sigue que una ruta que matchee la 146 **no aporta ninguna repartición
  a `repsEnRuta`**, y una bahía desconocida de esa misma Capitanía no recibiría
  su aviso de A3 por esa vía. No es teoría: es la corrida de
  `_bitacoras/e01_drift_258_2026-08-13/05_resolver.txt`.
- **Evidencia nueva y fuerte, del 2026-08-13:** SITPORT acaba de agregar a su
  catálogo la bahía **258, "RÍO BUENO, SECTOR LLANCACURA"**, y **no la colgó de
  la 189 sino de la 188 (Capitanía de Puerto Lago Ranco)**, la misma de las
  bahías 144 y 145. O sea que la propia fuente, al publicar un sector nuevo del
  mismo río, usa otra repartición. Es consistente con que la 189 esté superada,
  y es exactamente lo que la pregunta 3 busca confirmar.

---

## 2 · Bahía 137 — BAHÍA CHILOTA: las dos fuentes operativas discrepan entre sí

**Qué se pregunta** (es también una de las seis de E0.3 — ver entrada 5; acá va
con la evidencia operativa que el join no lleva)

> En el D.S. 991/1987, las descripciones de la Capitanía de Puerto Punta Delgada
> y de la Capitanía de Puerto Tierra del Fuego cubren ambas la zona al Oriente de
> Cabo San Vicente, sin que el decreto indique cómo se reparten.
>
> Registramos además que las fuentes operativas discrepan entre sí: el directorio
> de contacto atribuye Bahía Chilota (Porvenir) a Punta Arenas, mientras SITPORT
> la asocia a la repartición de Tierra del Fuego.
>
> 1. ¿Bajo cuál de las dos Capitanías queda Bahía Chilota?
> 2. ¿Cómo se reparten esas dos jurisdicciones la zona al Oriente de Cabo San
>    Vicente?

**Por qué se pregunta.** Es el **único caso de las 164** donde el mapa operativo y
SITPORT se contradicen **entre ellos**, no contra el decreto. La ambigüedad del
texto se refleja en las dos fuentes que atienden la zona, así que elegir una de
las dos sería elegir sin fundamento.

**Qué se midió antes de preguntar**

- `bahia-capitania-map.json` → **Punta Arenas**; SITPORT (CdRep 254) → **TIERRA
  DEL FUEGO**.
- La bahía está a **230 m** de la línea Cabo San Vicente – Punta Anxious (E0.3).
- **Evidencia del frente de resoluciones locales, agregada el 2026-08-13.** La
  práctica publicada apunta en una sola dirección:
  - **CP Tierra del Fuego tiene 12 resoluciones distintas** en el índice de
    Resoluciones Locales, y las que nombran el sector son sobre **Porvenir y
    Bahía Chilota**: condiciones de puerto y límites de operación del puerto de
    Porvenir (12000/120), resolución de operación de **Bahía Chilota**
    (12600/012), navegación del canalizo de acceso a Porvenir (12000/73), puntos
    de fondeo en el puerto de Porvenir (12000/78).
  - **CP Punta Delgada tiene 1 documento** en el índice —un Plan Subsidiario de
    Mal Tiempo (12000/30)— y **ninguno menciona Porvenir**.
  - **CP Tierra del Fuego Ord. 12000/120 §3** pone además **Bahía Gente Grande y
    Bahía Inútil** bajo su propia disposición *"hasta que no se emita una
    disposición exclusiva para dichos sectores"*.
  - **Lo que no se reprodujo, dicho en vez de tapado:** el owner citó *"diez
    resoluciones de Tierra del Fuego sobre Porvenir contra cero de Punta
    Delgada"*. Mi conteo propio sobre `salida_recon.txt` da **12 identificadores
    únicos de CP Tierra del Fuego** y **1 de Punta Delgada**, y no separa
    "sobre Porvenir" con el mismo criterio que el owner usó. **La asimetría
    queda medida y el número 10 no queda reproducido.**
- **Esto es evidencia de práctica, no coordenada**: sostiene el ancla, no la
  elige, y no revoca al decreto.

---

## 3 · Rada Covadonga (CdRep 291) — las dos fuentes la clasifican distinto

**Qué se pregunta**

> La repartición con código 291, Rada Covadonga, aparece en SITPORT como
> Capitanía de Puerto, mientras que en el sitio de DIRECTEMAR figura como
> Alcaldía de Mar dependiente de la Gobernación Marítima Antártica Chilena, con
> ficha sin datos de contacto.
>
> 1. ¿Cuál es su calidad actual: Capitanía de Puerto o Alcaldía de Mar?
> 2. ¿Se encuentra operativa?
> 3. Si lo está, ¿cuál es su contacto y qué sector atiende?

**Por qué se pregunta.** Si algún día SITPORT le publica una restricción, entraría
al motor como Capitanía sin contacto. La regla del owner cubre el hueco —*"Sin
información de contacto disponible. Comunicar por radio."*— pero tapa el síntoma
sin resolver qué es esta repartición. Además pesa sobre D9: es una de las cuatro
jurisdicciones del ámbito antártico, y su estado es uno de los dos motivos por los
que ese ámbito no está habilitado para publicar.

**Qué se midió antes de preguntar**

- SITPORT: `consultaCapuertoRestriccion` devuelve *"CAPITANÍA DE PUERTO RADA
  COVADONGA"*, sigla `CAPUERTO ONGA`, CDZona 5, CDRepPersonal 3817.
- DIRECTEMAR: Alcaldía de Mar, ficha vacía — sin capitán, sin dirección, sin
  teléfono.
- **0 bahías atribuidas** en SITPORT y 0 restricciones. Es una de las **dos**
  únicas jurisdicciones a las que SITPORT no le cuelga ninguna bahía (E0.3).
- Es una de las **tres Capitanías sin página** en el índice de Resoluciones
  Locales (`recon_resoluciones_locales_2026-08-12.txt`), junto con `papudo` y
  `bahia_paraiso`.
- Única de las 64 filas de `capitanias_64_final.csv` con gobernación, región,
  teléfono, dirección y jefe **todos vacíos**.

---

## 4 · Bahía 258 — RÍO BUENO, SECTOR LLANCACURA: apareció sin posición

**Qué se pregunta**

> En agosto de 2026 apareció en el catálogo de SITPORT (`consultaBahias`) la
> bahía 258, "RÍO BUENO, SECTOR LLANCACURA", asociada a la repartición 188
> (Capitanía de Puerto Lago Ranco). El registro no incluye posición geográfica, y
> ninguno de los endpoints consultados la entrega.
>
> 1. ¿Cuáles son las coordenadas del sector Llancacura del río Bueno?
> 2. ¿Qué extensión del río comprende ese sector — entre qué puntos?
> 3. El D.S. 991/1987 nombra para la Capitanía de Puerto Lago Ranco los sectores
>    Los Patos, La Goleta y El Manzanito del río Bueno. ¿Llancacura es uno de
>    esos sectores bajo otra denominación, o es un sector distinto?

**Por qué se pregunta.** Sin coordenada, la bahía no se puede incorporar al
catálogo interno: el motor la descartaría igual, y rellenarle una posición desde
otra fuente sería fabricar dato (INV-0.2). Es el **precedente de la 257**, que
sigue sin resolverse por lo mismo. La pregunta 3 es la que importa para la capa:
si Llancacura no es ninguno de los tres sectores del decreto, el catálogo
operativo de SITPORT está describiendo un tramo del río que el decreto no nombra.

**Qué se midió antes de preguntar**

- Apareció **entre el 2026-08-12T21:23:50Z y el 2026-08-13T15:44Z**. Tres
  capturas versionadas de `consultaBahias` —dos del 2026-08-11 y la del sondeo
  del 2026-08-12— tienen **164 ids, máximo 257, sin 258**; la corrida del control
  de drift del 2026-08-12 midió universo 165 contra 166 de hoy. El control lista
  toda divergencia, así que su ausencia ahí es prueba de ausencia.
- Está **sólo en `consultaBahias`**: no en `consultaRestricciones` ni en
  `totalPronostico`. `color: "default"`, `valor: 0`.
- **`consultaBahias` no trae posición** — sus campos son `IDBahia`,
  `CdReparticion`, `NMBahia`, `color`, `valor`, `Nom`.
- La palabra "Llancacura" **no aparece en el insumo del decreto**. Los tres
  sectores que el decreto nombra son Los Patos, La Goleta y El Manzanito.
- Ninguno de los cuatro puntos —los tres del decreto y el toponimo Llancacura de
  nuestro propio dato náutico— **cae dentro de la figura de `lago_ranco`**: 81,3
  / 88,6 / 94,5 y 72,1 km fuera. El río Bueno está `rechazado` sin geometría en
  `cotejo_lacustre_adjudicado.json`.
- **Decisión del owner del 2026-08-13 (D14): la divergencia NO se declara y NO se
  le rellena coordenada** desde `puertos_chile_nacional.json` ni de ninguna otra
  fuente. Queda abierta hasta que DIRECTEMAR responda.
- Medición completa: `_bitacoras/e01_drift_258_2026-08-13.txt`.

---

## 5 · Las seis bahías sin resolver de E0.3

**El original manda: `data/decreto/join_bahia_jurisdiccion.json`, campo
`fuente_a_consultar`.** Esto es un espejo del 2026-08-13. Se responden **todas
juntas**, por decisión del owner, y están agrupadas por fuente y no por
geografía.

### 5.a — Bahías 127 (BAKER), 129 (PUERTO EDÉN) y 154 (ISLA GUARELLO)

> ¿Cuáles son las coordenadas del límite Sur de la jurisdicción de la Gobernación
> Marítima de Aysén, que el D.S. 991/1987 usa como límite Norte de la Capitanía
> de Puerto Puerto Edén sin expresarlo en coordenadas? ¿Coincide ese límite con
> el límite Sur de la Región de Aysén, que el mismo decreto usa como límite Sur
> de la Capitanía de Puerto Baker?

**Qué se midió:** el decreto define `baker` por *"el límite Sur de la Región de
Aysén"* y `puerto_eden` por *"el límite Sur de la Gobernación Marítima de
Aisén"*. Ninguno de los dos está en coordenadas, **y no está dicho que
coincidan**. La parte regional puede salir de `DPA_2023` (en disco, sin cargar);
la de la Gobernación Marítima sólo de DIRECTEMAR.

### 5.b — Bahía 137 (BAHÍA CHILOTA)

Es la misma de la entrada 2, con su evidencia operativa. En el join está bajo
`solape_delgada_tdf`.

### 5.c — Bahías 239 y 241 (canales Ferronave, Devia, Goñi y Ninualac)

> En la práctica, ¿quién atiende los canales Ferronave, Devia, Goñi y Ninualac —
> la Capitanía de Puerto Cisnes o la de Puerto Aguirre? ¿Dónde entiende la gente
> que navega ahí que está el límite entre las dos, al Weste de la línea Islote
> Cayo Blanco – Punta San Andrés? ¿Hay algún caso en que una de las dos haya
> dictado una restricción para esos canales?

**Qué se midió:** las dos bahías caen **entre** los extremos de la línea Cayo
Blanco – Punta San Andrés – Puerto Pérez – Islote Rodríguez – Isla Traiguén, que
es la frontera declarada entre las dos Capitanías; el veredicto dependería de cómo
se prolongue el trazo hacia el Weste y **el decreto no lo escribe**. El mapa
operativo dice `Cisnes` y SITPORT dice `AGUIRRE`. Es además la misma pregunta que
decide la costura Weste de Puerto Aguirre, causa de uno de los pares de C3 que E4
tiene abiertos.

> **OJO, Y ES UNA OBJECIÓN, NO UN DETALLE.** El destinatario declarado de estas
> dos **no es DIRECTEMAR**: el join dice *"Informante con experiencia operativa en
> la zona austral"*, y la pregunta está redactada para eso — pregunta qué entiende
> **la gente que navega ahí**. Mandarla a DIRECTEMAR sin reformularla pide una
> respuesta normativa a una pregunta de práctica, y si vuelve con una línea
> dibujada estaríamos tomando por decreto algo que el decreto no dice. **Van al
> registro porque el owner pidió las seis, y se marcan acá para que al cerrar el
> archivo se decida si se reformulan o si salen por otro canal.**

---

## 6 · Bahía 160 — LAGO PUYEHUE: el decreto lo parte y la práctica no

**Qué se pregunta**

> El D.S. 991/1987 asigna a la Capitanía de Puerto Lago Ranco el lago Puyehue
> *"hasta el límite con la Región de Los Lagos"*, y el resto del lago a la
> Capitanía de Puerto Puerto Varas. En SITPORT, en cambio, el lago Puyehue figura
> como una sola bahía (ID 160) asociada íntegramente a la repartición 201
> (Capitanía de Puerto Puerto Varas).
>
> 1. En la práctica, ¿qué Capitanía atiende cada sector del lago Puyehue?
> 2. ¿Cuál de las dos publica la condición de puerto del lago, y para qué
>    extensión?
> 3. Cuando un cuerpo de agua queda repartido entre dos Capitanías por un límite
>    regional, ¿existe algún criterio o convención sobre cómo se reparte la
>    atención al usuario — por sector, por puerto de zarpe, o de otra forma?

**Por qué se pregunta, y por qué NO es una pregunta de jurisdicción.** El decreto
**ya contesta de quién es**: lo parte en el límite regional y lo dice con esas
palabras. Esta entrada no le pide a DIRECTEMAR que adjudique nada — sería
exactamente lo que la cabecera de este archivo prohíbe. Lo que pregunta es
**operativo**: quién atiende y quién publica, que es lo que el motor necesita para
decirle al patrón a quién llamar, y que el decreto no regula.

**Lo que NO se pregunta acá, dicho para que no se cuele:** la **georreferencia**
del límite regional Los Ríos / Los Lagos dentro del lago. Esa no es de DIRECTEMAR
— es `DPA_2023`, la misma capa que está en disco sin cargar y que la entrada 5.a
ya identifica como fuente para el límite regional de las bahías 127, 129 y 154.
Pedírsela a DIRECTEMAR invitaría a que respondan con una línea que el decreto no
dibuja, que es el modo de falla que este registro evita.

**Qué se midió antes de preguntar** — todo en
`_bitacoras/e3_medicion_160_2026-08-13.txt`:

- El insumo adjudica **el mismo `fid 1110`** —el lago entero, 155,642 km²— a
  `lago_ranco` **y** a `puerto_varas`, con el traslape declarado y su motivo:
  *"el shapefile trae un único polígono y el criterio de partición no está
  determinado. Se asigna entero a ambas: INV-3.4 fija que el motor muestra de más,
  nunca de menos."*
- En la capa publicada, del área compartida **0,000000 km² pertenece a una sola**
  jurisdicción. Un barrido de nueve puntos a lo ancho del lago resuelve a
  **las dos** en los nueve (uno cae en una isla).
- Es la **única** de las 164 entradas del join con `jurisdicciones_adicionales`.
- **SITPORT le da la repartición 201** —`PUERTO VARAS`, Gobernación Puerto Montt,
  Región de Los Lagos— igual que a las bahías 111, 159 y 161. Las bahías 144 y 145
  (Lago Ranco, Lago Maihue) llevan la **188** — `LAGO RANCO`, Gobernación Valdivia,
  Región de los Ríos. Capturas versionadas en
  `_bitacoras/sondeo_catalogo_2026-08-12/`.
- **Efecto medido hoy en el motor**: una ruta por el Puyehue devuelve las mismas
  **siete bahías de las dos Capitanías** se navegue en la mitad Oeste o en la Este;
  y la 160 se muestra como *"Lago Ranco"* con la gobernación y el teléfono de
  Puerto Varas — la única incoherente de las siete.
- **La 160 no tiene restricción publicada hoy** (`color: "default"`, `valor: 0`),
  así que esto es el camino del contacto, no un caso en pantalla.

---

## Registro de cambios de este archivo

| fecha | qué se agregó |
|---|---|
| 2026-08-13 | Creación. Entran los tres casos del sondeo (146, 137, Rada Covadonga) con la evidencia nueva de la 146 medida ese día; la 258; y el espejo de las seis de E0.3. |
| 2026-08-13 | Entrada **6**, el lago Puyehue: el decreto lo parte entre dos Capitanías y SITPORT lo publica entero bajo una. Se pregunta **quién atiende y quién publica**, no de quién es —eso lo contesta el decreto—, y se deja fuera a propósito la georreferencia del límite regional, que es de `DPA_2023` y no de DIRECTEMAR. |
