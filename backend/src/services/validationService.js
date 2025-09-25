// ✅ SERVICIO DE VALIDACIONES DE NEGOCIO V2.0
// src/services/validationService.js

const { cleanString } = require('../utils/excelUtils');
const { isValidDate, isValidSpanishDate } = require('../utils/dateUtils');

class ValidationService {
  constructor() {
    this.requiredFields = [
      'fecha',
      'conductor_nombre', 
      'placa_vehiculo'
    ];
    
    this.criticalFields = [
      'consumo_medicamentos',
      'horas_sueno_suficientes',
      'libre_sintomas_fatiga',
      'condiciones_aptas'
    ];
  }

  // 🔍 Validar registro de inspección completo
  async validateInspectionRecord(record) {
    const errors = [];
    const warnings = [];
    
    try {
      // 1. Validaciones básicas requeridas
      this.validateRequiredFields(record, errors);
      
      // 2. Validaciones de formato
      this.validateFieldFormats(record, errors, warnings);
      
      // 3. Validaciones de negocio
      this.validateBusinessRules(record, errors, warnings);
      
      // 4. Validaciones específicas de fatiga
      this.validateFatigueQuestions(record, errors, warnings);
      
      // 5. Validaciones de consistencia
      this.validateDataConsistency(record, errors, warnings);
      
      return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings,
        validatedRecord: this.sanitizeRecord(record),
        riskLevel: this.calculateRiskLevel(record),
        score: this.calculateInspectionScore(record)
      };
      
    } catch (error) {
      console.error('[VALIDATION] Error validando registro:', error);
      return {
        isValid: false,
        errors: [`Error interno de validación: ${error.message}`],
        warnings: [],
        validatedRecord: record,
        riskLevel: 'ALTO',
        score: 0
      };
    }
  }

  // 📋 Validar campos requeridos
  validateRequiredFields(record, errors) {
    for (const field of this.requiredFields) {
      const value = record[field];
      
      if (value === null || value === undefined || value === '') {
        errors.push(`Campo requerido faltante: ${field}`);
      }
      
      // Validaciones específicas por campo
      switch (field) {
        case 'conductor_nombre':
          if (value && value.length < 3) {
            errors.push('El nombre del conductor debe tener al menos 3 caracteres');
          }
          break;
          
        case 'placa_vehiculo':
          if (value && !this.validatePlacaVehiculo(value)) {
            errors.push('Formato de placa de vehículo inválido');
          }
          break;
          
        case 'fecha':
          if (value && !isValidDate(value)) {
            errors.push('Formato de fecha inválido');
          }
          break;
      }
    }
  }

  // 📝 Validar formatos de campos
  validateFieldFormats(record, errors, warnings) {
    // Validar cédula si existe
    if (record.conductor_cedula && !this.validateCedula(record.conductor_cedula)) {
      warnings.push('Formato de cédula posiblemente inválido');
    }
    
    // Validar email si existe
    if (record.email && !this.validateEmail(record.email)) {
      errors.push('Formato de email inválido');
    }
    
    // Validar teléfono si existe
    if (record.telefono && !this.validateTelefono(record.telefono)) {
      warnings.push('Formato de teléfono posiblemente inválido');
    }
    
    // Validar hora
    if (record.hora && !this.validateHora(record.hora)) {
      warnings.push('Formato de hora inválido, se usará valor por defecto');
    }
    
    // Validar campos numéricos
    if (record.puntaje_total !== null && record.puntaje_total !== undefined) {
      if (isNaN(record.puntaje_total) || record.puntaje_total < 0 || record.puntaje_total > 100) {
        errors.push('Puntaje total debe ser un número entre 0 y 100');
      }
    }
    
    // Validar año y mes
    if (record.ano && (record.ano < 2020 || record.ano > new Date().getFullYear() + 1)) {
      warnings.push(`Año ${record.ano} fuera del rango esperado`);
    }
    
    if (record.mes && (record.mes < 1 || record.mes > 12)) {
      errors.push('Mes debe estar entre 1 y 12');
    }
  }

  // 🏢 Validar reglas de negocio
  validateBusinessRules(record, errors, warnings) {
    // Validar fecha no futura
    if (record.fecha && record.fecha > new Date()) {
      errors.push('La fecha de inspección no puede ser futura');
    }
    
    // Validar fecha no muy antigua (más de 2 años)
    if (record.fecha) {
      const dosAñosAtras = new Date();
      dosAñosAtras.setFullYear(dosAñosAtras.getFullYear() - 2);
      
      if (record.fecha < dosAñosAtras) {
        warnings.push('Fecha de inspección muy antigua (más de 2 años)');
      }
    }
    
    // Validar turno
    if (record.turno) {
      const turnosValidos = ['MAÑANA', 'TARDE', 'NOCHE', 'MADRUGADA', 'DIA', 'NOCTURNO'];
      if (!turnosValidos.includes(record.turno.toUpperCase())) {
        warnings.push(`Turno "${record.turno}" no reconocido`);
      }
    }
    
    // Validar estado de inspección
    if (record.estado_inspeccion) {
      const estadosValidos = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_REVISION', 'ALERTA_ROJA', 'ADVERTENCIA'];
      if (!estadosValidos.includes(record.estado_inspeccion)) {
        errors.push(`Estado de inspección "${record.estado_inspeccion}" no válido`);
      }
    }
    
    // Validar nivel de riesgo
    if (record.nivel_riesgo) {
      const nivelesValidos = ['BAJO', 'MEDIO', 'ALTO', 'CRITICO'];
      if (!nivelesValidos.includes(record.nivel_riesgo)) {
        errors.push(`Nivel de riesgo "${record.nivel_riesgo}" no válido`);
      }
    }
  }

  // 🚨 Validar preguntas específicas de fatiga del conductor
  validateFatigueQuestions(record, errors, warnings) {
    // 🔴 PREGUNTA CRÍTICA - ALERTA ROJA
    if (record.consumo_medicamentos === true) {
      warnings.push('ALERTA ROJA: Conductor reporta consumo de medicamentos/sustancias que afectan estado de alerta');
    }
    
    // 🟡 PREGUNTAS DE ADVERTENCIA
    if (record.horas_sueno_suficientes === false) {
      warnings.push('ADVERTENCIA: Conductor no ha dormido suficientes horas (menos de 7 horas)');
    }
    
    if (record.libre_sintomas_fatiga === false) {
      warnings.push('ADVERTENCIA: Conductor reporta síntomas de fatiga');
    }
    
    if (record.condiciones_aptas === false) {
      warnings.push('ADVERTENCIA: Conductor no se siente en condiciones aptas para conducir');
    }
    
    // Validar consistencia entre preguntas de fatiga
    if (record.consumo_medicamentos === true && record.condiciones_aptas === true) {
      warnings.push('INCONSISTENCIA: Conductor consume medicamentos pero se siente apto (revisar)');
    }
    
    if (record.horas_sueno_suficientes === false && record.libre_sintomas_fatiga === true) {
      warnings.push('INCONSISTENCIA: Poco sueño pero sin síntomas de fatiga (revisar)');
    }
    
    // Validar que las preguntas críticas estén respondidas
    for (const field of this.criticalFields) {
      if (record[field] === null || record[field] === undefined) {
        warnings.push(`Pregunta crítica de fatiga sin responder: ${field}`);
      }
    }
  }

  // 🔄 Validar consistencia de datos
  validateDataConsistency(record, errors, warnings) {
    // Validar consistencia fecha-año-mes
    if (record.fecha && record.ano && record.mes) {
      const fechaAno = record.fecha.getFullYear();
      const fechaMes = record.fecha.getMonth() + 1;
      
      if (fechaAno !== record.ano) {
        errors.push(`Inconsistencia: Año de fecha (${fechaAno}) no coincide con año registrado (${record.ano})`);
      }
      
      if (fechaMes !== record.mes) {
        errors.push(`Inconsistencia: Mes de fecha (${fechaMes}) no coincide con mes registrado (${record.mes})`);
      }
    }
    
    // Validar consistencia alertas calculadas
    const shouldHaveRedAlert = record.consumo_medicamentos === true;
    if (record.tiene_alerta_roja !== shouldHaveRedAlert) {
      errors.push('Inconsistencia en cálculo de alerta roja');
    }
    
    const shouldHaveWarnings = (
      record.horas_sueno_suficientes === false ||
      record.libre_sintomas_fatiga === false ||
      record.condiciones_aptas === false
    );
    if (record.tiene_advertencias !== shouldHaveWarnings) {
      errors.push('Inconsistencia en cálculo de advertencias');
    }
    
    // Validar consistencia estado-riesgo
    if (record.estado_inspeccion === 'ALERTA_ROJA' && record.nivel_riesgo !== 'CRITICO') {
      warnings.push('Inconsistencia: Alerta roja debería tener riesgo crítico');
    }
    
    if (record.estado_inspeccion === 'ADVERTENCIA' && record.nivel_riesgo === 'BAJO') {
      warnings.push('Inconsistencia: Advertencia no debería tener riesgo bajo');
    }
  }

  // 🧹 Sanitizar y limpiar registro
  sanitizeRecord(record) {
    const sanitized = { ...record };
    
    // Limpiar strings
    const stringFields = [
      'conductor_nombre', 'conductor_cedula', 'placa_vehiculo',
      'contrato', 'campo', 'empresa_contratista', 'observaciones',
      'inspector_nombre', 'turno'
    ];
    
    stringFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = cleanString(sanitized[field]);
      }
    });
    
    // Normalizar placa de vehículo
    if (sanitized.placa_vehiculo) {
      sanitized.placa_vehiculo = sanitized.placa_vehiculo.toUpperCase().replace(/\s+/g, '');
    }
    
    // Normalizar turno
    if (sanitized.turno) {
      sanitized.turno = sanitized.turno.toUpperCase();
    }
    
    // Asegurar valores por defecto para campos booleanos críticos
    if (sanitized.consumo_medicamentos === null || sanitized.consumo_medicamentos === undefined) {
      sanitized.consumo_medicamentos = false;
    }
    if (sanitized.horas_sueno_suficientes === null || sanitized.horas_sueno_suficientes === undefined) {
      sanitized.horas_sueno_suficientes = true;
    }
    if (sanitized.libre_sintomas_fatiga === null || sanitized.libre_sintomas_fatiga === undefined) {
      sanitized.libre_sintomas_fatiga = true;
    }
    if (sanitized.condiciones_aptas === null || sanitized.condiciones_aptas === undefined) {
      sanitized.condiciones_aptas = true;
    }
    
    return sanitized;
  }

  // 📊 Calcular nivel de riesgo
  calculateRiskLevel(record) {
    // CRÍTICO: Consumo de medicamentos/sustancias
    if (record.consumo_medicamentos === true) {
      return 'CRITICO';
    }
    
    // ALTO: Multiple problemas de fatiga
    let fatigueIssues = 0;
    if (record.horas_sueno_suficientes === false) fatigueIssues++;
    if (record.libre_sintomas_fatiga === false) fatigueIssues++;
    if (record.condiciones_aptas === false) fatigueIssues++;
    
    if (fatigueIssues >= 2) {
      return 'ALTO';
    } else if (fatigueIssues === 1) {
      return 'MEDIO';
    }
    
    // MEDIO: Problemas en el vehículo
    let vehicleIssues = 0;
    if (record.luces_funcionando === false) vehicleIssues++;
    if (record.frenos_funcionando === false) vehicleIssues++;
    if (record.kit_carretera === false) vehicleIssues++;
    if (record.extintor_vigente === false) vehicleIssues++;
    if (record.botiquin_completo === false) vehicleIssues++;
    
    if (vehicleIssues >= 2) {
      return 'MEDIO';
    }
    
    // BAJO: Sin problemas significativos
    return 'BAJO';
  }

  // 🏆 Calcular puntaje de inspección
  calculateInspectionScore(record) {
    let score = 100;
    
    // Penalizaciones críticas (fatiga del conductor)
    if (record.consumo_medicamentos === true) score -= 50; // Penalización severa
    if (record.horas_sueno_suficientes === false) score -= 15;
    if (record.libre_sintomas_fatiga === false) score -= 15;
    if (record.condiciones_aptas === false) score -= 20;
    
    // Penalizaciones por estado del vehículo
    if (record.luces_funcionando === false) score -= 10;
    if (record.frenos_funcionando === false) score -= 15;
    if (record.kit_carretera === false) score -= 5;
    if (record.extintor_vigente === false) score -= 5;
    if (record.botiquin_completo === false) score -= 5;
    
    // Estados deficientes en componentes
    if (record.neumaticos_estado === 'MALO') score -= 10;
    if (record.direccion_estado === 'MALO') score -= 12;
    if (record.espejos_estado === 'MALO') score -= 8;
    if (record.cinturones_estado === 'MALO') score -= 8;
    
    return Math.max(0, Math.min(100, score));
  }

  // 🔍 Validaciones específicas de formato

  validatePlacaVehiculo(placa) {
    // Patrones comunes de placas en Colombia
    const patrones = [
      /^[A-Z]{3}[0-9]{3}$/,     // ABC123
      /^[A-Z]{3}-[0-9]{3}$/,    // ABC-123
      /^[A-Z]{2}[0-9]{4}$/,     // AB1234
      /^[A-Z]{2}-[0-9]{4}$/     // AB-1234
    ];
    
    const placaLimpia = placa.replace(/\s+/g, '').toUpperCase();
    return patrones.some(patron => patron.test(placaLimpia));
  }

  validateCedula(cedula) {
    // Validación básica de cédula colombiana
    const cedulaLimpia = cedula.replace(/\D/g, '');
    return cedulaLimpia.length >= 6 && cedulaLimpia.length <= 12 && /^\d+$/.test(cedulaLimpia);
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateTelefono(telefono) {
    // Validación básica para números colombianos
    const telefonoLimpio = telefono.replace(/\D/g, '');
    return telefonoLimpio.length >= 7 && telefonoLimpio.length <= 12;
  }

  validateHora(hora) {
    // Formatos: HH:MM, H:MM, HH:MM:SS
    const horaRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
    return horaRegex.test(hora);
  }

  // 📋 Validar lote de registros
  async validateBatch(records) {
    console.log(`[VALIDATION] Validando lote de ${records.length} registros...`);
    
    const results = {
      valid: [],
      invalid: [],
      warnings: [],
      summary: {
        total: records.length,
        validCount: 0,
        invalidCount: 0,
        warningCount: 0
      }
    };
    
    for (let i = 0; i < records.length; i++) {
      try {
        const validation = await this.validateInspectionRecord(records[i]);
        
        if (validation.isValid) {
          results.valid.push({
            index: i,
            record: validation.validatedRecord,
            score: validation.score,
            riskLevel: validation.riskLevel,
            warnings: validation.warnings
          });
          results.summary.validCount++;
        } else {
          results.invalid.push({
            index: i,
            record: records[i],
            errors: validation.errors,
            warnings: validation.warnings
          });
          results.summary.invalidCount++;
        }
        
        if (validation.warnings.length > 0) {
          results.summary.warningCount++;
          results.warnings.push({
            index: i,
            warnings: validation.warnings
          });
        }
        
      } catch (error) {
        results.invalid.push({
          index: i,
          record: records[i],
          errors: [`Error de validación: ${error.message}`],
          warnings: []
        });
        results.summary.invalidCount++;
      }
    }
    
    console.log(`[VALIDATION] Validación completada:`, results.summary);
    return results;
  }
}

// 🏭 Exportar funciones de utilidad
async function validateInspectionRecord(record) {
  const validator = new ValidationService();
  return await validator.validateInspectionRecord(record);
}

async function validateBatch(records) {
  const validator = new ValidationService();
  return await validator.validateBatch(records);
}

module.exports = {
  ValidationService,
  validateInspectionRecord,
  validateBatch
};