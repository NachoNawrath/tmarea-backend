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

Versión: 1.4
Última actualización: 2026-08-07
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
| Capitanía por bahía | `bahia-capitania-map.json` (163 bahías → gobernación + teléfono) | OK |
| Mareas | Motor harmónico propio (`tidal-constants.json`, 21 estaciones) | OK |
| Ruteo | Raster A* (5 tiles, Arica–Cabo de Hornos) | OK con bugs de snap |
| **SST (temperatura agua)** | Open-Meteo Marine (`sea_surface_temperature`) | OK — real |
| **Clorofila** | `_estimarClorofila()` — proxy por zona biogeográfica | ⚠️ ESTIMADO |
| Conocimiento de especies | `especies_pesca.json` | OK (encoding roto, cosmético) |
| **Caladeros de pesca** | ❌ NO EXISTE fuente en backend | ❌ FALTA |
| **Umbrales AB de mal tiempo** | Resoluciones locales de Capitanía vía SITPORT | Jurisdiccional |

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

Descartado del MVP: índice de riesgo ponderado (IRO) y arquitectura de "4 dimensiones".

---

## 9. PENDIENTES DE UI / TEXTOS (lista aparte, no tocan el motor)

Cambios de copy y pantallas (P0 Bienvenida, P0.1 T&C, P1 perfil, P1.1 nave, P2 navegación)
viven en la lista de pendientes de UI del dueño de producto. No van en este contrato.

---

## 10. CATÁLOGO DE MENSAJES NORMATIVOS (doble capa — INV-1.3)

Fuente única de mensajes que Claude Code debe usar. Cada uno: Capa 1 (estado) + Capa 2
(vía normativa con cita). NO inventar citas fuera de este catálogo.

| Situación | Capa 1 (estado) | Capa 2 (vía normativa + cita) |
|---|---|---|
| **Zarpe cerrado** | 🔴 U+V "Puerto de zarpe cerrado. Navegación no recomendada." | "Según D.S. 364 (RRDN) Art. 36, en caso de mal tiempo con puerto cerrado la Autoridad Marítima puede autorizar el zarpe a la gira hacia un puerto próximo del litoral, si aseguras que la nave está en condiciones y te responsabilizas. Coordina con la Capitanía [nombre]: [tel]." |
| **Recalada cerrada (en puerto)** | 🟡 U "Puerto de recalada cerrado." | "Según D.S. 364 Art. 16, si debes cambiar el puerto de recalada, solicita permiso a la Autoridad Marítima con anticipación. Podría exigirse declarar puerto alternativo." |
| **Recalada cierra en tránsito** | 🟡 U + flag arribadaForzosa | "Según D.L. 2222 Art. 27 y D.S. 364 Art. 17, puedes efectuar arribada forzosa a puerto/lugar distinto del prefijado. Avisa de inmediato a la Autoridad Marítima por VHF Canal 16. Prima la salvaguarda de la vida humana en el mar." |
| **Zona intermedia cerrada** | 🔴 U+V "Tu embarcación NO puede transitar por [zona]." | "Según D.L. 2222 Art. 32, la Autoridad Marítima puede prohibir el tránsito por aguas jurisdiccionales. No ingreses a la zona. Contacta por VHF Canal 16, coordina fondeo de seguridad o recala en puerto alternativo." |
| **Aviso de arribada** | ℹ️ recordatorio | "Según D.S. 364 Art. 13, avisa tu arribada a la Autoridad Marítima con mínimo 24 horas de anticipación." |
| **Zarpe sin despacho (comercial)** | ℹ️ recordatorio | "Según D.L. 2222 Art. 23, zarpar sin despacho se sanciona hasta con la cancelación del título. Gestiona tu despacho antes de navegar." |
| **Deportivo — sin zarpe** | ℹ️ informativo | "Según RGDN (TM-002) Art. 34, tu navegación deportiva nacional no requiere autorización de zarpe. Informa tu intención de movimiento al club náutico o, en su defecto, a la Autoridad Marítima local." |
| **Moto de agua nocturna** | 🟡 U | "Según RGDN Art. 26, las motos de agua solo pueden navegar entre el orto y el ocaso de sol. Tu horario estimado excede la luz diurna." |

**Regla de uso:** Capa 2 nunca cambia la bandera de Capa 1. Todos los teléfonos provienen
de `bahia-capitania-map.json`, clickeables (`tel:`).
