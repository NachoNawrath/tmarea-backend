# TEXTO PROPUESTO PARA CONTRATO_MOTOR.md — tercera adición a INV-3.6

Fecha: 2026-08-10. **NO aplicado.** El contrato lo actualiza el dueño del producto.
Aditiva, como las dos anteriores: no cambia ninguna regla existente. INV-1.1 no se toca.
Habilita el camino C decidido el 2026-08-10.

---

## ADICIÓN 3 — una viñeta nueva en INV-3.6, y una línea en su Verificación

La viñeta va **después** de "Dos causas, un mensaje, dos registros" y **antes** de
"Coherencia". La viñeta "Verificación" se reemplaza por la versión ampliada del final.

```markdown
- **Un hueco atribuible al recorte de la propia capa se registra, no se muestra.** La causa
  (b) tiene una subclase que no produce ceguera y por lo tanto no produce aviso: el tramo de
  ruta que cae **entero** dentro de la capa de tierra con que se recortó la capa de
  jurisdicciones, y que además está **pegado a una jurisdicción que la ruta sí resolvió**. Ahí
  no falta jurisdicción: hay dos líneas de costa que no coinciden — la del recorte y la que usa
  el ruteo —, y la jurisdicción que opera esas aguas ya está en la lista de la ruta con sus
  restricciones a la vista. No hay restricción real que el patrón deje de ver, que es lo único
  que este invariante persigue. Se registra como defecto de construcción, con su tramo y su
  largo, y no se muestra. **Las dos condiciones son necesarias:** un tramo que no está pegado a
  jurisdicción resuelta sí produce ceguera aunque caiga dentro del recorte, y por eso sí avisa.
  La capa de recorte no se nombra en el código: es una propiedad declarada de la capa que el
  motor consulta, y cambia con ella. Decisión del dueño del producto, 2026-08-10, tomada sobre
  la medición de `_bitacoras/fase5V_r1_2026-08-10.txt`: sin esta distinción el aviso se
  disparaba en 8 de 8 rutas reales y en el 24% del kilometraje, y en el corredor de día 0 no
  había ni un metro cuya causa fuera una jurisdicción sin geometría.

- **Verificación:** contar geometrías nulas, vacías y de área cero por ámbito después de cada
  reconstrucción de la capa. Toda jurisdicción con área cero que no esté declarada como sin
  georreferenciar es un fallo, no un resultado. Además: ninguna zona de la ruta que no
  resuelva jurisdicción puede quedar sin clasificar en (a), (b) o (b atribuible al recorte);
  todo tramo silenciado por atribución al recorte queda registrado con su largo y sus extremos,
  de modo que silenciarlo nunca sea lo mismo que perderlo; y ninguna pantalla puede mostrar Q
  mientras exista, en esa misma pantalla, un aviso de límite no cargado.
```

---

## POR QUÉ ESTO NO ES UNA EXCEPCIÓN DE CONVENIENCIA

Queda escrito acá para que no haya que reconstruir el razonamiento.

INV-3.6 no persigue el hueco geométrico: persigue el **falso negativo silencioso**, y lo dice
con todas las letras — "existe una restricción real, la ruta la cruza, y el patrón nunca la
ve". Las dos condiciones de la viñeta son la prueba de que ese modo de falla no está presente:

1. **Entero dentro del recorte** ⇒ la causa del hueco es un desacuerdo entre dos líneas de
   costa, no una jurisdicción que falte.
2. **Pegado a jurisdicción resuelta** ⇒ la jurisdicción que opera esas aguas ya está matcheada
   por la ruta y sus restricciones ya se muestran (INV-1.2).

Con las dos, no hay restricción que el patrón deje de ver. Sin cualquiera de las dos, sí puede
haberla, y entonces avisa. La regla es más estrecha que "cualquier hueco se calla": es
exactamente el conjunto de casos donde el peligro que el invariante nombra no existe.

Y el silencio no es olvido: el tramo queda registrado como defecto de construcción con su largo
y sus coordenadas. Es la misma disciplina que la adición 2 ya fijó para la causa (b) — se
muestra y se registra —, aplicada al caso en que no corresponde mostrar.

---

## LO QUE NO CAMBIA

- El aviso sigue sin poder pasar por restricción: campo propio en el backend, bloque propio en
  la pantalla, fuente aparte en el veredicto (INV-1.2).
- El aviso sigue topado en **U** por construcción, nunca U+V (adición 1).
- La causa (a) —jurisdicción declarada sin geometría— **no se silencia nunca**, caiga donde
  caiga. Esta viñeta solo alcanza a una subclase de la causa (b).
- INV-1.1 sigue sin tocarse.

---

## QUÉ QUEDA HABILITADO AL ESCRIBIRSE ESTO

Nada nuevo: la pieza 2 ya está construida y medida bajo este criterio, y el criterio ya está
implementado como propiedad declarada del dato. Escribir esta viñeta hace que el contrato diga
lo que el motor hace. Mientras no esté escrita, hay una diferencia entre los dos, y esa
diferencia es la que este documento pide cerrar.

---

# INVALIDADO — 2026-08-10, en la misma sesión

**No usar este texto.** La auditoría de `fase5Y_auditoria_del_fundamento_2026-08-10.txt`
midió el caso que este texto da por imposible y lo encontró: 2 de 34 tramos silenciados
tienen aguas cuyo dueño la ruta **no** había matcheado, y por lo tanto sus restricciones no
se listarían. La viñeta dice "no hay restricción real que el patrón deje de ver" como si
estuviera probado, y lo que estaba probado era la identidad de jurisdicción, no que la
restricción llegue.

Además, este texto presenta la regla con el tono de las otras dos adiciones, que sí se
apoyan en el decreto. Contrastado con la norma: ni el D.S. 991 ni las circulares dicen nada
sobre huecos de capa o recorte de costa. La regla es **de producto** y su texto tiene que
declararlo.

Se reescribe cuando el dueño del producto elija camino entre las opciones de fase5Y.
