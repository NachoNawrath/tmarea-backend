# Procedencia — teléfono de las Gobernaciones Marítimas

## Qué es este directorio, y qué NO es

Guarda **el teléfono de las Gobernaciones Marítimas**, indexado por Gobernación.
Existe porque el segundo escalón de `INV-10.1` —*"el de su Gobernación, rotulado como
Gobernación"*— se apoyaba en una tabla hardcodeada que ninguna fuente declarada
respalda, y esa carencia estaba medida y sin insumo.

`CLAUDE.md` §3.4 e `INV-3.7` son lo que este directorio cumple, igual que
`data/decreto/fuente/`, `data/decreto/fuente_resoluciones_locales/` y
`data/decreto/fuente_dfl292/`, de donde sale su forma: archivo de datos +
`PROCEDENCIA.md`.

**Vive en `data/contacto/` y no en `data/decreto/` a propósito.** Los tres directorios
de los que copia la forma son fuentes **normativas**; esto es dato de **contacto**, que
`CONTRATO_MOTOR.md` §5 gobierna aparte. `data/` ya tenía `catalogo/` y `decreto/`, así
que `contacto/` es el mismo patrón `data/<dominio>/` y no una convención nueva.

**Lo que NO es, y se dice para que nadie lo trate como tal:**

- **NO es fuente autorizada.** §5 declara el contacto de Gobernación como
  *"⚠️ PENDIENTE — POR DEFINIR"*, y esa fila la escribe el owner. Este archivo no la
  cambia; le da a esa decisión un insumo que antes no existía.
- **NO lo consume nadie.** Medido al escribirlo: ningún archivo de `src/` ni de la PWA
  lo lee. El fallback de pantalla sigue leyendo la tabla hardcodeada de
  `src/utils/capitanias.js`.
- **NO son teléfonos de Capitanía.** Son otra categoría, y mezclarlas es lo que
  `INV-10.1` existe para cerrar.
- **NO arregla la tabla de franjas de latitud.** Esa tabla decide **qué** Gobernación
  corresponde a una coordenada, y ese defecto —medido en 28 discrepancias sobre 163—
  es independiente del valor del teléfono. Ver
  `_bitacoras/frente_contacto_fallback_2026-08-14.txt`, bloque C.

---

## El dato

| | |
|---|---|
| **Archivo** | `gobernaciones_directemar_2026-08-14.json` |
| **Entradas** | 15 |
| **Clave** | nombre de la Gobernación Marítima |
| **Emisor** | DIRECTEMAR / Armada de Chile |
| **De dónde** | páginas de Gobernaciones Marítimas del sitio de DIRECTEMAR |
| **Capturado** | **2026-08-14**, por el owner |

## Origen: **DECLARADO POR EL OWNER, NO VERIFICADO POR EL AGENTE**

> Los quince valores los tomó el owner de las páginas de DIRECTEMAR el 2026-08-14 y los
> entregó en la sesión de ese día.

**No se consultó ninguna URL desde esta sesión y no se comprobó ningún hash contra el
sitio institucional.** Es el mismo estado en que entró el TM-025 A —ver
`data/decreto/fuente/PROCEDENCIA.md`, sección *"Origen: DECLARADO, NO VERIFICADO"`— y se
escribe igual: `CLAUDE.md` §3.2, lo que no se puede verificar se dice, no se sustituye
por una suposición.

Lo que sí está verificado es que **el archivo contiene exactamente lo que el owner
entregó**, con la única transformación declarada abajo.

### Normalización aplicada, y su límite

`Aysén` llegó como `+56 672351450` y se le abrió el espacio del código de área para
dejarlo en `+56 67 2351450`. Medido sobre las quince ya escritas:

```
=== formato y codepoints de las 15 ===
  entradas: 15
  fuera del formato "+56 NN NNNNNNN" o con codepoint ajeno: ninguna
  -> Aysen es la unica que requirio normalizacion, y quedo dentro del formato
```

**El límite de esa verificación, dicho y no tapado:** el agente recibió las otras catorce
**ya en formato**. Que Aysén haya sido la única que lo necesitaba es cierto **sobre la
lista tal como fue entregada**; no se pudo comprobar el estado previo de las catorce
restantes, porque nunca se vio.

---

## Lo que NO está verificado

- **Que sean los números vigentes.** Se capturaron el 2026-08-14 y no hay control que
  vuelva a mirar. Ningún hash los ata a la página de origen.
- **Que las páginas de DIRECTEMAR sean la fuente que el contrato termine autorizando.**
  §5 sigue diciendo *"POR DEFINIR"*.
- **La 16ª Gobernación.** El decreto define **16** y este archivo trae **15**: falta
  **Antártica Chilena**. Su teléfono está recuperado y verificado en
  `_bitacoras/frente_contacto_2026-08-13/gm_antartica_chilena_RECUPERADO.md`
  (`+56 32 2208557`), con el HTML crudo en `297b220^`. **No se agregó acá** porque este
  archivo registra lo que el owner entregó, y esa entrada no venía. Sumarla es decisión
  suya.

---

## Cotejo contra el CSV de las 64 Capitanías — medido, no asumido

Comparación de cada Gobernación contra la **Capitanía homónima** de
`_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv`. Salida literal:

```
  Arica            gob +56 58 2356702   cap +56 58 2356704 (Secretaría Protoco   -> CELDA NO ATOMICA
  Iquique          gob +56 57 2401902   cap +56 57 2401942                       -> DIFIERE
  Antofagasta      gob +56 55 2630000   cap +56 55 2630000                       -> IGUAL
  Caldera          gob +56 52 2315276   cap +56 52 2315276                       -> IGUAL
  Coquimbo         gob +56 51 2558100   cap +56 51 2558100                       -> IGUAL
  Valparaíso       gob +56 32 2208905   cap +56 32 2208505                       -> DIFIERE
  San Antonio      gob +56 35 2584802   cap +56 35 2584800                       -> DIFIERE SOLO EN EL ULTIMO DIGITO
  Talcahuano       gob +56 41 3831100   cap +56 41 3831100                       -> IGUAL
  Valdivia         gob +56 63 2276905   cap +56 63 2276905                       -> IGUAL
  Puerto Montt     gob +56 65 2205100   cap +56 65 2205100                       -> IGUAL
  Castro           gob +56 65 2629405   cap +56 65 2629448                       -> DIFIERE
  Aysén            +56 67 2351450   -> SIN FILA de Capitania homonima
  Punta Arenas     gob +56 61 2201102   cap +56 61 2201105                       -> DIFIERE SOLO EN EL ULTIMO DIGITO
  Puerto Williams  gob +56 61 2624270   cap +56 61 2624271                       -> DIFIERE SOLO EN EL ULTIMO DIGITO
  Hanga Roa        gob +56 32 2100222   cap +56 32 2100222                       -> IGUAL

  IGUAL                            : 7
  DIFIERE SOLO EN EL ULTIMO DIGITO : 3
  DIFIERE                          : 3
  SIN FILA homonima                : 1
```

**Cómo leer eso, y qué NO concluye.** Que 7 de 15 coincidan **no** significa que
Gobernación y Capitanía compartan teléfono: significa que en esas siete la central es la
misma, cosa que la bitácora del frente ya había verificado a mano en Valdivia y
Talcahuano —*"mismo edificio y distinto piso"*—. Los 3 que difieren en el último dígito
son anexos de la misma central. **Ninguno de los dos casos autoriza a usar un valor en
lugar del otro**: siguen siendo dos entidades distintas, y `INV-10.1` pide que cada una
salga rotulada como lo que es.

**`Aysén` no tiene Capitanía homónima**: su sede es Puerto Chacabuco. Es la única de las
quince que no se puede cotejar por esta vía.

**`Arica` tiene la celda no atómica** — `"+56 58 2356704 (Secretaría Protocolar) ó
+56 58 2356747 (Guardia)"` —, así que no se compara: comparar contra una celda con dos
números y texto adentro daría un veredicto sin significado.

---

## Cotejo contra la tabla hardcodeada que este dato existe para reemplazar

```
  coinciden (comparando solo digitos): 11 de 15
  difieren:
  Arica            tabla +56 58 220 6402    vs fuente +56 58 2356702
  Talcahuano       tabla +56 41 226 6100    vs fuente +56 41 3831100
  Puerto Montt     tabla +56 65 256 1100    vs fuente +56 65 2205100
  Aysén            tabla +56 67 233 1405    vs fuente +56 67 2351450
```

**Son CUATRO, no tres.** `PLAN_JURISDICCION.md` §7.1 punto 1 tiene medido, contra lo que
DIRECTEMAR publicaba el **2026-08-12**, que *"12 coinciden, 3 difieren (Arica, Talcahuano,
Puerto Montt) y 1 falta (Antártica Chilena)"*. Contra la captura del **2026-08-14**
difieren **cuatro**: las mismas tres más **`Aysén`**.

**No se resuelve acá.** Puede ser que el valor de Aysén haya cambiado entre el 12 y el
14, que la captura del 12 lo leyera de otro bloque, o que una de las dos esté mal. **No
está medido cuál**, y decidirlo exige volver a la fuente. Queda declarado para que la
diferencia no se descubra de nuevo desde cero.

---

## Cómo se rehace el cotejo

Desde la raíz del repositorio, en **PowerShell** (`CLAUDE.md` §7.2):

```
cd C:\Users\katia\tmarea-backend
node _bitacoras\frente_contacto_fallback_2026-08-14\medir_fallback.js
```

Ese instrumento trae el bloque `B` con las columnas del CSV y la cobertura de las quince
franjas. El cotejo específico de esta página se reproduce leyendo este JSON contra
`capitanias_64_final.csv` y contra `GOBERNACIONES` de `src/utils/capitanias.js`, que son
los tres archivos que las dos tablas de arriba comparan.

## Cómo se vuelve a capturar

**No hay comando.** Los valores los tomó el owner navegando las páginas de Gobernaciones
Marítimas de DIRECTEMAR; no se registró la URL de cada una. Recapturar hoy significa
repetir esa navegación. **Es la deuda que separa este directorio de
`fuente_resoluciones_locales/`**, que sí tiene su `curl.exe` escrito.

## Por qué NO hay `.gitattributes` acá

Los tres directorios de los que copia la forma lo llevan porque versionan un `.txt`
derivado de un PDF cuyo `sha256` está declarado, y `core.autocrlf=true` lo reescribiría.
Acá **no hay hash de archivo declarado ni derivado que proteger**: el dato es un JSON que
`require()` y `JSON.parse` leen igual con cualquier final de línea. Se deja sin la regla a
propósito, y se dice, para que la ausencia no se lea como olvido.
