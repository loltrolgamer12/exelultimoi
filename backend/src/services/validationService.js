// 📄 ARCHIVO: backend/src/services/validationService.js
// 🔧 VERSIÓN CORREGIDA con validaciones estrictas

class ValidationService {
  constructor() {
    // 📋 CAMPOS OBLIGATORIOS (CRÍTICOS)
    this.requiredFields = [
      'fecha',
      'conductor_nombre', 
      'placa_vehiculo',
      'contrato',
      'turno'
    ];

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
        medicamentos: 50,
        fatiga: 15,
        vehiculo: 10,
        mantenimiento: 5
      }
    };
  }

  // 🔍 VALIDACIÓN COMPLETA DE REGISTRO
  validateRecord(record) {
    console.log(`[VALIDATION] 🔍 Validando registro: ${record.placa_vehiculo || 'SIN_PLACA'}`);
    
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
        totalFields: Object.keys(record).length,
        recordId: record.id
      }
    };

    try {
      // 🚨 PASO 1: VALIDACIÓN CRÍTICA DE CAMPOS OBLIGATORIOS
      this.validateRequiredFields(record, validationResult);
      
      // ⚠️ Si faltan campos obligatorios, DETENER validación
      if (validationResult.errors.length > 0) {
        validationResult.isValid = false;
        console.error(`[VALIDATION] ❌ VALIDACIÓN FALLIDA - Campos obligatorios faltantes:`, 
          validationResult.errors.map(e => e.field));
        return validationResult;
      }
      
      // 2. Validar formatos específicos
      this.validateFormats(record, validationResult);
      
      // 3. Validar lógica de negocio
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
      validationResult.errors.push({
        type: 'VALIDATION_ERROR',
        field: 'SYSTEM',
        message: `Error interno de validación: ${error.message}`,
        severity: 'ERROR'
      });
    }

    return validationResult;
  }

  // ✅ VALIDAR CAMPOS OBLIGATORIOS (CRÍTICO)
  validateRequiredFields(record, result) {
    console.log('[VALIDATION] 🔍 Validando campos obligatorios...');
    
    const errors = [];
    
    this.requiredFields.forEach(field => {
      const value = record[field];
      
      // ⚠️ VALIDACIÓN ESTRICTA: null, undefined, string vacío, solo espacios
      const isEmpty = value === null || 
                     value === undefined || 
                     value === '' || 
                     (typeof value === 'string' && value.trim() === '');
      
      if (isEmpty) {
        const error = {
          field: field,
          type: 'REQUIRED_FIELD',
          message: `Campo obligatorio faltante: ${field}`,
          severity: 'ERROR',
          value: value, // Incluir el valor para debugging
          recordId: record.id
        };
        
        errors.push(error);
        result.errors.push(error);
        
        console.error(`[VALIDATION] ❌ CAMPO OBLIGATORIO VACÍO: ${field} = "${value}"`);
      } else {
        result.metadata.validatedFields++;
        console.log(`[VALIDATION] ✅ Campo obligatorio válido: ${field} = "${value}"`);
      }
    });
    
    if (errors.length > 0) {
      console.error(`[VALIDATION] ❌ TOTAL ERRORES DE CAMPOS OBLIGATORIOS: ${errors.length}`);
      console.error('[VALIDATION] ❌ Detalles:', errors.map(e => `${e.field}: "${e.value}"`));
    }
    
    return errors;
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

    // Validar nombre de conductor
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
    if (record.turno && !this.validateTurno(record.turno)) {
      result.warnings.push({
        field: 'turno',
        type: 'INVALID_TURNO',
        message: `Turno no reconocido: ${record.turno}`,
        severity: 'WARNING',
        expectedValues: ['DIURNO', 'NOCTURNO', 'MAÑANA', 'TARDE', 'NOCHE']
      });
    }
  }

  // 🏢 VALIDAR LÓGICA DE NEGOCIO
  validateBusinessLogic(record, result) {
    // Validar coherencia de datos
    if (record.kilometraje && record.kilometraje < 0) {
      result.errors.push({
        field: 'kilometraje',
        type: 'INVALID_VALUE',
        message: 'El kilometraje no puede ser negativo',
        severity: 'ERROR'
      });
    }

    // Validar que el kilometraje sea razonable
    if (record.kilometraje && record.kilometraje > 999999) {
      result.warnings.push({
        field: 'kilometraje',
        type: 'SUSPICIOUS_VALUE',
        message: 'Kilometraje muy alto, verificar',
        severity: 'WARNING'
      });
    }
  }

  // 🔍 VALIDACIONES ESPECÍFICAS DE FORMATO

  validatePlacaVehiculo(placa) {
    if (!placa || typeof placa !== 'string') return false;
    
    // Limpiar la placa
    const placaLimpia = placa.replace(/\s+/g, '').replace(/-+/g, '').toUpperCase();
    
    // Patrones de placas colombianas
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
      const fakePlates = ['AAA000', 'ABC000', '000000', 'TEST01', 'XXXX00'];
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
      return { isValid: false, message: 'Nombre es requerido' };
    }
    
    const nombreLimpio = nombre.trim();
    
    // Debe tener al menos 2 caracteres
    if (nombreLimpio.length < 2) {
      return { 
        isValid: false, 
        message: 'Nombre muy corto (mínimo 2 caracteres)' 
      };
    }
    
    // No debe tener solo números
    if (/^\d+$/.test(nombreLimpio)) {
      return { 
        isValid: false, 
        message: 'Nombre no puede ser solo números' 
      };
    }
    
    // No debe tener caracteres especiales extraños
    if (/[<>{}[\]\\|`~!@#$%^&*()+=]/.test(nombreLimpio)) {
      return { 
        isValid: false, 
        message: 'Nombre contiene caracteres no permitidos',
        suggestions: ['Remover caracteres especiales'] 
      };
    }
    
    return { isValid: true };
  }

  validateTurno(turno) {
    if (!turno || typeof turno !== 'string') return false;
    
    const turnoNormalizado = turno.trim().toUpperCase();
    const turnosValidos = [
      'DIURNO', 'NOCTURNO', 
      'MAÑANA', 'TARDE', 'NOCHE',
      'DIA', 'NOCHE',
      'TURNO 1', 'TURNO 2', 'TURNO 3',
      'A', 'B', 'C' // Turnos por letra
    ];
    
    return turnosValidos.includes(turnoNormalizado) ||
           turnosValidos.some(t => turnoNormalizado.includes(t));
  }

  // 🎯 CALCULAR NIVEL DE RIESGO
  calculateRiskLevel(record) {
    let riskScore = 0;
    
    // Factores de riesgo de fatiga
    if (!record.horas_sueno || record.horas_sueno === false) riskScore += 15;
    if (!record.libre_fatiga || record.libre_fatiga === false) riskScore += 15;
    
    // Factores de riesgo vehicular
    if (!record.frenos || record.frenos === false) riskScore += 20;
    if (!record.cinturones || record.cinturones === false) riskScore += 10;
    if (!record.direccionales || record.direccionales === false) riskScore += 5;
    
    // Determinar nivel
    if (riskScore >= 30) return 'ALTO';
    if (riskScore >= 15) return 'MEDIO';
    return 'BAJO';
  }

  // 📊 CALCULAR PUNTAJE DE INSPECCIÓN
  calculateInspectionScore(record) {
    const totalFields = [
      'frenos', 'cinturones', 'espejos', 'direccionales',
      'baterias', 'aceite_motor', 'fluido_frenos', 'documentacion'
    ];
    
    let positiveFields = 0;
    totalFields.forEach(field => {
      if (record[field] === true) positiveFields++;
    });
    
    return Math.round((positiveFields / totalFields.length) * 100);
  }

  // 🚨 DETECTAR ALERTAS CRÍTICAS
  detectCriticalAlerts(record) {
    const alerts = [];
    
    // Alerta por problemas críticos de fatiga
    const fatigueProblems = [
      !record.horas_sueno,
      !record.libre_fatiga
    ].filter(Boolean).length;

    if (fatigueProblems >= 1) {
      alerts.push({
        id: `fatiga_${Date.now()}`,
        type: 'FATIGA_CRITICA',
        level: 'ALTO',
        title: '😴 CONDUCTOR EN RIESGO DE FATIGA',
        message: 'Problemas críticos de descanso detectados',
        conductor: record.conductor_nombre,
        placa: record.placa_vehiculo,
        details: {
          horasSueno: record.horas_sueno,
          libreFatiga: record.libre_fatiga
        },
        actions: [
          'EVALUAR_CONDICION_MEDICA',
          'SUSPENDER_OPERACION',
          'REPORTE_A_SUPERVISION'
        ],
        priority: 1
      });
    }

    // Alerta por vehículo inseguro
    const criticalVehicleIssues = [
      !record.frenos,
      !record.cinturones
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
          frenos: record.frenos,
          cinturones: record.cinturones
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

  // 🔍 VALIDAR LOTE DE REGISTROS
  validateBatch(records) {
    console.log(`[VALIDATION] 🔍 Validando lote de ${records.length} registros...`);
    
    const results = {
      validRecords: [],
      invalidRecords: [],
      totalErrors: 0,
      totalWarnings: 0,
      criticalAlerts: [],
      summary: {}
    };
    
    records.forEach((record, index) => {
      const validation = this.validateRecord(record);
      
      if (validation.isValid) {
        results.validRecords.push({
          record: record,
          validation: validation
        });
      } else {
        results.invalidRecords.push({
          record: record,
          validation: validation,
          index: index
        });
      }
      
      results.totalErrors += validation.errors.length;
      results.totalWarnings += validation.warnings.length;
      results.criticalAlerts.push(...validation.criticalAlerts);
    });
    
    results.summary = {
      totalRecords: records.length,
      validRecords: results.validRecords.length,
      invalidRecords: results.invalidRecords.length,
      successRate: Math.round((results.validRecords.length / records.length) * 100),
      totalErrors: results.totalErrors,
      totalWarnings: results.totalWarnings,
      criticalAlerts: results.criticalAlerts.length
    };
    
    console.log(`[VALIDATION] ✅ Validación de lote completada:`, results.summary);
    
    return results;
  }
}

module.exports = ValidationService;