# Estado de verificación — límites jurisdiccionales

Fuente: D.S. (M.) N° 991/1987, texto consolidado vigente 12-NOV-2020
(última modificación D.S. 391, D.O. 12.11.2020). BCN Ley Chile, idNorma 142425.

Control de completitud: la Armada declara 16 Gobernaciones Marítimas y
**64 Capitanías de Puerto**. La transcripción da 64. Ninguna falta ni sobra.

---

## CERRADO

**Punta Tames (Tocopilla / Mejillones)**
El decreto daba dos latitudes para el mismo punto: 22°39'00"S en Tocopilla y
22°30'00"S en Mejillones — 16,6 km de costa asignados a las dos Capitanías.
Verificación en terreno: Punta Tames está en 22°39'22"S.
→ Rige 22°39'00"S. Corregido el párrafo de Mejillones.

**Punta Chocoi**
073°45'00"W en los párrafos de CP Ancud y CP Maullín (modificados por D.S. 80
de 2004); 073°46'20"W en el párrafo de la Gobernación Marítima de Castro, que
BCN marca como no actualizado.
→ Rige 073°45'00"W. El decreto arbitra por jerarquía de párrafos.

**CP Achao — "Longitud 073°12'00" S"**
Verificado en pantalla: el error es de la fuente, no de extracción. Una longitud
no admite hemisferio S, y CP Chonchi y CP Chaitén usan 073°12'00"W para el mismo
meridiano.
→ Se lee como W.

**CP Punta Arenas — "52°3030" S"**
Verificado en pantalla: falta el apóstrofe en el decreto. El párrafo inmediatamente
anterior (CP Puerto Natales) cierra en 52°30'30"S y ambos provienen del mismo
D.S. 391 Art. 1 N° 21.
→ Se lee como 52°30'30"S.

**Punta Meulín — "NE" vs "NW"**
Quemchi la llama punta NE, Achao punta NW, con coordenadas idénticas
(42°23'30"S / 073°17'00"W). La geometría se construye desde coordenadas.
→ Cosmético. Sin efecto.

**Párrafo de la Gobernación Marítima de Castro**
BCN advierte en nota al pie que el numeral 15 del D.S. 391 lo modifica sin
incorporarlo al texto. Por eso conserva referencias antiguas.
→ La geometría se construye desde los párrafos de las Capitanías. La Gobernación
   es agregación de sus Capitanías, no fuente independiente.

---

## PENDIENTE

**CP Punta Delgada y CP Tierra del Fuego**
El decreto define sus límites solo por accidentes geográficos sin coordenadas:
Punta Harry, Cabo San Vicente, Punta Anxius, costa Weste de Isla Dawson,
Península Brecknock.

Verificado: Cabo San Vicente existe y está en 52°46'40"S / 070°26'21"W.
Punta Harry no figura en bases comerciales — es toponimia de carta náutica.

→ Ambas quedan cargadas **sin geometría** y con `participa_matching: false`.
   Si una ruta cae en esa zona, la app debe avisar que el límite no está cargado,
   nunca resolver en silencio.
→ Vía correcta cuando se retome: carta SHOA del Estrecho de Magallanes.
   No usar coordenadas aproximadas de fuentes no oficiales.

Buscado y **no encontrado**: capa geoespacial de jurisdicciones marítimas
publicada en IDE Chile, geoportal.cl, datos.gob.cl o DIRECTEMAR. Lo que existe
bajo ese nombre en datos.gob.cl es un directorio de autoridades y contactos, sin
geometría. La transcripción del decreto es la única vía.

---

## HALLAZGO ESTRUCTURAL

Validada la cadena de paralelos de norte a sur quedan 6 discontinuidades, y
**ninguna es un error**: son pares de Capitanías laterales, no apiladas —

- Lirquén / Talcahuano, dentro de la Bahía de Concepción
- Valdivia / Corral, separadas por la línea Punta Juan Latorre–Punta Niebla
- Melinka / Puerto Cisnes, separadas por la línea del Canal Moraleda
- Puerto Cisnes / Puerto Aguirre y Puerto Aguirre / Puerto Chacabuco, ídem
- Quemchi / Chaitén, con Achao y Castro intercaladas

**Consecuencia para el motor:** las Capitanías no se apilan por latitud.
Cualquier lógica que resuelva jurisdicción por franjas de latitud es incorrecta
desde el sur de Concepción hacia abajo, y gruesamente incorrecta en toda la zona
de canales.

---

## RESUMEN

| | |
|---|---|
| Capitanías transcritas | 64 de 64 |
| Con límites cerrados | 62 |
| Sin georreferenciar | 2 (Magallanes) |
| Participan del matching | 50 marítimas |
| Excluidas por tipo | 6 lacustres, 4 antárticas, 2 insulares remotas |
| Correcciones aplicadas | 3, todas con nota de qué dice la fuente original |
| Valores rellenados por deducción | 0 |
