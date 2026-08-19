#### El frente de CIERRE — Tramos A y B cerrados, Tramo C abierto, y no cabe en E0–E6

> **Anotado acá el 2026-08-19.** Bitácoras de origen, en
> `_bitacoras/cableo_cierre_2026-08-17/`: `cableo_cierre_2026-08-17.txt` (Tramo A, y el marco
> del frente) y `tramo_b_render_2026-08-17.txt` (Tramo B). El lado backend —el derivador de
> cierre— es anterior y tiene las suyas en `_bitacoras/derivacion_cierre_2026-08-16/` y
> `_bitacoras/cierre_observacion_2026-08-16/`.

**La escritura de los dos tramos cerrados es de `tmarea-pwa`, no de este repositorio, y por eso
los sha van con su repo delante:** un sha pelado acá no resuelve, y una cita que no resuelve es
una cita falsa. Las dos bitácoras declaran además que **el backend no puso ninguna pieza de
código** en ninguno de los dos tramos — la del Tramo B lo verifica por tree-sha.

| tramo | estado | commit |
|---|---|---|
| **Tramo A** | **cerrado** — el aviso de cierre se engancha al estado y deja de morir en el pasamanos | `tmarea-pwa@a478518` |
| **Tramo B** | **cerrado** — el aviso nombra el hecho: un bloque por hecho y no por copia | `tmarea-pwa@6443178` |
| **Tramo C** | **ABIERTO — sin commit, sin escritura, no arrancó** | — |

**Qué tiene abierto al Tramo C — son DOS bloqueos, cada uno con su fecha, y el primero ya no
rige:**

1. **El declarado en origen, y CAYÓ.** `cableo_cierre_2026-08-17.txt` §6, textual: *«TRAMO C
   (después, no ahora): el camino de zarpe, con Z-C1..Z-C5 y sus mordidas. **NO ARRANCA hasta
   que esté resuelto el filtro de `sitport-routes.js:333-338`**»*. Ese filtro **dejó de existir
   el 2026-08-18 con F2**: medido sobre `src/` recursivo, `includes(w` pasa de **2 a 0**
   ocurrencias entre `2bd0ff6^` y `2bd0ff6`, y las dos apariciones que quedan de
   `resolverBahiaIdPorNombre` son comentarios que describen su retiro. El bloqueo de origen
   queda registrado porque es el que su bitácora escribió; **ya no es el que rige**.
2. **El que rige hoy: falta el instrumento sucesor de los cuatro guards.** Declarado en
   `b1a_redondeo_del_join_2026-08-18.txt` —*«EL INSTRUMENTO SUCESOR SIGUE ABIERTO: requisito
   del Tramo C»*, y en su lista de deudas como `D-4 (parcial)`— y repetido en
   `f2_medicion_y_decisiones_2026-08-18.txt` entre las piezas no empezadas. Es **la misma
   deuda** que cuelga del frente del filtro, arriba: los dos frentes son distintos y no son
   independientes.

**El Tramo C se describe acá por su ESTADO, y no por lo que hará.** Este apartado **no
caracteriza su alcance**, y la omisión es deliberada: hay una **pregunta normativa abierta**
entre `D-C9` —la decisión del frente de cierre sobre el zarpe, escrita en
`cableo_cierre_2026-08-17.txt` §5— y el alcance del Tramo C. **La contesta el owner**, y no
entra a un documento que gobierna sin su firma. Los insumos crudos para que se pueda contestar
—sin interpretación y sin recomendación de alcance— están levantados en
`_bitacoras/frentes_laterales_2026-08-19/insumos_zarpe_2026-08-19.md`.

**Por qué no va dentro de E0–E6, y no es una omisión que haya que corregir metiéndolo:** este
plan construye **quién tiene jurisdicción**, y su entregable es una capa. El frente de cierre
**no construye ninguna capa y no toca ninguna geometría**: toma un estado ya derivado de un
texto de SITPORT y decide **qué dice la pantalla** de ese estado. Su archivo autorizado es un
componente de la PWA, su autoridad es `CONTRATO_MOTOR.md`, y sus decisiones se numeran `D-C<n>`
en una serie propia que este plan no gobierna. Ninguna etapa de E0–E8 tiene ese entregable, y
forzarle un número de etapa haría que este plan pasara a reclamar el render — que es
exactamente el modo de falla que este apartado existe para evitar.

**Dónde vive, entonces:** frente propio, con escritura en `tmarea-pwa` y bitácoras en este repo
por precedente —*«todas las bitácoras del proyecto están en `tmarea-backend/_bitacoras/`»*,
`cableo_cierre_2026-08-17.txt`—. No necesita etapa acá; necesita que este plan **no lo
reclame**.

### 7.2 Control del estado del plan — DECIDIDO (camino A), pendiente de implementar
