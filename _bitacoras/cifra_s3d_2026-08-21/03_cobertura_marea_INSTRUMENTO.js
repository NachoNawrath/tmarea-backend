// MAPA DE COBERTURA DE LA FUENTE DE MAREA — no toca nada, solo mide.
// Criterio IDENTICO al del codigo vivo: findNearestStation con MAX 50 mn,
// sin interpolar. Unidad: nodo portuario del join. Denominador: los 688 nodos
// de data/catalogo/join_puerto_bahia.json que traen lat/lng.
const est = require('C:/Users/katia/tmarea-backend/src/services/data/tidal-constants.json').stations;
const join = require('C:/Users/katia/tmarea-backend/data/catalogo/join_puerto_bahia.json');
const nodos = Object.values(join).find(Array.isArray);

const R=6371.0088, KM_NM=1.852, rad=d=>d*Math.PI/180;
function nm(a,b,c,d){const dl=rad(c-a),dg=rad(d-b);const x=Math.sin(dl/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dg/2)**2;return (R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)))/KM_NM;}

let conDato=0,sinDato=0,precisionReducida=0,sinCoord=0;
const porEstacion={}; const huecos=[];
for(const n of nodos){
  if(n.lat==null||n.lng==null){sinCoord++;continue;}
  let best=null,bd=Infinity;
  for(const s of est){const d=nm(n.lat,n.lng,s.lat,s.lon); if(d<bd){bd=d;best=s;}}
  if(bd>50){sinDato++; huecos.push({nombre:n.nombre,region:n.region,mn:Math.round(bd)}); continue;}
  conDato++; if(bd>=30) precisionReducida++;
  porEstacion[best.id]=(porEstacion[best.id]||0)+1;
}
const tot=conDato+sinDato;
console.log('DENOMINADOR: '+tot+' nodos portuarios con coordenada (de '+nodos.length+' del join; '+sinCoord+' sin coordenada)');
console.log('UNIDAD: nodo portuario. CRITERIO: estacion armonica a <= 50 mn, sin interpolar (el del codigo vivo).');
console.log('');
console.log('  CON dato de marea .......... '+conDato+'  ('+(100*conDato/tot).toFixed(1)+' %)');
console.log('     de esos, PRECISION REDUCIDA (30-50 mn) .. '+precisionReducida+'  ('+(100*precisionReducida/tot).toFixed(1)+' % del total)');
console.log('     de esos, precision plena (<30 mn) ....... '+(conDato-precisionReducida));
console.log('  SIN dato de marea .......... '+sinDato+'  ('+(100*sinDato/tot).toFixed(1)+' %)');
console.log('');
console.log('CARGA POR ESTACION (cuantos nodos cuelgan de cada una de las 21):');
Object.entries(porEstacion).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('   '+k.padEnd(20)+String(v).padStart(4)));
const sinUso = est.filter(s=>!porEstacion[s.id]).map(s=>s.id);
console.log('   estaciones que no cubren ningun nodo: '+(sinUso.length?sinUso.join(', '):'ninguna'));
console.log('');
console.log('LOS HUECOS MAS GRANDES (nodo mas lejano a cualquier estacion):');
huecos.sort((a,b)=>b.mn-a.mn).slice(0,10).forEach(h=>console.log('   '+String(h.mn).padStart(4)+' mn  reg '+h.region+'  '+h.nombre));
const porRegion={};
huecos.forEach(h=>porRegion[h.region]=(porRegion[h.region]||0)+1);
console.log('');
console.log('HUECOS POR REGION:');
Object.entries(porRegion).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('   region '+k+': '+v));
