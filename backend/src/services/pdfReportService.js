// 📄 SERVICIO DE REPORTES PDF V2.0
// src/services/pdfReportService.js

const puppeteer = require('puppeteer');
const { getPrismaClient } = require('../config/database');
const { format, parseISO, startOfDay, endOfDay, subDays } = require('date-fns');
const { es } = require('date-fns/locale');

class PDFReportService {
  constructor() {
    this.prisma = getPrismaClient();
    this.browserInstance = null;
    this.pdfOptions = {
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: this.getHeaderTemplate(),
      footerTemplate: this.getFooterTemplate()
    };
  }

  // 🚀 Inicializar navegador para generación de PDFs
  async initBrowser() {
    if (!this.browserInstance) {
      console.log('[PDF-SERVICE] 🚀 Inicializando navegador para PDFs...');
      
      this.browserInstance = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process' // Para compatibilidad con Vercel
        ]
      });
      
      console.log('[PDF-SERVICE] ✅ Navegador inicializado');
    }
    return this.browserInstance;
  }

  // 🔄 Cerrar navegador
  async closeBrowser() {
    if (this.browserInstance) {
      console.log('[PDF-SERVICE] 🔄 Cerrando navegador...');
      await this.browserInstance.close();
      this.browserInstance = null;
    }
  }

  // 📊 **GENERACIÓN DE REPORTE DIARIO PDF**
  async generateDailyReportPDF(reportData, options = {}) {
    try {
      console.log(`[PDF-SERVICE] 📊 Generando reporte diario PDF para fecha: ${options.fecha}`);
      
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // Generar HTML del reporte
      const htmlContent = this.generateDailyReportHTML(reportData, options);
      
      // Establecer contenido en la página
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Generar PDF
      const pdfBuffer = await page.pdf({
        ...this.pdfOptions,
        headerTemplate: this.getDailyReportHeader(options.fecha),
        footerTemplate: this.getDailyReportFooter()
      });
      
      await page.close();
      
      console.log(`[PDF-SERVICE] ✅ Reporte diario PDF generado: ${Math.round(pdfBuffer.length / 1024)}KB`);
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('[PDF-SERVICE] ❌ Error generando reporte diario PDF:', error);
      throw new Error(`Error generando PDF: ${error.message}`);
    }
  }

  // 🏢 **GENERACIÓN DE REPORTE EJECUTIVO PDF**
  async generateExecutiveReportPDF(reportData, options = {}) {
    try {
      console.log('[PDF-SERVICE] 🏢 Generando reporte ejecutivo PDF...');
      
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // Generar HTML del reporte ejecutivo
      const htmlContent = this.generateExecutiveReportHTML(reportData, options);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Configuración especial para reporte ejecutivo
      const executivePdfOptions = {
        ...this.pdfOptions,
        headerTemplate: this.getExecutiveReportHeader(),
        footerTemplate: this.getExecutiveReportFooter()
      };
      
      const pdfBuffer = await page.pdf(executivePdfOptions);
      
      await page.close();
      
      console.log(`[PDF-SERVICE] ✅ Reporte ejecutivo PDF generado: ${Math.round(pdfBuffer.length / 1024)}KB`);
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('[PDF-SERVICE] ❌ Error generando reporte ejecutivo PDF:', error);
      throw new Error(`Error generando reporte ejecutivo PDF: ${error.message}`);
    }
  }

  // 🚨 **GENERACIÓN DE ANÁLISIS DE FATIGA PDF**
  async generateFatigueAnalysisPDF(fatigueData, options = {}) {
    try {
      console.log('[PDF-SERVICE] 🚨 Generando análisis de fatiga PDF...');
      
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // Generar HTML especializado para fatiga
      const htmlContent = this.generateFatigueAnalysisHTML(fatigueData, options);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        ...this.pdfOptions,
        headerTemplate: this.getFatigueAnalysisHeader(),
        footerTemplate: this.getFatigueAnalysisFooter()
      });
      
      await page.close();
      
      console.log(`[PDF-SERVICE] ✅ Análisis de fatiga PDF generado: ${Math.round(pdfBuffer.length / 1024)}KB`);
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('[PDF-SERVICE] ❌ Error generando análisis de fatiga PDF:', error);
      throw new Error(`Error generando análisis de fatiga PDF: ${error.message}`);
    }
  }

  // 📋 **GENERACIÓN DE REPORTE PERSONALIZADO PDF**
  async generateCustomReportPDF(customData, options = {}) {
    try {
      console.log(`[PDF-SERVICE] 📋 Generando reporte personalizado PDF: ${options.titulo}`);
      
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // Generar HTML personalizado basado en secciones seleccionadas
      const htmlContent = this.generateCustomReportHTML(customData, options);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        ...this.pdfOptions,
        headerTemplate: this.getCustomReportHeader(options.titulo),
        footerTemplate: this.getCustomReportFooter()
      });
      
      await page.close();
      
      console.log(`[PDF-SERVICE] ✅ Reporte personalizado PDF generado: ${Math.round(pdfBuffer.length / 1024)}KB`);
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('[PDF-SERVICE] ❌ Error generando reporte personalizado PDF:', error);
      throw new Error(`Error generando reporte personalizado PDF: ${error.message}`);
    }
  }

  // 📊 **MÉTODOS DE RECOLECCIÓN DE DATOS**

  // Datos para reporte diario
  async generateDailyReportData(fecha, options = {}) {
    try {
      console.log(`[PDF-SERVICE] 📊 Recopilando datos para reporte diario: ${fecha}`);
      
      const targetDate = parseISO(fecha);
      const startDate = startOfDay(targetDate);
      const endDate = endOfDay(targetDate);
      
      // Filtros adicionales
      const baseWhere = { 
        fecha: { gte: startDate, lte: endDate }
      };
      
      if (options.contrato) {
        baseWhere.contrato = { contains: options.contrato, mode: 'insensitive' };
      }
      
      if (options.campo) {
        baseWhere.campo = { contains: options.campo, mode: 'insensitive' };
      }
      
      // Recopilar datos en paralelo
      const [
        totalInspecciones,
        alertasRojas,
        advertencias, 
        inspeccionesPorTurno,
        inspeccionesPorContrato,
        conductoresUnicos,
        vehiculosUnicos,
        problemasVehiculares,
        estadisticasFatiga,
        inspecciones
      ] = await Promise.all([
        this.prisma.inspeccion.count({ where: baseWhere }),
        
        this.prisma.inspeccion.findMany({
          where: { ...baseWhere, tiene_alerta_roja: true },
          select: {
            id: true,
            conductor_nombre: true,
            conductor_cedula: true,
            placa_vehiculo: true,
            hora: true,
            turno: true,
            observaciones: true,
            consumo_medicamentos: true
          }
        }),
        
        this.prisma.inspeccion.findMany({
          where: { ...baseWhere, tiene_advertencias: true },
          select: {
            id: true,
            conductor_nombre: true,
            placa_vehiculo: true,
            hora: true,
            turno: true,
            horas_sueno_suficientes: true,
            libre_sintomas_fatiga: true,
            condiciones_aptas: true
          }
        }),
        
        this.prisma.inspeccion.groupBy({
          by: ['turno'],
          where: baseWhere,
          _count: { id: true }
        }),
        
        this.prisma.inspeccion.groupBy({
          by: ['contrato'],
          where: baseWhere,
          _count: { id: true },
          _sum: {
            tiene_alerta_roja: true,
            tiene_advertencias: true
          }
        }),
        
        this.prisma.inspeccion.findMany({
          where: baseWhere,
          select: { conductor_cedula: true, conductor_nombre: true },
          distinct: ['conductor_cedula']
        }),
        
        this.prisma.inspeccion.findMany({
          where: baseWhere,
          select: { placa_vehiculo: true },
          distinct: ['placa_vehiculo']
        }),
        
        this.prisma.inspeccion.aggregate({
          where: baseWhere,
          _sum: {
            luces_funcionando: true,
            frenos_funcionando: true,
            kit_carretera: true,
            extintor_vigente: true,
            botiquin_completo: true
          },
          _count: { id: true }
        }),
        
        // 🚨 ESTADÍSTICAS ESPECÍFICAS DE FATIGA
        this.prisma.inspeccion.aggregate({
          where: baseWhere,
          _sum: {
            consumo_medicamentos: true,
            horas_sueno_suficientes: true,
            libre_sintomas_fatiga: true,
            condiciones_aptas: true
          },
          _count: { id: true }
        }),
        
        // Top 10 inspecciones del día (para muestra)
        this.prisma.inspeccion.findMany({
          where: baseWhere,
          orderBy: { hora: 'asc' },
          take: 10,
          select: {
            id: true,
            hora: true,
            conductor_nombre: true,
            placa_vehiculo: true,
            estado_inspeccion: true,
            puntaje_total: true,
            nivel_riesgo: true
          }
        })
      ]);
      
      // Procesar y estructurar datos
      const reportData = {
        metadata: {
          fecha: format(targetDate, 'PPP', { locale: es }),
          fechaISO: fecha,
          generado: new Date().toISOString(),
          filtros: { contrato: options.contrato, campo: options.campo }
        },
        resumen: {
          totalInspecciones,
          alertasRojas: alertasRojas.length,
          advertencias: advertencias.length,
          conductoresUnicos: conductoresUnicos.length,
          vehiculosUnicos: vehiculosUnicos.length,
          eficiencia: totalInspecciones > 0 ? 
            Math.round((1 - (alertasRojas.length + advertencias.length) / totalInspecciones) * 100 * 100) / 100 : 100,
          puntajePromedio: inspecciones.reduce((sum, i) => sum + (i.puntaje_total || 0), 0) / Math.max(inspecciones.length, 1)
        },
        distribucion: {
          porTurno: inspeccionesPorTurno.map(item => ({
            turno: item.turno || 'Sin especificar',
            cantidad: item._count.id,
            porcentaje: totalInspecciones > 0 ? Math.round(item._count.id / totalInspecciones * 100) : 0
          })),
          porContrato: inspeccionesPorContrato.map(item => ({
            contrato: item.contrato || 'Sin especificar',
            inspecciones: item._count.id,
            alertasRojas: item._sum.tiene_alerta_roja || 0,
            advertencias: item._sum.tiene_advertencias || 0,
            eficiencia: item._count.id > 0 ? 
              Math.round((1 - ((item._sum.tiene_alerta_roja || 0) + (item._sum.tiene_advertencias || 0)) / item._count.id) * 100) : 100
          }))
        },
        alertas: {
          rojas: alertasRojas.map(alerta => ({
            ...alerta,
            motivo: alerta.consumo_medicamentos ? 'Consumo de medicamentos/sustancias' : 'Otros factores críticos'
          })),
          advertencias: advertencias.map(adv => ({
            ...adv,
            problemas: [
              !adv.horas_sueno_suficientes && 'Sueño insuficiente',
              !adv.libre_sintomas_fatiga && 'Síntomas de fatiga',
              !adv.condiciones_aptas && 'No se siente apto'
            ].filter(Boolean)
          }))
        },
        // 🚨 NUEVAS SECCIÓN DE FATIGA
        fatiga: {
          medicamentos: estadisticasFatiga._sum.consumo_medicamentos || 0,
          suenoInsuficiente: estadisticasFatiga._count.id - (estadisticasFatiga._sum.horas_sueno_suficientes || 0),
          sintomasFatiga: estadisticasFatiga._count.id - (estadisticasFatiga._sum.libre_sintomas_fatiga || 0),
          noAptos: estadisticasFatiga._count.id - (estadisticasFatiga._sum.condiciones_aptas || 0),
          indiceFatiga: totalInspecciones > 0 ? 
            Math.round(((estadisticasFatiga._sum.consumo_medicamentos || 0) * 3 + 
                       (estadisticasFatiga._count.id - (estadisticasFatiga._sum.horas_sueno_suficientes || 0)) +
                       (estadisticasFatiga._count.id - (estadisticasFatiga._sum.libre_sintomas_fatiga || 0)) +
                       (estadisticasFatiga._count.id - (estadisticasFatiga._sum.condiciones_aptas || 0))) / (totalInspecciones * 6) * 100 * 100) / 100 : 0
        },
        vehiculos: {
          problemasComunes: [
            {
              item: 'Luces',
              problemasDetectados: problemasVehiculares._count.id - (problemasVehiculares._sum.luces_funcionando || 0),
              porcentaje: totalInspecciones > 0 ? 
                Math.round((problemasVehiculares._count.id - (problemasVehiculares._sum.luces_funcionando || 0)) / totalInspecciones * 100) : 0
            },
            {
              item: 'Frenos',
              problemasDetectados: problemasVehiculares._count.id - (problemasVehiculares._sum.frenos_funcionando || 0),
              porcentaje: totalInspecciones > 0 ? 
                Math.round((problemasVehiculares._count.id - (problemasVehiculares._sum.frenos_funcionando || 0)) / totalInspecciones * 100) : 0
            },
            {
              item: 'Kit Carretera',
              problemasDetectados: problemasVehiculares._count.id - (problemasVehiculares._sum.kit_carretera || 0),
              porcentaje: totalInspecciones > 0 ? 
                Math.round((problemasVehiculares._count.id - (problemasVehiculares._sum.kit_carretera || 0)) / totalInspecciones * 100) : 0
            }
          ]
        },
        muestra: inspecciones,
        recomendaciones: this.generateDailyRecommendations(totalInspecciones, alertasRojas.length, advertencias.length, estadisticasFatiga)
      };
      
      console.log(`[PDF-SERVICE] ✅ Datos de reporte diario recopilados: ${totalInspecciones} inspecciones`);
      
      return reportData;
      
    } catch (error) {
      console.error('[PDF-SERVICE] ❌ Error recopilando datos para reporte diario:', error);
      throw error;
    }
  }

  // Datos para reporte ejecutivo
  async generateExecutiveReportData(periodo, options = {}) {
    try {
      console.log(`[PDF-SERVICE] 🏢 Recopilando datos para reporte ejecutivo: ${periodo}`);
      
      const endDate = new Date();
      const startDate = this.calculatePeriodStartDate(endDate, periodo);
      
      const baseWhere = {
        fecha: { gte: startDate, lte: endDate }
      };
      
      // Datos principales del período
      const [
        resumenGeneral,
        tendenciaMensual,
        topConductoresRiesgo,
        topVehiculosProblemas,
        analisisFatiga,
        distribucionContratos
      ] = await Promise.all([
        // Resumen general
        this.prisma.inspeccion.aggregate({
          where: baseWhere,
          _count: { id: true },
          _sum: {
            tiene_alerta_roja: true,
            tiene_advertencias: true,
            consumo_medicamentos: true,
            horas_sueno_suficientes: true
          },
          _avg: { puntaje_total: true }
        }),
        
        // Tendencia mensual
        this.prisma.inspeccion.groupBy({
          by: ['ano', 'mes'],
          where: baseWhere,
          _count: { id: true },
          _sum: {
            tiene_alerta_roja: true,
            tiene_advertencias: true,
            consumo_medicamentos: true
          },
          orderBy: [{ ano: 'asc' }, { mes: 'asc' }]
        }),
        
        // Top conductores con más problemas
        this.prisma.inspeccion.groupBy({
          by: ['conductor_cedula', 'conductor_nombre'],
          where: { ...baseWhere, tiene_alerta_roja: true },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        
        // Vehículos con más problemas
        this.prisma.inspeccion.groupBy({
          by: ['placa_vehiculo'],
          where: { ...baseWhere, tiene_advertencias: true },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),
        
        // Análisis específico de fatiga
        this.getDetailedFatigueAnalysis(baseWhere),
        
        // Distribución por contratos
        this.prisma.inspeccion.groupBy({
          by: ['contrato'],
          where: baseWhere,
          _count: { id: true },
          _sum: {
            tiene_alerta_roja: true,
            tiene_advertencias: true
          },
          _avg: { puntaje_total: true }
        })
      ]);
      
      // Compilar reporte ejecutivo
      const executiveData = {
        metadata: {
          periodo: this.getPeriodDescription(periodo),
          fechaInicio: format(startDate, 'PPP', { locale: es }),
          fechaFin: format(endDate, 'PPP', { locale: es }),
          generado: format(new Date(), 'PPPp', { locale: es })
        },
        resumenEjecutivo: {
          totalInspecciones: resumenGeneral._count.id,
          alertasCriticas: resumenGeneral._sum.tiene_alerta_roja || 0,
          advertenciasGeneradas: resumenGeneral._sum.tiene_advertencias || 0,
          eficienciaGeneral: resumenGeneral._count.id > 0 ? 
            Math.round((1 - ((resumenGeneral._sum.tiene_alerta_roja || 0) + (resumenGeneral._sum.tiene_advertencias || 0)) / resumenGeneral._count.id) * 100 * 100) / 100 : 100,
          puntajePromedio: Math.round((resumenGeneral._avg.puntaje_total || 0) * 100) / 100
        },
        indicadoresClave: {
          seguridadCritica: {
            medicamentos: resumenGeneral._sum.consumo_medicamentos || 0,
            tasaMedicamentos: resumenGeneral._count.id > 0 ? 
              Math.round((resumenGeneral._sum.consumo_medicamentos || 0) / resumenGeneral._count.id * 100 * 100) / 100 : 0,
            meta: '< 2%'
          },
          gestionFatiga: {
            problemasDetectados: (resumenGeneral._count.id - (resumenGeneral._sum.horas_sueno_suficientes || 0)),
            tendencia: this.calculateFatigueTrend(tendenciaMensual),
            impactoOperacional: 'Medio' // Calculado dinámicamente
          },
          rendimientoOperacional: {
            eficiencia: resumenGeneral._count.id > 0 ? 
              Math.round((1 - ((resumenGeneral._sum.tiene_alerta_roja || 0) + (resumenGeneral._sum.tiene_advertencias || 0)) / resumenGeneral._count.id) * 100 * 100) / 100 : 100,
            meta: '>= 95%',
            cumplimiento: (resumenGeneral._count.id > 0 ? 
              Math.round((1 - ((resumenGeneral._sum.tiene_alerta_roja || 0) + (resumenGeneral._sum.tiene_advertencias || 0)) / resumenGeneral._count.id) * 100 * 100) / 100 : 100) >= 95
          }
        },
        tendencias: tendenciaMensual.map(item => ({
          periodo: `${item.ano}-${String(item.mes).padStart(2, '0')}`,
          inspecciones: item._count.id,
          alertas: item._sum.tiene_alerta_roja || 0,
          medicamentos: item._sum.consumo_medicamentos || 0,
          eficiencia: item._count.id > 0 ? 
            Math.round((1 - ((item._sum.tiene_alerta_roja || 0) + (item._sum.tiene_advertencias || 0)) / item._count.id) * 100) : 100
        })),
        riesgosIdentificados: [
          ...topConductoresRiesgo.slice(0, 5).map(conductor => ({
            tipo: 'Conductor de Alto Riesgo',
            detalle: `${conductor.conductor_nombre} - ${conductor._count.id} alertas críticas`,
            prioridad: 'Alta',
            recomendacion: 'Evaluación médica y capacitación inmediata'
          })),
          ...topVehiculosProblemas.slice(0, 3).map(vehiculo => ({
            tipo: 'Vehículo Problemático',
            detalle: `Placa ${vehiculo.placa_vehiculo} - ${vehiculo._count.id} incidentes`,
            prioridad: 'Media',
            recomendacion: 'Revisión técnica y mantenimiento preventivo'
          }))
        ],
        analisisFatiga: analisisFatiga,
        recomendacionesEstrategicas: this.generateExecutiveRecommendations(resumenGeneral, analisisFatiga),
        anexos: {
          distribucionContratos: distribucionContratos.map(contrato => ({
            nombre: contrato.contrato || 'Sin especificar',
            inspecciones: contrato._count.id,
            alertas: contrato._sum.tiene_alerta_roja || 0,
            puntajePromedio: Math.round((contrato._avg.puntaje_total || 0) * 100) / 100
          }))
        }
      };
      
      console.log(`[PDF-SERVICE] ✅ Datos de reporte ejecutivo recopilados: ${executiveData.resumenEjecutivo.totalInspecciones} inspecciones`);
      
      return executiveData;
      
    } catch (error) {
      console.error('[PDF-SERVICE] ❌ Error recopilando datos para reporte ejecutivo:', error);
      throw error;
    }
  }

  // 📄 **MÉTODOS DE GENERACIÓN HTML**

  // HTML para reporte diario
  generateDailyReportHTML(data, options = {}) {
    const { fecha, includeCharts = true } = options;
    
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte Diario - ${data.metadata.fecha}</title>
        ${this.getCommonStyles()}
        <style>
            .daily-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                margin: -20px -15px 30px -15px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin: 30px 0;
            }
            
            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                border-left: 4px solid;
                text-align: center;
            }
            
            .stat-card.inspections { border-left-color: #4299e1; }
            .stat-card.alerts { border-left-color: #f56565; }
            .stat-card.warnings { border-left-color: #ed8936; }
            .stat-card.efficiency { border-left-color: #48bb78; }
            
            .stat-number {
                font-size: 2.5rem;
                font-weight: bold;
                margin: 10px 0;
            }
            
            .alert-section {
                background: #fed7d7;
                border: 1px solid #feb2b2;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .warning-section {
                background: #feebc8;
                border: 1px solid #fbd38d;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .fatigue-analysis {
                background: #e6fffa;
                border: 1px solid #81e6d9;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .distribution-chart {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            
            .chart-container {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .recommendation {
                background: #f0fff4;
                border: 1px solid #9ae6b4;
                border-left: 4px solid #48bb78;
                border-radius: 5px;
                padding: 15px;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="daily-header">
            <h1>🚗 REPORTE DIARIO DE INSPECCIONES VEHICULARES</h1>
            <h2>Sistema HQ-FO-40 v2.0</h2>
            <p><strong>${data.metadata.fecha}</strong></p>
            ${data.metadata.filtros.contrato ? `<p>Contrato: ${data.metadata.filtros.contrato}</p>` : ''}
            ${data.metadata.filtros.campo ? `<p>Campo: ${data.metadata.filtros.campo}</p>` : ''}
        </div>

        <!-- Resumen Principal -->
        <div class="stats-grid">
            <div class="stat-card inspections">
                <div class="stat-number" style="color: #4299e1;">${data.resumen.totalInspecciones}</div>
                <div class="stat-label">Inspecciones Realizadas</div>
                <small>${data.resumen.conductoresUnicos} conductores únicos</small>
            </div>
            <div class="stat-card alerts">
                <div class="stat-number" style="color: #f56565;">${data.resumen.alertasRojas}</div>
                <div class="stat-label">Alertas Rojas</div>
                <small>Medicamentos/Sustancias</small>
            </div>
            <div class="stat-card warnings">
                <div class="stat-number" style="color: #ed8936;">${data.resumen.advertencias}</div>
                <div class="stat-label">Advertencias</div>
                <small>Problemas de fatiga</small>
            </div>
            <div class="stat-card efficiency">
                <div class="stat-number" style="color: #48bb78;">${data.resumen.eficiencia}%</div>
                <div class="stat-label">Eficiencia</div>
                <small>Puntaje: ${data.resumen.puntajePromedio.toFixed(1)}</small>
            </div>
        </div>

        ${data.resumen.alertasRojas > 0 ? `
        <!-- Alertas Críticas -->
        <div class="alert-section">
            <h3>🚨 ALERTAS ROJAS CRÍTICAS (${data.alertas.rojas.length})</h3>
            <p><strong>Acción inmediata requerida:</strong> Los siguientes conductores reportaron consumo de medicamentos o sustancias que afectan su estado de alerta.</p>
            ${data.alertas.rojas.map(alerta => `
                <div class="alert-item">
                    <strong>${alerta.conductor_nombre}</strong> (${alerta.conductor_cedula || 'Sin cédula'}) - 
                    Vehículo: ${alerta.placa_vehiculo} - 
                    Hora: ${alerta.hora || 'N/A'} - 
                    Turno: ${alerta.turno || 'N/A'}
                    ${alerta.observaciones ? `<br><em>Observaciones: ${alerta.observaciones}</em>` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${data.resumen.advertencias > 0 ? `
        <!-- Advertencias -->
        <div class="warning-section">
            <h3>⚠️ ADVERTENCIAS DE FATIGA (${data.alertas.advertencias.length})</h3>
            <p>Los siguientes conductores presentan indicadores de fatiga que requieren atención:</p>
            ${data.alertas.advertencias.map(adv => `
                <div class="warning-item">
                    <strong>${adv.conductor_nombre}</strong> - Vehículo: ${adv.placa_vehiculo} - Hora: ${adv.hora}
                    <br>Problemas detectados: ${adv.problemas.join(', ')}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- Análisis de Fatiga -->
        <div class="fatigue-analysis">
            <h3>😴 ANÁLISIS DE FATIGA DEL CONDUCTOR</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <strong>${data.fatiga.medicamentos}</strong><br>
                    Consumo medicamentos
                </div>
                <div class="stat-item">
                    <strong>${data.fatiga.suenoInsuficiente}</strong><br>
                    Sueño insuficiente (< 7h)
                </div>
                <div class="stat-item">
                    <strong>${data.fatiga.sintomasFatiga}</strong><br>
                    Con síntomas de fatiga
                </div>
                <div class="stat-item">
                    <strong>${data.fatiga.noAptos}</strong><br>
                    No se sienten aptos
                </div>
            </div>
            <p><strong>Índice de Fatiga:</strong> ${data.fatiga.indiceFatiga}% 
                <span style="color: ${data.fatiga.indiceFatiga > 15 ? '#f56565' : data.fatiga.indiceFatiga > 10 ? '#ed8936' : '#48bb78'};">
                    (${data.fatiga.indiceFatiga > 15 ? 'Alto riesgo' : data.fatiga.indiceFatiga > 10 ? 'Riesgo moderado' : 'Bajo riesgo'})
                </span>
            </p>
        </div>

        <!-- Distribución por Turnos -->
        <div class="distribution-chart">
            <div class="chart-container">
                <h4>📊 Distribución por Turnos</h4>
                ${data.distribucion.porTurno.map(turno => `
                    <div class="chart-bar">
                        <span class="bar-label">${turno.turno}</span>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${turno.porcentaje}%; background: #4299e1;"></div>
                        </div>
                        <span class="bar-value">${turno.cantidad} (${turno.porcentaje}%)</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="chart-container">
                <h4>🏢 Rendimiento por Contrato</h4>
                ${data.distribucion.porContrato.map(contrato => `
                    <div class="contract-item">
                        <strong>${contrato.contrato}</strong><br>
                        Inspecciones: ${contrato.inspecciones} | 
                        Alertas: ${contrato.alertasRojas} | 
                        Eficiencia: ${contrato.eficiencia}%
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Recomendaciones -->
        <h3>💡 RECOMENDACIONES</h3>
        ${data.recomendaciones.map(rec => `
            <div class="recommendation">
                <strong>${rec.titulo}</strong><br>
                ${rec.descripcion}
            </div>
        `).join('')}

        <div class="footer">
            <p>Reporte generado automáticamente por Sistema HQ-FO-40 v2.0</p>
            <p>Fecha de generación: ${format(new Date(), 'PPPp', { locale: es })}</p>
        </div>
    </body>
    </html>`;
  }

  // HTML para reporte ejecutivo
  generateExecutiveReportHTML(data, options = {}) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Resumen Ejecutivo - Sistema HQ-FO-40</title>
        ${this.getCommonStyles()}
        <style>
            .executive-header {
                background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
                color: white;
                padding: 40px;
                text-align: center;
                margin: -20px -15px 40px -15px;
            }
            
            .executive-summary {
                background: #f7fafc;
                border: 2px solid #e2e8f0;
                border-radius: 15px;
                padding: 30px;
                margin: 30px 0;
            }
            
            .kpi-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 30px;
                margin: 40px 0;
            }
            
            .kpi-card {
                background: white;
                padding: 25px;
                border-radius: 15px;
                box-shadow: 0 6px 12px rgba(0,0,0,0.15);
                text-align: center;
                border-top: 5px solid;
            }
            
            .kpi-card.safety { border-top-color: #f56565; }
            .kpi-card.fatigue { border-top-color: #ed8936; }
            .kpi-card.performance { border-top-color: #48bb78; }
            
            .trend-section {
                margin: 40px 0;
                background: white;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            
            .risk-item {
                background: #fed7d7;
                border: 1px solid #f56565;
                border-radius: 10px;
                padding: 20px;
                margin: 15px 0;
            }
            
            .strategic-recommendation {
                background: #e6fffa;
                border: 2px solid #4fd1c7;
                border-radius: 10px;
                padding: 25px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="executive-header">
            <h1>📊 RESUMEN EJECUTIVO</h1>
            <h2>Sistema de Inspecciones Vehiculares HQ-FO-40 v2.0</h2>
            <p><strong>Período:</strong> ${data.metadata.periodo}</p>
            <p><strong>Análisis:</strong> ${data.metadata.fechaInicio} - ${data.metadata.fechaFin}</p>
        </div>

        <!-- Resumen Ejecutivo -->
        <div class="executive-summary">
            <h2>📋 RESUMEN EJECUTIVO</h2>
            <div class="stats-grid">
                <div class="exec-stat">
                    <div class="stat-number" style="color: #4299e1;">${data.resumenEjecutivo.totalInspecciones.toLocaleString()}</div>
                    <div class="stat-label">Total Inspecciones</div>
                </div>
                <div class="exec-stat">
                    <div class="stat-number" style="color: ${data.resumenEjecutivo.alertasCriticas > 0 ? '#f56565' : '#48bb78'};">${data.resumenEjecutivo.alertasCriticas}</div>
                    <div class="stat-label">Alertas Críticas</div>
                </div>
                <div class="exec-stat">
                    <div class="stat-number" style="color: ${data.resumenEjecutivo.eficienciaGeneral >= 95 ? '#48bb78' : data.resumenEjecutivo.eficienciaGeneral >= 85 ? '#ed8936' : '#f56565'};">${data.resumenEjecutivo.eficienciaGeneral}%</div>
                    <div class="stat-label">Eficiencia Operacional</div>
                </div>
                <div class="exec-stat">
                    <div class="stat-number" style="color: #805ad5;">${data.resumenEjecutivo.puntajePromedio}</div>
                    <div class="stat-label">Puntaje Promedio</div>
                </div>
            </div>
        </div>

        <!-- Indicadores Clave de Rendimiento -->
        <div class="kpi-grid">
            <div class="kpi-card safety">
                <h3>🚨 Seguridad Crítica</h3>
                <div class="kpi-value">${data.indicadoresClave.seguridadCritica.medicamentos}</div>
                <div class="kpi-label">Conductores con medicamentos</div>
                <div class="kpi-percentage">${data.indicadoresClave.seguridadCritica.tasaMedicamentos}% del total</div>
                <div class="kpi-status ${data.indicadoresClave.seguridadCritica.tasaMedicamentos < 2 ? 'success' : 'danger'}">
                    Meta: ${data.indicadoresClave.seguridadCritica.meta}
                </div>
            </div>
            
            <div class="kpi-card fatigue">
                <h3>😴 Gestión de Fatiga</h3>
                <div class="kpi-value">${data.indicadoresClave.gestionFatiga.problemasDetectados}</div>
                <div class="kpi-label">Problemas de fatiga detectados</div>
                <div class="kpi-trend">Tendencia: ${data.indicadoresClave.gestionFatiga.tendencia}</div>
                <div class="kpi-impact">Impacto: ${data.indicadoresClave.gestionFatiga.impactoOperacional}</div>
            </div>
            
            <div class="kpi-card performance">
                <h3>📈 Rendimiento Operacional</h3>
                <div class="kpi-value">${data.indicadoresClave.rendimientoOperacional.eficiencia}%</div>
                <div class="kpi-label">Eficiencia alcanzada</div>
                <div class="kpi-status ${data.indicadoresClave.rendimientoOperacional.cumplimiento ? 'success' : 'warning'}">
                    ${data.indicadoresClave.rendimientoOperacional.cumplimiento ? '✅ Cumple objetivo' : '⚠️ Por debajo del objetivo'}
                </div>
                <div class="kpi-target">Meta: ${data.indicadoresClave.rendimientoOperacional.meta}</div>
            </div>
        </div>

        <!-- Tendencias -->
        <div class="trend-section">
            <h3>📈 ANÁLISIS DE TENDENCIAS</h3>
            <div class="trend-chart">
                ${data.tendencias.map(item => `
                    <div class="trend-item">
                        <span class="trend-period">${item.periodo}</span>
                        <span class="trend-inspections">${item.inspecciones} inspecciones</span>
                        <span class="trend-alerts">${item.alertas} alertas</span>
                        <span class="trend-efficiency">${item.eficiencia}% eficiencia</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Riesgos Identificados -->
        <h3>⚠️ RIESGOS IDENTIFICADOS</h3>
        ${data.riesgosIdentificados.map(riesgo => `
            <div class="risk-item">
                <h4>${riesgo.tipo} - Prioridad: ${riesgo.prioridad}</h4>
                <p><strong>Detalle:</strong> ${riesgo.detalle}</p>
                <p><strong>Recomendación:</strong> ${riesgo.recomendacion}</p>
            </div>
        `).join('')}

        <!-- Recomendaciones Estratégicas -->
        <h3>🎯 RECOMENDACIONES ESTRATÉGICAS</h3>
        ${data.recomendacionesEstrategicas.map(rec => `
            <div class="strategic-recommendation">
                <h4>📌 ${rec.area} - Impacto: ${rec.impacto}</h4>
                <p>${rec.descripcion}</p>
                <p><strong>Acciones propuestas:</strong></p>
                <ul>
                    ${rec.acciones.map(accion => `<li>${accion}</li>`).join('')}
                </ul>
                <p><strong>Plazo:</strong> ${rec.plazo} | <strong>Responsable sugerido:</strong> ${rec.responsable}</p>
            </div>
        `).join('')}

        <div class="footer">
            <p><strong>Documento generado automáticamente por Sistema HQ-FO-40 v2.0</strong></p>
            <p>Generado: ${data.metadata.generado}</p>
            <p><em>Este reporte contiene información confidencial y debe ser tratado de acuerdo con las políticas de seguridad de la empresa.</em></p>
        </div>
    </body>
    </html>`;
  }

  // Estilos CSS comunes
  getCommonStyles() {
    return `
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: #f7fafc;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        h1, h2, h3, h4 {
            margin-bottom: 1rem;
            color: #1a202c;
        }
        
        h1 { font-size: 2.5rem; }
        h2 { font-size: 2rem; }
        h3 { font-size: 1.5rem; }
        h4 { font-size: 1.25rem; }
        
        p, div {
            margin-bottom: 1rem;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
        }
        
        .chart-bar {
            display: flex;
            align-items: center;
            margin: 10px 0;
        }
        
        .bar-label {
            min-width: 100px;
            text-align: left;
        }
        
        .bar-container {
            flex: 1;
            height: 20px;
            background: #e2e8f0;
            border-radius: 10px;
            margin: 0 10px;
            overflow: hidden;
        }
        
        .bar-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        
        .bar-value {
            min-width: 80px;
            text-align: right;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 50px;
            padding: 20px;
            text-align: center;
            color: #718096;
            border-top: 2px solid #e2e8f0;
        }
        
        .success { color: #48bb78; }
        .warning { color: #ed8936; }
        .danger { color: #f56565; }
        
        @media print {
            body { background: white; }
            .no-print { display: none; }
        }
    </style>`;
  }

  // Headers y footers para PDFs
  getHeaderTemplate() {
    return `
    <div style="font-size: 10px; padding: 5px; text-align: center; color: #666;">
        <span>Sistema HQ-FO-40 v2.0 - Inspecciones Vehiculares</span>
    </div>`;
  }

  getFooterTemplate() {
    return `
    <div style="font-size: 10px; padding: 5px; text-align: center; color: #666;">
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        <span style="float: right;">Generado: <span class="date"></span></span>
    </div>`;
  }

  getDailyReportHeader(fecha) {
    return `
    <div style="font-size: 12px; padding: 10px; text-align: center; color: #333; border-bottom: 1px solid #ddd;">
        <strong>Reporte Diario - ${fecha} | Sistema HQ-FO-40</strong>
    </div>`;
  }

  getDailyReportFooter() {
    return this.getFooterTemplate();
  }

  getExecutiveReportHeader() {
    return `
    <div style="font-size: 12px; padding: 10px; text-align: center; color: #333; background: #f8f9fa;">
        <strong>📊 RESUMEN EJECUTIVO | Sistema HQ-FO-40 v2.0</strong>
    </div>`;
  }

  getExecutiveReportFooter() {
    return `
    <div style="font-size: 10px; padding: 5px; color: #666;">
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        <span style="float: right;">Documento Confidencial - Generado: <span class="date"></span></span>
    </div>`;
  }

  getFatigueAnalysisHeader() {
    return `
    <div style="font-size: 12px; padding: 10px; text-align: center; color: #333; background: #e6fffa;">
        <strong>🚨 ANÁLISIS DE FATIGA DEL CONDUCTOR | Sistema HQ-FO-40</strong>
    </div>`;
  }

  getFatigueAnalysisFooter() {
    return this.getFooterTemplate();
  }

  getCustomReportHeader(titulo) {
    return `
    <div style="font-size: 12px; padding: 10px; text-align: center; color: #333;">
        <strong>${titulo} | Sistema HQ-FO-40</strong>
    </div>`;
  }

  getCustomReportFooter() {
    return this.getFooterTemplate();
  }

  // 🔧 **MÉTODOS DE UTILIDAD**

  calculatePeriodStartDate(endDate, periodo) {
    const date = new Date(endDate);
    
    switch (periodo) {
      case '1week':
        date.setDate(date.getDate() - 7);
        break;
      case '1month':
        date.setMonth(date.getMonth() - 1);
        break;
      case '3months':
        date.setMonth(date.getMonth() - 3);
        break;
      case '6months':
        date.setMonth(date.getMonth() - 6);
        break;
      case '1year':
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        date.setMonth(date.getMonth() - 1);
    }
    
    return date;
  }

  getPeriodDescription(periodo) {
    const descriptions = {
      '1week': 'Última semana',
      '1month': 'Último mes',
      '3months': 'Últimos 3 meses',
      '6months': 'Últimos 6 meses',
      '1year': 'Último año'
    };
    return descriptions[periodo] || 'Período personalizado';
  }

  calculateFatigueTrend(monthlyData) {
    if (monthlyData.length < 2) return 'sin-datos';
    
    const recent = monthlyData.slice(-2);
    const older = monthlyData.slice(0, -2);
    
    const recentAvg = recent.reduce((sum, item) => sum + (item._sum.consumo_medicamentos || 0), 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, item) => sum + (item._sum.consumo_medicamentos || 0), 0) / older.length : recentAvg;
    
    if (recentAvg > olderAvg * 1.2) return 'empeorando';
    if (recentAvg < olderAvg * 0.8) return 'mejorando';
    return 'estable';
  }

  generateDailyRecommendations(totalInspecciones, alertasRojas, advertencias, fatigueStats) {
    const recommendations = [];
    
    if (alertasRojas > 0) {
      recommendations.push({
        titulo: 'Acción Crítica Inmediata',
        descripcion: `Se detectaron ${alertasRojas} conductores con consumo de medicamentos. Suspender actividades inmediatamente y coordinar evaluación médica.`
      });
    }
    
    if (advertencias > totalInspecciones * 0.2) {
      recommendations.push({
        titulo: 'Gestión de Fatiga',
        descripcion: `Alto índice de problemas de fatiga (${advertencias} casos). Implementar pausas obligatorias y revisar turnos de trabajo.`
      });
    }
    
    if (totalInspecciones === 0) {
      recommendations.push({
        titulo: 'Sin Datos',
        descripcion: 'No se registraron inspecciones en esta fecha. Verificar operatividad del sistema y cumplimiento de protocolos.'
      });
    } else if (alertasRojas === 0 && advertencias <= totalInspecciones * 0.1) {
      recommendations.push({
        titulo: 'Excelente Desempeño',
        descripcion: 'El equipo mantuvo altos estándares de seguridad. Continuar con los protocolos actuales y reconocer el buen trabajo.'
      });
    }
    
    return recommendations;
  }

  generateExecutiveRecommendations(resumenGeneral, analisisFatiga) {
    const recommendations = [];
    
    const tasaMedicamentos = resumenGeneral._count.id > 0 ? 
      (resumenGeneral._sum.consumo_medicamentos || 0) / resumenGeneral._count.id * 100 : 0;
    
    if (tasaMedicamentos > 2) {
      recommendations.push({
        area: 'Seguridad Crítica',
        impacto: 'Alto',
        descripcion: 'La tasa de conductores con consumo de medicamentos excede el límite aceptable del 2%.',
        acciones: [
          'Implementar protocolo de evaluación médica pre-turno',
          'Capacitación específica sobre medicamentos y conducción', 
          'Revisión de políticas de salud ocupacional'
        ],
        plazo: 'Inmediato (1-2 semanas)',
        responsable: 'Gerencia de HSEQ + Medicina Ocupacional'
      });
    }
    
    const eficiencia = resumenGeneral._count.id > 0 ? 
      (1 - ((resumenGeneral._sum.tiene_alerta_roja || 0) + (resumenGeneral._sum.tiene_advertencias || 0)) / resumenGeneral._count.id) * 100 : 100;
    
    if (eficiencia < 90) {
      recommendations.push({
        area: 'Eficiencia Operacional',
        impacto: 'Medio',
        descripcion: 'La eficiencia operacional está por debajo del objetivo del 95%.',
        acciones: [
          'Análisis de causas raíz de rechazos',
          'Reforzamiento de capacitación para conductores',
          'Optimización de procesos de inspección'
        ],
        plazo: 'Corto plazo (1 mes)',
        responsable: 'Coordinación Operacional'
      });
    }
    
    return recommendations;
  }

  // Placeholder para análisis detallado de fatiga
  async getDetailedFatigueAnalysis(baseWhere) {
    const analysis = await this.prisma.inspeccion.aggregate({
      where: baseWhere,
      _sum: {
        consumo_medicamentos: true,
        horas_sueno_suficientes: true,
        libre_sintomas_fatiga: true,
        condiciones_aptas: true
      },
      _count: { id: true }
    });
    
    return {
      medicamentos: analysis._sum.consumo_medicamentos || 0,
      suenoInsuficiente: analysis._count.id - (analysis._sum.horas_sueno_suficientes || 0),
      sintomasFatiga: analysis._count.id - (analysis._sum.libre_sintomas_fatiga || 0),
      noAptos: analysis._count.id - (analysis._sum.condiciones_aptas || 0),
      totalEvaluados: analysis._count.id
    };
  }

  // Placeholders para otros métodos
  async generateFatigueAnalysisData(periodo, options) {
    // Implementación para datos específicos de fatiga
    return { placeholder: 'Análisis de fatiga en desarrollo' };
  }

  async generateCustomReportData(secciones, filtros) {
    // Implementación para datos personalizados
    return { placeholder: 'Reporte personalizado en desarrollo' };
  }

  generateFatigueAnalysisHTML(data, options) {
    return '<html><body><h1>Análisis de Fatiga - En desarrollo</h1></body></html>';
  }

  generateCustomReportHTML(data, options) {
    return '<html><body><h1>Reporte Personalizado - En desarrollo</h1></body></html>';
  }

  // Destructor para limpiar recursos
  async destroy() {
    await this.closeBrowser();
  }
}

module.exports = PDFReportService;