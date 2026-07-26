'use strict';
const { warmup, calcularRuta } = require('./src/services/raster-router-service');
const { construirPerfilCosto } = require('./src/config/perfiles-costo');

const w = warmup('AUSTRAL_N');
console.log('warmup:', w);

const perfil = construirPerfilCosto({ calado_m: 1.2, licencia: 'PNM' });
console.log('perfil:', JSON.stringify(perfil));

// ruta corta y simple: dentro del Golfo de Ancud, agua abierta conectada
const t0 = Date.now();
const r = calcularRuta(perfil, { lat: -41.9, lon: -73.1 }, { lat: -42.0, lon: -73.15 });
console.log(`calcularRuta: ${Date.now() - t0}ms`);
console.log(JSON.stringify(r, null, 2));
