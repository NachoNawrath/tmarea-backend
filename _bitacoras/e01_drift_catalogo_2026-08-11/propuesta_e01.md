# E0.1 — PROPUESTA: QUE EL DRIFT DEL CATÁLOGO NO PUEDA OCURRIR EN SILENCIO

Fecha: 2026-08-11 · Reconocimiento previo: `_bitacoras/e01_drift_catalogo_2026-08-11.txt`
Rige `CONTRATO_MOTOR.md` v1.7, `CLAUDE.md`, `PLAN_JURISDICCION.md` v1.2 (E0.1).
Shell de los comandos reproducibles: **PowerShell** (CLAUDE.md §7.3).

Las tres obligaciones de CLAUDE.md §1, en el orden que manda.

---

## 1. QUÉ DICE LA FUENTE

**No hay norma que decir acá, y eso es exactamente el punto.**

El D.S. 991 fija jurisdicciones de Capitanía. **No define el catálogo de bahías de
SITPORT**: el `IDBahia` es una clave operativa de DIRECTEMAR, sin respaldo en el
decreto ni en ningún cuerpo legal de los que el contrato lista. Buscar el artículo
que obligue a SITPORT a mantener un catálogo estable sería fabricar autoridad
(CLAUDE.md §1.1). No lo hay.

Lo que la fuente publica, medido el 2026-08-11 (`01_recon.txt`):

| endpoint | qué devuelve | campo de id | nombre de bahía |
|---|---|---|---|
| `consultaBahias` | 164 registros | `IDBahia` | `NMBahia` |
| `consultaRestricciones` | 39 registros / 24 bahías | `bahia` | `GLBahia` |
| `Totalpronostico` | 48 registros / 46 bahías | `idBahia` | **ninguno** |

**Garantías que ofrece: ninguna, y hay prueba de que no las cumple.**

1. **No versiona el catálogo.** No hay campo de versión, fecha ni ETag.
2. **No avisa un alta ni una baja.** La bahía 257 apareció y nos enteramos contándola.
3. **Su propio endpoint de catálogo no cubre los ids que usa.** `Totalpronostico`
   publica el id **108**, que `consultaBahias` **no lista**. Medido, no argumentado.
   Es la garantía más fuerte que uno esperaría de un endpoint llamado "consultaBahias"
   y no se cumple.
4. **No nombra la bahía en el pronóstico.** Un id nuevo llega sin nombre, así que ni
   siquiera se puede saber qué es sin cruzar contra otro endpoint que puede no tenerlo.
5. **El feed se mueve solo.** Entre el inventario del 10-AGO (52 restricciones / 36
   bahías) y hoy (39 / 24) cambió entero en un día.

Lo único que sí rige es del contrato, no de la fuente: **INV-3.6** — una carencia no
se resuelve en silencio — y **S9** del plan — ninguna restricción publicada por
SITPORT desaparece sin registro.

---

## 2. QUÉ MIDE EL DATO HOY Y QUÉ NO MIDE

### Lo que mide

**Casi nada, y lo poco que mide no es un control.**

`scripts/fase5_inventario_insumos.js:173` imprime qué ids de `consultaRestricciones`
no están en `bahias_sitport`. Es la única comparación que existe en todo el repositorio.
Sus tres límites, medidos y no supuestos:

- **No falla.** Es un informe con `console.log`; no tiene código de salida por hallazgo.
  Nada se rompe si el número cambia.
- **Compara contra la fuente equivocada.** Mira `bahias_sitport` (F4). Quien descarta
  es `BAHIA_COORDS` (F1), en `sitport-routes.js`.
- **Mira un solo endpoint.** Solo `consultaRestricciones`. **Con ese alcance no habría
  cazado ninguna de las dos divergencias vivas de hoy**: la 257 está en `consultaBahias`
  y la 108 en `Totalpronostico`.

Y se corre a mano.

### Lo que no mide

Los cuatro puntos donde el dato se cae, ninguno con rastro (detalle y líneas exactas
en el §3 del reconocimiento):

| | dónde | qué descarta | rastro |
|---|---|---|---|
| D1 | `sitport-routes.js:664` | restricción cuya bahía no tiene celda | ninguno |
| D2 | `sitport-routes.js:666` | restricción cuya bahía no está en `BAHIA_COORDS` | ninguno |
| D3 | `sitport-routes.js:383` | pronóstico cuya bahía no está en `BAHIA_COORDS` | ninguno |
| D4 | `capitanias.js:getCapitaniaByBahiaId` | resuelve a `'Desconocida'` | ninguno |

El único contador del flujo, `bahiasOmitidas`, cuenta otra cosa (dato malformado en
try/catch) y ni siquiera sale en la respuesta: muere en una línea de consola.

**Y no mide la coherencia interna.** El catálogo está en cuatro copias —`BAHIA_COORDS`
en `sitport-routes.js`, otra copia literal en `seed-bahias-sitport.js`,
`bahia-capitania-map.json`, y la tabla `bahias_sitport`— y nada verifica que sigan
iguales. Hoy lo están (163/163/163/163, F1 y F2 idénticas byte a byte); que lo estén
es suerte, no una propiedad garantizada.

### El caso que rompería mi propio fundamento, buscado a propósito (§1.2)

El fundamento es "el drift produce falsos negativos". Lo que lo rompería es que el
drift fuera inocuo. **Lo medí y no lo es, pero el resultado no es el que esperaba el
plan:** Río Cochrane hoy **no publica restricción** (0 de 39), así que hoy no está
callando nada. Si la medición terminara ahí, el caso sería teórico.

No termina ahí: **el id 108 sí está publicando dato ahora mismo** (pronóstico de las
13:32 UTC, 6,6 °C, viento 4,6 nudos) y `/weather-ruta` lo descarta en **cada llamada**.
El falso negativo vivo no es el que el plan tenía anotado. Es otro, y se encontró
porque el control mira los tres endpoints y no solo el catálogo.

**No determinado:** desde cuándo aparece el 108 y qué bahía es. `Totalpronostico` no
trae nombre, `consultaBahias` no lo lista, y no hay captura previa de ese endpoint en
el repositorio contra la cual fecharlo. No se sustituye por una suposición (§3.2).

---

## 3. QUÉ OPCIONES HAY PARA DETECTAR LA DIVERGENCIA, CON SU COSTO

Las cuatro son sobre **dónde vive la detección**. Ninguna toca el motor de reglas.

### O1 — Resincronizar el catálogo y seguir

Agregar la 257 (y la 108 cuando se sepa qué es) y cerrar el asunto.
**Costo:** una hora. **Lo que gana:** los dos falsos negativos de hoy.
**Lo que pierde:** todo lo demás. La divergencia vuelve el día que SITPORT se mueva y
nadie se entera. **Es el riesgo que el §6 del plan ya nombra.** *Descartada — no
resuelve el problema enunciado, resuelve su síntoma de hoy.*

### O2 — Control ejecutable, con declaración de lo conocido ← **RECOMENDADA, e implementada**

Un script que compara **las cuatro fuentes internas contra la unión de los tres
endpoints de SITPORT**, en las dos direcciones y contra sí mismas, lista toda
divergencia, y **falla con código de salida ≠ 0**. Lo conocido se declara en un dato
(`data/catalogo/divergencias_declaradas.json`) con causa y fecha; declarar **no
silencia**, solo distingue "esto es nuevo" de "esto ya lo vimos".

**Costo:** ya pagado. `src/services/catalogo-bahias.js` + `scripts/e01_control_drift_catalogo.js`
+ `scripts/e01_prueba_mordida_drift.js`. Requiere red; para F4, base levantada.
Corre en ~2 s.
**Lo que gana:** la divergencia deja de ser invisible, en las dos direcciones y en las
cuatro clases; se prueba contra insumo alterado; es reproducible desde el repositorio.
**Lo que pierde:** **es un script. Alguien tiene que correrlo.** Ver §4 — esa es
exactamente la decisión abierta.

### O3 — Detección en línea, dentro del endpoint

Que `restricciones-ruta` y `weather-ruta` cuenten y devuelvan lo que descartan.
**Costo:** tocar `sitport-routes.js` en los tres puntos de descarte y agregar un campo
a la respuesta. Bajo, pero **es tocar el flujo de producción, y qué hace el motor con
eso es precisamente lo que está sin decidir**.
**Lo que gana:** el rastro aparece en la respuesta real, por ruta y por llamada.
**Lo que pierde:** solo ve lo que la ruta cruza. Una bahía nueva en Arica no se detecta
hasta que alguien navegue por Arica. **No es sustituto de O2, es complemento.**

### O4 — Sonda periódica con histórico

Cron que corre O2 cada N horas y versiona la captura, como `_sondeo_cadencia/`.
**Costo:** el de O2 más un job y disco. **Lo que gana:** fecha de aparición y de baja
de cada id — que es justo lo que hoy falta para el 108. **Lo que pierde:** infra que
mantener; y sin O2 no tiene qué correr.

**Recomendación: O2 ahora (hecho), O4 después si el owner quiere fechar los cambios,
O3 solo cuando esté decidido el §4. O1 descartada.**

---

## 4. PREGUNTA EXPLÍCITA PARA EL OWNER — esta decisión no la tomo yo

El control detecta y reporta. **Qué debe hacer el motor cuando detecta drift está sin
decidir, y no lo implementé.** La pregunta es:

> **Cuando SITPORT publica una bahía que nuestro catálogo no tiene, ¿qué tiene que
> pasar en el producto?**

Cuatro caminos, con lo que cuesta cada uno. No son excluyentes de a pares.

| | qué hace el motor | qué ve el patrón | costo | riesgo |
|---|---|---|---|---|
| **A** | nada en runtime; el control corre fuera (cron / arranque / CI) y avisa al equipo | nada distinto | ya pagado + donde se enganche | el falso negativo sigue vivo hasta que alguien lo arregle |
| **B** | el endpoint cuenta lo descartado y lo devuelve en un campo; la UI no cambia | nada distinto | O3, bajo | queda registrado y nadie lo mira |
| **C** | una bahía desconocida en la ruta escala el veredicto a **U** con aviso propio, como INV-3.6 | "hay una zona sobre la que no podemos responder" | O3 + tocar el compositor de veredicto | ruido si SITPORT agrega bahías seguido |
| **D** | el backend se niega a arrancar con drift no declarado | nada, o todo caído | bajo de código, alto de operación | un cambio de SITPORT tumba el servicio |

**Mi recomendación: A + B ahora, y C cuando R1 pieza 4 esté.** Razón: **C es
literalmente el caso de INV-3.6** —una zona sobre la que el motor no puede responder,
bandera U con tope duro— y ya hay una tubería construida para eso
(`cobertura-jurisdiccional.js`, aplicada y en observación). Meterle una segunda causa
antes de cerrar la primera duplica el mecanismo. **D la desaconsejo**: convierte un
cambio en una fuente externa que no controlamos en una caída del servicio, y la
ausencia de dato no justifica negar el servicio entero — es el mismo razonamiento por
el que INV-3.6 topa la bandera en U y no en U+V.

**Lo que la respuesta cambia:** si es A, esto queda como está y solo hay que elegir
dónde engancharlo. Si es B o C, hay que tocar `sitport-routes.js`, que es flujo de
producción y no se hace sin autorización.

### Y una segunda decisión, que también es suya

**Río Cochrane no la agrego yo.** Incorporar la 257 exige atribuirle Capitanía, y eso
es adjudicación sobre el D.S. 991 — decisión del owner por CLAUDE.md §0 y D1 del plan.
Lo mismo con la 108, que además **no se sabe qué bahía es**. Quedan las dos declaradas
como abiertas, listadas en cada corrida, con su causa escrita.

---

## 5. LO QUE SE CONSTRUYÓ, Y LA PRUEBA DE QUE PUEDE FALLAR

```
src/services/catalogo-bahias.js              lógica pura: lee las fuentes, arma el
                                             universo de SITPORT, clasifica y cruza
                                             contra la declaración
scripts/e01_control_drift_catalogo.js        el control. Salidas: 0 sin drift ·
                                             1 drift no declarado · 2 no se pudo medir ·
                                             3 drift declarado abierto
scripts/e01_prueba_mordida_drift.js          14 familias + control negativo
data/catalogo/divergencias_declaradas.json   lo conocido, con causa y fecha
```

Cuatro clases de divergencia, ninguna con caso por defecto silencioso (§4.2):
`sitport_sin_catalogo` · `catalogo_sin_sitport` · `incoherencia_interna` ·
`endpoint_fuera_de_catalogo`.

**Tres decisiones de diseño que vale la pena dejar escritas:**

1. **Se compara contra la UNIÓN de los tres endpoints, no contra `consultaBahias`.**
   Porque el 108 demuestra que el catálogo de la fuente no cubre sus propios ids. Un
   control contra el catálogo habría salido limpio con el falso negativo vivo adentro.
2. **Se comparan las cuatro copias internas entre sí**, y cuáles se comparan está
   **declarado en el dato**: si una no se puede leer, el control se detiene en vez de
   compararla contra menos fuentes y salir limpio.
3. **La declaración no puede usarse para tapar.** Exige causa escrita, fecha y clase
   válida; un campo mal escrito es error; y una declaración que sobrevive a su
   divergencia **hace fallar el control** — se retira sola, igual que `zonas_aviso.json`.

### La prueba (§4.6) — salida cruda en `03_prueba_mordida.txt` y `04_control_insumo_alterado.txt`

`mordida 14/14 + control negativo`, sobre un insumo congelado, sin red y sin base.

Y el control corrido de punta a punta contra un **insumo alterado a propósito**
(`insumo_alterado_2026-08-11/`: se agrega la bahía 999 con una restricción publicada
bajo ella, se quita la 71 Arica), regenerable con `alterar_insumo.js`:

```
    id  999  CALETA ALTERADA A PROPOSITO *** NO DECLARADA ***
             visto en consultaBahias, consultaRestricciones
  [catalogo_sin_sitport] una fuente interna tiene un id que SITPORT ya no publica
    id   71  (sin nombre en la fuente) *** NO DECLARADA ***
             presente en F1, F2, F3, F4

total 5 · no declaradas 2 · abiertas 3 · adjudicadas 0 · vencidas 0
VEREDICTO: DRIFT_NO_DECLARADO  (salida 1)
EXIT=1
```

Contra el insumo intacto, el mismo control sale **3** y no **1**: distingue lo nuevo de
lo conocido.

**Solo el 0 es "pasa".** El 3 no es verde: es deuda con nombre y fecha. Quien enganche
esto a un cron o a CI tiene que tratar 1, 2 y 3 como fallo.

---

## 6. CÓMO SE REPRODUCE (PowerShell, terminal del owner)

```
cd C:\Users\katia\tmarea-backend
node scripts\e01_control_drift_catalogo.js
node scripts\e01_prueba_mordida_drift.js
node scripts\e01_control_drift_catalogo.js --insumo _bitacoras\e01_drift_catalogo_2026-08-11\insumo_alterado_2026-08-11
```

El primero necesita red y base. Los otros dos, ni una cosa ni la otra (el tercero sí
la base, porque la declaración real exige comparar F4).

---

## 7. OBJECIONES A LO QUE SE ME PIDIÓ (CLAUDE.md §8.5)

1. **El plan decía "una entrada". Son dos, y la segunda es peor.** El 108 no estaba
   previsto y está descartando dato ahora mismo, mientras que la 257 hoy no publica
   nada. Si E0.1 se hubiera hecho como "agregar la fila de Río Cochrane", el falso
   negativo que sí está activo habría quedado adentro.

2. **El control corre fuera del motor y eso es una limitación real, no una elección
   cómoda.** Un script que nadie corre detecta cero. Lo dejé así a propósito porque
   engancharlo implica decidir el §4, que no me corresponde — pero mientras el §4 no
   se responda, **este control no impide que el drift ocurra en silencio en
   producción: solo permite que alguien lo vea si lo corre.**

3. **`data/catalogo/` es un directorio nuevo.** `zonas_aviso.json` vive en
   `data/decreto/` y este dato no es del decreto. Si preferís otra ubicación, es un
   `mv` y un cambio de ruta por defecto.

4. **D4 (`getCapitaniaByBahiaId` → `'Desconocida'`) sigue igual.** Es un caso por
   defecto silencioso prohibido por §4.2 y lo dejé intacto: está anotado como trabajo
   de E2 en el plan y tocarlo acá era abrir un segundo frente (§5.5).
