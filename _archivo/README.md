# Archivo de obsoletos - tmarea-backend

Esta carpeta guarda archivos sin uso en el codigo, conservados para trazabilidad, fuera de la app en produccion.

## Archivos

### bem_puertos_geocodificados.json
- **Sesion de origen:** puertos BEM, 05-ago-2026
- **Que era:** producto intermedio de geocodificacion manual de puertos del Boletin Estadistico Maritimo (JSON array con nombre, tipo, autoridad maritima, operadores, lat/lon)
- **Referencias en codigo al momento de archivar (08-ago-2026):** 0 — ningun archivo del backend lo importa ni lo lee

### insertar_puertos_bem.sql
- **Sesion de origen:** puertos BEM, 05-ago-2026
- **Que era:** script SQL one-shot (PL/pgSQL) para insertar puertos del BEM en la tabla PostGIS de nodos maritimos, con deteccion de duplicados por proximidad
- **Referencias en codigo al momento de archivar (08-ago-2026):** 0 — ningun archivo del backend lo referencia