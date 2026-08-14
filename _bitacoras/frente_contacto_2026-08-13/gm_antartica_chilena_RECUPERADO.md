# EL CONTACTO DE LA GOBERNACIÓN MARÍTIMA ANTÁRTICA CHILENA — RECUPERADO

**2026-08-13. Solo lectura: nada se cargó a `src/` ni a ninguna fuente viva.**
Este archivo es **evidencia para el día de la promoción**, con el mismo estatuto que
`_bitacoras/sondeo_catalogo_2026-08-12/capitanias_64_final.csv`: el dato está verificado y
**no está aplicado**.

---

## POR QUÉ EXISTE ESTE ARCHIVO

`CONTRATO_MOTOR.md` **INV-10.1** (v1.8, `d9f7f9e`) fija la prelación del contacto, y su
segundo escalón es *"el de su Gobernación, rotulado como Gobernación"*. La política de
producto del owner (`PLAN_JURISDICCION.md` **D15**, punto 4) declara que **Rada Covadonga**
resuelve su contacto por ese escalón, con la **Gobernación Marítima Antártica Chilena**.

**Medido el 2026-08-13: esa Gobernación no existe en ningún archivo vivo del repositorio.**

    ¿está en la tabla hardcodeada de src/utils/capitanias.js? : false  (tiene 14 + Hanga Roa)
    ¿está entre las gobernaciones de bahia-capitania-map.json? : false (tiene 15)
    gobernaciones del mapa: Antofagasta, Arica, Aysén, Caldera, Castro, Coquimbo, Hanga Roa,
      Iquique, Puerto Montt, Puerto Williams, Punta Arenas, San Antonio, Talcahuano,
      Valdivia, Valparaíso

Sin este dato, INV-10.1 cae al tercer escalón —*el campo no se muestra*— para una
jurisdicción que la política dice que **sí** tiene contacto. No es lo que la política manda:
es lo que pasa cuando falta el valor.

---

## EL DATO

| campo | valor |
|---|---|
| entidad | **Gobernación Marítima Antártica Chilena** |
| teléfono | **+56 32 2208557** |
| dirección | **Villa Las Estrellas. Antártica Chilena** |

---

## PROCEDENCIA

- **Archivo de origen:** `_bitacoras/sondeo_catalogo_2026-08-12/gm_region-de-magallanes-y-antartica-chilena.html`
- **URL declarada** (`PROCEDENCIA.txt` del sondeo, tomada del propio archivo):
  `https://www.directemar.cl/directemar/gobernaciones-maritimas/region-de-magallanes-y-antartica-chilena`
- **Fecha de captura:** 2026-08-12, ~16:10
- **Estado en el árbol de trabajo:** BORRADO. El HTML se podó en `297b220`
  (*"docs(sondeo): poda los 18 HTML crudos y deja su PROCEDENCIA.txt"*).
- **De dónde se recuperó:** `git show 297b220^:<ruta>` — o sea el commit `a474ae4`
  (2026-08-12, *"docs(sondeo): cierra el sondeo de catalogo y baja su evidencia a
  _bitacoras/"*), que es el último que lo tuvo versionado.

### Prueba de identidad — no se supone que es el mismo archivo, se comprueba

`PROCEDENCIA.txt` advierte que sus hashes se calcularon **sobre el archivo en disco, en
CRLF**, y que el blob de git está en LF y no los reproduce. Medido sobre el blob recuperado:

    blob tal cual (LF)               : 0fa575a629d9b671bc5362d40e84072ec92c39f258ff5d57a6d592fe37cac61d · 51.055 bytes
    el mismo, reconvertido a CRLF    : ef7a1c430328b6a4ecd1a6b1f4800b052d03d4a5b9ee63c3194f80e8e10ee861 · 52.287 bytes
    PROCEDENCIA declara (sobre disco): ef7a1c430328b6a4ecd1a6b1f4800b052d03d4a5b9ee63c3194f80e8e10ee861 · 52.287 bytes
    ¿reproduce?                      : true

**El archivo recuperado es byte a byte el que se capturó el 2026-08-12.**

### A qué entidad lo atribuye la fuente

Las cinco fichas del HTML, con lo que la fuente le da a cada una:

    [Gobernación Marítima]   Antártica Chilena  tel +56 32 2208557  dir "Villa Las Estrellas. Antártica Chilena"
    [Capitanía de Puerto de] Bahía Paraíso      tel +56 32 2208557  dir "Bahía Paraíso"
    [Capitanía de Puerto de] Bahía Fildes       tel +56 32 2208557  dir "Villa Las Estrellas"
    [Capitanía de Puerto de] Soberanía          tel +56 32 2509291  dir "Base Prat"
    [Alcaldía de Mar de]     Rada Covadonga     tel (no hallado)    dir (no hallada)

El número se atribuye a la **Gobernación Marítima**, que es la entidad que la política
necesita. **Tres de las cuatro fichas comparten ese número**; sólo Soberanía tiene uno
propio.

### Coincide con lo reportado antes

    reportado en la fase anterior : "+56 32 2208557"
    recuperado ahora del blob     : "+56 32 2208557"
    ¿coincide?                    : true

---

## DOS COSAS QUE HAY QUE DECIR, Y NO ACOMODAR

**1. La fuente NO llama Capitanía a Rada Covadonga: la lista como `Alcaldía de Mar`, con la
ficha vacía.** D15 punto 4 la describe como *"Capitanía estacional"*. **No es una
contradicción nueva** —el plan ya lo tenía escrito desde E3 paso 2: *"`rada_covadonga` es la
que DIRECTEMAR lista como alcaldía con ficha vacía"*, corroborado dos veces— pero conviene
que quede al lado del dato, porque **de la etiqueta depende de qué escalón de INV-10.1 sale
su contacto**. Es interpretación de la fuente y **es del owner**; acá sólo se registra.

**2. Con este dato cargado, la cuenta de INV-10.1 cambia de 52/11/1 a 52/12/0.** Medido el
2026-08-13 sobre las 64 jurisdicciones del decreto: hoy `rada_covadonga` es la única que cae
al tercer escalón, y cae **por falta de valor, no por regla**.

**Nota lateral, y la pago yo:** el primer filtro con que conté las filas antárticas del CSV
usaba `/antart/i` y devolvió **3 de 4** — `á` no matchea `a`. Corregido normalizando: son
**4** (290 Bahía Fildes, 291 Rada Covadonga, 292 Soberanía, 293 Bahía Paraíso). Es la trampa
de acentos que este repositorio ya tiene escrita, esta vez dentro de una medición mía.

---

## LO QUE ESTE ARCHIVO NO HACE

- **No carga nada.** El dato no está en `src/`, ni en `data/`, ni en ninguna fuente que el
  motor consulte. `CONTRATO_MOTOR.md` §5 declara el contacto de Gobernación como
  **⚠️ PENDIENTE — POR DEFINIR**, y eso no se toca desde acá.
- **No decide** si Rada Covadonga es Capitanía o Alcaldía, ni de qué escalón sale su
  contacto.
- **No promueve el CSV.** Sigue en `_bitacoras/`, sin aplicar.
