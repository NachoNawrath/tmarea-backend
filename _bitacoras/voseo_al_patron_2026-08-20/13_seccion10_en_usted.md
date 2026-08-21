# §10 EN USTED — REDACTADO PARA PEGAR

Sesión `voseo_al_patron_2026-08-20`, PARADA 2. **Nada de esto se aplicó.**
`CONTRATO_MOTOR.md` no se tocó: está fuera de alcance y lo pega el owner.

---

## ⚠ LO PRIMERO: ESTO SON DOS PEGADOS, NO UNO

El §10 tiene un **espejo en el dato**. `data/decreto/zonas_aviso.json` declara en
su propia `procedencia` que su texto está *transcrito* del §10, y
`src/services/cotejo-contrato.js` existe para vigilar que no diverjan — nació
porque el 2026-08-13 el catálogo cambió y el dato se quedó atrás sin que nadie
lo notara.

**Si pegás el §10 y el dato se queda atrás, rompés el control que existe justo
para eso.** Por eso el bloque 2 va acá abajo, en el mismo documento.

Y hay algo peor que conviene saber antes: **de las cuatro cadenas del dato, el
cotejo sólo mira dos.** Las otras dos no las vigila nadie y se quedarían en
tuteo en silencio. Están marcadas abajo.

---

## BLOQUE 1 — LA TABLA DEL §10

Reemplaza la tabla completa de `## 10. CATÁLOGO DE MENSAJES NORMATIVOS`.
Lo único que cambia es el trato. Ni una cita, ni un artículo, ni un canal, ni
una bandera se movieron.

| Situación | Capa 1 (estado) | Capa 2 (vía normativa + cita) |
|---|---|---|
| **Zarpe cerrado** | 🔴 U+V "Puerto de zarpe cerrado. Navegación no recomendada." | "Según D.S. 364 (RRDN) Art. 36, en caso de mal tiempo con puerto cerrado la Autoridad Marítima puede autorizar el zarpe a la gira hacia un puerto próximo del litoral, si usted asegura que la nave está en condiciones y se responsabiliza. Coordine con la Capitanía [nombre]." |
| **Recalada cerrada (en puerto)** | 🟡 U "Puerto de recalada cerrado." | "Según D.S. 364 Art. 16, si debe cambiar el puerto de recalada, solicite permiso a la Autoridad Marítima con anticipación. Podría exigirse declarar puerto alternativo." |
| **Recalada cierra en tránsito** | 🟡 U + flag arribadaForzosa | "Según D.L. 2222 Art. 27 y D.S. 364 Art. 17, puede efectuar arribada forzosa a puerto/lugar distinto del prefijado. Avise de inmediato a la Autoridad Marítima por VHF Canal 16. Prima la salvaguarda de la vida humana en el mar." |
| **Zona intermedia cerrada** | 🔴 U+V "Su embarcación NO puede transitar por [zona]." | "Según D.L. 2222 Art. 32, la Autoridad Marítima puede prohibir el tránsito por aguas jurisdiccionales. No ingrese a la zona. Contacte por VHF Canal 16, coordine fondeo de seguridad o recale en puerto alternativo." |
| **Aviso de arribada** | ℹ️ recordatorio | "Según D.S. 364 Art. 13, avise su arribada a la Autoridad Marítima con mínimo 24 horas de anticipación." |
| **Zarpe sin despacho (comercial)** | ℹ️ recordatorio | "Según D.L. 2222 Art. 23, zarpar sin despacho se sanciona hasta con la cancelación del título. Gestione su despacho antes de navegar." |
| **Deportivo — sin zarpe** | ℹ️ informativo | "Según RGDN (TM-002) Art. 34, su navegación deportiva nacional no requiere autorización de zarpe. Comunique su intención de movimiento al club náutico o, en su defecto, a la Autoridad Marítima local." |
| **Moto de agua nocturna** | 🟡 U | "Según RGDN Art. 26, las motos de agua solo pueden navegar entre el orto y el ocaso de sol. Su horario estimado excede la luz diurna." |
| **Jurisdicción sin límite cargado** | 🟡 U "No tenemos cargado el límite de esta jurisdicción." | "Confirme con la Capitanía [nombre] antes de zarpar. **Sin cita: esta situación no la produce una norma sino la ausencia de un dato nuestro** (INV-3.6). No implica que exista una restricción, ni que no exista: implica que el motor no puede responder por esa zona." |

**La Regla de uso que va debajo de la tabla no cambia**: no tiene trato. Se
transcribe igual, sin tocar.

---

## DOS AMBIGÜEDADES QUE APARECIERON AL PASAR A USTED — RESUELTAS POR EL OWNER

Se levantaron como pregunta y el owner las resolvió el 2026-08-20. **Las dos
resoluciones ya están aplicadas en la tabla de arriba.** Quedan escritas porque el
intento descartado es parte del registro: sin esto, la tabla parece redactada de
una sola pasada y nadie sabría que hubo dos lecturas posibles.

**(1) La forma que se discutió: «…si asegura que la nave está en condiciones y
se responsabiliza».**
En tuteo (*«si aseguras… y te responsabilizas»*) el sujeto era inequívoco: el
patrón. En usted, `asegura` y `se responsabiliza` **se leen también como tercera
persona**, y en esa misma frase hay otro sujeto posible a mano — la Autoridad
Marítima, que aparece dos cláusulas antes. Un patrón apurado puede entender que
es la Autoridad la que asegura y se responsabiliza, que es exactamente lo
contrario de lo que la norma dice.
**RESUELTO — va con «usted» explícito:** «…si **usted** asegura que la nave está
en condiciones y se responsabiliza». Fundamento del owner: *la Autoridad Marítima
está dos cláusulas antes y no puede quedar espacio para leerlo como ella.*

**(2) La forma que se discutió: «Informe su intención de movimiento al club
náutico».**
`Informe` encabeza la frase, así que gramaticalmente se lee como imperativo.
Pero en esta app **«informe» es además un objeto real**: el informe operacional
de viaje, que el patrón descarga al cerrar la navegación en P4. Es la única
palabra del catálogo que colisiona con un sustantivo del producto.
**RESUELTO — va «Comunique»:** «**Comunique** su intención de movimiento al club
náutico». Fundamento del owner: *«informe» es un objeto real de esta app y el
patrón lo descarga en P4.*

---

## BLOQUE 2 — EL ESPEJO EN `data/decreto/zonas_aviso.json`

Va **en el mismo acto** que el bloque 1. Cuatro cadenas, y no todas están
vigiladas.

### 2.1 — `mensaje.capa_2_con_capitania`  · **el cotejo SÍ la mira**

De:

    Confirma con la Capitanía {nombre} antes de zarpar. Sin cita: esta situación
    no la produce una norma sino la ausencia de un dato nuestro (INV-3.6). No
    implica que exista una restricción, ni que no exista: implica que el motor no
    puede responder por esa zona.

A: lo mismo con **`Confirme`** en vez de `Confirma`. Nada más.

### 2.2 — `mensaje.capa_1`  · **el cotejo SÍ la mira**

`No tenemos cargado el límite de esta jurisdicción.` — **no cambia**: no tiene
trato. Va acá para que quede dicho que se miró y no para que se toque.

### 2.3 — `mensaje.capa_2_sin_capitania`  · ⚠ **NADIE LA MIRA**

De: `Coordina con la Autoridad Marítima por VHF Canal 16 antes de zarpar. …`
A:  `Coordine con la Autoridad Marítima por VHF Canal 16 antes de zarpar. …`

El resto de la cadena no cambia.

### 2.4 — `contacto_generico.texto`  · ⚠ **NADIE LA MIRA**

De: `Coordina con la Autoridad Maritima por VHF Canal 16 antes de zarpar.`
A:  `Coordine con la Autoridad Maritima por VHF Canal 16 antes de zarpar.`

*(sin tilde en «Maritima», como está hoy en el fichero — eso es otro asunto y no
se toca acá)*

### Por qué 2.3 y 2.4 no las mira nadie, dicho con la palabra del propio dato

`zonas_aviso.json` lo declara él mismo, en
`cotejo_con_el_contrato.lo_que_NO_cubre`:

> **NO cubre `capa_2_sin_capitania` ni `contacto_generico`: no son transcripciones
> de una fila del §10.**

Es correcto y está bien declarado — nacieron de la misma fila con la derivación
cambiada, no de una fila propia. Pero la consecuencia práctica es que **el
control te va a decir que todo está bien con dos de las cuatro cadenas en tuteo**.
Por eso van en este documento y no en una nota al pie.

---

## CÓMO SABER QUE QUEDÓ BIEN

Después de pegar los dos bloques, el cotejo tiene que volver a verde:

```
cd C:\Users\katia\tmarea-backend
npm test
```

`src/services/__tests__/cotejo-contrato.test.js` es el que mira esto. Antes de
pegar el bloque 2 va a dar **divergencia** — y eso no es un fallo, es el control
haciendo su trabajo.

Y para las dos que el cotejo no mira, el control es de esta bitácora:

```
node _bitacoras\voseo_al_patron_2026-08-20\11_inventario.js
```

Hoy cuenta **3 cadenas de `zonas_aviso.json` en el veredicto TUTEO**. Cuando los
dos bloques estén pegados tienen que ser **0**. Si baja a 1, quedó una de las
dos sin vigilancia atrás.

---

## LA FILA DEL REGISTRO

Para anotar donde corresponda, con estas palabras:

> **El registro del texto al patrón es USTED.** Decidido por el owner el
> 2026-08-20. El voseo se corrigió en la pieza `voseo_al_patron_2026-08-20`: eran
> 4 cadenas en 2 ficheros de la PWA, y hoy son 0. El tuteo quedó **medido y sin
> tocar**: 99 apariciones sobre 85 cadenas distintas en 20 ficheros, inventario en
> `_bitacoras/voseo_al_patron_2026-08-20/11_inventario.txt`, con su vocabulario
> cerrado y con las resoluciones como dato.
>
> **La fila no cierra por declaración: cierra cuando el cotejo de
> `cotejo-contrato.js` vuelva a verde con el §10 en usted y el dato movido en el
> mismo acto.** Hasta entonces el registro está decidido y no aplicado.
>
> Fuera de la fila por decisión del owner del 2026-08-20: el lema
> **«NAVEGA CON CERTEZA»** (7 sitios, incluido el PDF del informe operacional).
> Es marca, no mensaje al patrón.
