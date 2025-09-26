// 📄 ARCHIVO: backend/server.js
// 🔧 Servidor principal corregido

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 🔧 **CONFIGURACIÓN DE CORS**
console.log('[CORS] Configurando CORS...');
console.log('[CORS] NODE_ENV:', process.env.NODE_ENV);
console.log('[CORS] FRONTEND_URL:', process.env.FRONTEND_URL);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://v0-vehicle-inspection-system.vercel.app',
  'https://sistema-hq-fo-40.vercel.app',
  /^https:\/\/.*\.v0\.dev$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

if (process.env.ADDITIONAL_ORIGINS) {
  const additionalOrigins = process.env.ADDITIONAL_ORIGINS.split(',');
  allowedOrigins.push(...additionalOrigins);
}

console.log('[CORS] Orígenes permitidos:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      console.log('[CORS] ✅ Origen permitido:', origin);
      callback(null, true);
    } else {
      console.log('[CORS] ❌ Origen bloqueado:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 🔧 **MIDDLEWARE DE SEGURIDAD**
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(compression());

// Activar trust proxy para X-Forwarded-For y rate-limit
app.set('trust proxy', true);

// 📊 **RATE LIMITING GLOBAL**
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Límite por IP
  message: {
    success: false,
    error: 'RATE_LIMIT',
    message: 'Demasiadas solicitudes desde esta IP'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

// 🔧 **CONFIGURACIÓN DE PARSERS**
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain']
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb'
}));

// 🔧 **CONFIGURACIÓN DE BASE DE DATOS**
console.log('[DB] Creando cliente Prisma...');
const { getPrismaClient } = require('./src/config/database');

try {
  const prisma = getPrismaClient();
  console.log('[DB] ✅ Cliente Prisma configurado correctamente');
  
  // Test de conexión
  prisma.$connect()
    .then(() => console.log('[DB] ✅ Conexión a base de datos establecida'))
    .catch(err => console.error('[DB] ❌ Error conectando a BD:', err.message));
} catch (error) {
  console.error('[DB] ❌ Error configurando Prisma:', error.message);
}

// 📊 **MIDDLEWARE DE LOGGING**
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// 🛣️ **CONFIGURACIÓN DE RUTAS**

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Rutas principales
try {
  console.log('[ROUTES] Configurando rutas...');
  
  // 📤 Rutas de upload
  const uploadRoutes = require('./src/routes/upload');
  app.use('/api/upload', uploadRoutes);
  console.log('[ROUTES] ✅ Rutas de upload configuradas: /api/upload');
  
  // 🔍 Otras rutas (agregar según necesidad)
  // const inspectionRoutes = require('./src/routes/inspections');
  // app.use('/api/inspections', inspectionRoutes);
  
  // 📊 Ruta de información de API
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'API del Sistema de Inspecciones Vehiculares HQ-FO-40',
      version: '2.0.0',
      endpoints: {
        upload: '/api/upload',
        health: '/health'
      },
      documentation: 'https://docs.example.com', // TODO: Agregar documentación real
      timestamp: new Date().toISOString()
    });
  });
  
  // Rutas de dashboard (widgets y kpis)
  app.get('/api/dashboard/widgets', (req, res) => {
    res.json({ widgets: [] }); // Devuelve tu lógica real aquí
  });

  app.get('/api/dashboard/kpis', (req, res) => {
    res.json({ kpis: [] }); // Devuelve tu lógica real aquí
  });
  
} catch (error) {
  console.error('[ROUTES] ❌ Error configurando rutas:', error);
  process.exit(1);
}

// 🔧 **MIDDLEWARE DE MANEJO DE ERRORES GLOBAL**
app.use((error, req, res, next) => {
  console.error('[SERVER] ❌ Error no manejado:', error);
  
  // Error de CORS
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS_ERROR',
      message: 'Origen no permitido por política CORS'
    });
  }
  
  // Error de parsing JSON
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_JSON',
      message: 'JSON mal formado en el cuerpo de la solicitud'
    });
  }
  
  // Error genérico
  const statusCode = error.status || error.statusCode || 500;
  const errorResponse = {
    success: false,
    error: 'SERVER_ERROR',
    message: error.message || 'Error interno del servidor',
    timestamp: new Date().toISOString()
  };
  
  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }
  
  res.status(statusCode).json(errorResponse);
});

// 🔧 **MANEJO DE RUTAS NO ENCONTRADAS**
app.use((req, res) => {
  console.log(`[SERVER] ❌ Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Ruta ${req.method} ${req.path} no encontrada`,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'POST /api/upload/validate',
      'POST /api/upload/process',
      'GET /api/upload/history',
      'GET /api/upload/stats'
    ]
  });
});

// 🚀 **INICIO DEL SERVIDOR**
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 =====================================');
  console.log(`🚀 Servidor iniciado exitosamente`);
  console.log(`🚀 Puerto: ${PORT}`);
  console.log(`🚀 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Tiempo: ${new Date().toLocaleString()}`);
  console.log('🚀 =====================================\n');
  
  console.log('📋 Endpoints disponibles:');
  console.log(`   ✅ Health Check: http://localhost:${PORT}/health`);
  console.log(`   ✅ API Info: http://localhost:${PORT}/api`);
  console.log(`   📤 Upload Validate: http://localhost:${PORT}/api/upload/validate`);
  console.log(`   📤 Upload Process: http://localhost:${PORT}/api/upload/process`);
  console.log(`   📊 Upload History: http://localhost:${PORT}/api/upload/history`);
  console.log(`   📊 Upload Stats: http://localhost:${PORT}/api/upload/stats\n`);
});

// 🔧 **MANEJO DE CIERRE GRACEFUL**
process.on('SIGTERM', async () => {
  console.log('\n[SERVER] 🔄 Recibida señal SIGTERM, cerrando servidor...');
  
  server.close(async () => {
    console.log('[SERVER] ✅ Servidor HTTP cerrado');
    
    try {
      const prisma = getPrismaClient();
      await prisma.$disconnect();
      console.log('[DB] ✅ Conexión a BD cerrada');
    } catch (error) {
      console.error('[DB] ❌ Error cerrando conexión:', error);
    }
    
    console.log('[SERVER] 👋 Proceso terminado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n[SERVER] 🔄 Recibida señal SIGINT (Ctrl+C), cerrando servidor...');
  
  server.close(async () => {
    try {
      const prisma = getPrismaClient();
      await prisma.$disconnect();
      console.log('[DB] ✅ Conexión a BD cerrada');
    } catch (error) {
      console.error('[DB] ❌ Error cerrando conexión:', error);
    }
    
    console.log('[SERVER] 👋 Servidor cerrado correctamente');
    process.exit(0);
  });
});

// 🔧 **MANEJO DE ERRORES NO CAPTURADOS**
process.on('uncaughtException', (error) => {
  console.error('[SERVER] 💥 Excepción no capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] 💥 Promise rechazada no manejada:', reason);
  console.error('[SERVER] 💥 En promise:', promise);
  process.exit(1);
});

module.exports = app;