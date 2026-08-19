# ESTADO DE PLAN_JURISDICCION.md — CUÁNTO FALTA PARA TERMINARLO

Escrito 2026-08-19. De leer y escribir: no se corrió ningún instrumento, no se
consultó la base, no se levantó ningún servidor. Todo sale del documento
(2.582 líneas), de las bitácoras y del árbol.

**Sin estimación de tiempo ni de esfuerzo.** No hay base medida. El único tamaño
relativo que uso es el que existe: **si la pieza ya tiene su medición hecha, y si
toca producción o no.**

---

## LO PRIMERO, PORQUE CAMBIA CÓMO SE LEE TODO LO DEMÁS

### El frente del filtro NO ESTÁ EN ESTE PLAN. Creció al costado.

Busqué en `PLAN_JURISDICCION.md` los términos del frente que ocupó estas
sesiones. **Cero apariciones, todas:**

| término buscado | apariciones en el plan |
|---|---|
| `filtro_puerto` | 0 |
| `join_puerto_bahia` | 0 |
| `verde falso` | 0 |
| `b1-a` | 0 |
| `F2` | 0 |
| `fichaDePuerto` | 0 |

F1, (b1-a) y F2 —incluido `2bd0ff6`, que es **el commit que movió `src/`**— no
están descritos en ninguna parte de este documento. Tampoco el frente del cableo
de cierre (Tramos A, B y C), que tiene sus propias bitácoras.

**Qué significa, dicho sin suavizar:** este plan **dejó de describir lo que se
hace**. No es un plan a medias — es un plan **vencido como mapa del trabajo**.
Sigue siendo válido y exacto para lo que sí describe: la resolución de
jurisdicción por Capitanía. Pero si Nacho lo usa hoy para decidir orden creyendo
que ahí está todo, va a ordenar sobre la mitad del trabajo.

**Lo único que el plan sí anticipó** es la figura para esto: §7.1 se llama
literalmente *«Frentes laterales — no son etapas y no deberían fingir que lo
son»*. **El frente del filtro nunca se anotó ahí.** El mecanismo existía; nadie
lo usó.

---

## EL PLAN, SECCIÓN POR SECCIÓN, EN EL ORDEN DEL DOCUMENTO

### §1 · Inventario de insumos (1.1 a 1.6)
Descriptivo, no ejecutable. **No es una etapa.** Describe la base PostGIS, el
insumo del decreto, el mapa operativo, SITPORT, las capas en disco y el código
que resuelve jurisdicción hoy. **Riesgo:** es una foto del 2026-08-09/10 y
**nadie anotó si sigue siendo exacta.**

### §2 · Especificación — qué ve el patrón cuando esto esté terminado
La promesa del plan, con su «lo que NO promete». **No es una etapa.**

### §3 · Etapas — E0 a E8
El cuerpo del plan. Estado abajo.

### §4 · Dependencias y paralelismo · §5 · Decisiones · §6 · Riesgos
Descriptivos.

### §7 · Estado por etapa
La tabla viva. §7.1 frentes laterales, §7.2 control del estado del plan.

### §8 · Bitácora del documento · §9 · Lo que este documento no responde

---

## LAS ETAPAS — ESTADO Y QUÉ QUEDA

Estado tomado de la tabla de §7 del propio documento.

### E0 · Higiene del dato de identidad — **CERRADA**
**Qué era:** dejar de confundir identidades entre las fuentes de bahías.
Cerradas sus cuatro partes (E0.1 drift, E0.1 A3/257, E0.2 registro de ámbitos,
E0.3 el join en cuatro pasadas). Bitácoras: `e01_drift_catalogo_2026-08-11`,
`e01e_a3_2026-08-11`, `e03join_recon_2026-08-11`, `e03join_cierre_34`.
**Desbloquea E1, E5 y E6.** Tocó producción.

### E1 · Andamio de medición — **CERRADA**
`jurisdicciones_decreto` queda declarada como andamio. 64 filas, 64 ids, 10
geometrías nulas. **Deuda escrita:** el andamio conserva el borde viejo, y
`fase3ter` reintroduce el defecto si alguien lo regenera.

### E2 · Diseño y medición del cambio de unidad — **CERRADA**
**El número es +11, con piso +7.** El volumen de restricciones **sube** al pasar
a Capitanía. Sin este número no se podían tomar D4 ni D5.

### E3 · Ámbito lacustre — **CERRADA**, seis pasos, 2026-08-13
**Qué era:** los lagos eran invisibles; una restricción real de «puerto cerrado»
no le llegaba al patrón. Ahora llega. Bitácoras `e3_paso5` y `e3_paso6`.
**Dejó cinco cosas abiertas en su propia fila, no mandadas a otro lado:**
(a) cuatro cuerpos sin geometría —río Bueno, Toltén, Fuy, San Pedro—;
(b) la bahía 257 sin dato real, que depende de DIRECTEMAR y no de nosotros;
(c) el contacto lacustre, que **subió la urgencia de §7.1 con medición**;
(d) **la bahía 160: tiene dos jurisdicciones y se muestra una — PENDIENTE DE
DECISIÓN DEL OWNER desde el paso 5, y decide qué ve el patrón**;
(e) lo declarado no medido: la PWA nunca se miró en pantalla para esta etapa.

### E4 · Ámbito marítimo, cerrar C3 — **EN CURSO**
**Qué es:** seis pares de Capitanías marítimas se pisan entre sí y el control C3
no las deja publicar.
**Estado escrito:** «P2 autorizado, sin aplicar». El límite Norte de `arica`
quedó **declarado y no construido** (D16). El frente del alcance costa-afuera va
por el Tramo 1 de dos, con `LIMITE_ZEE_M` ya como dato declarado y el tercer
estado en el vocabulario **sin nadie promovido**. `main` de ese frente en
`e9f48ed`.
**Qué la bloquea:** las tres preguntas de D16 que §9 declara **sin contestar**.
**Qué desbloquea:** E5, E6 y E7 — es la etapa central que falta.
**Toca producción:** sí. Medición: mucha hecha, decisiones pendientes.

### E5 · Prueba de realidad, las 163 bahías — **NO INICIADA**
**Qué es:** comprobar contra las 163 bahías reales que el cambio no rompe nada.
**Qué la bloquea:** E4. El sondeo del 2026-08-12 ya adelantó parte de la
evidencia. **Toca producción:** no directamente; es verificación.

### E6 · Cambio de unidad en el motor — **NO INICIADA**
**Qué es:** que el motor deje de razonar por bahía y razone por Capitanía. Es el
cambio del que E2 midió el tamaño (+11).
**Qué la bloquea:** E4 y E5. **Toca producción: sí, y es el de más peso.**
**Nota:** E3 ya se llevó un pedazo de E6, acotado al ámbito publicado y
declarado como tal.

### E7 · R1 sobre la capa nueva — **PIEZA 1 CERRADA, PIEZA 2 EN OBSERVACIÓN**
Incompleta en el documento: no dice qué observa la pieza 2 ni qué la cerraría.

### E8 · Deudas declaradas — **ABIERTA**
Bolsa de deudas de las etapas anteriores. Sin desglose de cierre.

---

## QUÉ BLOQUEA A QUÉ, DENTRO DEL PLAN

```
E0 ── cerrada ──> E1, E5, E6
E1 ── cerrada
E2 ── cerrada ──> D4 y D5 (decisiones, tomables desde que E2 dio +11)
E3 ── cerrada (se llevó un pedazo de E6, declarado)

E4 ── EN CURSO ──> E5 ──> E6 ──> E7
  bloqueada por: las tres preguntas de D16, que §9 declara SIN CONTESTAR
```

**La cadena que falta es una sola y es lineal: E4 → E5 → E6 → E7.** No hay dos
frentes paralelos esperando. Todo lo que queda del plan cuelga de E4.

**Y una advertencia que el documento da y conviene no perder:** E4 no puede
cerrarse hasta que se conteste si el hueco de `arica` entre 24 y 200 millas es
causa (a) o (b) de INV-3.6 — y esa es una **pregunta normativa**, de leer el
decreto, no de correr un instrumento.

---

## §7.1 — LOS FRENTES LATERALES

El documento tiene **un solo frente lateral anotado**, y sí, es el de contacto.

### El frente de CONTACTO — ABIERTO, «no cabe en E0–E6»
**Qué es:** a quién y con qué teléfono se le dice al patrón que llame.
**Por qué está afuera:** el propio §7.1 dice que no es una etapa y que no debería
fingir serlo.
**Qué tiene medido, y es bastante:** una tabla de **diez incumplimientos con
ubicación exacta** —`zonas_aviso.json` transcribiendo la v1.7, el guard de
`zonas-aviso.js:163-165` que **hoy impide cumplir**, la tarjeta de tránsito, el
bloque de arribada forzosa, `WeatherBlock`, tres enlaces `tel:` hardcodeados en
`DeportiveAlerts`—, más que **ninguno de los 7 puntos de render con `tel:`
comprueba que el número sea atómico**, y dos escalones de INV-10.1 sin dato:
el escalón 1 entero, y el escalón 2 para `rada_covadonga`.
E3 le **subió la urgencia con medición**: un teléfono sale hoy para tres
Capitanías, y 20 de 21 entradas lacustres discrepan contra el CSV de las 64.
**Toca producción:** sí, backend y PWA. **Medición: hecha. Ejecución: cero.**

**No hay ninguna otra sección del documento en estado «abierto lateral».** §7.1
tiene un solo frente. Los otros tres que la tabla lista —sondeo de catálogo y
contacto, resoluciones locales, fix del BOM— están **cerrados**.

### §7.2 · Control del estado del plan — DECIDIDO, PENDIENTE DE IMPLEMENTAR
**Qué es:** un control que avise cuando el plan y la realidad se separan.
**Estado:** camino A decidido, **nunca implementado**.
**Y acá está el filo:** si §7.2 existiera, habría cazado que el frente del filtro
creció fuera del plan. **La pieza que existía para detectar exactamente este
problema es una de las que no se hicieron.** No toca producción.

---

## PIEZAS DEL DOCUMENTO QUE NINGUNA BITÁCORA RETOMÓ

- **§7.2, el control del estado del plan.** Decidido el camino A y **ninguna
  bitácora lo menciona después**. Es el hueco que esta pieza existía para
  encontrar.
- **E7, pieza 2 «en observación».** No hay bitácora que diga qué se observa ni
  qué la cerraría. Incompleta en el documento mismo.
- **E8, «deudas declaradas», abierta sin desglose.** No hay una bitácora de E8.
- **§1, el inventario de insumos.** Foto del 2026-08-09/10. **Ninguna bitácora
  volvió a comprobar que siga siendo exacta**, y el proyecto lleva diez días de
  cambios desde entonces.
- **§2, la especificación de qué ve el patrón.** Nadie la volvió a leer contra lo
  que la app muestra hoy. El recorrido de navegador de ayer fue el primero en
  mirar la pantalla en semanas, y **no se hizo contra §2**.

---

## LO QUE ESTE DOCUMENTO NO SABE

- No abrí las bitácoras de E4 en detalle: el estado de E4 sale de la tabla de §7
  y de §9, no de sus bitácoras propias.
- No verifiqué que los commits que la tabla cita sigan en `main`.
- El orden es de Nacho. Lo único que este documento afirma es que **lo que queda
  del plan es una cadena lineal que arranca en E4**, y que **el plan ya no
  describe todo el trabajo en curso.**
