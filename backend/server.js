// 🚀 SERVIDOR PRINCIPAL - SISTEMA HQ-FO-40 V2.0
// server.js

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// 📁 Importaciones internas
const corsConfig = require('./src/config/cors');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');
const errorHandler = require('./src/middleware/errorHandler');

// 📍 Rutas
const uploadRoutes = require('./src/routes/upload');
const searchRoutes = require('./src/routes/search');
const dashboardRoutes = require('./src/routes/dashboard');

// 🔧 Configuración de entorno
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 🛡️ Middleware de seguridad
app.use(helmet({
  crossOriginResourcePolicy: false, // Permitir recursos de diferentes orígenes
  contentSecurityPolicy: false     // Desactivar CSP para permitir uploads
}));

// 📦 Middleware de compresión para archivos grandes
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Solo comprimir archivos > 1KB
  level: 6         // Nivel de compresión balanceado
}));

// 🌐 CORS con configuración avanzada
app.use(corsConfig);

// 📊 Rate limiting más permisivo para archivos grandes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Más requests en desarrollo
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Excluir health check del rate limiting
  skip: (req) => req.path === '/api/health'
});

app.use('/api/', limiter);

// 📥 Parser de JSON con límite aumentado para archivos grandes
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 50000
}));

// 📝 Logging de requests en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    if (req.method === 'POST' && req.body) {
      console.log('Body keys:', Object.keys(req.body));
    }
    next();
  });
}

// 🏥 Health Check mejorado
app.get('/api/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Verificar conexión a base de datos
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;
    
    await prisma.$disconnect();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      },
      api: {
        version: '2.0.0',
        name: 'Sistema HQ-FO-40'
      }
    });
  } catch (error) {
    console.error('[HEALTH-CHECK] Error:', error);
    res.status(503).json({
      status: 'ERROR',
      message: 'Service unavailable',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 Endpoint de información del sistema
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Sistema HQ-FO-40 API',
    version: '2.0.0',
    description: 'Sistema de Inspecciones Vehiculares con Detección de Fatiga',
    features: {
      excel_processing: 'Archivos anuales completos',
      fatigue_detection: 'Detección avanzada de fatiga del conductor',
      duplicate_validation: 'Validación inteligente de duplicados',
      real_time_alerts: 'Alertas rojas y advertencias en tiempo real'
    },
    endpoints: {
      health: '/api/health',
      upload: '/api/upload',
      search: '/api/search',
      dashboard: '/api/dashboard'
    },
    new_features_v2: {
      fatigue_questions: [
        '¿Ha consumido medicamentos o sustancias que afecten su estado de alerta?',
        '¿Ha dormido al menos 7 horas en las últimas 24 horas?',
        '¿Se encuentra libre de síntomas de fatiga?',
        '¿Se siente en condiciones físicas y mentales para conducir?'
      ],
      alert_levels: {
        red_alert: 'Consumo de medicamentos/sustancias',
        warnings: 'Problemas de sueño, fatiga o aptitud'
      }
    }
  });
});

// 📍 Registro de rutas principales
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);  
app.use('/api/dashboard', dashboardRoutes);

// 🔍 Ruta de fallback para rutas no encontradas
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'ENDPOINT_NOT_FOUND',
    message: `Endpoint ${req.originalUrl} no encontrado`,
    availableEndpoints: [
      '/api/health',
      '/api/info',
      '/api/upload/excel',
      '/api/search/inspections',
      '/api/dashboard/stats'
    ]
  });
});

// ⚠️ Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// 🚀 Inicialización del servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    console.log('🔗 Conectando a la base de datos...');
    await connectDatabase();
    console.log('✅ Base de datos conectada exitosamente');
    
    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log('🚀 ==========================================');
      console.log(`🚀 SISTEMA HQ-FO-40 V2.0 INICIADO`);
      console.log(`🚀 Puerto: ${PORT}`);
      console.log(`🚀 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 API URL: http://localhost:${PORT}/api`);
      console.log(`🚀 Health Check: http://localhost:${PORT}/api/health`);
      console.log('🚀 ==========================================');
    });
    
    // 🛑 Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  Señal ${signal} recibida. Iniciando cierre graceful...`);
      
      server.close(async () => {
        console.log('🔌 Servidor HTTP cerrado');
        
        try {
          await disconnectDatabase();
          console.log('🔗 Base de datos desconectada');
        } catch (error) {
          console.error('❌ Error al cerrar la base de datos:', error);
        }
        
        console.log('✅ Cierre graceful completado');
        process.exit(0);
      });
      
      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.error('❌ Forzando cierre del proceso...');
        process.exit(1);
      }, 10000);
    };
    
    // Escuchar señales de cierre
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Solo iniciar el servidor si este archivo se ejecuta directamente
if (require.main === module) {
  startServer();
}

module.exports = app;