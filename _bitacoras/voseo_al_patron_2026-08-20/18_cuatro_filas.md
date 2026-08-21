# CUATRO FILAS QUE SALIERON DE APLICAR EL §10

Sesión `voseo_al_patron_2026-08-20`. Las cuatro se buscaron **antes** de escribir
en el contrato, no después. **Ninguna se aplicó.**

## ⚠ POR QUÉ NO ESTÁN YA EN `deudas_declaradas.json`

Porque **no se puede escribir ahí ahora mismo**: una segunda sesión del owner
tiene ese fichero *stageado* en el índice compartido del repositorio, con su
propia fila adentro (80 deudas en el índice contra las 77 del último commit).
Agregar las cuatro al fichero en disco las metería dentro del commit de esa otra
sesión.

Van en `18_cuatro_filas.json`, con la forma exacta que el validador exige, para
insertarlas cuando la otra sesión haya aterrizado. **Quien las inserte tiene que
correr `node scripts/validar_deudas_declaradas.js` después**: no pasaron por el
validador, porque el fichero contra el que corre está tomado.

Las cuatro son `grupo 1`, firmadas, `redactada_no_aplicada: true`.

---

## H1 · El contrato se cita a sí mismo y nadie vigila esa cita

**El hueco importa más que la línea**, y va dicho así en la fila: existe un
control que vigila que el *dato* no diverja del contrato — `cotejo-contrato.js`,
nacido de una divergencia real del 2026-08-13 — y **no existe ninguno que vigile
que el contrato no diverja de sí mismo**. `npm test` da 157/157 con la
contradicción adentro. Medido.

**Texto redactado para tu aprobación** — `CONTRATO_MOTOR.md`, INV-3.2, última
frase del párrafo de Capa 2:

    - alternativo. Mensaje inequívoco ("Tu embarcación NO puede transitar" vs "No afectada").
    + alternativo. Mensaje inequívoco ("Su embarcación NO puede transitar" vs "No afectada").

## H2 · INV-3.6 transcribe la v1.7 y trae el teléfono que INV-10.1 sacó

Preexistente en su mitad grave. **Son dos divergencias, no una:** el verbo
(`verifica` contra `Confirme`) y el **teléfono**. La del teléfono nace de la v1.8
del 2026-08-13 y es la que muerde: INV-10.1, del mismo contrato, dice que el
contacto va **sólo** en zarpe y recalada y **nunca** dentro de un mensaje
normativo — y INV-3.6 muestra un mensaje normativo con teléfono adentro.

El PLAN tiene anotada esta misma clase de deuda para `zonas_aviso.json`, y esa ya
se cerró. **La del propio contrato no está anotada en ningún lado.**

**Texto redactado para tu aprobación** — `CONTRATO_MOTOR.md`, INV-3.6:

    - en una zona sin geometría cargada, se informa: "No tenemos cargado el límite de esta
    - jurisdicción — verifica con la Capitanía [nombre]: [teléfono]".
    + en una zona sin geometría cargada, se informa: "No tenemos cargado el límite de esta
    + jurisdicción. Confirme con la Capitanía [nombre] antes de zarpar."

*(el teléfono sale por INV-10.1, y el texto pasa a citar el §10 vigente)*

## H3 · Tuteo al patrón dentro del contrato y fuera del §10

**Queda afuera por alcance, no por criterio** — tu decisión fue «usted en todos»;
lo que cerró el alcance de esta pieza fue el §10 y su espejo.

Y hay algo que esta fila destapa y que no es de redacción: **INV-4.7 es un
mensaje al patrón con su propia norma citada (CIRC A-41/014 C.2) que vive fuera
del catálogo.** O sea que **el §10 no es la única fuente de mensajes del
contrato** — y la Regla de uso del §10 afirma que sí lo es.

Denominador: líneas entrecomilladas fuera del §10 con marca de segunda persona,
**cinco**; de ellas **tres** son mensaje al patrón — H1, H2 y ésta. **Lo que no se
midió:** un mensaje sin comillas no cae en ese barrido.

**Texto redactado para tu aprobación** — `CONTRATO_MOTOR.md`, INV-4.7:

    - muestra un aviso informativo: "Tu embarcación está eximida de matrícula (CIRC A-41/014 C.2);
    + muestra un aviso informativo: "Su embarcación está eximida de matrícula (CIRC A-41/014 C.2);

## PLAN · `PLAN_JURISDICCION.md`, tabla «La distancia entre el código y INV-10.1»

Fuera de lo autorizado, anotada. **Sus dos mitades son falsas por motivos
distintos**: la primera —que el dato transcribe la v1.7 con `{telefono}`— ya lo
era antes de esta sesión, porque eso se arregló; la segunda —que el §10 dice
`Confirma`— la hizo falsa este commit.

Por eso el `costo_estimado` no dice «corregir esa fila» sino **releer la tabla
entera**: si una fila envejeció por arreglo y otra por cambio, las demás pueden
estar igual y nadie las midió.
