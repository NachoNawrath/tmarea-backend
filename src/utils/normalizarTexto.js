/**
 * Normaliza texto para comparaciones insensibles a acentos y mayúsculas.
 * Aplica: NFD decompose + strip diacritics + toUpperCase + trim.
 */
function normalizarTexto(texto) {
  if (!texto) return '';
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
}

module.exports = { normalizarTexto };
