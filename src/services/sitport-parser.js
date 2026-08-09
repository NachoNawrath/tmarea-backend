// src/services/sitport-parser.js
// Normaliza registros crudos de SITPORT a objetos estructurados para el motor de reglas.

// ─────────────────────────────────────────────────────────────────────────────
// Normalización de texto — maneja encoding inconsistente de SITPORT
// (acentos correctos, sin acentos, o encoding corrupto UTF-8→CP1252)
// ─────────────────────────────────────────────────────────────────────────────
function normalizarTexto(texto) {
  if (!texto) return '';
  let t = String(texto);
  // Fix double-encoded UTF-8 (CP1252 interpretation of UTF-8 bytes) ANTES de NFD
  t = t.replace(/Ã[“”"]/g, 'O');  // Ó corrupto
  t = t.replace(/Ã[‰]/g, 'E');                // É corrupto
  t = t.replace(/Ã[š]/g, 'U');                // Ú corrupto
  t = t.replace(/Ã[‘’]/g, 'N');          // Ñ corrupto
  t = t.replace(/Ã[]/g, 'I');                      // Í corrupto
  // NFD: descompone acentos correctos en base + combining mark, luego los borra
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return t.toUpperCase().trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Detección de condición de puerto (diccionario de sinónimos sin acentos)
// Prioridad: TEMPORAL > MAL_TIEMPO > VARIABLE > OTRO
// ─────────────────────────────────────────────────────────────────────────────
function detectarCondicion(obsNorm, motivoNorm) {
  // Prioridad 1: TEMPORAL (obsNorm primero; motivoNorm como fallback incluso con obsNorm no vacía)
  if (obsNorm.includes('TEMPORAL') || motivoNorm.includes('TEMPORAL')) return 'TEMPORAL';

  // Prioridad 2: MAL_TIEMPO
  if (obsNorm.includes('MAL TIEMPO') ||
      (obsNorm.includes('PUERTO CERRADO') && motivoNorm.includes('MAL TIEMPO')) ||
      motivoNorm.includes('MAL TIEMPO')) return 'MAL_TIEMPO';

  // Prioridad 3: VARIABLE — BUG FIX: también revisa motivoNorm para sub-zonas donde
  // Observacion dice "ZONA X RESTRINGIDO... ZONA Y CONDICION NORMAL" sin la palabra VARIABLE
  if (obsNorm.includes('VARIABLE') || motivoNorm.includes('VARIABLE')) return 'VARIABLE';

  return 'OTRO';
}

// ─────────────────────────────────────────────────────────────────────────────
// Extracción de umbrales de Arqueo Bruto / TRG del texto libre
// Patrones ordenados de más específico a más genérico
// ─────────────────────────────────────────────────────────────────────────────
const AB_PATTERNS = [
  /EMBARCACIONES\s+MENORES?\s+DE\s+(\d+)\s*A\/?\.?B/,
  /EMBARCACIONES\s+MENORES?\s+DE\s+(\d+)\s+ARQUEO\s+BRUTO/,
  /EMBARCACIONES\s+MENORES?\s+A\s+(\d+)\s*A\.?B/,
  /NAVES?\s+MENORES?\s+DE\s+(\d+)\s*A\.?B/,
  /EE\.?MM\.?\s*(?:(?:DE|A)\s+)?(\d+)\s*A\.?B/,
  /EE\.?MM\.?\s*-\s*(\d+)\s*A\.?B/,
  /EE\.?MM\.?\s*<\s*(\d+)\s*A\.?B/,
  /EE\.?MM\.?\s*(?:(?:DE|A)\s+)?(\d+)\s*TRG/,
  /NAVES?\s+MENORES?\s+DE\s+(\d+)\s+ARQUEO\s+BRUTO/,
  /NAVE\s+MENOR\s+A\s+(\d+)\s*TRG/,
  /(\d+)\s*(?:A\.?B|TRG)\b/,
];

function extraerUmbralDeTexto(textoNorm) {
  for (const pat of AB_PATTERNS) {
    const m = textoNorm.match(pat);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function extraerUmbrales(textoNorm) {
  if (/TODO\s+TIPO\s+DE\s+NAVES/.test(textoNorm)) {
    return { umbral_dentro: null, umbral_fuera: null, bloqueo_total: true };
  }

  // Buscar umbrales separados para DENTRO y FUERA
  const dentroMatch = textoNorm.match(/(\d+)\s*(?:A\.?B\.?|TRG)\s+(?:[A-Z\s]*?)DENTRO/) ||
                      textoNorm.match(/DENTRO[^.;]*?(\d+)\s*(?:A\.?B|TRG)/);
  const fueraMatch  = textoNorm.match(/(\d+)\s*(?:A\.?B\.?|TRG)\s+(?:[A-Z\s]*?)FUERA/) ||
                      textoNorm.match(/FUERA[^.;]*?(\d+)\s*(?:A\.?B|TRG)/);

  if (dentroMatch && fueraMatch) {
    return {
      umbral_dentro: parseInt(dentroMatch[1], 10),
      umbral_fuera: parseInt(fueraMatch[1], 10),
      bloqueo_total: false,
    };
  }

  // Umbral único (se usa para ambos)
  const umbral = extraerUmbralDeTexto(textoNorm);

  // "EMBARCACIONES MENORES" / "NAVES MENORES" sin número → null = TODAS las menores
  if (umbral == null) {
    if (/EMBARCACIONES\s+MENORES/.test(textoNorm) || /NAVES\s+MENORES/.test(textoNorm)) {
      return { umbral_dentro: null, umbral_fuera: null, bloqueo_total: false };
    }
    if (/TODO\s+TIPO\s+DE\s+EMBARCACIONES/.test(textoNorm)) {
      return { umbral_dentro: null, umbral_fuera: null, bloqueo_total: false };
    }
  }

  return { umbral_dentro: umbral, umbral_fuera: umbral, bloqueo_total: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Detección de área de restricción
// ─────────────────────────────────────────────────────────────────────────────
function detectarArea(areaRestriccion) {
  const a = normalizarTexto(areaRestriccion);
  const dentro = a.includes('DENTRO');
  const fuera = a.includes('FUERA');
  if (dentro && fuera) return 'DENTRO_Y_FUERA';
  if (dentro) return 'DENTRO';
  if (fuera) return 'FUERA';
  return 'DENTRO_Y_FUERA';
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal: normaliza un registro crudo de SITPORT
// ─────────────────────────────────────────────────────────────────────────────
function normalizarRestriccion(registro) {
  const obsNorm = normalizarTexto(registro.Observacion);
  const motivoNorm = normalizarTexto(registro.MotivoRestriccion);
  const naveRecibeNorm = normalizarTexto(registro.NaveRecibe);

  const condicion = detectarCondicion(obsNorm, motivoNorm);

  const afecta_menores = naveRecibeNorm.includes('MENOR') ||
                         naveRecibeNorm.includes('TODO') ||
                         obsNorm.includes('TODO TIPO DE NAVES') ||
                         obsNorm.includes('TODO TIPO DE EMBARCACIONES');
  const afecta_mayores = naveRecibeNorm.includes('MAYOR') ||
                         naveRecibeNorm.includes('TODO') ||
                         obsNorm.includes('TODO TIPO DE NAVES');

  const { umbral_dentro, umbral_fuera, bloqueo_total } = extraerUmbrales(obsNorm);

  return {
    bahia_id: registro.bahia,
    bahia_nombre: normalizarTexto(registro.GLBahia),
    condicion,
    afecta_menores,
    afecta_mayores,
    umbral_ab_dentro: umbral_dentro,
    umbral_ab_fuera: umbral_fuera,
    bloqueo_total,
    texto_original: registro.Observacion || '',
    timestamp: registro.FCinicio || new Date().toISOString(),
    area: detectarArea(registro.AreaRestriccion),
  };
}

module.exports = { normalizarRestriccion, normalizarTexto };
