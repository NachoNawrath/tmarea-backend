# TEXTO PROPUESTO PARA CONTRATO_MOTOR.md — dos adiciones

Fecha: 2026-08-10. **NO aplicado.** El contrato lo actualiza el dueño del producto.
Las dos son ADITIVAS: ninguna cambia una regla existente. INV-1.1 no se toca.

---

## ADICIÓN 1 — dos viñetas nuevas en INV-3.6

Van dentro de `### INV-3.6 — Una jurisdicción sin geometría se declara, nunca se
resuelve en silencio`, **después de la viñeta "Regla dura"** y antes de
"Coherencia". La viñeta "Verificación" existente se reemplaza por la versión
ampliada del final.

```markdown
- **Bandera:** una jurisdicción sin geometría cargada que la ruta cruza escala el veredicto
  a **U**, y NUNCA a **U+V**. La ausencia de dato no es una prohibición: llevarla a U+V sería
  fabricar una restricción que no existe, y dejarla en Q sería afirmar una condición que el
  motor no puede respaldar. U dice lo que efectivamente pasa — falta información, hay que
  consultar —, que es el mismo criterio que ya rige para una restricción sin umbral. El aviso
  es una **fuente más** del máximo de INV-1.1, no una restricción: su aporte al máximo está
  topado en U por construcción, y no se renderiza entre las restricciones de INV-1.2, porque
  mezclar un "no sabemos" con las restricciones reales de la ruta le daría una autoridad que
  no tiene. Decisión del dueño del producto, 2026-08-10.

- **Dos causas, un mensaje, dos registros:** un punto de la ruta que no resuelve jurisdicción
  puede venir de (a) una jurisdicción declarada sin geometría — la carencia que este
  invariante describe — o de (b) un **hueco de la propia capa**, una zona que ninguna
  jurisdicción reclama. Al patrón se le dice **lo mismo** en los dos casos, porque para él la
  consecuencia es idéntica: no sabemos, consulte. Internamente NO son lo mismo: (a) es el
  estado del mundo y (b) es un defecto de construcción nuestro, y debe quedar registrado como
  defecto además de mostrarse. Sin esa separación, los huecos de la capa se esconden detrás de
  un mensaje que parece explicarlos.

- **Verificación:** contar geometrías nulas, vacías y de área cero por ámbito después de cada
  reconstrucción de la capa. Toda jurisdicción con área cero que no esté declarada como sin
  georreferenciar es un fallo, no un resultado. Además: ninguna zona de la ruta que no
  resuelva jurisdicción puede quedar sin clasificar en (a) o (b), y ninguna pantalla puede
  mostrar Q mientras exista, en esa misma pantalla, un aviso de límite no cargado.
```

---

## ADICIÓN 2 — una fila en el catálogo del §10, y una línea en su preámbulo

### 2.a — el preámbulo

Reemplazar el párrafo introductorio de `## 10. CATÁLOGO DE MENSAJES NORMATIVOS`:

```markdown
Fuente única de mensajes que Claude Code debe usar. Cada uno: Capa 1 (estado) + Capa 2
(vía normativa con cita). NO inventar citas fuera de este catálogo.

**Excepción declarada:** la última fila es la única del catálogo que **no nace de un
reglamento sino de una carencia nuestra**, y por eso es la única que no lleva cita. No hay
artículo que citar porque no hay norma en juego: hay un dato que nos falta. Que no haya cita
es, precisamente, lo que esa fila comunica.
```

### 2.b — la fila nueva, al final de la tabla

```markdown
| **Jurisdicción sin límite cargado** | 🟡 U "No tenemos cargado el límite de esta jurisdicción." | "Verifica con la Capitanía [nombre]: [tel] antes de zarpar. **Sin cita: esta situación no la produce una norma sino la ausencia de un dato nuestro** (INV-3.6). No implica que exista una restricción, ni que no exista: implica que el motor no puede responder por esa zona." |
```

---

## POR QUÉ NO SE TOCA INV-1.1

Queda dicho aquí para que no se vuelva a plantear. INV-1.1 dice hoy:

> El veredicto final es el MÁXIMO de severidad de **todas las fuentes** (`Q < U < U+V`).

"Todas las fuentes", no "las dos fuentes". `banderaFinal = max(restricción, deportivo)` es
la implementación actual, que tiene dos; agregar cobertura como tercera es exactamente lo que
INV-1.1 ya describe. El invariante se cumple sin cambiarle una palabra.

---

## QUÉ QUEDA HABILITADO AL ESCRIBIRSE ESTO

La pieza (c) de R1 — la composición del veredicto — que es la que hace la diferencia entre
un aviso honesto y una tarjeta que nadie mira. Las piezas (a) backend y (b) frontend no
dependen del texto del contrato, solo de la decisión, que ya está tomada.
