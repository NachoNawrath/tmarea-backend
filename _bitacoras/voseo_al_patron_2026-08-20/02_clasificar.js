'use strict';
// CLASIFICACION POR ROL. El barrido 01 da el denominador; este parte el corpus
// en los buckets del alcance y enumera SOLO el que se puede tocar.
//
// La regla de particion se declara aca y no se decide fichero por fichero: un
// fichero esta en ROL P si de el sale texto que la app RENDERIZA. Que un hit
// dentro de ROL P sea comentario o nombre de variable no lo decide la maquina;
// lo decide la lectura, y por eso ROL P se enumera entero.
const fs = require('fs');
const path = require('path');
const D = __dirname;
const barrido = JSON.parse(fs.readFileSync(path.join(D, '01_barrido.json'), 'utf8'));

// AFINADA DESPUES DE MEDIR. La primera version metia en ROL P todo backend/src
// y todo data/catalogo, y eso arrastraba 483 ambiguas que eran prosa interna:
// notas de adjudicacion, procedencias y tests. Las exclusiones van ARRIBA y con
// su motivo, porque una regla de particion sin motivo es una decision escondida.
// AFINADA DESPUES DE MEDIR. La primera version metia en ROL P todo backend/src
// y todo data/catalogo, y eso arrastraba prosa interna: notas de adjudicacion,
// procedencias y tests. Las exclusiones van ARRIBA y con su motivo, porque una
// regla de particion sin motivo es una decision escondida.
//
// SIN EXPRESIONES REGULARES A PROPOSITO: el heredoc de esta maquina se come un
// nivel de barra invertida y dejo /^backend/src// como regla, que no es la que
// se escribio. Con predicados de cadena no hay barra que perder.
const emp = (p) => (c) => c.indexOf(p) === 0;
const tiene = (p) => (c) => c.indexOf(p) >= 0;
const REGLAS = [
  { rol: 'D', ok: tiene('__tests__'), que: '__tests__', por: 'un test no se renderiza' },
  { rol: 'D', ok: tiene('PROCEDENCIA.'), que: 'PROCEDENCIA.*', por: 'prosa de procedencia, no texto al patron' },
  { rol: 'D', ok: emp('backend/src/services/data/'), que: 'backend/src/services/data/', por: 'dataset geografico, no frases' },
  { rol: 'D', ok: emp('backend/src/config/'), que: 'backend/src/config/', por: 'configuracion interna' },
  { rol: 'S', ok: (c) => c === 'backend/data/catalogo/estado_drift.json', que: 'estado_drift.json', por: 'instantanea de SITPORT' },
  { rol: 'D', ok: emp('backend/data/catalogo/'), que: 'backend/data/catalogo/', por: 'declarativo interno; sus notas no salen en respuesta' },
  { rol: 'D', ok: emp('backend/data/spec2/'), que: 'backend/data/spec2/', por: 'cifra interna' },
  { rol: 'P', ok: (c) => c === 'backend/data/contacto/reparticiones_publicadas.json', que: 'reparticiones_publicadas.json', por: 'nombres y direcciones que la app muestra' },
  { rol: 'D', ok: emp('backend/data/contacto/'), que: 'backend/data/contacto/', por: 'insumo y correccion interna' },
  { rol: 'P', ok: emp('pwa/src/'), que: 'pwa/src/', por: 'la pwa renderiza todo lo de src/' },
  { rol: 'P', ok: (c) => c === 'pwa/index.html', que: 'pwa/index.html', por: 'cascara de la app' },
  { rol: 'P', ok: emp('backend/src/'), que: 'backend/src/', por: 'el backend arma mensajes que la pwa muestra' },
  { rol: 'P', ok: (c) => c === 'backend/data/decreto/zonas_aviso.json', que: 'zonas_aviso.json', por: 'textos de aviso servidos al cliente' },
  { rol: 'C', ok: (c) => c === 'backend/CONTRATO_MOTOR.md', que: 'CONTRATO_MOTOR.md', por: 'catalogo normativo — fuente unica de mensajes' },
  { rol: 'D', ok: () => true, que: '(resto)', por: 'prosa de trabajo, plan, deudas, scripts' },
];
const rolDe = (clave) => REGLAS.find((r) => r.ok(clave));

// El §10 se marca aparte dentro de ROL C: es lo que se redacta para pegar.
const cm = fs.readFileSync(path.resolve(D, '..', '..', 'CONTRATO_MOTOR.md'), 'utf8').split(/\r?\n/);
let ini = -1, fin = cm.length;
for (let i = 0; i < cm.length; i++) {
  if (ini < 0 && cm[i].indexOf('## 10. CAT') === 0) { ini = i + 1; continue; }
  if (ini > 0 && cm[i].indexOf('## ') === 0) { fin = i; break; }
}
if (ini < 0) throw new Error('no encontre el encabezado del §10');
const en10 = (n) => n >= ini && n <= fin;

const L = [];
const say = (s) => L.push(s === undefined ? '' : s);
const POS = new Set(['tu', 'tus', 'ti', 'contigo', 'tuyo', 'tuya', 'tuyos', 'tuyas']);

for (const h of barrido.hits) {
  h.clave = h.repo + '/' + h.rel;
  const r = rolDe(h.clave);
  h.rol = r.rol;
  h.porRol = r.por;
  if (h.rol === 'C') h.rol = en10(h.linea) ? 'C10' : 'Cresto';
}

say('CLASIFICACION POR ROL — voseo_al_patron_2026-08-20');
say('');
say('REGLA DE PARTICION (declarada, no decidida caso a caso)');
for (const r of REGLAS) say('  ' + r.rol + '  ' + r.que.padEnd(34) + r.por);
say('  C10 = dentro del §10 de CONTRATO_MOTOR.md (lineas ' + (ini + 1) + '-' + fin + ')');
say('');

const ROLES = ['P', 'C10', 'Cresto', 'S', 'D'];
const NOMBRE = {
  P: 'ROL P — TEXTO AL PATRON en codigo nuestro   (SE CORRIGE el voseo)',
  C10: 'ROL C10 — CATALOGO §10                      (NO SE TOCA · se redacta)',
  Cresto: 'ROL C resto — CONTRATO_MOTOR fuera del §10  (NO SE TOCA)',
  S: 'ROL S — instantanea de SITPORT                (NO SE TOCA NUNCA)',
  S: 'ROL S — instantanea de SITPORT             (NO SE TOCA NUNCA)',
  D: 'ROL D — prosa de trabajo / scripts / tests  (FUERA: no es texto al patron)',
};

say('════ CONTEO POR ROL Y REGISTRO ════');
say('unidad: aparicion de forma del vocabulario en una linea de un fichero del corpus');
say('');
say('  rol      voseo-ine  voseo-amb  tuteo-ine  tuteo-amb  no-usted');
for (const rol of ROLES) {
  const h = barrido.hits.filter((x) => x.rol === rol);
  const c = (reg, amb) => h.filter((x) => x.registro === reg && x.ambiguo === amb).reduce((s, x) => s + x.n, 0);
  say('  ' + rol.padEnd(9) +
      String(c('voseo', false)).padStart(6) + String(c('voseo', true)).padStart(11) +
      String(c('tuteo', false)).padStart(11) + String(c('tuteo', true)).padStart(11) +
      String(h.filter((x) => x.registro === 'no_usted_indistinto').reduce((s, x) => s + x.n, 0)).padStart(10));
}
say('');
for (const rol of ['P', 'C10']) {
  const h = barrido.hits.filter((x) => x.rol === rol);
  say('');
  say('════ ' + NOMBRE[rol] + ' ════');
  say('');
  for (const reg of ['voseo', 'tuteo']) {
    const hr = h.filter((x) => x.registro === reg)
      .sort((a, b) => a.clave.localeCompare(b.clave) || a.linea - b.linea);
    say('  ── ' + reg.toUpperCase() + ' en ' + rol + ' : ' +
        hr.reduce((s, x) => s + x.n, 0) + ' apariciones en ' + hr.length + ' lineas ──');
    if (!hr.length) say('     (ninguna)');
    for (const x of hr) {
      say('     [' + (x.ambiguo ? 'AMB' : 'INE') + '] ' + x.forma + '  ·  ' + x.clave + '  L' + x.linea);
      say('           ' + x.texto);
    }
    say('');
  }
  const pos = h.filter((x) => POS.has(x.forma.toLowerCase()));
  say('  ── posesivos de no-usted (tu/tus/ti/tuyo...) en ' + rol + ' : ' +
      pos.reduce((s, x) => s + x.n, 0) + ' apariciones en ' + pos.length + ' lineas ──');
  say('     (no deciden tuteo vs voseo; prueban que no es usted)');
  for (const x of pos) {
    say('     ' + x.forma + '  ·  ' + x.clave + '  L' + x.linea);
    say('           ' + x.texto);
  }
  say('');
}

fs.writeFileSync(path.join(D, '02_clasificacion.json'), JSON.stringify(barrido.hits, null, 1), 'utf8');
fs.writeFileSync(path.join(D, '02_clasificacion.txt'), L.join('\n') + '\n', 'utf8');
console.log(L.join('\n'));
