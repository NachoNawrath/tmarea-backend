# RECONOCIMIENTO - Migracion caletas_chile.json v1 -> v2

Fecha: 2026-08-08

---

## 1. Fuente de datos del buscador P2

**RESULTADO: El buscador lee del archivo JSON, NO de PostGIS.**

- El frontend importa `caletas_chile.json` directamente (P2_VoyageSetup.jsx:3)
- La funcion `buscarCaletasLocal()` filtra el array en memoria (lineas 13-24)
- No hay fetch a API ni consulta SQL para caletas
- El archivo vive en `tmarea-pwa/src/data/caletas_chile.json`
- La copia en `tmarea-backend/caletas_chile.json` es identica (SHA256 coincide)

> Detalle completo: [01_fuente_datos_buscador.txt](01_fuente_datos_buscador.txt)

---

## 2. Consumidores de datos de caletas

| # | Archivo | Tipo | Rol |
|---|---------|------|-----|
| 1 | tmarea-pwa/src/screens/P2_VoyageSetup.jsx | Frontend JSX | CONSUMIDOR PRINCIPAL (buscador P2) |
| 2 | tmarea-pwa/src/data/caletas_chile.json | Datos | JSON consumido por el frontend |
| 3 | tmarea-backend/caletas_chile.json | Datos | Archivo fuente (copia identica al de PWA) |
| 4 | tmarea-backend/tools/seed-nodos-maritimos.js | Seed tool | CONSUMIDOR SECUNDARIO (inserta nodos PostGIS) |
| 5-9 | procesar_caletas*.py, scraper_caletas.py | Scripts Python | Generadores del JSON (no runtime) |
| 10-12 | Docs varios (.md) | Documentacion | Solo mencionan el concepto, no consumen datos |

No se encontro ningun SELECT ... FROM ...caletas... en el codigo.

> Detalle completo: [02_consumidores_caletas.txt](02_consumidores_caletas.txt)

---

## 3. Campos exactos consumidos

### Frontend (P2_VoyageSetup.jsx) - runtime:
- `id` (React key, linea 319)
- `nombre` (busqueda + display, lineas 18, 114, 118, 119, 744)
- `comuna` (busqueda + display, lineas 19, 115, 118, 119)
- `region` (busqueda + display, lineas 20, 115)
- `latitud` (display coordenadas, linea 116)
- `longitud` (display coordenadas, linea 116)

### Seed tool (seed-nodos-maritimos.js) - one-time:
- `id`, `nombre`, `region`, `provincia`, `comuna`, `latitud`, `longitud`

> Detalle completo: [03_campos_usados.txt](03_campos_usados.txt)

---

## 4. Uso del campo "provincia"

**El codigo del buscador de P2 NO usa "provincia".**

El unico consumidor es `seed-nodos-maritimos.js:106` (`c.provincia || null`).

Las referencias a `.provincia` en P2_VoyageSetup.jsx lineas 73 y 79 son para
el config de tipo "puerto" (datos de puertos via API), NO para caletas.

**Impacto:** El buscador P2 NO se rompe. Si se re-ejecuta el seed, la columna
provincia quedara NULL para caletas en nodos_maritimos.

> Detalle completo: [04_uso_provincia.txt](04_uso_provincia.txt)

---

## 5. Chequeo de sanidad

| Metrica | v1 (viejo) | v2 (nuevo) |
|---------|-----------|-----------|
| Registros | 569 | 481 |
| JSON parseable | SI | SI |
| Diferencia | - | -88 registros |

### Schema v1 (8 campos):
id, nombre, region, **provincia**, comuna, latitud, longitud, fuente

### Schema v2 (13 campos):
id, nombre, region, comuna, latitud, longitud, **propiedad**, **actividades**,
**especies**, **nro_embarcaciones**, **nro_pescadores**, **entorno**, fuente

### Cambios de schema:
- **Conservados:** id, nombre, region, comuna, latitud, longitud, fuente
- **Quitado:** provincia
- **Agregados:** propiedad, actividades, especies, nro_embarcaciones, nro_pescadores, entorno

Coincide con lo declarado en el prompt.

> Detalle completo: [05_sanidad_antes_despues.txt](05_sanidad_antes_despues.txt)

---

## Conclusion para Fase 2

La migracion es VIABLE para el buscador de P2:
- Los 6 campos que el buscador usa (id, nombre, comuna, region, latitud, longitud)
  estan presentes en v2.
- El campo "provincia" que se pierde NO afecta al buscador.
- El v2 tiene 88 registros menos — evaluar si es aceptable.
- El seed tool recibira `null` en provincia si se re-ejecuta.

**Archivos a reemplazar:**
1. `tmarea-backend/caletas_chile.json` (fuente)
2. `tmarea-pwa/src/data/caletas_chile.json` (copia consumida por frontend)
