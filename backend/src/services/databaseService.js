// 🗄️ SERVICIO DE BASE DE DATOS V2.0
// src/services/databaseService.js

const { getPrismaClient } = require('../config/database');

class DatabaseService {
  constructor() {
    this.prisma = getPrismaClient();
  }

  // 📊 MÉTODOS DE CONSULTA Y BÚSQUEDA

  // 🔍 Búsqueda avanzada de inspecciones
  async searchInspections(filters = {}) {
    try {
      const {
        query,
        fechaInicio,
        fechaFin,
        contrato,
        campo,
        estado,
        tieneAlertaRoja,
        tieneAdvertencias,
        conductor, // Nombre del conductor
        placa,     // Placa del vehículo
        ano,
        mes,
        nivelRiesgo,
        limit = 50,
        offset = 0,
        orderBy = 'fecha',
        orderDirection = 'desc'
      } = filters;

      console.log('[DB-SERVICE] 🔍 Búsqueda con filtros:', filters);

      // Construir filtros WHERE
      const where = {};

      // Filtro de texto libre (busca en múltiples campos válidos)
      if (query && query.length >= 2) {
        where.OR = [
          { conductor_nombre: { contains: query, mode: 'insensitive' } },
          { placa: { contains: query, mode: 'insensitive' } },
          { contrato: { contains: query, mode: 'insensitive' } },
          { campo: { contains: query, mode: 'insensitive' } },
        { observaciones: { contains: query, mode: 'insensitive' } }
      ];
    }

      // Filtros de fecha
      if (fechaInicio || fechaFin) {
        where.fecha = {};
        if (fechaInicio) where.fecha.gte = new Date(fechaInicio);
        if (fechaFin) {
          const fechaFinDate = new Date(fechaFin);
          fechaFinDate.setHours(23, 59, 59, 999);
          where.fecha.lte = fechaFinDate;
        }
      }

      // Filtros específicos
  if (contrato) where.contrato = { contains: contrato, mode: 'insensitive' };
  if (campo) where.campo = { contains: campo, mode: 'insensitive' };
  if (estado) where.estado = estado;
  if (tieneAlertaRoja !== undefined) where.tiene_alerta_roja = tieneAlertaRoja === 'true';
  if (tieneAdvertencias !== undefined) where.tiene_advertencias = tieneAdvertencias === 'true';
  if (nivelRiesgo) where.nivel_riesgo = nivelRiesgo;
  if (ano) where.ano = parseInt(ano);
  if (mes) where.mes = parseInt(mes);

      // Filtros de conductor y vehículo
      if (conductor) {
        where.OR = [
          ...(where.OR || []),
          { conductor_nombre: { contains: conductor, mode: 'insensitive' } }
        ];
      }

      if (placa) {
        where.placa = { contains: placa.replace(/\s+/g, ''), mode: 'insensitive' };
      }

      // Configurar ordenamiento
  const orderByConfig = {};
  orderByConfig[orderBy] = orderDirection;

      // Ejecutar consulta con paginación
      const [inspecciones, totalCount] = await Promise.all([
        this.prisma.inspeccion.findMany({
          where,
          orderBy: orderByConfig,
          skip: parseInt(offset),
          take: parseInt(limit)
        }),
        this.prisma.inspeccion.count({ where })
  ]);

      console.log(`[DB-SERVICE] ✅ Búsqueda completada: ${inspecciones.length}/${totalCount} resultados`);

      return {
        inspecciones,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: (parseInt(offset) + parseInt(limit)) < totalCount,
          hasPrev: parseInt(offset) > 0,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1
        },
        filters: where // Retornar filtros aplicados para debug
      };

    } catch (error) {
      console.error('[DB-SERVICE] ❌ Error en búsqueda:', error);
      throw error;
    }
  }

  // 📊 Obtener estadísticas del dashboard
  async getDashboardStats(filters = {}) {
    try {
      const { ano, mes, contrato, campo } = filters;
      
      console.log('[DB-SERVICE] 📊 Obteniendo estadísticas del dashboard...');

  // Filtros base
  const baseWhere = {};
  if (ano) baseWhere.ano = parseInt(ano);
  if (mes) baseWhere.mes = parseInt(mes);
  if (contrato) baseWhere.contrato = { contains: contrato, mode: 'insensitive' };
  if (campo) baseWhere.campo = { contains: campo, mode: 'insensitive' };

      // Obtener estadísticas principales en paralelo
      const [
        totalInspecciones,
        alertasRojas,
        advertencias,
        inspeccionesHoy,
        conductoresUnicos,
        vehiculosUnicos,
        inspeccionesPorEstado,
        inspeccionesPorRiesgo,
        promediosPuntaje,
        tendenciaMensual
      ] = await Promise.all([
        // Total de inspecciones
        this.prisma.inspeccion.count({ where: baseWhere }),
        
        // Alertas rojas
        this.prisma.inspeccion.count({ 
          where: { ...baseWhere, tiene_alerta_roja: true } 
        }),
        
        // Advertencias
        this.prisma.inspeccion.count({ 
          where: { ...baseWhere, tiene_advertencias: true } 
        }),
        
        // Inspecciones de hoy
        this.prisma.inspeccion.count({
          where: {
            ...baseWhere,
            fecha: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999))
            }
          }
        }),
        
        // Conductores únicos
        this.prisma.inspeccion.findMany({
          where: baseWhere,
          select: { conductor_nombre: true },
          distinct: ['conductor_nombre']
        }),
        
        // Vehículos únicos
        this.prisma.inspeccion.findMany({
          where: baseWhere,
          select: { placa_vehiculo: true },
          distinct: ['placa_vehiculo']
        }),
        
        // Distribución por estado
        this.prisma.inspeccion.groupBy({
          by: ['estado_inspeccion'],
          where: baseWhere,
          _count: { estado_inspeccion: true }
        }),
        
        // Distribución por nivel de riesgo
        this.prisma.inspeccion.groupBy({
          by: ['nivel_riesgo'],
          where: baseWhere,
          _count: { nivel_riesgo: true }
        }),
        
        // Promedios de puntaje
        this.prisma.inspeccion.aggregate({
          where: baseWhere,
          _avg: { puntaje_total: true },
          _min: { puntaje_total: true },
          _max: { puntaje_total: true }
        }),
        
        // Tendencia mensual (últimos 12 meses)
        this.getTendenciaMensual(baseWhere)
  ]);
  // Fin de la instrucción

      // 🚨 ESTADÍSTICAS ESPECÍFICAS DE FATIGA (NUEVAS)
      const estadisticasFatiga = await this.getEstadisticasFatiga(baseWhere);

      // Calcular porcentajes
      const porcentajes = {
        alertasRojas: totalInspecciones > 0 ? 
          Math.round((alertasRojas / totalInspecciones) * 100 * 100) / 100 : 0,
        advertencias: totalInspecciones > 0 ?
          Math.round((advertencias / totalInspecciones) * 100 * 100) / 100 : 0,
        eficiencia: totalInspecciones > 0 ?
          Math.round(((totalInspecciones - alertasRojas - advertencias) / totalInspecciones) * 100 * 100) / 100 : 0
      };

      const stats = {
        resumen: {
          totalInspecciones,
          alertasRojas,
          advertencias,
          inspeccionesHoy,
          conductoresUnicos: conductoresUnicos.length,
          vehiculosUnicos: vehiculosUnicos.length,
          porcentajes
        },
        distribuciones: {
          porEstado: inspeccionesPorEstado.reduce((acc, item) => {
            acc[item.estado_inspeccion] = item._count.estado_inspeccion;
            return acc;
          }, {}),
          porRiesgo: inspeccionesPorRiesgo.reduce((acc, item) => {
            acc[item.nivel_riesgo] = item._count.nivel_riesgo;
            return acc;
          }, {})
        },
        calidad: {
          puntajePromedio: promediosPuntaje._avg.puntaje_total || 0,
          puntajeMinimo: promediosPuntaje._min.puntaje_total || 0,
          puntajeMaximo: promediosPuntaje._max.puntaje_total || 0
        },
        fatiga: estadisticasFatiga, // 🚨 NUEVAS ESTADÍSTICAS
        tendencia: tendenciaMensual,
        timestamp: new Date().toISOString()
      };

      console.log('[DB-SERVICE] ✅ Estadísticas obtenidas:', {
        total: stats.resumen.totalInspecciones,
        alertas: stats.resumen.alertasRojas,
        conductores: stats.resumen.conductoresUnicos
      });

      return stats;

    } catch (error) {
      console.error('[DB-SERVICE] ❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // 🚨 Obtener estadísticas específicas de fatiga del conductor
  async getEstadisticasFatiga(baseWhere = {}) {
    try {
      const [
        consumoMedicamentos,
        pocoSueno,
        sintomasFatiga,
        noAptos,
        combinacionProblemas
      ] = await Promise.all([
        // Conductores que consumen medicamentos (CRÍTICO)
        this.prisma.inspeccion.count({
          where: { ...baseWhere, consumo_medicamentos: true }
        }),
        
        // Conductores con poco sueño
        this.prisma.inspeccion.count({
          where: { ...baseWhere, horas_sueno_suficientes: false }
        }),
        
        // Conductores con síntomas de fatiga
        this.prisma.inspeccion.count({
          where: { ...baseWhere, libre_sintomas_fatiga: false }
        }),
        
        // Conductores que no se sienten aptos
        this.prisma.inspeccion.count({
          where: { ...baseWhere, condiciones_aptas: false }
        }),
        
        // Conductores con múltiples problemas
        this.prisma.inspeccion.count({
          where: {
            ...baseWhere,
            OR: [
              { 
                AND: [
                  { horas_sueno_suficientes: false },
                  { libre_sintomas_fatiga: false }
                ]
              },
              {
                AND: [
                  { horas_sueno_suficientes: false },
                  { condiciones_aptas: false }
                ]
              },
              {
                AND: [
                  { libre_sintomas_fatiga: false },
                  { condiciones_aptas: false }
                ]
              }
            ]
          }
        })
  ]);

      return {
        consumoMedicamentos,
        pocoSueno,
        sintomasFatiga,
        noAptos,
        combinacionProblemas,
        porcentajes: {
          consumoMedicamentos: baseWhere && Object.keys(baseWhere).length === 0 ? 0 :
            await this.calculatePercentage(consumoMedicamentos, baseWhere),
          pocoSueno: await this.calculatePercentage(pocoSueno, baseWhere),
          sintomasFatiga: await this.calculatePercentage(sintomasFatiga, baseWhere),
          noAptos: await this.calculatePercentage(noAptos, baseWhere),
          problemasMultiples: await this.calculatePercentage(combinacionProblemas, baseWhere)
        }
      };
    } catch (error) {
      console.error('[DB-SERVICE] Error obteniendo estadísticas de fatiga:', error);
      return {
        consumoMedicamentos: 0,
        pocoSueno: 0,
        sintomasFatiga: 0,
        noAptos: 0,
        combinacionProblemas: 0,
        porcentajes: { consumoMedicamentos: 0, pocoSueno: 0, sintomasFatiga: 0, noAptos: 0, problemasMultiples: 0 }
      };
    }
  }

  // 📈 Obtener tendencia mensual
  async getTendenciaMensual(baseWhere = {}) {
    try {
      const doceMonthsAgo = new Date();
      doceMonthsAgo.setMonth(doceMonthsAgo.getMonth() - 12);

      const tendencia = await this.prisma.inspeccion.groupBy({
        by: ['ano', 'mes'],
        where: {
          ...baseWhere,
          fecha: {
            gte: doceMonthsAgo
          }
        },
        _count: {
          id: true
        },
        _sum: {
          tiene_alerta_roja: true,
          tiene_advertencias: true
        },
        orderBy: [
          { ano: 'asc' },
          { mes: 'asc' }
        ]
      });

      return tendencia.map(item => ({
        periodo: `${item.ano}-${item.mes.toString().padStart(2, '0')}`,
        ano: item.ano,
        mes: item.mes,
        totalInspecciones: item._count.id,
        alertasRojas: item._sum.tiene_alerta_roja || 0,
        advertencias: item._sum.tiene_advertencias || 0
      }));
    } catch (error) {
      console.error('[DB-SERVICE] Error obteniendo tendencia:', error);
      return [];
    }
  }

  // 🧮 Calcular porcentaje
  async calculatePercentage(count, baseWhere) {
    try {
      const total = await this.prisma.inspeccion.count({ where: baseWhere });
      return total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0;
    } catch (error) {
      return 0;
    }
  }

  // 👨‍💼 Obtener historial detallado de conductor
  async getDriverHistory(conductorNombre) {
    try {
      console.log(`[DB-SERVICE] 👨‍💼 Obteniendo historial del conductor: ${conductorNombre}`);

      const inspecciones = await this.prisma.inspeccion.findMany({
        where: {
          conductor_nombre: { contains: conductorNombre, mode: 'insensitive' }
        },
        orderBy: { fecha: 'desc' },
        take: 100 // Últimas 100 inspecciones
      });

      if (inspecciones.length === 0) {
        return {
          conductor: { nombre: conductorNombre },
          estadisticas: null,
          historial: [],
          alertas: []
        };
      }

      // Datos del conductor (del registro más reciente)
      const ultimaInspeccion = inspecciones[0];
      const conductor = {
        nombre: ultimaInspeccion.conductor_nombre,
        ultimaInspeccion: ultimaInspeccion.fecha
      };

      // Calcular estadísticas
      const estadisticas = {
        totalInspecciones: inspecciones.length,
        alertasRojas: inspecciones.filter(i => i.tiene_alerta_roja).length,
        advertencias: inspecciones.filter(i => i.tiene_advertencias).length,
        puntajePromedio: inspecciones.reduce((sum, i) => sum + (i.puntaje_total || 0), 0) / inspecciones.length,
        ultimosRiesgos: inspecciones.slice(0, 10).map(i => i.nivel_riesgo),
        diasSinIncidentes: this.calculateDaysSinceLastIncident(inspecciones),
        problemasRecurrentes: this.analyzeRecurrentProblems(inspecciones)
      };

      // Detectar alertas/patrones preocupantes
      const alertas = this.generateDriverAlerts(inspecciones, estadisticas);

      console.log(`[DB-SERVICE] ✅ Historial obtenido para ${conductor.nombre}: ${inspecciones.length} inspecciones`);

      return {
        conductor,
        estadisticas,
        historial: inspecciones,
        alertas
      };

    } catch (error) {
      console.error('[DB-SERVICE] ❌ Error obteniendo historial del conductor:', error);
      throw error;
    }
  }

  // 📊 MÉTODOS DE ANÁLISIS Y REPORTES

  // 🚨 Obtener alertas críticas actuales
  async getCriticalAlerts(limit = 20) {
    try {
      const alerts = await this.prisma.inspeccion.findMany({
        where: {
          OR: [
            { tiene_alerta_roja: true },
            { nivel_riesgo: 'CRITICO' },
            { 
              AND: [
                { tiene_advertencias: true },
                { 
                  fecha: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
                  }
                }
              ]
            }
          ]
        },
        orderBy: [
          { tiene_alerta_roja: 'desc' },
          { fecha: 'desc' }
        ],
        take: limit,
        select: {
          id: true,
          fecha: true,
          conductor_nombre: true,
          placa: true,
          contrato: true,
          campo: true,
          tiene_alerta_roja: true,
          tiene_advertencias: true,
          nivel_riesgo: true,
          consumo_medicamentos: true,
          horas_sueno_suficientes: true,
          libre_sintomas_fatiga: true,
          condiciones_aptas: true,
          observaciones: true
        }
      });

      return alerts.map(alert => ({
        ...alert,
        alertType: this.determineAlertType(alert),
        severity: this.calculateAlertSeverity(alert),
        actionRequired: this.suggestAction(alert)
      }));

    } catch (error) {
      console.error('[DB-SERVICE] ❌ Error obteniendo alertas críticas:', error);
      throw error;
    }
  }

  // 📋 Generar reporte personalizado
  async generateCustomReport(params) {
    try {
      const {
        fechaInicio,
        fechaFin,
        contrato,
        campo,
        incluirDetalle = false,
        incluirGraficos = false,
        formato = 'json'
      } = params;

      console.log('[DB-SERVICE] 📋 Generando reporte personalizado...', params);

      // Construir filtros
      const where = {};
      if (fechaInicio) where.fecha = { gte: new Date(fechaInicio) };
      if (fechaFin) {
        where.fecha = { ...where.fecha, lte: new Date(fechaFin) };
      }
      if (contrato) where.contrato = { contains: contrato, mode: 'insensitive' };
      if (campo) where.campo = { contains: campo, mode: 'insensitive' };

      // Datos principales del reporte
      const [
        resumenGeneral,
        distribucionEstados,
        topConductoresRiesgo,
        topVehiculosProblemas,
        tendenciaDiaria
      ] = await Promise.all([
        this.getReportSummary(where),
        this.getStateDistribution(where),
        this.getTopRiskDrivers(where),
        this.getTopProblematicVehicles(where),
        incluirGraficos ? this.getDailyTrend(where) : Promise.resolve([])
      ]);

      const reporte = {
        metadata: {
          generado: new Date().toISOString(),
          periodo: { fechaInicio, fechaFin },
          filtros: { contrato, campo },
          version: '2.0.0'
        },
        resumen: resumenGeneral,
        distribuciones: {
          estados: distribucionEstados
        },
        rankings: {
          conductoresRiesgo: topConductoresRiesgo,
          vehiculosProblemas: topVehiculosProblemas
        },
        tendencias: incluirGraficos ? { diaria: tendenciaDiaria } : {},
        recomendaciones: this.generateReportRecommendations(resumenGeneral)
      };

      console.log('[DB-SERVICE] ✅ Reporte generado exitosamente');
      return reporte;

    } catch (error) {
      console.error('[DB-SERVICE] ❌ Error generando reporte:', error);
      throw error;
    }
  }

  // 🔧 MÉTODOS DE UTILIDAD

  calculateDaysSinceLastIncident(inspecciones) {
    const incidentes = inspecciones.filter(i => i.tiene_alerta_roja || i.tiene_advertencias);
    if (incidentes.length === 0) return inspecciones.length > 0 ? 
      Math.floor((new Date() - new Date(inspecciones[0].fecha)) / (1000 * 60 * 60 * 24)) : 0;
    
    const ultimoIncidente = incidentes[0];
    return Math.floor((new Date() - new Date(ultimoIncidente.fecha)) / (1000 * 60 * 60 * 24));
  }

  analyzeRecurrentProblems(inspecciones) {
    const problemas = {};
    
    inspecciones.forEach(i => {
      if (i.consumo_medicamentos) problemas.medicamentos = (problemas.medicamentos || 0) + 1;
      if (!i.horas_sueno_suficientes) problemas.sueno = (problemas.sueno || 0) + 1;
      if (!i.libre_sintomas_fatiga) problemas.fatiga = (problemas.fatiga || 0) + 1;
      if (!i.condiciones_aptas) problemas.aptitud = (problemas.aptitud || 0) + 1;
    });
    
    return Object.entries(problemas)
      .filter(([_, count]) => count >= 3) // Mínimo 3 ocurrencias
      .map(([problem, count]) => ({ problem, count, percentage: Math.round(count / inspecciones.length * 100) }));
  }

  generateDriverAlerts(inspecciones, estadisticas) {
    const alertas = [];
    
    // Alerta por alta frecuencia de problemas
    if (estadisticas.alertasRojas > inspecciones.length * 0.2) {
      alertas.push({
        type: 'ALTA_FRECUENCIA_ALERTAS',
        severity: 'CRITICO',
        message: `Conductor con ${estadisticas.alertasRojas} alertas rojas en ${inspecciones.length} inspecciones`
      });
    }
    
    // Alerta por problemas recurrentes
    if (estadisticas.problemasRecurrentes.length > 0) {
      alertas.push({
        type: 'PROBLEMAS_RECURRENTES',
        severity: 'ALTO',
        message: `Problemas recurrentes detectados: ${estadisticas.problemasRecurrentes.map(p => p.problem).join(', ')}`
      });
    }
    
    // Alerta por tendencia negativa
    const ultimasInspecciones = inspecciones.slice(0, 5);
    const problemasRecientes = ultimasInspecciones.filter(i => i.tiene_alerta_roja || i.tiene_advertencias).length;
    if (problemasRecientes >= 3) {
      alertas.push({
        type: 'TENDENCIA_NEGATIVA',
        severity: 'MEDIO',
        message: `${problemasRecientes} problemas en las últimas 5 inspecciones`
      });
    }
    
    return alertas;
  }

  determineAlertType(alert) {
    if (alert.consumo_medicamentos) return 'MEDICAMENTOS_SUSTANCIAS';
    if (!alert.condiciones_aptas) return 'NO_APTO_CONDUCIR';
    if (!alert.libre_sintomas_fatiga) return 'SINTOMAS_FATIGA';
    if (!alert.horas_sueno_suficientes) return 'SUENO_INSUFICIENTE';
    return 'OTROS';
  }

  calculateAlertSeverity(alert) {
    if (alert.tiene_alerta_roja) return 'CRITICO';
    if (alert.tiene_advertencias) return 'ALTO';
    return 'MEDIO';
  }

  suggestAction(alert) {
    if (alert.consumo_medicamentos) {
      return 'Suspender inmediatamente las labores de conducción. Evaluar aptitud médica.';
    }
    if (!alert.condiciones_aptas) {
      return 'Evaluación médica requerida antes de continuar conduciendo.';
    }
    if (!alert.libre_sintomas_fatiga || !alert.horas_sueno_suficientes) {
      return 'Descanso obligatorio. Re-evaluar en 8 horas.';
    }
    return 'Revisar condiciones específicas y tomar medidas correctivas.';
  }

  // Métodos auxiliares para reportes
  async getReportSummary(where) {
    const [total, alertasRojas, advertencias, promedios] = await Promise.all([
      this.prisma.inspeccion.count({ where }),
      this.prisma.inspeccion.count({ where: { ...where, tiene_alerta_roja: true } }),
      this.prisma.inspeccion.count({ where: { ...where, tiene_advertencias: true } }),
      this.prisma.inspeccion.aggregate({
        where,
        _avg: { puntaje_total: true }
      })
    ]);

    return {
      totalInspecciones: total,
      alertasRojas,
      advertencias,
      puntajePromedio: promedios._avg.puntaje_total || 0,
      porcentajeEficiencia: total > 0 ? Math.round((1 - (alertasRojas + advertencias) / total) * 100) : 0
    };
  }

  async getStateDistribution(where) {
    return await this.prisma.inspeccion.groupBy({
      by: ['estado_inspeccion'],
      where,
      _count: { estado_inspeccion: true }
    });
  }

  async getTopRiskDrivers(where, limit = 10) {
    return await this.prisma.inspeccion.groupBy({
      by: ['conductor_cedula', 'conductor_nombre'],
      where: { ...where, tiene_alerta_roja: true },
      _count: { tiene_alerta_roja: true },
      orderBy: { _count: { tiene_alerta_roja: 'desc' } },
      take: limit
    });
  }

  async getTopProblematicVehicles(where, limit = 10) {
    return await this.prisma.inspeccion.groupBy({
      by: ['placa_vehiculo'],
      where: { ...where, tiene_advertencias: true },
      _count: { tiene_advertencias: true },
      orderBy: { _count: { tiene_advertencias: 'desc' } },
      take: limit
    });
  }

  async getDailyTrend(where) {
    return await this.prisma.inspeccion.groupBy({
      by: ['fecha'],
      where,
      _count: { id: true },
      orderBy: { fecha: 'desc' },
      take: 30
    });
  }

  generateReportRecommendations(resumen) {
    const recomendaciones = [];
    
    if (resumen.alertasRojas > 0) {
      recomendaciones.push({
        prioridad: 1,
        tipo: 'CRITICO',
        mensaje: `Se detectaron ${resumen.alertasRojas} alertas críticas que requieren atención inmediata`,
        accion: 'Revisar casos de consumo de medicamentos/sustancias'
      });
    }
    
    if (resumen.porcentajeEficiencia < 80) {
      recomendaciones.push({
        prioridad: 2,
        tipo: 'MEJORA',
        mensaje: `Eficiencia del ${resumen.porcentajeEficiencia}% está por debajo del objetivo del 80%`,
        accion: 'Implementar programa de capacitación en seguridad vial'
      });
    }
    
    return recomendaciones;
  }
}

module.exports = DatabaseService;