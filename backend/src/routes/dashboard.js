// 📊 RUTAS DEL DASHBOARD CON REPORTES PDF V2.0
// src/routes/dashboard.js

const express = require('express');
const DashboardController = require('../controllers/dashboardController');
const PDFReportService = require('../services/pdfReportService');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const dashboardController = new DashboardController();
const pdfReportService = new PDFReportService();

// 📊 Rate limiting para dashboard
const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto
  message: {
    error: 'DASHBOARD_RATE_LIMIT',
    message: 'Demasiadas consultas al dashboard. Máximo 30 por minuto.',
    retryAfter: 60
  }
});

// 📤 Rate limiting más estricto para generación de PDFs
const pdfLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // Máximo 10 PDFs por 5 minutos
  message: {
    error: 'PDF_RATE_LIMIT',
    message: 'Demasiadas solicitudes de PDF. Máximo 10 por 5 minutos.',
    retryAfter: 5 * 60
  }
});

// 🔧 Middleware de logging
router.use((req, res, next) => {
  console.log(`[DASHBOARD-ROUTE] ${req.method} ${req.path} - User: ${req.ip}`);
  next();
});

// 📋 **RUTAS PRINCIPALES DEL DASHBOARD**

// 📊 GET /api/dashboard/stats - Estadísticas principales
router.get('/stats',
  dashboardLimiter,
  dashboardController.getMainStats.bind(dashboardController)
);

// 📈 GET /api/dashboard/performance - Métricas de rendimiento
router.get('/performance',
  dashboardLimiter,
  dashboardController.getPerformanceMetrics.bind(dashboardController)
);

// 🚨 GET /api/dashboard/alerts - Panel de alertas
router.get('/alerts',
  dashboardLimiter,
  dashboardController.getAlertsPanel.bind(dashboardController)
);

// 📋 GET /api/dashboard/executive-report - Reporte ejecutivo
router.get('/executive-report',
  dashboardLimiter,
  dashboardController.getExecutiveReport.bind(dashboardController)
);

// 🔥 **NUEVAS RUTAS DE REPORTES PDF**

// 📄 GET /api/dashboard/pdf/daily-report - Reporte diario en PDF
router.get('/pdf/daily-report',
  pdfLimiter,
  async (req, res) => {
    try {
      console.log('[DASHBOARD-ROUTE] 📄 Generando reporte diario PDF...');
      
      const { 
        fecha = new Date().toISOString().split('T')[0],
        includeCharts = true,
        template = 'standard',
        contrato,
        campo
      } = req.query;
      
      // Obtener datos para el reporte
      const reportData = await pdfReportService.generateDailyReportData(fecha, {
        contrato,
        campo,
        includeCharts
      });
      
      // Generar PDF
      const pdfBuffer = await pdfReportService.generateDailyReportPDF(reportData, {
        template,
        fecha,
        includeCharts
      });
      
      // Configurar headers para descarga
      const filename = `HQ-FO-40_Reporte_Diario_${fecha}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log(`[DASHBOARD-ROUTE] ✅ PDF generado: ${filename} (${Math.round(pdfBuffer.length / 1024)}KB)`);
      
      res.end(pdfBuffer);
      
    } catch (error) {
      console.error('[DASHBOARD-ROUTE] ❌ Error generando reporte diario PDF:', error);
      res.status(500).json({
        success: false,
        error: 'PDF_GENERATION_ERROR',
        message: 'Error generando reporte PDF: ' + error.message
      });
    }
  }
);

// 📊 GET /api/dashboard/pdf/executive-summary - Resumen ejecutivo PDF
router.get('/pdf/executive-summary',
  pdfLimiter,
  async (req, res) => {
    try {
      console.log('[DASHBOARD-ROUTE] 📊 Generando resumen ejecutivo PDF...');
      
      const {
        periodo = '1month',
        includeComparisons = true,
        includeProjections = true,
        template = 'executive',
        logo = true
      } = req.query;
      
      // Obtener datos del reporte ejecutivo
      const reportData = await pdfReportService.generateExecutiveReportData(periodo, {
        includeComparisons,
        includeProjections
      });
      
      // Generar PDF ejecutivo
      const pdfBuffer = await pdfReportService.generateExecutiveReportPDF(reportData, {
        template,
        logo,
        includeComparisons,
        includeProjections
      });
      
      const filename = `HQ-FO-40_Resumen_Ejecutivo_${periodo}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log(`[DASHBOARD-ROUTE] ✅ Resumen ejecutivo PDF generado: ${filename}`);
      
      res.end(pdfBuffer);
      
    } catch (error) {
      console.error('[DASHBOARD-ROUTE] ❌ Error generando resumen ejecutivo PDF:', error);
      res.status(500).json({
        success: false,
        error: 'EXECUTIVE_PDF_ERROR',
        message: error.message
      });
    }
  }
);

// 🚨 GET /api/dashboard/pdf/fatigue-analysis - Análisis de fatiga PDF
router.get('/pdf/fatigue-analysis',
  pdfLimiter,
  async (req, res) => {
    try {
      console.log('[DASHBOARD-ROUTE] 🚨 Generando análisis de fatiga PDF...');
      
      const {
        periodo = '30days',
        includeDriverDetails = true,
        includeRecommendations = true,
        template = 'fatigue'
      } = req.query;
      
      // Obtener datos específicos de fatiga
      const fatigueData = await pdfReportService.generateFatigueAnalysisData(periodo, {
        includeDriverDetails,
        includeRecommendations
      });
      
      // Generar PDF específico de fatiga
      const pdfBuffer = await pdfReportService.generateFatigueAnalysisPDF(fatigueData, {
        template,
        periodo,
        includeDriverDetails,
        includeRecommendations
      });
      
      const filename = `HQ-FO-40_Analisis_Fatiga_${periodo}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log(`[DASHBOARD-ROUTE] ✅ Análisis de fatiga PDF generado: ${filename}`);
      
      res.end(pdfBuffer);
      
    } catch (error) {
      console.error('[DASHBOARD-ROUTE] ❌ Error generando análisis de fatiga PDF:', error);
      res.status(500).json({
        success: false,
        error: 'FATIGUE_PDF_ERROR',
        message: error.message
      });
    }
  }
);

// 📋 POST /api/dashboard/pdf/custom-report - Reporte personalizado PDF
router.post('/pdf/custom-report',
  pdfLimiter,
  async (req, res) => {
    try {
      console.log('[DASHBOARD-ROUTE] 📋 Generando reporte personalizado PDF...');
      
      const {
        titulo = 'Reporte Personalizado',
        filtros = {},
        secciones = ['stats', 'alerts', 'trends'],
        formato = 'standard',
        includeCharts = true,
        includeData = true,
        logo = true
      } = req.body;
      
      // Validar secciones requeridas
      const seccionesValidas = ['stats', 'alerts', 'trends', 'fatigue', 'drivers', 'vehicles'];
      const seccionesFiltradas = secciones.filter(s => seccionesValidas.includes(s));
      
      if (seccionesFiltradas.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_SECTIONS',
          message: 'Debe especificar al menos una sección válida',
          validSections: seccionesValidas
        });
      }
      
      // Generar datos del reporte personalizado
      const customData = await pdfReportService.generateCustomReportData(seccionesFiltradas, filtros);
      
      // Generar PDF personalizado
      const pdfBuffer = await pdfReportService.generateCustomReportPDF(customData, {
        titulo,
        secciones: seccionesFiltradas,
        formato,
        includeCharts,
        includeData,
        logo
      });
      
      const filename = `HQ-FO-40_${titulo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log(`[DASHBOARD-ROUTE] ✅ Reporte personalizado PDF generado: ${filename}`);
      
      res.end(pdfBuffer);
      
    } catch (error) {
      console.error('[DASHBOARD-ROUTE] ❌ Error generando reporte personalizado PDF:', error);
      res.status(500).json({
        success: false,
        error: 'CUSTOM_PDF_ERROR',
        message: error.message
      });
    }
  }
);

// 📊 **RUTAS DE ANÁLISIS ADICIONALES**

// 🎯 GET /api/dashboard/kpis - Indicadores clave de rendimiento
router.get('/kpis', 
  dashboardLimiter,
  async (req, res) => {
    try {
      console.log('[DASHBOARD-ROUTE] 🎯 Obteniendo KPIs...');
      
      const { periodo = '30days', contrato, campo } = req.query;
      
      const { getPrismaClient } = require('../config/database');
      const prisma = getPrismaClient();
      
      // Calcular KPIs principales
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (periodo === '7days' ? 7 : periodo === '90days' ? 90 : 30));
      
      const filters = { fecha: { gte: startDate, lte: endDate } };
      if (contrato) filters.contrato = { contains: contrato, mode: 'insensitive' };
      if (campo) filters.campo = { contains: campo, mode: 'insensitive' };
      
      const [totalInspecciones, alertasRojas, advertencias, puntajePromedio] = await Promise.all([
        prisma.inspeccion.count({ where: filters }),
        prisma.inspeccion.count({ where: { ...filters, tiene_alerta_roja: true } }),
        prisma.inspeccion.count({ where: { ...filters, tiene_advertencias: true } }),
        prisma.inspeccion.aggregate({
          where: filters,
          _avg: { puntaje_total: true }
        })
      ]);
      
      // Calcular KPIs específicos de fatiga
      const fatigueKPIs = await prisma.inspeccion.aggregate({
        where: filters,
        _sum: {
          consumo_medicamentos: true,
          horas_sueno_suficientes: true,
          libre_sintomas_fatiga: true,
          condiciones_aptas: true
        }
      });
      
      const kpis = {
        operacionales: {
          totalInspecciones,
          inspeccionesDiarias: Math.round(totalInspecciones / (periodo === '7days' ? 7 : periodo === '90days' ? 90 : 30)),
          eficiencia: totalInspecciones > 0 ? Math.round((1 - (alertasRojas + advertencias) / totalInspecciones) * 100 * 100) / 100 : 0,
          puntajePromedio: Math.round((puntajePromedio._avg.puntaje_total || 0) * 100) / 100
        },
        seguridad: {
          alertasRojas,
          advertencias,
          tasaAlertasRojas: totalInspecciones > 0 ? Math.round(alertasRojas / totalInspecciones * 100 * 100) / 100 : 0,
          tasaAdvertencias: totalInspecciones > 0 ? Math.round(advertencias / totalInspecciones * 100 * 100) / 100 : 0
        },
        fatiga: {
          conductoresMedicamentos: fatigueKPIs._sum.consumo_medicamentos || 0,
          conductoresSuenoInsuficiente: totalInspecciones - (fatigueKPIs._sum.horas_sueno_suficientes || 0),
          conductoresConSintomas: totalInspecciones - (fatigueKPIs._sum.libre_sintomas_fatiga || 0),
          conductoresNoAptos: totalInspecciones - (fatigueKPIs._sum.condiciones_aptas || 0),
          indiceFatiga: totalInspecciones > 0 ? 
            Math.round(((fatigueKPIs._sum.consumo_medicamentos || 0) * 3 + 
                       (totalInspecciones - (fatigueKPIs._sum.horas_sueno_suficientes || 0)) + 
                       (totalInspecciones - (fatigueKPIs._sum.libre_sintomas_fatiga || 0)) + 
                       (totalInspecciones - (fatigueKPIs._sum.condiciones_aptas || 0))) / (totalInspecciones * 6) * 100 * 100) / 100 : 0
        },
        metas: {
          eficienciaObjetivo: 95,
          tasaAlertasMaxima: 5,
          puntajeMinimoObjetivo: 85,
          indiceFatigaMaximo: 15
        }
      };
      
      // Evaluar el cumplimiento de metas
      kpis.cumplimiento = {
        eficiencia: kpis.operacionales.eficiencia >= kpis.metas.eficienciaObjetivo,
        alertas: kpis.seguridad.tasaAlertasRojas <= kpis.metas.tasaAlertasMaxima,
        puntaje: kpis.operacionales.puntajePromedio >= kpis.metas.puntajeMinimoObjetivo,
        fatiga: kpis.fatiga.indiceFatiga <= kpis.metas.indiceFatigaMaximo,
        general: null
      };
      
      kpis.cumplimiento.general = Object.values(kpis.cumplimiento)
        .filter(v => v !== null)
        .every(v => v === true);
      
      console.log('[DASHBOARD-ROUTE] ✅ KPIs calculados:', {
        inspecciones: totalInspecciones,
        eficiencia: kpis.operacionales.eficiencia,
        alertas: alertasRojas,
        cumplimiento: kpis.cumplimiento.general
      });
      
      res.json({
        success: true,
        data: {
          periodo,
          filtros: { contrato, campo },
          kpis,
          evaluacion: {
            estado: kpis.cumplimiento.general ? 'EXCELENTE' : 
                   Object.values(kpis.cumplimiento).filter(v => v === true).length >= 3 ? 'BUENO' :
                   Object.values(kpis.cumplimiento).filter(v => v === true).length >= 2 ? 'REGULAR' : 'REQUIERE_ATENCION',
            recomendaciones: this.generateKPIRecommendations(kpis)
          },
          timestamp: new Date().toISOString()
        },
        message: 'KPIs obtenidos exitosamente'
      });
      
    } catch (error) {
      console.error('[DASHBOARD-ROUTE] ❌ Error obteniendo KPIs:', error);
      res.status(500).json({
        success: false,
        error: 'KPI_ERROR',
        message: error.message
      });
    }
  }
);

// 📊 GET /api/dashboard/widgets - Datos para widgets del dashboard
router.get('/widgets',
  dashboardLimiter,
  async (req, res) => {
    try {
      console.log('[DASHBOARD-ROUTE] 📊 Obteniendo datos de widgets...');
      
      const { getPrismaClient } = require('../config/database');
      const prisma = getPrismaClient();
      
      // Obtener datos rápidos para widgets en paralelo
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const endOfToday = new Date(today.setHours(23, 59, 59, 999));
      
      const [
        inspeccionesHoy,
        alertasRojasHoy, 
        advertenciasHoy,
        conductoresActivos,
        vehiculosInspeccionados,
        ultimasAlertas,
        topProblemas
      ] = await Promise.all([
        // Inspecciones de hoy
        prisma.inspeccion.count({
          where: { fecha: { gte: startOfToday, lte: endOfToday } }
        }),
        
        // Alertas rojas hoy
        prisma.inspeccion.count({
          where: { 
            fecha: { gte: startOfToday, lte: endOfToday },
            tiene_alerta_roja: true 
          }
        }),
        
        // Advertencias hoy
        prisma.inspeccion.count({
          where: { 
            fecha: { gte: startOfToday, lte: endOfToday },
            tiene_advertencias: true 
          }
        }),
        
        // Conductores únicos activos hoy
        prisma.inspeccion.findMany({
          where: { fecha: { gte: startOfToday, lte: endOfToday } },
          select: { conductor_cedula: true },
          distinct: ['conductor_cedula']
        }),
        
        // Vehículos inspeccionados hoy
        prisma.inspeccion.findMany({
          where: { fecha: { gte: startOfToday, lte: endOfToday } },
          select: { placa_vehiculo: true },
          distinct: ['placa_vehiculo']
        }),
        
        // Últimas 5 alertas críticas
        prisma.inspeccion.findMany({
          where: { tiene_alerta_roja: true },
          orderBy: { fecha: 'desc' },
          take: 5,
          select: {
            id: true,
            fecha: true,
            conductor_nombre: true,
            placa_vehiculo: true,
            observaciones: true
          }
        }),
        
        // Top 3 problemas más comunes (últimos 7 días)
        prisma.inspeccion.aggregate({
          where: {
            fecha: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          _sum: {
            consumo_medicamentos: true,
            horas_sueno_suficientes: true,
            libre_sintomas_fatiga: true,
            condiciones_aptas: true
          },
          _count: { id: true }
        })
      ]);
      
      // Procesar problemas más comunes
      const totalSemana = topProblemas._count.id || 1;
      const problemasComunes = [
        {
          problema: 'Sueño Insuficiente',
          count: totalSemana - (topProblemas._sum.horas_sueno_suficientes || 0),
          percentage: Math.round((totalSemana - (topProblemas._sum.horas_sueno_suficientes || 0)) / totalSemana * 100)
        },
        {
          problema: 'Síntomas de Fatiga',
          count: totalSemana - (topProblemas._sum.libre_sintomas_fatiga || 0),
          percentage: Math.round((totalSemana - (topProblemas._sum.libre_sintomas_fatiga || 0)) / totalSemana * 100)
        },
        {
          problema: 'No se siente apto',
          count: totalSemana - (topProblemas._sum.condiciones_aptas || 0),
          percentage: Math.round((totalSemana - (topProblemas._sum.condiciones_aptas || 0)) / totalSemana * 100)
        },
        {
          problema: 'Consumo Medicamentos',
          count: topProblemas._sum.consumo_medicamentos || 0,
          percentage: Math.round((topProblemas._sum.consumo_medicamentos || 0) / totalSemana * 100)
        }
      ].sort((a, b) => b.count - a.count).slice(0, 3);
      
      const widgets = {
        resumenHoy: {
          inspecciones: inspeccionesHoy,
          alertasRojas: alertasRojasHoy,
          advertencias: advertenciasHoy,
          conductores: conductoresActivos.length,
          vehiculos: vehiculosInspeccionados.length,
          eficiencia: inspeccionesHoy > 0 ? 
            Math.round((1 - (alertasRojasHoy + advertenciasHoy) / inspeccionesHoy) * 100) : 100
        },
        ultimasAlertas: ultimasAlertas.map(alerta => ({
          ...alerta,
          timeAgo: Math.floor((Date.now() - new Date(alerta.fecha).getTime()) / (1000 * 60 * 60)) + 'h'
        })),
        problemasComunes,
        indicadores: {
          tendenciaInspecciones: 'estable', // TODO: Calcular tendencia real
          alertasCriticas: alertasRojasHoy,
          statusGeneral: alertasRojasHoy === 0 ? 'green' : alertasRojasHoy <= 2 ? 'yellow' : 'red'
        }
      };
      
      console.log('[DASHBOARD-ROUTE] ✅ Widgets obtenidos:', {
        inspeccionesHoy: widgets.resumenHoy.inspecciones,
        alertas: widgets.resumenHoy.alertasRojas,
        eficiencia: widgets.resumenHoy.eficiencia
      });
      
      res.json({
        success: true,
        data: widgets,
        timestamp: new Date().toISOString(),
        message: 'Datos de widgets obtenidos'
      });
      
    } catch (error) {
      console.error('[DASHBOARD-ROUTE] ❌ Error obteniendo widgets:', error);
      res.status(500).json({
        success: false,
        error: 'WIDGETS_ERROR',
        message: error.message
      });
    }
  }
);

// 🧪 GET /api/dashboard/test - Test de funcionalidad del dashboard
router.get('/test', (req, res) => {
  console.log('[DASHBOARD-ROUTE] 🧪 Test endpoint ejecutado');
  
  res.json({
    success: true,
    message: 'Dashboard routes funcionando correctamente',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/dashboard/stats - Estadísticas principales',
      'GET /api/dashboard/performance - Métricas de rendimiento',
      'GET /api/dashboard/alerts - Panel de alertas',
      'GET /api/dashboard/executive-report - Reporte ejecutivo',
      'GET /api/dashboard/kpis - Indicadores clave',
      'GET /api/dashboard/widgets - Datos de widgets',
      // 📄 Endpoints PDF
      'GET /api/dashboard/pdf/daily-report - Reporte diario PDF',
      'GET /api/dashboard/pdf/executive-summary - Resumen ejecutivo PDF',
      'GET /api/dashboard/pdf/fatigue-analysis - Análisis fatiga PDF',
      'POST /api/dashboard/pdf/custom-report - Reporte personalizado PDF'
    ],
    features: [
      '📊 Dashboard interactivo con widgets en tiempo real',
      '📈 Métricas de rendimiento y KPIs',
      '🚨 Panel de alertas críticas y fatiga',
      '📋 Reportes ejecutivos completos',
      '📄 Generación de PDFs profesionales',
      '🎯 Indicadores de cumplimiento de metas',
      '📊 Análisis específico de fatiga del conductor',
      '🔄 Datos actualizados en tiempo real'
    ],
    pdfTemplates: [
      'standard - Plantilla estándar para reportes diarios',
      'executive - Plantilla ejecutiva para alta gerencia', 
      'fatigue - Plantilla especializada en análisis de fatiga',
      'custom - Plantilla personalizable por secciones'
    ]
  });
});

// 🔧 Función auxiliar para generar recomendaciones de KPIs
function generateKPIRecommendations(kpis) {
  const recommendations = [];
  
  if (!kpis.cumplimiento.eficiencia) {
    recommendations.push({
      area: 'Eficiencia Operacional',
      priority: 'ALTA',
      action: `Eficiencia actual ${kpis.operacionales.eficiencia}% está por debajo del objetivo ${kpis.metas.eficienciaObjetivo}%`
    });
  }
  
  if (!kpis.cumplimiento.alertas) {
    recommendations.push({
      area: 'Seguridad Crítica',
      priority: 'CRITICA',
      action: `Tasa de alertas rojas ${kpis.seguridad.tasaAlertasRojas}% excede el máximo permitido ${kpis.metas.tasaAlertasMaxima}%`
    });
  }
  
  if (!kpis.cumplimiento.fatiga) {
    recommendations.push({
      area: 'Gestión de Fatiga',
      priority: 'ALTA',
      action: `Índice de fatiga ${kpis.fatiga.indiceFatiga}% supera el límite ${kpis.metas.indiceFatigaMaximo}%`
    });
  }
  
  return recommendations;
}

module.exports = router;