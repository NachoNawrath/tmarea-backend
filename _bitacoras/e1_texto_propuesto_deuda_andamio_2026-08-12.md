# Texto propuesto — bloque `deuda_regenerar_desde_v2` de `capa_consultada.json`

Fecha: 2026-08-12
Estado: **PROPUESTO, NO APLICADO.** Lo revisa el owner.
Medición que lo sostiene: `e1_exposicion_ancud_chonchi_2026-08-12.txt`

---

## Antes del texto: la corrección que el owner pidió no es la que el dato sostiene

El owner pidió corregir el bloque de **11 a 9**, sobre la base de que ancud y
chonchi ya estaban corregidas en v1.

**Medido: siguen siendo 11. Ninguna se resolvió.**

Que el v1 haya cambiado no implica que ahora coincida con el v2. Comparando con
los campos equivalentes —`vertices` (v1) ↔ `contorno` (v2), como conjuntos de
coordenadas, que es como E1 midió las 11—:

```
id            v1  v2  soloV1 soloV2   norte/sur
ancud          3   4       0      1    ok/ok
chonchi        4  11       0      7    ok/ok
SIGUEN difiriendo: 11    YA coinciden: 0
```

Lo que **sí** cambió es más chico y más preciso: a ancud y chonchi les faltaba el
**límite Sur**, la pasada de alineación se lo puso en v1, y ese campo ahora sí
coincide con v2 (`ok/ok`). Lo que sigue difiriendo en las dos es el **contorno**:
chonchi tiene 7 vértices que sólo están en v2.

Así que el número no cambia. Lo que la propuesta corrige es otra cosa: el bloque
**conflaciona dos deudas distintas y sólo declara una**.

## Confirmación operativa: no hay que tocar la base

El campo `comentario_en_la_base` dice *"salio del insumo v1 y hay **11
jurisdicciones que difieren** entre v1 y v2"*. Como la propuesta **mantiene 11**,
ese texto **no cambia**, y por lo tanto:

- **NO hay que editar `comentario_en_la_base`**, y
- **NO hay que correr `scripts/e1_aplicar_andamio.js`.**

Verificado corriendo `verificarComentarioEnLaBase()` contra la base el
2026-08-12: **el guard pasa** — la base dice exactamente lo que declara el
archivo. Aplicar esta propuesta lo deja pasando igual, porque toca campos que el
comentario no reproduce.

Si en el futuro alguien cambia el número o el texto del comentario, ahí sí hay
que correr el aplicador en la misma pasada, o los dos guards divergen.

---

## Texto propuesto

Reemplaza el bloque `deuda_regenerar_desde_v2` dentro de `andamio` en
`data/decreto/capa_consultada.json`:

```json
"deuda_regenerar_desde_v2": {
  "que": "La capa no se regenero desde el insumo v2, y ademas quedo atras respecto del v1 del que SI se construyo. Son dos deudas distintas y conviene no confundirlas. Fuera de E1 por decision del owner (2026-08-11); revisada el 2026-08-12 sin regenerar.",

  "deuda_1_contra_v2": {
    "cuantas": 11,
    "jurisdicciones_que_difieren": [
      "lirquen", "talcahuano", "valdivia", "corral", "ancud", "quemchi",
      "chaiten", "achao", "castro", "chonchi", "quellon"
    ],
    "verificado": "2026-08-12: siguen siendo 11 y ninguna se resolvio. Comparado por campos EQUIVALENTES: v1 `vertices` contra v2 `contorno` como conjuntos de coordenadas, y `limite_norte_dec`/`limite_sur_dec` contra `limite_norte.dec`/`limite_sur.dec`. Compararlos por nombre de campo mide el renombre de esquema y da 64 de 64.",
    "matiz_medido": "A ancud y chonchi la pasada de alineacion les corrigio en v1 el limite Sur que faltaba, y ese campo YA coincide con v2. Lo que sigue difiriendo en las dos es el contorno: ancud tiene 1 vertice solo en v2 y chonchi tiene 7. Siguen contando entre las 11."
  },

  "deuda_2_contra_el_v1_vigente": {
    "que": "El SQL de la capa se genero el 2026-08-10 (commit 98e98dd) desde el v1 de ese momento. Desde entonces el v1 cambio en 6 commits: 653fa1d y los P0/P2/P3/P4/P5 de la pasada de alineacion contra el TM-025 A.",
    "impacto_medido_en_el_insumo": "De las 64, solo 2 cambian campos que afectan la geometria: ancud y chonchi, las dos por la misma causa — recuperaron un limite Sur omitido en la transcripcion (ancud 42 00 00 S, chonchi 42 50 00 S). Otras 13 cambian solo texto o procedencia y 49 no cambian.",
    "ojo": "El generador scripts/fase3ter_construir_capa.py lee el v1, NO el v2. Regenerar tal como esta hoy salda la deuda 2 y NO la deuda 1: traeria las 2 correcciones de limite Sur y ninguna de las 11 diferencias de contorno. Saldar la deuda 1 exige que el generador lea v2, que es cambio de codigo, no una re-corrida."
  },

  "exposicion_medida_2026-08-12": {
    "km": "95,87 de los 2.076,06 km de las 8 rutas pasan por ancud o chonchi en la capa vigente: 4,6 %. ancud 60,17 km, chonchi 35,70 km, en 3 de las 8 rutas (Anahuac->Quellon, Ancud->Castro, Chonchi->Chaiten). Las otras cinco no las tocan.",
    "restricciones": "1 de las 26 que se muestran hoy: bahia 155 QUEILEN, cuya Capitania es chonchi.",
    "por_que_importa_esa_una": "155 Queilen es una de las CUATRO apariciones que E2 clasifico como apoyadas en traslape, y es la mas extrema: ruta∩J 9,91 km, en traslape 9,91 km, EXCLUSIVO 0,00 km. Se apoya enteramente, no parcialmente. Esas cuatro son las que separan el +11 de su piso +7, asi que la figura de chonchi toca la parte mas fragil del numero.",
    "que_NO_dice": "No predice cuanto se moverian los porcentajes ni el +11. Eso exige regenerar y volver a medir. Esta medicion se hizo sobre la capa vigente, sin regenerar.",
    "evidencia": "_bitacoras/e1_exposicion_ancud_chonchi_2026-08-12.txt"
  },

  "orden_si_alguna_vez_se_regenera": "DESPUES de regenerar cotejo_lacustre_adjudicado.json, nunca antes. Ese archivo es el otro insumo del generador y E3 lo va a regenerar como precondicion suya. Regenerar el andamio antes es trabajo tirado.",

  "por_que_importa": "Las once son del corredor de Chiloe y el sur de Valdivia, que es donde corren las rutas reales del motor. Lo que E2 mida sobre este andamio hay que leerlo sabiendo esto.",
  "evidencia": "_bitacoras/e1_propuesta_2026-08-11/01_medicion.txt seccion B (las 11) · _bitacoras/e1_exposicion_ancud_chonchi_2026-08-12.txt (la exposicion y la reverificacion de 2026-08-12)"
}
```

---

## Qué cambia respecto del bloque actual

| | antes | propuesto |
|---|---|---|
| número de jurisdicciones | 11 | **11** (sin cambio, verificado) |
| deudas declaradas | 1 (contra v2) | **2** (contra v2 y contra el v1 vigente) |
| qué trae regenerar hoy | no dice | dice: 2 de las 11, porque el generador lee v1 |
| exposición medida | no hay | 4,6 % de km, 1 de 26 restricciones, con su fragilidad |
| orden respecto de E3 | no dice | después del cotejo lacustre |

Nada de esto obliga a tocar la base ni a correr el aplicador.
