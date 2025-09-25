// Utilidades para archivos Excel

const crypto = require('crypto');

/**
 * Limpia una cadena eliminando espacios, tildes y caracteres especiales.
 * @param {string} str
 * @returns {string}
 */
function cleanString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes
    .replace(/[^\w\s-]/gi, '')      // Elimina caracteres especiales
    .replace(/\s+/g, ' ')            // Unifica espacios
    .trim();
}

/**
 * Genera un ID único basado en el contenido y la fecha actual.
 * @param {string} base
 * @returns {string}
 */
function generateUniqueId(base = '') {
  const now = Date.now();
  const hash = crypto.createHash('sha256').update(base + now).digest('hex');
  return hash.slice(0, 16); // 16 caracteres
}

/**
 * Convierte un valor a número seguro, o retorna null si no es válido.
 * @param {any} value
 * @returns {number|null}
 */
function toSafeNumber(value) {
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Normaliza los nombres de columnas para facilitar el mapeo.
 * @param {string} header
 * @returns {string}
 */
function normalizeHeader(header) {
  return cleanString(header).toLowerCase().replace(/\s+/g, '_');
}

module.exports = {
  cleanString,
  generateUniqueId,
  toSafeNumber,
  normalizeHeader
};
