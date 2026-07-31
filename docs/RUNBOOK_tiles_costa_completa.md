# Runbook — Cobertura raster costa completa de Chile

Cómo generar los tiles raster que faltan para que el motor de rutas
(`src/services/raster-router-service.js`) cubra toda la costa de Chile, y cómo
enchufarlos al router. Hoy solo existe **AUSTRAL_N**; el router ya está
preparado para multi-tile (registry + selección por coordenada + encadenado),
pero los binarios de los demás tiles aún no se generaron.

> Una ruta que entra en un tile no generado devuelve un error explícito con
> `tile_faltante` y `tiles_ruta` (no crashea). Ese es el estado esperado hasta
> que se corra este runbook.

---

## 1. Tiles objetivo

Bandas de latitud, de norte a sur. Deben **solaparse ~0.1°** con sus vecinos
(el punto de traspaso del encadenado cae sobre la costura y necesita agua
cubierta por ambos tiles).

| Tile        | lat (N → S)      | lon (costa)      | Estado        |
|-------------|------------------|------------------|---------------|
| NORTE       | −18.3 … −30.0    | −71.9 … −69.4    | por generar   |
| CENTRO      | −30.0 … −37.5    | −74.0 … −70.9    | por generar   |
| SUR         | −37.5 … −39.5    | −74.2 … −72.3    | por generar   |
| AUSTRAL_N   | −39.5 … −47.0    | −75.6 … −71.9    | **construido**|
| AUSTRAL_S   | −47.0 … −56.5    | −76.2 … −66.4    | por generar   |

Estos bbox son los del **registry del router** (`TILE_REGISTRY` en
`raster-router-service.js`), usados para seleccionar tile por coordenada.
Tras construir cada tile, ajustar su entrada del registry a los **extents
reales** del tile generado.

### Reconciliación con `tools/raster-build/grid.py`

`grid.py` hoy trae otra partición del norte (un único `NORTE` a **100 m**,
lat −40…−17.5) y no tiene `CENTRO`/`SUR`. Antes de construir hay que decidir y
dejar `grid.py` consistente con esta tabla. Entradas sugeridas (con overlap de
0.1° hacia cada banda vecina; CRS único tmerc lon_0=−72, igual que AUSTRAL_N):

```python
# tools/raster-build/grid.py  → dict TILES
"NORTE":     {"lon_min": -71.9, "lon_max": -69.4, "lat_min": -30.1, "lat_max": -18.3, "res_m": 50},
"CENTRO":    {"lon_min": -74.0, "lon_max": -70.9, "lat_min": -37.6, "lat_max": -29.9, "res_m": 50},
"SUR":       {"lon_min": -74.2, "lon_max": -72.3, "lat_min": -39.6, "lat_max": -37.4, "res_m": 50},
"AUSTRAL_N": {"lon_min": -75.6, "lon_max": -71.9, "lat_min": -47.0, "lat_max": -39.5, "res_m": 50},  # ya construido
"AUSTRAL_S": {"lon_min": -76.5, "lon_max": -66.8, "lat_min": -47.1, "lat_max": -56.5, "res_m": 50},
```

**Decisión de resolución.** La tarea pide 50 m en todos. A 50 m, NORTE
(11.7° de latitud) y AUSTRAL_S (9.5°) son tiles enormes: correr
`python grid.py NORTE` imprime `cols×rows` y el tamaño estimado en uint16 —
esperar **~250–400 MB por tile** en disco y otro tanto en RAM al cargarlo. Si
el norte (costa abierta, sin laberinto de canales) no justifica 50 m, evaluar
100 m ahí (era la decisión previa en `grid.py`) y dejar 50 m en el sur. Confirmar
antes de construir.

---

## 2. Datos de entrada (por tile)

El pipeline (`tools/raster-build/build_tile.py`, spec §5) consume:

| Insumo | Origen | Ruta esperada |
|--------|--------|---------------|
| Water polygons OSM (global) | `osmdata.openstreetmap.de/download/water-polygons-split-4326.zip` | `C:/tmarea-data/raw/water-polygons-split-4326.zip` (se lee con recorte por bbox; **descargar una sola vez**) |
| Seamarks de peligro | Overpass, por bbox del tile | `C:/tmarea-data/raw/{TILE}_seamarks_peligro.json` (ver `fetch_seamarks.py`) |
| Zona intermareal | OSM PBF de Chile → `extraer_intermareal_pbf.py` | `C:/tmarea-data/raw/{TILE}_intermareal.json` |
| Zonas dragadas (margen relajado) | curado a mano | `src/config/zonas-dragadas.json` (agregar zonas de la región) |
| Estructuras artificiales (exclusiones) | curado a mano | `src/config/exclusiones.json` (terraplenes/causeways de la región) |

Los dos últimos son **por región**: hoy solo cubren la zona de AUSTRAL_N. Para
cada tile nuevo hay que revisar puertos/pasos de su banda y sumar las zonas y
exclusiones que correspondan, o el tile saldrá con márgenes/costa incorrectos
(ver observaciones del `AUSTRAL_N.meta.json`).

---

## 3. Generar un tile

Desde `tools/raster-build/` con el venv del pipeline:

```bash
cd tools/raster-build
# .venv ya existe; si no: python -m venv .venv && pip install -r requirements.txt
./.venv/Scripts/python grid.py NORTE          # ver cols×rows y MB estimados
./.venv/Scripts/python fetch_seamarks.py NORTE # seamarks de peligro por Overpass
./.venv/Scripts/python extraer_intermareal_pbf.py NORTE  # requiere el PBF de Chile
./.venv/Scripts/python build_tile.py --tile NORTE
```

Salida en `C:/tmarea-data/tiles/`:
`{TILE}.bin`, `{TILE}.coarse.bin`, `{TILE}.control.tif`, `{TILE}.meta.json`.

> Los binarios son de 100–400 MB: **viven fuera del repo** (GitHub los rechaza),
> en `TMAREA_TILES_DIR` (default `C:/tmarea-data/tiles`).

### Verificar el tile

```bash
./.venv/Scripts/python check_control_points.py NORTE
./.venv/Scripts/python -m pytest test_connectivity.py
```

Revisar en `{TILE}.meta.json`: `rows`/`cols` coherentes, `cobertura_batimetrica`
(en Fase 2 todo ROJO es correcto) y las `observaciones` (nº de seamarks,
intermareal restado, exclusiones aplicadas).

---

## 4. Enchufar el tile al router

1. Copiar `{TILE}.bin`, `{TILE}.coarse.bin`, `{TILE}.meta.json` a
   `TMAREA_TILES_DIR` (los `.control.tif` no los usa el runtime).
2. En `src/services/raster-router-service.js`, ajustar la entrada de
   `TILE_REGISTRY` del tile a sus **extents reales** (los del `.meta.json`,
   reproyectados a lat/lon), manteniendo el solape de 0.1° con los vecinos.
3. (Opcional) Pre-cargar el tile al boot en `src/index.js`:
   `rasterRouterService.warmup('NORTE')`. Si no, se carga on-demand la primera
   vez que una ruta lo toca (lazy, cache en memoria).
4. Probar selección y encadenado:

```bash
# dentro del tile nuevo
curl -s -X POST http://localhost:3000/api/rutas/calcular-v2 \
  -H 'Content-Type: application/json' \
  -d '{"lat_origen":-29.9,"lon_origen":-71.3,"lat_destino":-30.5,"lon_destino":-71.5}'

# cruzando una costura (debe devolver tiles_ruta con 2+ tiles y tramos continuos)
curl -s -X POST http://localhost:3000/api/rutas/calcular-v2 \
  -H 'Content-Type: application/json' \
  -d '{"lat_origen":-38.0,"lon_origen":-73.5,"lat_destino":-41.5,"lon_destino":-72.96}'
```

La respuesta trae `tiles_ruta: [...]` con los tiles atravesados; los `tramos` de
cada tramo se concatenan en orden.

---

## 5. Cómo encadena el router (para afinar después)

`calcularRuta()` (en `raster-router-service.js`):

1. `selectTile()` resuelve el tile de origen y el de destino por su bbox.
2. Si son el mismo → A* jerárquico dentro de ese tile (comportamiento actual).
3. Si son distintos → `orderedTilesBetween()` arma la secuencia de bandas y, en
   cada costura, calcula un **punto de traspaso** sobre la recta origen→destino
   a la latitud de la costura (`seamLat`/`lonAtLat`). Corre el A* en cada tile
   por separado (origen→traspaso₁, traspaso₁→traspaso₂, …, traspasoₖ→destino) y
   concatena los tramos.

**Limitación v1 (afinar cuando existan ≥2 tiles):** el punto de traspaso es la
intersección de la costura con la recta origen→destino, no un óptimo global; si
en esa latitud la recta cae sobre una península, el snap a agua de cada tile
puede meter un pequeño quiebre en la costura. Con el solape de 0.1° el traspaso
queda sobre agua cubierta por ambos tiles y los tramos quedan continuos. Mejora
posible: elegir el traspaso por mínimo costo sobre la banda de solape en vez de
por intersección geométrica.
