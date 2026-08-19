// ─────────────────────────────────────────────────────────────────────────────
// (a1) · PIEZA 4 · LA RE-DERIVACION
//
// Corre en cinco tiempos y NO llega al cuarto si los tres primeros no salen
// verdes. Los dos cambios que entran al artefacto son INDEPENDIENTES y se miden
// por separado, porque mezclarlos haria imposible atribuir cualquier diferencia:
//
//   (A) CONTROL DE REGRESION — el `f1_generar.js` de HEAD (a3f183b), sacado de
//       git, con el `nodos.json` del 2026-08-17, tiene que seguir reproduciendo
//       `4f9fbdc3…` 688/688 y la hoja byte por byte. Es el mismo control que
//       salio verde en 01_, mudado a la version que git conserva: acá el fichero
//       del arbol YA tiene el renombre de H-3 y no sirve de control de si mismo.
//
//   (B) MORDIDA DE H-3 — al fichero NUEVO se le REVIERTEN los dos tokens del
//       renombre. Con esa sola reversion tiene que reproducir `4f9fbdc3…` byte
//       por byte. Si reprodujera algo distinto, H-3 no esta localizado en esos
//       dos tokens y hay algo mas movido.
//
//   (C) EL EFECTO AISLADO DE H-3 — el generador NUEVO con el insumo VIEJO. Lo
//       unico que puede cambiar es el nombre del estado en 198 filas, la clave
//       del `resumen` y la del `vocabulario_estado`. Ni un `bahia_id`.
//
//   (D) LA RE-DERIVACION DE VERDAD — generador nuevo + volcado nuevo de la base.
//
//   (E) QUE SE MOVIO, con las dos unidades separadas: CIERRES y FILAS.
//
// EL INSUMO. `insumos/nodos.json` es el espejo de la base, y 01_ lo probo byte
// por byte ANTES de tocar nada. La base se movio, asi que el espejo se mueve con
// ella: este instrumento lo REESCRIBE con el volcado de hoy. No es re-etiquetar
// evidencia — es que un espejo viejo al lado de un generador vivo es una trampa:
// el primero que vuelva a correr `f1_generar.js` regeneraria el artefacto de
// antes y desharia la correccion sin que nadie mire.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
require('dotenv').config();
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');
const { Pool } = require('pg');

const BACK = 'C:/Users/katia/tmarea-backend';
const INS = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/insumos');
const SALIDA = path.join(__dirname, '04_rederivar.txt');
const TRABAJO = 'C:/Users/katia/AppData/Local/Temp/claude/C--Users-katia--claude/eb00a149-9bcc-40c1-801f-ee1beac03382/scratchpad/a1_04';

const RUTA_JOIN = path.join(BACK, 'data/catalogo/join_puerto_bahia.json');
const RUTA_TSV = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv');
const RUTA_NODOS = path.join(INS, 'nodos.json');
const SHA_JOIN_VIEJO = '4f9fbdc33e290a4cc2ef4dda3e98918eb3bb22466a0fbe07f0170670becddaf6';
const SHA_TSV_VIEJO = '0ca33c18e48229eba257573ff662cfb2f770e62b24d53354aae220c8d72a1788';
const SHA_NODOS_VIEJO = '316107f39d86274aa2f07bbfa54de12b0a260bb8857430ad7c33e6fa1ae06d5d';
const COMMIT = 'a3f183b';
const IDS = [653, 654, 655, 656, 657, 658, 659, 660, 661, 662, 663];

// los dos tokens de H-3, para poder morderlos
const H3 = [
  ["const VOCABULARIO = ['anclado_por_el_nodo',", "const VOCABULARIO = ['confirmado_declarado',"],
  ["estado: 'anclado_por_el_nodo', via: 'bahia_sitport_id',", "estado: 'confirmado_declarado', via: 'bahia_sitport_id',"],
];

const L = [];
const say = m => { L.push(m); console.log(m); };
const fallas = [];
const exigir = (n, cond, det) => {
  if (cond) say('  ok ' + n + (det ? ' · ' + det : ''));
  else { fallas.push(n); say('  x ROJO EXIGIDO Y NO SALIO · ' + n + (det ? ' · ' + det : '')); }
};
const sha256buf = b => crypto.createHash('sha256').update(b).digest('hex');
const sha256 = f => sha256buf(fs.readFileSync(f));
const g = c => execSync(c, { cwd: BACK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
// EL ARTEFACTO NO SE PUEDE COMPARAR BYTE A BYTE Y ESO NO ES UNA CONCESION: lleva
// `generado_en: new Date().toISOString()` adentro, asi que dos corridas del MISMO
// instrumento sobre el MISMO insumo dan ficheros distintos. Se compara todo lo
// demas —las 688 filas una por una, el resumen, los parametros, los insumos y el
// vocabulario—, que es lo que el sha pretendia cubrir. La hoja TSV no lleva
// timestamp y esa si se compara byte a byte, y queda como control cruzado.
const sinFecha = o => { const c = JSON.parse(JSON.stringify(o)); delete c.generado_en; return JSON.stringify(c); };
const igualAlViejo = (ruta, viejo) => {
  const j = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  if (j.filas.length !== viejo.filas.length) return { filas: 0, total: viejo.filas.length, claves: ['filas.length'], det: 'trae ' + j.filas.length + ' filas' };
  let ig = 0;
  for (let i = 0; i < viejo.filas.length; i++) if (JSON.stringify(viejo.filas[i]) === JSON.stringify(j.filas[i])) ig++;
  // que claves de PRIMER NIVEL difieren, nombradas. `generado_en` no cuenta: es un
  // timestamp y cambia siempre. `filas` se reporta aparte, fila por fila.
  const claves = [];
  for (const k of new Set([...Object.keys(viejo), ...Object.keys(j)])) {
    if (k === 'generado_en' || k === 'filas') continue;
    if (JSON.stringify(viejo[k]) !== JSON.stringify(j[k])) claves.push(k);
  }
  return { filas: ig, total: viejo.filas.length, claves,
    det: ig + '/' + viejo.filas.length + ' filas' + (claves.length ? ' · claves distintas: ' + claves.join(', ') : ' · el resto del artefacto, identico') };
};

const cerrar = async (pool) => {
  if (pool) await pool.end().catch(() => {});
  fs.writeFileSync(SALIDA, L.join('\n') + '\n', { encoding: 'utf8' });
  console.log('\n[evidencia] ' + SALIDA + ' · ' + fs.statSync(SALIDA).size + ' bytes');
  process.exit(fallas.length ? 2 : 0);
};

// arma una copia del generador con la salida redirigida al scratchpad y `AQUI`
// apuntado a un directorio de insumo elegido.
function copiar(fuente, destino, dirInsumo, extra) {
  const REDIR = [
    ["const BACK = 'C:/Users/katia/tmarea-backend', AQUI = __dirname;",
      "const BACK = 'C:/Users/katia/tmarea-backend', AQUI = '" + dirInsumo.replace(/\\/g, '/') + "';"],
    ["const rutaArt = path.join(BACK, 'data/catalogo/join_puerto_bahia.json');",
      "const rutaArt = path.join(process.env.A1_SALIDA, 'join.json');"],
    ["const rutaHoja = path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv');",
      "const rutaHoja = path.join(process.env.A1_SALIDA, 'adj.tsv');"],
  ];
  let t = fuente;
  for (const [a, b] of REDIR.concat(extra || [])) {
    const n = t.split(a).length - 1;
    if (n !== 1) { exigir('ancla unica al armar ' + path.basename(destino), false, 'aparece ' + n + ' veces: ' + a.slice(0, 55)); return null; }
    t = t.replace(a, b);
  }
  fs.writeFileSync(destino, t, 'utf8');
  return t;
}
function correr(script, dir) {
  fs.mkdirSync(dir, { recursive: true });
  return spawnSync(process.execPath, [script], {
    cwd: BACK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: Object.assign({}, process.env, { A1_SALIDA: dir }),
  });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'mapa_navegacion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

(async () => {
  fs.mkdirSync(TRABAJO, { recursive: true });
  say('='.repeat(80));
  say('(a1) · PIEZA 4 · RE-DERIVACION');
  say('corrida ' + new Date().toISOString());
  say('='.repeat(80));

  // ── 0 · ESTADO DE PARTIDA ────────────────────────────────────────────────
  say('\n0 · ESTADO DE PARTIDA');
  exigir('HEAD sigue en ' + COMMIT, g('git rev-parse HEAD').startsWith(COMMIT), g('git rev-parse HEAD'));
  exigir('el artefacto de partida es 4f9fbdc3...', sha256(RUTA_JOIN) === SHA_JOIN_VIEJO, sha256(RUTA_JOIN));
  exigir('la hoja de partida es 0ca33c18...', sha256(RUTA_TSV) === SHA_TSV_VIEJO, sha256(RUTA_TSV));
  exigir('el insumo de partida es el del 2026-08-17', sha256(RUTA_NODOS) === SHA_NODOS_VIEJO, sha256(RUTA_NODOS).slice(0, 12) + '...');
  const A = JSON.parse(fs.readFileSync(RUTA_JOIN, 'utf8'));
  const SRC_NUEVO = fs.readFileSync(path.join(INS, 'f1_generar.js'), 'utf8');
  if (fallas.length) { say('\nESTADO DE PARTIDA NO VERIFICADO — no se corre nada.'); await cerrar(pool); }

  // ── A · CONTROL DE REGRESION, contra la version que git conserva ─────────
  say('\nA · CONTROL DE REGRESION — f1_generar.js de ' + COMMIT + ' reproduce 4f9fbdc3...');
  {
    const blob = g('git rev-parse ' + COMMIT + ':_bitacoras/filtro_puerto_2026-08-17/insumos/f1_generar.js');
    say('    blob del generador en ' + COMMIT + ': ' + blob);
    const SRC_VIEJO = g('git show ' + COMMIT + ':_bitacoras/filtro_puerto_2026-08-17/insumos/f1_generar.js');
    exigir('el generador de git NO tiene el renombre de H-3',
      SRC_VIEJO.includes("const VOCABULARIO = ['confirmado_declarado',") && !SRC_VIEJO.includes('anclado_por_el_nodo'),
      'dice confirmado_declarado');
    const dst = path.join(TRABAJO, 'A_viejo.js');
    if (copiar(SRC_VIEJO, dst, INS)) {
      const dir = path.join(TRABAJO, 'A');
      const r = correr(dst, dir);
      if (r.status !== 0) exigir('la corrida de A sale 0', false, 'status ' + r.status + ' · ' + String(r.stderr).slice(0, 200));
      else {
        const cmp = igualAlViejo(path.join(dir, 'join.json'), A);
        exigir('A-1 · reproduce el artefacto vigente fila por fila y campo por campo',
          cmp.filas === cmp.total && cmp.claves.length === 0, cmp.det);
        exigir('A-2 · reproduce la hoja byte por byte', sha256(path.join(dir, 'adj.tsv')) === SHA_TSV_VIEJO, sha256(path.join(dir, 'adj.tsv')));
      }
    }
  }
  if (fallas.length) { say('\nEL CONTROL DE REGRESION NO SALIO VERDE — no se re-deriva nada.'); await cerrar(pool); }

  // ── B · MORDIDA DE H-3 ──────────────────────────────────────────────────
  say('\nB · MORDIDA — al generador nuevo se le revierten los DOS tokens de H-3');
  {
    exigir('el generador del arbol SI tiene el renombre',
      H3.every(([a]) => SRC_NUEVO.split(a).length - 1 === 1), 'los dos tokens estan, una vez cada uno');
    const dst = path.join(TRABAJO, 'B_mordido.js');
    if (copiar(SRC_NUEVO, dst, INS, H3)) {
      const dir = path.join(TRABAJO, 'B');
      const r = correr(dst, dir);
      if (r.status !== 0) exigir('la corrida de B sale 0', false, 'status ' + r.status + ' · ' + String(r.stderr).slice(0, 200));
      else {
        const cmp = igualAlViejo(path.join(dir, 'join.json'), A);
        // LA MORDIDA REVIERTE DOS TOKENS Y NO EL TEXTO DEL `vocabulario_estado`, que es
        // el tercer sitio de H-3. Asi que lo que se exige NO es identidad: es que la
        // UNICA diferencia sea esa clave, nombrada, y ninguna otra. Un control que
        // pidiera identidad seria rojo por construccion y no mediria nada.
        exigir('B-1a · con H-3 revertido reproduce las 688 filas una por una', cmp.filas === cmp.total, cmp.filas + '/' + cmp.total);
        exigir('B-1b · y lo UNICO que queda distinto es vocabulario_estado',
          cmp.claves.length === 1 && cmp.claves[0] === 'vocabulario_estado',
          cmp.claves.length ? 'claves distintas: ' + cmp.claves.join(', ') : 'ninguna clave distinta');
        say('        LO QUE PRUEBA: H-3 vive en TRES sitios del generador —los dos tokens del');
        say('        estado y el texto del vocabulario— y en ninguno mas. Revertidos los dos');
        say('        primeros, las 688 filas vuelven exactas y la unica clave que queda movida');
        say('        es la tercera. Si el renombre hubiera tocado cualquier otra cosa,');
        say('        apareceria en esa lista de claves con nombre propio.');
        exigir('B-2 · y reproduce la hoja byte por byte', sha256(path.join(dir, 'adj.tsv')) === SHA_TSV_VIEJO, sha256(path.join(dir, 'adj.tsv')));
      }
    }
  }
  if (fallas.length) { say('\nLA MORDIDA NO MORDIO COMO DEBE — no se re-deriva nada.'); await cerrar(pool); }

  // ── C · EL EFECTO AISLADO DE H-3 ────────────────────────────────────────
  say('\nC · EFECTO AISLADO DE H-3 — generador nuevo con el insumo VIEJO');
  {
    const dst = path.join(TRABAJO, 'C_h3.js');
    if (copiar(SRC_NUEVO, dst, INS)) {
      const dir = path.join(TRABAJO, 'C');
      const r = correr(dst, dir);
      if (r.status !== 0) exigir('la corrida de C sale 0', false, 'status ' + r.status);
      else {
        const Cj = JSON.parse(fs.readFileSync(path.join(dir, 'join.json'), 'utf8'));
        let soloEstado = 0, otros = 0, sinCambio = 0;
        for (let i = 0; i < A.filas.length; i++) {
          const a = A.filas[i], c = Cj.filas[i];
          if (JSON.stringify(a) === JSON.stringify(c)) { sinCambio++; continue; }
          const a2 = Object.assign({}, a, { estado: c.estado });
          if (JSON.stringify(a2) === JSON.stringify(c) && a.estado === 'confirmado_declarado' && c.estado === 'anclado_por_el_nodo') soloEstado++;
          else { otros++; if (otros <= 5) say('    x fila ' + a.nodo_id + ' cambio algo mas que el nombre del estado'); }
        }
        exigir('C-1 · 198 filas cambian SOLO el nombre del estado', soloEstado === 198, soloEstado + ' filas');
        exigir('C-2 · las otras 490 no cambian nada', sinCambio === 490, sinCambio + ' filas');
        exigir('C-3 · ninguna fila cambia otra cosa', otros === 0, otros + ' filas');
        exigir('C-4 · ningun bahia_id se mueve por H-3',
          A.filas.every((a, i) => a.bahia_id === Cj.filas[i].bahia_id), 'los 688 iguales');
        say('    resumen viejo : ' + JSON.stringify(A.resumen));
        say('    resumen con H-3: ' + JSON.stringify(Cj.resumen));
        say('    H-3 NO MUEVE NI UNA ATRIBUCION. Cambia un nombre, y eso es todo lo que tiene');
        say('    que cambiar. Lo que cambia de verdad es la correccion de la base, abajo.');
      }
    }
  }
  if (fallas.length) { say('\nH-3 NO ESTA AISLADO — no se re-deriva nada.'); await cerrar(pool); }

  // ── D · EL VOLCADO NUEVO Y LA RE-DERIVACION ─────────────────────────────
  say('\nD · EL VOLCADO NUEVO — insumos/nodos.json se rehace desde la base corregida');
  const q = await pool.query(`SELECT id, nombre, tipo, fuente,
      coalesce(region,'') AS region, coalesce(provincia,'') AS provincia, coalesce(comuna,'') AS comuna,
      bahia_sitport_id, ST_Y(geom)::float8 AS lat, ST_X(geom)::float8 AS lng
    FROM nodos_maritimos WHERE fuente <> 'SITPORT' ORDER BY id`);
  const nuevas = q.rows.map(r => ({
    id: r.id, nombre: r.nombre, tipo: r.tipo, fuente: r.fuente, region: r.region,
    provincia: r.provincia, comuna: r.comuna, bahia_sitport_id: r.bahia_sitport_id, lat: r.lat, lng: r.lng,
  }));
  // misma serializacion que el insumo viejo, incluido el CRLF final
  const volcado = '[' + nuevas.map(f => JSON.stringify(f)).join(', ') + ']\r\n';
  exigir('el volcado trae 693 filas', nuevas.length === 693, nuevas.length);
  {
    const viejas = JSON.parse(fs.readFileSync(RUTA_NODOS, 'utf8'));
    const MV = new Map(viejas.map(r => [r.id, r]));
    const cambian = [];
    for (const n of nuevas) {
      const v = MV.get(n.id);
      if (!v || JSON.stringify(v) !== JSON.stringify(n)) cambian.push(n.id);
    }
    exigir('CONTROL NEGATIVO · en el insumo cambian EXACTAMENTE las 11 filas de (a1)',
      cambian.length === 11 && cambian.join(',') === IDS.join(','), cambian.length + ' filas: ' + cambian.join(','));
    say('    las otras 682 filas del insumo quedan identicas campo por campo');
  }
  fs.writeFileSync(RUTA_NODOS, volcado, { encoding: 'utf8' });
  say('    insumos/nodos.json reescrito · sha256 ' + sha256(RUTA_NODOS));
  say('      era ' + SHA_NODOS_VIEJO);

  say('\n  LA RE-DERIVACION — sobre las rutas reales');
  {
    const r = spawnSync(process.execPath, [path.join(INS, 'f1_generar.js')], { cwd: BACK, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) { exigir('la re-derivacion sale 0', false, 'status ' + r.status + ' · ' + String(r.stderr).slice(0, 300)); await cerrar(pool); }
    for (const l of String(r.stdout).split('\n').filter(Boolean)) say('    ' + l);
  }
  const B = JSON.parse(fs.readFileSync(RUTA_JOIN, 'utf8'));
  const SHA_JOIN_NUEVO = sha256(RUTA_JOIN), SHA_TSV_NUEVO = sha256(RUTA_TSV);

  // ── E · QUE SE MOVIO ────────────────────────────────────────────────────
  say('\nE · QUE SE MOVIO — contra el artefacto viejo, fila por fila');
  const MA = new Map(A.filas.map(r => [r.nodo_id, r])), MB = new Map(B.filas.map(r => [r.nodo_id, r]));
  exigir('siguen siendo 688 nombres', B.filas.length === 688 && MB.size === 688, B.filas.length);
  // CUATRO CAJONES EXCLUYENTES, y ninguno es "el resto". El tercero aparecio
  // corriendo: la primera version de este control exigia que cambiaran once filas
  // y cambiaron 78. Las otras 67 son `prioridad` — el numero de orden de la hoja
  // de trabajo—, que se RENUMERA porque `a_adjudicar` pasa de 74 a 76 y una de las
  // dos entrantes se cuela en el puesto 8. No es una atribucion movida: es un
  // ordinal. Se separa y se cuenta aparte en vez de esconderlo en "cambiaron 78".
  {
    const sinCambio = [], soloRenombre = [], soloPrioridad = [], real = [];
    const conRenombre = a => Object.assign({}, a, { estado: a.estado === 'confirmado_declarado' ? 'anclado_por_el_nodo' : a.estado });
    for (const a of A.filas) {
      const b = MB.get(a.nodo_id);
      if (JSON.stringify(a) === JSON.stringify(b)) { sinCambio.push(a.nodo_id); continue; }
      const a2 = conRenombre(a);
      if (JSON.stringify(a2) === JSON.stringify(b)) { soloRenombre.push(a.nodo_id); continue; }
      const a3 = Object.assign({}, a2); const b3 = Object.assign({}, b);
      delete a3.prioridad; delete b3.prioridad;
      if (JSON.stringify(a3) === JSON.stringify(b3)) soloPrioridad.push(a.nodo_id); else real.push(a.nodo_id);
    }
    say('    filas que no cambian nada .......................... ' + sinCambio.length);
    say('    filas que cambian SOLO el nombre del estado (H-3) .. ' + soloRenombre.length);
    say('    filas que cambian SOLO el ordinal `prioridad` ...... ' + soloPrioridad.length);
    say('    filas que cambian ATRIBUCION ....................... ' + real.length + '   ' + real.join(','));
    exigir('E-1 · las filas que cambian de ATRIBUCION son las 11 de (a1), y ninguna mas',
      real.length === 11 && real.join(',') === IDS.join(','), real.length + ' filas');
    exigir('E-2 · los cuatro cajones suman 688 y no se solapan',
      sinCambio.length + soloRenombre.length + soloPrioridad.length + real.length === 688,
      sinCambio.length + ' + ' + soloRenombre.length + ' + ' + soloPrioridad.length + ' + ' + real.length);
    exigir('E-3 · las que cambian de `prioridad` son todas `a_adjudicar`',
      soloPrioridad.every(id => MB.get(id).estado === 'a_adjudicar'), soloPrioridad.length + ' filas, todas a_adjudicar');
    say('    QUE SIGNIFICA EL TERCER CAJON: `prioridad` es el orden en que');
    say('    F1_adjudicacion.tsv presenta las ' + (MB.size && B.resumen.a_adjudicar) + ' filas a adjudicar. Al entrar dos');
    say('    nuevas, el resto corre de puesto. Ninguna de esas 67 cambio de bahia, de');
    say('    estado ni de via — se puede comprobar en el cajon en el que caen.');
  }

  say('\n    los once, uno por uno:');
  for (const id of IDS) {
    const a = MA.get(id), b = MB.get(id);
    say('      #' + id + ' ' + a.nombre.replace(/[\u0000-\u001f\u007f-\u009f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).padEnd(36).slice(0, 36));
    say('            antes: ' + String(a.estado).padEnd(21) + ' b' + String(a.bahia_id) + '   via ' + a.via);
    say('            ahora: ' + String(b.estado).padEnd(21) + ' b' + String(b.bahia_id) + '   via ' + b.via);
  }

  // el material, para contar CIERRES
  const { derivarCierre } = require(path.join(BACK, 'src/services/cierre-derivador.js'));
  const VIVO = require(path.join(INS, 'CONGELADO_vivo.json'));
  const F = {}, C = {};
  for (const r of VIVO.cuerpo.data) {
    F[r.bahia] = (F[r.bahia] || 0) + 1;
    if (derivarCierre(r).estado === 'cerrado') C[r.bahia] = (C[r.bahia] || 0) + 1;
  }

  say('\nF · LAS DOS CIFRAS, CON SU UNIDAD Y SU DENOMINADOR');
  say('    material: insumos/CONGELADO_vivo.json · ' + VIVO.congelado_en + ' — el mismo con que se publico el 8');
  const KM_MAX = 100;
  const claseDe = f => {
    if (f.estado === 'sin_bahia_en_catalogo') return 'sin_bahia_en_catalogo';
    if (f.estado === 'a_adjudicar') return 'a_adjudicar';
    if (f.estado === 'anclado_por_el_nodo' || f.estado === 'confirmado_declarado') {
      const km = f.evidencia && f.evidencia.km_a_esa_bahia;
      if (typeof km === 'number' && km > KM_MAX) return 'bahia_declarada_lejos';
    }
    return 'resuelta';
  };
  const rep = filas => { const m = {}; for (const f of filas) m[claseDe(f)] = (m[claseDe(f)] || 0) + 1; return m; };
  const RA = rep(A.filas), RB = rep(B.filas);
  say('\n    UNIDAD: FILAS del join. Denominador: 688 nombres de puerto.');
  for (const k of ['resuelta', 'sin_bahia_en_catalogo', 'a_adjudicar', 'bahia_declarada_lejos']) {
    say('      ' + k.padEnd(24) + String(RA[k] || 0).padStart(4) + '  ->  ' + String(RB[k] || 0).padStart(4)
      + '   (' + (((RB[k] || 0) / 688) * 100).toFixed(1) + ' %)');
  }
  exigir('las cuatro clases siguen sumando 688',
    Object.values(RB).reduce((s, x) => s + x, 0) === 688, JSON.stringify(RB));
  const doceAntes = A.filas.filter(f => claseDe(f) === 'bahia_declarada_lejos').map(f => f.nodo_id);
  const doceAhora = B.filas.filter(f => claseDe(f) === 'bahia_declarada_lejos').map(f => f.nodo_id);
  say('\n    de las 12 filas que estaban en bahia_declarada_lejos [' + doceAntes.join(',') + ']:');
  const reparto = {};
  for (const id of doceAntes) { const c = claseDe(MB.get(id)); reparto[c] = (reparto[c] || 0) + 1; }
  for (const [k, n] of Object.entries(reparto)) say('      -> ' + k.padEnd(24) + n);
  say('    quedan en bahia_declarada_lejos: [' + doceAhora.join(',') + ']');

  say('\n    UNIDAD: CIERRES. Denominador: los cierres vivos a las 23:02Z del 2026-08-17.');
  let cierresAntes = 0, cierresAhora = 0;
  const detalle = [];
  for (const id of doceAntes) {
    const a = MA.get(id), b = MB.get(id);
    const ca = claseDe(a) === 'resuelta' ? (C[a.bahia_id] || 0) : 0;
    const cb = claseDe(b) === 'resuelta' ? (C[b.bahia_id] || 0) : 0;
    cierresAntes += ca; cierresAhora += cb;
    if (cb - ca !== 0) detalle.push('#' + id + ' ' + a.nombre + ': +' + (cb - ca) + ' (bahia ' + b.bahia_id + ')');
  }
  say('      cierres que las 12 filas reciben ANTES ... ' + cierresAntes);
  say('      cierres que las 12 filas reciben AHORA ... ' + cierresAhora);
  for (const d of detalle) say('        ' + d);
  exigir('vuelven los 8 CIERRES declarados en §7.1', cierresAhora - cierresAntes === 8, '+' + (cierresAhora - cierresAntes));
  say('    OJO: "8 cierres" y "N filas" son DOS CIFRAS DISTINTAS con DOS UNIDADES. Los 8');
  say('    cierres salen de DOS filas. No se suman y no se citan una por la otra.');

  say('\nG · HUELLAS NUEVAS — cada cifra con la version que la produjo');
  say('    insumos/nodos.json          ' + SHA_NODOS_VIEJO + '  ->  ' + sha256(RUTA_NODOS));
  say('    join_puerto_bahia.json      ' + SHA_JOIN_VIEJO + '  ->  ' + SHA_JOIN_NUEVO);
  say('    F1_adjudicacion.tsv         ' + SHA_TSV_VIEJO + '  ->  ' + SHA_TSV_NUEVO);
  say('');
  say('    CLASE DE LAS TRES HUELLAS (FA-4), y hay que decirla entera: este repositorio');
  say('    tiene core.autocrlf = true y NO tiene .gitattributes. Las huellas de arriba son');
  say('    el sha256 del contenido CON LF, que es lo que git guarda en el blob. En esta');
  say('    maquina coincide con el fichero en disco PORQUE lo escribio node, que pone LF.');
  say('    Despues de un git checkout, o en un clon fresco, el MISMO contenido queda con');
  say('    CRLF y da OTRO sha. Medido hoy, sobre estos mismos ficheros:');
  for (const rp of ['data/catalogo/join_puerto_bahia.json', '_bitacoras/filtro_puerto_2026-08-17/F1_adjudicacion.tsv']) {
    const lf = fs.readFileSync(path.join(BACK, rp));
    const crlf = Buffer.from(lf.toString('utf8').replace(/\r?\n/g, '\r\n'), 'utf8');
    say('      ' + rp);
    say('        con LF   ' + sha256buf(lf) + '  ' + lf.length + ' B   <- el que se publica');
    say('        con CRLF ' + sha256buf(crlf) + '  ' + crlf.length + ' B   <- el que deja un checkout');
  }
  say('    NINGUNO DE LOS TRECE INSTRUMENTOS DEL FRENTE DICE CUAL DE LOS DOS ANCLA, y');
  say('    todos comparan contra el de LF. En una maquina recien clonada darian rojo por');
  say('    finales de linea y no por contenido. Ver H-10 en la bitacora.');
  exigir('el artefacto CAMBIO', SHA_JOIN_NUEVO !== SHA_JOIN_VIEJO, SHA_JOIN_VIEJO.slice(0, 12) + '... -> ' + SHA_JOIN_NUEVO.slice(0, 12) + '...');

  say('\nH · LOS OCHO INSTRUMENTOS QUE PASAN A ROJO — se declaran, no se re-anclan');
  const instr = ['15_verificar_push_b1a.js', '19_estado_del_frente.js', '20_medir_m5.js', '21_medir_decisiones.js',
    '22_medir_apagados.js', '23_verificar_push_f2.js', '24_medir_lector_join.js', '25_medir_ruta_f2.js'];
  for (const f of instr) {
    const t = fs.readFileSync(path.join(BACK, '_bitacoras/filtro_puerto_2026-08-17', f), 'utf8');
    say('      ' + f.padEnd(30) + ' menciona 4f9fbdc3: ' + (t.split('4f9fbdc3').length - 1) + ' veces');
  }
  say('    NO SE TOCAN Y NO SE CORREN. Y NO SON LOS CUATRO de la decision (2) de f2d0aea:');
  say('    esos son 07_ a 10_, siguen anclados a dfd07236..., siguen rojos y su rojo no');
  say('    cambia de causa ni de grado. El frente pasa de 4 instrumentos rojos a 12, de dos');
  say('    generaciones. El sucesor deja de ser deuda: es requisito para volver a tener verde.');

  say('\n' + '='.repeat(80));
  say(fallas.length ? fallas.length + ' FALLA(S)' : 'SIN FALLAS — re-derivado. Los tres controles salieron verdes ANTES de escribir.');
  say('QUE NO PRUEBA: que las cifras publicadas contra 4f9fbdc3... sigan valiendo. Las que');
  say('cambian se enmiendan en PLAN_JURISDICCION.md, una por una, en este mismo commit.');
  say('='.repeat(80));
  await cerrar(pool);
})().catch(async e => { say('EXCEPCION: ' + e.stack); fallas.push('excepcion'); await cerrar(pool); });
