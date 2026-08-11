# TEXTO PROPUESTO PARA `CLAUDE.md` — ENRUTAMIENTO DE HALLAZGOS

> **NO APLICADO.** Este archivo es la propuesta; `CLAUDE.md` no fue tocado.
> Las modificaciones a las reglas las escribe el owner (CLAUDE.md §6, misma
> mecánica que rige para `CONTRATO_MOTOR.md`).
> Fecha: 2026-08-11 · Origen: el ida y vuelta que produjo E0.1.
>
> **Revisión del 2026-08-11 (owner):** texto aprobado con una corrección en la
> línea de los umbrales. Decía que resolvés "todo umbral que salga de una
> medición", y eso daba de más: el umbral de 500 m de corrección de testigos salió
> de una medición y lo decidió el owner. La línea quedó reescrita abajo separando
> **umbral técnico** —precisión, tolerancia, margen interno— de **umbral que define
> qué se le muestra o se le oculta al patrón**. El resto del texto va tal cual.

## El hueco que se está tapando

`§0` reparte quién decide qué **antes** de empezar, y `§1` fija qué necesita una
propuesta. Ninguno de los dos dice qué hacer con algo que **aparece a mitad del
trabajo y no estaba previsto**. Lo más cercano es `§5.2`, cuyo título —"Si aparece
un error, detente y pregunta"— fija el default en subir todo.

En E0.1 eso costó concreto: subí como pregunta al owner la partición de D7 por
ámbito, la identificación de la bahía 108 y el alcance de la comparación entre
copias. **Las tres eran mías**: ninguna exigía interpretar norma ni fijar política.
La única parte que sí era del owner era qué debe sentir el patrón en cada ámbito, y
llegó mezclada con las otras tres.

## Cambio 1 — nueva `§0.4`, después de `§0.3` y antes del separador de `§1`

Va en `§0` porque `§0` es la sección de quién decide qué, y lo que falta es
justamente una regla de reparto. Va **después** de 0.3 porque 0.1–0.3 hablan de
proponer y esta habla de enrutar.

---

### 0.4 — Un hallazgo nuevo se enruta por su naturaleza, no por su tamaño

Cuando a mitad del trabajo aparece algo que no estaba previsto, **no se sube por
defecto**. Se enruta:

- **Sube al owner** si resolverlo exige **interpretar una fuente normativa** o
  **fijar política de producto** — qué debe ver, sentir o poder hacer el patrón.
  Esas dos cosas no son tuyas aunque el arreglo sea de una línea.
- **Lo resolvés vos** todo lo demás: estructura del dato, arquitectura, método,
  alcance, orden de ejecución, y los **umbrales técnicos** —precisión, tolerancia,
  margen interno—, que son los que no cambian nada de lo que el patrón ve. Y lo
  reportás **resuelto**, no como pregunta, por grande que haya sido el hallazgo.

  **Un umbral deja de ser técnico en cuanto decide qué se le muestra o se le
  oculta al patrón**, y ahí es del owner por impecable que sea la medición de la
  que salió. La prueba es esa, no el origen del número: si moverlo cambia lo que
  el patrón ve, no es tuyo. El umbral de 500 m para corregir testigos salió de una
  medición y lo decidió el owner, porque definía qué jurisdicciones quedaban sin
  verificar.

**Si dudás de qué lado cae, resolvelo y declará el criterio que usaste.** El owner
lo revoca si corresponde. Preguntar lo que podías contestar cuesta un viaje de ida
y vuelta y le devuelve al owner una decisión que no es suya; un criterio declarado
que estaba mal cuesta una corrección y deja escrito cómo se razonó.

**Resuelto no es silencioso.** Todo hallazgo que se resuelve de este lado queda
escrito con su medición y con dónde aterrizó: etapa del plan, deuda declarada, o
cambio hecho. Si no queda registro, no se resolvió — se ocultó, que es el modo de
falla que este archivo persigue en todas sus otras reglas.

**Un hallazgo que cambia el sentido de lo que se está haciendo se reporta igual, en
el momento, aunque su resolución sea tuya** (§5.2). Enrutarlo no es guardárselo.

---

## Cambio 2 — una línea al pie de `§5.2`, para que no se lean en contra

`§5.2` queda como está; solo se le agrega el último párrafo, que la acota:

---

### 5.2 — Si aparece un error, detente y pregunta

No completes una fase para reportar al final que el resultado no sirve. Si a mitad
de camino aparece algo que invalida lo que viene, se para ahí.

**Esto es sobre lo que invalida el trabajo, no sobre cualquier hallazgo.** El
enrutamiento de un hallazgo nuevo lo fija §0.4: detenerse es para cuando seguir
produciría trabajo que hay que tirar, no para cada cosa no prevista que aparece.

---

## Por qué el criterio es por naturaleza y no por tamaño

Porque el tamaño no dice de quién es la decisión. Dos casos reales de E0.1:

- **Grande y mío:** el control comparaba las copias del catálogo por membresía y no
  por contenido. Rehacer esa parte tocó el módulo, el script, la declaración y la
  prueba de mordida. Nada de eso exige interpretar norma ni fijar política.
- **Chico y del owner:** atribuirle una Capitanía a la bahía 257 es escribir una
  línea en un JSON. Es adjudicación sobre el D.S. 991 y no es mía.

Un criterio por tamaño habría enrutado los dos al revés.
