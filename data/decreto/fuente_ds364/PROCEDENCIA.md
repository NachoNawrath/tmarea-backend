# Procedencia — D.S. (M.) 364 de 1980, Reglamento de Recepción y Despacho de Naves

## Qué es este directorio, y qué NO es

Guarda **el texto de la norma que hace obligatorio el despacho previo al zarpe**. Está acá
porque `CONTRATO_MOTOR.md` se apoya en nueve de sus artículos y `D-C9` descansa entero sobre
él, y hasta el 2026-08-19 **ninguna línea de ese texto existía en ninguno de los dos
repositorios**: lo único escrito era una paráfrasis. Una cita que no se puede reproducir desde
el repositorio es una afirmación sin respaldo.

`CLAUDE.md` §3.4 e `INV-3.7` son lo que este directorio cumple, igual que `data/decreto/fuente/`,
`data/decreto/fuente_dfl292/` y `data/decreto/fuente_resoluciones_locales/`.

**Nada de esto adjudica nada y nada lo consume todavía.** No hay ningún archivo del repositorio
que lo lea. Está acá como fuente citable, con su cadena de custodia, para que la cita exista
antes que el texto que la use.

**Este directorio NO es contra lo que se coteja el insumo del decreto.** Eso sigue siendo
`data/decreto/fuente/` y sigue siendo el TM-025 A, que es el D.S. 991 y otra norma. El D.S. 364
es otro cuerpo legal, de otro objeto, y por eso vive aparte en vez de mezclarse ahí.

---

## El documento

| | |
|---|---|
| **Norma** | Decreto Supremo 364, MINISTERIO DE DEFENSA NACIONAL — *Aprueba el Reglamento de Recepción y Despacho de Naves, modifica el Decreto 1.340 bis, de 14 de junio de 1941, de Marina* |
| **Promulgación** | 29-04-1980 |
| **Publicación** | 27-06-1980 |
| **Versión del texto** | **Última Versión De: 17-MAR-2012** · Última Modificación: 17-MAR-2012, Decreto 701 |
| **Url corta que el propio documento declara** | `http://bcn.cl/2gf4m` |
| **Referido en este repositorio como** | **RRDN** (`CONTRATO_MOTOR.md`, sección FUENTES NORMATIVAS DE REFERENCIA) |
| **Qué es el archivo** | El **texto consolidado de la Biblioteca del Congreso Nacional**. Lleva el pie *"Biblioteca del Congreso Nacional de Chile - www.leychile.cl - documento generado el 25-May-2022"* en cada página, y la cabecera corrida *"Decreto 364, DEFENSA (1980)"* |
| **Extensión** | 8 páginas · **40 encabezados de artículo**: 38 numerados (Art. 1° a 38°), más `Artículo 2° bis` y `ARTICULO 8° BIS`. Las dos extracciones dan la misma lista y en el mismo orden |
| **Anotaciones marginales** | **CUATRO bloques, no uno**: `DS 1428, Subs. Marina, 1986.` · `Decreto 701, DEFENSA / Art. SEGUNDO / D.O. 17.03.2012` · `DS 1.079, Subs. Marina, / 1987 Art. Unico` · `DTO 220, DEFENSA / Art. único / D.O. 07.07.2007`. **A qué artículo pertenece cada uno NO está determinado** — ver la nota de parseo más abajo |

**La fecha de la norma y la fecha del texto no son la misma, y conviene no confundirlas.** El
decreto es de 1980; el texto de este archivo es el consolidado vigente al **17-MAR-2012**. Los
dos números se escriben porque `D-C9` lo nombra «D.S. 364/1980» y podría leerse como que el
archivo trae la redacción original. No la trae. `CONTRATO_MOTOR.md` ya declaraba la versión
17-MAR-2012 antes de que este archivo entrara, y coinciden.

---

## Origen: **RECORDADO, NO VERIFICADO**

> Entregado por el owner el **2026-08-19**, puesto por él en `data/decreto/` y movido desde ahí
> a este directorio el mismo día.

**No se consultó ninguna URL y no se comprobó el hash contra ningún sitio institucional.** El
owner no tiene a mano de dónde lo bajó, y la sesión que lo incorporó no tenía autorización para
salir a la red. Queda como **RECORDADO**: `CLAUDE.md` §3.2 — lo que no se puede verificar se
dice, no se sustituye por una suposición. Si aparece la URL, o si el mismo `sha256` se encuentra
publicado en un sitio institucional, pasa a **VERIFICADO** y se registra acá con URL y fecha de
consulta.

Es el mismo estado en que entró `data/decreto/fuente/` y por el mismo motivo.

**Lo que sí está verificado es la cadena de custodia**: el archivo que quedó en este directorio
es byte a byte el que el owner dejó, comprobado por `sha256` **antes y después** del movimiento
y del renombre. El hash no cambió.

**Lo que el `mtime` no prueba.** El archivo tiene fecha de modificación `2026-08-07 19:02:03
(UTC−04:00)`, anterior al día en que el owner lo entregó. Un movimiento dentro del mismo volumen
conserva el `mtime`, así que ese sello **no aporta evidencia** sobre cuándo se puso ni de dónde
vino, y no se usa como si la aportara.

---

## Los archivos

| archivo | sha256 | tamaño |
|---|---|---|
| `DTO-364_2012-03-17.pdf` | `88b4ea681a9f1ba5dad3296cfc819306605666c1f3d1909315fd98a3dc9c3ced` | 74.048 bytes |
| `DTO-364_2012-03-17.txt` | `6996085c6545a381262eec964f0d0a1f28e307829893053800347cd296b47e8e` | 20.514 bytes, 450 líneas (CRLF puro, 450 terminadores) |
| `DTO-364_2012-03-17.raw.txt` | `328b97a1286f76e1d439b2e0717c971b237dad204cf1a33989bcb4f0f8868955` | 18.541 bytes, 367 líneas (CRLF puro, 367 terminadores) |

**El `.pdf` es binario: clase única.** No tiene variante LF/CRLF, así que ese `sha256` es el
único que existe y vale igual en cualquier clon, con `core.autocrlf` en cualquier valor. Los dos
`.txt` **sí** tienen clase, son CRLF puro, y por eso hay un `.gitattributes` acá.

Los tres archivos llevan **8 `\f`** (uno por página), que es lo que emite `pdftotext` como
separador. Son los únicos caracteres de control fuera de LF/CR y están en los `.txt` del
precedente igual (21, 9 y 2, uno por página de cada documento).

**El nombre original.** El archivo que entregó el owner se llamaba
`c_29_dto_364_27_jun_1980_reglamento_de_recepcion_y_despacho_de_naves.pdf`. Se renombró al
entrar siguiendo el patrón `<código>_<fecha de la versión>` de `TM-025-A_2025-06-04` y
`DFL-292_2002-05-31`; **el contenido no se tocó y su `sha256` lo prueba**.

---

## Por qué hay DOS `.txt` y no uno

El precedente versiona un solo derivado, producido con `-layout`. Acá hacen falta los dos, y el
motivo está medido:

**Ninguna de las dos extracciones está limpia en general, y cada una lo está exactamente donde la
otra no.** `-layout` mezcla la columna de anotaciones marginales de BCN dentro de la línea, y
reparte cada bloque entre los artículos junto a cuyas líneas se dibuja; `-raw` sigue el orden del
*content stream*, no reordena por posición, y emite cada bloque **entero dentro de un solo
artículo** — que casi nunca es el mismo. El inciso 2 del Art. 30 sale así en `-layout`:

```
       Además para que la autoridad marítima otorgue el        DTO 220, DEFENSA
despacho de la nave al exterior, el capitán, armador o         Art. único
agente deberá obtener de la Autoridad Aduanera que estampe     D.O. 07.07.2007
```

…y el **mismo** bloque sale, en `-raw`, dentro de la letra C del **Art. 33**. Es exactamente la
clase que documenta la **nota de parseo 3** de `data/decreto/fuente_dfl292/PROCEDENCIA.md`
(*«recortar a partir de la columna 55»*), sólo que acá no hace falta recortar por columna:
**basta con tomar, para cada artículo, la extracción que no trae el bloque.**

Reparto de papeles, para que no quede ambiguo cuál manda:

- **`DTO-364_2012-03-17.txt` (`-layout`) es el documento de referencia.** Es el que indexa
  `linea_en_el_documento` en `data/decreto/rrdn_articulos.json`, y es el que se lee a ojo.
- **De cuál de los dos se EXTRAE se elige por artículo y por medición, no de antemano.** La
  primera versión de este archivo decía que se extrae de `-raw` y punto. Era cierto para los
  cuatro artículos que había entonces y **es falso como regla general**: en `-raw` el Art. 13 y
  el Art. 33 llevan su bloque marginal adentro. Hoy `extraido_de` **varía artículo por artículo**
  dentro de `rrdn_articulos.json`, y cada artículo declara el suyo junto al cotejo que lo
  justifica. De los once extraídos, nueve salen de `-raw` y dos de `-layout`.

El control corre contra la extracción que cada artículo declara, y mide además en cuál de las dos
**no** se re-encuentra. Esa asimetría no es un defecto: es el motivo declarado de que haya dos.

---

## Nota de parseo — la anotación marginal NO se atribuye

> **Enmendado el 2026-08-19.** La primera versión de esta nota decía que el consolidado lleva al
> margen «**una sola vez en todo el documento**» el bloque `DTO 220…`. Eso es cierto **de ese
> bloque** y se lee como si fuera el único que hay. **Son cuatro.** La copia de esta nota tal como
> estaba antes de la enmienda está en
> `_bitacoras/rrdn_siete_2026-08-19/PROCEDENCIA.md.copia-antes-de-la-enmienda`.

El consolidado de BCN lleva al margen **cuatro bloques de anotación**, cada uno **una sola vez**
en cada extracción. **Ninguna de las dos extracciones está limpia en general, y las dos discrepan
sobre a qué artículo pertenece cada bloque:**

| bloque | dónde lo pone `-layout` | dónde lo pone `-raw` |
|---|---|---|
| `DS 1428, Subs. Marina, 1986.` | `Artículo 2° bis` | `Artículo 2° bis` |
| `Decreto 701, DEFENSA / Art. SEGUNDO` | Art. 6° | `ARTICULO 8° BIS` |
| `D.O. 17.03.2012` | Art. 7° | `ARTICULO 8° BIS` |
| `DS 1.079, Subs. Marina, / 1987 Art. Unico` | Arts. 11° y 12° | **Art. 13°** |
| `DTO 220, DEFENSA / Art. único / D.O. 07.07.2007` | **Art. 30°**, inciso 2 | **Art. 33°**, letra C |

Medido sobre los dos `.txt` completos: `grep -c` da **1 y 1** para `DS 1428`, `DS 1.079`,
`DTO 220`, `D.O. 17.03.2012` y `D.O. 07.07.2007`; control negativo `DTO 999` da **0 y 0**.
(`Decreto 701` da 2 y 2 porque una de las dos es la metadata del encabezado del documento, no una
anotación al margen.) No es que una extracción duplique y la otra no: **es la misma anotación
colocada en artículos distintos.**

**A qué artículo pertenece cada bloque no está determinado, y esta sesión no lo determina.**
Establecerlo exigiría leer las posiciones de glifo del PDF, que es lo que ninguno de los dos
extractores hace de forma fiable con una columna marginal. **Se declara la discrepancia y no se
afirma ninguna de las dos lecturas**, igual que la nota de parseo 1 de
`data/decreto/fuente_dfl292/PROCEDENCIA.md` declaró la hipótesis de la "o" del Art. 27 sin darla
por probada.

**Cómo se extrae entonces, sin editar una letra del literal.** Cada artículo se corta en las dos
extracciones y se comparan palabra por palabra:

- si las dos dan **el mismo texto**, el literal queda **doblemente atestiguado** — 31 de los 40;
- si una es **subsecuencia de palabras** de la otra, se toma **la corta**, que es la que no trae
  el bloque, y las palabras excluidas se publican en `columna_marginal_aislada` **sin
  atribuirlas a ningún artículo** — 8 de los 40;
- si no se da ninguna de las dos, **el extractor falla y no adivina** — 1 de los 40.

Que lo excluido sea marginal y no texto del artículo **está medido, no supuesto**: dos
extractores independientes coinciden en toda la secuencia de palabras salvo ese tramo; el mismo
tramo aparece pegado a otro artículo en la otra extracción; y re-insertar las palabras excluidas
en el texto publicado **reproduce palabra por palabra** lo que la otra extracción emite para ese
artículo. Las tres cosas las comprueba `04_control_rebusqueda.js`, control C4.

**El `Artículo 2° bis` es el único del decreto que no se resuelve así**, y por eso **no está
extraído**: las dos extracciones traen el bloque `DS 1428, Subs. Marina, 1986.` en distinto
orden, ninguna está limpia, y no hay una corta de la que tirar. Resolverlo exigiría el camino de
las posiciones de glifo. Queda declarado y no está entre los once.

---

## Nota de parseo — `texto_decreto` es un array de FRAGMENTOS, no de incisos

**Seis de los 40 artículos cruzan un salto de página**, no sólo el 30: `Artículo 2° bis`, 6°,
11°, 17°, 23° y 30°. Entre los dos pedazos caen el pie de una página y la cabecera corrida de la
siguiente. Por eso el insumo guarda `texto_decreto` como **array** y no como una sola cadena:
unir los pedazos obligaría a editar el literal o a arrastrar el mobiliario de página dentro del
texto normativo. Cada fragmento por separado se re-encuentra exacto; **los fragmentos de un mismo
artículo unidos no se encuentran en ninguna de las dos extracciones**, y el control lo comprueba
de forma explícita para que nadie los junte más adelante creyendo que da igual.

> **Enmendado el 2026-08-19.** La primera versión de esta nota llamaba a ese array **«array de
> incisos»**. **No lo es**, y llamarlo así fue una casualidad del Art. 30: ahí el salto de página
> cayó justo en el límite entre sus dos incisos. Medido en general, las dos cosas no coinciden:
> el **Art. 36 tiene dos incisos normativos y un solo fragmento**, porque no cruza página; y al
> **Art. 17 el salto le cae en mitad de una oración**, entre `distinto` y `del prefijado`, así que
> sus dos fragmentos no son dos incisos ni nada parecido. **El corte lo pone el PDF, no una mano**
> —cae donde está el mobiliario de página—, y por eso no hay ningún ancla de texto escrita a
> mano en el extractor.

---

## Cómo se regeneran los `.txt`

Son derivados. Se producen desde el PDF de este mismo directorio, y **así se produjeron los que
están versionados**:

```
pdftotext -layout -enc UTF-8 data/decreto/fuente_ds364/DTO-364_2012-03-17.pdf data/decreto/fuente_ds364/DTO-364_2012-03-17.txt
pdftotext -raw    -enc UTF-8 data/decreto/fuente_ds364/DTO-364_2012-03-17.pdf data/decreto/fuente_ds364/DTO-364_2012-03-17.raw.txt
```

Producido con **xpdf 4.06** (`pdftotext version 4.06`, Glyph & Cog), **el mismo binario** con que
se produjeron los `.txt` de `data/decreto/fuente/`, `fuente_dfl292/` y
`fuente_resoluciones_locales/`.

**Vale la misma deuda declarada que allá:** `pdftotext` de *poppler-utils* no es el de *xpdf* y
**no está comprobado que produzcan el mismo byte**. Por eso los `.txt` se versionan con su hash
en vez de regenerarse al vuelo. Si alguien regenera con otra versión y el `sha256` cambia, **eso
no es un error**: es que cambió la herramienta, y hay que decirlo antes de reemplazar el archivo.

---

## Cómo se vuelve a bajar el PDF

**No se puede escribir el comando: no hay URL.** Es la consecuencia directa de que el origen sea
RECORDADO. Mientras siga así, **la única copia reproducible de este documento es la que está en
este directorio**, y ese es el motivo por el que se versiona el archivo y no un enlace.

Cuando aparezca la URL se escribe acá el `curl.exe` correspondiente, en el formato de
`fuente_dfl292/PROCEDENCIA.md` (`CLAUDE.md` §7.2 — `curl.exe`, no el alias de PowerShell), y se
comprueba que el `sha256` del archivo bajado sea `88b4ea68…`. Si no coincide, no es el mismo
documento y hay que decirlo antes de reemplazar nada.

---

## Qué se extrajo de él

**Once artículos de cuarenta.** Están en `data/decreto/rrdn_articulos.json`, con `texto_decreto`,
`procedencia` y `documento_sha256`, en el mismo tratamiento que el `art_2` del D.S. 991. Son
**exactamente los once que `CONTRATO_MOTOR.md` cita por la sigla RRDN**, y con estos once ese
frente queda cerrado: no hay ninguna cita del contrato al RRDN sin texto adjunto.

| artículo | por qué está | de dónde se extrajo |
|---|---|---|
| **Art. 13** | Aviso de arribada con 24 h de anticipación. `CONTRATO_MOTOR.md` §6.1 | `-layout` — en `-raw` lleva `DS 1.079…` adentro |
| **Art. 16** | Cambio del puerto prefijado de recalada: permiso previo. INV-2.2 | `-raw` — idéntico en las dos |
| **Art. 17** | Definición de arribada forzosa. INV-2.2 e INV-2.3. **Dos fragmentos** | `-raw` — idéntico en las dos |
| **Art. 24** | El despacho previo obligatorio. Es el texto de lo que `D-C9` declara como su único apoyo, y `CONTRATO_MOTOR.md` §2 ya lo citaba sin tenerlo | `-raw` — idéntico en las dos |
| **Art. 25** | Documentación en orden y condiciones de seguridad | `-raw` — idéntico en las dos |
| **Art. 26** | El despacho sólo puede negarse por causa legal o reglamentaria | `-raw` — idéntico en las dos |
| **Art. 27** | Quién solicita el despacho y con cuánta anticipación | `-raw` — idéntico en las dos |
| **Art. 29** | Clasificación de las naves; su categoría E son las naves menores nacionales | `-raw` — idéntico en las dos |
| **Art. 30** | Requisitos para obtener la autorización de zarpe. **Dos fragmentos** | `-raw` — en `-layout` lleva `DTO 220…` adentro |
| **Art. 33** | Causales por las que la Autoridad Marítima no otorga el zarpe (letras A a D, y dice «entre otras») | `-layout` — en `-raw` lleva `DTO 220…` adentro |
| **Art. 36** | Puertos intermedios y zarpe a la gira con puerto cerrado. El más citado del contrato: cinco lugares | `-raw` — idéntico en las dos |

Los otros **veintinueve no están extraídos** y salen del PDF de este directorio. Que no estén no
significa que no digan nada: significa que **nadie los ha necesitado todavía**. Este insumo es
«los artículos que alguien necesitó, con su motivo escrito al lado», **no** «el decreto»; y no
puede ser «el decreto» mientras el origen del PDF siga siendo RECORDADO y no VERIFICADO.

Y uno de los veintinueve tiene además su propio motivo: el **`Artículo 2° bis`** es el único que
ninguna de las dos extracciones da limpio — ver la nota de parseo de arriba.

**El careo entre los cuatro primeros —Arts. 24, 25, 29 y 30— y la paráfrasis de `D-C9` está en
`_bitacoras/ds364_al_arbol_2026-08-19/careo_dc9_vs_literal_2026-08-19.md`.** No concilia y no
decide: es material de lectura para el owner.

---

## Por qué hay un `.gitattributes` acá

Mismo motivo que en `data/decreto/fuente/`, `fuente_dfl292/` y `fuente_resoluciones_locales/`: el
repositorio corre con `core.autocrlf=true` y **no tiene `.gitattributes` en la raíz**. Sin la
regla local, git normalizaría los `.txt` al guardarlos y los reescribiría al sacarlos, y los
`sha256` de la tabla de arriba dejarían de coincidir en un clon. Ese es exactamente el defecto
que este directorio existe para cerrar, así que no se deja al azar.

---

## Lo que este directorio NO tiene, y conviene saberlo

**Ningún control de la suite vigila estos hashes.** Hay un control re-ejecutable en
`_bitacoras/rrdn_siete_2026-08-19/04_control_rebusqueda.js`, que re-extrae el PDF y verifica que
los `sha256` y los trece fragmentos guardados sigan coincidiendo — pero **hay que correrlo a
mano**: no está enganchado a `npm test` y nada lo llama. (El de la sesión anterior,
`_bitacoras/ds364_al_arbol_2026-08-19/02_control_rebusqueda.js`, sigue en el árbol y sigue
pasando, pero cubre sólo los cuatro artículos de la v1 y busca todo en `-raw`: **quedó
superado**.)

**Y hay algo que ninguno de los dos controles cubre: el TRUNCADO.** Un fragmento correcto pero
incompleto se re-encuentra igual de bien que el completo, porque un prefijo de una subcadena
sigue siendo una subcadena. Lo que cubre eso es que alguien lea con qué empieza y con qué termina
cada artículo; está publicado en
`_bitacoras/rrdn_siete_2026-08-19/05_lectura_parada2.txt`.

Es el mismo estado en que quedaron `fuente_dfl292/` y `fuente_resoluciones_locales/`, y es
deliberado por el mismo motivo: **nada del repositorio consume todavía este texto**. El día que
algo lo consuma, la pregunta de si merece un control vivo deja de ser hipotética. **Esa decisión
es del owner y va junto con el código que lo consuma, no antes.**

**Falta la mayor parte del decreto en forma citable, pero ya no falta ninguna cita.**
`CONTRATO_MOTOR.md` cita el RRDN por su sigla en **nueve artículos** — 13, 16, 17, 24, 25, 26,
27, 33 y 36 — y **los nueve están extraídos**, más el 29 y el 30 que cita `D-C9`: once. Ese
frente, abierto en `_bitacoras/ds364_al_arbol_2026-08-19/ds364_al_arbol_2026-08-19.txt` §6, queda
cerrado el mismo día. Los otros **veintinueve artículos** siguen sin extraer, y no porque falten:
porque nadie los ha pedido.
