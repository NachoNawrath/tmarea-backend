'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// 08_pantalla_antes.js — corre `_bitacoras/auditoria_rotulos_2026-08-15/
// 02_medir_pantalla.js` SIN TOCARLO, con el mapa repuesto al ancla `bd75c494`.
//
// POR QUE EXISTE. La medicion previa de esta sesion (`01_medir_lote.js`) modelo
// P1 con la regla de P2 y publico para P1 una cifra que no era la suya: P1 toma
// el nombre del DECRETO en las entradas de ambito publicado —21 lacustres— y del
// mapa en el resto, mientras que P2 lee siempre el mapa crudo. Modelar los dos
// caminos con una sola regla es exactamente lo que la seccion 4 de la auditoria
// del 08-15 advirtio que no se hiciera. La correccion no es re-implementarlo
// mejor: es NO duplicar una medicion que ya tiene instrumento versionado, y
// correr ese.
//
// El instrumento del 08-15 lee el mapa de disco, asi que para medir el ANTES hay
// que reponer el mapa al ancla. Se repone, se corre, se restaura y se comprueba
// el sha256. Si la restauracion no reproduce el byte, sale 3.
//
// Corrida:  node _bitacoras/lote_cisnes_2026-08-16/08_pantalla_antes.js
// Shell declarada (§7.3): identica en PowerShell y en Git Bash.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const abs = p => path.join(RAIZ, p);
const shaBuf = b => crypto.createHash('sha256').update(b).digest('hex');
const L = (...a) => console.log(...a);

const ANCLA = 'bd75c494';
const P_MAPA = 'src/data/bahia-capitania-map.json';
const INSTRUMENTO = '_bitacoras/auditoria_rotulos_2026-08-15/02_medir_pantalla.js';

const original = fs.readFileSync(abs(P_MAPA));
const shaOriginal = shaBuf(original);

L('================================================================================');
L(`P1/P2/P3 ANTES DE LA PIEZA — instrumento del 2026-08-15, sin tocarlo`);
L(`Mapa repuesto al ancla ${ANCLA}. Instrumento: ${INSTRUMENTO}`);
L('================================================================================');
L('');
L(`  sha256 del mapa en disco antes de reponer : ${shaOriginal}`);

const blob = execFileSync('git', ['show', `${ANCLA}:${P_MAPA}`], { cwd: RAIZ, maxBuffer: 1 << 24, encoding: 'utf8' });
const bytesAncla = Buffer.from(blob.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'), 'utf8');
L(`  sha256 del mapa del ancla, en CRLF        : ${shaBuf(bytesAncla)}`);

let salida = '', code = null;
try {
  fs.writeFileSync(abs(P_MAPA), bytesAncla);
  const r = spawnSync(process.execPath, [abs(INSTRUMENTO)], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 });
  code = r.status; salida = (r.stdout || '') + (r.stderr || '');
} finally {
  fs.writeFileSync(abs(P_MAPA), original);
}

const shaFinal = shaBuf(fs.readFileSync(abs(P_MAPA)));
L(`  sha256 del mapa despues de restaurar      : ${shaFinal}  ${shaFinal === shaOriginal ? 'OK' : 'MAL RESTAURADO'}`);
L('');
L(`  el instrumento salio con exit ${code}`);
L('');
L('--- SALIDA LITERAL DEL INSTRUMENTO DEL 2026-08-15, CON EL MAPA EN EL ANCLA ---');
L('');
process.stdout.write(salida);
L('');
L('================================================================================');
if (shaFinal !== shaOriginal) { L('ABORTA — el mapa no quedo restaurado byte a byte.'); process.exit(3); }
if (code !== 0) { L(`ABORTA — el instrumento salio con exit ${code}.`); process.exit(3); }
L('El mapa quedo restaurado byte a byte.');
L('================================================================================');
process.exit(0);
