// 📄 ARCHIVO: backend/src/utils/responseUtils.js
// 🔧 Utilidades para estandarizar respuestas de la API

/**
 * Respuesta exitosa estándar
 * @param {Object} res - Response object de Express
 * @param {any} data - Datos a enviar
 * @param {string} message - Mensaje opcional
 * @param {number} statusCode - Código de estado HTTP (default: 200)
 * @returns {Object} Respuesta JSON
 */
function successResponse(res, data = null, message = 'Operación exitosa', statusCode = 200) {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  console.log(`[RESPONSE] ✅ ${statusCode} - ${message}`);
  return res.status(statusCode).json(response);
}

/**
 * Respuesta de error estándar
 * @param {Object} res - Response object de Express
 * @param {string} errorCode - Código de error personalizado
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código de estado HTTP (default: 400)
 * @param {any} details - Detalles adicionales del error
 * @returns {Object} Respuesta JSON
 */
function errorResponse(res, errorCode = 'ERROR', message = 'Ocurrió un error', statusCode = 400, details = null) {
  const response = {
    success: false,
    error: errorCode,
    message,
    timestamp: new Date().toISOString()
  };

  // Agregar detalles solo si se proporcionan
  if (details) {
    response.data = details;
  }

  console.error(`[RESPONSE] ❌ ${statusCode} - ${errorCode}: ${message}`);
  return res.status(statusCode).json(response);
}

/**
 * Respuesta de validación con errores específicos
 * @param {Object} res - Response object de Express
 * @param {Array} validationErrors - Array de errores de validación
 * @param {string} message - Mensaje principal
 * @param {number} statusCode - Código de estado HTTP (default: 400)
 * @returns {Object} Respuesta JSON
 */
function validationErrorResponse(res, validationErrors = [], message = 'Errores de validación', statusCode = 400) {
  const response = {
    success: false,
    error: 'VALIDATION_ERROR',
    message,
    validationErrors,
    timestamp: new Date().toISOString()
  };

  console.error(`[RESPONSE] ❌ ${statusCode} - Errores de validación:`, validationErrors);
  return res.status(statusCode).json(response);
}

/**
 * Respuesta paginada estándar
 * @param {Object} res - Response object de Express
 * @param {Array} data - Datos paginados
 * @param {Object} pagination - Información de paginación
 * @param {string} message - Mensaje opcional
 * @returns {Object} Respuesta JSON
 */
function paginatedResponse(res, data = [], pagination = {}, message = 'Datos obtenidos exitosamente') {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || data.length,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.limit || 10)),
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false
    },
    timestamp: new Date().toISOString()
  };

  console.log(`[RESPONSE] ✅ 200 - Respuesta paginada: ${data.length} elementos`);
  return res.status(200).json(response);
}

/**
 * Respuesta para operaciones no encontradas
 * @param {Object} res - Response object de Express
 * @param {string} resource - Nombre del recurso no encontrado
 * @param {string} identifier - Identificador buscado
 * @returns {Object} Respuesta JSON
 */
function notFoundResponse(res, resource = 'Recurso', identifier = '') {
  const message = identifier 
    ? `${resource} con identificador '${identifier}' no encontrado`
    : `${resource} no encontrado`;

  return errorResponse(res, 'NOT_FOUND', message, 404);
}

/**
 * Respuesta para operaciones no autorizadas
 * @param {Object} res - Response object de Express
 * @param {string} message - Mensaje personalizado
 * @returns {Object} Respuesta JSON
 */
function unauthorizedResponse(res, message = 'No autorizado') {
  return errorResponse(res, 'UNAUTHORIZED', message, 401);
}

/**
 * Respuesta para operaciones prohibidas
 * @param {Object} res - Response object de Express
 * @param {string} message - Mensaje personalizado
 * @returns {Object} Respuesta JSON
 */
function forbiddenResponse(res, message = 'Acceso prohibido') {
  return errorResponse(res, 'FORBIDDEN', message, 403);
}

/**
 * Respuesta para conflictos (recursos duplicados, etc.)
 * @param {Object} res - Response object de Express
 * @param {string} message - Mensaje del conflicto
 * @param {any} details - Detalles adicionales
 * @returns {Object} Respuesta JSON
 */
function conflictResponse(res, message = 'Conflicto detectado', details = null) {
  return errorResponse(res, 'CONFLICT', message, 409, details);
}

/**
 * Respuesta para rate limiting
 * @param {Object} res - Response object de Express
 * @param {number} retryAfter - Segundos hasta poder reintentar
 * @returns {Object} Respuesta JSON
 */
function rateLimitResponse(res, retryAfter = 60) {
  res.set('Retry-After', retryAfter);
  return errorResponse(
    res, 
    'RATE_LIMIT_EXCEEDED', 
    'Demasiadas solicitudes. Intente más tarde.', 
    429,
    { retryAfter }
  );
}

/**
 * Respuesta para errores internos del servidor
 * @param {Object} res - Response object de Express
 * @param {Error} error - Error capturado
 * @param {string} message - Mensaje personalizado
 * @returns {Object} Respuesta JSON
 */
function internalErrorResponse(res, error = null, message = 'Error interno del servidor') {
  const details = process.env.NODE_ENV === 'development' ? {
    stack: error?.stack,
    name: error?.name,
    originalMessage: error?.message
  } : null;

  return errorResponse(res, 'INTERNAL_ERROR', message, 500, details);
}

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  rateLimitResponse,
  internalErrorResponse
};