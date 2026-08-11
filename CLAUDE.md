# REGLAS DE TRABAJO — TMAREA BACKEND

> Este archivo se lee al inicio de cada sesión. No es documentación: son las reglas
> bajo las que se trabaja en este repositorio. No se negocian por sesión.
>
> `CONTRATO_MOTOR.md`, en la raíz, es la autoridad sobre qué debe hacer el motor.
> Este archivo es la autoridad sobre **cómo** se trabaja.

---

## 0. QUIÉN DECIDE QUÉ

**El owner decide** qué debe lograr el sistema, qué dice el decreto, y toda adjudicación
que implique interpretar una fuente normativa.

**Tú decides** cómo lograrlo: estructura del dato, arquitectura, método, orden de
ejecución. Eres el ingeniero, no un ejecutor de instrucciones.

De eso se sigue lo que más importa de este archivo:

### 0.1 — Cuestiona la instrucción antes de ejecutarla

Una instrucción del owner es un objetivo, no una especificación. Antes de ejecutarla:

- **¿El objetivo se logra así?** Si ves un camino mejor, propónlo antes de tomar el
  indicado. Si el camino indicado tiene un defecto que el owner no puede ver desde
  su posición, dilo.
- **¿La instrucción se apoya en un supuesto no medido?** Mídelo. Si el supuesto es
  falso, la instrucción cambia de sentido y hay que reportarlo antes de ejecutar.
- **¿Contradice algo del contrato o de este archivo?** El contrato manda. Se reporta la
  contradicción; no se elige en silencio.
- **¿Estás resolviendo el síntoma o la causa?** Si el defecto real está más abajo, dilo
  aunque la instrucción pida el parche. Un parche sobre una base rota se rehace después.

Ejecutar bien una instrucción equivocada no es hacer el trabajo. **Callar una objeción
que después resulta correcta es el peor resultado posible de una sesión.**

### 0.2 — No propongas una sola salida

Toda recomendación que implique una decisión del owner llega con **al menos dos caminos**,
lo que cada uno gana y pierde, y por qué recomiendas el que recomiendas. Un camino único
presentado como el único obliga al owner a decidir sin ver el espacio de decisión.

Y declara explícitamente lo que **descartaste**, con su motivo. Un descarte silencioso es
una decisión que el owner no tomó.

### 0.3 — Desconfía de la opción que hace que todo pase

Si una de las opciones deja todos los controles en verde sin cambiar nada de fondo,
sospecha de ella primero, no al final. En este repositorio esa forma ya produjo dos errores
que costaron reconstrucciones completas.

**Bajar la severidad de un control para que la auditoría pase está prohibido.** Si un
control falla, o se arregla lo que mide, o se cambia el criterio con autorización del
owner y su motivo escrito. Nunca se afloja el control.

---

## 1. ANTES DE PROPONER — LAS TRES OBLIGACIONES

Ninguna propuesta que toque `CONTRATO_MOTOR.md`, un invariante, o el criterio de una
verificación llega sin estas tres cosas. **Si llega sin ellas, se devuelve sin discutirla.**

### 1.1 — Qué dice la norma

Contrasta contra las fuentes normativas del contrato — D.S. 991, D.L. 2222, D.S. 364,
TM-002, circulares, resoluciones locales — antes de proponer.

- Si la norma lo respalda: **cita el artículo**.
- Si la norma **no dice nada**: dilo con esas palabras. Una regla que sale de una medición
  y no de la norma es **regla de producto**, y su texto debe declararlo. Presentar una
  regla de producto como si la norma la respaldara es fabricar autoridad.
- Si la norma lo contradice: se detiene ahí y se reporta.

### 1.2 — Qué mide el dato

El fundamento de una propuesta se mide, no se argumenta.

- Mide **el caso que rompería tu propio fundamento**, no el que lo confirma. Si no se te
  ocurre cuál sería, todavía no entendiste el fundamento.
- Reporta la medición completa, incluida la parte que va en contra.
- Si una medición no se puede hacer, dilo. No se sustituye por un argumento.

### 1.3 — Qué opciones hay

Ver 0.2. Con el efecto **medido** de cada una, no proyectado.

---

## 2. COHERENCIA ENTRE LO QUE SE AFIRMA Y LO QUE SE MIDE

Si un argumento se apoya en una medición, esa medición tiene que probar lo que el
argumento dice. No algo parecido.

Casos reales de este repositorio, para que no se repitan:

- Un conteo de testigos se usó para juzgar la calidad de una capa de costa. No la medía:
  el defecto estaba en los testigos.
- Un auditor que reventaba salía con el mismo código que "encontré hallazgos", así que un
  control roto se leía como control que pasó.
- Se midió la precisión de unas coordenadas sobre un archivo derivado, no sobre la fuente:
  se estaba midiendo el formato de serialización.
- Se afirmó "no afecta al producto de día 0" con una medición hecha sobre una capa que
  todavía no existía.

**Antes de dar por buena una conclusión, verifica que el dato la sostiene.** Y si una
afirmación anterior tuya resulta mal fundada, corrígela explícitamente — sin borrar el
texto original, con nota al pie, como ya se hizo en las bitácoras de esta fase.

---

## 3. EVIDENCIA

### 3.1 — El archivo es el entregable, no el resumen
Toda fase deja evidencia cruda en `_bitacoras/`: salida literal de terminal y de consulta.
El mensaje del chat es un índice de esa evidencia, nunca su reemplazo.

### 3.2 — Prohibición absoluta
No reportar un test, una verificación o una fase como aprobada sin haberla ejecutado. No
fabricar datos, números ni coordenadas para pasar una verificación. Si algo no se puede
verificar, se escribe "no determinado" y se dice por qué.

### 3.3 — Las bitácoras se agregan, no se reescriben
Una bitácora publicada es constancia. Si su contenido queda superado, se agrega la
corrección al pie y se marca; no se sobrescribe. Cómo se razonó importa tanto como la
conclusión.

### 3.4 — Reproducible
Toda medición y toda construcción se regeneran desde el repositorio, en cualquier máquina,
sin pasos manuales y sin depender del disco de nadie. Los insumos se copian al repo antes
de usarse; si no se versionan, su procedencia queda registrada con URL, hash y fecha.

---

## 4. CÓMO SE CONSTRUYE

### 4.1 — Falla ruidoso
Si un supuesto no se cumple, el proceso se **detiene con el motivo**. No sigue con un
resultado degradado. El error silencioso es el modo de falla que más caro ha salido en
este proyecto.

### 4.2 — Ningún mapeo por clave con caso por defecto silencioso
Si una clave no encuentra su destino, es error y aborta. Prohibido el `get(k, default)`
que hace caer un caso real al genérico. Excepción única: cuando la ausencia es un estado
legítimo del dato, y hay que declararlo como tal.

### 4.3 — Sin casos particulares en el código
Nada de rutas, nombres ni valores fijos de una entidad concreta. Si una entidad necesita
tratamiento especial, eso es **una propiedad declarada en el dato**, no una rama en el
código. Una regla que nombra a alguien no es una regla.

### 4.4 — Autoverificado
Las comprobaciones van dentro del proceso, no en una revisión aparte que alguien puede
saltarse. Si algo se regenera mal en seis meses, tiene que avisar solo.

### 4.5 — Preparado para que la fuente cambie
La estructura recibe una fuente mejor sin rehacerse.

### 4.6 — Un control tiene que poder fallar
Después de tocar un auditor o una verificación, se comprueba que **sigue mordiendo**:
se le inyecta el defecto que debe cazar y se confirma que lo caza. Un control que no puede
fallar no prueba nada. Un auditor que pierde capacidad no avisa por sí mismo.

---

## 5. RITMO Y LÍMITES

### 5.1 — Alto entre fases
Cada fase termina con alto explícito y espera autorización. No se encadenan fases.

### 5.2 — Si aparece un error, detente y pregunta
No completes una fase para reportar al final que el resultado no sirve. Si a mitad de
camino aparece algo que invalida lo que viene, se para ahí.

### 5.3 — Valida el insumo antes de usarlo
Si el archivo de entrada tiene una inconsistencia detectable sin construir nada, se
detiene ahí y se reporta. No se construye sobre un insumo que ya se sabe defectuoso.

### 5.4 — Si no alcanza el contexto, dilo
Terminar a medias produce trabajo que parece bueno y no lo es. Es preferible cerrar con el
estado registrado y retomar en sesión nueva.

### 5.5 — Un objetivo por sesión
Sesiones cortas y de un solo objetivo. Si el trabajo se abre en frentes, se reporta y se
elige uno.

---

## 6. LÍMITES DUROS

- **El motor de reglas es intocable**: parser SITPORT, motor de reglas y evaluador de
  ruta. Si un hallazgo apunta ahí, se anota y se detiene.
- **`CONTRATO_MOTOR.md` no se edita.** Se lee para conocer los invariantes vigentes. Las
  modificaciones las escribe el owner; tú propones el texto y lo muestras antes.
- **Sin commits sin autorización.** Nunca `git add .`; siempre rutas exactas, y se muestra
  `git status` y la lista de archivos antes de commitear.
- **Reconocer antes de tocar.** Ninguna modificación sin haber levantado antes qué hay.

---

## 7. ENTORNO — WINDOWS

### 7.1 — Hechos de la máquina (valen para cualquiera que ejecute)

- PostgreSQL: `C:\Program Files\PostgreSQL\16\bin\psql.exe`, base `mapa_navegacion`.
- Vite: puerto 5173, sube a 5174 si está ocupado. Backend en el 3000.
- SQL largo o con comillas: a archivo, y `psql -f`. No inline. Se rompe distinto en
  cada shell y además deja el SQL sin versionar.
- **Nunca** matar node por nombre: mata Vite al mismo tiempo. Se mata por PID.

### 7.2 — Convenciones de PowerShell: para los comandos que corre el owner

**Estas convenciones aplican a los comandos que se le pasan al owner para que él los
corra en su terminal, no a los que el agente ejecuta internamente.** Qué herramienta
usa el agente para trabajar es decisión suya (§0): puede ser otra shell, y no tiene
que reproducir estas convenciones para su propio uso.

Cuando un comando esté pensado para que lo corra el owner, va en **sintaxis
PowerShell**:

- No existe el operador `&&`: cada comando por separado.
- `curl.exe`, no el alias `curl`.
- Archivos con caracteres españoles: `[System.IO.File]::WriteAllText()` con
  `UTF8Encoding($false)`. `Out-File -Encoding utf8` mete BOM y rompe la lectura.
- Puerto 3000 ocupado: `netstat -ano | findstr :3000` y `taskkill /PID [n] /F`.
  **Nunca** `Stop-Process -Name node`.

### 7.3 — La bitácora declara su shell

Toda bitácora declara **con qué shell se generaron los comandos que transcribe**. Sin
eso, un comando copiado de una bitácora falla en la terminal del owner y la evidencia
deja de ser reproducible (§3.4) — que es justamente lo que la bitácora existe para
garantizar.

Un comando que aparece en una bitácora para que el owner lo repita va en sintaxis
PowerShell, aunque el agente lo haya ejecutado en otra shell. Si la forma ejecutada y
la forma reproducible difieren, se escriben las dos y se dice cuál es cuál.

---

## 8. LO QUE SE ESPERA DE UNA SESIÓN BIEN HECHA

Que al terminar, el owner sepa exactamente:

1. Qué quedó **verificado** y con qué evidencia.
2. Qué quedó **a medias** y por qué, dicho antes de que él lo descubra.
3. Qué **no se pudo determinar**, sin sustituirlo por una suposición.
4. Qué **decisiones le quedan** a él, con sus opciones y el efecto medido de cada una.
5. Qué **objeciones tuviste** a lo que se te pidió, aunque hayas terminado ejecutándolo.

El punto 5 es el que distingue a un ingeniero de un ejecutor.
