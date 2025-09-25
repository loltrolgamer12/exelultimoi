// 🌐 CONFIGURACIÓN CORS AVANZADA
// src/config/cors.js

const cors = require('cors');

// 🔧 Configuración de entorno
const isDevelopment = process.env.NODE_ENV !== 'production';
const FRONTEND_URL = process.env.FRONTEND_URL;
const ADDITIONAL_ORIGINS = process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(',') || [];

console.log('[CORS] Configurando CORS...');
console.log('[CORS] NODE_ENV:', process.env.NODE_ENV);
console.log('[CORS] FRONTEND_URL:', FRONTEND_URL);
console.log('[CORS] ADDITIONAL_ORIGINS:', ADDITIONAL_ORIGINS);

// 📋 Lista de orígenes permitidos
const allowedOrigins = [
  // URLs de desarrollo
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://127.0.0.1:3000',
  
  // URLs de producción conocidas
  'https://v0-vehicle-inspection-system.vercel.app',
  'https://sistema-hq-fo-40.vercel.app',
  
  // URL del frontend principal (desde variable de entorno)
  FRONTEND_URL,
  
  // URLs adicionales desde variables de entorno
  ...ADDITIONAL_ORIGINS.filter(Boolean),
  
  // Patrones para v0.dev y Vercel
  ...(isDevelopment ? [
    /^https:\/\/.*\.v0\.dev$/,
    /^https:\/\/.*\.vercel\.app$/,
    /^http:\/\/localhost:\d+$/
  ] : [])
].filter(Boolean); // Remover valores undefined/null

console.log('[CORS] Orígenes permitidos:', allowedOrigins);

// ⚙️ Configuración CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej: aplicaciones móviles, Postman)
    if (!origin) {
      console.log('[CORS] Request sin origin - PERMITIDO');
      return callback(null, true);
    }
    
    console.log('[CORS] Verificando origin:', origin);
    
    // Verificar si el origin está en la lista de permitidos
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      console.log('[CORS] Origin PERMITIDO:', origin);
      callback(null, true);
    } else {
      console.warn('[CORS] Origin BLOQUEADO:', origin);
      console.warn('[CORS] Orígenes permitidos:', allowedOrigins);
      
      if (isDevelopment) {
        // En desarrollo, ser más permisivo y solo advertir
        console.warn('[CORS] ⚠️  DEVELOPMENT MODE - Permitiendo origin no listado');
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} no está permitido`));
      }
    }
  },
  
  // 📝 Métodos HTTP permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  
  // 📋 Headers permitidos
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-Upload-Progress',
    'X-File-Name',
    'X-File-Size'
  ],
  
  // 📤 Headers expuestos al cliente
  exposedHeaders: [
    'X-Total-Count',
    'X-Upload-Progress',
    'X-Processing-Time',
    'X-Validation-Errors'
  ],
  
  // 🍪 Permitir cookies y credenciales
  credentials: true,
  
  // ⏱️ Cache de preflight requests (24 horas)
  maxAge: isDevelopment ? 0 : 86400,
  
  // 🚀 Optimización para preflight
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// 📊 Middleware de logging para CORS
const corsMiddleware = cors(corsOptions);

const corsWithLogging = (req, res, next) => {
  // Log detallado de requests CORS
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Preflight request - Origin: ${req.headers.origin}, Method: ${req.headers['access-control-request-method']}`);
  }
  
  // Aplicar CORS
  corsMiddleware(req, res, (err) => {
    if (err) {
      console.error('[CORS] Error:', err.message);
      
      // Respuesta de error CORS personalizada
      return res.status(403).json({
        error: 'CORS_ERROR',
        message: 'Origen no permitido por política CORS',
        origin: req.headers.origin,
        allowed_origins: allowedOrigins.filter(o => typeof o === 'string'),
        timestamp: new Date().toISOString(),
        help: isDevelopment ? 
          'Verifica que tu frontend esté ejecutándose desde uno de los orígenes permitidos' :
          'Contacta al administrador para agregar tu dominio a los orígenes permitidos'
      });
    }
    
    // Headers adicionales para debugging
    if (isDevelopment) {
      res.setHeader('X-CORS-Debug', 'enabled');
      res.setHeader('X-Allowed-Origins', allowedOrigins.filter(o => typeof o === 'string').join(', '));
    }
    
    next();
  });
};

// 🧪 Función de utilidad para testing CORS
const testCORS = (origin) => {
  console.log(`[CORS-TEST] Testing origin: ${origin}`);
  
  const isAllowed = allowedOrigins.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') {
      return allowedOrigin === origin;
    } else if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }
    return false;
  });
  
  console.log(`[CORS-TEST] Result: ${isAllowed ? 'ALLOWED' : 'BLOCKED'}`);
  return isAllowed;
};

// 📊 Estadísticas de CORS
const corsStats = {
  allowedRequests: 0,
  blockedRequests: 0,
  preflightRequests: 0
};

// Interceptar para estadísticas
const originalCorsMiddleware = corsMiddleware;
corsMiddleware = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    corsStats.preflightRequests++;
  }
  
  originalCorsMiddleware(req, res, (err) => {
    if (err) {
      corsStats.blockedRequests++;
    } else {
      corsStats.allowedRequests++;
    }
    next(err);
  });
};

module.exports = corsWithLogging;
module.exports.testCORS = testCORS;
module.exports.corsStats = corsStats;
module.exports.allowedOrigins = allowedOrigins;