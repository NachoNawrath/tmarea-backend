# voseo_al_patron_2026-08-20 — PROCEDENCIA

**Shell del agente:** Git Bash. Los comandos para que el owner reproduzca van en
PowerShell, al pie de `06_barrido_clasificado.txt` y de `16_control_pantalla.txt`
(§7.3 de CLAUDE.md).

**Arboles al empezar**
- `tmarea-backend` `05c79eacfcb51160905400f018c65d27d234ff15` = `origin/main`
- `tmarea-pwa` `df26887946973cfb3c85d243dec78e8e7aa5e011` = `origin/main`

**Que se hizo, en una linea:** el voseo del texto al patron paso a usted (4
cadenas, 2 ficheros de la PWA); el tuteo quedo medido y sin tocar; el §10 y su
espejo en el dato quedaron redactados para que los pegue el owner.

---

## Los ficheros

| fichero | que es |
|---|---|
| `01_barrido.js` · `.txt` · `.json` | barrido sobre los dos repos. Es el DENOMINADOR: 349 ficheros, 42.441.991 puntos de codigo |
| `02_clasificar.js` · `.txt` · `.json` | particion por rol (P, C10, C resto, S, D), con la regla declarada arriba del fichero |
| `03_extraer.js` · `.txt` · `.json` · `03_fragmentos.json` | extractor de texto renderizable: solo cadenas y texto JSX, sin comentarios; en `.json`, solo valores, citados por ruta de clave |
| `04_usted.js` · `.txt` | sonda de usted. Nacio de leer el inventario, no estaba en el encargo |
| `05_sitport_vivo.json` | captura viva de SITPORT del gate (23 filas). Evidencia cruda |
| `06_barrido_clasificado.txt` | **entregable de PARADA 1** |
| `07_control_citas.js` · `.txt` | relectura de 41 citas contra su origen, con grupo de asercion invertida |
| `08_control_caracteres.js` · `.txt` | control H-T2 |
| `09_cerrar_vocabulario.js` · `09_candidatos.*` | deriva los candidatos DEL CORPUS: conjunto A (encabezamiento) y B (terminacion -as/-es/-is) |
| `10_vocabulario_cerrado.js` · `.json` · `.txt` | el vocabulario cerrado: 226 formas |
| `11_inventario.js` · `.json` · `.txt` | **el inventario del tuteo**, con las resoluciones como dato |
| `12_corregir_voseo.js` · `12_correccion_voseo.txt` | la correccion, con conteo esperado y control despues de escribir |
| `13_seccion10_en_usted.md` | **el §10 y su espejo, redactados para pegar** |
| `14_sitport_vivo_pantalla.json` · `15_sitport_al_capturar.json` | las dos capturas vivas de PARADA 2 |
| `16_control_pantalla.txt` | **la pantalla con su control**, anclado en las restricciones vivas |

---

## Tres defectos de instrumento, todos cazados por un control y no por la lectura

**D1 — NFD contra NFC.** Los heredocs de esta maquina produjeron la misma letra
de dos formas: la `á` salio **descompuesta** (`a`+U+0301) en el vocabulario y
**precompuesta** (U+00E1) en el arbol. **Un vocabulario descompuesto contra un
arbol precompuesto da cero, y cero se lee como arbol limpio.** Lo cazo el control
positivo del paso 01. Arreglo: NFC en las dos puntas, y el control prueba las dos
direcciones.

**D2 — el heredoc se come un nivel de barra invertida.** Distinto de la regla ya
escrita (el heredoc *se corta* sobre ~6 KB). `p{L}` sin su barra no falla: mide
mal en silencio. Mordio dos veces. Arreglo: la barra se construye por punto de
codigo, y la regla de particion se reescribio sin expresiones regulares.

**D3 — la lectura, no el metodo.** La primera lectura de los conjuntos derivados
se hizo sobre listas de palabras sueltas. `varas` se descarto como el toponimo de
Puerto Varas; en el arbol es tambien el verbo de «Si chocas, varas o sufres
danos». Las cuatro formas perdidas YA ESTABAN en los conjuntos. El arreglo no fue
agregar cuatro formas: fue rehacer la lectura con el ejemplo al lado.

---

## Controles al cerrar PARADA 2

| control | resultado |
|---|---|
| `01_barrido.js` | **EXIT 0** — 6/6 y el ancla reescrita: el escalon 3 pinta dos veces, en un solo registro, y hoy dice `usted` |
| `03_extraer.js` | **EXIT 0** — 4/4 |
| `07_control_citas.js` | **EXIT 0** — 41 citas, 0 sin cotejar |
| `08_control_caracteres.js` | **EXIT 0** — H-T2, 0 sospechosos, 0 BOM |
| `10_vocabulario_cerrado.js` | **EXIT 0** — las 5 formas perdidas estan y el intruso no |
| `11_inventario.js` | **EXIT 0** — `SIN_RESOLVER = 0`: todo hit cae bajo una regla escrita |
| `12_corregir_voseo.js` | **EXIT 0** — 4 sustituciones, ninguna de mas |
| `npm test` (backend) | **157/157** |
| pantalla | voseo **0** sobre 4.503 puntos de codigo, y el mismo comparador da **1** con el defecto devuelto |

---

## Dos controles que se reescribieron porque median el defecto, no la propiedad

El ancla del paso 01 y el control (1) del paso 03 exigian la forma **voseante**:
se ponian en rojo justo cuando la correccion salia bien. Se reescribieron para
que valgan antes y despues — y el del paso 01 ademas caza algo que antes no
cazaba: una **correccion a medias**, con una rama en voseo y la otra en usted.

Lo mismo con dos citas del paso 07: en vez de borrarlas se les invirtio la
asercion. Que dejen de cotejar es lo que prueba que la correccion entro.

---

## Lo que NO se toco

`CONTRATO_MOTOR.md` · el motor BRE · cualquier texto de SITPORT · el lema
«NAVEGA CON CERTEZA» (7 sitios, fuera por decision del owner) · el bloque de
clima de Puerto Montt/Quemchi · los dos intocables, que siguen ` M` sin stagear.
