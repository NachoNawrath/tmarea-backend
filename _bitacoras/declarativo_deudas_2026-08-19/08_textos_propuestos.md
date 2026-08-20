# TEXTOS PROPUESTOS — REDACTADOS Y NO APLICADOS

Sesión de caracterización de deudas, 2026-08-19. Tramos 1 y 2.

**Ninguno de estos textos se escribió en su fichero.** Esta sesión tenía prohibido
aplicar correcciones y escribir en `CLAUDE.md`. La prohibición es sobre el archivo,
nunca sobre la redacción: una declaración medida como falsa que se queda escrita
porque corregirla estaba fuera de zona es el peor resultado posible de una sesión.

Cada propuesta va con: la afirmación vigente citada literal, la medición que la
contradice con su instrumento y su salida versionada, el texto de reemplazo en la
forma que el archivo exige, las opciones cuando hay más de una, y qué autorización
haría falta para aplicarlo.

---

## P1 · `PLAN_JURISDICCION.md` §1.1 — la fila que declara inexistente una tabla que existe

**Afirmación vigente, literal.** Última fila de la tabla de §1.1 «Base de datos —
PostgreSQL 16.14 / PostGIS 3.5»:

```
| `jurisdicciones_ds991` | — | **NO EXISTE** | | | |
```

**La medición que la contradice.** `node scripts/fase5_inventario_insumos.js`,
corrido el 2026-08-20T00:29:34Z UTC, exit 0. Salida versionada en
`04_inventario_insumos.txt`. Corroborado por `SELECT` sobre `pg_class` en
`02_select_e8.txt`.

`public.jurisdicciones_ds991` **existe**: tabla, 6 filas, geometría
`punto_representativo` en SRID 4326, con índice GIST. Y existen nueve tablas
hermanas que §1.1 no lista.

**Texto de reemplazo.** §3.3 del proyecto pide tachar y fechar, no sobrescribir:

```
| `jurisdicciones_ds991` | tabla | ~~**NO EXISTE**~~ **6** | 0 | 0 | — (punto_representativo) |

> **CORREGIDO 2026-08-19 (§3.3).** La celda decía **NO EXISTE** y es falsa desde
> algún momento entre el 2026-08-10 y hoy — *cuándo dejó de ser cierta no está
> medido*. `jurisdicciones_ds991` existe como tabla con **6 filas** y geometría
> `punto_representativo` en 4326, con índice GIST. **Y no está sola: la acompañan
> NUEVE tablas hermanas que esta sección tampoco lista**, todas medidas el
> 2026-08-19 con `node scripts/fase5_inventario_insumos.js`
> (`_bitacoras/declarativo_deudas_2026-08-19/04_inventario_insumos.txt`):
>
> | relación | filas |
> |---|---:|
> | `jurisdicciones_ds991_areas` | 64 |
> | `jurisdicciones_ds991_convenciones` | 17 |
> | `jurisdicciones_ds991_descartes` | 1 |
> | `jurisdicciones_ds991_ensanche` | 3 |
> | `jurisdicciones_ds991_procedencia` | 9 |
> | `jurisdicciones_ds991_publicacion` | 4 |
> | `jurisdicciones_ds991_sectores` | **0** |
> | `jurisdicciones_ds991_traslape_ensanche` | 12 |
> | `jurisdicciones_ds991_verificacion` | 31 |
>
> **Por qué importa más que un número desactualizado:** esta sección es el
> inventario que el resto del documento usa como base de hecho, y declaraba
> **inexistente la capa del D.S. 991** — la que E4 existe para construir. Las
> otras diez filas de la tabla se remidieron el mismo día y son **exactas**, así
> que lo que envejeció no fue la foto: fue esta celda.
```

**Lo que esta corrección NO afirma, y conviene que quede escrito:** que la tabla
esté cargada no dice nada sobre si su contenido sirve, ni sobre el estado de C3,
ni sobre si el ámbito marítimo está publicado. Sólo dice que existe. Cualquiera
que lea «`jurisdicciones_ds991` existe» y concluya que E4 avanzó estaría leyendo
de más.

**Autorización que haría falta:** commit sobre `PLAN_JURISDICCION.md`, más el bump
de versión del documento y su párrafo en §8.

---

## P2 · `PLAN_JURISDICCION.md` §1.2 — el tamaño del insumo

**Afirmación vigente, literal.** Encabezado de §1.2:

```
### 1.2 Insumo del decreto — `data/decreto/jurisdicciones_v2.json` (324 KB, v2, 2026-08-09)
```

**La medición.** Misma corrida: `archivo : data/decreto/jurisdicciones_v2.json (382 KB)`,
`version / generado : 2 / 2026-08-09`. La versión y la fecha de generación son
correctas; el tamaño no.

**Texto de reemplazo:**

```
### 1.2 Insumo del decreto — `data/decreto/jurisdicciones_v2.json` (~~324~~ **382 KB**, v2, 2026-08-09)
```

**Opción alternativa, declarada y descartada (§0.2):** quitar el tamaño del
encabezado, ya que envejece solo. **Descartada** porque el tamaño es lo que hace
visible que el insumo crecció 58 KB sin que la versión se moviera, y eso es
información, no ruido. Quien prefiera la otra opción está quitando un detector.

**Autorización:** la misma de P1.

---

## P3 · `PLAN_JURISDICCION.md` §3 E8 — el ítem que es una bolsa de dos

**Afirmación vigente, literal.** Tercera entrada de la enumeración de E8:

```
sectores y `AreaRestriccion`
```

**La medición.** `01_medir_e8.txt`. Las dos mitades están en estados **opuestos**:

- `AreaRestriccion` **está consumido en producción** — `src/services/sitport-parser.js`
  lo normaliza a `area` vía `detectarArea()`, y `src/services/cierre-derivador.js`
  lo usa como discriminante con `/DENTRO|FUERA/`; el mismo fichero declara que el
  cierre **no** se infiere de él (INV-0.2).
- `sectores` **no existe como dato** — la tabla `jurisdicciones_ds991_sectores`
  tiene 0 filas, el insumo tiene 0 de 64 jurisdicciones con `sectores` no vacío, y
  `src/` no lo menciona en ningún fichero.

**Texto de reemplazo** (la entrada se parte en dos dentro de la misma enumeración):

```
~~sectores y `AreaRestriccion`~~ · **`sectores`** — el nivel de sector, que
`CONTRATO_MOTOR.md` reconoce y el motor no implementa. La maquinaria existe
entera y **el dato no**: la tabla está creada e indexada con 0 filas, y el insumo
trae 0 de 64. Falta la fuente, no el mecanismo.

> **PARTIDO EN DOS Y TACHADO 2026-08-19 (§3.3).** El ítem juntaba dos sujetos y la
> medición les dio estados **opuestos**, así que un solo estado no podía
> describirlos. **`AreaRestriccion` ya está hecho** y sale de la lista: se consume
> en producción en `src/services/sitport-parser.js` y `src/services/cierre-derivador.js`.
> **`sectores` sigue vivo** y queda arriba con su causa. Mientras estuvieran
> juntos, quien leyera E8 heredaba la impresión de que las dos mitades estaban
> igual de pendientes, y esa impresión era falsa en la mitad. Medición en
> `_bitacoras/declarativo_deudas_2026-08-19/01_medir_e8.txt`.
```

**Autorización:** la misma de P1.

---

## P4 · `PLAN_JURISDICCION.md` §3 E8 — el Art. 2 salió de la lista

**Afirmación vigente, literal.** Primera entrada de la enumeración de E8:

```
Art. 2 del decreto (D6)
```

**La medición.** `01_medir_e8.txt`. `art_2` está en **v1 y v2**, con
`texto_decreto` de 573 caracteres y `procedencia`. Los tres términos que D6
exigía están: `mar territorial` 5, `zona contigua` 5, `plataforma continental` 3,
más `aguas interiores` 6. Control negativo `zona abisal fantasma` 0; control
positivo `capitania` 128. Y §5 ya registra **D6 CERRADA 2026-08-12**.

**Texto de reemplazo:**

```
~~Art. 2 del decreto (D6)~~ **CERRADO el 2026-08-12 con D6, y esta lista no se enteró
durante siete días** ·

> **TACHADO 2026-08-19 (§3.3).** El Art. 2 entró al insumo en `5d62466` y está en
> v1 y en v2. Medido el 2026-08-19 sobre los dos archivos.
> **Esto no es un tachado de trámite:** §5 declaró D6 cerrada el 2026-08-12 y E8
> siguió listándolo como pendiente hasta hoy. Es exactamente la clase de
> desincronización que §7.2 propone cazar, y la cazó seis días tarde y sólo
> porque alguien preguntó por el estado del plan.
```

**Autorización:** la misma de P1.

---

## P5 · `PLAN_JURISDICCION.md` §7.2 — la viñeta de E8

**Afirmación vigente, literal.** Segunda viñeta del recuadro «ANOTADO, NO RESUELTO
— 2026-08-19»:

```
**E8, «deudas declaradas», abierta y sin desglose.** §3 la enumera como bolsa y
**no hay ninguna bitácora de E8**. No está escrito cuántas de sus deudas siguen
vivas.
```

**La medición.** Las tres afirmaciones se contestan el 2026-08-19. Hay desglose:
8 filas en `data/deudas/deudas_declaradas.json` a partir de 7 ítems. Hay bitácora:
`_bitacoras/declarativo_deudas_2026-08-19/`. Y está escrito cuántas siguen vivas:
**6 vivas, 2 caducas**.

**Texto de reemplazo:**

```
- ~~**E8, «deudas declaradas», abierta y sin desglose.** §3 la enumera como bolsa y
  **no hay ninguna bitácora de E8**. No está escrito cuántas de sus deudas siguen
  vivas.~~
  **CONTESTADA EL 2026-08-19 (§3.3), y no por E8: por el declarativo de deudas.**
  E8 queda desglosada en **8 filas** —son 7 ítems y 8 filas porque `sectores` y
  `AreaRestriccion` iban juntos y están en estados opuestos (P3)—, con bitácora
  propia en `_bitacoras/declarativo_deudas_2026-08-19/`. **De las 8: 6 vivas y 2
  caducas.** El desglose no vive acá ni en §3: vive en
  `data/deudas/deudas_declaradas.json`, que es dato y lo lee `npm run deudas`.
  **E8 sigue abierta** — desglosar no es cerrar.
```

**Autorización:** la misma de P1.

---

## P6 · `PLAN_JURISDICCION.md` §7.2 — la viñeta del §1

**Afirmación vigente, literal.** Tercera viñeta del mismo recuadro:

```
**§1, el inventario de insumos: foto del 2026-08-09/10, sin re-comprobar.** El
propio §1 trae el comando que lo refresca (`node scripts/fase5_inventario_insumos.js`)
y **nadie lo volvió a correr**, con diez días de cambios encima.
```

**La medición.** Se corrió. Y el resultado corrige a la propia viñeta: **no había
diez días de cambios encima**. Diez de once filas de §1.1 son exactas; lo que
estaba mal era una sola, y §1.2.

**Texto de reemplazo:**

```
- ~~**§1, el inventario de insumos: foto del 2026-08-09/10, sin re-comprobar.**~~
  **RE-COMPROBADO EL 2026-08-19 (§3.3), y el resultado corrige a esta misma viñeta.**
  Se corrió, exit 0, con SITPORT respondiendo en vivo. **«Diez días de cambios
  encima» resultó en su mayor parte falso:** §1.1 es **exacta en diez de sus once
  filas**. Lo que estaba mal no era la antigüedad de la foto sino **una celda** —la
  que declaraba `jurisdicciones_ds991` **NO EXISTE** cuando existe con 6 filas, ver
  P1— más nueve tablas hermanas sin listar y el tamaño del insumo en §1.2.
  **La corrección está redactada y NO aplicada** en
  `_bitacoras/declarativo_deudas_2026-08-19/08_textos_propuestos.md`.
```

**Autorización:** la misma de P1.

---

## P7 · `CLAUDE.md` §7 — el modo de falla del entorno

> **Esta propuesta es la más grande y es la que el owner difirió explícitamente a
> la sesión siguiente.** Va redactada igual, por §6.1.

**Afirmación vigente.** `CLAUDE.md` §7.2 tiene **un** caso suelto: el `-F -`
alimentado por here-string que mete `EF BB BF` en el asunto del commit, con su
bloque «DEUDA ABIERTA, NO APLICADA» y sus opciones (a)/(b)/(c).

**Lo que la medición agrega.** Son **tres** casos del mismo tipo, no uno, y los
tres se cazaron **sólo por el control positivo**:

| # | el defecto | qué midió de más | cómo se cazó |
|---|---|---|---|
| 1 | `-F -` con here-string | metió BOM en el asunto del commit | mirando el `log`, de casualidad |
| 2 | `--` antes de los operandos | anuló `--exclude-dir` y barrió `node_modules`: `TODO=812` donde la respuesta es `0` | control positivo |
| 3 | heredoc que come un nivel de backslash **aun con `<<'EOF'`** | `'\\t'` y `'\\b'` quedaron como TAB literal y BACKSPACE `0x08`: el contador devolvió **0 de 116** | control positivo |

**Texto propuesto**, para agregar en §7 como apartado nuevo:

```
### 7.4 — Un instrumento que compila y corre no está verificado

Este entorno tiene un modo de falla propio, medido tres veces en dos días: **una
herramienta que compila, corre sin error y devuelve un número plausible mientras
mide algo distinto de lo que dice medir.** Los tres casos son de PowerShell
hablándole a un ejecutable o a un heredoc, y **ninguno de los tres lo cazó una
revisión de código**: los tres los cazó un control positivo.

- **`git commit -F -` alimentado por here-string** mete `EF BB BF` en el asunto.
  La vía limpia es `[System.IO.File]::WriteAllText()` con `UTF8Encoding($false)`
  y `git commit -F <fichero>`. (Medido el 2026-08-19; ver §7.2.)
- **`--` antes de los operandos de `grep`** convierte todo lo que sigue en
  operando, así que un `--exclude-dir` posterior se lee como **nombre de fichero**
  y el barrido entra donde no debía. Medido: `grep -rIw -- "TODO" . --exclude-dir=node_modules`
  devolvió **812** donde la respuesta es **0**.
- **Un heredoc de este entorno se come un nivel de backslash aun con `<<'EOF'`.**
  `'^[ \\t]*'` quedó en disco como `'^[ \t]*'` —TAB literal— y `'\\b'` como
  `'\b'` —BACKSPACE `0x08`—. El instrumento compiló, corrió y devolvió **0
  declaraciones de 116 pares**. Para escribir un fichero con escapes, no se usa
  heredoc: se escribe con una vía que preserve bytes y **se verifica leyendo el
  fichero de vuelta**.

**La regla que sale de los tres, y es más general que cualquiera de ellos:**
**ningún número se publica antes de que su instrumento haya encontrado algo que
se sabe que está.** Un control positivo no es un extra del método: es lo único
que distingue «medí y dio cero» de «mi parser no lo encontró» (§2). Y va **junto
al número**, no en otra sesión.

**Corolario, medido el 2026-08-19 sobre un control propio:** el orden de los
chequeos también miente. Un validador que comprobaba caracteres de control
**después** de parsear reportaba «no es JSON válido» cuando la causa era un
`U+0091` — el síntoma tapando la causa. Un chequeo que puede ser *la causa* de que
otro falle va **antes** que él.
```

**Opciones sobre dónde ponerlo (§0.2):**

- **(a) Apartado nuevo §7.4**, como está arriba, dejando el caso del BOM donde ya
  está y citándolo. **Recomendada:** §7.2 es «convenciones de PowerShell» y esto
  no es una convención, es un modo de falla; mezclarlos entierra la regla dentro
  de una lista de sintaxis.
- **(b)** Ampliar el bloque existente de §7.2. Cuesta menos y deja la regla general
  escondida dentro del caso particular del BOM.
- **(c)** Ponerlo en §4.6 («un control tiene que poder fallar»), que es su hermano
  conceptual. **Descartada:** §4.6 es sobre cómo se construye un control, y esto es
  sobre el entorno donde corre. Mezclarlos haría pensar que sólo aplica a los
  controles, cuando el caso 2 fue un `grep` de reconocimiento.

**Autorización que haría falta:** commit sobre `CLAUDE.md`. El owner ya declaró
que escribir la regla es **la sesión siguiente**, así que esto queda redactado y
esperando.

---

## P8 · Las dos citas cruzadas entre repositorios por número de línea

**Afirmación vigente, literal.** En `tmarea-pwa/src/hooks/useVoyageVerification.js`:

```
// zarpe de contrabando, sin instrumento y con el sobre-alcance del filtro de
// puerto vivo (backend `sitport-routes.js:333-338`, subcadena y no palabra).
```

Y en `tmarea-pwa/src/screens/P3_VoyageVerification.jsx`:

```
// `tmarea-backend/_bitacoras/rotulo_p2_2026-08-16/01_medir_rotulo_p2.txt`.
```

**Por qué es deuda.** El proyecto exige citar **por sección y texto, nunca por
número de línea**. Estas dos citan por línea **y** cruzan de repositorio, que es
la combinación que se rompe más rápido: un commit en el backend las deja
apuntando a otra cosa **sin que nada avise**.

**Lo que esta sesión NO midió, y se declara en vez de suponerlo:** si las líneas
`333-338` de `sitport-routes.js` siguen conteniendo lo que la cita dice. Eso es
del sitio `PWA-COMENTARIOS`, que está en `barrido: false` y es del 3er tramo.
Proponer el texto de reemplazo **antes** de esa medición sería escribir una cita
nueva sin saber si la vieja apunta a algo.

**Forma del reemplazo, cuando se mida:** sustituir `sitport-routes.js:333-338` por
el nombre de la función o del bloque más su texto de anclaje, y la ruta de
bitácora por el directorio más el título del apartado.

**Autorización:** commit sobre `tmarea-pwa`. Esta sesión no escribió nada en ese
repositorio.
