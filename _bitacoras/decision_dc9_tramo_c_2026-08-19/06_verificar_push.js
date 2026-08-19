// Verifica por BLOB-SHA que los 22 ficheros del commit 765770e estan en origin tal cual.
// gh no esta instalado. Se va por /contents/, UN FICHERO A LA VEZ, con curl.exe (no el
// alias de PowerShell). CLASE DEL SHA: blob-sha de git (sha1 sobre el contenido LF que
// git almacena), NO el sha256 del fichero en disco — las dos clases estan en 99_huellas.txt.
const cp = require('child_process');
const REPO = 'NachoNawrath/tmarea-backend';
const REF = '765770e691a01c23edfd8d66500647a753baa79d';
const FICHEROS = cp.execSync('git show --pretty="" --name-only ' + REF, { encoding: 'utf8' })
  .split('\n').map((s) => s.trim()).filter(Boolean);
console.log('AMBITO: los ' + FICHEROS.length + ' ficheros de ' + REF.slice(0, 7) + ' en ' + REPO);
console.log('');
let fallos = 0, hechos = 0;
for (const f of FICHEROS) {
  const local = cp.execSync('git rev-parse ' + REF + ':"' + f + '"', { encoding: 'utf8' }).trim();
  const url = 'https://api.github.com/repos/' + REPO + '/contents/' + f.split('/').map(encodeURIComponent).join('/') + '?ref=' + REF;
  let remoto = null, estado = '';
  try {
    const r = cp.execFileSync('curl.exe', ['-sS', '-w', '\n%{http_code}', '-H', 'Accept: application/vnd.github+json', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const i = r.lastIndexOf('\n');
    estado = r.slice(i + 1).trim();
    if (estado === '200') remoto = JSON.parse(r.slice(0, i)).sha;
  } catch (e) { estado = 'ERROR ' + (e.message || '').split('\n')[0]; }
  const ok = remoto === local;
  if (!ok) fallos++; else hechos++;
  console.log((ok ? '  OK    ' : '  FALLA ') + local.slice(0, 12) + '  HTTP ' + estado + '  ' + f +
    (ok ? '' : '   remoto=' + remoto));
}
console.log('');
console.log('verificados ' + hechos + ' de ' + FICHEROS.length + ' · fallos ' + fallos);

// CONTROL NEGATIVO DEL INSTRUMENTO: una ruta que no existe tiene que dar 404 y NO OK.
const urlMala = 'https://api.github.com/repos/' + REPO + '/contents/NO_EXISTE_QZX_99.txt?ref=' + REF;
let est = '';
try {
  const r = cp.execFileSync('curl.exe', ['-sS', '-w', '\n%{http_code}', '-H', 'Accept: application/vnd.github+json', urlMala], { encoding: 'utf8' });
  est = r.slice(r.lastIndexOf('\n') + 1).trim();
} catch (e) { est = 'ERROR'; }
console.log('CONTROL NEGATIVO — fichero inexistente: HTTP ' + est + ' (esperado 404)');
process.exit(fallos === 0 && est === '404' ? 0 : 1);
