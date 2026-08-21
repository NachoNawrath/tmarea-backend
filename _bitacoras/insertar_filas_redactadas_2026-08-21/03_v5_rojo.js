// EL ROJO DEL [V5], REPRODUCIBLE — «un sitio nuevo se agrega a los DOS lados».
//
// Durante la pieza, el sitio SESION-cobertura-capas-a-c-2026-08-20 estuvo un rato
// puesto en cobertura.sitios y todavia NO en SITIOS_CANON del validador, y el
// validador salio ROJO. Ese rojo no se cita de memoria: se REPRODUCE.
//
// COMO. Se copia el validador a un temporal y se le BORRA la linea del sitio
// nuevo de SITIOS_CANON — nada mas —, y se corre esa copia contra el declarativo
// REAL. Tiene que salir exit 1 con [V5]. Despues, control positivo: el validador
// SIN mutar, contra el mismo fichero, tiene que salir exit 0.
//
// No toca ningun fichero del arbol. Trabaja en un temporal propio y lo borra.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const VALIDADOR = path.join(RAIZ, 'scripts', 'validar_deudas_declaradas.js');
const DECLARATIVO = path.join(RAIZ, 'data', 'deudas', 'deudas_declaradas.json');
const SITIO = 'SESION-cobertura-capas-a-c-2026-08-20';
const LINEA = "  '" + SITIO + "',\n";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v5-rojo-'));
const original = fs.readFileSync(VALIDADOR, 'utf8');

console.log('EL ROJO DEL [V5] — REPRODUCIDO, NO CITADO');
console.log('validador   : scripts/validar_deudas_declaradas.js');
console.log('declarativo : data/deudas/deudas_declaradas.json  (el REAL, sin mutar)');
console.log('temporal    : ' + TMP);
console.log('');

// --- precondicion: la linea tiene que existir, o el control no muta nada ------
const veces = original.split(LINEA).length - 1;
console.log('  ' + (veces === 1 ? 'OK  ' : '!!  ') +
  'la linea del sitio aparece ' + veces + ' vez/veces en el validador (esperado 1). ' +
  'Sin esto la "mutacion" no mutaria y el control probaria nada.');

const mutado = original.split(LINEA).join('');
const RUTA_MUT = path.join(TMP, 'validador_sin_el_sitio.js');
fs.writeFileSync(RUTA_MUT, mutado, { encoding: 'utf8' });
console.log('  OK  la copia mutada es ' + (original.length - mutado.length) + ' bytes mas corta: solo se fue esa linea');
console.log('');

const correr = (script) => {
  const r = spawnSync(process.execPath, [script, '--fichero', DECLARATIVO], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};

// --- LA MORDIDA: sin el sitio en la canon, ROJO por [V5] ---------------------
const rojo = correr(RUTA_MUT);
const porV5 = /\[V5\]/.test(rojo.out);
console.log('MUTADO — el sitio esta en cobertura.sitios y NO en SITIOS_CANON:');
console.log('  exit ' + rojo.code + (porV5 ? '   y el fallo es [V5]' : '   pero NO es [V5]'));
rojo.out.split('\n').filter(l => /^\s*\[/.test(l)).forEach(l => console.log('  ' + l.trim()));
console.log('  ' + (rojo.code === 1 && porV5 ? 'OK  ' : '!!  ') + 'ROJO por [V5], que es lo que tenia que pasar');
console.log('');

// --- CONTROL POSITIVO: sin mutar, VERDE --------------------------------------
const verde = correr(VALIDADOR);
console.log('SIN MUTAR — control positivo:');
console.log('  exit ' + verde.code);
verde.out.split('\n').filter(l => /^VERDE|^ROJO/.test(l)).forEach(l => console.log('  ' + l));
console.log('  ' + (verde.code === 0 ? 'OK  ' : '!!  ') + 'VERDE. El rojo de arriba lo produjo la mutacion y nada mas.');

fs.rmSync(TMP, { recursive: true, force: true });

console.log('');
console.log('LO QUE ESTO PRUEBA, Y LO QUE NO. Prueba que la regla de los dos lados');
console.log('MUERDE: registrar el sitio en el dato y olvidarlo en el control deja el');
console.log('validador en rojo, no en verde silencioso. NO prueba que el sitio sea el');
console.log('correcto para esas cuatro filas — eso es criterio, y lo firmo el owner.');
process.exit(rojo.code === 1 && porV5 && verde.code === 0 ? 0 : 1);
