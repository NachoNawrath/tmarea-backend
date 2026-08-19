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
| **Extensión** | 8 páginas · 38 artículos numerados, más `Artículo 2° bis` y `ARTICULO 8° BIS` |
| **Anotación marginal dentro del alcance extraído** | `DTO 220, DEFENSA · Art. único · D.O. 07.07.2007`. **A qué artículo pertenece NO está determinado** — ver la nota de parseo más abajo |

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

**`-layout` mezcla la columna de anotaciones marginales de BCN dentro de la línea.** El inciso 2
del Art. 30 sale así:

```
       Además para que la autoridad marítima otorgue el        DTO 220, DEFENSA
despacho de la nave al exterior, el capitán, armador o         Art. único
agente deberá obtener de la Autoridad Aduanera que estampe     D.O. 07.07.2007
```

Es exactamente la clase que documenta la **nota de parseo 3** de
`data/decreto/fuente_dfl292/PROCEDENCIA.md` (*«recortar a partir de la columna 55»*). `-raw`
sigue el orden del *content stream* y no reordena por posición, y **para este inciso no emite
esa columna**, así que devuelve el texto limpio sin que nadie lo edite. **No la emite en ninguna
parte del documento: la coloca en otro artículo** — ver la nota de parseo de abajo.

Reparto de papeles, para que no quede ambiguo cuál manda:

- **`DTO-364_2012-03-17.txt` (`-layout`) es el documento de referencia.** Es el que indexa
  `linea_en_el_documento` en `data/decreto/rrdn_articulos.json`, y es el que se lee a ojo.
- **`DTO-364_2012-03-17.raw.txt` (`-raw`) es de dónde se extrae y contra qué corre el control.**

El control mide y deja escrito que el inciso 2 del Art. 30 **no** se re-encuentra en `-layout` y
**sí** en `-raw`. Esa asimetría no es un defecto: es el motivo declarado de que haya dos.

---

## Nota de parseo — la anotación marginal NO se atribuye

El consolidado de BCN lleva al margen, **una sola vez en todo el documento**, el bloque
`DTO 220, DEFENSA / Art. único / D.O. 07.07.2007`. **Las dos extracciones discrepan sobre a qué
artículo pertenece:**

- **`-layout`** la emite dentro del **inciso 2 del Art. 30**;
- **`-raw`** la emite dentro de la **letra C del Art. 33**.

Medido: `grep -c "DTO 220"` da **1** en cada uno de los dos `.txt`. No es que una extracción la
duplique y la otra no; **es la misma anotación colocada en dos artículos distintos.**

**Cuál de las dos lecturas es la correcta no está determinado.** Establecerlo exigiría leer las
posiciones de glifo del PDF, que es lo que ninguno de los dos extractores hace de forma fiable
con una columna marginal. **Se declara la discrepancia y no se afirma ninguna de las dos**, igual
que la nota de parseo 1 de `data/decreto/fuente_dfl292/PROCEDENCIA.md` declaró la hipótesis de la
"o" del Art. 27 sin darla por probada.

**Consecuencia práctica para quien extraiga el Art. 33 más adelante** —y es uno de los siete
pendientes—: **en `-raw` el Art. 33 es el artículo contaminado.** `-raw` no está limpio en
general; para los cuatro artículos de este insumo lo está, y desplaza la contaminación al 33.
Quien extraiga el 33 tiene que mirar los dos `.txt`, no sólo el `-raw`.

---

## Nota de parseo — el Art. 30 cruza un salto de página

Entre sus dos incisos caen el pie de la página 6 y la cabecera corrida de la 7. Por eso el
insumo guarda `texto_decreto` como **array de incisos** y no como una sola cadena: unir los dos
obligaría a editar el literal o a arrastrar el mobiliario de página dentro del texto normativo.
Cada inciso por separado se re-encuentra exacto; **los dos unidos no se encuentran en ninguna de
las dos extracciones**, y el control lo comprueba de forma explícita para que nadie los junte
más adelante creyendo que da igual.

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

**Cuatro artículos de treinta y ocho.** Están en `data/decreto/rrdn_articulos.json`, con
`texto_decreto`, `procedencia` y `documento_sha256`, en el mismo tratamiento que el `art_2` del
D.S. 991.

| artículo | por qué está |
|---|---|
| **Art. 24** | El despacho previo obligatorio. Es el texto de lo que `D-C9` declara como su único apoyo, y `CONTRATO_MOTOR.md` §2 ya lo citaba sin tenerlo |
| **Art. 25** | Documentación en orden y condiciones de seguridad |
| **Art. 29** | Clasificación de las naves; su categoría E son las naves menores nacionales |
| **Art. 30** | Requisitos para obtener la autorización de zarpe (dos incisos) |

Los otros treinta y cuatro **no están extraídos** y salen del PDF de este directorio. Que no
estén no significa que no digan nada: significa que nadie los ha necesitado todavía.

**El careo entre estos cuatro textos y la paráfrasis de `D-C9` está en
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
`_bitacoras/ds364_al_arbol_2026-08-19/02_control_rebusqueda.js`, que re-extrae el PDF y verifica
que los `sha256` y los cinco incisos guardados sigan coincidiendo — pero **hay que correrlo a
mano**: no está enganchado a `npm test` y nada lo llama.

Es el mismo estado en que quedaron `fuente_dfl292/` y `fuente_resoluciones_locales/`, y es
deliberado por el mismo motivo: **nada del repositorio consume todavía este texto**. El día que
algo lo consuma, la pregunta de si merece un control vivo deja de ser hipotética. **Esa decisión
es del owner y va junto con el código que lo consuma, no antes.**

**Y falta la mayor parte del decreto en forma citable.** `CONTRATO_MOTOR.md` cita el RRDN por su
sigla en **nueve artículos** — 13, 16, 17, 24, 25, 26, 27, 33 y 36 — y de esos, los extraídos
acá son **dos**: el 24 y el 25. Los otros siete siguen citados sin texto adjunto, igual que
estaban el 29 y el 30 hasta hoy. Está medido y anotado en la bitácora de esta sesión; no se
cerró porque estaba fuera de su alcance.
