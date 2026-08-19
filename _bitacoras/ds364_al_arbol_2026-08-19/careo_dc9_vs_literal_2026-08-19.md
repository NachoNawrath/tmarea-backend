# Careo — la paráfrasis de `D-C9` y el texto literal del D.S. 364

**Escrito el 2026-08-19. Material de lectura para el owner. No decide nada.**

---

## Qué es este fichero, y qué NO es

`D-C9` es una decisión **cerrada**: la app no bloquea el zarpe en ese frente. Su fundamento
normativo está escrito en `_bitacoras/cableo_cierre_2026-08-17/cableo_cierre_2026-08-17.txt`,
sección **§5**, bajo el rótulo `MARCO NORMATIVO DEL OWNER — CERRADO. NO SE PIDE FUENTE, NO SE
RE-ABRE`. Ese fundamento es **una paráfrasis**: hasta el 2026-08-19, el texto del decreto que
resume **no estaba en ninguno de los dos repositorios**.

Ahora sí está. Este fichero pone las dos cosas una al lado de la otra.

**Lo que este fichero NO hace, y no por omisión:**

- **no concilia** las dos redacciones;
- **no dice cuál gana**;
- **no contesta `D-C9`** ni recomienda ningún alcance para el Tramo C;
- **no propone tocar `§5`, `CONTRATO_MOTOR.md` ni `PLAN_JURISDICCION.md`.**

Señala **hechos medibles**: qué dice cada texto y dónde no coinciden. Qué hacer con eso es
decisión del owner y se toma en otra sesión.

---

## EL HECHO DE ENCABEZADO — para quien no siguió la sesión que trajo el decreto

> **La paráfrasis del owner es correcta en su contenido. Lo que no calza son los números de
> artículo.**
>
> Las tres cosas que `§5` afirma sobre el reglamento **están todas en el decreto**, con el mismo
> sentido y en algunos puntos con las mismas palabras.
>
> Pero lo que `§5` declara como **el apoyo del que depende `D-C9`** —*«lo que sostiene a D-C9 es
> que EL DESPACHO ES OBLIGATORIO»*— **no está en el Art. 29 ni en el Art. 30**, que son los dos
> que `§5` cita por número. **Está en el Art. 24 y en el Art. 25.**

Por eso este careo trae cuatro artículos y no dos. Un careo restringido a los dos citados habría
puesto, al lado de la paráfrasis, un texto que no contiene aquello sobre lo que la paráfrasis se
apoya — y la lectura natural de esa página habría sido *«esto no está respaldado»*. **Sí está
respaldado, en el mismo decreto: en los Arts. 24 y 25, antes de los dos que `§5` cita y
dentro del mismo Título III.**

Que sea un desajuste de numeración y no de contenido es el hecho; **qué consecuencia tiene, si
alguna, no se dictamina acá.**

---

## Cómo leer el careo

- **Primero, en cada bloque:** la paráfrasis, transcrita tal cual de `§5`.
- **Después:** el texto literal, tal cual quedó versionado en
  `data/decreto/rrdn_articulos.json`, extraído del PDF de
  `data/decreto/fuente_ds364/` y verificado por re-búsqueda contra una re-extracción fresca
  (`02_control_rebusqueda.js`, 16 controles, 0 fallos).
- Los **cortes de línea duros del PDF** están deshechos en el literal, igual que en el `art_2`
  del D.S. 991. Ninguna palabra, acento, comilla ni abreviatura se tocó.

---

# EL CAREO, AFIRMACIÓN POR AFIRMACIÓN

## A1 · «Alcance nacional»

**Paráfrasis (`§5`):**

> D.S. 364/1980, Reglamento de Recepción y Despacho de Naves. **Alcance nacional.**

**Literal (Art. 24):**

> ARTICULO 24° Para hacerse a la mar **desde cualquier puerto de la República**, toda nave
> requiere la previa autorización de zarpe de la Autoridad Marítima…

**Coincide.** El literal no usa la expresión «alcance nacional»; dice «desde cualquier puerto de
la República».

---

## A2 · Qué hace el Art. 29 — **el número calza**

**Paráfrasis (`§5`):**

> **Art. 29** clasifica las embarcaciones para determinar qué autoridades intervienen en el
> despacho, e incluye expresamente las naves menores nacionales (categoría E) — o sea, cubre al
> usuario de Tmarea.

**Literal (Art. 29):**

> ARTICULO 29° Para determinar las autoridades que deben intervenir en su despacho **y los
> documentos que deberán presentarse**, las naves se clasifican en las siguientes categorías:
> A. Naves de cualquier nacionalidad que zarpen con destino directo a un puerto extranjero.
> B. Naves de cualquier nacionalidad que zarpen desde un puerto nacional con tratamiento
> aduanero especial a otro puerto nacional. C. Naves de cualquier nacionalidad que zarpen desde
> un puerto nacional a otro puerto nacional. D. Naves de cabotaje regional. **E. Naves menores
> nacionales.**

**Coincide, y acá el número de artículo es el correcto.** Tres diferencias medibles:

1. **La paráfrasis recoge una de las dos finalidades.** El literal dice que la clasificación
   sirve para determinar las autoridades **y los documentos que deberán presentarse**. La
   paráfrasis sólo nombra las autoridades.
2. **«Categoría E» es literal**: `E. Naves menores nacionales.` está en el texto, es la última
   de cinco categorías, y la paráfrasis la cita bien.
3. **«Cubre al usuario de Tmarea» es una inferencia del owner, no texto del decreto.** Medido
   sobre el decreto completo (38 artículos, extracción `-raw`): la expresión «naves menores»
   aparece **1 vez en todo el documento**, y es esa categoría E. **El decreto no define qué es
   una nave menor.** Define «arribada forzosa» (Art. 17) y acota el concepto de entrada a puerto
   (Art. 2° bis), pero de nave menor sólo da el nombre de la categoría. Control positivo del
   mismo instrumento: «despacho» da 25. Control negativo: «eslora» da 0. Qué embarcación cae en
   la categoría E **viene de fuera de este decreto**; este careo no dice de dónde.

---

## A3 · Qué exige el Art. 30 — **el número NO calza**

**Paráfrasis (`§5`):**

> **Art. 30 y correlativos**: para obtener autorización de zarpe la nave presenta documentación
> y cumple **las disposiciones de seguridad de la Autoridad Marítima**.

**Literal (Art. 30), los dos incisos:**

> ARTICULO 30° Para obtener la autorización de zarpe toda nave deberá cumplir con las
> disposiciones del **Reglamento de Operaciones Aduaneras** y presentar la documentación
> indicada en el **artículo 7° de este Reglamento**.
>
> Además para que la autoridad marítima otorgue el despacho de la nave al exterior, el capitán,
> armador o agente deberá obtener de la **Autoridad Aduanera** que estampe en la Declaración
> General la frase "sin cargo", con la firma de un funcionario competente.

**Aquí está el desajuste.** El Art. 30 literal:

- **no dice «seguridad»**;
- **no dice «Autoridad Marítima»** — su inciso 2 nombra a la Autoridad **Aduanera**;
- remite a **aduanas** y al **artículo 7°** de este mismo Reglamento.

**Lo que la paráfrasis describe está en el Art. 25:**

> ARTICULO 25° Para el despacho será necesario que el capitán o agente de la nave **presente a
> la Autoridad Marítima la Declaración General**, que la nave tenga su **documentación en orden**
> y que sus **condiciones de seguridad** para la navegación se conformen a la legislación y
> reglamentación marítima.

**Contenido: coincide con el Art. 25 casi palabra por palabra** —«presenta documentación» ↔
«documentación en orden»; «cumple las disposiciones de seguridad» ↔ «condiciones de seguridad…
se conformen a la legislación y reglamentación marítima»; «de la Autoridad Marítima» ↔ «presente
a la Autoridad Marítima»—. **Número: la paráfrasis dice 30, el texto está en el 25.**

**Nota sobre «y correlativos».** La paráfrasis no dice «Art. 30» a secas: dice **«Art. 30 y
correlativos»**, o sea que ella misma apunta fuera del artículo que nombra. Es un hecho del
texto de `§5`; **este careo no interpreta hasta dónde llega esa expresión.**

---

## A4 · «Ninguna nave inicia navegación sin despacho» — **la frase que sostiene `D-C9`**

**Paráfrasis (`§5`):**

> **Ninguna nave inicia navegación sin despacho.**

y, en el párrafo rotulado `LÍMITE DECLARADO`:

> lo que sostiene a D-C9 es que **EL DESPACHO ES OBLIGATORIO**.

**Literal (Art. 24):**

> ARTICULO 24° Para hacerse a la mar desde cualquier puerto de la República, **toda nave
> requiere la previa autorización de zarpe** de la Autoridad Marítima, **autorización que se
> denominará "despacho"** y se otorgará si se cumplen las formalidades y exigencias de los
> artículos siguientes.

**Contenido: coincide.** Es la misma proposición, y el literal es más fuerte en un punto: no sólo
obliga, sino que **define** el término. «Despacho» es, según el propio decreto, **el nombre de la
autorización de zarpe**.

**Número:** esta frase **no está en el Art. 29 ni en el Art. 30**. Está en el **Art. 24**, que es
el primero del Título III (`III.- Despacho de la Nave (Art. 24-38)`).

---

# LO QUE EL TEXTO LITERAL DICE Y LA PARÁFRASIS NO RECOGE

Hechos, sin calificarlos y sin derivar nada de ellos.

1. **El Art. 24 encadena hacia adelante.** Dice que el despacho «se otorgará si se cumplen las
   formalidades y exigencias de **los artículos siguientes**». Los Arts. 25 al 38 —entre ellos el
   29 y el 30— son esos artículos siguientes. La paráfrasis no recoge esa cadena.
2. **El Art. 25 nombra un documento concreto: la «Declaración General».** La paráfrasis dice
   «documentación» en genérico.
3. **El Art. 29 clasifica también para determinar los documentos**, no sólo las autoridades.
4. **El inciso 2 del Art. 30 no aparece en la paráfrasis en ninguna forma.** Trata del despacho
   **al exterior** y del sello «sin cargo» de la Autoridad Aduanera. *(Sobre si ese inciso
   proviene de la modificación `DTO 220, DEFENSA, D.O. 07.07.2007`: las dos extracciones del PDF
   colocan esa anotación marginal en artículos distintos —`-layout` en el Art. 30, `-raw` en el
   Art. 33— y **cuál es la correcta no está determinado**. Se declara y no se afirma; está en la
   nota de parseo de `data/decreto/fuente_ds364/PROCEDENCIA.md`.)*
5. **El Art. 30 remite al «artículo 7° de este Reglamento», que NO está extraído y NO está en el
   árbol.** Quien quiera saber qué documentación exige el Art. 30 tiene que ir al PDF de
   `data/decreto/fuente_ds364/`. Se anota porque es una remisión abierta dentro de un texto que
   sí se versionó.
6. **Aduanas atraviesa el Título III y la paráfrasis no la menciona.** Aparece en el Art. 30 en
   sus dos incisos y en la categoría B del Art. 29 («tratamiento aduanero especial»).

---

# EL ALCANCE DE ESTE CAREO, PARA QUE NO SE LO LEA DE MÁS

**Son cuatro artículos de treinta y ocho.** Todo lo de arriba se midió contra los Arts. 24, 25,
29 y 30. Los otros treinta y cuatro **no se extrajeron** y este careo no dice nada sobre ellos.

Eso deja **una afirmación de `§5` explícitamente sin medir**, y se declara en vez de dejarla
pasar como si estuviera comprobada:

> LÍMITE DECLARADO […] NO que el funcionario avise sobre el puerto de destino — el despacho
> verifica documentación y seguridad, y **avisar la condición del puerto de recalada no está en
> el reglamento**.

Es una afirmación **negativa sobre el reglamento entero**. Comprobarla exige leer los 38
artículos, no 4. **Este careo no la comprueba ni la desmiente.** Lo que sí se puede decir es lo
acotado: **en los cuatro artículos extraídos no hay nada sobre avisar la condición del puerto de
recalada.** El PDF completo está versionado y la medición se puede hacer cuando alguien la pida.

---

# LO QUE QUEDA IGUAL

- **`D-C9` sigue cerrada.** Nada de esto la reabre. La sesión que produjo este careo tenía
  prohibido contestarla y no la contestó.
- **`§5` no se tocó.** Sigue tal cual en
  `_bitacoras/cableo_cierre_2026-08-17/cableo_cierre_2026-08-17.txt`.
- **`CONTRATO_MOTOR.md` no se tocó.** Sólo lo toca el owner.
- **`src/` no se tocó**, en ninguno de los dos repositorios.
- **La app sigue sin bloquear el zarpe**, por el motivo que ya estaba medido y escrito en
  `insumos_zarpe_2026-08-19.md`: `estado` nunca vale `'rojo'`. Este careo no cambia una línea de
  código.

**La decisión es del owner y se toma en otra sesión.**
