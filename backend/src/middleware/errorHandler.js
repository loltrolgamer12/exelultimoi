// ❌ MIDDLEWARE DE MANEJO DE ERRORES V2.0
// src/middleware/errorHandler.js

const fs = require('fs');
const path = require('path');

// 📊 **CLASE PARA ERRORES PERSONALIZADOS**
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 🔧 **MANEJADOR PRINCIPAL DE ERRORES**
const errorHandler = (err, req, res, next) => {
  console.log('[ERROR-HANDLER] ❌ Error capturado:', {
    message: err.message,
    statusCode: err.statusCode,
    errorCode: err.errorCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Preparar la respuesta de error base
  let error = {
    success: false,
    error: err.errorCode || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Error interno del servidor',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Agregar detalles si están disponibles y no estamos en producción
  if (err.details && process.env.NODE_ENV !== 'production') {
    error.details = err.details;
  }

  // Determinar código de estado HTTP
  let statusCode = err.statusCode || 500;

  // 🗄️ **ERRORES DE PRISMA/BASE DE DATOS**
  if (err.name === 'PrismaClientKnownRequestError') {
    error = handlePrismaError(err);
    statusCode = 400;
  } else if (err.name === 'PrismaClientUnknownRequestError') {
    error.error = 'DATABASE_CONNECTION_ERROR';
    error.message = 'Error de conexión con la base de datos';
    statusCode = 503; // Service Unavailable
  } else if (err.name === 'PrismaClientValidationError') {
    error.error = 'DATABASE_VALIDATION_ERROR';
    error.message = 'Error de validación en la base de datos';
    statusCode = 400;
  }
  
  // 📁 **ERRORES DE ARCHIVOS/MULTER**
  else if (err.code === 'LIMIT_FILE_SIZE') {
    error.error = 'ARCHIVO_MUY_GRANDE';
    error.message = 'El archivo excede el tamaño máximo permitido';
    statusCode = 413; // Payload Too Large
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    error.error = 'DEMASIADOS_ARCHIVOS';
    error.message = 'Se excedió el número máximo de archivos permitidos';
    statusCode = 400;
  }
  
  // 🔐 **ERRORES DE AUTENTICACIÓN/AUTORIZACIÓN**
  else if (err.name === 'JsonWebTokenError') {
    error.error = 'TOKEN_INVALIDO';
    error.message = 'Token de autenticación inválido';
    statusCode = 401;
  } else if (err.name === 'TokenExpiredError') {
    error.error = 'TOKEN_EXPIRADO';
    error.message = 'Token de autenticación expirado';
    statusCode = 401;
  }
  
  // 📊 **ERRORES DE VALIDACIÓN**
  else if (err.name === 'ValidationError') {
    error.error = 'VALIDATION_ERROR';
    error.message = 'Error de validación de datos';
    error.details = err.details || {};
    statusCode = 400;
  }
  
  // 🌐 **ERRORES DE RED/TIMEOUT**
  else if (err.code === 'ETIMEDOUT') {
    error.error = 'REQUEST_TIMEOUT';
    error.message = 'La solicitud ha excedido el tiempo límite';
    statusCode = 408;
  } else if (err.code === 'ECONNREFUSED') {
    error.error = 'CONNECTION_REFUSED';
    error.message = 'No se pudo conectar con el servicio solicitado';
    statusCode = 503;
  }
  
  // 📈 **ERRORES DE RATE LIMITING**
  else if (err.type === 'entity.too.large') {
    error.error = 'PAYLOAD_TOO_LARGE';
    error.message = 'El tamaño de los datos enviados es demasiado grande';
    statusCode = 413;
  }
  
  // 🔍 **ERRORES DE RECURSOS NO ENCONTRADOS**
  else if (err.name === 'CastError') {
    error.error = 'RESOURCE_NOT_FOUND';
    error.message = `Recurso no encontrado con ID: ${err.value}`;
    statusCode = 404;
  }

  // 📊 **AGREGAR INFORMACIÓN DE DEBUGGING EN DESARROLLO**
  if (process.env.NODE_ENV !== 'production') {
    error.stack = err.stack;
    error.originalError = {
      name: err.name,
      code: err.code,
      statusCode: err.statusCode
    };
    
    // Log completo en consola para desarrollo
    console.error('[ERROR-HANDLER] 🔍 Stack trace completo:', err.stack);
    
    if (err.details) {
      console.error('[ERROR-HANDLER] 📊 Detalles adicionales:', err.details);
    }
  }

  // 📝 **LOGGING DE ERRORES**
  logError(err, req, error);

  // 📧 **NOTIFICACIÓN DE ERRORES CRÍTICOS (futuro)**
  if (statusCode >= 500) {
    notifyCriticalError(err, req, error);
  }

  // 📊 **INCREMENTAR MÉTRICAS DE ERRORES (futuro)**
  incrementErrorMetrics(error.error, statusCode);

  // 🚨 **RESPUESTA FINAL AL CLIENTE**
  res.status(statusCode).json(error);
};

// 🗄️ **MANEJO ESPECÍFICO DE ERRORES DE PRISMA**
const handlePrismaError = (err) => {
  let error = {
    success: false,
    error: 'DATABASE_ERROR',
    message: 'Error en la base de datos',
    timestamp: new Date().toISOString()
  };

  switch (err.code) {
    case 'P2002':
      // Violación de constraint único
      error.error = 'DUPLICATE_ENTRY';
      error.message = 'Ya existe un registro con estos datos';
      if (err.meta?.target) {
        error.duplicateField = err.meta.target;
        error.message = `Ya existe un registro con ${err.meta.target.join(', ')}`;
      }
      break;

    case 'P2025':
      // Registro no encontrado
      error.error = 'RECORD_NOT_FOUND';
      error.message = 'El registro solicitado no fue encontrado';
      break;

    case 'P2003':
      // Violación de foreign key
      error.error = 'FOREIGN_KEY_CONSTRAINT';
      error.message = 'No se puede completar la operación debido a restricciones de datos relacionados';
      break;

    case 'P2004':
      // Constraint fallido
      error.error = 'CONSTRAINT_FAILED';
      error.message = 'Los datos no cumplen con las restricciones requeridas';
      break;

    case 'P2011':
      // Null constraint violation
      error.error = 'REQUIRED_FIELD_MISSING';
      error.message = 'Faltan campos requeridos';
      if (err.meta?.constraint) {
        error.missingField = err.meta.constraint;
      }
      break;

    case 'P2012':
      // Missing required value
      error.error = 'MISSING_REQUIRED_VALUE';
      error.message = 'Falta un valor requerido';
      break;

    case 'P2014':
      // Relation violation
      error.error = 'RELATION_VIOLATION';
      error.message = 'La operación violaría una relación existente';
      break;

    case 'P1001':
      // Can't reach database server
      error.error = 'DATABASE_UNREACHABLE';
      error.message = 'No se puede conectar con la base de datos';
      break;

    case 'P1002':
      // Database server timeout
      error.error = 'DATABASE_TIMEOUT';
      error.message = 'La base de datos no responde en el tiempo esperado';
      break;

    default:
      error.error = 'DATABASE_UNKNOWN_ERROR';
      error.message = 'Error desconocido en la base de datos';
      error.prismaCode = err.code;
  }

  // Agregar información específica en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    error.prismaDetails = {
      code: err.code,
      meta: err.meta,
      clientVersion: err.clientVersion
    };
  }

  return error;
};

// 📝 **FUNCIÓN DE LOGGING DE ERRORES**
const logError = (err, req, errorResponse) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: errorResponse.error === 'INTERNAL_SERVER_ERROR' ? 'ERROR' : 'WARN',
      message: err.message,
      errorCode: errorResponse.error,
      statusCode: err.statusCode || 500,
      request: {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        body: req.method === 'POST' ? sanitizeRequestBody(req.body) : undefined
      },
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    };

    // Log a consola con formato estructurado
    console.error('[ERROR-LOG]', JSON.stringify(logEntry, null, 2));

    // TODO: En producción, enviar logs a servicio externo (LogRocket, Sentry, etc.)
    if (process.env.NODE_ENV === 'production') {
      // sendToExternalLoggingService(logEntry);
    }

    // Guardar logs críticos en archivo local (opcional)
    if (logEntry.statusCode >= 500) {
      saveErrorToFile(logEntry);
    }

  } catch (logError) {
    console.error('[ERROR-LOG] ❌ Error logging the error:', logError.message);
  }
};

// 🔒 **SANITIZAR DATOS SENSIBLES EN LOGS**
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...body };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

// 💾 **GUARDAR ERRORES CRÍTICOS EN ARCHIVO**
const saveErrorToFile = async (logEntry) => {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    
    // Crear directorio de logs si no existe
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logLine = `${JSON.stringify(logEntry)}\n`;
    fs.appendFileSync(logFile, logLine);
    
  } catch (fileError) {
    console.error('[ERROR-LOG] ❌ No se pudo guardar error en archivo:', fileError.message);
  }
};

// 📧 **NOTIFICACIÓN DE ERRORES CRÍTICOS**
const notifyCriticalError = async (err, req, errorResponse) => {
  try {
    // TODO: Implementar sistema de notificaciones
    // - Email a administradores
    // - Slack/Teams webhook
    // - SMS para errores muy críticos
    
    console.warn('[ERROR-HANDLER] 🚨 Error crítico detectado - Notificaciones deshabilitadas');
    
    // Placeholder para notificación por email
    if (process.env.SMTP_HOST && process.env.NOTIFICATION_EMAIL) {
      // await sendCriticalErrorEmail(err, req, errorResponse);
    }
    
    // Placeholder para webhook de Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      // await sendSlackNotification(err, req, errorResponse);
    }
    
  } catch (notificationError) {
    console.error('[ERROR-HANDLER] ❌ Error enviando notificación:', notificationError.message);
  }
};

// 📊 **INCREMENTAR MÉTRICAS DE ERRORES**
const incrementErrorMetrics = (errorCode, statusCode) => {
  try {
    // TODO: Integrar con sistema de métricas (Prometheus, DataDog, etc.)
    
    // Por ahora, solo logging básico
    console.log(`[METRICS] Error incrementado: ${errorCode} (${statusCode})`);
    
  } catch (metricsError) {
    console.error('[ERROR-HANDLER] ❌ Error incrementando métricas:', metricsError.message);
  }
};

// 🔧 **MANEJADORES ESPECIALIZADOS**

// Manejo de errores asincrónicos no capturados
const handleAsyncError = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Manejo de errores 404 - Recurso no encontrado
const handle404 = (req, res, next) => {
  const error = new AppError(
    `No se encontró la ruta ${req.originalUrl} en este servidor`,
    404,
    'ROUTE_NOT_FOUND',
    {
      method: req.method,
      path: req.originalUrl,
      availableRoutes: [
        '/api/health',
        '/api/upload/*',
        '/api/search/*',
        '/api/dashboard/*'
      ]
    }
  );
  
  next(error);
};

// Manejo de errores de parsing JSON
const handleJSONError = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const error = new AppError(
      'Formato JSON inválido en el cuerpo de la petición',
      400,
      'INVALID_JSON',
      {
        position: err.body ? `cerca de "${err.body.substring(0, 100)}..."` : 'desconocida'
      }
    );
    
    return next(error);
  }
  
  next(err);
};

// 🧹 **LIMPIEZA DE RECURSOS**
const cleanup = () => {
  console.log('[ERROR-HANDLER] 🧹 Limpiando recursos de manejo de errores...');
  
  // TODO: Cerrar conexiones, limpiar timers, etc.
};

// 🔧 **CONFIGURACIÓN DE MANEJO DE PROCESOS**
const setupProcessHandlers = () => {
  // Manejo de promesas rechazadas no capturadas
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[ERROR-HANDLER] 🚨 Unhandled Promise Rejection:', reason);
    console.error('[ERROR-HANDLER] 📍 Promise:', promise);
    
    // TODO: Log a servicio externo
    // En un entorno de producción, podríamos querer cerrar el proceso gracefully
    if (process.env.NODE_ENV === 'production') {
      console.error('[ERROR-HANDLER] 🛑 Cerrando proceso debido a unhandled rejection...');
      cleanup();
      process.exit(1);
    }
  });
  
  // Manejo de excepciones no capturadas
  process.on('uncaughtException', (error) => {
    console.error('[ERROR-HANDLER] 🚨 Uncaught Exception:', error);
    console.error('[ERROR-HANDLER] 📍 Stack:', error.stack);
    
    // TODO: Log a servicio externo
    // Las uncaught exceptions requieren cerrar el proceso
    console.error('[ERROR-HANDLER] 🛑 Cerrando proceso debido a uncaught exception...');
    cleanup();
    process.exit(1);
  });
  
  // Manejo de señales de terminación
  process.on('SIGTERM', () => {
    console.log('[ERROR-HANDLER] 📡 SIGTERM recibido. Cerrando gracefully...');
    cleanup();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('[ERROR-HANDLER] 📡 SIGINT recibido. Cerrando gracefully...');
    cleanup();
    process.exit(0);
  });
};

// 📊 **ESTADÍSTICAS DE ERRORES**
const getErrorStats = () => {
  // TODO: Implementar recolección de estadísticas de errores
  return {
    totalErrors: 0,
    errorsByCode: {},
    errorsByStatus: {},
    lastError: null,
    uptimeWithoutCriticalErrors: process.uptime()
  };
};

// 🧪 **UTILIDADES PARA TESTING**
const createTestError = (type = 'generic') => {
  switch (type) {
    case 'database':
      return new AppError('Error de prueba de base de datos', 500, 'TEST_DATABASE_ERROR');
    case 'validation':
      return new AppError('Error de prueba de validación', 400, 'TEST_VALIDATION_ERROR');
    case 'not_found':
      return new AppError('Recurso de prueba no encontrado', 404, 'TEST_NOT_FOUND');
    default:
      return new AppError('Error de prueba genérico', 500, 'TEST_GENERIC_ERROR');
  }
};

// 📤 **EXPORTACIONES**
module.exports = {
  AppError,
  errorHandler,
  handleAsyncError,
  handle404,
  handleJSONError,
  setupProcessHandlers,
  getErrorStats,
  createTestError,
  cleanup
};