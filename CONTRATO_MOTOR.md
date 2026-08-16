# CONTRATO DEL MOTOR DE DECISIÓN — TMAREA

> **Este archivo es un contrato de ejecución, no documentación descriptiva.**
> Claude Code DEBE leer este archivo antes de modificar cualquier lógica del motor de
> decisión, del ruteo, de las locaciones o de los perfiles de usuario. Cada regla marcada
> como **INVARIANTE** no puede romperse. Después de cualquier cambio que toque una capa
> cubierta por este contrato, Claude Code DEBE ejecutar la **Verificación** asociada y
> reportar su resultado real (no asumido) antes de dar el trabajo por terminado.
>
> **Prohibición absoluta:** no reportar un test como aprobado sin haberlo ejecutado. No
> fabricar datos, números ni coordenadas para pasar una verificación. Si una verificación
> no se puede correr, decirlo explícitamente en vez de asumir que pasa.

Versión: 2.1
Última actualización: 2026-08-16
Cambios v2.1: **§5 y §5.1 decían cuatro cosas falsas sobre un archivo vivo, y ninguna llevaba
fecha.** Motivo: `bahia-capitania-map.json` cambió cuatro veces desde que se escribieron
—`85bc68a`, `df684d7`, `f3936b8`, `01bf543`— y nada ató esas afirmaciones a una medición, así que
envejecieron en silencio. Se corrigen con tachado (`CLAUDE.md` §3.3), **el texto original queda
visible**, y cada corrección lleva **fecha, commit e instrumento** para que la próxima vez
envejezca a la vista. Lo corregido: (1) *"los 164 teléfonos son de Gobernación, ninguno es de una
Capitanía"* → medido en `01bf543`, **73 de Capitanía · 56 de Gobernación · 35 que no distinguen
el nivel · 0 en ninguno · 0 nulos**, suma 164; (2) la fila **Contacto de Capitanía** de §5, que
decía que no existe fuente viva → **el teléfono sí existe** (108 de 164), la dirección no; (3)
*"se repite en promedio 11 veces"* → **4,8**; (4) *"los tres números desactualizados alimentan 41
de las 164"* → **0**, y el 41 contaba otra cosa. Se agrega además una precisión sobre la primera
viñeta: la entrada **127 (Baker)** trae `capitania: null`, declarada y con su motivo.
**NO cambia ningún INVARIANTE, ninguna Verificación, ni qué fuente está autorizada para qué
dato.** El bump es para que la corrección sea encontrable desde este changelog, que es lo que la
v1.9 ya hizo con una corrección de la misma sección; leerlo como cambio de regla sería leerlo mal.
Evidencia: `_bitacoras/contrato_51_telefonos_2026-08-16/`.
Cambios v2.0: **entra el DFL 292 como fuente normativa, y con él la regla de las Alcaldías de
Mar.** Motivo: el sistema venía aplicando un criterio que no estaba escrito en ninguna parte. Se
usó en la entrada 86 —`Guayacán`, que DIRECTEMAR lista como Alcaldía de Mar de la Capitanía de
Coquimbo y que quedó rotulada `Coquimbo`—, y una búsqueda del término sobre este archivo,
`CLAUDE.md`, `PLAN_JURISDICCION.md`, `_bitacoras/`, `src/` y `data/` dio **cero enunciados de la
regla**: 41 menciones, todas descriptivas y casi todas sobre la clasificación de Rada Covadonga.
Un criterio que decide qué Capitanía se le muestra al patrón y que sólo vive en la memoria de
quien lo aplicó es la misma clase de vacío que §3 bis abre describiendo para los límites, y se
cierra igual. **INV-3.3 suma un párrafo**: la Alcaldía de Mar **no es unidad de jurisdicción** y
resuelve a la Capitanía de la que depende, con su verificación propia. **No es invariante nuevo,
y es a propósito** — INV-3.3 ya fija cuál es la unidad, y esto es esa misma regla alcanzando un
nivel que no nombraba; partirla en dos habría dejado dos textos que pueden divergir. **FUENTES
suma el D.F.L. 292/1953**, que es lo que da la base: Art. 12 (el litoral se divide en
Gobernaciones Marítimas y éstas en Subdelegaciones Marítimas y Alcaldías de Mar), Art. 14, y
Art. 27 (los Alcaldes de Mar dependen de los Capitanes de Puerto). **El Art. 14 es el que más
importa y por eso se cita entero**: reparte los instrumentos —Presidente para Gobernaciones y
Subdelegaciones, Director General para las Alcaldías—, y de ahí se sigue que el D.S. 991,
decreto presidencial, **no puede** contener a las Alcaldías. No encontrarlas ahí no es un hueco
de nuestra capa: es el instrumento equivocado. **El texto se incorporó al repositorio ANTES de
citarlo**, en `data/decreto/fuente_dfl292/`, con PDF, texto extraído, sha256 y procedencia, por
el mismo camino que D6 usó para el Art. 2 del D.S. 991 — una cita que no se puede reproducir
desde el repositorio es lo que el preámbulo de este archivo prohíbe. Se declara de dónde salió:
BCN no entrega PDF por la URL de la norma, así que el archivo es la reproducción que publica
DIRECTEMAR del consolidado de BCN, versión 31-05-2002, contrastada contra una segunda
reproducción independiente. **Declarado y NO resuelto:** ningún control vivo vigila ese sha256
—al del D.S. 991 lo cubre B10 porque el insumo declara `cotejado_contra`, y contra el DFL 292 no
se coteja nada—; queda como quedó `fuente_resoluciones_locales/`, escrito en su `PROCEDENCIA.md`,
y la pregunta se reabre si ese hash llega a sostener una verificación automática. **Nada más de
la v1.9 cambia**: INV-10.1, §5, §10 y las dos filas PENDIENTE quedan como están.
Cambios v1.9: **corrección de la v1.8, misma fecha.** Al partir la fila de contacto de §5, la
v1.8 dejó fuera de la tabla a `bahia-capitania-map.json` — y ese archivo es el que alimenta
**todo** el contacto que hoy sale en pantalla: `sitport-routes.js` (:339, :465, :817) llama a
`getCapitaniaByBahiaId`, que lo lee. Durante unas horas el motor leyó contacto de un archivo
que §5 no declaraba, que es exactamente lo que §5 abre prohibiendo. Se corrige declarándolo
como **fuente transitoria** con su condición de retiro escrita, en vez de dejar el hueco
abierto. Se corrige además la fila de Contacto de Gobernación, que la v1.8 escribió mal:
decía que el dato vive hardcodeado en `src/utils/capitanias.js`, y la medición mostró que la
tabla del backend **no la consume nadie** — el valor que llega a pantalla sale del mapa. La
copia de la PWA sí se usa, sólo como fallback. Nada más de la v1.8 cambia: INV-10.1, el §10 y
las dos filas PENDIENTE quedan como están.
Cambios v1.8: **política de contacto** — decisión de producto del owner del 2026-08-13
(PLAN_JURISDICCION.md D15), motivada por una medición: el campo `telefono` de
`bahia-capitania-map.json` nunca contuvo el teléfono de una Capitanía, sino el de su
Gobernación, en las 164 entradas y sin excepción. La app venía rotulando como Capitanía un
número que es de la autoridad superior. Se fija: **el contacto se muestra sólo en el punto
de zarpe y recalada**, con la prelación Capitanía → Gobernación *rotulada como tal* → el
campo no se muestra; y **los mensajes del catálogo no llevan teléfono**, porque el patrón no
necesita que se le explique cómo contactar a su Capitanía. §10 pierde el `[tel]` en sus dos
filas que lo llevaban. §5 parte la fila de contacto en tres, porque mezclaba dos datos
distintos y afirmaba de uno lo que era cierto del otro: el contacto de Capitanía queda
declarado como **pendiente** en vez de declarado como OK sobre un archivo que no lo tiene.
**Las menciones a VHF Canal 16 del catálogo NO se tocan**: vienen de la norma citada
(D.L. 2222 Art. 27 y Art. 32), no son instrucción operativa nuestra.
Cambios v1.7: INV-3.6 cierra el hueco que dejaba abierto — mandaba informar la jurisdicción
sin límite cargado pero callaba sobre la severidad, así que cada implementación habría
elegido su bandera y el contrato no podría arbitrar. Se fija: escala a **U**, nunca a U+V.
La ausencia de dato no es una prohibición. Se agrega también la distinción entre las dos
causas de "no resuelve jurisdicción" — carencia declarada del mundo (a) contra hueco de
nuestra propia capa (b) —: al patrón se le dice lo mismo, internamente (b) queda registrado
como defecto, porque si no se separan los huecos de construcción se esconden detrás de un
mensaje que parece explicarlos. §10 suma su primera fila sin cita, con la excepción declarada
en el preámbulo.
**INV-1.1 NO se tocó**, y conviene registrar por qué para que no se vuelva a plantear: dice
"el MÁXIMO de severidad de TODAS las fuentes", no de dos. `banderaFinal = max(restricción,
deportivo)` es la implementación de hoy; agregar cobertura como tercera fuente es exactamente
lo que INV-1.1 ya describe. Lo que parecía un cambio de regla resultó ser el invariante
cumpliéndose.
Cambios v1.6: nueva §3 bis — RESOLUCIÓN DE JURISDICCIÓN. Se fija el D.S. 991/1987 como
fuente de los límites de Capitanía (INV-3.3), cerrando el vacío que permitía que el código
resolviera jurisdicción por aproximación geométrica mientras INV-3.1 ya decía "Capitanía".
La bahía pasa a ser etiqueta de origen de la restricción y no criterio de aplicación
(INV-3.4). Se incorporan las jurisdicciones lacustres como jurisdicciones plenas (INV-3.5).
Se prohíbe resolver en silencio una jurisdicción sin geometría — falso negativo silencioso
(INV-3.6). Se fija la trazabilidad del archivo fuente de límites (INV-3.7). §7 suma dos
bugs abiertos medidos en el reconocimiento del 09-AGO-2026.
Cambios v1.5: backlog ampliado — verificación de identidad login (RUT + nº licencia) como
control de acceso separado del motor; enriquecer visual de P4 con fuentes propias existentes
(peligros/fondeaderos del derrotero, restricciones SITPORT, ruta) con LÍMITE DURO de no
imitar carta náutica ni agregar balizamiento IALA (INV-0.1/INV-0.2).
Cambios v1.4: INV-4.7 ratificada — la eximición de matrícula (<5 m) se resuelve en el
formulario de captura, no en el motor: si eslora <5 m + propulsión manual/vela/motor <10 HP,
el formulario asigna clasificación = Bahía automáticamente, oculta el campo de clasificación
y avisa. El motor recibe siempre sus tres variables completas y queda intocado.
Cambios v1.3: §3 `restricciones-ruta` pasa de ROTO a RESUELTO — el diagnóstico descartó la
regresión (era falso positivo por rutas de prueba sin restricción activa); el endpoint quedó
endurecido (validación de entrada, aislamiento por bahía, 503 en SITPORT caído). Sincronizado
en §3, §6.1 y §7.
Cambios v1.2: INV-4.1 sincronizado con el hallazgo del 30-jul (validado contra Circular
A-41/014 y TM-002) — límite efectivo pasa a tres variables incorporando la degradación por
propulsión a vela sin motor auxiliar operativo (A-41/014 H.2); se fijan las clasificaciones
de nave registrables y el manejo de "Alta Mar" sin tope (representar como Infinity); se
aclara que la subclasificación 60/12 MN es input declarado por el patrón, no inferida
(A-41/014 C.6); nueva INV-4.7 para el perfil eximido de matrícula (<5 m, A-41/014 C.2).
Cambios v1.1: base normativa detallada con citas textuales; principio de doble capa
(§1.3); catálogo de mensajes normativos (§10); corrección del flujo deportivo (no requiere
despacho); umbrales AB marcados como jurisdiccionales; reglas de motos de agua y tabla de
arqueo por eslora.

---

## FUENTES NORMATIVAS DE REFERENCIA

Todas las citas de este contrato provienen de los siguientes cuerpos legales oficiales.
Claude Code NO debe inventar artículos ni citas: si una regla no está anclada a uno de
estos textos o a datos SITPORT reales, no se implementa como norma.

- **D.L. 2222/1978** — Ley de Navegación (última versión 19-NOV-2025). Referida como "LN".
- **D.S. 364/1980** — Reglamento de Recepción y Despacho de Naves (última versión
  17-MAR-2012). Referido como "RRDN".
- **TM-002 / D.S. 214/2015** — Reglamento General de Deportes Náuticos y Buceo Deportivo
  (cotejado BCN nov-2025). Referido como "RGDN".
- **Circular O-41/001** (26-OCT-2021) — Medidas para salvaguardar la vida humana en el mar
  ante condiciones de tiempo adversas. Referida como "CIRC O-41/001".
- **Circular A-41/014** (03-OCT-2019) — Normas generales para la construcción, inscripción y
  equipamiento de seguridad obligatorios para embarcaciones deportivas. Define la
  clasificación de nave (Alta Mar, Costera 60 MN, Costera 12 MN, Bahía). Referida como
  "CIRC A-41/014".
- **D.S. (M.) 991/1987** — Fija la jurisdicción de las Gobernaciones Marítimas de la
  República y establece las Capitanías de Puerto y sus respectivas jurisdicciones (texto
  consolidado vigente 12-NOV-2020, últ. mod. D.S. 391, D.O. 12.11.2020). Referido como
  "D.S. 991". Define 16 Gobernaciones Marítimas y 64 Capitanías de Puerto con límites
  expresados en paralelos, meridianos y poligonales de puntos notables.
- **D.F.L. 292/1953** — Ley Orgánica de la Dirección General del Territorio Marítimo y de
  Marina Mercante. Referido como "DFL 292". Ordena los niveles administrativos del litoral,
  que el D.S. 991 supone y no define: Art. 12 (el litoral se divide en Gobernaciones
  Marítimas, y éstas en Subdelegaciones Marítimas y Alcaldías de Mar); Art. 14 (las
  jurisdicciones de Gobernaciones y Subdelegaciones las fija el Presidente de la República,
  y el número de Alcaldías de Mar y sus jurisdicciones los fija el Director General);
  Art. 27 (los Alcaldes de Mar dependen de los Capitanes de Puerto y sus atribuciones son
  las que éstos les asignen). Texto consolidado vigente al 31-05-2002, **versionado en
  `data/decreto/fuente_dfl292/`** con su procedencia y su sha256.
- **Resoluciones locales de cada Capitanía** — implementan la CIRC O-41/001 en su
  jurisdicción. Definen umbrales de condición de tiempo y AB. NO son nacionales.

---

## 0. PRINCIPIOS RECTORES (aplican a todo el motor)

### INV-0.1 — La app es informativa; el patrón es el responsable legal
El motor entrega orientación para la decisión. NUNCA sustituye la autorización de la
Autoridad Marítima ni las cartas oficiales SHOA. Todo veredicto de ruta y toda predicción
llevan un descargo visible de que la información no reemplaza fuentes oficiales.
- **Base:** LN Art. 89 (el capitán es siempre responsable de la seguridad de la nave y su
  dotación); LN Art. 44 (armador/operador solidariamente responsables); RRDN Art. 36
  (el capitán "asegure que la nave está en condiciones... y se responsabilice de ello").

### INV-0.2 — No fabricar datos
Ningún valor mostrado al usuario (coordenada, restricción, temperatura, clorofila, marea,
distancia) puede provenir de una estimación presentada como medición. Todo dato estimado
DEBE llevar su campo de origen (`fuente`) y la UI DEBE distinguir "estimado" de "real".

### INV-0.3 — Normalización de texto externo
Todo texto que entre desde una fuente externa (SITPORT, MOP, SHOA, Sernapesca, cualquier
API) DEBE pasar por la función de normalización central ANTES de cualquier parseo o
matching (quitar acentos, corregir encoding roto, mayúsculas). Razón: SITPORT devuelve
encoding inconsistente y cada Capitanía redacta distinto.
- **Verificación:** todo servicio nuevo que consuma datos externos importa y usa la
  utilidad de normalización compartida. No se acepta parseo sobre texto crudo.

### INV-0.4 — Cada navegación es un cotejo independiente
El veredicto del tramo de ida no implica nada sobre el de regreso. Cada leg se evalúa por
separado.

### INV-0.5 — Separación de capas
El motor tiene capas independientes: **ruteo**, **locaciones**, **motor de restricciones**,
**perfiles**. Un cambio en una capa NO puede degradar otra.
- **Verificación:** ejecutar la suite de la capa tocada Y la de las capas dependientes.
  Tocar locaciones obliga a verificar ruteo Y restricciones.

---

## 1. SISTEMA DE VEREDICTO (banderas) — INVARIANTE

El MVP usa el sistema de banderas como motor definitivo. **NO migrar a índice de riesgo
ponderado (IRO) ni a esquema de puntaje sin decisión explícita del dueño del producto.**

| Bandera | Significado | Acción |
|---|---|---|
| **Q** (verde) | Libre navegación | "Condiciones favorables para navegar" |
| **U** (amarilla) | Navegar con restricciones / advertencia | Se muestra el motivo; no bloquea |
| **U+V** (roja) | Prohibido / no recomendado | "Navegación no recomendable, No zarpar" + motivo |

### INV-1.1 — Escalamiento de veredicto
El veredicto final es el MÁXIMO de severidad de todas las fuentes (`Q < U < U+V`). Si
existe cualquier restricción bloqueante, el veredicto NO puede ser Q.
- **Verificación:** no puede renderizarse Q (verde) mientras exista, en la misma pantalla,
  una restricción bloqueante listada. Probar ruta con zona bloqueante y confirmar escalado.

### INV-1.2 — El patrón ve TODAS las restricciones de su ruta
Cualquier bahía que aparezca en `consultaRestricciones` de SITPORT y esté en la ruta DEBE
mostrarse, aplique o no a la embarcación. Las que no aplican se muestran como
**informativas** (separadas visualmente de las bloqueantes), nunca se ocultan.
- **Verificación:** ruta que cruce bahía con restricción que NO aplica a la nave (por
  AB/TRG) debe mostrar esa restricción en sección informativa, no desaparecerla.

### INV-1.3 — PRINCIPIO DE DOBLE CAPA (crítico para comunicar restricciones)

Toda restricción se comunica en DOS capas que nunca se contradicen:

**Capa 1 — Estado normativo (el veredicto crudo).** El estado real y su bandera. Ej:
"🔴 Puerto de zarpe cerrado — Bandera U+V. Navegación no recomendada."

**Capa 2 — Vía de acción citada (la puerta que abre el reglamento).** Cuando el reglamento
contempla una vía legal para la situación, se informa citando decreto, artículo e inciso,
y derivando al patrón a coordinar con la Autoridad Marítima. Ej: "Según el Reglamento de
Recepción y Despacho de Naves (D.S. 364, Art. 36), en caso de mal tiempo con puerto cerrado
la Autoridad Marítima puede autorizar el zarpe hacia un puerto próximo del litoral, siempre
que asegures que la nave está en condiciones y te responsabilices de ello. Coordina con la
Capitanía [nombre]: [teléfono]."

**Regla dura:** la Capa 2 NUNCA degrada la bandera de la Capa 1. El veredicto permanece
rojo/amarillo; la vía normativa es información adicional, no un cambio de estado. Esto
previene el bug histórico de "verde con restricción bloqueante debajo".
- **Verificación:** cuando el motor muestre una vía normativa (Capa 2), la bandera (Capa 1)
  no cambia de color. Confirmar que un zarpe cerrado sigue en U+V aunque muestre el Art. 36.

---

## 2. LÓGICA ZARPE ≠ RECALADA — INVARIANTE

Base legal: RRDN Art. 24-27, Art. 33, Art. 36; LN Art. 22-27, Art. 89.

### INV-2.1 — Pre-Zarpe: puerto de zarpe cerrado
**Capa 1:** 🔴 **U+V**. "Puerto de zarpe cerrado. Navegación no recomendada."

**Capa 2 (vía normativa — RRDN Art. 36, inciso 2):** Texto legal literal:
> "en caso de mal tiempo y con puerto cerrado, la Autoridad Marítima podrá conceder el
> zarpe de la nave que se encuentra a la gira hasta un próximo puerto del litoral, siempre
> y cuando el capitán asegure que la nave está en condiciones de hacerlo y se responsabilice
> de ello."

Mensaje al patrón: el zarpe está restringido por puerto cerrado (Capa 1 se mantiene roja),
PERO según D.S. 364 Art. 36 la Capitanía puede autorizar zarpe a la gira hacia puerto
próximo bajo responsabilidad del capitán. Debe coordinarlo directamente con la Capitanía
[nombre]: [teléfono]. La app NO autoriza ni recomienda zarpar; informa la vía legal.

> **Nota de contexto real (no borrar):** esta excepción se aplicó en la práctica durante la
> pandemia, cuando una nave debía llevar víveres a zona aislada y la Capitanía autorizó el
> zarpe con puerto cerrado. El estado rojo era correcto Y la vía de autorización existía —
> ambas cosas ciertas a la vez. Este es exactamente el caso de uso del principio de doble
> capa (INV-1.3).

**IMPORTANTE — quién autoriza:** la autorización es facultad exclusiva de la Autoridad
Marítima (RRDN Art. 36 "podrá conceder"). Ni la app ni el capitán la otorgan. El motor
informa la vía; no cambia la bandera.

### INV-2.2 — Pre-Zarpe: puerto de recalada cerrado
**Capa 1:** 🟡 **U** (advertencia, no bloqueo).

**Capa 2 (vía normativa — RRDN Art. 16 + Art. 17; LN Art. 27):** el zarpe podría ser
denegado por la Capitanía o exigirse declarar puerto alternativo (RRDN Art. 16: si cambia
el puerto de recalada, solicitar permiso a la Autoridad Marítima con anticipación). Se marca
flag `arribadaForzosa` disponible y se muestra teléfono de la capitanía.

### INV-2.3 — En Navegación: recalada que se cierra en tránsito
La restricción del puerto de zarpe deja de importar. Recalada que se cierra en tránsito →
NO se bloquea: se activa protocolo de **Arribada Forzosa**.
- **Base:** LN Art. 27 (arribada forzosa: aviso inmediato a la Autoridad Marítima, que
  verifica motivos); RRDN Art. 17 (define arribada forzosa como entrada a puerto distinto
  del prefijado). Acción: avisar por VHF Canal 16, coordinar zona de abrigo/fondeadero.
  Principio rector: salvaguardar la vida humana en el mar (RGDN Art. 1; LN Art. 89).

- **Verificación:** zarpe cerrado devuelve U+V + Capa 2 con Art. 36; recalada cerrada
  devuelve U + flag `arribadaForzosa` + teléfono. Las tres fuentes (zarpe/recalada/tránsito)
  no pueden tratarse con el mismo peso.

---

## 3. LOOK-AHEAD POR ZONAS INTERMEDIAS — INVARIANTE

Base legal: **LN Art. 32** (texto literal):
> "La Dirección podrá en casos calificados, restringir o prohibir el paso o la permanencia
> de naves en determinadas zonas o lugares o prohibir su ingreso a puertos nacionales. Podrá
> también prohibir el tránsito por aguas sometidas a la jurisdicción nacional, si su paso no
> es inocente o es peligroso."

Complementa: LN Art. 89 (deber de seguridad del capitán); CIRC O-41/001 (las Capitanías
disponen suspensión total o parcial de actividades marítimas ante mal tiempo).

### INV-3.1 — Evaluación secuencial de la ruta
El motor NO mira solo el destino final. Evalúa secuencialmente TODAS las jurisdicciones de
Capitanía que la ruta activa atraviesa. Una zona intermedia cerrada restringe el tránsito
por sus aguas jurisdiccionales aunque el destino final esté abierto (LN Art. 32).

### INV-3.2 — Mensaje en tránsito (doble capa)
**Capa 1:** alerta de la zona intermedia con su bandera.
**Capa 2:** orientación a cumplir la norma con seguridad — no ingresar a la zona, contactar
Autoridad Marítima por VHF Canal 16, coordinar fondeo de seguridad o recalar en puerto
alternativo. Mensaje inequívoco ("Tu embarcación NO puede transitar" vs "No afectada").

- **Verificación:** ruta con zona intermedia cerrada debe listar esa zona y su mensaje; no
  puede pasarse por alto justificando que el destino está abierto.

### ESTADO ACTUAL — ✅ RESUELTO (07-AGO-2026)
`POST /api/sitport/restricciones-ruta` **funciona correctamente**. El diagnóstico descartó la
supuesta regresión: el endpoint devuelve `total > 0` con restricciones reales y respeta
INV-1.2 (las que no aplican a la nave se incluyen como informativas, no se descartan). El
"vacío" que se observaba NO era un bug del backend, sino rutas de prueba que no cruzaban
jurisdicciones con restricción activa en ese momento. El rename `aplica_a_mi_embarcacion` →
`aplica` no rompía nada: es un campo de salida dentro de un `.map()` (preserva el array) y
ningún `.filter()` aguas abajo dependía de él. El frontend ya leía `aplica` con fallback a
`evaluacion.estado`; no requirió cambios.
- **Robustez incorporada en el fix:** validación de entrada (waypoints con lat/lng numéricos
  en rango geográfico de Chile → 400 si no), aislamiento por bahía (try/catch individual: una
  bahía con dato SITPORT malformado se omite con warning, no tumba la respuesta), y estado
  explícito 503 (`SITPORT_UNAVAILABLE`) si la fuente no responde en vez de un 502 genérico.
- **Verificado real (no solo unit tests):** 36/36 tests de robustez, integration test de
  INV-1.2, respuesta real del endpoint con partición correcta, y confirmación visual en P3
  (ruta con bloqueantes e informativas renderizadas en secciones separadas).

---

## 3 bis. RESOLUCIÓN DE JURISDICCIÓN — INVARIANTE

INV-3.1 ya establece que el motor evalúa las jurisdicciones de **Capitanía** que la ruta
atraviesa. Esta sección fija de dónde salen esos límites y qué hacer cuando no se conocen.

> **Origen (no borrar):** hasta v1.5 el contrato decía "Capitanía" pero no declaraba la
> fuente de los límites. Sin fuente declarada, la implementación resolvió jurisdicción por
> teselado geométrico sobre puntos de bahía. Contrato y código quedaron en desacuerdo sin
> que ninguna verificación lo detectara. Esta sección cierra ese vacío.

### INV-3.3 — La unidad de jurisdicción es la Capitanía de Puerto
La jurisdicción que determina qué restricciones afectan a un viaje es la **Capitanía de
Puerto**, y sus límites son los que fija el D.S. 991. NO se derivan de proximidad, teselado
geométrico, franjas de latitud ni de ninguna aproximación calculada.

- **Base:** D.S. 991 Art. 1 (fija los límites con coordenadas); Art. 2 (las jurisdicciones
  comprenden el litoral, lagos y ríos navegables, aguas interiores, mar territorial, zona
  contigua, ZEE y plataforma continental). Resoluciones locales que implementan la
  CIRC O-41/001, cuyo título y articulado circunscriben expresamente sus efectos a la
  jurisdicción de la Capitanía que las dicta.
- **Razón operativa:** cada Capitanía mide las condiciones de SU jurisdicción, decide para
  SU jurisdicción y publica por SITPORT. El alcance de lo que dicta es su territorio.
- **La Alcaldía de Mar no es unidad de jurisdicción: resuelve a su Capitanía.** El litoral
  tiene un nivel administrativo por debajo de la Capitanía de Puerto. Una bahía cuyo
  territorio corresponde a una Alcaldía de Mar **se atribuye y se rotula con el nombre de la
  Capitanía de Puerto de la que esa Alcaldía depende**, nunca con el nombre de la Alcaldía.
  El conjunto de valores admisibles no crece: sigue siendo el de las Capitanías del decreto.
  - **Base:** DFL 292 Art. 12 y Art. 27. La dependencia no es interpretación nuestra: el
    Art. 27 la establece.
  - **Por qué el D.S. 991 no las contiene, y eso NO es un hueco de nuestra capa:** el
    Art. 14 del DFL 292 reparte los instrumentos. Las jurisdicciones de Gobernaciones y
    Subdelegaciones las fija el Presidente —que es lo que el D.S. 991, decreto presidencial,
    hace— y las Alcaldías de Mar las fija el Director General, en otro acto. Buscar una
    Alcaldía dentro del D.S. 991 es buscarla en el instrumento equivocado, y no encontrarla
    ahí no habilita a resolverla por aproximación.
  - **Verificación:** ningún valor del campo de Capitanía puede ser el nombre de una
    Alcaldía de Mar. Una bahía atribuida por esta vía lleva en su `respaldo` de qué Alcaldía
    viene y a qué Capitanía se resolvió, para que la atribución no quede indistinguible de
    una coincidencia de nombre.
- **Verificación:** ningún punto del código puede resolver jurisdicción por distancia a un
  punto, por franja de latitud ni por celda de un teselado. Un punto resuelve su Capitanía
  por contención en el polígono del decreto, o no la resuelve.

### INV-3.4 — La bahía es etiqueta de la restricción, no criterio de aplicación
El nombre de bahía con que SITPORT publica una restricción identifica **dónde se originó** y
sirve para mostrárselo al patrón. NO determina si la restricción le aplica: eso lo determina
la Capitanía que la dictó y el territorio de esa Capitanía.

- **Consecuencia:** una restricción publicada bajo el nombre de una bahía aplica a toda la
  jurisdicción de su Capitanía, salvo que el propio texto acote el área (campo
  `AreaRestriccion`, que describe una zona *dentro* de la jurisdicción).
- **Nota de alcance (no borrar):** las resoluciones locales pueden subdividir la jurisdicción
  en **sectores** con condición de puerto independiente, y SITPORT puede publicar entradas a
  nivel de sector o de canal, no solo de bahía. El motor NO implementa el nivel de sector hoy.
  Mientras no lo haga, evalúa a nivel de Capitanía, que es el envolvente: muestra de más,
  nunca de menos. Coherente con INV-1.2.
- **Verificación:** el motor no puede descartar una restricción por comparación de nombre de
  bahía contra la posición de la ruta.

### INV-3.5 — Ámbito marítimo y ámbito lacustre
Las jurisdicciones tienen ámbito **marítimo**, **lacustre** o **insular remoto**. Las
lacustres son jurisdicciones plenas, con Capitanía, condición de puerto y usuarios reales
(deportivos y transporte). NO se excluyen del motor.

- **Base:** D.S. 991 Art. 2 (las jurisdicciones comprenden lagos y ríos navegables).
- **Consecuencia técnica:** la geometría de las jurisdicciones lacustres NO puede construirse
  restando tierra, porque un cuerpo de agua interior está rodeado de tierra por definición y
  el recorte lo elimina. Se construye desde la capa de cuerpos de agua continentales.
- **Verificación:** ninguna jurisdicción de ámbito lacustre puede quedar con geometría vacía
  tras la construcción.

### INV-3.6 — Una jurisdicción sin geometría se declara, nunca se resuelve en silencio
Si una jurisdicción no tiene geometría cargada, el motor NO puede tratarla como inexistente.
Debe declararlo al patrón.

- **Razón:** una jurisdicción sin geometría produce un **falso negativo silencioso** — existe
  una restricción real, la ruta la cruza, y el patrón nunca la ve. Es el modo de falla más
  peligroso del motor, porque no hay error ni aviso.
- **Regla dura:** toda jurisdicción cargada declara su estado de geometría. Si una ruta entra
  en una zona sin geometría cargada, se informa: "No tenemos cargado el límite de esta
  jurisdicción — verifica con la Capitanía [nombre]: [teléfono]".
- **Bandera:** una jurisdicción sin geometría cargada que la ruta cruza escala el veredicto
  a **U**, y NUNCA a **U+V**. La ausencia de dato no es una prohibición: llevarla a U+V sería
  fabricar una restricción que no existe, y dejarla en Q sería afirmar una condición que el
  motor no puede respaldar. U dice lo que efectivamente pasa — falta información, hay que
  consultar —, que es el mismo criterio que ya rige para una restricción sin umbral. El aviso
  es una **fuente más** del máximo de INV-1.1, no una restricción: su aporte al máximo está
  topado en U por construcción, y no se renderiza entre las restricciones de INV-1.2, porque
  mezclar un "no sabemos" con las restricciones reales de la ruta le daría una autoridad que
  no tiene. Decisión del dueño del producto, 2026-08-10.
- **Dos causas, un mensaje, dos registros:** un punto de la ruta que no resuelve jurisdicción
  puede venir de (a) una jurisdicción declarada sin geometría — la carencia que este
  invariante describe — o de (b) un **hueco de la propia capa**, una zona que ninguna
  jurisdicción reclama. Al patrón se le dice **lo mismo** en los dos casos, porque para él la
  consecuencia es idéntica: no sabemos, consulte. Internamente NO son lo mismo: (a) es el
  estado del mundo y (b) es un defecto de construcción nuestro, y debe quedar registrado como
  defecto además de mostrarse. Sin esa separación, los huecos de la capa se esconden detrás de
  un mensaje que parece explicarlos.
- **Coherencia:** es INV-0.2 (no fabricar datos) aplicado a la ausencia de dato. No inventar,
  y tampoco esconder.
- **Verificación:** contar geometrías nulas, vacías y de área cero por ámbito después de cada
  reconstrucción de la capa. Toda jurisdicción con área cero que no esté declarada como sin
  georreferenciar es un fallo, no un resultado. Además: ninguna zona de la ruta que no
  resuelva jurisdicción puede quedar sin clasificar en (a) o (b), y ninguna pantalla puede
  mostrar Q mientras exista, en esa misma pantalla, un aviso de límite no cargado.

### INV-3.7 — Trazabilidad de los límites
El archivo de definición de jurisdicciones es **dato fuente versionado** en el repositorio.
Cada Capitanía conserva el texto literal del decreto que la define. La geometría en base de
datos es un **derivado reproducible** desde ese archivo, generado por script, nunca editada a
mano.

- **Correcciones:** cuando la fuente contiene un error evidente (error de tipeo, coordenada
  inconsistente con el párrafo vecino), la corrección se aplica en el archivo fuente
  registrando qué dice el decreto, qué se leyó y por qué. NO se corrige en silencio ni se
  rellena por deducción un valor que la fuente no entrega.
- **Verificación:** regenerar la capa desde el archivo fuente debe producir el mismo
  resultado. Si alguien clona el repositorio, puede reconstruirla sin depender del disco de
  nadie.

---

## 4. HABILITACIÓN POR LICENCIA Y CLASIFICACIÓN DE NAVE

Base: RGDN (TM-002) Art. 12-14, Art. 28; LN Art. 4, Art. 34; Circular A-41/014
(clasificación de nave). Inconsistencia licencia/nave/navegación → **U+V** con motivo
"inconsistencias en el seteo respecto de la licencia informada o incompatibilidad de la
embarcación".

### 4.1 Licencias deportivas (RGDN Art. 12 y 14) — jerarquía de herencia

Las cuatro licencias (RGDN Art. 12): Patrón de Lancha Deportiva de Bahía (PLDB), Patrón
Deportivo de Bahía (PDB), Capitán Deportivo Costero (CDC), Capitán Deportivo de Alta Mar
(CDAM).

Facultades (RGDN Art. 14, texto literal resumido):

| Licencia | Ámbito | Límite de millas | Restricción extra | Hereda |
|---|---|---|---|---|
| **PLDB** | Aguas protegidas (puertos, bahías, ríos, lagos) | Límite fijado por Autoridad Marítima local | **Solo motor** (Art. 14 a: "propulsadas exclusivamente a motor") | — |
| **PDB** | Aguas protegidas | Límite fijado por Autoridad Marítima local | Ninguna (todo tipo de propulsión) | — |
| **CDC** | Costero y alta mar | **60 nn de la costa** (Art. 14 c) | — | PDB (bahía) |
| **CDAM** | Alta mar, oceánica (Art. 14 d) | **Sin límite** | — | CDC + bahía |

Jerarquía: `CDAM ⊇ CDC ⊇ (PDB/PLDB en bahía)`.

### INV-4.1 — Límite efectivo = min(licencia, clasificación de nave, degradación por vela sin motor)
El patrón habilita al operador; la clasificación de nave (CIRC A-41/014 C.5) habilita al
casco. Manda el MENOR de las tres variables.

**Variable 1 — límite de licencia** (§4.1): PLDB/PDB = bahía; CDC = 60 nn; CDAM = sin límite.

**Variable 2 — límite de clasificación de nave** (CIRC A-41/014 C.5 + Anexo A). Clasificaciones
registrables y su tope costero:

| Clasificación de nave | Tope costero | Representación en código |
|---|---|---|
| Alta Mar | sin límite costero (navegación de altura) | `Infinity` (NO inventar un número) |
| Costera 60 MN | 60 MN de la costa | `60` |
| Costera 12 MN | 12 MN de la costa | `12` |
| Bahía (Vela / Motor) | aguas de bahía | límite fijado por Autoridad Marítima local |

La subclasificación 60/12 MN se registra en matrícula y certificado de navegabilidad según
el equipamiento a bordo (CIRC A-41/014 C.6). **Es INPUT declarado por el patrón, NO se
infiere.** No derivar la clasificación de la nave a partir de la eslora ni de otros campos.

**Variable 3 — degradación por propulsión a vela sin motor** (CIRC A-41/014 H.2, texto
literal):
> "Aquellas embarcaciones deportivas clasificadas como de alta mar y costeras, propulsadas a
> vela y que no cuenten con un motor auxiliar por diseño, o no se encuentre operativo, sus
> desplazamientos estarán limitados a navegaciones de hasta 12 millas náuticas de la costa."

Si (nave a vela) **Y** (sin motor auxiliar operativo) → esta variable aporta un tope de `12`
MN, independiente de la clasificación registrada. Si no aplica (tiene motor operativo, o no
es a vela), la variable no entra en el `min()` (equivale a `Infinity`).

**Fórmula:** `límite_efectivo = min(límite_licencia, límite_clasificación, degradación_vela)`

Ejemplos:
- CDAM (sin límite) en nave "Costera 12 MN" → topado a **12 MN** por la nave (Variable 2).
- CDAM (sin límite) en nave "Alta Mar" a vela con motor auxiliar muerto → topado a **12 MN**
  por la degradación (Variable 3), aunque la clasificación registrada sea Alta Mar.
- CDC (60 nn) en nave "Costera 60 MN" a motor → **60 MN** (ninguna variable baja el tope).

### INV-4.2 — Cruce licencia × propulsión (PLDB)
PLDB solo habilita motor (RGDN Art. 14 a). PLDB + nave a vela o mixta → incompatible aunque
esté en bahía → **U+V**.

### INV-4.3 — DEPORTIVO NACIONAL NO REQUIERE DESPACHO/ZARPE (corrección importante)
Base: **RGDN Art. 34** (texto literal):
> "Las embarcaciones deportivas nacionales que emprendan una navegación en aguas
> jurisdiccionales chilenas, se regirán exclusivamente por lo estipulado en el presente
> reglamento y no requerirán autorización de zarpe."

Consecuencia para P2: en el perfil deportivo **NO se pide número de permiso de zarpe, ni
fecha inicio/término de permiso**. El deportivo solo debe **informar su intención de
movimiento** al club de yates / entidad náutica, o en su defecto a la Autoridad Marítima
local (RGDN Art. 34 inciso 2). La lógica de permiso de zarpe del flujo comercial NO aplica
al deportivo. El capitán/patrón mantiene plena responsabilidad del zarpe, navegación y
recalada (RGDN Art. 34 inciso final).

### INV-4.4 — Tabla de arqueo por eslora (resuelve AB en blanco del deportivo)
Base: **RGDN Art. 28**. Para embarcaciones deportivas menores de 24 m, el AB se determina
por eslora con tabla oficial (no requiere planos). Tabla oficial:

| Eslora | Arqueo Bruto (AB) | Arqueo Neto (AN) |
|---|---|---|
| Hasta 23,99 m | 50.0 | 15.0 |
| Hasta 23 m | 45.5 | 13.7 |
| Hasta 22 m | 42.5 | 12.8 |
| Hasta 21 m | 39.5 | 11.9 |
| Hasta 20 m | 36.5 | 11.0 |
| Hasta 19 m | 33.5 | 10.1 |
| Hasta 18 m | 30.5 | 9.2 |
| Hasta 17 m | 27.5 | 8.3 |
| Hasta 16 m | 25.0 | 7.5 |
| Hasta 15 m | 22.3 | 6.7 |
| Hasta 14 m | 20.0 | 6.0 |
| Hasta 13 m | 17.5 | 5.3 |
| Hasta 12 m | 15.0 | 4.5 |
| Hasta 11 m | 12.5 | 3.8 |
| Hasta 10 m | 10.0 | 3.0 |
| Hasta 9 m | 7.5 | 2.3 |
| Hasta 8 m | 5.0 | 1.5 |

Uso: si el usuario deportivo no conoce su AB, derivarlo de la eslora con esta tabla oficial
(dato legal, no estimación) y etiquetarlo como derivado de RGDN Art. 28.

### INV-4.5 — Restricción nocturna de motos de agua
Base: **RGDN Art. 26** (texto literal):
> "las lanchas deportivas de bahía del tipo motos de agua y similares, solo podrán navegar
> en horarios entre el orto y el ocaso de sol."

Si el tipo de nave es moto de agua / jet ski y el ETA o el zarpe caen fuera del rango
orto-ocaso → advertencia. Regla dura solo para motos de agua; NO extender a otras naves
(su restricción nocturna depende del certificado de navegabilidad individual, dato no
capturado hoy).

### INV-4.6 — Naves mayores/menores por AB
Base: **LN Art. 4** (texto literal): "Son naves mayores aquellas cuyo arqueo bruto es de
cien o más y naves menores todas aquellas cuyo arqueo bruto es menor a cien." AB y TRG NO
son interconvertibles; el campo AB debe existir en el perfil de nave.

### INV-4.7 — Naves deportivas eximidas de matrícula (sin clasificación registrada)
Base: **CIRC A-41/014 C.2** (texto literal):
> "Se exime de la inscripción en los Registros de Embarcaciones Menores, aquellas
> embarcaciones menores a 5 metros de eslora, propulsadas en forma manual, a vela y/o con
> motor menor a 10 HP."

Una nave que cumple los tres criterios (< 5 m eslora **Y** propulsión manual/vela/motor < 10
HP) puede no tener clasificación de nave registrada (no pasa por certificado de
navegabilidad). En ese caso faltaría la Variable 2 de INV-4.1.

**Decisión de producto (RATIFICADA 07-AGO-2026):** la eximición NO es un caso especial del
motor de decisión, es una regla del **formulario de captura** (P1/P2). El motor de INV-4.1
siempre recibe sus tres variables completas; el hueco lo rellena el formulario ANTES de
llamar al motor.

Regla del formulario:
- Si el usuario declara eslora < 5 m **Y** propulsión manual/vela/motor < 10 HP → la nave es
  eximida de matrícula. El formulario **asigna automáticamente clasificación = Bahía**, NO
  muestra el campo de clasificación de nave (el usuario no lo tiene y no debe inventarlo), y
  muestra un aviso informativo: "Tu embarcación está eximida de matrícula (CIRC A-41/014 C.2);
  la evaluamos como navegación de bahía."
- La licencia y la propulsión SÍ se siguen pidiendo normalmente (la eximición es solo de
  matrícula, no de licencia ni de las demás reglas).

Consecuencias:
- El motor NO conoce el concepto "eximida": para él siempre llegan las tres variables. Queda
  simple e intocado.
- La clasificación asignada (Bahía) entra a `min()` como Variable 2 igual que cualquier otra.
- NO es U+V por sí solo; es una navegación de bahía normal, sujeta al resto de las reglas.

### ESTADO ACTUAL DEPORTIVO — ❌ NO IMPLEMENTADO (declarado Fase 4)
`src/config/perfiles-costo.js` solo ajusta costo de ruteo por licencia, NO valida
habilitación. Construir desde cero el validador (INV-4.1 a INV-4.7). Va en el lanzamiento.

---

## 5. FUENTES DE DATOS AUTORIZADAS

Cada dato tiene UNA fuente autorizada. No conectar un buscador de UI a un endpoint que
sirve otra cosa (causa del bug del perfil pescador).

| Dato | Fuente autorizada | Estado |
|---|---|---|
| Estado de puertos / restricciones | SITPORT `consultaRestricciones` (POST `{}`) | OK |
| Clima por segmento | SITPORT `Totalpronostico` | OK |
| Bahías + jurisdicciones | PostGIS `bahias_sitport` + `bahia_jurisdicciones` (Voronoi recortado por costa) | OK |
| Nodos marítimos | PostGIS `nodos_maritimos` (781+ nodos) | OK |
| Atribución bahía → Capitanía | `data/decreto/join_bahia_jurisdiccion.json` (164 entradas, 158 resueltas) | OK |
| **Contacto de Capitanía** (teléfono, dirección) | ~~⚠️ NO EXISTE fuente viva — ningún archivo de `src/` tiene teléfono ni dirección de Capitanía~~ · **CORREGIDO 2026-08-16:** el **teléfono SÍ existe** — `src/data/bahia-capitania-map.json` trae **108 de 164** números de Capitanía (medido en `01bf543`, ver §5.1). La **dirección sigue sin existir** en ninguna fuente viva | ⚠️ PENDIENTE — sólo por la dirección |
| **Contacto de Gobernación** (teléfono) | `src/data/bahia-capitania-map.json` (164 entradas, indexado por bahía) | ⚠️ TRANSITORIA — ver §5.1 |
| Mareas | Motor harmónico propio (`tidal-constants.json`, 21 estaciones) | OK |
| Ruteo | Raster A* (5 tiles, Arica–Cabo de Hornos) | OK con bugs de snap |
| **SST (temperatura agua)** | Open-Meteo Marine (`sea_surface_temperature`) | OK — real |
| **Clorofila** | `_estimarClorofila()` — proxy por zona biogeográfica | ⚠️ ESTIMADO |
| Conocimiento de especies | `especies_pesca.json` | OK (encoding roto, cosmético) |
| **Caladeros de pesca** | ❌ NO EXISTE fuente en backend | ❌ FALTA |
| **Umbrales AB de mal tiempo** | Resoluciones locales de Capitanía vía SITPORT | Jurisdiccional |

### 5.1 — El contacto de Gobernación es fuente TRANSITORIA, y por qué se declara igual

`bahia-capitania-map.json` **no es la fuente que este sistema quiere**: está indexado por
bahía y no por Capitanía, así que el mismo teléfono se repite en promedio ~~11 veces~~ y un cambio
de atribución arrastra el contacto con él. Aun así se declara, porque **hoy es de donde el
motor lee** y un dato vivo sin declarar es peor que un dato malo declarado — es la situación
que la primera línea de §5 existe para impedir.

> **CORRECCIÓN 2026-08-16 (§3.3): son 4,8 veces, no 11.** Medido sobre el archivo en el commit
> `01bf543` con `_bitacoras/contrato_51_telefonos_2026-08-16/01_medir_niveles_telefono.js`:
> **34 valores distintos** entre las 164 entradas con teléfono, o sea **4,8 repeticiones en
> promedio**. El 11 salía de suponer 15 valores distintos, uno por Gobernación, que es la
> afirmación que se corrige más abajo. **El argumento del párrafo no se mueve** —el archivo
> sigue indexado por bahía y una re-atribución sigue arrastrando el contacto—; lo que era falso
> es la magnitud, y bajó porque las piezas del frente de contacto metieron números de Capitanía,
> que son muchos más y se repiten menos. **Esta cifra se mueve con cada pieza:** lleva fecha,
> commit e instrumento, y quien la actualice corre el instrumento y cambia las tres cosas.

Lo que este archivo tiene de verdad, medido y sin suavizar:

- Sus **164** entradas traen ~~`capitania`,~~ `gobernacion` y `telefono`.

  > **PRECISIÓN 2026-08-16 (§3.3): la frase es cierta leída como "traen la clave" y falsa leída
  > como "las 164 traen valor". Se escribe con las dos lecturas resueltas para que no haga falta
  > elegir una.** Las tres claves están presentes en las 164 entradas. Pero **la entrada 127
  > (Baker) trae `capitania: null`**, y es la única: `gobernacion` y `telefono` no tienen ningún
  > nulo, y `capitania` tiene exactamente ese uno. Medido sobre el archivo en el commit
  > `01bf543` con `_bitacoras/contrato_51_telefonos_2026-08-16/01_medir_niveles_telefono.js`,
  > y comprobado en cada corrida por V7 de
  > `_bitacoras/lote_cisnes_2026-08-16/03_verificar.js`. **El null es deliberado y está
  > declarado:** el teléfono que su repartición publica es `"Móvil: +569 5617 3241"`, que no es
  > un número atómico, e INV-10.1 prohíbe renderizar como enlace un valor que no lo sea.
  > Escribirle el nombre sin el teléfono dejaría el nombre de una Capitanía con el contacto de
  > otra. **Falta conseguir el número atómico de Baker (CdRep 260); no se resuelve normalizando
  > la cadena.** El día que se consiga, esta precisión se retira y la frase original vuelve a ser
  > cierta en las dos lecturas.

- ~~Los **164 teléfonos son de Gobernación**, sin una sola excepción: son 15 valores distintos,
  uno por Gobernación. **Ninguno es de una Capitanía.**~~ Hasta la v1.8 el sistema los rotulaba
  como si lo fueran; INV-10.1 cierra eso.

  > **CORRECCIÓN 2026-08-16 (§3.3): la afirmación tachada es falsa, y el texto original queda
  > para que se vea desde dónde se corrigió.** El archivo tiene teléfonos de Capitanía desde
  > `85bc68a` y `df684d7` (2026-08-13), y el conteo se movió dos veces más: `f3936b8` (Pieza A,
  > 16 entradas) y `01bf543` (lote Cisnes, 18 entradas).
  >
  > **MEDIDO EL 2026-08-16 SOBRE EL ARCHIVO EN EL COMMIT `01bf543`**, con
  > `_bitacoras/contrato_51_telefonos_2026-08-16/01_medir_niveles_telefono.js`.
  > **Denominador: las 164 entradas.** Las 164 traen teléfono; ninguna lo trae en `null`.
  >
  > | de qué nivel es el número | entradas |
  > |---|---|
  > | de una **Capitanía** y no de una Gobernación | **73** |
  > | de una **Gobernación** y no de una Capitanía | **56** |
  > | figura en **los dos** índices — el número no distingue el nivel | **35** |
  > | en ninguno de los dos | 0 |
  > | teléfono `null` o vacío | 0 |
  > | **total** | **164** |
  >
  > Leído como lo lee P3, que sólo pregunta *"¿este número es de una Capitanía?"*: **108 de 164**
  > lo son (73 + 35). Es la misma cifra que devuelve el instrumento versionado
  > `_bitacoras/auditoria_rotulos_2026-08-15/02_medir_pantalla.js`, y las dos mediciones se
  > cruzaron.
  >
  > **Las 35 de la tercera fila son un hecho de la fuente, no un empate sin resolver:**
  > DIRECTEMAR publica el mismo número para una Gobernación y para una Capitanía suya
  > —Antofagasta, Caldera, Coquimbo, Valdivia, Hanga Roa, y la Antártica con Bahía Paraíso—.
  > Ese número **no distingue el escalón 1 del escalón 2 de INV-10.1**.
  >
  > **De dónde salen los dos índices, y qué NO son.** Nivel Capitanía:
  > `capitanias_64_final.csv`. Nivel Gobernación: la tabla de `src/utils/capitanias.js` más el
  > número de la GM Antártica Chilena recuperado en `_bitacoras/frente_contacto_2026-08-13/`.
  > **Ninguno de los dos es fuente autorizada** —esta misma sección lo dice de la tabla— y aquí
  > no se usan como tal: se usan como índice para preguntar de quién es un número. Un número de
  > Gobernación que no esté en ese índice cae en "ninguno", no en "Gobernación".
  >
  > **ESTA CIFRA VA A MOVERSE Y ESO ES LO ESPERADO.** Se mueve con cada pieza del frente de
  > contacto que re-atribuya entradas, y se moverá cuando se corrija P3. Por eso lleva **fecha,
  > commit e instrumento**: una declaración con fecha envejece a la vista; una sin fecha envejece
  > en silencio, que es exactamente lo que produjo la línea tachada. Quien la actualice corre el
  > instrumento y cambia las tres cosas y los cinco números — no uno solo.
- **No trae dirección.** La dirección que INV-10.1 manda mostrar no existe en ninguna fuente
  viva del repositorio.
- Tres de sus valores están **desactualizados** contra lo que DIRECTEMAR publica hoy, y entre
  los tres alimentan ~~**41 de las 164 entradas**~~. Corregirlos no requiere cambiar la estructura
  ni esperar a la fuente definitiva.

  > **CORRECCIÓN 2026-08-16 (§3.3): alimentan CERO entradas, no 41 — y por eso la frase entera
  > dejó de tener objeto.** Medido sobre el archivo en el commit `01bf543` con
  > `_bitacoras/contrato_51_telefonos_2026-08-16/01_medir_niveles_telefono.js`, número por
  > número: `+56 58 220 6402` → **0**, `+56 41 226 6100` → **0**, `+56 65 256 1100` → **0**.
  > Denominador: las 164 entradas.
  >
  > **Estuvieron y ya no están.** Los puso `35c63d9` y los sacaron `85bc68a` y `df684d7` el
  > 2026-08-13. El 41 nunca contó entradas que llevaran esos números: contaba entradas cuya
  > **Gobernación** es una de las tres — 1 Arica + 12 Talcahuano + 28 Puerto Montt —, que es
  > otra cosa. `PLAN_JURISDICCION.md` §7.1 ya lo había enmendado el 2026-08-14; **este contrato
  > no se enteró, y ése es el defecto que las tres correcciones de esta sección tienen en
  > común**: afirmaciones sobre un archivo vivo escritas sin fecha ni instrumento.
  >
  > **Dónde siguen vivos los tres números, para que no se lea como cerrado:** en la tabla
  > hardcodeada de `src/utils/capitanias.js`, que esta misma sección declara que **no es
  > fuente** y que alimenta el fallback de la PWA. Corregirlos ahí no es este trabajo y no se
  > hizo.

**Lo que NO es fuente, y se dice para que nadie lo trate como tal:** la tabla de Gobernaciones
de `src/utils/capitanias.js` resuelve por franja de latitud, lo que contradice INV-3.3 y ya
está anotado como bug abierto en §7. Medido: **la copia del backend no la consume nadie**; la
de la PWA se usa **sólo como fallback** cuando el backend no manda contacto. Ninguna de las
dos es fuente autorizada, y ninguna de las dos debe empezar a serlo.

**Condición de retiro:** esta fila desaparece de §5 el día que exista una fuente de contacto
indexada por Capitanía. Ese día `bahia-capitania-map.json` deja de alimentar contacto y el
escalón 2 de INV-10.1 pasa a leer de la fuente nueva. Mientras tanto, la fila es transitoria
por declaración y no por olvido.

### INV-5.1 — Clorofila etiquetada
Mientras sea estimada, la respuesta lleva `clorofila_fuente` y la UI la muestra como
estimada, nunca como medición. Reemplazo futuro por Copernicus Marine
(`OCEANCOLOUR_GLO_BGC_L4_MY`) sustituye SOLO `_estimarClorofila()`.

### INV-5.2 — Un buscador de UI se conecta a su fuente correcta
Ningún selector de P2 puede servir resultados de fuente distinta a la que su etiqueta
promete. "Caladero / Zona pesca" requiere fuente real de caladeros Sernapesca; hasta
tenerla, no puede fingir que la tiene sirviendo caletas/concesiones.

### INV-5.3 — Umbrales AB de mal tiempo son JURISDICCIONALES, no nacionales
**No hardcodear umbrales nacionales de AB para mal tiempo.** La LN solo define el umbral de
100 AB para mayor/menor (Art. 4). Los umbrales operativos (25, 50, 100 AB) los fija cada
Capitanía en su resolución local que implementa la CIRC O-41/001 ("las Autoridades
Marítimas locales deberán adaptar la planificación... a la propia realidad jurisdiccional").
El motor los toma del texto real de SITPORT por bahía, nunca de una constante nacional.

---

## 6. CONTRATO POR PERFIL (estado y verificación de lanzamiento)

Todos los perfiles van al lanzamiento inicial (día 0).

### 6.1 Comercial / Acuícola / Transporte
- **Debe:** evaluar restricciones SITPORT (§1-3) con doble capa, cotejo por AB/TRG, ruteo
  sobre agua, mareas por tramo, recordatorios normativos. Zarpe = despacho (LN Art. 22,
  RRDN Art. 24). El patrón declara cumplimiento vía nº de despacho; la app NO evalúa la
  autorización de zarpe (RRDN Art. 26, Art. 33 listan causales que decide la Autoridad).
- **Estado:** motor OK; `restricciones-ruta` ✅ resuelto y endurecido (§3); snap falla en
  destinos no portuarios (§7).
- **Verificación:** ruta comercial real con zona intermedia restringida → veredicto
  correcto, todas las restricciones de la ruta, línea completa sobre agua.

### 6.2 Pescador (pesca artesanal)
- **Debe:** flujo comercial + análisis del recurso en caladero (SST real vs rango óptimo,
  clorofila estimada etiquetada, alerta FAN, normativa Sernapesca, seguridad de navegación).
- **Estado:** servicio `marine-weather-service.js` COMPLETO (`GET /api/marine-weather/analyze`).
  Falta: (a) cablearlo en P3; (b) **desacoplarlo del trazado de ruta** (solo necesita
  lat/lng del caladero); (c) fuente real de caladeros (§5).
- **Verificación:** setear caladero + especie → P3 muestra análisis del recurso INCLUSO si
  el trazado de ruta falla (son independientes).

### 6.3 Deportivo (PLDB / PDB / CDC / CDAM)
- **Debe:** validar habilitación licencia × clasificación × ámbito (§4), límite efectivo
  min(licencia, nave, degradación vela) (INV-4.1), cruce PLDB × propulsión (INV-4.2),
  restricción nocturna motos de agua (INV-4.5), fallback de nave eximida a bahía (INV-4.7),
  U+V ante incompatibilidad. **NO pedir permiso de zarpe** (RGDN Art. 34); solo informar
  intención de movimiento.
- **Estado:** ❌ validación NO implementada (Fase 4). Construir desde cero.
- **Verificación:** CDC (60nn) con navegación >60nn → U+V; CDAM en nave "Costera 12nn" con
  >12nn → U+V (manda la nave); CDAM en nave "Alta Mar" a vela sin motor operativo con >12nn →
  U+V (manda la degradación); PLDB con nave a vela → U+V; moto de agua con ETA post-ocaso →
  advertencia; nave <5m eximida sin clasificación → tope bahía + aviso, no U+V por sí solo;
  perfil deportivo NO muestra campos de permiso de zarpe.

---

## 7. BUGS CONOCIDOS ABIERTOS (afectan lanzamiento)

> Resuelto 07-AGO-2026: `restricciones-ruta devuelve 0` — era falso positivo (rutas de
> prueba sin restricción activa), no un bug del backend. Ver §3. El endpoint quedó además
> endurecido (validación de entrada, aislamiento por bahía, 503 en SITPORT caído).

1. **Snap falla en destinos no portuarios.** Centroides de centros acuícolas / caladeros /
   GPS manual caen fuera de celda navegable. Solución: punto del perímetro del polígono más
   cercano a agua en vez del centroide; verificar coordenadas MOP desplazadas a tierra. BFS
   con cap de celdas (ya aplicado; no volver a radio fijo).
2. **P4 traza línea recta hasta nodo en tierra.** El snap encuentra agua pero el tramo final
   dibuja hasta la coordenada del nodo en tierra en vez de la snappeada.
3. **Encoding roto** en `especies_pesca.json` y textos SITPORT. Aplicar INV-0.3.
4. **Resolución de jurisdicción por aproximación geométrica** (contradice INV-3.3). La capa
   vigente resuelve jurisdicción por teselado sobre puntos de bahía, no por los límites del
   D.S. 991. Efectos medidos en el reconocimiento del 09-AGO-2026: celdas de área cero que
   `ST_Intersects` nunca puede devolver — falsos negativos silenciosos, INV-3.6; solape entre
   celdas resuelto con `LIMIT 1` sin orden determinista, por lo que un mismo punto puede dar
   distinta jurisdicción entre ejecuciones; mayoría de nodos sin jurisdicción asignada.
5. **Resolución de capitanía por franjas de latitud** en la utilidad de capitanías, duplicada
   en backend y frontend (contradice INV-3.3). Las Capitanías NO se apilan por latitud: desde
   el sur de Concepción existen Capitanías laterales, separadas por longitud y no por
   paralelo, y en la zona de canales la mayoría lo son.

---

## 8. BACKLOG (post-lanzamiento)

Evaluadores complementarios como reglas independientes que se SUMAN al motor de banderas:

- **Copernicus Marine** para clorofila real (reemplaza `_estimarClorofila()`).
- **Nave mayor vs menor** por detalle SITPORT cruzado con AB/TRG.
- **Cierres por faena específica** (buceo, deportes náuticos, transferencia de pasajeros):
  informativos (respaldo CIRC O-41/001 II.C), no bloquean tránsito.
- **Aviso de arribada 24h** (RRDN Art. 13): recordatorio normativo.
- **Recordatorio de vencimiento** de licencia (RGDN Art. 24: vigencia 5 años) — correo a 60
  y 50 días. Para deportivo NO aplica recordatorio de permiso de zarpe (no existe).
- **Menores de edad** (RGDN Art. 25: no exceder 6 m eslora / 135 HP; Art. 26: no transportar
  pasajeros ni remolcar) — requiere capturar edad.
- **Orto/ocaso vs ETA** para otras naves sin habilitación nocturna — requiere dato de
  certificado de navegabilidad, no capturado hoy.
- **Verificación de identidad del usuario (login)** por RUT + número de licencia deportiva —
  es control de ACCESO a la app, NO parte del motor de operación. Requiere definir si existe
  fuente oficial contra la cual validar la licencia o si es captura simple. El validador de
  habilitación deportiva (§4) usa solo el TIPO de licencia, no el número.
- **Enriquecer visual de P4 con fuentes propias YA existentes** (para que el mapa no se vea
  pobre) — SIN imitar una carta náutica. LÍMITE DURO (INV-0.1 + INV-0.2): NO agregar
  balizamiento IALA (boyas laterales/cardinales, marcas de peligro, canal preferido, racon,
  etc.) ni real (no está la fuente ENC SHOA en el stack) ni dibujado a mano (fabricaría dato
  y haría que P4 parezca carta oficial, justo lo prohibido). Tmarea es informativa; NO
  reemplaza la carta SHOA. SÍ se puede renderizar lo que ya es dato propio verificado:
  peligros (240 hazards) y fondeaderos (26 anchorages) extraídos del derrotero, restricciones
  SITPORT por bahía, y la ruta trazada sobre agua (mejora sola al cerrar los bugs de snap y
  de recta-a-tierra, §7). Todo marcador visible con disclaimer "no reemplaza carta oficial
  SHOA". El derrotero (`derrotero-3002`) es fuente de datos de backend, NO una capa que se
  renderice como tal.

Descartado del MVP: índice de riesgo ponderado (IRO) y arquitectura de "4 dimensiones".

---

## 9. PENDIENTES DE UI / TEXTOS (lista aparte, no tocan el motor)

Cambios de copy y pantallas (P0 Bienvenida, P0.1 T&C, P1 perfil, P1.1 nave, P2 navegación)
viven en la lista de pendientes de UI del dueño de producto. No van en este contrato.

---

## 10. CATÁLOGO DE MENSAJES NORMATIVOS (doble capa — INV-1.3)

Fuente única de mensajes que Claude Code debe usar. Cada uno: Capa 1 (estado) + Capa 2
(vía normativa con cita). NO inventar citas fuera de este catálogo.

**Excepción declarada:** la última fila es la única del catálogo que **no nace de un
reglamento sino de una carencia nuestra**, y por eso es la única que no lleva cita. No hay
artículo que citar porque no hay norma en juego: hay un dato que nos falta. Que no haya cita
es, precisamente, lo que esa fila comunica.

| Situación | Capa 1 (estado) | Capa 2 (vía normativa + cita) |
|---|---|---|
| **Zarpe cerrado** | 🔴 U+V "Puerto de zarpe cerrado. Navegación no recomendada." | "Según D.S. 364 (RRDN) Art. 36, en caso de mal tiempo con puerto cerrado la Autoridad Marítima puede autorizar el zarpe a la gira hacia un puerto próximo del litoral, si aseguras que la nave está en condiciones y te responsabilizas. Coordina con la Capitanía [nombre]." |
| **Recalada cerrada (en puerto)** | 🟡 U "Puerto de recalada cerrado." | "Según D.S. 364 Art. 16, si debes cambiar el puerto de recalada, solicita permiso a la Autoridad Marítima con anticipación. Podría exigirse declarar puerto alternativo." |
| **Recalada cierra en tránsito** | 🟡 U + flag arribadaForzosa | "Según D.L. 2222 Art. 27 y D.S. 364 Art. 17, puedes efectuar arribada forzosa a puerto/lugar distinto del prefijado. Avisa de inmediato a la Autoridad Marítima por VHF Canal 16. Prima la salvaguarda de la vida humana en el mar." |
| **Zona intermedia cerrada** | 🔴 U+V "Tu embarcación NO puede transitar por [zona]." | "Según D.L. 2222 Art. 32, la Autoridad Marítima puede prohibir el tránsito por aguas jurisdiccionales. No ingreses a la zona. Contacta por VHF Canal 16, coordina fondeo de seguridad o recala en puerto alternativo." |
| **Aviso de arribada** | ℹ️ recordatorio | "Según D.S. 364 Art. 13, avisa tu arribada a la Autoridad Marítima con mínimo 24 horas de anticipación." |
| **Zarpe sin despacho (comercial)** | ℹ️ recordatorio | "Según D.L. 2222 Art. 23, zarpar sin despacho se sanciona hasta con la cancelación del título. Gestiona tu despacho antes de navegar." |
| **Deportivo — sin zarpe** | ℹ️ informativo | "Según RGDN (TM-002) Art. 34, tu navegación deportiva nacional no requiere autorización de zarpe. Informa tu intención de movimiento al club náutico o, en su defecto, a la Autoridad Marítima local." |
| **Moto de agua nocturna** | 🟡 U | "Según RGDN Art. 26, las motos de agua solo pueden navegar entre el orto y el ocaso de sol. Tu horario estimado excede la luz diurna." |
| **Jurisdicción sin límite cargado** | 🟡 U "No tenemos cargado el límite de esta jurisdicción." | "Confirma con la Capitanía [nombre] antes de zarpar. **Sin cita: esta situación no la produce una norma sino la ausencia de un dato nuestro** (INV-3.6). No implica que exista una restricción, ni que no exista: implica que el motor no puede responder por esa zona." |

**Regla de uso:** Capa 2 nunca cambia la bandera de Capa 1. **Los mensajes de este catálogo
no llevan teléfono ni canal de radio propio**: nombran la Capitanía y ahí terminan. Las
menciones a VHF Canal 16 que aparecen en el catálogo son las que **la norma citada** manda, no
instrucción de contacto nuestra, y por eso se conservan.

### INV-10.1 — El contacto vive en el punto de zarpe y recalada — INVARIANTE
El teléfono y la dirección de la autoridad se muestran **sólo** en el punto de zarpe y en el
de recalada, nunca dentro de un mensaje normativo. La prelación es:

1. **Teléfono de la Capitanía**, si la fuente lo tiene para esa Capitanía.
2. Si no, **el de su Gobernación, rotulado como Gobernación** — nunca como Capitanía. Rotular
   como Capitanía un número que es de la Gobernación es el defecto que este invariante existe
   para cerrar, y fue el estado del sistema hasta la v1.8.
3. Si no hay ninguno de los dos, **el campo no se muestra**. Sin texto de reemplazo, sin
   mensaje sustituto: la ausencia se resuelve callando el campo, no llenándolo.

La dirección sigue la misma prelación y la misma regla de rotulación.

Los teléfonos van clickeables (`tel:`). **Un valor que no sea un número atómico no se
renderiza como enlace** — un campo con dos números, con `/` o con texto adentro se muestra
como texto, porque un `tel:` roto es peor que ninguno.

**Verificación:** ningún mensaje del catálogo contiene `[tel]`. Ninguna tarjeta muestra un
número de Gobernación bajo la etiqueta "Capitanía".
