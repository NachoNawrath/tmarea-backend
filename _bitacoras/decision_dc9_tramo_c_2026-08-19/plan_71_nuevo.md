**El Tramo C ya tiene alcance: la pregunta normativa se contestó el 2026-08-19.** Hasta esa
fecha este apartado describía el Tramo C **por su estado y no por lo que haría**, y la omisión
era deliberada: había una pregunta normativa abierta entre `D-C9` y su alcance. **La contestó
el owner.** Con ella `D-C9` quedó **enmendada al pie** de `cableo_cierre_2026-08-17.txt` §5 —la
cita se corrigió: el apoyo de `D-C9` está en los **Arts. 24 y 25** del RRDN, **no** en el 29 ni
en el 30, que son los que §5 citaba por número; y el motivo operativo del «no bloquea» quedó
declarado caído—. `D-C9` **se sostiene**: lo que caducó es el motivo operativo, no el
fundamento. Registro completo, con el cotejo carácter por carácter:
`_bitacoras/decision_dc9_tramo_c_2026-08-19/`.

#### `D-C10` — el alcance del Tramo C. Decidida por el owner el 2026-08-19.

**El puerto de zarpe cerrado apaga el botón de iniciar viaje, y SÓLO ESO.** Todos los demás
datos —viento, olas, mareas, ruta, restricciones del trayecto— siguen en pantalla.

**Razón del owner, y va escrita:** el patrón que consulta no se castiga, y la información le
explica el bloqueo — ve viento fuerte en la ruta y entiende por qué la Capitanía no da zarpe.
El bloqueo enseña en vez de frustrar.

**Medido, y por eso `D-C10` no agrega código de apagado:** en `tmarea-pwa@6443178`,
`P3_VoyageVerification.jsx` usa `veredicto === 'UV'` en **cinco** lugares y los cinco son el
CTA —color de fondo, cursor, `onClick`, `disabled` y su rótulo—. **Ningún bloque de la pantalla
se oculta.** Lo que sigue faltando es la línea de entrada a `estado`, no el apagado.

**LA EXCEPCIÓN, ESCRITA ACÁ PARA QUE NO SE DESCUBRA TARDE.** El «y sólo eso» tiene un caso en
que no alcanza, porque en `UV` `VoyageVerdict.jsx` no oculta: **agrega**. La línea

> `Puedes navegar hasta {bahía}. A partir de ahí, la zona está restringida.`

saldría **junto a «No zarpar», en la misma tarjeta**. §5 de `cableo_cierre_2026-08-17.txt` ya la
tenía anotada como `EFECTO SECUNDARIO`. **Esa línea también queda cubierta por `D-C10`.** Dos
cosas que quien implemente necesita y no se deducen mirando un solo archivo:

- **El string está DOS veces en el árbol** — `VoyageVerdict.jsx` y `TransitRestrictionsBlock.jsx`.
  Medido hoy sobre `tmarea-pwa@6443178` `src/`, vocabulario «Puedes navegar hasta»: **2
  apariciones**; control negativo, **0**. Arreglar una y dejar la otra deja la pantalla diciendo
  lo contrario del veredicto.
- **La condición exacta en que muerde**, medida en `route-restriction-evaluator.js`:
  `ultimo_tramo_seguro` se puebla **sólo** cuando una restricción **de tránsito** llega a `UV` y
  **no es la primera** de la ruta. O sea: zarpe cerrado **más** restricción de tránsito `UV` más
  adelante. No es siempre; es un caso real y acotado.

#### `D-C11` — el aviso informa la vía del Art. 36 y cita el texto. Decidida por el owner el 2026-08-19.

Se aparta de **C2** —«citar el artículo en el aviso»—, que `cableo_cierre_2026-08-17.txt` §4
descartó **sin motivo escrito**, a diferencia de B2 y A1, que sí lo llevan. **El motivo del
apartamiento va escrito:** acá la cita no es adorno, es con lo que el patrón se presenta cuando
llama a la Capitanía.

**El copy, decidido por el owner:**

> Puerto de zarpe cerrado.
> No puede iniciar su navegación.
>
> Alternativa excepcional: el Decreto 364, sobre Recepción y Despacho de Naves, dispone en su
> artículo 36 que «en caso de mal tiempo y con puerto cerrado, la Autoridad Marítima podrá
> conceder el zarpe de la nave que se encuentra a la gira hasta un próximo puerto del litoral,
> siempre y cuando el capitán asegure que la nave está en condiciones de hacerlo y se
> responsabilice de ello».
>
> Solo la Capitanía puede autorizarlo, y rara vez lo hace. Consulte a la **[rótulo] [nombre]**
> si cree que aplica en su caso.

**Razón del owner, y va escrita:** la condición gobernante es **NO ZARPAR**. La vía del Art. 36
se informa porque el reglamento la da, pero **no puede leerse como una opción normal** — de ahí
«excepcional», «solo la Capitanía» y «rara vez lo hace». **Ninguna cifra de frecuencia va en
pantalla: no está medida.**

**Tres cosas del copy que son dato medido y no elección de redacción:**

1. **La cita es literal y está cotejada carácter por carácter.** Es **subcadena exacta** de
   `art_36` de `data/decreto/rrdn_articulos.json` —`indexOf = 206`, **0 caracteres
   divergentes**—; control negativo, la misma cita con «Marítima»→«Maritima», da `-1`. Lo único
   que recorta del literal es el «Asimismo » de arranque y el punto final. **Y es, carácter por
   carácter, la misma cita que `CONTRATO_MOTOR.md` INV-2.1 ya traía** bajo el rótulo «Texto
   legal literal»: el copy no introduce una cita nueva, manda a pantalla la que el contrato ya
   declaraba.
2. **El teléfono NO va en el aviso, y no es una omisión.** INV-10.1, primera frase: el teléfono
   se muestra «sólo en el punto de zarpe y en el de recalada, **nunca dentro de un mensaje
   normativo**», y éste lo es. Sigue visible en la tarjeta de zarpe (`PortStatusBlock`), en la
   **misma pantalla**, con su nivel ya resuelto por el motor y con `tel:` **sólo si el motor lo
   declaró atómico** —ese guard ya está escrito y es el único de los 6 puntos de render con
   `tel:` de la PWA que lo tiene—. Es la misma solución que el Tramo B tomó para el aviso de
   recalada. **INV-10.1 no se abre.**
3. **`[rótulo]` es variable, no el literal «Capitanía».** Lo resuelve `rotularContacto`, la
   misma función que la PWA ya comparte entre el aviso de cierre y el recordatorio R1. **Medido
   sobre los 489 puertos de zarpe con bahía resuelta: 265 caen en escalón 1 (Capitanía de Puerto
   de) y 224 en escalón 2 (Gobernación Marítima de).** Un literal «Capitanía de Puerto de»
   rotularía Capitanía sobre una Gobernación en **224 de 489 (45,8 %)**, que es exactamente el
   defecto que INV-10.1 existe para cerrar. En escalón 3 la frase se omite entera, sin texto de
   reemplazo; hoy es **inalcanzable por esta vía (0 de 489)**.

#### EL TECHO DEL TRAMO C — 489 de 688, y los otros 199 NO son un caso de copy

**Definición de «puerto de zarpe», declarada y no supuesta.** `P2_VoyageSetup.jsx` renderiza el
selector de zarpe con `tipo="puerto"` **fijo**, y `CONFIG_BUSQUEDA.puerto` apunta a
`/api/puertos?search=`; **no hay ninguna otra vía a `puerto_zarpe`**. Ese endpoint sirve
`nodos_maritimos` con `fuente != 'SITPORT'`, cuyo espejo versionado —el mismo artefacto que el
motor lee en vivo por `fichaDePuerto`— es `data/catalogo/join_puerto_bahia.json`, sha256
`4f9fbdc3…`: 693 filas de base, **688 nombres distintos**. **DENOMINADOR = 688 nombres.**

| clase | filas | sobre 688 |
|---|---:|---:|
| **con bahía resuelta — el Tramo C los cubre** | **489** | **71,1 %** |
| sin bahía · `sin_bahia_en_catalogo` | 113 | 16,4 % |
| sin bahía · `a_adjudicar` | 74 | 10,8 % |
| sin bahía · `bahia_declarada_lejos` | 12 | 1,7 % |
| **sin bahía, total — el Tramo C NO los alcanza** | **199** | **28,9 %** |

**Los 199 NO PUEDEN DISPARAR EL BLOQUEO, por construcción: sin bahía no hay estado de puerto, y
sin estado nunca hay `'rojo'`.** Es un **falso negativo silencioso**, no un caso de copy — el
aviso no se queda sin a quién nombrar: **no llega a existir**. De los 489 que sí lo disparan,
**cero** tienen Capitanía desconocida (489/489 con entrada en el mapa).

**Corrige una premisa que circulaba y era falsa: los 199 NO son destinos.** Salen del **mismo**
catálogo que alimenta el selector de zarpe y sirven de origen exactamente igual que de destino.
El solapamiento entre «puerto de zarpe» y «puerto de destino de tipo puerto» es **total**, no
parcial.

**Dos de las tres clases ya tienen frente; la tercera no se mide acá.**

- **`a_adjudicar` (74) → `F3`**, el backlog, sesión propia (arriba en este mismo apartado).
- **`bahia_declarada_lejos` (12) → `(a1)`**, corregir los `lng` desplazados 6,00° en 11 nodos de
  `nodos_maritimos`. **Cuidado con el número, y por eso va con su unidad:** `(a1)` **no**
  recupera «8 de las 12 filas». Recupera **8 CIERRES REALES**, concentrados en **2** de esos 12
  puertos —`Puerto De Caldera Mejoras Fiscales` (7) y `Huasco` (1)—, que son los 2 falsos
  negativos que la regla (c) causa. Es el mismo 8 contado de los dos lados, ya declarado en el
  recuadro «UN SOLO 8, CONTADO DE DOS LADOS» de este apartado. **Cuántas de las 12 filas vuelven
  a tener bahía: NO MEDIDO.**
- **`sin_bahia_en_catalogo` (113)** depende de una **medición de cobertura del teselado que no
  se hace en este apartado y exige `psql`**. Es el bloque más grande del techo y **no tiene
  frente asignado**.

Se publica **el hecho y su reparto, sin recomendación de qué hacer con él**.

**Qué tiene abierto al Tramo C — son DOS bloqueos, cada uno con su fecha, y el primero ya no
rige:**
