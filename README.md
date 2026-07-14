# tmarea-backend

## SITPORT Integration

Endpoints que consultan datos de SITPORT (DIRECTEMAR, Armada de Chile) para
soportar P3 (Cotejo del Viaje). Son públicos, no requieren autenticación, y se
cachean en memoria por 10 minutos para no saturar el servicio de DIRECTEMAR.

### GET /api/sitport/restricciones

Restricciones activas por bahía.

```bash
curl http://localhost:3000/api/sitport/restricciones
```

```json
{
  "success": true,
  "data": [
    {
      "bahia": 88,
      "FCinicio": "13 Jul 2026 16:31:00:000",
      "FCTermino": null,
      "tipo": "TODOS",
      "NombreInstalacion": "TODAS",
      "tiporestriccion": "LIMITES OPERACIONALES",
      "MotivoRestriccion": "OLA - MAREJADA DE 1.6 MT.",
      "Detalle": "OLA - MAREJADA DE 1.6 MT. , OLA - MAREJADA DE 19 SEG."
    }
  ],
  "error": null
}
```

> Nota: DIRECTEMAR devuelve internamente `{ recordsets: [[...]] }` (formato
> driver SQL Server); el servicio lo desenvuelve a un array plano.

### GET /api/sitport/bahias

Listado de bahías nacionales con su estado general.

```bash
curl http://localhost:3000/api/sitport/bahias
```

```json
{
  "success": true,
  "data": [
    { "IDBahia": 72, "CdReparticion": 10, "NMBahia": "BAHÍA DE IQUIQUE", "color": "default", "valor": 0 }
  ],
  "error": null
}
```

### GET /api/sitport/pronostico

Pronóstico meteorológico nacional a 4 días.

```bash
curl http://localhost:3000/api/sitport/pronostico
```

```json
{
  "success": true,
  "data": [
    {
      "idBahia": 72,
      "fecha": "2026-07-14T03:23:49.000Z",
      "temperatura": 18.6,
      "presion": 1015.99,
      "velocidadViento": 2.0,
      "direccionViento": 355.0,
      "lluviaUltimaHora": 0.0
    }
  ],
  "error": null
}
```

### Errores

Cualquiera de los 3 endpoints responde `502` con `{ success: false, data: [], error: "..." }`
si SITPORT no contesta (timeout, error de red o status HTTP de error).

### Tests

```bash
npm test
```
