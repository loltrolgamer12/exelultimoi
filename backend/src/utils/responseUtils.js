// 🛠️ UTILIDADES DE RESPUESTA HTTP V2.0
// src/utils/responseUtils.js

// 📊 **RESPUESTAS EXITOSAS**

// Respuesta exitosa estándar
const successResponse = (res, data = null, message = 'Operación exitosa', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    statusCode
  };
  
  // Solo agregar data si no es null/undefined
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  
  // Agregar metadatos si el data es un array o tiene paginación
  if (data && typeof data === 'object') {
    if (Array.isArray(data)) {
      response.meta = {
        count: data.length,
        type: 'array'
      };
    } else if (data.pagination) {
      response.meta = {
        pagination: data.pagination,
        type: 'paginated'
      };
    }
  }
  
  console.log(`[RESPONSE] ✅ ${statusCode} - ${message}`);
  return res.status(statusCode).json(response);
};

// Respuesta de creación exitosa
const createdResponse = (res, data, message = 'Recurso creado exitosamente', resourceId = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    statusCode: 201,
    data
  };
  
  if (resourceId) {
    response.resourceId = resourceId;
    response.location = `/api/resource/${resourceId}`; // URL genérica
  }
  
  console.log(`[RESPONSE] ✅ 201 - ${message}`);
  return res.status(201).json(response);
};

// Respuesta de actualización exitosa
const updatedResponse = (res, data, message = 'Recurso actualizado exitosamente') => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    statusCode: 200,
    data,
    action: 'updated'
  };
  
  console.log(`[RESPONSE] ✅ 200 - ${message}`);
  return res.status(200).json(response);
};

// Respuesta de eliminación exitosa
const deletedResponse = (res, message = 'Recurso eliminado exitosamente', deletedCount = 1) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    statusCode: 200,
    action: 'deleted',
    deletedCount
  };
  
  console.log(`[RESPONSE] ✅ 200 - ${message} (${deletedCount} elementos)`);
  return res.status(200).json(response);
};

// ❌ **RESPUESTAS DE ERROR**

// Respuesta de error estándar
const errorResponse = (res, errorCode, message, statusCode = 500, details = null, suggestions = null) => {
  const response = {
    success: false,
    error: errorCode || 'INTERNAL_ERROR',
    message: message || 'Ha ocurrido un error interno',
    timestamp: new Date().toISOString(),
    statusCode
  };
  
  // Agregar detalles si se proporcionan
  if (details) {
    response.details = details;
  }
  
  // Agregar sugerencias si se proporcionan
  if (suggestions) {
    response.suggestions = Array.isArray(suggestions) ? suggestions : [suggestions];
  }
  
  // Agregar información de debugging en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    response.debug = {
      environment: 'development',
      node_version: process.version,
      memory_usage: process.memoryUsage()
    };
  }
  
  console.error(`[RESPONSE] ❌ ${statusCode} - ${errorCode}: ${message}`);
  
  return res.status(statusCode).json(response);
};

// Error de validación
const validationErrorResponse = (res, errors, message = 'Errores de validación encontrados') => {
  const response = {
    success: false,
    error: 'VALIDATION_ERROR',
    message,
    timestamp: new Date().toISOString(),
    statusCode: 400,
    errors: Array.isArray(errors) ? errors : [errors],
    errorCount: Array.isArray(errors) ? errors.length : 1
  };
  
  console.error(`[RESPONSE] ❌ 400 - Validation errors: ${response.errorCount} errors`);
  
  return res.status(400).json(response);
};

// Error de autorización
const unauthorizedResponse = (res, message = 'No autorizado para acceder a este recurso') => {
  const response = {
    success: false,
    error: 'UNAUTHORIZED',
    message,
    timestamp: new Date().toISOString(),
    statusCode: 401,
    action_required: 'Proporcionar credenciales válidas'
  };
  
  console.error(`[RESPONSE] ❌ 401 - ${message}`);
  
  return res.status(401).json(response);
};

// Error de permisos
const forbiddenResponse = (res, message = 'No tiene permisos para realizar esta acción') => {
  const response = {
    success: false,
    error: 'FORBIDDEN',
    message,
    timestamp: new Date().toISOString(),
    statusCode: 403,
    action_required: 'Contactar al administrador para obtener permisos'
  };
  
  console.error(`[RESPONSE] ❌ 403 - ${message}`);
  
  return res.status(403).json(response);
};

// Error de recurso no encontrado
const notFoundResponse = (res, resource = 'Recurso', message = null) => {
  const defaultMessage = `${resource} no encontrado`;
  
  const response = {
    success: false,
    error: 'NOT_FOUND',
    message: message || defaultMessage,
    timestamp: new Date().toISOString(),
    statusCode: 404,
    resource: resource.toLowerCase()
  };
  
  console.error(`[RESPONSE] ❌ 404 - ${response.message}`);
  
  return res.status(404).json(response);
};

// Error de conflicto (ej: duplicados)
const conflictResponse = (res, message = 'Conflicto con el estado actual del recurso', conflictDetails = null) => {
  const response = {
    success: false,
    error: 'CONFLICT',
    message,
    timestamp: new Date().toISOString(),
    statusCode: 409
  };
  
  if (conflictDetails) {
    response.conflict_details = conflictDetails;
  }
  
  console.error(`[RESPONSE] ❌ 409 - ${message}`);
  
  return res.status(409).json(response);
};

// Error de rate limiting
const rateLimitResponse = (res, message = 'Demasiadas solicitudes', retryAfter = 60) => {
  const response = {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message,
    timestamp: new Date().toISOString(),
    statusCode: 429,
    retry_after: retryAfter,
    retry_after_human: `${retryAfter} segundos`
  };
  
  // Agregar header de retry-after
  res.set('Retry-After', retryAfter.toString());
  
  console.warn(`[RESPONSE] ⚠️  429 - Rate limit exceeded. Retry after: ${retryAfter}s`);
  
  return res.status(429).json(response);
};

// 📊 **RESPUESTAS ESPECIALIZADAS**

// Respuesta de procesamiento de archivo
const fileProcessedResponse = (res, processingResult, message = 'Archivo procesado exitosamente') => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    statusCode: 200,
    processing: {
      filename: processingResult.filename,
      totalRecords: processingResult.totalRecords,
      processedRecords: processingResult.processedRecords,
      newRecords: processingResult.newRecords,
      duplicateRecords: processingResult.duplicateRecords,
      errorRecords: processingResult.errorRecords,
      processingTime: processingResult.processingTime
    },
    statistics: {
      successRate: processingResult.totalRecords > 0 ? 
        Math.round((processingResult.processedRecords / processingResult.totalRecords) * 100 * 100) / 100 : 0,
      duplicateRate: processingResult.totalRecords > 0 ?
        Math.round((processingResult.duplicateRecords / processingResult.totalRecords) * 100 * 100) / 100 : 0,
      errorRate: processingResult.totalRecords > 0 ?
        Math.round((processingResult.errorRecords / processingResult.totalRecords) * 100 * 100) / 100 : 0
    }
  };
  
  // Agregar alertas si hay problemas
  if (processingResult.errorRecords > 0) {
    response.alerts = [{
      type: 'warning',
      message: `Se encontraron ${processingResult.errorRecords} registros con errores`,
      action: 'Revisar logs de validación para detalles'
    }];
  }
  
  // Agregar información de período si está disponible
  if (processingResult.dateInfo) {
    response.period = {
      year: processingResult.dateInfo.año,
      months: processingResult.dateInfo.meses,
      isAnnual: processingResult.dateInfo.esArchivoAnual
    };
  }
  
  console.log(`[RESPONSE] ✅ 200 - File processed: ${processingResult.newRecords} new records`);
  
  return res.status(200).json(response);
};

// Respuesta de búsqueda con paginación
const searchResponse = (res, results, query, totalCount, page = 1, limit = 20) => {
  const hasNext = (page * limit) < totalCount;
  const hasPrev = page > 1;
  const totalPages = Math.ceil(totalCount / limit);
  
  const response = {
    success: true,
    message: `Búsqueda completada: ${totalCount} resultados encontrados`,
    timestamp: new Date().toISOString(),
    statusCode: 200,
    data: results,
    search: {
      query: query,
      total_results: totalCount,
      returned_results: results.length,
      search_time: null // Se puede agregar externamente
    },
    pagination: {
      current_page: page,
      total_pages: totalPages,
      per_page: limit,
      total_items: totalCount,
      has_next: hasNext,
      has_prev: hasPrev,
      next_page: hasNext ? page + 1 : null,
      prev_page: hasPrev ? page - 1 : null
    }
  };
  
  console.log(`[RESPONSE] ✅ 200 - Search completed: ${results.length}/${totalCount} results`);
  
  return res.status(200).json(response);
};

// Respuesta de dashboard con métricas
const dashboardResponse = (res, dashboardData, message = 'Datos del dashboard obtenidos') => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    statusCode: 200,
    dashboard: dashboardData,
    meta: {
      data_freshness: 'real-time',
      cache_status: dashboardData.fromCache ? 'cached' : 'fresh',
      generation_time: dashboardData.queryTime || null
    }
  };
  
  // Agregar alertas si hay métricas críticas
  if (dashboardData.resumen && dashboardData.resumen.alertasRojas > 0) {
    response.critical_alerts = {
      count: dashboardData.resumen.alertasRojas,
      message: `Se encontraron ${dashboardData.resumen.alertasRojas} alertas críticas`,
      action_required: true
    };
  }
  
  console.log(`[RESPONSE] ✅ 200 - Dashboard data: ${dashboardData.resumen?.totalInspecciones || 0} inspections`);
  
  return res.status(200).json(response);
};

// 📄 **RESPUESTAS DE ARCHIVOS**

// Respuesta de descarga de archivo
const fileDownloadResponse = (res, fileBuffer, filename, mimeType = 'application/octet-stream') => {
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', fileBuffer.length);
  
  console.log(`[RESPONSE] ✅ File download: ${filename} (${Math.round(fileBuffer.length / 1024)}KB)`);
  
  return res.end(fileBuffer);
};

// 🔧 **UTILIDADES DE RESPUESTA**

// Agregar headers de seguridad estándar
const addSecurityHeaders = (res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return res;
};

// Agregar headers CORS personalizados
const addCorsHeaders = (res, origin = '*') => {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  return res;
};

// 📊 **RESPUESTAS DE STATUS**

// Respuesta de health check
const healthResponse = (res, healthData) => {
  const isHealthy = healthData.status === 'OK' || healthData.status === 'healthy';
  const statusCode = isHealthy ? 200 : 503;
  
  const response = {
    success: isHealthy,
    status: healthData.status,
    timestamp: new Date().toISOString(),
    statusCode,
    health: healthData,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  console.log(`[RESPONSE] ${isHealthy ? '✅' : '❌'} ${statusCode} - Health check: ${healthData.status}`);
  
  return res.status(statusCode).json(response);
};

// Respuesta de información del sistema
const infoResponse = (res, systemInfo) => {
  const response = {
    success: true,
    message: 'Información del sistema',
    timestamp: new Date().toISOString(),
    statusCode: 200,
    system: {
      ...systemInfo,
      server_time: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      node_version: process.version
    }
  };
  
  console.log(`[RESPONSE] ✅ 200 - System info provided`);
  
  return res.status(200).json(response);
};

// 🧪 **RESPUESTAS DE TESTING**

// Respuesta de test exitoso
const testResponse = (res, testData, testName = 'Test genérico') => {
  const response = {
    success: true,
    message: `${testName} ejecutado exitosamente`,
    timestamp: new Date().toISOString(),
    statusCode: 200,
    test: {
      name: testName,
      status: 'PASSED',
      data: testData,
      environment: process.env.NODE_ENV || 'development'
    }
  };
  
  console.log(`[RESPONSE] ✅ 200 - Test passed: ${testName}`);
  
  return res.status(200).json(response);
};

// 📈 **UTILIDADES DE MÉTRICAS**

// Calcular estadísticas de respuesta
const calculateResponseStats = (data) => {
  if (!data || !Array.isArray(data)) {
    return { count: 0, type: typeof data };
  }
  
  return {
    count: data.length,
    type: 'array',
    first_item: data[0] || null,
    last_item: data[data.length - 1] || null,
    sample_size: Math.min(data.length, 3)
  };
};

// Formatear tiempo de respuesta
const formatResponseTime = (startTime) => {
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  if (responseTime < 1000) {
    return `${responseTime}ms`;
  } else {
    return `${(responseTime / 1000).toFixed(2)}s`;
  }
};

// 📤 **MIDDLEWARE DE RESPUESTA**

// Middleware para agregar información común a todas las respuestas
const enhanceResponse = (req, res, next) => {
  // Agregar timestamp al objeto res para tracking
  res.locals.startTime = Date.now();
  
  // Función helper para respuestas rápidas
  res.sendSuccess = (data, message) => successResponse(res, data, message);
  res.sendError = (errorCode, message, statusCode) => errorResponse(res, errorCode, message, statusCode);
  
  next();
};

// 📤 **EXPORTACIONES**
module.exports = {
  // Respuestas exitosas
  successResponse,
  createdResponse,
  updatedResponse,
  deletedResponse,
  
  // Respuestas de error
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  rateLimitResponse,
  
  // Respuestas especializadas
  fileProcessedResponse,
  searchResponse,
  dashboardResponse,
  fileDownloadResponse,
  
  // Respuestas de status
  healthResponse,
  infoResponse,
  testResponse,
  
  // Utilidades
  addSecurityHeaders,
  addCorsHeaders,
  calculateResponseStats,
  formatResponseTime,
  enhanceResponse
};