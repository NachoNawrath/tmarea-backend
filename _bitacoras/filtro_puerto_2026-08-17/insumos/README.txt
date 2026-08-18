================================================================================
INSUMOS DE F1 — EVIDENCIA VERSIONADA, NO CÓDIGO Y NO PROMESA DE RE-CORRIDA
Frente del filtro · sesión F2 · 2026-08-17
================================================================================

Estos OCHO ficheros —más este README, que es el noveno— vivían en un scratchpad
temporal. Se versionan porque sin ellos ninguna medición de F2 es comparable con
las de F1, y porque el join de 688 filas no se puede volver a derivar con los
mismos parámetros — sólo quedaba el JSON commiteado.

NO SON CÓDIGO DE PRODUCCIÓN. No los consume nadie, no los importa nadie, y
`src/` no los conoce.

Entraron en DOS commits: los siete primeros y este README, y después
`nodos.json` con esta enmienda. La carpeta se lee entera o no se lee.

--------------------------------------------------------------------------------
ANTES QUE NADA — DOS DE LOS CUATRO INSTRUMENTOS ESCRIBEN SOBRE FICHEROS
VERSIONADOS. NO SE CORREN SIN LEER ESTO.
--------------------------------------------------------------------------------
Con `nodos.json` ya en esta carpeta, los instrumentos dejaron de ser inertes: sus
insumos resuelven contra `AQUI = __dirname`, que ahora ES esta carpeta. Correr
uno «para ver qué pasa» PISA ENTREGABLES:

  ~~f1_generar.js:189~~ :200  escribe  data/catalogo/join_puerto_bahia.json
                              (el artefacto vivo, ~~sha256 dfd07236…~~ sha256
                               4f9fbdc3… desde (b1-a))
  ~~f1_generar.js:202~~ :213  escribe  ../F1_adjudicacion.tsv
                              (la hoja commiteada, sha256 0ca33c18… — NO cambió)
  g7_desempate.js:170 escribe LOS_QUE_CALLAN.tsv EN ESTA MISMA CARPETA
                              (el fichero versionado dos líneas más abajo)

  f1_controles.js y g5_universo.js SÓLO LEEN.

Quien los corra: salida a otra ruta, o copia fuera del repo, y sha256 comprobado
antes y después. Es la regla de la casa —si tocás un insumo, restauralo y
comprobá el sha256— y acá está la lista de qué se toca.

--------------------------------------------------------------------------------
CUATRO INSTRUMENTOS QUEDAN EN ROJO DESDE (b1-a), Y SE DEJAN ASÍ A PROPÓSITO
2026-08-18
--------------------------------------------------------------------------------
Estos cuatro comprueban el sha256 del artefacto al abrir y ABORTAN si no coincide.
Desde (b1-a) el artefacto es 4f9fbdc3… y los cuatro abortan:

  ../07_medir_verde_falso.js:33-34        atado a dfd07236… y 0ca33c18…
  ../08_medir_anclas_desplazadas.js:22-23 atado a dfd07236… y 0ca33c18…
  ../09_medir_c3_desempates.js:47-48      atado a dfd07236… y 0ca33c18…
  ../10_diagnosticar_cascada_c2.js:30-31  atado a dfd07236… y 0ca33c18…

NO SE ACTUALIZAN, y el motivo es de evidencia y no de comodidad: sus cifras
publicadas se midieron CONTRA dfd07236…. Re-apuntarlos al sha nuevo re-etiqueta
evidencia vieja como si fuera del artefacto nuevo, en silencio y sin que ningún
control chiste. Un guard que se afloja para que pase deja de ser un guard.
SON CUATRO, NO TRES: 07_ lleva los mismos dos sha que los otros y se contaba mal.

EL COSTO, ESCRITO PARA QUE NO SE DESCUBRA DESPUÉS: con los cuatro congelados no
hay forma de re-medir sobre el artefacto nuevo, y quedan dos cifras pendientes —
las «5 restricciones distintas» de los 9 que se apagan (f2 §1) y el «22 de 55
eligen más lejos» de M4 (f2 §7.2 A).

EL INSTRUMENTO SUCESOR ES REQUISITO DEL TRAMO C, NO «PIEZA PROPIA» A SECAS.
El 22/55 de M4 —cuántos desempates de C3 eligieron una bahía más lejana que otra
candidata del mismo empate— es el número que el Tramo C tiene que mirar ANTES de
encenderse: si la cascada está mal ordenada, las 109 `desempatado` dejan de ser
atribución confiable y el denominador del Tramo C se mueve. Mientras ese sucesor
no exista, el Tramo C no tiene ese número contra el artefacto vigente.

--------------------------------------------------------------------------------
LOS DOS LÍMITES — se declaran acá para que nadie los descubra después
--------------------------------------------------------------------------------
(1) FUERON ESCRITOS CONTRA RUTAS DE SCRATCHPAD Y LEEN psql Y :3000 EN VIVO.
    Los cuatro resuelven sus insumos con `AQUI = __dirname` y con la ruta
    ABSOLUTA `C:/Users/katia/tmarea-backend` escrita a mano. En otra máquina, o
    con el repo en otro sitio, no arrancan. En ÉSTA, y con `nodos.json` ya
    versionado, sus insumos resuelven — que es justo por lo que hay que leer el
    aviso de arriba antes de correr ninguno.
    Se versiona LA EVIDENCIA DE CÓMO SE MIDIÓ, no una promesa de que re-corren
    igual.

(2) NO ESTÁN RE-CORRIDOS EN F2, Y NO SE AFIRMA QUE CORRAN. Ninguna cifra de este
    documento se re-derivó: se transcriben de la corrida de F1 y se citan con el
    instrumento que las produjo. La opción de re-correr `f1_generar.js` y cotejar
    el sha256 del artefacto (A2+) fue ofrecida y queda EXPLÍCITAMENTE AFUERA por
    decisión del owner. Un instrumento no se da por bueno porque esté versionado,
    igual que no se da por bueno porque compile.

--------------------------------------------------------------------------------
LAS DOS CAPTURAS CONGELADAS — son el ancla de comparabilidad con F1
--------------------------------------------------------------------------------
Las dos se tomaron en el MISMO INSTANTE, declarado dentro del propio fichero en
el campo `congelado_en`:

    2026-08-17T23:02:53.110Z   (23:02Z)

  CONGELADO_vivo.json
    sha256 296472bbb27e7e309461f82c148ab3dbf7656ea71cb68b3eeae29ffbdcc3dda8
    Respuesta cruda de /api/sitport/restricciones.
    26 filas · 26 restricciones distintas (IDRestriccion) · 15 bahías.
    ES LA FOTO COMPARABLE CON F1. Toda cifra viva de F2 que quiera compararse
    con una de F1 se mide contra ésta y no contra el feed del momento.

  CONGELADO_puertos.json
    sha256 1593941c953464f98e1be0e8b5079d532770a2a4c23bd3d7370e181950b76750
    Respuesta cruda de /api/puertos (nodos_maritimos, fuente <> SITPORT).
    693 filas · 688 nombres distintos · 199 filas con `bahia_sitport_id`
    (= 198 nombres: hay 5 nombres duplicados).

EL MATERIAL VIVO NO ES UN DENOMINADOR SIN HORA. Del 17-08 hay CUATRO fotos y
ninguna sustituye a otra:
    ~22:45Z  sonda de la sesión F1 ........... 16 filas / 16 restricciones
     23:02Z  ESTA CAPTURA .................... 26 filas / 26 restricciones
             smoke del Tramo B ............... 13 filas CERRADAS en 7 bahías
    ~23:50Z  sonda del gate de F2 ............ 23 filas / 23 restr. / 14 bahías
Tres unidades y cuatro momentos. Toda cifra viva lleva HORA y UNIDAD.

--------------------------------------------------------------------------------
nodos.json — EL VOLCADO DE psql, Y POR QUÉ NO ALCANZA CON CONGELADO_puertos
--------------------------------------------------------------------------------
  152.937 bytes en disco · 693 filas · 688 nombres distintos · 199 filas con
  `bahia_sitport_id` · 664 filas con `comuna` no vacía.
  Columnas: id · nombre · tipo · fuente · region · provincia · comuna ·
  bahia_sitport_id · lat · lng.

ES EL ÚNICO INSUMO QUE TRAE `comuna`, y `comuna` es el criterio C3 que resuelve
~~50~~ 50 de los 109 desempates. (ver la enmienda de la terna, §REPARTO DE LOS 688 de `filtro_puerto_2026-08-17.txt`) `/api/puertos` NO devuelve ese campo: por eso
CONGELADO_puertos.json no lo sustituye y por eso los instrumentos que desempatan
leen este fichero y no aquél.
  ENMENDADO 2026-08-18 · entrada (18). Y una precisión que hace falta para no
  levantar la base sin motivo: `join_puerto_bahia.json` GUARDA la `comuna` de cada
  fila, así que quien mida SOBRE EL JOIN no necesita ni este fichero ni psql — y
  no debe usarlos, porque la comuna de hoy puede no ser la que decidió el join.
  Este fichero hace falta para DERIVAR el join, no para medirlo.

LO LEEN TRES DE LOS CUATRO:
    f1_generar.js:43 · f1_controles.js:17 · g7_desempate.js:48
Sin él esos tres no arrancan ni corrigiendo las rutas. Es la forma concreta que
toma el límite (1).

CONSERVA LOS TRES NOMBRES SUCIOS TAL COMO LOS DA LA BASE, que es lo que lo hace
útil como verdad de terreno:
    id 38  "Defensa Costanera Norte Antofagasta "   (espacio final)
    id 253 "Borde costero Caleta El Blanco "        (espacio final)
    id 542 "Defensa Costera Sector Boca Budi\r\n"   (retorno de carro)
El `\r\n` del 542 va ESCAPADO dentro del JSON (dos caracteres, `\` y `r`), NO
como byte de control. Medido: en los 152.937 bytes hay UN solo byte 0x0D y está
en la posición 152.935, que es el terminador final del fichero. El dato no tiene
bytes de control y `core.autocrlf` no puede tocarlo.

--------------------------------------------------------------------------------
QUÉ CIFRA PUBLICADA PRODUJO CADA INSTRUMENTO
--------------------------------------------------------------------------------
Las referencias §N son a `../filtro_puerto_2026-08-17.txt`.

g5_universo.js  — PASOS 2-4. Extrae el filtro y BAHIA_COORDS VERBATIM de
  `src/routes/sitport-routes.js` delimitando por ESTRUCTURA (no por ventana de
  líneas), con aserción de literales: un literal ausente es FALLA, no
  «no aplicable». Mide contra REAL 688 × SONDAJE 444 y contra VIVO 26.
  PRODUJO:
    §1   el universo real — 358/688 reciben >=1 fila · 331 proyectados rojo ·
         27 ámbar · 218 mezclan >1 bahía · reparto 9.255 filas / 4.671 restr.
         Y la comparación PROXY 481 vs REAL 688 (81/358, 61/331, 8/218).
    §1.1 las CUATRO clases de defecto — D1 subcadena 17/688 · D2 token
         compartido 187/688 · D3 token genérico 250/688 (dominante) ·
         D4 doble atribución 218/688 · 262/688 tocados por alguna.
         Y el censo de tokens genéricos: sector 113 · costero 97 · borde 81 ·
         conectividad 49 · norte 18 · bajo 10.
    §1.2 contra verdad de terreno (198 anclados) — acierto 36 · sólo ajenas 63 ·
         alguna ajena 83 · no recibe nada 99 · rótulo correcto 26 · rótulo
         ajeno 73.
    §2   la tabla de los SIETE caminos O0..O6, en las dos unidades.
    §3   aguas abajo por camino en las dos direcciones, contra SONDAJE 444 y
         contra VIVO 26; la sensibilidad del radio (10/25/50/100 km); y la
         validación del ancla geográfica, 193 de 198.
  SUS MORDIDAS: seis, las seis muerden (M-A resolvedor vacío · M-B verdad
  falseada · M-C material vacío ABORTA · M-D BAHIA_COORDS vaciado · M-E control
  positivo, delta contra sí mismo = 0 en los diez contadores · M-F catálogo
  vacío ABORTA).
  Y ES EL FICHERO DONDE VIVE LA LECCIÓN DEL PARCHE ANCLADO: la primera versión
  parcheaba por el literal `p.includes(w)`, que aparece TAMBIÉN dentro de
  `skip.includes(w)`. El parche cayó sobre el `skip` e informó «MUERDE» con un
  81->0 perfectamente creíble. Con el ancla buena (`w => p.includes(w)`) el
  delta es 81->36.

g7_desempate.js — LA CASCADA Y LOS QUE CALLAN.
  PRODUJO:
    §5.1 el rendimiento medido de cada criterio de desempate, que ~~es la apertura
         de los 109 `desempatado`~~: C2 razón 55 · C3 comuna 50 · C4 nombre 3 ·
         [ENMENDADO 2026-08-18 (b1-a): estos cuatro números vuelven a ser los
          del artefacto desde 4f9fbdc3…, por una razón distinta de la de 2026-08-17.
          (ver la enmienda de la terna, §REPARTO DE LOS 688 de `filtro_puerto_2026-08-17.txt`)]
         C5 capitanía 1.
         ENMENDADO 2026-08-18 · entrada (18). ESTOS CUATRO NÚMEROS SON CORRECTOS
         PARA g7 Y NO SON LA APERTURA DEL JOIN. Este párrafo ya decía que los
         produjo g7; lo que faltó fue cotejarlos con el artefacto, que los tiene
         distintos: C2 47 · C3 55 · C4 6 · C5 1. Los dos instrumentos NO tienen la
         misma ~~cascada — g7 resuelve además en C2 el caso `c[0].d === 0` y
         `f1_generar.js` no~~ PRECISIÓN, y el join lo escribió `f1_generar.js`.
         Ocho filas a 0,00 km caen por eso más abajo: 5 a C3 y 3 a C4.
         RE-ENMENDADO el mismo día (`10_diagnosticar_cascada_c2.js` D-3/D-4): la
         cascada es la MISMA. Lo que difiere es que `f1_generar.js` guarda
         `+km().toFixed(2)` y g7 no. Las 8 filas están a 1,5–4,4 m; el redondeo
         las lleva a 0,00 y el guard `c[0].km > 0` de la propia C2 las descarta.
         AVISO PARA QUIEN RE-DERIVE EL JOIN: ~~`f1_generar.js:102`~~ `f1_generar.js:67`
         redondea las distancias ANTES de la cascada. Cualquier re-derivación
         arrastra esto.
         ENMENDADO 2026-08-18 · LA LÍNEA ERA LA 67, NO LA 102. La 67 PRODUCE el
         km redondeado dentro de `vecinas()`; la 102 sólo lo CONSUME en el
         filtro de radio. Quien sacara el redondeo «de la 102» editaba el filtro
         y no tocaba el defecto. Y desde (b1-a) este aviso YA NO APLICA: el
         cálculo va con precisión completa.

         MAPA DE LÍNEAS POR VERSIÓN — porque LOS NÚMEROS DE LÍNEA SE CORREN.
         El comentario que (b1-a) agregó arriba de `vecinas()` desplazó todo lo
         que venía abajo. Un número de línea sin su versión al lado ya costó dos
         enmiendas en este frente, y ESTA misma nota estaba dirigida a quien
         re-deriva, que es quien menos puede permitirse abrir el fichero
         equivocado.

           qué                                 @36543c8   @(b1-a)
           el cálculo de las distancias .......   67         72   ← EL DEFECTO
           el filtro de radio (`<= RADIO`) ....  102        113   ← NUNCA fue éste
           `km_a_esa_bahia` (presentación) ....  107        118
           `margen_km` (presentación) .........  122        133

         EN @36543c8 LA LÍNEA CORREGIDA ES LA 67. EN @(b1-a) ES LA 72. Son la
         misma línea; lo que cambió es el número. Se cita con la versión.
         LA LECCIÓN, que es de método: dos instrumentos que miden «lo mismo» se
         cotejan ANTES de publicar sus cifras juntas. Las dos ternas suman 109 y
         ningún control las cruzó.
    el fichero LOS_QUE_CALLAN.tsv (ver abajo).
    la apertura de DÓNDE calla la app, por franja de latitud y por tipo de nodo.
  ESCRIBE. Ver el aviso del principio.

f1_generar.js   — EL GENERADOR DEL JOIN. Escribe dos cosas, ninguna es código:
    data/catalogo/join_puerto_bahia.json ...... 688 filas
        ~~sha256 dfd072361faa5607b7c487b73d5d45796d16ec10cbd99a613a5df7db351168f5~~
        sha256 4f9fbdc33e290a4cc2ef4dda3e98918eb3bb22466a0fbe07f0170670becddaf6
    ../F1_adjudicacion.tsv .................... 74 filas
        sha256 0ca33c18e48229eba257573ff662cfb2f770e62b24d53354aae220c8d72a1788
        (NO CAMBIÓ con (b1-a) — ver más abajo, y no es casualidad)

  PROVENANCE POR VERSIÓN — QUÉ ARTEFACTO PRODUCE CADA UNA
  Enmendado 2026-08-18 por la sesión (b1-a). Este README describía UN estado y
  ahora hay dos; se enmienda con tachado y no se reescribe limpio.

    f1_generar.js @ 36543c8   blob 1e31de35603c7f2e6cce1c6cb77c77013eb6929f
        join_puerto_bahia.json  sha256 dfd072361faa…351168f5
        F1_adjudicacion.tsv     sha256 0ca33c18e482…d72a1788
        REDONDEA en la línea 67, ANTES de decidir. Es la versión que produjo
        TODA cifra publicada de F1 y de F2. Git la conserva entera:
        `git show 36543c8:_bitacoras/filtro_puerto_2026-08-17/insumos/f1_generar.js`

    f1_generar.js @ (b1-a)    blob a7229ca139b19394e3e803aa09caa552b2d8838d
        join_puerto_bahia.json  sha256 4f9fbdc33e29…becddaf6
        F1_adjudicacion.tsv     sha256 0ca33c18e482…d72a1788   ← el MISMO
        NO redondea el cálculo. El redondeo vive en `p2`/`presenta` y se aplica
        sólo al escribir `evidencia`.

  UNA CIFRA SE CITA CON LA VERSIÓN QUE LA PRODUJO. dfd07236… es de la primera y
  lo sigue siendo: ninguna cifra medida contra ella cambia de dueño porque el
  fichero de hoy diga otra cosa.

  QUÉ SE MOVIÓ ENTRE LAS DOS, medido fila por fila sobre las 688:
    34 filas, y son 8 + 26 DISJUNTAS:
      8 cambian `via` [40,54,59,61,98,212,226,332] · de ellas UNA, el nodo 59,
        cambia además `bahia_id` (85 → 86) y `elegida_km`. Lleva tres campos.
      26 cambian `evidencia.margen_km` Y NO CAMBIAN NINGUNA DECISIÓN.
    NINGUNA fila cambia de `estado`. El reparto 198·194·109·74·113 no se mueve.
    La terna de las 109 `desempatado` pasa de 47·55·6·1 a 55·50·3·1.

  LAS 26 SON UN SEGUNDO REDONDEO, EN LA LÍNEA 122, Y SE QUEDA:
    `margen_km: +(cand[1].km - cand[0].km).toFixed(2)` restaba dos km YA
    REDONDEADOS y volvía a redondear; ahora resta los verdaderos y redondea una
    vez. `round(round(a)-round(b))` difiere de `round(a-b)` en un centésimo.
    Es PRESENTACIÓN: ningún criterio lo lee — el guard de la 119 usa los km.
    La 107 (`km_a_esa_bahia`) es presentación también y tampoco se tocó.

  POR QUÉ LA HOJA NO CAMBIÓ DE sha256, que es lo que sorprende:
    la columna `candidatas` de la hoja imprime `empate_entre`, y `empate_entre`
    sale por `presenta()` —redondeado—. Mismas 74 filas, mismo orden, mismos
    bytes: 21.494. MEDIDO, no supuesto.
  PRODUJO el reparto de los 688 — confirmado_declarado 198 · derivado_limpio 194
  · desempatado 109 · a_adjudicar 74 · sin_bahia_en_catalogo 113 (501 resueltas,
  187 callan) —, los parámetros RADIO 30 km / MARGEN 10 km / RAZÓN 3 con su
  motivo escrito dentro del artefacto, el criterio de «quién adjudica»
  (capitanía 11 · costa 63 · catálogo 0) y el orden declarado de la hoja.
  ESCRIBE, Y SOBRE DOS FICHEROS COMMITEADOS. Ver el aviso del principio.

f1_controles.js — EL BANCO. Lee el ARTEFACTO DEL DISCO, no la estructura en
  memoria del generador, que es la única forma de medir el entregable.
  PRODUJO C1..C9: cobertura 688/688 · vocabulario 0 fuera · coherencia
  estado<->bahia_id<->via 0 incoherentes · las confirmadas 198/198 contra la
  base · 501 bahia_id emitidas y 0 inexistentes · 74 a_adjudicar y 0 con bahía
  puesta · la hoja sin huecos · 0 nombres con control o borde sucio · piso por
  unidad con 3.599 comparaciones.
  SUS MORDIDAS: nueve, las nueve muerden, sobre COPIAS; sha256 del artefacto y
  de la hoja comprobados IGUALES antes y después.
  SÓLO LEE.

LOS_QUE_CALLAN.tsv — 1 cabecera + 187 filas de datos, 14 columnas. Es la lista
  nominal de los 187 que el join deja sin bahía, con su CAUSA y QUE_HACE_FALTA.
  Producido por g7_desempate.js.
  LA APERTURA POR TIPO ES PARCIAL Y ASÍ SE DECLARA: cubre 167 de los 187 sobre
  un denominador de 595 de 688 — Rampa 44/104 · Embarcadero 39/150 · Defensa
  Costera 33/132 · Terminal 1/15 · Puerto 0/10 · 50 caletas de 184. Faltan 20
  callados y 93 puertos sin tipo declarado.
  RECORDATORIO DEL VOCABULARIO: `bahia_id: null` NO significa lo mismo en
  `a_adjudicar` (74, «no sabemos cuál») que en `sin_bahia_en_catalogo` (113, «no
  hay nada que decir»). El `estado` los distingue. NO SE COLAPSAN.

--------------------------------------------------------------------------------
CRLF — MEDIDO, NO SUPUESTO, PORQUE AFECTA A LOS sha256 DE ARRIBA
--------------------------------------------------------------------------------
Este repo tiene `core.autocrlf=true` y NO tiene `.gitattributes`. Ningún fichero
de esta carpeta tiene bytes de control DENTRO del dato: los únicos 0x0D que
existen son terminadores de línea, medidos con volcado de bytes y con control
positivo (un fichero de prueba CRLF devuelve CR=2, como debe).

LOS NUEVE FICHEROS DE LA CARPETA CAEN EN TRES CLASES, y no en dos:

  (A) UNA SOLA LÍNEA, SIN TERMINADOR — 2 de los 9.
      CONGELADO_vivo.json · CONGELADO_puertos.json
      No hay nada que convertir. Un `git checkout-index` los materializa con el
      sha256 EXACTO declarado arriba, en cualquier plataforma. Para éstos el
      sha256 de fichero SÍ es la huella invariante, y por eso el ancla de
      comparabilidad con F1 se sostiene — que es lo único que estos commits
      tenían que garantizar.

  (B) TEXTO MULTILÍNEA EN LF — 6 de los 9: los cinco publicados abajo
      (f1_generar.js · f1_controles.js · g5_universo.js · g7_desempate.js ·
      LOS_QUE_CALLAN.tsv) MÁS ESTE README, que también es texto y también se
      materializa en CRLF; no lleva blob-sha publicado por la razón del párrafo
      siguiente.
      git avisa «LF will be replaced by CRLF» y un checkout en Windows los
      materializa en CRLF, con otro sha256. El BLOB sigue en LF. Para éstos la
      huella invariante es el BLOB-SHA, no el sha256 del fichero.

  (C) UNA SOLA LÍNEA, TERMINADA EN CRLF — 1 de los 9: nodos.json.
      ES UN CASO PROPIO Y SE MIDIÓ APARTE. El fichero tiene 152.937 bytes; el
      BLOB GUARDADO TIENE 152.936, porque git se comió el CR del terminador.
      En ESTA máquina el checkout lo devuelve a 152.937 y el sha256 vuelve a ser
      316107f39d86274aa2f07bbfa54de12b0a260bb8857430ad7c33e6fa1ae06d5d — pero eso
      es autocrlf deshaciendo lo que hizo, no una invariante: en un checkout que
      no convierta, el fichero termina en LF y el sha256 es otro.
      POR ESO SE PUBLICA SU BLOB-SHA, como los de la clase (B), y no su sha256.
      El dato viaja intacto: comprobado tras el checkout, 693 filas, 688 nombres
      y los tres nombres sucios idénticos, con el `\r\n` del 542 escapado.

BLOB-SHA DE LOS OCHO PUBLICADOS, tal como quedan en este commit — el README no
puede publicar el suyo, porque escribirlo lo cambiaría:
      CONGELADO_vivo.json     91b08e8bb0213bd738e1d90989c5575e6883fb7b
      CONGELADO_puertos.json  4e39438ed680a424b9e01e982ae14359d609b489
      f1_generar.js           1e31de35603c7f2e6cce1c6cb77c77013eb6929f
      f1_controles.js         964ffcfab7c0d276960ecdceaeb78604e7a05b91
      g5_universo.js          014fd55369a15f31e9c19da2615df4aad9c7ab63
      g7_desempate.js         575d20881a81b5ab219a753ec74f29f301f88ca5
      LOS_QUE_CALLAN.tsv      78c48804af054336a8f1f92f534118067cfbb73a
      nodos.json              a57bc7a9798940113586a1583388ddb756a1bdf8

NO SE AGREGÓ UN .gitattributes. Sería la solución limpia, pero es un cambio de
alcance del repositorio que nadie autorizó, y no hace falta para lo único que
estos commits tienen que garantizar: las dos capturas de la clase (A) ya son
invariantes por su propia forma.

--------------------------------------------------------------------------------
QUÉ FALTA EN ESTA CARPETA — nada
--------------------------------------------------------------------------------
Con `nodos.json` adentro, los cuatro instrumentos tienen todos los insumos que
leían del scratchpad. La carpeta está completa como EVIDENCIA.

Completa no quiere decir re-corrible: siguen en pie los dos límites de arriba y
el aviso de que dos de los cuatro escriben sobre ficheros versionados.

================================================================================
FIN — insumos de F1. Evidencia. Nadie los consume y no están re-corridos.
================================================================================
