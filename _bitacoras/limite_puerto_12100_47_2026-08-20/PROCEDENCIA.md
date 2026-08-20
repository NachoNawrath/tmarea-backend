# Procedencia — Res. D.G.T.M. y M.M. Ex. N° 12100/47, y su cruce contra el catálogo

---

## LEA ESTO ANTES DE USAR CUALQUIER COSA DE ESTE DIRECTORIO

**Los límites que este documento fija son límites de PUERTO, y se fijan PARA EFECTOS DE
PRACTICAJE.** El propio dispositivo lo dice:

> "FÍJANSE, para los fines prescritos en el Título V, del D.S. (M.) N° 397, de 1985, los
> siguientes Límites de Puerto…"

El Título V del Reglamento de Practicaje y Pilotaje. **No son límites de restricción de
navegación y no son límites de jurisdicción.**

Que el **`DENTRO DEL LÍMITE DEL PUERTO`** que SITPORT declara en `AreaRestriccion` sea
**este mismo límite** es **plausible y NO está probado**. Esta sesión no lo resolvió, a
propósito: es dato externo, y sigue siendo la fila
`D4D5::la-segunda-direccion-no-es-decidible` del declarativo.

**Nada de esto se ha incorporado a ningún insumo y nada adjudica nada.** Está acá como
fuente citable, con su cadena de custodia, para cuando el owner decida si se usa.

---

## Clase

**RECONOCIMIENTO — fuente citable, no incorporada.**

**No se promovió a `data/decreto/`.** Es un cruce de reconocimiento, no una incorporación.
Promoverla es firma del owner.

## Origen: **VERIFICADO**

Descargado por consulta propia desde el sitio institucional de DIRECTEMAR, con URL. No es
RECORDADO.

| | |
|---|---|
| **Emisor** | Dirección General del Territorio Marítimo y de Marina Mercante, Armada de Chile |
| **Documento** | D.G.T.M. y M.M. Ord. Exenta N° 12100/47 Vrs. — *Fija Áreas de Desembarco de Prácticos de Puerto, Límites de Puerto, Zona de Espera de Prácticos, Estaciones de Transferencia y Rutas de Entrada y Salida de Puertos* |
| **Fecha** | Valparaíso, 01 SEP 2009 |
| **Modificaciones** | ocho, la última del **16.AGO.2021** (el PDF publicado las consolida) |
| **URL** | `https://www.directemar.cl/directemar/site/docs/20170203/20170203111813/12100_47_010909_dgtm__modificado_el_270821_.pdf` |
| **Fecha de consulta** | **2026-08-20, 16:35 (UTC−04:00)** |
| **Método** | `curl.exe -sS -L -D headers_crudos.txt -o …`, HTTP 200. Sin autenticación, sin JS. |

**Lo que NO está verificado:** que sea la versión vigente. Que una resolución siga
publicada no prueba que no haya sido reemplazada. Por eso se registra la fecha de consulta.
Mismo límite que el declarado en `data/decreto/fuente_resoluciones_locales/PROCEDENCIA.md`.

**Control de estabilidad de la fuente.** Se descargó **dos veces**, con 11 minutos entre
medio y por dos rutas distintas —una sonda al scratchpad durante el gate, y la descarga a
esta bitácora después—. **Mismo `sha256`.** El servidor no está sirviendo algo que varía.

---

## Los archivos

| archivo | sha256 | tamaño |
|---|---|---|
| `DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.pdf` | `a9045b8801adff2240d6c8327800750d16d33ac578d06ceb73bf17111f6fc005` | 143.375 bytes |
| `DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.txt` | `dc8a1506291c3172f47cc4a4e872dc475c777c3429ad8d3e989df9844eb2430a` | 57.213 bytes, 1.693 líneas (`wc -l`) |

## Cómo se regenera el `.txt`

```
pdftotext -layout -enc UTF-8 <archivo>.pdf <archivo>.txt
```

Producido con **xpdf 4.06** (`pdftotext version 4.06`, Glyph & Cog), el **mismo binario**
con que se produjeron los `.txt` de `data/decreto/fuente/` y de
`data/decreto/fuente_resoluciones_locales/`. Vale la misma deuda declarada allá:
`pdftotext` de *poppler-utils* no es el de *xpdf* y no está comprobado que produzcan el
mismo byte. Si alguien regenera y el `sha256` cambia, eso no es error del cotejo: es que
cambió la herramienta, y hay que decirlo antes de reemplazar el archivo.

**El PDF sí tiene capa de texto.** Importa porque de las diecinueve resoluciones locales
leídas el 2026-08-12, **cuatro eran escaneos sin capa de texto**. Ésta no.

## Cómo se vuelve a bajar el PDF

En **PowerShell** (`CLAUDE.md` §7.2 — `curl.exe`, no el alias):

```
curl.exe -L -o DGTM-MM_12100-47_2009-09-01_mod-2021-08-16.pdf "https://www.directemar.cl/directemar/site/docs/20170203/20170203111813/12100_47_010909_dgtm__modificado_el_270821_.pdf"
```

## Por qué hay un `.gitattributes` acá

Mismo motivo que en `data/decreto/fuente/`: el repositorio corre con `core.autocrlf=true`
y sin la regla git normalizaría el `.txt`, dejando el `sha256` de la tabla de arriba sin
coincidir en un clon. `_bitacoras/` en general no lo tiene; esta bitácora sí, porque es la
primera que declara el `sha256` de un `.txt` derivado de un PDF descargado.

---

## Qué se midió, y qué quedó fuera

**Sólo el ANEXO “A”, punto 1** — los límites de puerto. **49 entradas · 53 puertos**
(cuatro entradas nombran dos puertos).

Quedan **fuera**, con su motivo — ninguno fija límites de puerto:

| | qué es | línea del `.txt` |
|---|---|---|
| ANEXO “A” punto 2 | zona de espera de prácticos (41 encabezados) | 465 |
| ANEXO “A” punto 3 | estaciones de transferencia | 902 |
| ANEXO “A” punto 4 | dispositivos de separación de tráfico | 1025 |
| ANEXO “A” punto 5 | derrota recomendada, parte Oriental del Estrecho de Magallanes | 1357 |
| ANEXO “B” entero | áreas de desembarco de prácticos | 1377 |

El punto 5 **no estaba en la lista de exclusiones del encargo**. Se declara en vez de
dejarlo caer.

---

## El hallazgo del gate, que queda escrito

`grep "ANEXO"` sobre el `.txt` —**patrón ASCII puro, sin un solo acento**— devuelve **una
sola línea**, la 1377, que es el Anexo B. Concluir de ahí que el Anexo A no está sería
falso: está en la **línea 69**, escrito **`A N E X O “A”`**, con espacio entre letra y
letra.

El problema **no era el encoding**. Era que **el vocabulario del documento no es el que uno
supone**. Un control positivo hace falta **también** cuando el patrón es ASCII puro.

---

## Los ficheros de la sesión, en orden

| fichero | qué es |
|---|---|
| `01_descarga.js` / `.txt` | descarga, sha256, control de estabilidad de la fuente |
| `02_extraer.js` / `.txt` | recorte del punto 1 y partición en entradas · 3 controles |
| `03_criterio_clases.txt` | **criterio de clasificación, escrito ANTES de aplicarse** |
| `04_clasificar.js` / `.txt` | clasificación por formato · 4 controles |
| `05_criterio_cruce.txt` | **criterio de emparejamiento, escrito ANTES de aplicarse** |
| `06_cruzar.js` / `.txt` | el cruce, la revisión a mano y el control de recall |
| `07_fila_declarativo.js` / `.txt` | la fila del resultado y el registro del sitio |
| `08_validador.txt` | `npm run deudas` después de escribir la primera fila |
| `09_control_caracteres.js` / `.txt` | control H-T2 sobre lo escrito |
| `10_control_contra_el_indice.js` / `.txt` | índice contra disco · intocables · cifras del mensaje · el `sha256` sobrevive |
| `11_fila_metodo.js` / `.txt` | las tres escrituras de la PARADA 2: dos notas y la **fila propia del hallazgo de método** |
| `12_validador_final.txt` | `npm run deudas` con las dos filas |
| `entradas_punto1.json` | recorte mecánico · **ningún código lo consume** |
| `clasificacion_punto1.json` | clasificación · **ningún código la consume** |
| `cruce_12100_47.json` | el cruce · **ningún código lo consume** |
| `headers_crudos.txt` | cabeceras HTTP de la descarga |

---

## El resultado, en una tabla

| | |
|---|---|
| bahías del catálogo con límite de puerto fijado | **44 de 164** (26,8 %) — 11 exacto · 33 probable revisado · 120 sin calce |
| de esas 44, con coordenadas suficientes para volverse geometría | **9** (5,5 % de 164 · 20,5 % de las 44) |
| puertos del documento que aterrizan en el catálogo | **45 de 53** |
| formatos | F1 pol./vértices **3** · F2 línea sin coords **18** · F3 paralelo/meridiano **16** · F4 mixto **9** · **F5 línea + paralelo/meridiano, clase nueva, 3** |

**Denominadores.** *Entrada* = un encabezado del punto 1 con su párrafo y su carta: **49**.
*Puerto* = cada nombre propio que ese encabezado nombra: **53**. *Bahía* = fila de
`data/decreto/join_bahia_jurisdiccion.json`: **164** — y ese 164 es **de esa fuente**, no
del catálogo entero: `data/catalogo/estado_drift.json` declara F1:163 · F2:163 · **F3:164**
· F4:163 · F5:163 sobre un `universo_sitport` de 166.

---

## La convergencia con las diecinueve

`data/decreto/fuente_resoluciones_locales/PROCEDENCIA.md` ya declaraba el **2026-08-12**,
sobre **diecinueve** resoluciones locales y sin una sola excepción, que cuando una
resolución local habla de límites habla del límite **del puerto** — una boca de puerto, no
una frontera entre Capitanías.

Esta sesión mide lo mismo en la **fuente madre** que esas diecinueve citan. Son **dos
mediciones independientes** —una sobre las hijas, otra sobre la madre— que dan lo mismo.
Esa convergencia vale más que cualquiera de las dos por separado, y lo que ya no se puede
sostener es que el límite del puerto sea una noción vaga: **está publicado, es único, y
está fechado.**
