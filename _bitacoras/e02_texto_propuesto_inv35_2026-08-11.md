# Texto propuesto para INV-3.5 — sumar el ámbito antártico

**Fecha:** 2026-08-11 · **Origen:** E0.2, camino **P1** aprobado por el dueño del producto.

> **Este archivo NO modifica `CONTRATO_MOTOR.md`.** Por CLAUDE.md §6 el contrato lo
> escribe el owner; acá se propone el texto y se muestra antes. El agente no lo tocó.

---

## Por qué

El insumo del decreto tiene **cuatro** ámbitos y el contrato nombra **tres**. Verificado
por búsqueda sobre el archivo completo: la palabra `antártic*` no aparece en ninguna
parte de `CONTRATO_MOTOR.md`.

| ámbito | jurisdicciones | ¿lo nombra INV-3.5? |
|---|---:|---|
| maritima | 52 | sí |
| lacustre | 6 | sí |
| insular_remota | 2 | sí |
| **antartica** | **4** | **no** |

Las cuatro antárticas no son un caso de borde: `bahia_fildes`, `puerto_soberania`,
`rada_covadonga` y `bahia_paraiso`, todas con `participa_matching = true`, receta
`anillo`, y **el D.S. 991 las define con coordenadas explícitas** bajo la Gobernación
Marítima Antártica Chilena. Ejemplo literal del insumo (`rada_covadonga`):

> "Area delimitada por las lineas imaginarias que unen: 61 30 00 S / 053 00 00 W;
> 62 50 00 S / 059 16 00 W; 70 00 00 S / 053 00 00 W; 61 30 00 S / 053 00 00 W."

El decreto no las omite. El contrato sí, y por eso el registro de ámbitos tendría que
declarar el estado de una categoría que su propia autoridad no reconoce.

**Medido el 2026-08-11:** la capa vigente cubre **0,0000 km²** de sus 1.357.463 km², con
la cobertura más cercana entre 453 y 807 km. Una ruta antártica real entre dos bahías
publicadas por SITPORT (139 Fildes → 231 Chile, 47,57 km) cae entera fuera de toda
jurisdicción.

## Cambio propuesto — aditivo, mínimo

Se toca **el título y la primera línea**, y se suman **una línea de base** y **una de
verificación**. El resto de INV-3.5 queda intacto: no se altera nada de lo lacustre.

### Antes

```
### INV-3.5 — Ámbito marítimo y ámbito lacustre
Las jurisdicciones tienen ámbito **marítimo**, **lacustre** o **insular remoto**. Las
lacustres son jurisdicciones plenas, con Capitanía, condición de puerto y usuarios reales
(deportivos y transporte). NO se excluyen del motor.

- **Base:** D.S. 991 Art. 2 (las jurisdicciones comprenden lagos y ríos navegables).
```

### Después

```
### INV-3.5 — Ámbitos de jurisdicción
Las jurisdicciones tienen ámbito **marítimo**, **lacustre**, **insular remoto** o
**antártico**. Las lacustres son jurisdicciones plenas, con Capitanía, condición de
puerto y usuarios reales (deportivos y transporte). NO se excluyen del motor.

- **Base:** D.S. 991 Art. 2 (las jurisdicciones comprenden lagos y ríos navegables).
- **Base del ámbito antártico:** el D.S. 991 fija con coordenadas las jurisdicciones de
  Bahía Fildes, Puerto Soberanía, Rada Covadonga y Bahía Paraíso, bajo la Gobernación
  Marítima Antártica Chilena. Se nombran acá porque el ámbito existe en el decreto y su
  ausencia de esta lista obligaba al motor a tratar cuatro jurisdicciones reales como una
  categoría sin respaldo contractual.
- **El ámbito es una partición, no una etiqueta:** toda jurisdicción tiene exactamente un
  ámbito, y el conjunto de ámbitos de este invariante es cerrado. Un ámbito nuevo en el
  archivo fuente que no esté acá es un fallo, no un dato que el motor deba acomodar.
```

Y en la lista de verificación de INV-3.5, se suma una línea:

```
- **Verificación:** ninguna jurisdicción de ámbito lacustre puede quedar con geometría
  vacía tras la construcción.
- **Verificación:** todo ámbito del archivo fuente tiene entrada en el registro de ámbitos
  publicados, y todo ámbito publicado está completo dentro de su propio ámbito. Un ámbito
  sin construir es una carencia declarada (INV-3.6 causa a), nunca un silencio.
```

## Lo que este cambio NO hace

- **No cambia ninguna bandera.** Medido después de construir E0.2 sobre 10 rutas (las 8
  reales del motor de ruteo más una lacustre y una antártica): **0 cambios de bandera**.
- **No promete cobertura antártica.** El ámbito queda declarado **no publicado** con su
  causa escrita en `ambitos_publicados.json`. Ninguna etapa del plan lo construye hoy: E3
  es lacustre y E4 es marítima.
- **No permite nombrar una Capitanía antártica.** Medido: **0 de 4** resuelven contacto
  contra el mapa operativo, así que su aviso deriva a VHF Canal 16, igual que hoy.
- **No toca el §10.** La fila "Jurisdicción sin límite cargado" ya cubre el mensaje y ya
  está declarada como la única sin cita.

## Alternativas descartadas, con su motivo

- **Plegar las cuatro a "insular remoto"** (camino P3): más barato, no toca el contrato.
  Descartado por el owner y por el agente: una base antártica continental no es una isla
  remota, y forzar la categoría mete una imprecisión en el dato fuente, que es
  exactamente lo que INV-3.7 persigue.
- **Declararlas fuera del alcance del motor** (camino P2): una ruta que cae ahí necesita
  respuesta igual —hoy caen 47,57 km medidos—, así que el registro las necesita de todos
  modos. Más costo, mismo resultado operativo.

## Estado

`data/decreto/ambitos_publicados.json` declara hoy la entrada antártica con
`"categoria_contractual": "pendiente"` y su nota apuntando a este archivo. Ese campo pasa
a `"declarada"` cuando el owner incorpore el texto al contrato. La entrada existe desde ya
a propósito: omitirla hasta que el contrato la recoja devolvería el ámbito al silencio,
que es lo que E0.2 existe para terminar.
