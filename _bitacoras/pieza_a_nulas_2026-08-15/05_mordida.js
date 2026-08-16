'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 05_mordida.js — CLAUDE.md §4.6. Le inyecta a cada control el defecto que debe
// cazar y comprueba que lo caza. Un control que solo se ve en verde no se
// distingue de uno que no muerde.
//
// Cinco ensayos. Tres contra el GENERADOR y dos contra el VERIFICADOR:
//   B1  el derivado dice que el rotulo sale de un titulo de ALCALDIA DE MAR
//       -> el generador ABORTA (INV-3.3)
//   B2  el derivado trae un telefono NO atomico y ademas MIENTE su bandera
//       `telefono_atomico: true`
//       -> el generador lo EXCLUYE igual, porque recalcula (§5.3)
//   B3  la captura de `consultaBahias` reemplazada por un array vacio
//       -> el generador ABORTA, nunca "0 cambios" en verde
//   B4  una entrada FUERA de la lista de trabajo cambiada a mano
//       -> el verificador FALLA
//   B5  una entrada escrita queda con su nombre y el telefono de OTRA
//       reparticion — el defecto de N10, el que tumbo la decision del
//       2026-08-13 -> el verificador FALLA en V3
//
// COMO RESTAURA. Cada ensayo guarda los BYTES del archivo que toca y los
// repone en `finally`, y al terminar se comprueba el sha256 de los tres
// archivos contra el que tenian al empezar. Si alguno no coincide, este script
// sale distinto de cero y lo dice: un ensayo que deja el arbol sucio es peor que
// no haberlo corrido.
//
// Para B1..B3 el mapa se repone al estado del ancla `0bc80d2` —reconstruido del
// blob y convertido a CRLF, con su sha256 comprobado— porque el generador ya no
// tiene nada que escribir sobre el estado aplicado.
//
// Corrida:  node _bitacoras/pieza_a_nulas_2026-08-15/05_mordida.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const L = (...a) => console.log(...a);
const abs = p => path.join(RAIZ, p);
const shaBuf = b => crypto.createHash('sha256').update(b).digest('hex');
const shaDe = p => shaBuf(fs.readFileSync(abs(p)));

const ANCLA = '0bc80d2';
const SHA_ANCLA_DISCO = '0225aa23959b51b1cf20f75018f0cba3e474bc83517db56a0103cb7c31b4b03b';
const P_MAPA = 'src/data/bahia-capitania-map.json';
const P_SB = '_bitacoras/e3_paso6_2026-08-13/01_sitport_crudo/consultaBahias.json';
const P_DER = 'data/contacto/reparticiones_publicadas.json';
const GEN = 'scripts/frente-contacto-pieza-a.js';
const VER = '_bitacoras/pieza_a_nulas_2026-08-15/04_verificar.js';

const SHA_INICIO = { [P_MAPA]: shaDe(P_MAPA), [P_SB]: shaDe(P_SB), [P_DER]: shaDe(P_DER) };

function correr(script) {
  try {
    const out = execFileSync('node', [script], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return { exit: 0, salida: out };
  } catch (e) {
    return { exit: e.status === undefined ? -1 : e.status, salida: String(e.stdout || '') + String(e.stderr || '') };
  }
}

// El mapa en el estado del ancla, en CRLF, comprobado por sha256.
let mapaAncla;
try {
  const blob = execFileSync('git', ['show', `${ANCLA}:${P_MAPA}`], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  mapaAncla = Buffer.from(blob.replace(/\r?\n/g, '\r\n'), 'utf8');
} catch (e) {
  L(`ABORTA — no se pudo leer ${ANCLA}:${P_MAPA}: ${e.message}`);
  process.exit(3);
}
if (shaBuf(mapaAncla) !== SHA_ANCLA_DISCO) {
  L('ABORTA — el mapa reconstruido del ancla no reproduce el sha256 que tenia en disco.');
  L(`         esperado ${SHA_ANCLA_DISCO}`);
  L(`         obtenido ${shaBuf(mapaAncla)}`);
  L('         Sin eso, los ensayos B1..B3 no correrian sobre el estado que dicen.');
  process.exit(3);
}

// Emisor de linea, escrito aparte a proposito: un ensayo que reusara el emisor
// del generador probaria que el generador coincide consigo mismo.
const LINEA = /^(\s*"(\d+)":\s*)\{ ("capitania": )(.*?),(\s*)("gobernacion": )(.*?),(\s*)("telefono": )(.*?) \}(,?)$/;
function tocarEntrada(texto, id, cambios) {
  const lineas = texto.split('\r\n');
  let hechas = 0;
  for (let i = 0; i < lineas.length; i++) {
    const m = LINEA.exec(lineas[i]);
    if (!m || m[2] !== String(id)) continue;
    const cap = 'capitania' in cambios ? JSON.stringify(cambios.capitania) : m[4];
    const tel = 'telefono' in cambios ? JSON.stringify(cambios.telefono) : m[10];
    const pad = ' '.repeat(Math.max(1, m[5].length + (m[4].length - cap.length)));
    lineas[i] = `${m[1]}{ "capitania": ${cap},${pad}"gobernacion": ${m[7]},${m[8]}"telefono": ${tel} }${m[11]}`;
    hechas++;
  }
  if (hechas !== 1) { L(`ABORTA — el ensayo no pudo tocar la entrada ${id} (calzo ${hechas} veces)`); process.exit(3); }
  return lineas.join('\r\n');
}

let mordieron = 0, ensayos = 0;
function ensayo(nombre, descripcion, preparar, esperado) {
  ensayos++;
  L('');
  L(`  ${nombre} — ${descripcion}`);
  const respaldos = new Map();
  const guardar = p => { if (!respaldos.has(p)) respaldos.set(p, fs.readFileSync(abs(p))); };
  let r;
  try {
    r = esperado(preparar(guardar));
  } finally {
    for (const [p, b] of respaldos) fs.writeFileSync(abs(p), b);
  }
  if (r.mordio) { mordieron++; L(`      medido: ${r.medido}  -> **MORDIO**`); }
  else L(`      medido: ${r.medido}  -> NO MORDIO`);
  return r.mordio;
}

L('================================================================================');
L('MORDIDA DE LOS CONTROLES DE LA PIEZA A — CLAUDE.md §4.6');
L('================================================================================');
L('');
L('  LINEA BASE, sin inyectar nada:');
const baseVer = correr(VER);
L(`      verificador sobre el estado aplicado -> exit ${baseVer.exit} (se espera 0)`);
if (baseVer.exit !== 0) { L('ABORTA — la linea base no esta verde: los ensayos no significarian nada.'); process.exit(3); }

// ── B1 ───────────────────────────────────────────────────────────────────────
ensayo('B1', 'el derivado dice que el rotulo sale de un titulo de ALCALDIA DE MAR (INV-3.3)',
  guardar => {
    guardar(P_MAPA); guardar(P_DER);
    fs.writeFileSync(abs(P_MAPA), mapaAncla);
    const d = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8'));
    d.reparticiones['186'].titulo_publicado = 'Alcaldías de Mar de Villarrica';
    fs.writeFileSync(abs(P_DER), JSON.stringify(d, null, 2) + '\n');
    return correr(GEN);
  },
  r => ({ mordio: r.exit === 3 && /INV-3\.3/.test(r.salida), medido: `exit=${r.exit}, el motivo cita INV-3.3: ${/INV-3\.3/.test(r.salida)}` }));

// ── B2 ───────────────────────────────────────────────────────────────────────
ensayo('B2', 'telefono NO atomico con la bandera `telefono_atomico` MINTIENDO true',
  guardar => {
    guardar(P_MAPA); guardar(P_DER);
    fs.writeFileSync(abs(P_MAPA), mapaAncla);
    const d = JSON.parse(fs.readFileSync(abs(P_DER), 'utf8'));
    d.reparticiones['186'].telefono = 'Móvil: +56 45 2524733';
    d.reparticiones['186'].telefono_atomico = true;
    fs.writeFileSync(abs(P_DER), JSON.stringify(d, null, 2) + '\n');
    const r = correr(GEN);
    return { r, escrito: JSON.parse(fs.readFileSync(abs(P_MAPA), 'utf8')) };
  },
  ({ r, escrito }) => {
    const villarrica = ['105', '209', '210', '245', '246', '247', '248', '249', '250'];
    const escritas = villarrica.filter(k => escrito[k].capitania !== null).length;
    const sucio = villarrica.filter(k => escrito[k].telefono && !/^\+?[\d]+(?: [\d]+)*$/.test(escrito[k].telefono)).length;
    return {
      mordio: r.exit === 0 && escritas === 0 && sucio === 0 && /NO es atomico/.test(r.salida),
      medido: `exit=${r.exit}, de las 9 de esa reparticion se escribieron ${escritas}, telefonos no atomicos escritos ${sucio}`
    };
  });

// ── B3 ───────────────────────────────────────────────────────────────────────
ensayo('B3', 'la captura de `consultaBahias` reemplazada por un array vacio',
  guardar => {
    guardar(P_MAPA); guardar(P_SB);
    fs.writeFileSync(abs(P_MAPA), mapaAncla);
    fs.writeFileSync(abs(P_SB), '[]\n');
    const r = correr(GEN);
    return { r, sha: shaDe(P_MAPA) };
  },
  ({ r, sha }) => ({
    mordio: r.exit !== 0 && sha === SHA_ANCLA_DISCO,
    medido: `exit=${r.exit} (se espera != 0), y el mapa quedo sin tocar: ${sha === SHA_ANCLA_DISCO}`
  }));

// ── B4 ───────────────────────────────────────────────────────────────────────
ensayo('B4', 'una entrada FUERA de la lista de trabajo cambiada a mano',
  guardar => {
    guardar(P_MAPA);
    const t = fs.readFileSync(abs(P_MAPA), 'utf8');
    fs.writeFileSync(abs(P_MAPA), tocarEntrada(t, 71, { capitania: 'Iquique' }), { encoding: 'utf8' });
    return correr(VER);
  },
  r => ({ mordio: r.exit === 1 && /no estaba en la lista esperada/.test(r.salida), medido: `exit=${r.exit} (se espera 1), y la falla nombra la entrada intrusa: ${/no estaba en la lista esperada/.test(r.salida)}` }));

// ── B5 ───────────────────────────────────────────────────────────────────────
ensayo('B5', 'una entrada escrita con su nombre y el telefono de OTRA reparticion',
  guardar => {
    guardar(P_MAPA);
    const t = fs.readFileSync(abs(P_MAPA), 'utf8');
    // 105 queda "Villarrica" con el numero de VALDIVIA, que es exactamente lo
    // que pasaba si se escribia el nombre y no el telefono.
    fs.writeFileSync(abs(P_MAPA), tocarEntrada(t, 105, { telefono: '+56 63 2276944' }), { encoding: 'utf8' });
    return correr(VER);
  },
  r => ({ mordio: r.exit === 1 && /V3|es de la\/s reparticion/.test(r.salida), medido: `exit=${r.exit} (se espera 1), y la falla es del par: ${/es de la\/s reparticion|`telefono` es/.test(r.salida)}` }));

// ── cierre ───────────────────────────────────────────────────────────────────
L('');
L('================================================================================');
L(`  ENSAYOS: ${ensayos} · MORDIERON: ${mordieron}`);
let sucio = false;
for (const [p, s] of Object.entries(SHA_INICIO)) {
  const ahora = shaDe(p);
  const ok = ahora === s;
  if (!ok) sucio = true;
  L(`  ${ok ? 'restaurado' : '*** NO RESTAURADO ***'} ${p}`);
  if (!ok) { L(`      esperado ${s}`); L(`      ahora    ${ahora}`); }
}
const finalVer = correr(VER);
L(`  verificador despues de todos los ensayos -> exit ${finalVer.exit} (se espera 0)`);
if (sucio || mordieron !== ensayos || finalVer.exit !== 0) { L('  RESULTADO: NO CONFORME.'); L('================================================================================'); process.exit(1); }
L('  RESULTADO: los cinco controles muerden y el arbol quedo como estaba.');
L('================================================================================');
