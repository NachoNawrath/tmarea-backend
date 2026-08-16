# Texto propuesto para INV-3.6 — el tercer estado

**Lo escribe el owner. Acá va la propuesta y su fundamento.** `CLAUDE.md` §6:
`CONTRATO_MOTOR.md` no se edita desde este lado; se propone el texto y se muestra antes.

---

## Por qué hace falta

INV-3.6 particiona **por jurisdicción**:

> **Dos causas, un mensaje, dos registros:** un punto de la ruta que no resuelve jurisdicción
> puede venir de (a) **una jurisdicción declarada sin geometría** [...] o de (b) un **hueco de
> la propia capa**, una zona que **ninguna jurisdicción reclama**.

Una jurisdicción construida hasta un alcance declarado —`arica` hasta 24 mn— no entra en
ninguna de las dos:

- **no es (a)**, porque (a) exige *"jurisdicción declarada sin geometría"* y ésta **tiene**
  geometría;
- **bajo el texto literal es (b)**, porque el agua entre 24 y 200 mn efectivamente **no la
  reclama ninguna jurisdicción** — y (b) es, palabra del contrato, *"un defecto de
  construcción nuestro"*.

La decisión del owner del 2026-08-15 es que **es (a)**: el D.S. 991 **guarda silencio absoluto**
sobre el alcance costa afuera de todas sus Capitanías, y si el decreto no define el borde
exterior no puede haber defecto por no alcanzarlo. **Esa decisión es defendible y el
invariante no la dice hoy.** Sin este párrafo, la implementación sostiene una lectura que el
texto no respalda.

**No alcanza con el precedente de E0.2.** Ahí se agregó el origen `ambito_no_publicado` a la
causa (a) sin tocar el contrato, con el argumento de que *"un ámbito entero que no se
construyó ES exactamente eso — jurisdicciones sin geometría cargada"*. Ese argumento
**sigue siendo granularidad de jurisdicción**. Una jurisdicción construida en parte no.

---

## Texto propuesto

Se agrega **después** del bloque *"Dos causas, un mensaje, dos registros"* y **antes** de
*"Coherencia"*. No modifica ninguna palabra existente.

> - **Una jurisdicción puede estar cargada EN PARTE, y su parte no cubierta es causa (a).**
>   Hasta aquí este invariante supone que una jurisdicción tiene geometría o no la tiene. Hay
>   un tercer estado: **construida hasta un alcance declarado**, con el resto de su territorio
>   **sin cubrir y declarado como tal**. La parte no cubierta se trata como causa **(a)** —
>   estado del mundo, no defecto nuestro — **cuando y sólo cuando** se cumplen las tres cosas:
>   - **el decreto no fija ese borde.** El D.S. 991 **no da el alcance costa afuera de ninguna
>     Capitanía**: su Art. 2 nombra ZEE y plataforma continental sin darles geometría. Un borde
>     que la norma no define no puede producir un defecto de construcción por no alcanzarlo.
>     Donde el decreto **sí** da el límite y la capa no llega, sigue siendo **(b)**.
>   - **el alcance está declarado en el dato fuente**, con su valor, su motivo y quién lo
>     decidió. No es una omisión que se descubre midiendo la figura: es una decisión escrita
>     antes de construir (INV-3.7).
>   - **la carencia se le declara al patrón igual que cualquier otra (a)**, con el mismo
>     mensaje y la misma bandera **U** topada. Una jurisdicción que participa del matching por
>     la parte que sí construyó **no deja de avisar** por la parte que no.
>
>   **Lo que esto NO habilita:** acortar el alcance de una jurisdicción **no** es una forma de
>   convertir un hueco propio en carencia del mundo. Si la geometría no llega a donde el
>   decreto la manda llegar, eso es (b) y se registra como defecto, se declare lo que se
>   declare. La diferencia entre las dos no la decide quién escribe el dato: la decide **si la
>   norma fija ese borde o calla**.
>
>   **Verificación:** toda jurisdicción con alcance declarado menor que el de la capa lleva su
>   declaración en el dato fuente **y** su aviso vigente. Un alcance declarado sin aviso es un
>   falso negativo silencioso y es un fallo, no un resultado. Y ninguna jurisdicción puede
>   declarar un alcance **mayor** que el borde exterior de la capa: eso adjudicaría agua que
>   nadie adjudicó.

---

## Lo que el párrafo le cuesta al contrato

**Le cierra una puerta que hoy está abierta.** El párrafo dice explícitamente que declarar un
alcance **no** es una vía para convertir un defecto propio en carencia del mundo, y ata la
distinción a un hecho comprobable —si la norma fija el borde o calla— y no a lo que escriba
quien completa el dato. Sin esa mitad, el párrafo sería un permiso para que cualquier hueco
se declare (a) y deje de contarse, que es la forma que §0.3 manda mirar primero.

**Y agrega una verificación que puede fallar**: alcance declarado sin aviso vigente = fallo.
Es lo que impide que (a) se implemente como silencio, que es la condición que el owner puso
al decidir.

---

## Estado

- **Propuesto**, no escrito. El contrato sigue en v1.8 sin este párrafo.
- La implementación del Tramo 1 **no depende** de que se escriba: no promueve a ninguna
  jurisdicción al tercer estado. Lo que sí depende es el **Tramo 2**, que es donde `arica`
  pasa a `cerrable_parcial` y la parte no cubierta empieza a declararse.
- Evidencia y medición: `_bitacoras/alcance_costa_afuera_2026-08-15/`.
