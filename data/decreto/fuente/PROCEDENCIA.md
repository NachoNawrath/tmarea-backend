# Procedencia — texto oficial del D.S. (M) N° 991 de 1987

Este directorio guarda **el texto contra el que se coteja el insumo del decreto**.
Existe porque hasta el 2026-08-11 no estaba escrito en ninguna parte del
repositorio contra qué versión se había transcrito `jurisdicciones_capitanias.json`,
y eso hizo que diez Capitanías perdieran contenido del párrafo sin que nada avisara.

`CLAUDE.md` §3.4 y `CONTRATO_MOTOR.md` INV-3.7 son lo que este directorio cumple:
el insumo es dato fuente versionado y su cotejo tiene que poder rehacerse desde el
repositorio, sin depender del disco de nadie.

---

## El documento

| | |
|---|---|
| **Publicación** | TM-025 A — *Fija la jurisdicción de las Gobernaciones Marítimas de la República y establece las Capitanías de Puerto y sus respectivas jurisdicciones* |
| **Emisor** | Dirección General del Territorio Marítimo y de Marina Mercante (DIRECTEMAR), División Reglamentos y Publicaciones Marítimas |
| **Estado del texto** | Actualizado al 4 de junio de 2025. Leyenda de portada: "COTEJADO CON BCN MAYO 2025" y "SE ENCUENTRA DISPONIBLE SOLAMENTE EN PÁGINA WEB" |
| **Norma** | D.S. (M) N° 991 del 26-10-1987, publicado en D.O. N° 32.931 del 27-11-1987 |
| **Modificaciones incorporadas** | D.S. (M) 020 (14-02-1996, no publicado) · 163 (26-09-1997, no publicado) · 058 (06-04-2000, D.O. 36.674) · 080 (22-03-2004, D.O. 37.906) · 224 (03-04-2012, D.O. 40.432) · 391 (17-10-2019, D.O. 42.803 del 12-11-2020) |

## Origen: **DECLARADO, NO VERIFICADO**

> Descargado el **2026-08-11** de la sección de descargas gratuitas del sitio del
> **SHOA**, según lo declarado por el owner **de memoria**.

**No se consultó la URL y no se comprobó el hash contra ningún sitio institucional.**
El origen queda como **RECORDADO**. Si el mismo `sha256` aparece publicado en un
sitio institucional, pasa a **VERIFICADO** y se registra acá con URL y fecha de
consulta. Hasta entonces se escribe como está: `CLAUDE.md` §3.2 — lo que no se
puede verificar se dice, no se sustituye por una suposición.

Lo que sí está verificado es la **cadena de custodia**: el archivo que entró al
repositorio es byte a byte el que el owner entregó, comprobado por `sha256`.

## Los archivos

| archivo | sha256 | tamaño |
|---|---|---|
| `TM-025-A_2025-06-04.pdf` | `7b7b4c603ed92b793f1be9be63f9f2b7c040edb811127bda5bc579cc6797541c` | 284.047 bytes |
| `TM-025-A_2025-06-04.txt` | `e14cb905b4895422e41a7741818b59a40578dd49ba049baf0b727a8928c522c8` | 50.411 bytes, 866 líneas (CRLF) |

El PDF entregado por el owner se llamaba `tm_025a_actualizada_al_04_jun_2025.pdf`.
Se renombró al entrar; el contenido no se tocó y su `sha256` lo prueba.

## Cómo se regenera el `.txt`

Es un derivado. Se produce desde el PDF de este mismo directorio:

```
pdftotext -layout -enc UTF-8 data/decreto/fuente/TM-025-A_2025-06-04.pdf data/decreto/fuente/TM-025-A_2025-06-04.txt
```

Producido con **xpdf 4.06** (`pdftotext version 4.06`, Glyph & Cog).

**Deuda declarada, no resuelta:** `pdftotext` de *poppler-utils* no es el de *xpdf*
y **no está comprobado que produzcan el mismo byte**. Por eso el `.txt` se versiona
con su hash en vez de regenerarse al vuelo: el cotejo lee el archivo versionado, no
la salida de la herramienta que tenga instalada quien lo corra. Si alguien regenera
el `.txt` con otra versión y el `sha256` cambia, **eso no es un error del cotejo**:
es que cambió la herramienta, y hay que decirlo antes de reemplazar el archivo.

## Por qué hay un `.gitattributes` acá

El repositorio corre con `core.autocrlf=true`. Sin la regla local, git normalizaría
el `.txt` al guardarlo y lo reescribiría al sacarlo, y el `sha256` de esta tabla
dejaría de coincidir en un clon. Ese es el mismo defecto que este directorio existe
para cerrar, así que no se deja al azar.

## Qué se cotejó con esto

Cotejo literal del texto oficial contra el campo `texto_decreto` del insumo,
jurisdicción por jurisdicción, el **2026-08-11**.

- Bitácora: `_bitacoras/cotejo_tm025a_2026-08-12.txt`
- Diff completo: `_bitacoras/cotejo_tm025a_2026-08-12/03_cotejo_diff.txt`
- Herramienta re-ejecutable: `_bitacoras/cotejo_tm025a_2026-08-12/cotejo.js`
- Propuesta que salió de ahí: `_bitacoras/cotejo_tm025a_propuesta_2026-08-12.txt`
