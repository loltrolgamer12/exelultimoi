// 🔍 CONTROLADOR DE BÚSQUEDA V2.0
// src/controllers/searchController.js

const DatabaseService = require('../services/databaseService');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { validateSearchParams, validateDateRange } = require('../middleware/validation');

class SearchController {
  constructor() {
    this.dbService = new DatabaseService();
  }

  // 🔍 Búsqueda general de inspecciones
  async searchInspections(req, res) {
    try {
      console.log('[SEARCH] 🔍 Búsqueda de inspecciones iniciada');
      console.log('[SEARCH] Query params:', req.query);

      // Extraer parámetros de búsqueda
      const {
        q,                    // Consulta de texto libre
        fechaInicio,         // Fecha desde (YYYY-MM-DD)
        fechaFin,            // Fecha hasta (YYYY-MM-DD)
        contrato,            // Filtro por contrato
        campo,               // Filtro por campo
        estado,              // Estado de inspección
        alertaRoja,          // Solo alertas rojas (true/false)
        advertencia,         // Solo advertencias (true/false)
        conductor,           // Nombre o cédula del conductor
  placa,               // Placa del vehículo
        ano,                 // Año específico
        mes,                 // Mes específico (1-12)
        nivelRiesgo,         // Nivel de riesgo (BAJO/MEDIO/ALTO/CRITICO)
        page = 1,            // Página actual
        limit = 20,          // Resultados por página
  sortBy = 'fecha',    // Campo de ordenamiento
  sortOrder = 'desc'   // Orden (asc/desc)
      } = req.query;

      // Validar parámetros de búsqueda
      const validation = this.validateSearchParameters({
        q, fechaInicio, fechaFin, page, limit, ano, mes, sortBy, sortOrder
      });

      if (!validation.isValid) {
        return errorResponse(res, 'PARAMETROS_INVALIDOS', validation.errors.join(', '), 400);
      }

      // Preparar filtros para la base de datos
      const filters = {
        query: q && q.trim().length >= 2 ? q.trim() : undefined,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
        fechaFin: fechaFin ? new Date(fechaFin) : undefined,
        contrato: contrato && contrato.trim(),
        campo: campo && campo.trim(),
        estado: estado && estado.toUpperCase(),
        tieneAlertaRoja: alertaRoja === 'true' ? true : alertaRoja === 'false' ? false : undefined,
        tieneAdvertencias: advertencia === 'true' ? true : advertencia === 'false' ? false : undefined,
        conductor: conductor && conductor.trim(),
        placa: placa && placa.trim(),
        ano: ano ? parseInt(ano) : undefined,
        mes: mes ? parseInt(mes) : undefined,
        nivelRiesgo: nivelRiesgo && nivelRiesgo.toUpperCase(),
        limit: Math.min(parseInt(limit), 100),
        offset: (parseInt(page) - 1) * Math.min(parseInt(limit), 100),
        orderBy: this.mapSortField(sortBy),
        orderDirection: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc'
      };

      // Remover filtros undefined
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) delete filters[key];
      });

      console.log('[SEARCH] 🔧 Filtros aplicados:', filters);

      // Ejecutar búsqueda
      const startTime = Date.now();
      const results = await this.dbService.searchInspections(filters);
      const searchTime = Date.now() - startTime;

      // Enriquecer resultados con información adicional
      const enrichedResults = results.inspecciones.map(inspeccion => ({
        ...inspeccion,
        // Indicadores de riesgo visuales
        riskIndicators: this.generateRiskIndicators(inspeccion),
        // Resumen de problemas
        problemSummary: this.generateProblemSummary(inspeccion),
        // Tiempo desde la inspección
        daysSinceInspection: this.calculateDaysSince(inspeccion.fecha),
        // Estado de seguimiento
        followUpStatus: this.determineFollowUpStatus(inspeccion)
      }));

      // Generar sugerencias de búsqueda si hay pocos resultados
      const suggestions = results.inspecciones.length < 5 ? 
        await this.generateSearchSuggestions(filters) : [];

      // Estadísticas de la búsqueda actual
      const searchStats = this.calculateSearchStats(enrichedResults);

      const response = {
        results: enrichedResults,
        pagination: results.pagination,
        searchMetadata: {
          query: q,
          filtersApplied: Object.keys(filters).length - 3, // Excluir limit, offset, orderBy
          searchTime: `${searchTime}ms`,
          totalFound: results.pagination.total,
          hasFilters: Object.keys(filters).length > 3,
          suggestions: suggestions
        },
        statistics: searchStats,
        availableFilters: await this.getAvailableFilters(filters) // Valores disponibles para filtros
      };

      console.log(`[SEARCH] ✅ Búsqueda completada: ${enrichedResults.length} resultados en ${searchTime}ms`);

      return successResponse(res, response, `Encontrados ${results.pagination.total} resultados`);

    } catch (error) {
      console.error('[SEARCH] ❌ Error en búsqueda:', error);
      return errorResponse(res, 'BUSQUEDA_FALLIDA', error.message, 500);
    }
  }

  // 🎯 Búsqueda avanzada con múltiples criterios
  async advancedSearch(req, res) {
    try {
      console.log('[SEARCH] 🎯 Búsqueda avanzada iniciada');

      const {
        criterios,           // Array de criterios de búsqueda
        operador = 'AND',    // Operador lógico (AND/OR)
        includeHistory = false, // Incluir historial del conductor
        exportFormat,        // Formato de exportación si se solicita
        savedSearch          // Nombre para guardar la búsqueda
      } = req.body;

      // Validar estructura de criterios
      if (!criterios || !Array.isArray(criterios) || criterios.length === 0) {
        return errorResponse(res, 'CRITERIOS_REQUERIDOS', 'Debe especificar al menos un criterio de búsqueda', 400);
      }

      console.log(`[SEARCH] 🎯 Procesando ${criterios.length} criterios con operador ${operador}`);

      // Construir consulta compleja
      const complexQuery = this.buildComplexQuery(criterios, operador);
      
      // Ejecutar búsqueda
      const results = await this.dbService.searchInspections(complexQuery);

      // Enriquecer con historial si se solicita
      if (includeHistory && results.inspecciones.length > 0) {
        for (let inspeccion of results.inspecciones) {
          if (inspeccion.conductor_nombre) {
            try {
              inspeccion.driverHistory = await this.dbService.getDriverHistory(inspeccion.conductor_nombre);
            } catch (error) {
              console.warn(`[SEARCH] No se pudo obtener historial para conductor ${inspeccion.conductor_nombre}`);
              inspeccion.driverHistory = null;
            }
          }
        }
      }

      // Guardar búsqueda si se solicita
      if (savedSearch) {
        // TODO: Implementar sistema de búsquedas guardadas
        console.log(`[SEARCH] 💾 Guardando búsqueda como: ${savedSearch}`);
      }

      // Exportar si se solicita
      if (exportFormat) {
        return await this.exportSearchResults(res, results, exportFormat, savedSearch);
      }

      const response = {
        results: results.inspecciones,
        pagination: results.pagination,
        searchCriteria: {
          criterios,
          operador,
          appliedQuery: complexQuery
        },
        analytics: {
          patternAnalysis: this.analyzeSearchPatterns(results.inspecciones),
          riskDistribution: this.analyzeRiskDistribution(results.inspecciones),
          timeDistribution: this.analyzeTimeDistribution(results.inspecciones)
        }
      };

      console.log(`[SEARCH] ✅ Búsqueda avanzada completada: ${results.inspecciones.length} resultados`);

      return successResponse(res, response, 'Búsqueda avanzada completada');

    } catch (error) {
      console.error('[SEARCH] ❌ Error en búsqueda avanzada:', error);
      return errorResponse(res, 'BUSQUEDA_AVANZADA_FALLIDA', error.message, 500);
    }
  }

  // 👨‍💼 Búsqueda específica de conductor
  async searchDriverHistory(req, res) {
    try {
      const { driverName } = req.params;
      const { includeVehicles = false, timeframe = '1year' } = req.query;

      console.log(`[SEARCH] 👨‍💼 Buscando historial del conductor: ${driverName}`);

      if (!driverName || driverName.trim().length < 3) {
        return errorResponse(res, 'CONDUCTOR_NOMBRE_REQUERIDO', 'Nombre del conductor requerido (mínimo 3 caracteres)', 400);
      }

      // Obtener historial completo del conductor
      const driverHistory = await this.dbService.getDriverHistory(driverName);

      if (!driverHistory.conductor.nombre) {
        return errorResponse(res, 'CONDUCTOR_NO_ENCONTRADO', 'Conductor no encontrado en el sistema', 404);
      }

      // Filtrar por período si se especifica
      let filteredHistory = driverHistory.historial;
      if (timeframe !== 'all') {
        const timeframeDays = this.getTimeframeDays(timeframe);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);
        
        filteredHistory = driverHistory.historial.filter(
          insp => new Date(insp.fecha) >= cutoffDate
        );
      }

      // Incluir información de vehículos si se solicita
      const vehicleInfo = includeVehicles ? 
        await this.getDriverVehicleInfo(driverName) : null;

      // Análisis de patrones
      const patternAnalysis = {
        riskTrend: this.analyzeDriverRiskTrend(filteredHistory),
        mostCommonIssues: this.analyzeMostCommonIssues(filteredHistory),
        timePatterns: this.analyzeDriverTimePatterns(filteredHistory),
        improvementAreas: this.identifyImprovementAreas(driverHistory.estadisticas)
      };

      const response = {
        conductor: driverHistory.conductor,
        estadisticas: {
          ...driverHistory.estadisticas,
          periodoAnalizado: timeframe,
          inspeccionesPeriodo: filteredHistory.length
        },
        historial: filteredHistory,
        vehiculos: vehicleInfo,
        alertas: driverHistory.alertas,
        analisis: patternAnalysis,
        recomendaciones: this.generateDriverRecommendations(driverHistory, patternAnalysis)
      };

      console.log(`[SEARCH] ✅ Historial del conductor obtenido: ${filteredHistory.length} inspecciones`);

      return successResponse(res, response, `Historial de ${driverHistory.conductor.nombre || driverName} obtenido`);

    } catch (error) {
      console.error('[SEARCH] ❌ Error obteniendo historial del conductor:', error);
      return errorResponse(res, 'HISTORIAL_CONDUCTOR_ERROR', error.message, 500);
    }
  }

  // 🚗 Búsqueda por vehículo
  async searchVehicleHistory(req, res) {
    try {
      const { placa } = req.params;
      const { includeConductors = false, includePatterns = false } = req.query;

      console.log(`[SEARCH] 🚗 Buscando historial del vehículo: ${placa}`);

      if (!placa || placa.trim().length < 3) {
        return errorResponse(res, 'PLACA_REQUERIDA', 'Placa del vehículo requerida', 400);
      }

      // Buscar todas las inspecciones del vehículo
      const vehicleInspections = await this.dbService.searchInspections({
        placa: placa.trim(),
        limit: 200,
        orderBy: 'fecha',
        orderDirection: 'desc'
      });

      if (vehicleInspections.inspecciones.length === 0) {
        return errorResponse(res, 'VEHICULO_NO_ENCONTRADO', 'Vehículo no encontrado en el sistema', 404);
      }

      // Estadísticas del vehículo
      const vehicleStats = this.calculateVehicleStats(vehicleInspections.inspecciones);

      // Conductores que han manejado este vehículo
      const conductors = includeConductors ? 
        this.getVehicleConductors(vehicleInspections.inspecciones) : [];

      // Análisis de patrones si se solicita
      const patterns = includePatterns ? 
        this.analyzeVehiclePatterns(vehicleInspections.inspecciones) : {};

      const response = {
        vehiculo: {
          placa: placa.toUpperCase(),
          tipo: vehicleInspections.inspecciones[0]?.tipo_vehiculo,
          marca: vehicleInspections.inspecciones[0]?.marca_vehiculo,
          ultimaInspeccion: vehicleInspections.inspecciones[0]?.fecha
        },
        estadisticas: vehicleStats,
        historial: vehicleInspections.inspecciones,
        conductores: conductors,
        patrones: patterns,
        recomendaciones: this.generateVehicleRecommendations(vehicleStats, patterns)
      };

      console.log(`[SEARCH] ✅ Historial del vehículo obtenido: ${vehicleInspections.inspecciones.length} inspecciones`);

      return successResponse(res, response, `Historial del vehículo ${placa} obtenido`);

    } catch (error) {
      console.error('[SEARCH] ❌ Error obteniendo historial del vehículo:', error);
      return errorResponse(res, 'HISTORIAL_VEHICULO_ERROR', error.message, 500);
    }
  }

  // 🚨 Búsqueda de alertas activas
  async getActiveAlerts(req, res) {
    try {
      const { 
        severity = 'all',        // Severidad de alertas
        timeframe = '24h',       // Marco temporal
        limit = 50,             // Límite de resultados
        includeResolved = false  // Incluir alertas resueltas
      } = req.query;

      console.log('[SEARCH] 🚨 Obteniendo alertas activas');

      // Obtener alertas críticas
      const criticalAlerts = await this.dbService.getCriticalAlerts(parseInt(limit));

      // Filtrar por severidad si se especifica
      let filteredAlerts = criticalAlerts;
      if (severity !== 'all') {
        filteredAlerts = criticalAlerts.filter(alert => 
          alert.severity.toLowerCase() === severity.toLowerCase()
        );
      }

      // Filtrar por tiempo
      if (timeframe !== 'all') {
        const hours = this.parseTimeframe(timeframe);
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        filteredAlerts = filteredAlerts.filter(alert => 
          new Date(alert.fecha) >= cutoffTime
        );
      }

      // Agrupar alertas por tipo y severidad
      const alertSummary = this.groupAlertsByType(filteredAlerts);

      // Generar recomendaciones de acción
      const actionPlan = this.generateAlertActionPlan(filteredAlerts);

      const response = {
        alertas: filteredAlerts,
        resumen: {
          total: filteredAlerts.length,
          criticas: filteredAlerts.filter(a => a.severity === 'CRITICO').length,
          altas: filteredAlerts.filter(a => a.severity === 'ALTO').length,
          medias: filteredAlerts.filter(a => a.severity === 'MEDIO').length
        },
        agrupacion: alertSummary,
        planAccion: actionPlan,
        estadisticas: {
          timeframe,
          generadoEn: new Date().toISOString()
        }
      };

      console.log(`[SEARCH] ✅ Alertas activas obtenidas: ${filteredAlerts.length} alertas`);

      return successResponse(res, response, `${filteredAlerts.length} alertas activas encontradas`);

    } catch (error) {
      console.error('[SEARCH] ❌ Error obteniendo alertas activas:', error);
      return errorResponse(res, 'ALERTAS_ERROR', error.message, 500);
    }
  }

  // 🔧 MÉTODOS DE UTILIDAD

  // Validar parámetros de búsqueda
  validateSearchParameters(params) {
    const errors = [];
    
    // Validar texto de búsqueda mínimo
    if (params.q && params.q.trim().length < 2) {
      errors.push('La consulta de texto debe tener al menos 2 caracteres');
    }
    
    // Validar rango de fechas
    if (params.fechaInicio && params.fechaFin) {
      const inicio = new Date(params.fechaInicio);
      const fin = new Date(params.fechaFin);
      
      if (fin < inicio) {
        errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      
      // Validar que no sea un rango muy amplio (más de 2 años)
      const diffTime = Math.abs(fin - inicio);
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
      if (diffYears > 2) {
        errors.push('El rango de fechas no puede ser mayor a 2 años');
      }
    }
    
    // Validar parámetros numéricos
    if (params.page && (isNaN(params.page) || parseInt(params.page) < 1)) {
      errors.push('El número de página debe ser un entero positivo');
    }
    
    if (params.limit && (isNaN(params.limit) || parseInt(params.limit) < 1 || parseInt(params.limit) > 100)) {
      errors.push('El límite debe estar entre 1 y 100');
    }
    
    if (params.ano && (isNaN(params.ano) || parseInt(params.ano) < 2020 || parseInt(params.ano) > new Date().getFullYear() + 1)) {
      errors.push('El año debe estar en un rango válido');
    }
    
    if (params.mes && (isNaN(params.mes) || parseInt(params.mes) < 1 || parseInt(params.mes) > 12)) {
      errors.push('El mes debe estar entre 1 y 12');
    }
    
    // Validar campos de ordenamiento
    const validSortFields = ['fecha', 'conductor_nombre', 'placa_vehiculo', 'estado_inspeccion', 'nivel_riesgo', 'puntaje_total'];
    if (params.sortBy && !validSortFields.includes(params.sortBy)) {
      errors.push(`Campo de ordenamiento no válido. Opciones: ${validSortFields.join(', ')}`);
    }
    
    const validSortOrders = ['asc', 'desc'];
    if (params.sortOrder && !validSortOrders.includes(params.sortOrder.toLowerCase())) {
      errors.push('El orden debe ser "asc" o "desc"');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Mapear campos de ordenamiento a campos de DB
  mapSortField(sortBy) {
    const mapping = {
      'fecha': 'fecha',
      'conductor': 'conductor_nombre',
      'conductor_nombre': 'conductor_nombre',
      'placa': 'placa_vehiculo',
      'placa_vehiculo': 'placa_vehiculo',
      'estado': 'estado_inspeccion',
      'estado_inspeccion': 'estado_inspeccion',
      'riesgo': 'nivel_riesgo',
      'nivel_riesgo': 'nivel_riesgo',
      'puntaje': 'puntaje_total',
      'puntaje_total': 'puntaje_total'
    };
    
    return mapping[sortBy] || 'fecha';
  }

  // Generar indicadores de riesgo visuales
  generateRiskIndicators(inspeccion) {
    const indicators = [];
    
    if (inspeccion.consumo_medicamentos) {
      indicators.push({ type: 'CRITICO', icon: '🚨', message: 'Medicamentos/Sustancias' });
    }
    
    if (!inspeccion.horas_sueno_suficientes) {
      indicators.push({ type: 'ADVERTENCIA', icon: '😴', message: 'Sueño Insuficiente' });
    }
    
    if (!inspeccion.libre_sintomas_fatiga) {
      indicators.push({ type: 'ADVERTENCIA', icon: '🤒', message: 'Síntomas de Fatiga' });
    }
    
    if (!inspeccion.condiciones_aptas) {
      indicators.push({ type: 'ADVERTENCIA', icon: '❌', message: 'No Apto' });
    }
    
    return indicators;
  }

  // Generar resumen de problemas
  generateProblemSummary(inspeccion) {
    const problems = [];
    
    // Problemas del conductor
    if (inspeccion.consumo_medicamentos) problems.push('Consumo medicamentos');
    if (!inspeccion.horas_sueno_suficientes) problems.push('Poco sueño');
    if (!inspeccion.libre_sintomas_fatiga) problems.push('Síntomas fatiga');
    if (!inspeccion.condiciones_aptas) problems.push('No apto');
    
    // Problemas del vehículo
    if (inspeccion.luces_funcionando === false) problems.push('Luces');
    if (inspeccion.frenos_funcionando === false) problems.push('Frenos');
    if (inspeccion.kit_carretera === false) problems.push('Kit carretera');
    
    return {
      count: problems.length,
      items: problems,
      summary: problems.length === 0 ? 'Sin problemas' : `${problems.length} problemas detectados`
    };
  }

  // Calcular días desde inspección
  calculateDaysSince(fecha) {
    return Math.floor((new Date() - new Date(fecha)) / (1000 * 60 * 60 * 24));
  }

  // Determinar estado de seguimiento
  determineFollowUpStatus(inspeccion) {
    if (inspeccion.tiene_alerta_roja) return 'REQUIERE_ACCION_INMEDIATA';
    if (inspeccion.tiene_advertencias) return 'SEGUIMIENTO_REQUERIDO';
    if (inspeccion.estado_inspeccion === 'PENDIENTE') return 'PENDIENTE_REVISION';
    return 'COMPLETADO';
  }

  // Calcular estadísticas de búsqueda
  calculateSearchStats(inspecciones) {
    if (inspecciones.length === 0) return {};
    
    const stats = {
      alertasRojas: inspecciones.filter(i => i.tiene_alerta_roja).length,
      advertencias: inspecciones.filter(i => i.tiene_advertencias).length,
      puntajePromedio: inspecciones.reduce((sum, i) => sum + (i.puntaje_total || 0), 0) / inspecciones.length,
      riesgoDistribution: {}
    };
    
    // Distribución de riesgo
    const riesgos = inspecciones.map(i => i.nivel_riesgo);
    stats.riesgoDistribution = riesgos.reduce((acc, riesgo) => {
      acc[riesgo] = (acc[riesgo] || 0) + 1;
      return acc;
    }, {});
    
    return stats;
  }

  // Generar sugerencias de búsqueda
  async generateSearchSuggestions(filters) {
    const suggestions = [];
    
    if (filters.query) {
      suggestions.push(`Intenta buscar: "${filters.query.substring(0, filters.query.length - 1)}"`);
      suggestions.push('Revisa la ortografía de tu búsqueda');
    }
    
    if (filters.fechaInicio && filters.fechaFin) {
      suggestions.push('Intenta ampliar el rango de fechas');
    }
    
    suggestions.push('Usa filtros menos específicos');
    suggestions.push('Busca por placa de vehículo o nombre de conductor');
    
    return suggestions.slice(0, 3);
  }

  // Obtener filtros disponibles
  async getAvailableFilters(currentFilters) {
    try {
      // Esta función podría consultar la DB para obtener valores únicos
      // Por ahora devolvemos valores estáticos comunes
      return {
        estados: ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'ALERTA_ROJA', 'ADVERTENCIA'],
        nivelesRiesgo: ['BAJO', 'MEDIO', 'ALTO', 'CRITICO'],
        años: [2023, 2024, 2025],
        meses: Array.from({length: 12}, (_, i) => i + 1)
      };
    } catch (error) {
      return {};
    }
  }

  // Métodos adicionales para funcionalidades avanzadas...
  buildComplexQuery(criterios, operador) {
    // Implementación de construcción de query compleja
    // Por ahora retornamos el primer criterio como ejemplo
    return criterios[0] || {};
  }

  getTimeframeDays(timeframe) {
    const mapping = {
      '1week': 7,
      '1month': 30,
      '3months': 90,
      '6months': 180,
      '1year': 365
    };
    return mapping[timeframe] || 365;
  }

  parseTimeframe(timeframe) {
    const mapping = {
      '1h': 1,
      '24h': 24,
      '48h': 48,
      '1week': 168,
      '1month': 720
    };
    return mapping[timeframe] || 24;
  }

  // Métodos de análisis (implementación simplificada)
  analyzeSearchPatterns(inspecciones) {
    return { implemented: false, message: 'Análisis de patrones en desarrollo' };
  }

  analyzeRiskDistribution(inspecciones) {
    const distribution = inspecciones.reduce((acc, insp) => {
      acc[insp.nivel_riesgo] = (acc[insp.nivel_riesgo] || 0) + 1;
      return acc;
    }, {});
    return distribution;
  }

  analyzeTimeDistribution(inspecciones) {
    const distribution = inspecciones.reduce((acc, insp) => {
      const month = new Date(insp.fecha).getMonth() + 1;
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});
    return distribution;
  }

  // Métodos de análisis específicos del conductor y vehículo
  analyzeDriverRiskTrend(historial) {
    return historial.slice(0, 10).map(h => h.nivel_riesgo);
  }

  analyzeMostCommonIssues(historial) {
    const issues = {};
    historial.forEach(h => {
      if (h.consumo_medicamentos) issues.medicamentos = (issues.medicamentos || 0) + 1;
      if (!h.horas_sueno_suficientes) issues.sueno = (issues.sueno || 0) + 1;
      if (!h.libre_sintomas_fatiga) issues.fatiga = (issues.fatiga || 0) + 1;
    });
    
    return Object.entries(issues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue, count]) => ({ issue, count }));
  }

  analyzeDriverTimePatterns(historial) {
    const patterns = {};
    historial.forEach(h => {
      patterns[h.turno] = (patterns[h.turno] || 0) + 1;
    });
    return patterns;
  }

  identifyImprovementAreas(estadisticas) {
    const areas = [];
    if (estadisticas.alertasRojas > 0) areas.push('Gestión de medicamentos');
    if (estadisticas.advertencias > estadisticas.totalInspecciones * 0.3) areas.push('Descanso y fatiga');
    return areas;
  }

  generateDriverRecommendations(driverHistory, patternAnalysis) {
    const recommendations = [];
    
    if (driverHistory.estadisticas.alertasRojas > 0) {
      recommendations.push({
        priority: 'ALTA',
        area: 'Seguridad Médica',
        action: 'Evaluación médica inmediata requerida'
      });
    }
    
    if (patternAnalysis.mostCommonIssues.some(issue => issue.issue === 'sueno')) {
      recommendations.push({
        priority: 'MEDIA',
        area: 'Descanso',
        action: 'Implementar protocolo de descanso obligatorio'
      });
    }
    
    return recommendations;
  }

  calculateVehicleStats(inspecciones) {
    return {
      totalInspecciones: inspecciones.length,
      problemasRecurrentes: 0, // Implementar lógica específica
      ultimoMantenimiento: inspecciones[0]?.fecha,
      promedioProblemas: 0
    };
  }

  getVehicleConductors(inspecciones) {
    const conductores = {};
    inspecciones.forEach(insp => {
      if (insp.conductor_nombre) {
        conductores[insp.conductor_nombre] = {
          nombre: insp.conductor_nombre,
          inspecciones: (conductores[insp.conductor_nombre]?.inspecciones || 0) + 1
        };
      }
    });
    return Object.values(conductores);
  }

  analyzeVehiclePatterns(inspecciones) {
    return { implemented: false };
  }

  generateVehicleRecommendations(stats, patterns) {
    return [];
  }

  groupAlertsByType(alerts) {
    return alerts.reduce((acc, alert) => {
      const type = alert.alertType || 'OTROS';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  generateAlertActionPlan(alerts) {
    const plan = [];
    
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICO');
    if (criticalAlerts.length > 0) {
      plan.push({
        priority: 1,
        action: 'Atender alertas críticas inmediatamente',
        count: criticalAlerts.length,
        timeframe: 'Inmediato'
      });
    }
    
    const highAlerts = alerts.filter(a => a.severity === 'ALTO');
    if (highAlerts.length > 0) {
      plan.push({
        priority: 2,
        action: 'Revisar y seguir alertas de alta prioridad',
        count: highAlerts.length,
        timeframe: 'En las próximas 2 horas'
      });
    }
    
    return plan;
  }

  async exportSearchResults(res, results, format, filename) {
    // TODO: Implementar exportación en diferentes formatos
    console.log(`[SEARCH] 📤 Exportando ${results.inspecciones.length} resultados en formato ${format}`);
    
    return successResponse(res, {
      message: 'Exportación en desarrollo',
      format,
      filename,
      count: results.inspecciones.length
    });
  }
}

module.exports = SearchController;