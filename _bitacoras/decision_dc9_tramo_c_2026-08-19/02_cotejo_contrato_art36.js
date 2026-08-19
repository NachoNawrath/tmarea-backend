// COTEJO — la cita que CONTRATO_MOTOR.md ya trae en INV-2.1 Capa 2, contra art_36.
// Y contra la cita que el owner decidio hoy. No corrige nada.
const fs = require('fs'); const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const md = fs.readFileSync(path.join(RAIZ, 'CONTRATO_MOTOR.md'), 'utf8');
const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'decreto', 'rrdn_articulos.json'), 'utf8'));
const literal = j.articulos.find(a => a.id === 'art_36').texto_decreto.join(' ');
const citaOwner = fs.readFileSync(path.join(__dirname, 'cita_owner_art36.txt'), 'utf8').replace(/\r?\n$/, '');

// La cita del contrato: bloque > entre comillas dobles, dentro de INV-2.1.
const ini = md.indexOf('**Capa 2 (vía normativa — RRDN Art. 36, inciso 2):** Texto legal literal:');
console.log('ancla INV-2.1 Capa 2 encontrada en offset', ini, '(esperado >= 0)');
const bloque = md.slice(ini, ini + 700);
const m = bloque.match(/"([\s\S]*?)"/);
const citaContrato = m[1].split('\n').map(s => s.replace(/^>\s?/, '')).join(' ').replace(/\s+/g, ' ').trim();

console.log('');
console.log('=== LA CITA DEL CONTRATO, desenvuelta a una linea ===');
console.log(JSON.stringify(citaContrato));
console.log('largo:', citaContrato.length);

console.log('');
console.log('=== (a) CONTRATO vs LITERAL art_36 ===');
const sinPunto = citaContrato.replace(/\.$/, '');
console.log('indexOf(cita del contrato, con punto final) =', literal.indexOf(citaContrato));
console.log('indexOf(cita del contrato, sin punto final) =', literal.indexOf(sinPunto));

console.log('');
console.log('=== (b) CONTRATO vs CITA DEL OWNER decidida hoy ===');
console.log('identicas sin el punto final?', sinPunto === citaOwner);
if (sinPunto !== citaOwner) {
  for (let i = 0; i < Math.max(sinPunto.length, citaOwner.length); i++) {
    if (sinPunto[i] !== citaOwner[i]) { console.log('primera divergencia en char', i, JSON.stringify(sinPunto.slice(i-30,i+30)), 'vs', JSON.stringify(citaOwner.slice(i-30,i+30))); break; }
  }
}

console.log('');
console.log('=== CONTROL POSITIVO: una cadena que si esta en el contrato ===');
console.log('indexOf("a la gira") en CONTRATO_MOTOR.md =', md.indexOf('a la gira'), '(esperado >= 0)');
console.log('=== CONTROL NEGATIVO: cadena inventada ===');
console.log('indexOf("QZXNOEXISTE") =', md.indexOf('QZXNOEXISTE'), '(esperado -1)');
