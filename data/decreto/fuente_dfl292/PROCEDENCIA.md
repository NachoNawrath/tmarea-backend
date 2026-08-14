# Procedencia — D.F.L. 292 de 1953, Ley Orgánica de DIRECTEMAR

## Qué es este directorio, y qué NO es

Guarda **el texto de la norma que ordena los niveles administrativos del litoral**:
Gobernación Marítima → Subdelegación Marítima y Alcaldía de Mar. Está acá porque la
regla de atribución de Alcaldías de Mar se apoya en tres de sus artículos, y una cita
que no se puede reproducir desde el repositorio es una afirmación sin respaldo.

`CLAUDE.md` §3.4 e `INV-3.7` son lo que este directorio cumple, igual que
`data/decreto/fuente/` y `data/decreto/fuente_resoluciones_locales/`.

**Nada de esto adjudica nada y nada lo consume todavía.** No hay ningún archivo del
repositorio que lo lea. Está acá como fuente citable, con su cadena de custodia, para
que la cita exista antes que el texto que la use.

**Este directorio NO es contra lo que se coteja el insumo del decreto.** Eso es
`data/decreto/fuente/` y sigue siendo el TM-025 A. El DFL 292 es otra norma, de otro
instrumento y de otro rango, y por eso vive aparte en vez de mezclarse ahí.

---

## El documento

| | |
|---|---|
| **Norma** | D.F.L. 292, MINISTERIO DE HACIENDA — *Aprueba la Ley Orgánica de la Dirección General del Territorio Marítimo y de Marina Mercante* |
| **Promulgación** | 25-07-1953 |
| **Publicación** | 05-08-1953 |
| **Versión del texto** | **Última Versión De: 31-05-2002** · Inicio vigencia 31-05-2002 |
| **Id Norma (LeyChile)** | 5333 |
| **Qué es el archivo** | El **texto consolidado de la Biblioteca del Congreso Nacional**, reproducido por DIRECTEMAR. Lleva el pie *"Biblioteca del Congreso Nacional de Chile - www.leychile.cl - documento generado el 17-Mar-2020"* en cada página, y en su cabecera la URL `https://www.leychile.cl/N?i=5333&f=2002-05-31&p=` |
| **Modificaciones anotadas al margen** | `DL 2837 1979 Art 1°` · `DFL 98 Hda. 1960 Art 4°` · `DFL 1 JUSTICIA Art. 54, D.O. 18.10.1995` · `D.O. 30.08.1979` · `D.O. 28.05.2001` · `LEY 19806 Art. 5°, D.O. 31.05.2002` |

---

## Origen: **VERIFICADO**

Descargado por consulta propia desde el sitio institucional de DIRECTEMAR, que es el
mismo emisor de las otras dos fuentes de este repositorio.

| | |
|---|---|
| **Emisor del sitio** | DIRECTEMAR / Armada de Chile |
| **URL exacta** | `https://www.directemar.cl/directemar/site/docs/20200609/20200609201145/ley_org__nica_dgtm_dfl_292_05_ago_1953.pdf` |
| **Ficha que lo enlaza** | `https://www.directemar.cl/directemar/marco-normativo/leyes/ley-organica-de-la-direccion-general-del-territorio-maritimo-y-de-marina` |
| **Fecha y hora de consulta** | **2026-08-14, 17:18:05 (UTC−04:00)** |
| **Método** | `curl.exe -sS -L --max-time 120 -A <User-Agent de navegador>`, **HTTP 200**, `content_type: application/pdf`, 62.391 bytes. Sin autenticación, sin JS |

**Se declara el User-Agent porque cambia la reproducibilidad**: se envió uno de
navegador. No está medido si DIRECTEMAR entrega el archivo sin él.

**"VERIFICADO" se refiere a nuestra descarga desde DIRECTEMAR, no a BCN.** El documento
es una reproducción del consolidado de BCN, y a BCN no se lo bajamos: ver la nota de
abajo.

### Por qué no se bajó de BCN, que era la primera opción

`http://bcn.cl/2ejjv` —la URL corta que el propio documento cita— resuelve por 301 y 302
a `https://www.bcn.cl/leychile/N?i=5333&f=2002-05-31`, **y esa URL devuelve HTML, no un
PDF**: 9.771 bytes de cáscara de una SPA, con cero ocurrencias de `DFL`, `292`, `Alcald`
o `Territorio Mar`. El endpoint canónico de exportación
(`/leychile/servicios/Consulta/Exportar?radioExportar=Normas&formato=pdf&idNorma=5333`)
devuelve **la misma cáscara** —magic `3C 21 64 6F` = `<!doctype`, no `%PDF-`—, el espejo
`nuevo.leychile.cl` devuelve **500**, y la API de datos `/leychile/Consulta/obtxml`
devuelve **429 `{"error": "Service limit has been reached"}`**.

Medido el 2026-08-14. Por eso la fuente es DIRECTEMAR: **es el mismo documento que la URL
corta de BCN no pudo entregar**, y viene del emisor cuya ruta `site/docs/<fecha>/<id>/`
este repositorio ya versionó una vez.

---

## Lo que NO está verificado

- **No está medido si BCN publica hoy una versión posterior al 31-05-2002.** Las dos
  reproducciones que se midieron se generaron en **2020** y **2021**, y las dos declaran
  esa misma versión como la última. Qué dice BCN **hoy** no se comprobó: la API devolvió
  **HTTP 429, `Service limit has been reached`**, y **se detuvo la consulta en vez de
  insistir** — seguir pegándole a un servicio que declara su límite es lo contrario de
  medir. Queda abierto y se cierra volviendo a consultar.
- **No está medido si DIRECTEMAR mantiene esa URL.** El archivo vive bajo una ruta con
  fecha (`site/docs/20200609/…`); que hoy responda 200 no prueba que siga ahí mañana. Por
  eso el PDF se versiona y no se referencia por enlace.
- **No está medido que el Art. 27 no haya sido modificado desde 1953.** La columna de
  anotaciones del consolidado marca el Art. 14 (`DFL 98 Hda. 1960 Art 4°`) y no marca ni
  el Art. 12 ni el Art. 27. **Ausencia de anotación marginal es evidencia, no prueba.**

---

## Los archivos

| archivo | sha256 | tamaño |
|---|---|---|
| `DFL-292_2002-05-31.pdf` | `ab05992f9ad507743e93301606919e05805f370b896e78320da0f3ec8b4d0747` | 62.391 bytes |
| `DFL-292_2002-05-31.txt` | `ab6e0070993b55a1a2b30530b065b72be82615244267e018e67dfb57a7711866` | 28.616 bytes, 640 líneas (CRLF puro, 639 terminadores) |

El archivo entregado por DIRECTEMAR se llamaba
`ley_org__nica_dgtm_dfl_292_05_ago_1953.pdf`. Se renombró al entrar siguiendo el patrón
`<código>_<fecha de la versión>` de `TM-025-A_2025-06-04`; **el contenido no se tocó y su
`sha256` lo prueba** — es el mismo hash que el archivo tenía al descargarse, comprobado
antes y después de la copia.

---

## El contraste independiente: FAOLEX — **medido y NO versionado**

FAO publica otra reproducción del mismo consolidado de BCN. Se bajó y se midió **para
contrastar**, y **no se versiona**: dos PDF del mismo texto en el repositorio invitan a la
pregunta *"cuál manda"*, que es lo que `CONTRATO_MOTOR.md` §5 abre prohibiendo. La
autoridad queda en uno solo y el contraste queda registrado acá para poder rehacerse.

| | |
|---|---|
| **URL** | `https://faolex.fao.org/docs/pdf/chi201871.pdf` |
| **Consulta** | 2026-08-14, 17:19:56 (UTC−04:00) · `curl.exe -sS -L -A <UA>`, HTTP 200, `application/pdf` |
| **sha256 del PDF** | `caa929dcab7924dd5f3828c1fd8d7e299404bdaaed5885a2dd11675302f91901` |
| **tamaño** | 84.742 bytes · `%PDF-1.4` |
| **Generado** | *"documento generado el 07-Abr-2021"*, un año después que el de DIRECTEMAR |
| **Versión declarada** | `Última Versión De: 31-MAY-2002` — **la misma** |

**Qué corrobora, medido:** los Art. 12, 14 y 27 son **idénticos carácter a carácter** en
las dos reproducciones, una vez quitada la columna de anotaciones al margen. El `Art. 14`
daba distinto en una comparación cruda **sólo** porque en el PDF de DIRECTEMAR la columna
marginal se mezcla con el texto al extraer, y en el de FAOLEX no.

Que dos generaciones separadas por un año declaren la misma versión es lo que sostiene
—sin probarla— la afirmación de que 31-05-2002 es el último consolidado.

---

## Notas de parseo — lo que costó trabajo y deja de ser descubrible sin el archivo

### 1. La "o" del Artículo 27 está en la fuente, no en nuestra extracción

El texto extraído dice, **verbatim y sin corregir**:

```
Artículo 27 Los Alcaldes de Mar o no forman parte
del personal.
```

Esa "o" sobra en cualquier lectura. **No se corrige**, y acá queda cómo se midió que no
es nuestra:

- aparece igual con `pdftotext -layout` **y** con `pdftotext -raw`, que sigue el orden del
  *content stream* del PDF y no reordena por posición;
- aparece igual en **las dos reproducciones**, la de DIRECTEMAR y la de FAOLEX, generadas
  con un año de diferencia y con maquetados internos distintos — el de FAOLEX descoloca
  "Punta" y "Arenas" en el Art. 13 y el de DIRECTEMAR no.

**Conclusión: la "o" está en el texto consolidado de BCN.** La lectura que cierra es que
sea el `°` de *"Artículo 27°"* emitido fuera de posición —los artículos 13°, 14° y 28°
llevan `°` y el 12 y el 27 no—, pero **eso no está probado**: exigiría leer las posiciones
de glifo del PDF. Se declara la hipótesis y se deja el texto como está.

### 2. La cabecera sale con las columnas corridas

Las diez etiquetas de la ficha (`Tipo Norma`, `Fecha Publicación`, …) y sus valores viven
en dos columnas, y `pdftotext -layout` las emite **desfasadas una línea**. Leído en crudo,
`Fecha Promulgación` parece decir `05-08-1953` y `Título` parece decir `25-07-1953`. La
lectura correcta, reconstruida:

```
Tipo Norma          : Decreto con Fuerza de Ley 292
Fecha Publicación   : 05-08-1953
Fecha Promulgación  : 25-07-1953
Organismo           : MINISTERIO DE HACIENDA
Título              : APRUEBA LA LEY ORGANICA DE LA DIRECCION GENERAL DEL
                      TERRITORIO MARITIMO Y DE MARINA MERCANTE
Tipo Versión        : Última Versión  De : 31-05-2002
Inicio Vigencia     : 31-05-2002
Id Norma            : 5333
Ultima Modificación : (vacío)
URL                 : https://www.leychile.cl/N?i=5333&f=2002-05-31&p=
```

### 3. La columna de anotaciones se mezcla con el texto

Las marcas de modificación (`DFL 98 Hda. 1960 Art 4°`, `DL 2837 1979 Art 1°`, …) viven en
una columna a la derecha y `-layout` las emite dentro de la línea del artículo. **Quien
compare texto contra texto tiene que recortar a partir de la columna 55**, o va a leer
diferencias que son de maquetado. Es lo que se hizo para cotejar contra FAOLEX.

---

## Qué se extrajo de él — los tres artículos que fundan la cita

Transcritos del `.txt` de este directorio, con su número de línea.

**Artículo 12 (L291-293)** — la división en tres niveles:

> Artículo 12 El litoral de la República se divide en Gobernaciones Marítimas y éstas en
> Subdelegaciones Marítimas y Alcaldías de Mar.

**Artículo 14 (L303-310)** — el reparto de instrumentos, que es lo que explica por qué el
D.S. 991 no contiene a las Alcaldías:

> Artículo 14° Las jurisdicciones de las Gobernaciones Marítimas y Subdelegaciones
> Marítimas así como el número de estas últimas serán fijados por el Presidente de la
> República.
>
> El número de Alcaldías de Mar, como sus jurisdicciones, serán fijadas por el Director
> General del Territorio Marítimo y de Marina Mercante.

**Artículo 27 (L417-421)** — la dependencia (con la "o" de la nota de parseo 1):

> Artículo 27 Los Alcaldes de Mar o no forman parte del personal. Sus atribuciones y
> deberes serán los que les asignen los reglamentos, directivas de la Dirección y las
> órdenes e instrucciones que les impartan los Capitanes de Puerto de quienes dependan.

---

## Cómo se regenera el `.txt`

Es un derivado. Se produce desde el PDF de este mismo directorio, y **así se produjo el
que está versionado**:

```
pdftotext -layout -enc UTF-8 data/decreto/fuente_dfl292/DFL-292_2002-05-31.pdf data/decreto/fuente_dfl292/DFL-292_2002-05-31.txt
```

Producido con **xpdf 4.06** (`pdftotext version 4.06`, Glyph & Cog), el mismo binario con
que se produjeron `data/decreto/fuente/TM-025-A_2025-06-04.txt` y el `.txt` de
`fuente_resoluciones_locales/`.

**Vale la misma deuda declarada que allá:** `pdftotext` de *poppler-utils* no es el de
*xpdf* y **no está comprobado que produzcan el mismo byte**. Por eso el `.txt` se versiona
con su hash en vez de regenerarse al vuelo. Si alguien regenera con otra versión y el
`sha256` cambia, **eso no es un error**: es que cambió la herramienta, y hay que decirlo
antes de reemplazar el archivo.

## Cómo se vuelve a bajar el PDF

Comando para el owner, en **PowerShell** (`CLAUDE.md` §7.2 — `curl.exe`, no el alias):

```
curl.exe -L -o DFL-292_2002-05-31.pdf "https://www.directemar.cl/directemar/site/docs/20200609/20200609201145/ley_org__nica_dgtm_dfl_292_05_ago_1953.pdf"
```

Y el contraste de FAOLEX, que **no se versiona** y se rehace así:

```
curl.exe -L -o faolex_dfl292.pdf "https://faolex.fao.org/docs/pdf/chi201871.pdf"
```

## Por qué hay un `.gitattributes` acá

Mismo motivo que en `data/decreto/fuente/` y en `data/decreto/fuente_resoluciones_locales/`:
el repositorio corre con `core.autocrlf=true` y sin la regla git normalizaría el `.txt`,
dejando el `sha256` de la tabla de arriba sin coincidir en un clon. Ese es exactamente el
defecto que este directorio existe para cerrar, así que no se deja al azar.

---

## Lo que este directorio NO tiene, y conviene saberlo

**Ningún control vivo vigila estos hashes.** El TM-025 A lo cubre el control **B10** de
`scripts/fase4_auditoria_v2.py`, que existe porque `jurisdicciones_v2.json` declara
`cotejado_contra` y B10 recalcula el hash en disco. Acá no hay nada equivalente, porque
**nada se coteja contra el DFL 292**. Es el mismo estado en que quedó
`fuente_resoluciones_locales/`, y es deliberado.

El día que `CONTRATO_MOTOR.md` cite los Art. 12, 14 y 27, esa cita pasa a ser carga viva y
la pregunta de si merece un control deja de ser hipotética. **Esa decisión es del owner y
va junto con el texto del contrato, no antes.**
