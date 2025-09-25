// 🔍 RUTAS DE BÚSQUEDA V2.0
// src/routes/search.js

const express = require('express');
const SearchController = require('../controllers/searchController');
const { validateSearchParams } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const searchController = new SearchController();

// 📊 Rate limiting para búsquedas
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 búsquedas por minuto
  message: {
    error: 'SEARCH_RATE_LIMIT',
    message: 'Demasiadas búsquedas. Máximo 60 por minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 🔧 Middleware de logging
router.use((req, res, next) => {
  console.log(`[SEARCH-ROUTE] ${req.method} ${req.path} - Query:`, Object.keys(req.query));
  next();
});

// 📋 **RUTAS PRINCIPALES DE BÚSQUEDA**

// 🔍 GET /api/search/inspections - Búsqueda general de inspecciones
router.get('/inspections',
  searchLimiter,
  validateSearchParams,
  searchController.searchInspections.bind(searchController)
);

// 🎯 POST /api/search/advanced - Búsqueda avanzada con criterios complejos
router.post('/advanced',
  searchLimiter,
  searchController.advancedSearch.bind(searchController)
);

// 👨‍💼 GET /api/search/driver/:driverId - Historial específico de conductor
router.get('/driver/:driverId',
  searchController.searchDriverHistory.bind(searchController)
);

// 🚗 GET /api/search/vehicle/:placa - Historial específico de vehículo
router.get('/vehicle/:placa',
  searchController.searchVehicleHistory.bind(searchController)
);

// 🚨 GET /api/search/alerts - Alertas activas y críticas
router.get('/alerts',
  searchController.getActiveAlerts.bind(searchController)
);

// 📊 **RUTAS DE ANÁLISIS Y REPORTES**

// 📈 GET /api/search/trends - Análisis de tendencias
router.get('/trends', async (req, res) => {
  try {
    console.log('[SEARCH-ROUTE] 📈 Analizando tendencias...');
    
    const { 
      periodo = '30days',
      groupBy = 'day',
      metrics = 'all' 
    } = req.query;
    
    const { getPrismaClient } = require('../config/database');
    const prisma = getPrismaClient();
    
    // Calcular fecha de inicio
    const endDate = new Date();
    const startDate = new Date();
    
    switch (periodo) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Obtener tendencias por día
    const trends = await prisma.inspeccion.groupBy({
      by: ['fecha'],
      where: {
        fecha: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      },
      _sum: {
        kilometraje: true,
        marca_temporal: true
      },
      _avg: {
        kilometraje: true,
        marca_temporal: true
      },
      orderBy: {
        fecha: 'asc'
      }
    });
    
    // Procesar datos para el frontend
    const processedTrends = trends.map(item => ({
      fecha: item.fecha.toISOString().split('T')[0],
      totalInspecciones: item._count.id,
  // Eliminados: alertasRojas, advertencias, medicamentos, suenoInsuficiente, sintomasFatiga, noAptos, puntajePromedio, tasaAlertasRojas, tasaAdvertencias
    }));
    
    // Calcular estadísticas generales del período
    const totalInspecciones = processedTrends.reduce((sum, item) => sum + item.totalInspecciones, 0);
    const totalAlertas = processedTrends.reduce((sum, item) => sum + item.alertasRojas, 0);
    const totalAdvertencias = processedTrends.reduce((sum, item) => sum + item.advertencias, 0);
    
    const response = {
      periodo: {
        inicio: startDate.toISOString().split('T')[0],
        fin: endDate.toISOString().split('T')[0],
        dias: processedTrends.length
      },
      tendencias: processedTrends,
      resumen: {
        totalInspecciones,
        totalAlertas,
        totalAdvertencias,
        tasaPromediaAlertas: totalInspecciones > 0 ? Math.round(totalAlertas / totalInspecciones * 100 * 100) / 100 : 0,
        tasaPromediaAdvertencias: totalInspecciones > 0 ? Math.round(totalAdvertencias / totalInspecciones * 100 * 100) / 100 : 0,
        puntajePromedioGeneral: processedTrends.length > 0 ? 
          Math.round(processedTrends.reduce((sum, item) => sum + item.puntajePromedio, 0) / processedTrends.length * 100) / 100 : 0
      },
      // 🚨 ANÁLISIS DE FATIGA EN TENDENCIAS
      analisisFatiga: {
  totalMedicamentos: processedTrends.reduce((sum, item) => sum + (item.medicamentos || 0), 0),
  totalSuenoInsuficiente: processedTrends.reduce((sum, item) => sum + (item.suenoInsuficiente || 0), 0),
  totalSintomasFatiga: processedTrends.reduce((sum, item) => sum + (item.sintomasFatiga || 0), 0),
  totalNoAptos: processedTrends.reduce((sum, item) => sum + (item.noAptos || 0), 0),
  tendenciaFatiga: calculateFatigueTrend(processedTrends)
      }
    };
    
    console.log(`[SEARCH-ROUTE] ✅ Tendencias analizadas: ${processedTrends.length} días de datos`);
    
    res.json({
      success: true,
      data: response,
      message: 'Análisis de tendencias completado'
    });
    
  } catch (error) {
    console.error('[SEARCH-ROUTE] ❌ Error analizando tendencias:', error);
    res.status(500).json({
      success: false,
      error: 'TRENDS_ERROR',
      message: error.message
    });
  }
});

// 📊 GET /api/search/summary/:type - Resúmenes por categoría
router.get('/summary/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { timeframe = '30days', limit = 10 } = req.query;
    
    console.log(`[SEARCH-ROUTE] 📊 Generando resumen de tipo: ${type}`);
    
    const { getPrismaClient } = require('../config/database');
    const prisma = getPrismaClient();
    
    let summary = {};
    
    switch (type) {
      case 'conductores':
        summary = await this.getConductoresSummary(prisma, timeframe, limit);
        break;
      case 'vehiculos':
        summary = await this.getVehiculosSummary(prisma, timeframe, limit);
        break;
      case 'contratos':
        summary = await this.getContratosSummary(prisma, timeframe, limit);
        break;
      case 'fatiga':
          // Llamar correctamente al método del controlador
          if (typeof searchController.getFatigaSummary === 'function') {
            summary = await searchController.getFatigaSummary(prisma, timeframe);
          } else {
            return res.status(500).json({ success: false, error: 'FATIGA_SUMMARY_NOT_IMPLEMENTED' });
          }
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'INVALID_SUMMARY_TYPE',
          message: 'Tipo de resumen no válido',
          validTypes: ['conductores', 'vehiculos', 'contratos', 'fatiga']
        });
    }
    
    console.log(`[SEARCH-ROUTE] ✅ Resumen de ${type} generado`);
    
    res.json({
      success: true,
      data: {
        type,
        timeframe,
        summary,
        generatedAt: new Date().toISOString()
      },
      message: `Resumen de ${type} generado`
    });
    
  } catch (error) {
    console.error('[SEARCH-ROUTE] ❌ Error generando resumen:', error);
    res.status(500).json({
      success: false,
      error: 'SUMMARY_ERROR',
      message: error.message
    });
  }
});

// 🔄 GET /api/search/refresh/:type - Refrescar cache de búsquedas
router.post('/refresh/:type?', (req, res) => {
  try {
    const { type = 'all' } = req.params;
    
    console.log(`[SEARCH-ROUTE] 🔄 Refrescando cache: ${type}`);
    
    // TODO: Implementar sistema de cache y refresh
    // Por ahora, simplemente confirmamos la acción
    
    res.json({
      success: true,
      message: `Cache de ${type} refrescado`,
      timestamp: new Date().toISOString(),
      note: 'Sistema de cache en desarrollo - próxima versión'
    });
    
  } catch (error) {
    console.error('[SEARCH-ROUTE] ❌ Error refrescando cache:', error);
    res.status(500).json({
      success: false,
      error: 'CACHE_REFRESH_ERROR', 
      message: error.message
    });
  }
});

// 📤 POST /api/search/export - Exportar resultados de búsqueda
router.post('/export', async (req, res) => {
  try {
    console.log('[SEARCH-ROUTE] 📤 Iniciando exportación...');
    
    const {
      searchParams,      // Parámetros de búsqueda
      format = 'json',   // Formato: json, csv, excel, pdf
      filename,          // Nombre del archivo
      includeCharts = false, // Incluir gráficos (para PDF)
      template = 'standard'  // Plantilla de reporte
    } = req.body;
    
    if (!searchParams) {
      return res.status(400).json({
        success: false,
        error: 'SEARCH_PARAMS_REQUIRED',
        message: 'Parámetros de búsqueda requeridos para exportar'
      });
    }
    
    // Ejecutar búsqueda con los parámetros proporcionados
    // Por ahora, simularemos los resultados
    const searchResults = {
      inspecciones: [], // Resultados de búsqueda
      totalFound: 0,
      searchParams: searchParams
    };
    
    // TODO: Implementar exportación real según formato
    switch (format) {
      case 'json':
        res.json({
          success: true,
          data: searchResults,
          format: 'json',
          message: 'Datos exportados en formato JSON'
        });
        break;
        
      case 'csv':
        res.status(501).json({
          success: false,
          error: 'FORMAT_NOT_IMPLEMENTED',
          message: 'Exportación CSV estará disponible en próxima versión'
        });
        break;
        
      case 'excel':
        res.status(501).json({
          success: false,
          error: 'FORMAT_NOT_IMPLEMENTED',
          message: 'Exportación Excel estará disponible en próxima versión'
        });
        break;
        
      case 'pdf':
        // Esta funcionalidad la implementaremos en el servicio de reportes PDF
        res.status(501).json({
          success: false,
          error: 'FORMAT_NOT_IMPLEMENTED',
          message: 'Exportación PDF estará disponible en próxima versión'
        });
        break;
        
      default:
        res.status(400).json({
          success: false,
          error: 'INVALID_FORMAT',
          message: 'Formato no válido',
          supportedFormats: ['json', 'csv', 'excel', 'pdf']
        });
    }
    
  } catch (error) {
    console.error('[SEARCH-ROUTE] ❌ Error en exportación:', error);
    res.status(500).json({
      success: false,
      error: 'EXPORT_ERROR',
      message: error.message
    });
  }
});

// 🧪 GET /api/search/test - Test de conectividad de búsquedas
router.get('/test', (req, res) => {
  console.log('[SEARCH-ROUTE] 🧪 Test endpoint ejecutado');
  
  res.json({
    success: true,
    message: 'Search routes funcionando correctamente',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/search/inspections - Búsqueda general',
      'POST /api/search/advanced - Búsqueda avanzada',
      'GET /api/search/driver/:id - Historial conductor',
      'GET /api/search/vehicle/:placa - Historial vehículo',
      'GET /api/search/alerts - Alertas activas',
      'GET /api/search/trends - Análisis tendencias',
      'GET /api/search/summary/:type - Resúmenes',
      'POST /api/search/export - Exportar resultados'
    ],
    features: [
      '🔍 Búsqueda de texto libre en múltiples campos',
      '📅 Filtros por fecha y período',
      '🚨 Búsqueda específica de alertas y riesgos',
      '👨‍💼 Historial completo de conductores',
      '🚗 Análisis de vehículos',
      '📈 Tendencias temporales',
      '📊 Resúmenes por categoría',
      '📤 Exportación en múltiples formatos'
    ]
  });
});

// 🔧 MÉTODOS AUXILIARES

// Calcular tendencia de fatiga
function calculateFatigueTrend(data) {
  if (data.length < 2) return 'sin-datos';
  
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, item) => sum + (item.medicamentos + item.suenoInsuficiente + item.sintomasFatiga), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, item) => sum + (item.medicamentos + item.suenoInsuficiente + item.sintomasFatiga), 0) / secondHalf.length;
  
  if (secondAvg > firstAvg * 1.2) return 'empeorando';
  if (secondAvg < firstAvg * 0.8) return 'mejorando';
  return 'estable';
}

// Métodos auxiliares para resúmenes (implementación básica)
async function getConductoresSummary(prisma, timeframe, limit) {
  return {
    topConductores: [],
    problemasRecurrentes: [],
    mejorDesempeno: [],
    note: 'Implementación completa en desarrollo'
  };
}

async function getVehiculosSummary(prisma, timeframe, limit) {
  return {
    vehiculosProblematicos: [],
    mantenimientoRequerido: [],
    mejorEstado: [],
    note: 'Implementación completa en desarrollo'
  };
}

async function getContratosSummary(prisma, timeframe, limit) {
  return {
    rendimientoPorContrato: [],
    problemasRecurrentes: [],
    mejorDesempeno: [],
    note: 'Implementación completa en desarrollo'
  };
}

async function getFatigaSummary(prisma, timeframe) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (timeframe === '7days' ? 7 : timeframe === '90days' ? 90 : 30));
  
  const fatigueStats = await prisma.inspeccion.aggregate({
    where: {
      fecha: { gte: cutoffDate }
    },
    _count: {
      id: true
    },
    _sum: {
      consumo_medicamentos: true,
      horas_sueno_suficientes: true,
      libre_sintomas_fatiga: true,
      condiciones_aptas: true
    }
  });
  
  const total = fatigueStats._count.id || 0;
  
  return {
    totalInspecciones: total,
    medicamentos: fatigueStats._sum.consumo_medicamentos || 0,
    suenoInsuficiente: total - (fatigueStats._sum.horas_sueno_suficientes || 0),
    sintomasFatiga: total - (fatigueStats._sum.libre_sintomas_fatiga || 0),
    noAptos: total - (fatigueStats._sum.condiciones_aptas || 0),
    porcentajes: {
      medicamentos: total > 0 ? Math.round((fatigueStats._sum.consumo_medicamentos || 0) / total * 100 * 100) / 100 : 0,
      problemasGenerales: total > 0 ? Math.round((total - (fatigueStats._sum.horas_sueno_suficientes || 0) + total - (fatigueStats._sum.libre_sintomas_fatiga || 0) + total - (fatigueStats._sum.condiciones_aptas || 0)) / (total * 3) * 100 * 100) / 100 : 0
    }
  };
}

module.exports = router;