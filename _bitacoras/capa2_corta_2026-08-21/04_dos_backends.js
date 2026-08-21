// 04_dos_backends.js — EL MISMO CUERPO CONTRA LOS DOS BACKENDS.
//
// POR QUE EXISTE. `zonas-aviso.js:478` cachea la declaracion en `_cache` y NADA
// en produccion llama con `recargar: true`. El backend de la otra sesion (3000,
// PID 17800) arranco a las 12:12 y no se reinicio, asi que tiene EL TEXTO VIEJO
// en memoria. Medir la pantalla contra el 3000 habria dado un falso.
//
// Esto lo prueba en vez de suponerlo: mismo cuerpo, dos puertos, se comparan las
// dos capa_2. Es de solo lectura sobre el 3000 — un POST de consulta, no muta
// nada de su estado.

const RUTAS = {
  'Antofagasta -> Taltal (rama CON Capitania nombrada)': [
    { lat: -23.6510, lng: -70.3975 },
    { lat: -24.4722, lng: -70.5750 },
    { lat: -24.6946, lng: -70.5824 },
    { lat: -25.4083, lng: -70.4900 },
  ],
  'Puerto Eden -> Tortel (rama de DERIVACION GENERICA)': [
    { lat: -49.1300, lng: -74.4200 },
    { lat: -48.5000, lng: -74.6000 },
    { lat: -47.8000, lng: -74.4000 },
    { lat: -47.7960, lng: -73.5330 },
  ],
};

async function pedir(puerto, puntos) {
  const r = await fetch(`http://localhost:${puerto}/api/sitport/restricciones-ruta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ruta_puntos: puntos, nave_ab: 50 }),
  });
  const d = await r.json();
  return d;
}

(async () => {
  console.log('EL MISMO CUERPO CONTRA LOS DOS BACKENDS');
  console.log('  3000 = otra sesion, PID 17800, arranco 12:12, NO reiniciado');
  console.log('  3100 = mio, PID propio, arrancado despues de aplicar');
  console.log('='.repeat(78));

  for (const [nombre, puntos] of Object.entries(RUTAS)) {
    console.log('\n' + nombre);
    for (const puerto of [3000, 3100]) {
      let d;
      try { d = await pedir(puerto, puntos); }
      catch (e) { console.log(`  ${puerto}: NO RESPONDE (${e.message})`); continue; }
      const c = d.cobertura_jurisdiccional;
      if (!c) { console.log(`  ${puerto}: sin cobertura_jurisdiccional`); continue; }
      const a = (c.avisos || [])[0];
      console.log(`  ${puerto}: bandera_final ${d.bandera_final} · estado ${c.estado} · avisos ${(c.avisos || []).length}`);
      if (a) {
        console.log(`        largo ${a.largo_km} km · capitanias ${a.capitanias.length}` +
                    ` · generico ${a.contacto_generico ? 'SI' : 'no'}`);
        console.log(`        capa_2 (${a.capa_2.length} car): ${a.capa_2}`);
      }
    }
  }
  console.log('\n' + '='.repeat(78));
  console.log('SI LAS DOS CAPA_2 SON DISTINTAS, la cache esta probada y la pantalla');
  console.log('SOLO se puede medir contra el 3100.');
})();
