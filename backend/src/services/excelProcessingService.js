// 📄 ARCHIVO: backend/src/services/excelProcessingService.js
// 🔧 VERSIÓN CORREGIDA con validaciones Excel vs Backend vs Frontend

const XLSX = require('xlsx');
const ValidationService = require('./validationService');

class ExcelProcessingService {
  constructor() {
    this.validationService = new ValidationService();
    
    // 🗺️ MAPEO DE COLUMNAS EXCEL → BACKEND (actualizado según análisis)
    this.columnMapping = {
      // Campos básicos
      fecha: "Marca temporal",
      conductor_nombre: "NOMBRE DE QUIEN REALIZA LA INSPECCIÓN ",
      cedula_conductor: "CEDULA CONDUCTOR", // Si existe
      placa_vehiculo: "PLACA DEL VEHICULO",
      contrato: "CONTRATO",
      campo_coordinacion: "CAMPO/COORDINACIÓN",
      turno: "TURNO",
      kilometraje: "KILOMETRAJE",
      
      // 🚨 COLUMNAS DE FATIGA CRÍTICAS (según análisis Excel)
      consumo_medicamentos_excel: "¿Ha consumido medicamentos o sustancias que afecten su estado de alerta?*",
      horas_sueno_excel: "¿Ha dormido al menos 7 horas en las últimas 24 horas?",
      libre_sintomas_fatiga_excel: "¿Se encuentra libre de síntomas de fatiga (Somnolencia, dolor de cabeza, irritabilidad)?",
      condiciones_aptas_excel: "¿Se siente en condiciones físicas y mentales para conducir? ",
      
      // Inspección vehicular
      luces_altas_bajas_excel: "** ALTAS Y BAJAS",
      direccionales_excel: "DIRECCIONALES DERECHA E IZQUIERDA", 
      luces_parqueo_excel: "**DE PARQUEO",
      luces_freno_excel: "**DE FRENO",
      luces_reversa_excel: "**DE REVERSA Y ALARMA DE RETROCESO",
      espejos_excel: "**ESPEJO CENTRAL Y ESPEJOS LATERALES",
      vidrio_frontal_excel: "**VIDRIO FRONTAL",
      frenos_excel: "**FRENOS",
      frenos_emergencia_excel: "**FRENOS DE EMERGENCIA O DE MANO",
      cinturones_excel: "**CINTURONES DE SEGURIDAD",
      limpiaparabrisas_excel: "**LIMPIA BRISAS",
      extintor_excel: "EXTINTOR VIGENTE",
      botiquin_excel: "BOTIQUÍN",
      llantas_labrado_excel: "**LLANTAS - LABRADO (min 2mm DE LABRADO)",
      llantas_cortaduras_excel: "**LLANTAS - SIN CORTADURAS Y SIN ABULTAMIENTOS",
      suspension_excel: "**SUSPENSIÓN (TERMINALES)",
      direccion_excel: "**DIRECCIÓN (TERMINALES)",
      kit_carretera_excel: "Equipo de carretera: gato, llave de pernos, herramienta básica, triángulos o conos, bloques, chaleco, señal pare-siga",
      observaciones: "OBSERVACIONES"
    };

    // 🔄 MAPEO DE VALORES EXCEL → BOOLEAN (según análisis realizado)
    this.booleanMapping = {
      // Valores positivos → true
      'Sí': true, 'Si': true, 'SÍ': true, 'SI': true,
      'Cumple': true, 'CUMPLE': true, 'cumple': true,
      'true': true, 'TRUE': true, '1': true, 1: true,
      
      // Valores negativos → false
      'No': false, 'NO': false, 'no': false,
      'No cumple': false, 'NO CUMPLE': false, 'No Cumple': false,
      'false': false, 'FALSE': false, '0': false, 0: false,
      
      // Valores por defecto
      '': false, null: false, undefined: false
    };

    // 🎯 CAMPOS CRÍTICOS QUE REQUIEREN VALIDACIÓN
    this.criticalFields = [
      'consumo_medicamentos',
      'horas_sueno_suficientes', 
      'libre_sintomas_fatiga',
      'condiciones_aptas',
      'frenos_funcionando',
      'cinturones_seguros'
    ];
  }

  // 🔍 PROCESAR ARCHIVO EXCEL COMPLETO
  async processExcelFile(filePath, options = {}) {
    console.log('[EXCEL-PROCESSING] 📊 Iniciando procesamiento:', filePath);
    
    try {
      // Leer archivo Excel
      const workbook = XLSX.readFile(filePath, {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true,
        defval: '' // Valor por defecto para celdas vacías
      });

      console.log('[EXCEL-PROCESSING] 📋 Hojas encontradas:', workbook.SheetNames);
      
      // Procesar hoja principal (primera hoja o especificada)
      const sheetName = options.sheetName || workbook.SheetNames[0];
      const results = await this.processWorksheet(workbook, sheetName, options);
      
      console.log(`[EXCEL-PROCESSING] ✅ Procesados ${results.processedCount} registros`);
      console.log(`[EXCEL-PROCESSING] ⚠️ Errores: ${results.errors.length}`);
      console.log(`[EXCEL-PROCESSING] 🚨 Alertas críticas: ${results.criticalAlerts.length}`);
      
      return results;
      
    } catch (error) {
      console.error('[EXCEL-PROCESSING] ❌ Error procesando archivo:', error);
      throw new Error(`Error procesando Excel: ${error.message}`);
    }
  }

  // 📊 PROCESAR HOJA DE TRABAJO ESPECÍFICA
  async processWorksheet(workbook, sheetName, options = {}) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Hoja "${sheetName}" no encontrada`);
    }

    // Convertir a JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      blankrows: false,
      range: options.startRow || 0
    });

    console.log(`[EXCEL-PROCESSING] 📊 Filas extraídas: ${rawData.length}`);

    const results = {
      processedRecords: [],
      errors: [],
      warnings: [],
      criticalAlerts: [],
      statistics: {},
      processedCount: 0
    };

    // Procesar cada fila
    for (let i = 0; i < rawData.length; i++) {
      try {
        const normalizedRecord = await this.normalizeExcelRecord(rawData[i], i + 1);
        
        // Validar registro normalizado
        const validationResult = await this.validateRecord(normalizedRecord);
        
        if (validationResult.isValid) {
          results.processedRecords.push(normalizedRecord);
          results.processedCount++;
          
          // Detectar alertas críticas
          const criticalAlert = this.detectCriticalAlerts(normalizedRecord);
          if (criticalAlert) {
            results.criticalAlerts.push(criticalAlert);
          }
          
        } else {
          results.errors.push({
            row: i + 1,
            errors: validationResult.errors,
            data: normalizedRecord
          });
        }
        
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error.message,
          data: rawData[i]
        });
      }
    }

    // Generar estadísticas
    results.statistics = this.generateStatistics(results.processedRecords);
    
    return results;
  }

  // 🔄 NORMALIZAR REGISTRO INDIVIDUAL (FUNCIÓN CRÍTICA)
  async normalizeExcelRecord(excelRow, rowNumber) {
    console.log(`[EXCEL-PROCESSING] 🔄 Normalizando fila ${rowNumber}`);
    
    const normalized = {
      // Metadatos
      fila_excel: rowNumber,
      fecha_procesamiento: new Date().toISOString(),
      
      // 📅 FECHA (conversión desde formato Excel)
      fecha: this.convertExcelDate(excelRow[this.columnMapping.fecha]),
      
      // 👤 CONDUCTOR (limpieza de espacios)
      conductor_nombre: this.cleanText(excelRow[this.columnMapping.conductor_nombre]),
      cedula_conductor: this.cleanText(excelRow[this.columnMapping.cedula_conductor]),
      
      // 🚗 VEHÍCULO (normalización de placa)
      placa_vehiculo: this.normalizeCarPlate(excelRow[this.columnMapping.placa_vehiculo]),
      kilometraje: this.convertToNumber(excelRow[this.columnMapping.kilometraje]),
      
      // 🏢 OPERACIÓN
      contrato: this.cleanText(excelRow[this.columnMapping.contrato]),
      campo_coordinacion: this.cleanText(excelRow[this.columnMapping.campo_coordinacion]),
      turno: this.normalizeShift(excelRow[this.columnMapping.turno]),
      
      // 🚨 FATIGA DEL CONDUCTOR (conversión crítica a booleanos)
      consumo_medicamentos: this.convertToBoolean(excelRow[this.columnMapping.consumo_medicamentos_excel]),
      horas_sueno_suficientes: this.convertToBoolean(excelRow[this.columnMapping.horas_sueno_excel]),
      libre_sintomas_fatiga: this.convertToBoolean(excelRow[this.columnMapping.libre_sintomas_fatiga_excel]),
      condiciones_aptas: this.convertToBoolean(excelRow[this.columnMapping.condiciones_aptas_excel]),
      
      // 🔍 INSPECCIÓN VEHICULAR (conversión a booleanos)
      luces_funcionando: this.convertToBoolean(excelRow[this.columnMapping.luces_altas_bajas_excel]),
      direccionales_funcionando: this.convertToBoolean(excelRow[this.columnMapping.direccionales_excel]),
      frenos_funcionando: this.convertToBoolean(excelRow[this.columnMapping.frenos_excel]),
      frenos_emergencia: this.convertToBoolean(excelRow[this.columnMapping.frenos_emergencia_excel]),
      cinturones_seguros: this.convertToBoolean(excelRow[this.columnMapping.cinturones_excel]),
      espejos_estado: this.normalizeComponentState(excelRow[this.columnMapping.espejos_excel]),
      limpiaparabrisas_funcionando: this.convertToBoolean(excelRow[this.columnMapping.limpiaparabrisas_excel]),
      extintor_vigente: this.convertToBoolean(excelRow[this.columnMapping.extintor_excel]),
      botiquin_completo: this.convertToBoolean(excelRow[this.columnMapping.botiquin_excel]),
      neumaticos_estado: this.normalizeComponentState(excelRow[this.columnMapping.llantas_labrado_excel]),
      kit_carretera: this.convertToBoolean(excelRow[this.columnMapping.kit_carretera_excel]),
      
      // 📝 OBSERVACIONES
      observaciones: this.cleanText(excelRow[this.columnMapping.observaciones]),
      
      // 🏆 CÁLCULOS AUTOMÁTICOS
      nivel_riesgo: null, // Se calculará después
      puntaje_inspeccion: null, // Se calculará después
      tiene_alertas_criticas: null // Se calculará después
    };

    // Calcular campos derivados usando ValidationService
    normalized.nivel_riesgo = this.validationService.calculateRiskLevel(normalized);
    normalized.puntaje_inspeccion = this.validationService.calculateInspectionScore(normalized);
    normalized.tiene_alertas_criticas = this.hasCriticalAlerts(normalized);

    return normalized;
  }

  // 🔄 MÉTODOS DE CONVERSIÓN Y NORMALIZACIÓN

  convertExcelDate(excelDate) {
    if (!excelDate) return null;
    
    try {
      // Si ya es una fecha JavaScript
      if (excelDate instanceof Date) {
        return excelDate.toISOString().split('T')[0];
      }
      
      // Si es un número (formato Excel)
      if (typeof excelDate === 'number') {
        // Excel cuenta días desde 1900-01-01
        const excelEpoch = new Date(1900, 0, 1);
        const jsDate = new Date(excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);
        return jsDate.toISOString().split('T')[0];
      }
      
      // Si es string, intentar parsear
      if (typeof excelDate === 'string') {
        const parsed = new Date(excelDate);
        if (!isNaN(parsed)) {
          return parsed.toISOString().split('T')[0];
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`[EXCEL-PROCESSING] ⚠️ Error convirtiendo fecha: ${excelDate}`);
      return null;
    }
  }

  convertToBoolean(value) {
    if (value === null || value === undefined) return false;
    
    const normalizedValue = String(value).trim();
    return this.booleanMapping.hasOwnProperty(normalizedValue) 
      ? this.booleanMapping[normalizedValue] 
      : false;
  }

  convertToNumber(value) {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  cleanText(text) {
    if (!text) return '';
    return String(text).trim().replace(/\s+/g, ' ');
  }

  normalizeCarPlate(plate) {
    if (!plate) return '';
    
    // Limpiar y normalizar formato de placa
    const cleaned = String(plate)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/-+/g, '-');
      
    // Validar formato usando ValidationService
    if (this.validationService.validatePlacaVehiculo(cleaned)) {
      return cleaned;
    }
    
    console.warn(`[EXCEL-PROCESSING] ⚠️ Placa inválida: ${plate} → ${cleaned}`);
    return cleaned; // Devolver de todos modos pero marcar como advertencia
  }

  normalizeShift(shift) {
    if (!shift) return 'NO_ESPECIFICADO';
    
    const normalized = String(shift).trim().toUpperCase();
    const shiftMapping = {
      'DIURNA': 'DIURNO',
      'DIURNO': 'DIURNO',
      'NOCTURNA': 'NOCTURNO', 
      'NOCTURNO': 'NOCTURNO',
      'DÍA': 'DIURNO',
      'NOCHE': 'NOCTURNO'
    };
    
    return shiftMapping[normalized] || normalized;
  }

  normalizeComponentState(value) {
    if (!value) return 'NO_INSPECCIONADO';
    
    const normalized = String(value).trim().toUpperCase();
    
    if (['CUMPLE', 'BUENO', 'EXCELENTE', 'OK'].includes(normalized)) {
      return 'BUENO';
    } else if (['NO CUMPLE', 'MALO', 'DEFICIENTE', 'DAÑADO'].includes(normalized)) {
      return 'MALO';
    } else if (['REGULAR', 'ACEPTABLE'].includes(normalized)) {
      return 'REGULAR';
    }
    
    return 'NO_INSPECCIONADO';
  }

  // 🚨 DETECCIÓN DE ALERTAS CRÍTICAS
  detectCriticalAlerts(record) {
    const alerts = [];
    
    // ALERTA CRÍTICA: Consumo de medicamentos
    if (record.consumo_medicamentos === true) {
      alerts.push({
        tipo: 'MEDICAMENTOS_CRITICO',
        nivel: 'CRÍTICO',
        mensaje: 'Conductor ha consumido medicamentos que afectan estado de alerta',
        conductor: record.conductor_nombre,
        placa: record.placa_vehiculo,
        accion_requerida: 'SUSPENDER_CONDUCCION_INMEDIATAMENTE'
      });
    }
    
    // ALERTA ALTA: Múltiples problemas de fatiga
    const fatigueIssues = [
      !record.horas_sueno_suficientes,
      !record.libre_sintomas_fatiga, 
      !record.condiciones_aptas
    ].filter(Boolean).length;
    
    if (fatigueIssues >= 2) {
      alerts.push({
        tipo: 'FATIGA_MULTIPLE',
        nivel: 'ALTO',
        mensaje: `${fatigueIssues} problemas de fatiga detectados`,
        conductor: record.conductor_nombre,
        accion_requerida: 'EVALUACION_MEDICA_REQUERIDA'
      });
    }
    
    // ALERTA MEDIA: Problemas vehiculares críticos
    const vehicleIssues = [
      !record.frenos_funcionando,
      !record.cinturones_seguros,
      !record.luces_funcionando
    ].filter(Boolean).length;
    
    if (vehicleIssues >= 1) {
      alerts.push({
        tipo: 'VEHICULO_INSEGURO',
        nivel: 'MEDIO',
        mensaje: `${vehicleIssues} problemas críticos en vehículo`,
        placa: record.placa_vehiculo,
        accion_requerida: 'REPARACION_ANTES_USO'
      });
    }
    
    return alerts.length > 0 ? alerts[0] : null; // Devolver la más crítica
  }

  // 🔍 VALIDAR REGISTRO COMPLETO
  async validateRecord(record) {
    const errors = [];
    
    // Validaciones usando ValidationService
    if (!this.validationService.validatePlacaVehiculo(record.placa_vehiculo)) {
      errors.push(`Placa inválida: ${record.placa_vehiculo}`);
    }
    
    if (!record.conductor_nombre || record.conductor_nombre.length < 3) {
      errors.push('Nombre de conductor requerido (min 3 caracteres)');
    }
    
    if (!record.fecha) {
      errors.push('Fecha requerida');
    }
    
    // Validar campos críticos
    this.criticalFields.forEach(field => {
      if (record[field] === null || record[field] === undefined) {
        errors.push(`Campo crítico faltante: ${field}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // 📊 GENERAR ESTADÍSTICAS DEL PROCESAMIENTO
  generateStatistics(records) {
    if (records.length === 0) return {};
    
    const stats = {
      totalRecords: records.length,
      dateRange: {
        min: Math.min(...records.map(r => new Date(r.fecha || 0))),
        max: Math.max(...records.map(r => new Date(r.fecha || 0)))
      },
      conductorUnico: new Set(records.map(r => r.conductor_nombre)).size,
      vehiculosUnicos: new Set(records.map(r => r.placa_vehiculo)).size,
      
      // Estadísticas de fatiga
      fatiga: {
        medicamentos: records.filter(r => r.consumo_medicamentos).length,
        suenoInsuficiente: records.filter(r => !r.horas_sueno_suficientes).length,
        conSintomas: records.filter(r => !r.libre_sintomas_fatiga).length,
        noAptoConducir: records.filter(r => !r.condiciones_aptas).length
      },
      
      // Distribución de riesgo
      riesgo: {
        BAJO: records.filter(r => r.nivel_riesgo === 'BAJO').length,
        MEDIO: records.filter(r => r.nivel_riesgo === 'MEDIO').length,
        ALTO: records.filter(r => r.nivel_riesgo === 'ALTO').length
      },
      
      // Promedio de puntajes
      puntajePromedio: records.reduce((sum, r) => sum + (r.puntaje_inspeccion || 0), 0) / records.length
    };
    
    return stats;
  }

  // 🔍 VERIFICAR ALERTAS CRÍTICAS
  hasCriticalAlerts(record) {
    return record.consumo_medicamentos === true || 
           (!record.horas_sueno_suficientes && !record.libre_sintomas_fatiga);
  }
}

module.exports = ExcelProcessingService;