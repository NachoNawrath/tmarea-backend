# Procedencia — resoluciones locales que aportan coordenadas a un caso abierto

---

## LEA ESTO ANTES DE USAR CUALQUIER COSA DE ESTE DIRECTORIO

**Lo que hay acá son límites de PUERTO y áreas de OPERACIÓN. No son límites de
jurisdicción.**

Se leyeron 19 resoluciones locales de DIRECTEMAR el 2026-08-12 y el patrón no tuvo
excepción:

- Cuando una resolución local habla de **límites**, habla de los límites **del puerto**:
  una línea entre dos puntas que cierra una bahía. Eso es una boca de puerto, no una
  frontera entre Capitanías.
- Cuando **cita la jurisdicción**, transcribe el D.S. 991 y no agrega un metro. Se
  comprobó palabra por palabra contra `jurisdicciones_v2.json` en dos casos —Talcahuano
  y Chacabuco— y coincide.
- Las coordenadas que traen son de **fondeaderos y áreas de restricción**. Su escala son
  **cientos de metros**. La escala de los casos abiertos del inventario son **decenas de
  kilómetros**.

De ahí se sigue lo único que importa saber antes de abrir el PDF: **este material no
sirve para decidir dónde termina una jurisdicción.** Sirve, a lo sumo, como testigo de
dónde una Capitanía opera de hecho.

El detalle de la medición está en `_bitacoras/recon_resoluciones_locales_2026-08-12.txt`,
§5.

---

## Qué es este directorio

El subconjunto de las 19 candidatas que **aporta coordenadas propias que delimitan algo
dentro de la zona de un caso abierto** del inventario
(`_bitacoras/inventario_pendientes_geograficos_2026-08-12.txt`).

Hoy es **una sola resolución**.

Ese número es el resultado, no un recorte por comodidad. De las 19 leídas: cuatro son
escaneos sin capa de texto; nueve no traen geometría; cinco traen coordenadas o
delimitaciones que **no aportan al caso que tocan** y quedan registradas en la bitácora,
que es donde corresponde. El criterio y el veredicto documento por documento están en la
bitácora §3 y §4.

**Criterio aplicado, del owner (2026-08-12):**

> *Lo que se buscaba son coordenadas para cerrar casos del inventario. El contenido
> normativo de las resoluciones no es materia de la app: cuando la app reporta una
> restricción, el patrón confirma con la Capitanía, y lo que esa Capitanía le responda es
> responsabilidad de ella. La app no cita resoluciones locales.*

Por eso salieron las que habían entrado **por lo que dicen** y no por lo que miden.

Tampoco se busca acá la pertenencia Capitanía→Gobernación: ya está resuelta por el
decreto, por la agrupación del propio índice y por el campo de repartición de SITPORT, y
las tres coinciden.

**Nada de esto se ha incorporado al insumo y nada adjudica nada.** Está acá como fuente
citable, con su cadena de custodia, para cuando el owner decida si se usa.
`CLAUDE.md` §3.4 e `INV-3.7` son lo que este directorio cumple.

---

## Origen: **VERIFICADO**

A diferencia del TM-025 A —cuyo origen quedó como RECORDADO porque se recibió del owner
sin URL—, esto se descargó por consulta propia desde el sitio institucional de DIRECTEMAR.

| | |
|---|---|
| **Emisor** | Capitanía de Puerto de Tierra del Fuego, DIRECTEMAR / Armada de Chile |
| **Sitio** | `https://www.directemar.cl` — *Marco Normativo → Resoluciones Locales AA.MM* |
| **Índice raíz** | `https://www.directemar.cl/directemar/site/tax/port/fid_adjunto/taxport_34___1.html` (44 páginas al 2026-08-12) |
| **Fecha de consulta** | **2026-08-12, 19:25 (UTC−04:00)** |
| **Método** | `curl -sS -L`, HTTP 200. Sin autenticación, sin JS. |

**Lo que NO está verificado:** que sea la versión vigente. El índice publica derogatorias
como ítems nuevos cuyo título no dice qué derogan (13 en el índice de hoy). Que una
resolución siga listada no prueba que no haya sido reemplazada. Por eso se registra la
fecha de consulta.

---

## Los archivos

| archivo | sha256 | tamaño |
|---|---|---|
| `CP-TIERRA-DEL-FUEGO_12000-176_2020-09-30.pdf` | `3a184749a94d9bf15c725de922cad4b07ba2643cb3bea4c890ff66b314be1268` | 103.998 bytes |
| `CP-TIERRA-DEL-FUEGO_12000-176_2020-09-30.txt` | `807afba0a99ee60688921eef2fbc17cb4e331fde9dace080b7891c3198176d0a` | 5.304 bytes, 113 líneas |

---

## La resolución

### `CP-TIERRA-DEL-FUEGO_12000-176_2020-09-30` — caso B1

*C.P. T.F. Ord. N° 12000/176 Vrs.: Establece la prohibición de fondeo de material de pesca
en área de ingreso al Puerto de Porvenir, canalizo de acceso, Bahía Chilota y Bahía
Porvenir.* — 30 de septiembre de 2020.

URL: `https://www.directemar.cl/directemar/site/docs/20201002/20201002080326/07__12000_176_300920_tierra_del_fuego.pdf`

**Por qué es la única que queda.** De las diecinueve, es la única que delimita un **área**
con **coordenadas propias** dentro de la zona en disputa del caso B1 —la franja al Oriente
de Cabo San Vicente que los párrafos de `punta_delgada` y `tierra_del_fuego` cubren los
dos sin que el decreto diga cómo se reparten—.

Cita literal, §1 cuarto viñetazo:

> "Área de acceso al Puerto de Porvenir, Estrecho de Magallanes, comprendida entre Punta
> de Palos, Punta Victoria, Punto ref. 1 (L: 53° 16´ 47” S; Long: 070° 31´ 31” W) y Punto
> ref. 2 (Lat: 53° 20´ 53” S; Long: 070° 31´ 31” W)."

| vértice | latitud | longitud |
|---|---|---|
| ref. 1 | 53° 16' 47" S | 070° 31' 31" W |
| ref. 2 | 53° 20' 53" S | 070° 31' 31" W |
| Punta de Palos | *toponimia, sin coordenada en el documento* | |
| Punta Victoria | *toponimia, sin coordenada en el documento* | |

Los dos puntos de referencia comparten el meridiano **070° 31' 31" W**, que hace de borde
occidental del área. Los otros dos vértices son toponimia y hay que georreferenciarlos
aparte.

**A qué escala sirve, dicho antes de que alguien la use:** el área mide unos 7,5 km de
Norte a Sur. Es un área de acceso a puerto, y su objeto es **prohibir el fondeo de
material de pesca** — no fijar una frontera. Que Tierra del Fuego trace un área en el
Estrecho al Oriente de Cabo San Vicente es **evidencia de dónde opera**, no norma de
jurisdicción, y no revoca al decreto.

**Sin adjudicar.** B1 sigue abierto.

---

## Cómo se regenera el `.txt`

```
pdftotext -layout -enc UTF-8 <archivo>.pdf <archivo>.txt
```

Producido con **xpdf 4.06** (`pdftotext version 4.06`, Glyph & Cog), el mismo binario con
que se produjo `data/decreto/fuente/TM-025-A_2025-06-04.txt`. Vale la misma deuda declarada
allá: `pdftotext` de *poppler-utils* no es el de *xpdf* y no está comprobado que produzcan
el mismo byte. Si alguien regenera y el `sha256` cambia, eso no es error del cotejo: es que
cambió la herramienta, y hay que decirlo antes de reemplazar el archivo.

## Cómo se vuelve a bajar el PDF

Comando para el owner, en **PowerShell** (`CLAUDE.md` §7.2 — `curl.exe`, no el alias):

```
curl.exe -L -o CP-TIERRA-DEL-FUEGO_12000-176_2020-09-30.pdf "https://www.directemar.cl/directemar/site/docs/20201002/20201002080326/07__12000_176_300920_tierra_del_fuego.pdf"
```

## Por qué hay un `.gitattributes` acá

Mismo motivo que en `data/decreto/fuente/`: el repositorio corre con `core.autocrlf=true`
y sin la regla git normalizaría el `.txt`, dejando el `sha256` de esta tabla sin coincidir
en un clon.
