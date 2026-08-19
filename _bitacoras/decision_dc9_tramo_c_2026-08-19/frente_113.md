- **Las 113 `sin_bahia_en_catalogo` · SIN FRENTE ASIGNADO, y es el bloque más grande.**
  Anotado el **2026-08-19** al fijarse el alcance del Tramo C. De las tres clases del silencio,
  las otras dos ya tienen dueño —las 74 son `F3`, las 12 son `(a1)`—; **estas 113 no tienen
  ninguno**, y son **16,4 % de los 688**, más que las otras dos juntas (86). Con el Tramo C
  decidido dejan de ser una clase del join y pasan a ser **el techo de un frente de producto**:
  un puerto sin bahía no puede tener estado, y sin estado nunca hay `'rojo'`, así que **el
  bloqueo de zarpe no se dispara ahí por construcción** — falso negativo silencioso. Ver «EL
  TECHO DEL TRAMO C» más abajo.
  **Qué exige para medirse, y por qué hoy no se mide:** saber si esas 113 están fuera de toda
  bahía de SITPORT o si el radio del join se queda corto es **una medición de cobertura del
  teselado contra la base**, o sea `psql`. **Medido el 2026-08-19 en esta máquina, y el
  obstáculo NO es la credencial**: el motor conecta —`dotenv` levanta `DB_PASSWORD` de `.env` y
  un `select 1` por el pool de `pg` devuelve bien—; lo que falta es la herramienta,
  **`psql` no está en el `PATH`**, y `PGPASSWORD` no está en el entorno, que es la vía por la
  que `psql` fallaría con `fe_sendauth: no password supplied` si estuviera instalado. Lo que
  bloquea la medición es **el cliente de línea de comandos, no el acceso**.
