# INSUMOS PARA UNA DECISIÓN DEL OWNER — D-C9 y el alcance del Tramo C

Levantados el **2026-08-19**. **Esto no decide nada.** No elige entre alternativas, no
recomienda alcance y no interpreta la norma. Son tres insumos crudos, pedidos para que la
decisión se pueda tomar mirando el material y no la memoria. La decisión es del owner y se toma
en una sesión aparte.

**La tensión que hay que poder resolver, planteada sin tomar partido.** Hay dos decisiones
cerradas y en la letra apuntan al revés:

- **`D-C9`** dice que la app **no bloquea el zarpe en ese frente**, porque hay un funcionario de
  la Autoridad Marítima entre la app y el zarpe (D.S. 364, Arts. 29 y 30).
- **El catálogo de mensajes de `CONTRATO_MOTOR.md`** —la fila **«Zarpe cerrado»**— dice
  **«🔴 U+V "Puerto de zarpe cerrado. Navegación no recomendada."»**, y en esta app `UV`
  deshabilita el CTA.

Esta sesión no las concilia. Levanta lo que hace falta para poder hacerlo.

---

## (1) ¿D-C9 TRAE ACOTADO EL «EN ESE FRENTE»?

**SÍ. El acotamiento existe y está en el propio título de la sección.** La respuesta a la
pregunta, por lo tanto, ya está escrita; se transcribe entera igual, porque lo que se pidió es
el texto y no un resumen suyo.

**Ubicación:** `_bitacoras/cableo_cierre_2026-08-17/cableo_cierre_2026-08-17.txt`, sección
**§5**, cuyo título es —textual— `§5 · D-C9 · EL ZARPE NO SE BLOQUEA EN ESTE FRENTE`. Es la
única aparición de `D-C9` con desarrollo en los dos repositorios. Medido hoy sobre
`tmarea-backend` sin `node_modules`: `D-C9` da **6** apariciones — 4 en ese mismo fichero, 1 en
`tramo_b_render_2026-08-17.txt` y 1 en `PLAN_JURISDICCION.md` §7.1, escrita hoy por esta misma
sesión. Antes de hoy eran 5, todas remitiendo a ésta. En `tmarea-pwa`: **0**.

**Transcripción TAL CUAL, desde el encabezado de §5 hasta el fin del bloque:**

```
================================================================================
§5 · D-C9 · EL ZARPE NO SE BLOQUEA EN ESTE FRENTE
================================================================================
MARCO NORMATIVO DEL OWNER — CERRADO. NO SE PIDE FUENTE, NO SE RE-ABRE.

· D.S. 364/1980, Reglamento de Recepción y Despacho de Naves. Alcance nacional.
  Art. 29 clasifica las embarcaciones para determinar qué autoridades intervienen
  en el despacho, e incluye expresamente las naves menores nacionales
  (categoría E) — o sea, cubre al usuario de Tmarea. Art. 30 y correlativos: para
  obtener autorización de zarpe la nave presenta documentación y cumple las
  disposiciones de seguridad de la Autoridad Marítima. Ninguna nave inicia
  navegación sin despacho.
· El acto operativo —llamar por VHF Canal 16 o por teléfono al soltar amarras— lo
  fija la resolución local de cada Capitanía. Misma estructura que el cierre:
  marco nacional que obliga, forma local.

CONSECUENCIA: hay un funcionario de la Autoridad Marítima entre la app y el
zarpe, por norma, siempre. Un aviso equivocado se corrige ahí; un botón apagado
no lo destraba nadie. Por eso el aviso tolera el defecto de atribución y el
bloqueo no.

LÍMITE DECLARADO, para que no se apoye en lo que no dice: lo que sostiene a D-C9
es que EL DESPACHO ES OBLIGATORIO. NO que el funcionario avise sobre el puerto de
destino — el despacho verifica documentación y seguridad, y avisar la condición
del puerto de recalada no está en el reglamento. El argumento no se apoya en eso.

ESTE MARCO VA AL CONTRATO DEL FRENTE, NO A LA PANTALLA: el copy sigue siendo
B1 + C1, y C2 (citar el artículo en el aviso) ya fue descartada.

Sin esta redacción, dentro de tres meses el zarpe sin bloqueo parece un olvido y
alguien lo "arregla".
```

**Qué acota, dicho sin agregar nada.** Tres piezas del propio texto acotan por sí solas y se
señalan porque son las que contestan la pregunta: **(i)** el título dice `EN ESTE FRENTE`;
**(ii)** el párrafo rotulado `LÍMITE DECLARADO` acota qué sostiene el argumento —*«que EL
DESPACHO ES OBLIGATORIO»*— y qué **no** —*«NO que el funcionario avise sobre el puerto de
destino»*—; **(iii)** el penúltimo párrafo acota el destinatario: *«ESTE MARCO VA AL CONTRATO
DEL FRENTE, NO A LA PANTALLA»*.


---

## (2) QUÉ HACEN HOY LOS TRAMOS A Y B RESPECTO DEL ZARPE

Levantado del **código**, no de la memoria. Repos en `tmarea-backend@2bd0ff6` y
`tmarea-pwa@6443178`. **Se cita por fichero y por texto, no por número de línea**: los dos
Tramos movieron rangos y una cita por línea envejece entre commits.

### 2.1 · El mecanismo de bloqueo UV de zarpe ESTÁ CONSTRUIDO Y VIVO

No está «sólo decidido». Las cuatro piezas existen en el árbol de hoy y se encadenan:

- **`tmarea-pwa/src/hooks/useVoyageVerification.js`**, en `calcularVeredicto`:

  ```js
  const veredictoZarpe =
    portStatus?.zarpe?.estado === 'rojo' ? 'UV' :
    (portStatus?.zarpe?.estado === 'ambar' || portStatus?.zarpe?.dato_viejo) ? 'U' : 'Q';
  ```

- **`tmarea-pwa/src/screens/P3_VoyageVerification.jsx`**, el CTA:

  ```jsx
  onClick={veredicto !== 'UV' ? onStartVoyage : undefined}
  disabled={veredicto === 'UV'}
  ```

- **`tmarea-pwa/src/components/verification/VoyageVerdict.jsx`**, la razón y la bandera:

  ```js
  if (portStatus?.zarpe?.estado === 'rojo') {
    razones.push(`Puerto de zarpe "${portStatus.zarpe.nombre}" cerrado`);
  }
  ```
  y el subtítulo de la bandera U+V: `'Puerto cerrado, mal tiempo o riesgo de autonomía. No zarpar.'`

- **`tmarea-pwa/src/components/verification/PortStatusBlock.jsx`**, el badge del estado `rojo`,
  con `label: 'Cerrado'`.

### 2.2 · LO QUE NO ESTÁ CONSTRUIDO ES LA ENTRADA: `estado` NUNCA VALE `'rojo'`

El mecanismo de arriba **no se alcanza hoy**, y no por casualidad. En el mismo hook,
`mapearRespuestaPuerto` es lo único que produce `estado`, y su única vía a `'rojo'` es:

```js
if (restricciones.some((r) => r.nivel === 'cierre_total')) estado = 'rojo';
else if (restricciones.length > 0) estado = 'ambar';
```

El comentario que la precede, en el árbol de hoy y textual, declara por qué se dejó así:

```
// NO SE TOCA EN ESTE TRAMO, Y NO ES UN OLVIDO. `nivel` no existe en ninguna de
// las 444 filas del sondaje, así que este `some` es `false` siempre y `estado`
// NUNCA vale 'rojo'. Reemplazarlo por el dato de cierre enciende el veredicto
// UV de ZARPE, que deshabilita el CTA — eso es Tramo C (Z3), y no arranca
// hasta que el filtro de puerto del backend esté resuelto. D-C9: el despacho
// ante la Autoridad Marítima es obligatorio y hay un funcionario entre la app
// y el zarpe, así que un aviso equivocado se corrige ahí, pero un botón
// apagado no lo destraba nadie. Por eso el aviso tolera el defecto de
// atribución del filtro y el bloqueo no.
```

### 2.3 · Qué escribió cada Tramo, y qué NO tocó

- **Tramo A (`tmarea-pwa@a478518`)** enganchó el aviso al **dato de cierre**, no al `estado`.
  El hook expone `cierresDeclarados(puerto)` y `hayCierreDeclarado(puerto)`, que leen
  `puerto.cierre` —el array hermano que el backend emite— y filtran `c.estado === 'cerrado'`.
  El comentario de la compuerta D-C7, en el árbol de hoy, dice textualmente:

  ```
  // POR QUÉ NO PASA POR `estado` (Z2, decisión del owner, 2026-08-17). El camino
  // `estado === 'rojo'` alimenta A LA VEZ este aviso y el veredicto de ZARPE, que
  // deshabilita el CTA (P3:330-341). Encenderlo acá arrastraría el bloqueo de
  // zarpe de contrabando, sin instrumento y con el sobre-alcance del filtro de
  // puerto vivo (backend `sitport-routes.js:333-338`, subcadena y no palabra).
  // El aviso no necesita `estado`: necesita `cierre`. Leyéndolo directo, este
  // Tramo mueve CERO veredictos — hoy 'ambar' da 'U' en recalada y un 'rojo' de
  // recalada también da 'U' por el tope del Art. 24: es el mismo valor.
  // El zarpe es Tramo C y NO arranca hasta que el filtro esté resuelto (D-C9).
  ```

- **Tramo B (`tmarea-pwa@6443178`)** escribió el **render** del aviso en
  `P3_VoyageVerification.jsx` y consume `cierresDeclarados`. **Tampoco toca `estado`.**

- **El tope del Art. 24** —`recaladaRaw === 'UV'` baja a `'U'`— está escrito y su rama tampoco
  se alcanza hoy, por el mismo motivo. El comentario que lo acompaña lo declara: *«EL TOPE DEL
  ART. 24 SE CONSERVA INTACTO aunque hoy su rama no se alcance… el Tramo C lo enciende y el
  tope tiene que estar ahí cuando eso pase.»*

- **El backend** emite el dato: `sitport-routes.js` devuelve `cierre` como array hermano de
  `restricciones`, alineado por `IDRestriccion`, derivado por `cierre-derivador.js`. El campo
  `nivel` que `mapearRespuestaPuerto` interroga **no es de ese array**: no existe en las filas
  crudas de SITPORT.

### 2.4 · EL ESTADO DE HECHO, SIN CONCLUSIÓN

Se enuncia como hecho medible y **no** se deriva de él ninguna recomendación:

1. **La app no bloquea hoy el zarpe por un cierre declarado**, porque el dato de cierre no llega
   a `estado` y `estado` es lo único que el veredicto de zarpe lee.
2. **La app tampoco lo bloquea por ninguna otra causa de puerto**, porque `'rojo'` no se produce
   por ninguna vía: la única condición que lo produciría (`r.nivel === 'cierre_total'`) es falsa
   en las 444 filas del sondaje versionado.
3. **Todo lo que haría el bloqueo está escrito y vivo** —veredicto, CTA deshabilitado, razón,
   bandera U+V, badge «Cerrado», tope del Art. 24—, y lo que falta es **una línea de entrada**:
   qué hace que `estado` valga `'rojo'`.
4. **Ninguno de los dos Tramos cerrados escribió esa línea**, y los dos declararon por escrito
   que no la escribían y por qué.
5. **El motivo que los dos declararon —el sobre-alcance del filtro de puerto del backend— dejó
   de existir el 2026-08-18 con F2**: `includes(w` pasa de 2 a 0 ocurrencias en `src/` entre
   `2bd0ff6^` y `2bd0ff6`. Los comentarios citados arriba **siguen nombrando ese filtro** y en
   ese punto quedaron vencidos; esta sesión no los corrige porque `src/` y la PWA están fuera de
   su alcance de escritura. Queda redactado acá (`CLAUDE.md` §6.1).

---

## (3) EL TEXTO DE D.S. 364 ARTS. 29 Y 30

### NO ESTÁ. En ninguno de los dos repositorios.

**No se reconstruye de memoria y no se salió del árbol a buscarlo.** Lo que sigue es la
declaración de dónde se buscó y qué se encontró en su lugar.

**Árbol recorrido — los dos repos completos, excluyendo `node_modules`:**

- `C:\Users\katia\tmarea-backend` en `2bd0ff6` (incluye `docs/`, `_bitacoras/`, `src/`, `data/`,
  `sql/`, `scripts/`, `sondaje-sitport/`, `CONTRATO_MOTOR.md`, `CLAUDE.md`)
- `C:\Users\katia\tmarea-pwa` en `6443178`

**Patrón 1 — el decreto por su nombre** (`D.S. 364` / `DS 364` / `364/1980` /
`Reglamento de Recepción y Despacho de Naves`, insensible a mayúsculas):

- `tmarea-pwa` → **0 apariciones**.
- `tmarea-backend` → **11 apariciones**, ninguna con texto de artículo. Se reparten así:
  `CONTRATO_MOTOR.md` lo cita en su lista de fuentes normativas y en el catálogo de mensajes,
  siempre en **paráfrasis de una línea** y sólo de los **Arts. 13, 16, 17 y 36**;
  `CLAUDE.md` lo nombra en la lista de fuentes a contrastar;
  `_bitacoras/cableo_cierre_2026-08-17/cableo_cierre_2026-08-17.txt` lo nombra en D-C9;
  `_bitacoras/reconocimiento_jurisdiccion_maritima_2026-08-09.txt` lo nombra de pasada; y
  `_bitacoras/fase5Y_auditoria_del_fundamento_2026-08-10.txt` lo nombra **en una lista titulada
  `LO QUE NO EXISTE`**, junto al D.S. 991 y al D.L. 2222.

**Patrón 2 — los artículos** (`Art. 29`, `Art. 30`, `Artículo 29`, `Artículo 30`):

- `tmarea-pwa` → **0 apariciones**.
- `tmarea-backend` → **6 apariciones, y ninguna es del D.S. 364.** Es la trampa de este grep y
  por eso va declarada, no resumida:
  - `docs/TMAREA_SPEC_Router_Raster_v1.md`, dos veces: **`TM-002` Art. 29** (umbral de nave
    menor, 50 TRG), que es **otro reglamento**;
  - `src/services/data/tmarea_rutas_australes.json`, dos veces: **Reglamento de Practicaje y
    Pilotaje, TM-008, `D.S. 397/1985`, Arts. 29 y 45**, que es **otro decreto**;
  - `_bitacoras/cableo_cierre_2026-08-17/cableo_cierre_2026-08-17.txt`, dos veces: **las de
    D-C9**, que son las del D.S. 364 y son **la paráfrasis del owner**, no el texto.

**Control positivo del instrumento, para que estos ceros valgan.** El mismo grep, sobre el mismo
árbol, encuentra los artículos del D.S. 364 que sí están citados: `Art. 36` da **9** apariciones
en `CONTRATO_MOTOR.md` y `Art. 24` da **3**. Y para la clase «artículo con su texto adjunto»,
`"art_2"` da **2** en `data/decreto/` (v1 y v2) y `texto_decreto` da **167**. **El grep muerde en
las dos clases; lo que no está es el texto de los Arts. 29 y 30.**

### LO ÚNICO ESCRITO SOBRE ARTS. 29 Y 30 ES LA PARÁFRASIS DEL OWNER DENTRO DE D-C9

Está transcripta entera en el insumo (1) de este mismo fichero. Se señala lo que es, sin
calificarla: es **una paráfrasis**, va bajo el rótulo `MARCO NORMATIVO DEL OWNER — CERRADO. NO
SE PIDE FUENTE, NO SE RE-ABRE`, y **la fuente que resume no está adjunta en el repositorio**.

Para contraste, y sin sacar conclusión de la comparación: el **Art. 2 del D.S. 991** sí está en
el árbol con su texto literal —bloque `articulos`, entrada `art_2`, en el insumo del decreto,
con `texto_decreto`, `procedencia` y `documento_sha256`—, porque `D6` lo exigió. Para el D.S. 364
no hay nada equivalente.

---

**FIN DE LOS INSUMOS.** No se eligió entre alternativas, no se recomendó alcance y no se
escribió cuál conviene. La decisión es del owner.
