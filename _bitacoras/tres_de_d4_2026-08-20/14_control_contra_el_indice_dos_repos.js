'use strict';
// CONTROL CONTRA EL INDICE — esta vez en LOS DOS REPOS, porque la correccion del
// rotulo vive en los dos y una verificacion que mire uno solo daria verde sobre
// media cadena.
//
// Toda cifra que vaya al mensaje de commit sale de `git show :ruta`, no del
// disco. Regla que costo `2d47022`.

const { execFileSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const BACK = path.join(__dirname, '..', '..');
const PWA = 'C:/Users/katia/tmarea-pwa';
const g = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

let fallos = 0;
const chk = (rot, ok, det) => { if (!ok) fallos++; console.log('  ' + (ok ? 'OK  ' : '!!  ') + rot + (det ? '  ->  ' + det : '')); };

console.log('CONTROL CONTRA EL INDICE — LOS DOS REPOS');
console.log('Corrida: ' + new Date().toISOString());
console.log('');

// ── LA CADENA, EN LOS DOS SITIOS, LEIDA DEL INDICE ───────────────────────────
console.log('1 · LA CADENA CORREGIDA, EN LOS DOS SITIOS');
const evaluador = g(BACK, 'show', ':src/services/route-restriction-evaluator.js');
const verdict = g(PWA, 'show', ':src/components/verification/VoyageVerdict.jsx');

const NUEVA = 'Restricción de tránsito en tu ruta (';
const VIEJA = 'Restricción de tránsito en zona intermedia (';

chk('backend: la cadena NUEVA esta en el indice', evaluador.includes(NUEVA));
chk('backend: la cadena VIEJA ya NO esta en el indice', !evaluador.includes(VIEJA));
chk('PWA: la cadena NUEVA esta en el indice', verdict.includes(NUEVA));
chk('PWA: la cadena VIEJA ya NO esta en el indice', !verdict.includes(VIEJA));
chk('CONTROL POSITIVO backend: el fichero es el que creemos (tiene evaluarRuta)', evaluador.includes('async function evaluarRuta'));
chk('CONTROL POSITIVO PWA: el fichero es el que creemos (tiene VoyageVerdict)', verdict.includes('export default function VoyageVerdict'));
chk('CONTROL NEGATIVO: "ZZQX" no esta en ninguno', !evaluador.includes('ZZQX') && !verdict.includes('ZZQX'));
// INDICE == ARBOL DE TRABAJO, PERO **NO** POR SHA DE BYTES.
//
// DEFECTO DE INSTRUMENTO PROPIO, CAZADO POR ESTE MISMO CONTROL Y DECLARADO: la
// primera version comparaba sha256(`git show :ruta`) contra sha256(fichero en
// disco) y dio ROJO sobre un arbol que estaba bien. La causa: `core.autocrlf`
// es TRUE en los dos repos, asi que el blob del indice guarda LF y el fichero
// del disco puede tener CRLF. Sobre este fichero son 92 bytes de diferencia
// sobre EL MISMO contenido, y `git diff` del working tree sale vacio.
// El instrumento corria perfecto y comparaba otra cosa: el noveno de la serie.
//
// EL CONTROL BUENO es `git diff --quiet -- ruta`, que compara indice contra
// arbol de trabajo con la normalizacion de finales de linea que el propio git
// aplica, en vez de re-implementarla mal.
//
// AVISO SOBRE `08_control_contra_el_indice.txt`, que ya esta commiteado en
// `ec25dae`: usa la comparacion por sha y dio IDENTICOS en sus tres ficheros.
// El RESULTADO era correcto, pero POR CASUALIDAD — esos tres estaban en LF en
// disco. No se puede reusar tal cual; se reusa este.
const limpio = (cwd, ruta) => {
  try { g(cwd, 'diff', '--quiet', '--', ruta); return true; } catch (e) { return false; }
};
const finales = (p) => (fs.readFileSync(p, 'utf8').includes('\r\n') ? 'CRLF' : 'LF');
console.log('  backend  indice sha256 ' + sha(evaluador) + '   (blob: siempre LF)');
console.log('  backend  disco  finales de linea: ' + finales(path.join(BACK, 'src/services/route-restriction-evaluator.js')));
chk('backend: indice == arbol de trabajo (git diff --quiet)', limpio(BACK, 'src/services/route-restriction-evaluator.js'));
console.log('  PWA      indice sha256 ' + sha(verdict));
console.log('  PWA      disco  finales de linea: ' + finales(PWA + '/src/components/verification/VoyageVerdict.jsx'));
chk('PWA: indice == arbol de trabajo (git diff --quiet)', limpio(PWA, 'src/components/verification/VoyageVerdict.jsx'));
chk('CONTROL POSITIVO DEL PROPIO CONTROL: un fichero modificado y sin stagear tiene que dar FALSO',
  !limpio(BACK, 'data/catalogo/estado_drift.json'), 'estado_drift.json esta ` M`: si diera OK, este control no mordería');

// Y que en TODO el arbol de los dos repos no quede la frase vieja en codigo vivo.
console.log('');
console.log('  barrido del arbol vivo (src/ de los dos repos), desde el disco:');
const barrer = (dir) => {
  const out = [];
  const rec = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '__tests__') continue;
      const full = path.join(p, e.name);
      if (e.isDirectory()) rec(full);
      else if (/\.(js|jsx)$/.test(e.name) && fs.readFileSync(full, 'utf8').includes(VIEJA)) out.push(full);
    }
  };
  rec(dir);
  return out;
};
const restos = [...barrer(path.join(BACK, 'src')), ...barrer(PWA + '/src')];
chk('la frase vieja no queda en ningun .js/.jsx vivo de los dos repos', restos.length === 0,
  restos.length ? restos.join(' | ') : '0 restos');

// ── LA CIFRA ─────────────────────────────────────────────────────────────────
console.log('');
console.log('2 · LA CIFRA, DESDE EL INDICE');
const cifra = JSON.parse(g(BACK, 'show', ':data/spec2/cifra_spec2.json'));
const f = cifra.denominador_fino;
console.log('  ' + f.cumple + ' de ' + f.vigente + ', con ' + f.anuladas + ' anuladas por decision del owner');
chk('cumple + no_cumple == vigente', f.cumple + f.no_cumple === f.vigente, `${f.cumple}+${f.no_cumple}=${f.vigente}`);
chk('vigente + anuladas == original', f.vigente + f.anuladas === f.original, `${f.vigente}+${f.anuladas}=${f.original}`);
chk('las 2 anuladas estan nombradas', cifra.anuladas.length === 2 &&
  cifra.anuladas.map(a => a.afirmacion).join(',') === 'S2(c),S5(b)', cifra.anuladas.map(a => a.afirmacion).join(','));
chk('la politica prohibe la forma pelada', cifra.politica_de_publicacion.forma_prohibida === '4 de 15');
chk('la vista por punto lleva su nota de DEROGACION', /DEROGACION/i.test(cifra.denominador_por_punto.nota_obligatoria));
const pkg = JSON.parse(g(BACK, 'show', ':package.json'));
chk('npm run cifra existe en el indice', !!pkg.scripts.cifra, pkg.scripts.cifra || '-');
chk('npm run cifra:mordida existe en el indice', !!pkg.scripts['cifra:mordida'], pkg.scripts['cifra:mordida'] || '-');

// ── EL DECLARATIVO ───────────────────────────────────────────────────────────
console.log('');
console.log('3 · EL DECLARATIVO, DESDE EL INDICE');
const d = JSON.parse(g(BACK, 'show', ':data/deudas/deudas_declaradas.json'));
const filas = d.deudas.length;
const unicas = d.deudas.filter(x => !x.duplicada_de).length;
const vivas = d.deudas.filter(x => x.estado === 'viva' && !x.duplicada_de).length;
const sitios = d.cobertura.sitios.length;
const barridos = d.cobertura.sitios.filter(x => x.barrido).length;
const suma = d.cobertura.sitios.reduce((a, s) => a + (s.filas_en_este_declarativo || 0), 0);
console.log(`  filas ${filas} · unicas ${unicas} · vivas ${vivas} · sitios ${sitios} · barridos ${barridos} · sin barrer ${sitios - barridos}`);
chk('suma de filas_en_este_declarativo == filas', suma === filas, `${suma} vs ${filas}`);
for (const id of ['D4D5::motivo-principal-muere-en-el-pasamanos',
                  'D4D5::spec2-sin-punto-de-veracidad',
                  'D4D5::la-cifra-tiene-emisor-pero-no-tiene-guardia']) {
  chk('fila presente: ' + id, d.deudas.some(x => x.id === id));
}
chk('la cifra apunta a una fila que EXISTE',
  d.deudas.some(x => x.id === 'D4D5::spec2-sin-punto-de-veracidad') &&
  cifra.advertencia_sobre_el_hueco.includes('D4D5::spec2-sin-punto-de-veracidad'));

// ── EL PLAN ──────────────────────────────────────────────────────────────────
console.log('');
console.log('4 · EL PLAN, DESDE EL INDICE');
const plan = g(BACK, 'show', ':PLAN_JURISDICCION.md');
chk('S5 lleva el tachado de "una sola vez"', plan.includes('~~una sola vez~~'));
chk('S5 trae la regla nueva', plan.includes('un hecho puede aparecer en más de\nun bloque si sirve a más de una decisión'));
chk('S5 dice que S5(b) queda ANULADA', plan.includes('**S5(b) queda ANULADA**'));
chk('la cifra esta en su forma legal', plan.includes('**4 de 15, con 2 anuladas por decisión del owner.**'));
chk('la forma pelada esta declarada prohibida', plan.includes('«4 de 15» a secas está prohibido'));
chk('la vista por punto lleva su nota', plan.includes('llegaron a CUMPLE por DEROGACIÓN, no por trabajo'));
chk('el PLAN apunta al dato como autoridad', plan.includes('data/spec2/cifra_spec2.json'));
chk('CONTROL NEGATIVO: "4 de 16" ya no esta', !plan.includes('4 de 16'));
chk('CONTROL POSITIVO: "INV-3.6" sigue', plan.split('INV-3.6').length - 1 > 0, (plan.split('INV-3.6').length - 1) + ' apariciones');

// ── LO QUE NO ENTRA ──────────────────────────────────────────────────────────
console.log('');
console.log('5 · LO QUE NO ENTRA AL INDICE');
const stBack = g(BACK, 'diff', '--cached', '--name-only').split('\n').filter(Boolean);
const stPwa = g(PWA, 'diff', '--cached', '--name-only').split('\n').filter(Boolean);
console.log('  backend stageado: ' + stBack.length + ' · PWA stageado: ' + stPwa.length);
chk('.claude/launch.json fuera', !stBack.includes('.claude/launch.json'));
chk('data/catalogo/estado_drift.json fuera', !stBack.includes('data/catalogo/estado_drift.json'));
chk('CONTRATO_MOTOR.md fuera', !stBack.includes('CONTRATO_MOTOR.md'));
// En la PWA entran EXACTAMENTE dos ficheros y ninguno mas: VoyageVerdict por la
// correccion de «zona intermedia» y TransitRestrictionsBlock por la de
// «transitar». La asercion era de UN fichero hasta que llego la segunda
// correccion; se actualiza con la lista completa y no con un `>= 1`, porque un
// control que solo mira el minimo deja pasar el fichero de mas.
const PWA_ESPERADOS = [
  'src/components/verification/TransitRestrictionsBlock.jsx',
  'src/components/verification/VoyageVerdict.jsx',
].sort();
chk('en la PWA entran exactamente los dos ficheros esperados',
  JSON.stringify([...stPwa].sort()) === JSON.stringify(PWA_ESPERADOS), stPwa.join(', '));

console.log('');
// (el veredicto se imprime al final del anexo)


// ── ANEXO · LA SEGUNDA CORRECCION DE LENGUAJE, DESDE EL INDICE ──────────────
// (Se agrega abajo y no arriba para no re-numerar los bloques ya publicados.)
console.log('');
console.log('6 · «transitar» -> «navegar», DESDE EL INDICE');
const bloque = g(PWA, 'show', ':src/components/verification/TransitRestrictionsBlock.jsx');
const cotejo = g(BACK, 'show', ':src/services/raster/cotejo-vertical.js');
chk('PWA: "NO puede navegar en esta zona" esta', bloque.includes('NO puede navegar en esta zona'));
chk('PWA: "NO puede transitar" ya NO esta', !bloque.includes('NO puede transitar'));
chk('PWA: "precaución al navegar" esta', bloque.includes('precaución al navegar'));
chk('PWA: "precaución al transitar" ya NO esta', !bloque.includes('precaución al transitar'));
chk('backend: "antes de navegar" esta', cotejo.includes('antes de navegar'));
chk('backend: "antes de transitar" ya NO esta', !cotejo.includes('antes de transitar'));
// ESTAS DOS ASERCIONES CAMBIARON, y se reescriben en vez de borrarse.
// Cuando se escribieron, la recomendacion del agente era MANTENER el titulo del
// bloque y las tres cadenas con el sustantivo, y afirmaban eso. El owner
// decidio despues: el TITULO pasa a «Restricciones durante la navegación» y
// «afecta tu tránsito» pasa a «tu navegación». Las dos aserciones viejas
// quedaron ROJAS sobre un arbol correcto — que es lo que tienen que hacer las
// aserciones cuando la decision se mueve, y por eso el hecho se anota.
// Lo que se comprueba ahora es la decision VIGENTE. El detalle esta en el
// bloque 7.
chk('el titulo del bloque YA NO dice «en tránsito» (owner lo cambio)',
  !bloque.includes('>Restricciones en tránsito<'));
chk('SE QUEDAN los DOS sustantivos del cuerpo — los que no llevan posesivo',
  bloque.includes('Restricción activa en zona de tránsito') &&
  bloque.includes('Restricción activa en tránsito'));
chk('PWA: indice == arbol de trabajo', limpio(PWA, 'src/components/verification/TransitRestrictionsBlock.jsx'));
chk('backend: indice == arbol de trabajo', limpio(BACK, 'src/services/raster/cotejo-vertical.js'));
const dd = JSON.parse(g(BACK, 'show', ':data/deudas/deudas_declaradas.json'));
chk('fila del contrato §10 presente', dd.deudas.some(x => x.id === 'D4D5::contrato-10-dice-transitar'));
const h = dd.deudas.find(x => x.id === 'D4D5::spec2-sin-punto-de-veracidad');
chk('el hueco de §2 lleva LOS DOS casos', !!(h && h.evidencia_en_el_arbol.SEGUNDO_CASO_EL_MISMO_DIA));
const pp = dd.deudas.find(x => x.id === 'D4D5::motivo-principal-muere-en-el-pasamanos');
chk('el pasamanos va por la CUARTA instancia', !!(pp && pp.evidencia_en_el_arbol.CUARTA_INSTANCIA_2026_08_20));
chk('CONTRATO_MOTOR.md sigue SIN tocar (dice transitar)',
  g(BACK, 'show', ':CONTRATO_MOTOR.md').includes('Tu embarcación NO puede transitar por [zona].'));
// ── ANEXO 2 · EL ROTULO DE LA SECCION, DESDE EL INDICE ─────────────────────
console.log('');
console.log('7 · EL ROTULO DE LA SECCION, DESDE EL INDICE');
const bloque2 = g(PWA, 'show', ':src/components/verification/TransitRestrictionsBlock.jsx');
chk('el rotulo NUEVO esta', bloque2.includes('>Restricciones durante la navegación<'));
chk('el rotulo VIEJO ya NO esta', !bloque2.includes('>Restricciones en tránsito<'));
chk('la borderline resuelta: "afecta tu navegación"', bloque2.includes('afecta tu navegación'));
chk('"afecta tu tránsito" ya NO esta', !bloque2.includes('afecta tu tránsito'));
chk('SE QUEDAN los dos sustantivos del cuerpo del bloque',
  bloque2.includes('Restricción activa en zona de tránsito') &&
  bloque2.includes('Restricción activa en tránsito'));
chk('NO se renombro el componente (sigue TransitRestrictionsBlock)',
  bloque2.includes('export default function TransitRestrictionsBlock'));
chk('NO se renombro la clave de la API (sigue restricciones_intermedias)',
  bloque2.includes('restricciones_intermedias'));
chk('el rotulo vive en UN solo sitio del arbol vivo de los dos repos',
  (bloque2.split('Restricciones durante la navegación').length - 1) === 1);
const dd2 = JSON.parse(g(BACK, 'show', ':data/deudas/deudas_declaradas.json'));
const pp2 = dd2.deudas.find(x => x.id === 'D4D5::motivo-principal-muere-en-el-pasamanos');
chk('la fila del pasamanos dice que la cuarta es una ADVERTENCIA DE SEGURIDAD',
  /ADVERTENCIA DE SEGURIDAD QUE NUNCA LLEGO AL PATRON/.test(pp2.evidencia_en_el_arbol.CUARTA_INSTANCIA_2026_08_20));
const cc2 = dd2.deudas.find(x => x.id === 'D4D5::contrato-10-dice-transitar');
chk('la fila del contrato lleva el descarte de los dos argumentos del agente',
  !!cc2.evidencia_en_el_arbol.EL_ROTULO_DE_LA_SECCION_SE_CAMBIO);

console.log('');
console.log(fallos === 0 ? 'VERDE (con los dos anexos) — los dos repos.' : 'ROJO — ' + fallos + ' fallo(s).');
process.exit(fallos === 0 ? 0 : 1);
