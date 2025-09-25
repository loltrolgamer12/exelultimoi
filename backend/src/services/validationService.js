// 📄 ARCHIVO: backend/src/services/validationService.js
// 🔧 VERSIÓN CORREGIDA con validaciones mejoradas basadas en análisis Excel

class ValidationService {
  constructor() {
    // 🎯 CONFIGURACIÓN DE VALIDACIONES
    this.config = {
      // Rangos de puntajes
      scores: {
        EXCELENTE: { min: 90, max: 100 },
        BUENO: { min: 70, max: 89 },
        ACEPTABLE: { min: 50, max: 69 },
        DEFICIENTE: { min: 0, max: 49 }
      },
      
      // Pesos para cálculo de riesgo
      riskWeights: {
        medicamentos: 50,        // Peso más alto - crítico
        fatiga: 15,             // Por cada problema de fatiga  
        vehiculo: 10,           // Por cada problema vehicular
        mantenimiento: 5        // Problemas menores
      },
      
      // Umbrales de alerta
      thresholds: {
        fatigueProblemsForHigh: 2,  // 2+ problemas = ALTO
        vehicleProblemsForMedium: 2 // 2+ problemas = MEDIO
      }
    };

    // 📋 CAMPOS OBLIGATORIOS (según análisis Excel)
    this.requiredFields = [
      'fecha',
      'conductor_nombre', 
      'placa_vehiculo',
      'contrato',
      'turno'
    ];

    // 🚨 CAMPOS DE FATIGA CRÍTICOS
    this.fatigueFields = [
      'consumo_medicamentos',
      'horas_sueno_suficientes',
      'libre_sintomas_fatiga', 
      'condiciones_aptas'
    ];

    // 🔧 CAMPOS DE INSPECCIÓN VEHICULAR
    this.vehicleFields = [
      'frenos_funcionando',
      'cinturones_seguros',
      'luces_funcionando',
      'extintor_vigente',
      'botiquin_completo',
      'neumaticos_estado',
      'espejos_estado'
    ];
  }

  // 🔍 VALIDACIÓN COMPLETA DE REGISTRO
  validateRecord(record) {
    console.log('[VALIDATION] 🔍 Validando registro:', record.placa_vehiculo);
    
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      criticalAlerts: [],
      riskLevel: 'BAJO',
      score: 0,
      metadata: {
        timestamp: new Date().toISOString(),
        validatedFields: 0,
        totalFields: Object.keys(record).length
      }
    };

    try {
      // 1. Validar campos obligatorios
      this.validateRequiredFields(record, validationResult);
      
      // 2. Validar formatos específicos
      this.validateFormats(record, validationResult);
      
      // 3. Validar lógica de negocio (fatiga)
      this.validateBusinessLogic(record, validationResult);
      
      // 4. Calcular nivel de riesgo
      validationResult.riskLevel = this.calculateRiskLevel(record);
      
      // 5. Calcular puntaje de inspección
      validationResult.score = this.calculateInspectionScore(record);
      
      // 6. Detectar alertas críticas
      validationResult.criticalAlerts = this.detectCriticalAlerts(record);
      
      // 7. Determinar validez general
      validationResult.isValid = validationResult.errors.length === 0;
      
      console.log(`[VALIDATION] ${validationResult.isValid ? '✅' : '❌'} Validación completada:`, {
        errors: validationResult.errors.length,
        warnings: validationResult.warnings.length, 
        riskLevel: validationResult.riskLevel,
        score: validationResult.score
      });
      
    } catch (error) {
      console.error('[VALIDATION] ❌ Error en validación:', error);
      validationResult.isValid = false;
      validationResult.errors.push(`Error interno de validación: ${error.message}`);
    }

    return validationResult;
  }

  // ✅ VALIDAR CAMPOS OBLIGATORIOS
  validateRequiredFields(record, result) {
    this.requiredFields.forEach(field => {
      const value = record[field];
      
      if (value === null || value === undefined || value === '') {
        result.errors.push({
          field: field,
          type: 'REQUIRED_FIELD',
          message: `Campo obligatorio faltante: ${field}`,
          severity: 'ERROR'
        });
      } else {
        result.metadata.validatedFields++;
      }
    });
  }

  // 📏 VALIDAR FORMATOS ESPECÍFICOS
  validateFormats(record, result) {
    // Validar placa de vehículo
    if (record.placa_vehiculo && !this.validatePlacaVehiculo(record.placa_vehiculo)) {
      result.errors.push({
        field: 'placa_vehiculo',
        type: 'INVALID_FORMAT',
        message: `Formato de placa inválido: ${record.placa_vehiculo}`,
        severity: 'ERROR',
        expectedFormat: 'ABC123 o AB1234'
      });
    }

    // Validar fecha
    if (record.fecha && !this.validateFecha(record.fecha)) {
      result.errors.push({
        field: 'fecha',
        type: 'INVALID_DATE',
        message: `Formato de fecha inválido: ${record.fecha}`,
        severity: 'ERROR'
      });
    }

    // Validar nombre de conductor (corregir errores de escritura)
    if (record.conductor_nombre) {
      const nameValidation = this.validateNombreConductor(record.conductor_nombre);
      if (!nameValidation.isValid) {
        result.warnings.push({
          field: 'conductor_nombre',
          type: 'NAME_QUALITY',
          message: nameValidation.message,
          severity: 'WARNING',
          suggestions: nameValidation.suggestions
        });
      }
    }

    // Validar turno
    if (record.turno && !['DIURNO', 'NOCTURNO'].includes(record.turno)) {
      result.warnings.push({
        field: 'turno',
        type: 'INVALID_VALUE',
        message: `Valor de turno no estándar: ${record.turno}`,
        severity: 'WARNING',
        expectedValues: ['DIURNO', 'NOCTURNO']
      });
    }
  }

  // 🧠 VALIDAR LÓGICA DE NEGOCIO  
  validateBusinessLogic(record, result) {
    // Validar coherencia en fatiga del conductor
    if (record.consumo_medicamentos === true) {
      // Si consume medicamentos, debería no estar apto
      if (record.condiciones_aptas === true) {
        result.warnings.push({
          field: 'condiciones_aptas',
          type: 'LOGIC_INCONSISTENCY',
          message: 'Conductor consume medicamentos pero se declara apto para conducir',
          severity: 'WARNING',
          recommendation: 'Verificar evaluación médica'
        });
      }
    }

    // Validar correlación entre problemas de fatiga
    const fatigueProblems = this.countFatigueProblems(record);
    if (fatigueProblems >= 2) {
      result.warnings.push({
        field: 'fatigue_correlation', 
        type: 'HIGH_FATIGUE_RISK',
        message: `${fatigueProblems} problemas de fatiga detectados`,
        severity: 'WARNING',
        recommendation: 'Considerar suspensión temporal'
      });
    }

    // Validar fecha futura
    if (record.fecha) {
      const recordDate = new Date(record.fecha);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (recordDate > today) {
        result.warnings.push({
          field: 'fecha',
          type: 'FUTURE_DATE',
          message: 'Fecha de inspección es futura',
          severity: 'WARNING'
        });
      }
    }
  }

  // 🚨 CALCULAR NIVEL DE RIESGO (actualizado según análisis)
  calculateRiskLevel(record) {
    let riskScore = 0;
    let criticalFlags = 0;

    // CRÍTICO: Consumo de medicamentos (peso máximo)
    if (record.consumo_medicamentos === true) {
      return 'CRÍTICO'; // Retorno inmediato - es crítico
    }

    // ALTO: Problemas múltiples de fatiga
    let fatigueIssues = 0;
    if (record.horas_sueno_suficientes === false) fatigueIssues++;
    if (record.libre_sintomas_fatiga === false) fatigueIssues++;
    if (record.condiciones_aptas === false) fatigueIssues++;
    
    if (fatigueIssues >= this.config.thresholds.fatigueProblemsForHigh) {
      riskScore += this.config.riskWeights.fatiga * fatigueIssues;
      criticalFlags++;
    }
    
    // MEDIO: Problemas en vehículo
    let vehicleIssues = 0;
    if (record.frenos_funcionando === false) vehicleIssues++;
    if (record.cinturones_seguros === false) vehicleIssues++;
    if (record.luces_funcionando === false) vehicleIssues++;
    if (record.extintor_vigente === false) vehicleIssues++;
    if (record.botiquin_completo === false) vehicleIssues++;
    
    if (vehicleIssues >= this.config.thresholds.vehicleProblemsForMedium) {
      riskScore += this.config.riskWeights.vehiculo * vehicleIssues;
    }

    // Estados deficientes en componentes
    if (record.neumaticos_estado === 'MALO') riskScore += 10;
    if (record.espejos_estado === 'MALO') riskScore += 8;

    // Determinar nivel final
    if (criticalFlags >= 1 || riskScore >= 50) {
      return 'ALTO';
    } else if (vehicleIssues >= 2 || riskScore >= 20) {
      return 'MEDIO';  
    }
    
    return 'BAJO';
  }

  // 🏆 CALCULAR PUNTAJE DE INSPECCIÓN (mejorado)
  calculateInspectionScore(record) {
    let score = 100; // Comenzar con puntaje perfecto
    
    // Penalizaciones críticas por fatiga del conductor
    if (record.consumo_medicamentos === true) {
      score -= this.config.riskWeights.medicamentos; // -50 puntos
    }
    
    if (record.horas_sueno_suficientes === false) {
      score -= this.config.riskWeights.fatiga; // -15 puntos
    }
    
    if (record.libre_sintomas_fatiga === false) {
      score -= this.config.riskWeights.fatiga; // -15 puntos
    }
    
    if (record.condiciones_aptas === false) {
      score -= 20; // Penalización alta
    }
    
    // Penalizaciones por estado del vehículo
    if (record.frenos_funcionando === false) {
      score -= 15; // Crítico para seguridad
    }
    
    if (record.cinturones_seguros === false) {
      score -= 12; // Muy importante
    }
    
    if (record.luces_funcionando === false) {
      score -= this.config.riskWeights.vehiculo; // -10 puntos
    }
    
    if (record.extintor_vigente === false) {
      score -= this.config.riskWeights.mantenimiento; // -5 puntos
    }
    
    if (record.botiquin_completo === false) {
      score -= this.config.riskWeights.mantenimiento; // -5 puntos
    }
    
    // Estados deficientes en componentes
    if (record.neumaticos_estado === 'MALO') score -= 12;
    if (record.neumaticos_estado === 'REGULAR') score -= 6;
    
    if (record.espejos_estado === 'MALO') score -= 8;
    if (record.espejos_estado === 'REGULAR') score -= 4;
    
    // Bonus por inspección completa
    const completedFields = this.countCompletedFields(record);
    const totalFields = this.requiredFields.length + this.fatigueFields.length + this.vehicleFields.length;
    const completionBonus = Math.floor((completedFields / totalFields) * 5);
    score += completionBonus;
    
    // Retornar puntaje en rango válido
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // 🚨 DETECTAR ALERTAS CRÍTICAS
  detectCriticalAlerts(record) {
    const alerts = [];
    
    // CRÍTICO: Medicamentos
    if (record.consumo_medicamentos === true) {
      alerts.push({
        id: `medicamentos_${Date.now()}`,
        type: 'MEDICAMENTOS_CRITICO',
        level: 'CRÍTICO',
        title: '🚨 SUSPENSIÓN INMEDIATA REQUERIDA',
        message: 'Conductor ha consumido medicamentos que afectan su capacidad de conducción',
        conductor: record.conductor_nombre,
        placa: record.placa_vehiculo,
        fecha: record.fecha,
        actions: [
          'SUSPENDER_CONDUCCION_INMEDIATAMENTE',
          'NOTIFICAR_SUPERVISOR',
          'EVALUAR_MEDICAMENTE',
          'DOCUMENTAR_INCIDENTE'
        ],
        priority: 1,
        autoGenerated: true
      });
    }

    // ALTO: Fatiga múltiple
    const fatigueProblems = this.countFatigueProblems(record);
    if (fatigueProblems >= 2) {
      alerts.push({
        id: `fatiga_${Date.now()}`,
        type: 'FATIGA_MULTIPLE',
        level: 'ALTO',
        title: '⚠️ MÚLTIPLES PROBLEMAS DE FATIGA',
        message: `${fatigueProblems} indicadores de fatiga detectados`,
        conductor: record.conductor_nombre,
        details: {
          suenoInsuficiente: !record.horas_sueno_suficientes,
          conSintomas: !record.libre_sintomas_fatiga,
          noApto: !record.condiciones_aptas
        },
        actions: [
          'EVALUAR_ESTADO_CONDUCTOR',
          'CONSIDERAR_DESCANSO_ADICIONAL',
          'MONITORED_SUPERVISION'
        ],
        priority: 2
      });
    }

    // MEDIO: Problemas vehiculares críticos
    const criticalVehicleIssues = [
      !record.frenos_funcionando,
      !record.cinturones_seguros
    ].filter(Boolean).length;

    if (criticalVehicleIssues >= 1) {
      alerts.push({
        id: `vehiculo_${Date.now()}`,
        type: 'VEHICULO_INSEGURO',
        level: 'MEDIO',
        title: '🔧 VEHÍCULO NO APTO PARA OPERACIÓN',
        message: 'Problemas críticos de seguridad en vehículo',
        placa: record.placa_vehiculo,
        details: {
          frenos: !record.frenos_funcionando,
          cinturones: !record.cinturones_seguros
        },
        actions: [
          'REPARAR_ANTES_DE_USO',
          'INSPECCIONAR_MECANICAMENTE',
          'ACTUALIZAR_MANTENIMIENTO'
        ],
        priority: 3
      });
    }

    return alerts;
  }

  // 🔍 VALIDACIONES ESPECÍFICAS DE FORMATO

  validatePlacaVehiculo(placa) {
    if (!placa) return false;
    
    // Limpiar la placa
    const placaLimpia = placa.replace(/\s+/g, '').replace(/-+/g, '').toUpperCase();
    
    // Patrones de placas colombianas (actualizados)
    const patrones = [
      /^[A-Z]{3}[0-9]{3}$/,     // ABC123 (más común)
      /^[A-Z]{2}[0-9]{4}$/,     // AB1234 (motocicletas) 
      /^[A-Z]{3}[0-9]{2}[A-Z]$/, // ABC12D (servicio público)
      /^[A-Z]{4}[0-9]{2}$/,     // ABCD12 (diplomáticas)
      /^[A-Z]{3}[0-9]{2}$/      // ABC12 (algunos casos especiales)
    ];
    
    const isValid = patrones.some(patron => patron.test(placaLimpia));
    
    // Validaciones adicionales
    if (isValid) {
      // No debe tener caracteres repetidos excesivamente  
      if (/([A-Z0-9])\1{3,}/.test(placaLimpia)) return false;
      
      // No debe ser una placa obviamente falsa
      const fakePlates = ['AAA000', 'ABC000', '000000', 'TEST01'];
      if (fakePlates.includes(placaLimpia)) return false;
    }
    
    return isValid;
  }

  validateFecha(fecha) {
    if (!fecha) return false;
    
    const date = new Date(fecha);
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneMonthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    // Fecha válida y dentro de rango razonable
    return !isNaN(date) && 
           date >= oneYearAgo && 
           date <= oneMonthFromNow;
  }

  validateNombreConductor(nombre) {
    if (!nombre || typeof nombre !== 'string') {
      return {
        isValid: false,
        message: 'Nombre requerido'
      };
    }

    const trimmedNombre = nombre.trim();
    const result = {
      isValid: true,
      message: '',
      suggestions: []
    };

    // Validaciones básicas
    if (trimmedNombre.length < 3) {
      result.isValid = false;
      result.message = 'Nombre muy corto (mínimo 3 caracteres)';
      return result;
    }

    if (trimmedNombre.length > 100) {
      result.isValid = false; 
      result.message = 'Nombre muy largo (máximo 100 caracteres)';
      return result;
    }

    // Detectar errores comunes de escritura
    const commonErrors = [
      { error: /\s{2,}/, suggestion: 'Eliminar espacios dobles' },
      { error: /[0-9]/, suggestion: 'Remover números del nombre' },
      { error: /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/, suggestion: 'Remover caracteres especiales' }
    ];

    commonErrors.forEach(({ error, suggestion }) => {
      if (error.test(trimmedNombre)) {
        result.isValid = false;
        result.suggestions.push(suggestion);
      }
    });

    if (!result.isValid) {
      result.message = 'Formato de nombre incorrecto';
    }

    return result;
  }

  // 🔢 MÉTODOS AUXILIARES

  countFatigueProblems(record) {
    return [
      record.horas_sueno_suficientes === false,
      record.libre_sintomas_fatiga === false,
      record.condiciones_aptas === false
    ].filter(Boolean).length;
  }

  countCompletedFields(record) {
    const allFields = [...this.requiredFields, ...this.fatigueFields, ...this.vehicleFields];
    return allFields.filter(field => 
      record[field] !== null && 
      record[field] !== undefined && 
      record[field] !== ''
    ).length;
  }

  // 📊 GENERAR REPORTE DE VALIDACIÓN
  generateValidationReport(results) {
    const total = results.length;
    const valid = results.filter(r => r.isValid).length;
    const withErrors = results.filter(r => r.errors.length > 0).length;
    const withWarnings = results.filter(r => r.warnings.length > 0).length;
    const criticalAlerts = results.reduce((sum, r) => sum + r.criticalAlerts.length, 0);

    return {
      summary: {
        totalRecords: total,
        validRecords: valid,
        invalidRecords: withErrors,
        recordsWithWarnings: withWarnings,
        successRate: total > 0 ? Math.round((valid / total) * 100) : 0
      },
      alerts: {
        critical: criticalAlerts,
        riskDistribution: this.calculateRiskDistribution(results)
      },
      topErrors: this.getTopErrors(results),
      recommendations: this.generateRecommendations(results)
    };
  }

  calculateRiskDistribution(results) {
    return results.reduce((dist, result) => {
      const level = result.riskLevel || 'BAJO';
      dist[level] = (dist[level] || 0) + 1;
      return dist;
    }, {});
  }

  getTopErrors(results) {
    const errorMap = new Map();
    
    results.forEach(result => {
      result.errors.forEach(error => {
        const key = `${error.type}:${error.field}`;
        errorMap.set(key, (errorMap.get(key) || 0) + 1);
      });
    });

    return Array.from(errorMap.entries())
      .map(([key, count]) => ({ error: key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    const criticalCount = results.filter(r => 
      r.criticalAlerts.some(a => a.level === 'CRÍTICO')
    ).length;
    
    if (criticalCount > 0) {
      recommendations.push({
        priority: 'ALTA',
        message: `${criticalCount} conductores requieren suspensión inmediata por medicamentos`,
        action: 'REVISAR_ALERTAS_CRITICAS'
      });
    }

    const highRiskCount = results.filter(r => r.riskLevel === 'ALTO').length;
    if (highRiskCount > results.length * 0.1) {
      recommendations.push({
        priority: 'MEDIA',
        message: `${highRiskCount} registros de alto riesgo detectados`,
        action: 'IMPLEMENTAR_PROGRAMA_FATIGA'
      });
    }

    return recommendations;
  }
}

// Exporta la clase y la función de validación directa
const validationInstance = new ValidationService();

function validateInspectionRecord(record) {
  // Permite uso async/await aunque el método no sea async
  return Promise.resolve(validationInstance.validateRecord(record));
}

module.exports = {
  ValidationService,
  validateInspectionRecord
};