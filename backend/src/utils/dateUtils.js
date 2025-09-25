// Utilidades de fechas

/**
 * Parsea una fecha en formato español (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, etc.)
 * @param {string|Date} value
 * @returns {Date|null}
 */
function parseSpanishDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  // dd/mm/yyyy o dd-mm-yyyy
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    return new Date(year < 100 ? 2000 + year : year, month, day);
  }
  // yyyy-mm-dd
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  // Intentar parseo estándar
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Detecta patrones de fechas en un array de filas
 * @param {Array} rows
 * @param {number} columnIndex
 * @returns {string|null}
 */
function detectDatePatterns(rows, columnIndex = 0) {
  const formats = {};
  rows.forEach(row => {
    const val = row[columnIndex];
    if (!val) return;
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(val)) formats['dd/mm/yyyy'] = true;
    else if (/\d{4}-\d{2}-\d{2}/.test(val)) formats['yyyy-mm-dd'] = true;
  });
  return Object.keys(formats)[0] || null;
}

/**
 * Extrae año y mes de una fecha
 * @param {Date|string} value
 * @returns {{year:number, month:number}|null}
 */
function extractDateInfo(value) {
  const date = parseSpanishDate(value);
  if (!date) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/**
 * Valida si una fecha está en un rango
 * @param {Date|string} date
 * @param {Date|string} min
 * @param {Date|string} max
 * @returns {boolean}
 */
function isDateInRange(date, min, max) {
  const d = parseSpanishDate(date);
  const dMin = parseSpanishDate(min);
  const dMax = parseSpanishDate(max);
  if (!d || !dMin || !dMax) return false;
  return d >= dMin && d <= dMax;
}

module.exports = {
  parseSpanishDate,
  detectDatePatterns,
  extractDateInfo,
  isDateInRange
};
