// 📊 SERVICIO DE PROCESAMIENTO EXCEL V2.0
// src/services/excelService.js

const XLSX = require('xlsx');
const crypto = require('crypto');
const { getPrismaClient } = require('../config/database');
const { validateInspectionRecord } = require('./validationService');
const { parseSpanishDate, detectDatePatterns, extractDateInfo } = require('../utils/dateUtils');
const { cleanString, generateUniqueId } = require('../utils/excelUtils');

class ExcelService {
  constructor() {
    this.prisma = getPrismaClient();
    this.processedRecords = 0;
    this.duplicateRecords = 0;
    this.errorRecords = 0;
    this.validationErrors = [];
    this.warnings = [];
  }

  // 🔍 Analizar estructura del archivo Excel
  async analyzeExcelFile(buffer, filename) {
    try {
      console.log(`[EXCEL] 🔍 Analizando archivo: ${filename}`);
      
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        dateNF: 'dd/mm/yyyy',
        raw: false
      });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON para análisis
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false
      });
      
      if (jsonData.length < 2) {
        throw new Error('El archivo debe tener al menos un encabezado y una fila de datos');
      }
      
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);
      
      console.log(`[EXCEL] 📊 Archivo analizado: ${dataRows.length} filas, ${headers.length} columnas`);
      
      // 📅 Detectar fechas y período del archivo
      const dateInfo = await this.detectFilePeriod(dataRows, headers);
      
      // 🔍 Analizar estructura de columnas
      const columnAnalysis = this.analyzeColumns(headers, dataRows.slice(0, 10));
      
      // 📊 Generar hash del archivo para control de duplicados
      const fileHash = this.generateFileHash(buffer);
      
      return {
        filename,
        fileHash,
        totalRows: dataRows.length,
        totalColumns: headers.length,
        headers,
        dateInfo,
        columnAnalysis,
        sampleData: dataRows.slice(0, 3), // Primeras 3 filas como muestra
        estimatedProcessingTime: Math.ceil(dataRows.length / 1000) * 2, // ~2 segundos por cada 1000 registros
        warnings: this.warnings
      };
      
    } catch (error) {
      console.error('[EXCEL] ❌ Error analizando archivo:', error);
      throw new Error(`Error analizando archivo Excel: ${error.message}`);
    }
  }

  // 📅 Detectar período del archivo (año y meses)
  async detectFilePeriod(dataRows, headers) {
    console.log('[EXCEL] 📅 Detectando período del archivo...');
    
    const fechaColumnIndex = this.findDateColumn(headers);
    
    if (fechaColumnIndex === -1) {
      throw new Error('No se encontró una columna de fecha válida');
    }
    
    const fechas = [];
    const años = new Set();
    const meses = new Set();
    
    // Analizar hasta 100 filas para detectar el patrón
    for (let i = 0; i < Math.min(dataRows.length, 100); i++) {
      const row = dataRows[i];
      const fechaValue = row[fechaColumnIndex];
      
      if (!fechaValue) continue;
      
      try {
        const fecha = parseSpanishDate(fechaValue);
        if (fecha && !isNaN(fecha.getTime())) {
          fechas.push(fecha);
          años.add(fecha.getFullYear());
          meses.add(fecha.getMonth() + 1); // getMonth() devuelve 0-11
        }
      } catch (error) {
        // Ignorar fechas inválidas en el análisis inicial
      }
    }
    
    if (fechas.length === 0) {
      throw new Error('No se encontraron fechas válidas en el archivo');
    }
    
    // Determinar período principal
    const añoDetectado = Array.from(años).sort((a, b) => b - a)[0]; // Año más reciente
    const mesesDetectados = Array.from(meses).sort((a, b) => a - b);
    
    const fechaMinima = new Date(Math.min(...fechas.map(f => f.getTime())));
    const fechaMaxima = new Date(Math.max(...fechas.map(f => f.getTime())));
    
    const info = {
      año: añoDetectado,
      meses: mesesDetectados,
      fechaMinima: fechaMinima.toISOString().split('T')[0],
      fechaMaxima: fechaMaxima.toISOString().split('T')[0],
      totalFechasValidas: fechas.length,
      esArchivoAnual: mesesDetectados.length > 3, // Más de 3 meses = archivo anual
      esArchivoMensual: mesesDetectados.length === 1,
      columnIndex: fechaColumnIndex
    };
    
    console.log(`[EXCEL] 📅 Período detectado:`, info);
    
    return info;
  }

  // 🔍 Encontrar columna de fecha
  findDateColumn(headers) {
    const dateKeywords = ['fecha', 'date', 'día', 'dia', 'when'];
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).toLowerCase();
      if (dateKeywords.some(keyword => header.includes(keyword))) {
        return i;
      }
    }
    
    // Si no se encuentra por nombre, buscar por patrón de datos
    return 0; // Asumir primera columna como fallback
  }

  // 📊 Analizar estructura de columnas
  analyzeColumns(headers, sampleRows) {
    console.log('[EXCEL] 📊 Analizando estructura de columnas...');
    
    const analysis = headers.map((header, index) => {
      const values = sampleRows.map(row => row[index]).filter(v => v !== null && v !== undefined && v !== '');
      
      return {
        index,
        name: String(header),
        sampleValues: values.slice(0, 3),
        hasData: values.length > 0,
        estimatedType: this.guessColumnType(values),
        possibleMappings: this.suggestColumnMapping(String(header))
      };
    });
    
    return analysis;
  }

  // 🎯 Sugerir mapeo de columnas
  suggestColumnMapping(headerName) {
    const header = headerName.toLowerCase();
    const mappings = [];
    
    if (header.includes('fecha') || header.includes('date')) mappings.push('fecha');
    if (header.includes('hora') || header.includes('time')) mappings.push('hora');
    if (header.includes('placa') || header.includes('plate')) mappings.push('placa_vehiculo');
    if (header.includes('conductor') || header.includes('driver')) mappings.push('conductor_nombre');
    if (header.includes('cedula') || header.includes('id')) mappings.push('conductor_cedula');
    if (header.includes('contrato') || header.includes('contract')) mappings.push('contrato');
    if (header.includes('turno') || header.includes('shift')) mappings.push('turno');
    
    // 🚨 NUEVOS CAMPOS DE FATIGA
    if (header.includes('medicamento') || header.includes('sustancia')) mappings.push('consumo_medicamentos');
    if (header.includes('sueño') || header.includes('dormi')) mappings.push('horas_sueno_suficientes');
    if (header.includes('fatiga') || header.includes('sintoma')) mappings.push('libre_sintomas_fatiga');
    if (header.includes('apto') || header.includes('condici')) mappings.push('condiciones_aptas');
    
    return mappings;
  }

  // 🔢 Adivinar tipo de columna
  guessColumnType(values) {
    if (values.length === 0) return 'empty';
    
    const sampleValue = values[0];
    
    if (typeof sampleValue === 'boolean') return 'boolean';
    if (typeof sampleValue === 'number') return 'number';
    if (sampleValue instanceof Date) return 'date';
    
    // Análisis de strings
    const str = String(sampleValue);
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) return 'date';
    if (/^\d+(\.\d+)?$/.test(str)) return 'number';
    if (/^(si|no|sí|true|false)$/i.test(str)) return 'boolean';
    
    return 'string';
  }

  // 🏗️ Procesar archivo Excel completo
  async processExcelFile(buffer, filename, options = {}) {
    const startTime = Date.now();
    console.log(`[EXCEL] 🚀 Iniciando procesamiento de: ${filename}`);
    
    // Reset counters
    this.processedRecords = 0;
    this.duplicateRecords = 0;
    this.errorRecords = 0;
    this.validationErrors = [];
    this.warnings = [];
    
    try {
      // 1. Analizar archivo
      const analysis = await this.analyzeExcelFile(buffer, filename);
      
      // 2. Verificar si el archivo ya fue procesado
      const existingFile = await this.checkDuplicateFile(analysis.fileHash);
      if (existingFile && !options.forceReprocess) {
        throw new Error(`El archivo ya fue procesado el ${existingFile.fecha_procesamiento.toISOString().split('T')[0]}`);
      }
      
      // 3. Procesar datos
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      
      console.log(`[EXCEL] 📊 Procesando ${rawData.length} registros...`);
      
      // 4. Mapear y validar registros
      const mappedRecords = await this.mapAndValidateRecords(rawData, analysis);
      
      // 5. Eliminar duplicados
      const uniqueRecords = await this.removeDuplicates(mappedRecords);
      
      // 6. Insertar en base de datos
      const insertResult = await this.insertRecords(uniqueRecords, analysis);
      
      // 7. Registrar archivo procesado
      await this.registerProcessedFile({
        filename,
        fileHash: analysis.fileHash,
        analysis,
        processingTime: (Date.now() - startTime) / 1000,
        results: insertResult
      });
      
      const result = {
        success: true,
        filename,
        totalRecords: rawData.length,
        processedRecords: this.processedRecords,
        newRecords: insertResult.created,
        duplicateRecords: this.duplicateRecords,
        errorRecords: this.errorRecords,
        processingTime: (Date.now() - startTime) / 1000,
        dateInfo: analysis.dateInfo,
        validationErrors: this.validationErrors.slice(0, 10), // Primeros 10 errores
        warnings: this.warnings
      };
      
      console.log(`[EXCEL] ✅ Procesamiento completado:`, result);
      return result;
      
    } catch (error) {
      console.error('[EXCEL] ❌ Error procesando archivo:', error);
      
      // Registrar error en base de datos
      await this.registerProcessingError(filename, error.message);
      
      throw error;
    }
  }

  // 🗺️ Mapear y validar registros
  async mapAndValidateRecords(rawData, analysis) {
    console.log('[EXCEL] 🗺️ Mapeando y validando registros...');
    
    const mappedRecords = [];
    const dateColumnIndex = analysis.dateInfo.columnIndex;
    
    for (let i = 0; i < rawData.length; i++) {
      try {
        const rawRecord = rawData[i];
        
        // Mapear campos básicos
        const mappedRecord = await this.mapRecord(rawRecord, analysis, i);
        
        // Validar registro
        const validation = await validateInspectionRecord(mappedRecord);
        
        if (validation.isValid) {
          mappedRecords.push(mappedRecord);
          this.processedRecords++;
        } else {
          this.errorRecords++;
          this.validationErrors.push({
            row: i + 2, // +2 porque Excel empieza en 1 y hay header
            errors: validation.errors,
            data: mappedRecord
          });
        }
        
        // Log de progreso cada 1000 registros
        if ((i + 1) % 1000 === 0) {
          console.log(`[EXCEL] 📊 Progreso: ${i + 1}/${rawData.length} registros procesados`);
        }
        
      } catch (error) {
        this.errorRecords++;
        this.validationErrors.push({
          row: i + 2,
          errors: [`Error de procesamiento: ${error.message}`],
          data: rawData[i]
        });
      }
    }
    
    console.log(`[EXCEL] ✅ Mapeo completado: ${mappedRecords.length} registros válidos`);
    return mappedRecords;
  }

  // 📝 Mapear registro individual
  async mapRecord(rawRecord, analysis, rowIndex) {
    const mapped = {
      // IDs únicos
      id: generateUniqueId(),
      
      // Información temporal
      fecha: null,
      hora: cleanString(rawRecord['Hora'] || rawRecord['hora'] || ''),
      turno: cleanString(rawRecord['Turno'] || rawRecord['turno'] || ''),
      ano: analysis.dateInfo.año,
      mes: null, // Se calculará desde la fecha
      
      // Información del vehículo
      placa_vehiculo: cleanString(rawRecord['Placa'] || rawRecord['placa'] || rawRecord['Placa Vehículo'] || ''),
      tipo_vehiculo: cleanString(rawRecord['Tipo Vehículo'] || rawRecord['tipo_vehiculo'] || ''),
      marca_vehiculo: cleanString(rawRecord['Marca'] || rawRecord['marca'] || ''),
      
      // Información del conductor
      conductor_nombre: cleanString(rawRecord['Conductor'] || rawRecord['conductor'] || rawRecord['Nombre Conductor'] || ''),
      conductor_cedula: cleanString(rawRecord['Cédula'] || rawRecord['cedula'] || rawRecord['Cedula'] || ''),
      conductor_licencia: cleanString(rawRecord['Licencia'] || rawRecord['licencia'] || ''),
      
      // Información contractual
      contrato: cleanString(rawRecord['Contrato'] || rawRecord['contrato'] || ''),
      campo: cleanString(rawRecord['Campo'] || rawRecord['campo'] || ''),
      empresa_contratista: cleanString(rawRecord['Empresa'] || rawRecord['empresa'] || ''),
      
      // 🚨 NUEVOS CAMPOS DE FATIGA DEL CONDUCTOR
      // Pregunta crítica (ALERTA ROJA)
      consumo_medicamentos: this.parseBooleanField(
        rawRecord['¿Ha consumido medicamentos o sustancias que afecten su estado de alerta?'] ||
        rawRecord['Medicamentos'] ||
        rawRecord['consumo_medicamentos']
      ),
      
      // Preguntas de advertencia
      horas_sueno_suficientes: this.parseBooleanField(
        rawRecord['¿Ha dormido al menos 7 horas en las últimas 24 horas?'] ||
        rawRecord['Sueño Suficiente'] ||
        rawRecord['horas_sueno']
      ),
      
      libre_sintomas_fatiga: this.parseBooleanField(
        rawRecord['¿Se encuentra libre de síntomas de fatiga (Somnolencia, dolor de cabeza, irritabilidad)?'] ||
        rawRecord['Sin Síntomas Fatiga'] ||
        rawRecord['libre_fatiga']
      ),
      
      condiciones_aptas: this.parseBooleanField(
        rawRecord['¿Se siente en condiciones físicas y mentales para conducir?'] ||
        rawRecord['Condiciones Aptas'] ||
        rawRecord['apto_conducir']
      ),
      
      // Inspección del vehículo (campos existentes)
      luces_funcionando: this.parseBooleanField(rawRecord['Luces'] || rawRecord['luces']),
      frenos_funcionando: this.parseBooleanField(rawRecord['Frenos'] || rawRecord['frenos']),
      
      // Estados como strings
      neumaticos_estado: cleanString(rawRecord['Neumáticos'] || rawRecord['neumaticos'] || 'BUENO'),
      direccion_estado: cleanString(rawRecord['Dirección'] || rawRecord['direccion'] || 'BUENO'),
      espejos_estado: cleanString(rawRecord['Espejos'] || rawRecord['espejos'] || 'BUENO'),
      cinturones_estado: cleanString(rawRecord['Cinturones'] || rawRecord['cinturones'] || 'BUENO'),
      
      // Elementos de seguridad
      kit_carretera: this.parseBooleanField(rawRecord['Kit Carretera'] || rawRecord['kit_carretera'], true),
      extintor_vigente: this.parseBooleanField(rawRecord['Extintor'] || rawRecord['extintor'], true),
      botiquin_completo: this.parseBooleanField(rawRecord['Botiquín'] || rawRecord['botiquin'], true),
      
      // Observaciones
      observaciones: cleanString(rawRecord['Observaciones'] || rawRecord['observaciones'] || ''),
      inspector_nombre: cleanString(rawRecord['Inspector'] || rawRecord['inspector'] || ''),
      
      // Estado calculado
      estado_inspeccion: 'PENDIENTE',
      puntaje_total: 0
    };
    
    // 📅 Procesar fecha
    try {
      const fechaValue = rawRecord['Fecha'] || rawRecord['fecha'] || rawRecord[Object.keys(rawRecord)[0]];
      if (fechaValue) {
        mapped.fecha = parseSpanishDate(fechaValue);
        if (mapped.fecha) {
          mapped.mes = mapped.fecha.getMonth() + 1;
        }
      }
    } catch (error) {
      throw new Error(`Error procesando fecha en fila ${rowIndex + 2}: ${error.message}`);
    }
    
    // 🚨 Calcular alertas automáticamente
    mapped.tiene_alerta_roja = mapped.consumo_medicamentos === true;
    mapped.tiene_advertencias = (
      mapped.horas_sueno_suficientes === false ||
      mapped.libre_sintomas_fatiga === false ||
      mapped.condiciones_aptas === false
    );
    
    // Calcular nivel de riesgo
    if (mapped.tiene_alerta_roja) {
      mapped.nivel_riesgo = 'CRITICO';
      mapped.estado_inspeccion = 'ALERTA_ROJA';
    } else if (mapped.tiene_advertencias) {
      mapped.nivel_riesgo = 'ALTO';
      mapped.estado_inspeccion = 'ADVERTENCIA';
    } else {
      mapped.nivel_riesgo = 'BAJO';
      mapped.estado_inspeccion = 'APROBADO';
    }
    
    return mapped;
  }

  // ✅ Parsear campos booleanos
  parseBooleanField(value, defaultValue = false) {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    
    const str = String(value).toLowerCase().trim();
    
    // Valores positivos
    if (['si', 'sí', 'yes', 'true', '1', 'ok', 'bueno', 'correcto'].includes(str)) {
      return true;
    }
    
    // Valores negativos
    if (['no', 'false', '0', 'malo', 'incorrecto', 'negativo'].includes(str)) {
      return false;
    }
    
    return defaultValue;
  }

  // 🔄 Eliminar duplicados
  async removeDuplicates(records) {
    console.log('[EXCEL] 🔄 Eliminando duplicados...');
    
    const uniqueRecords = [];
    const seenKeys = new Set();
    
    for (const record of records) {
      // Crear clave única basada en fecha, conductor y placa
      const uniqueKey = `${record.fecha?.toISOString().split('T')[0] || 'no-fecha'}-${record.conductor_cedula || record.conductor_nombre}-${record.placa_vehiculo}`;
      
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        uniqueRecords.push(record);
      } else {
        this.duplicateRecords++;
      }
    }
    
    console.log(`[EXCEL] ✅ Duplicados eliminados: ${records.length - uniqueRecords.length}`);
    return uniqueRecords;
  }

  // 💾 Insertar registros en base de datos
  async insertRecords(records, analysis) {
    console.log(`[EXCEL] 💾 Insertando ${records.length} registros en base de datos...`);
    
    const batchSize = 500; // Procesar en lotes para mejor rendimiento
    let created = 0;
    let errors = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        const result = await this.prisma.inspeccion.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        created += result.count;
        console.log(`[EXCEL] ✅ Lote ${Math.floor(i/batchSize) + 1}: ${result.count} registros insertados`);
        
      } catch (error) {
        console.error(`[EXCEL] ❌ Error en lote ${Math.floor(i/batchSize) + 1}:`, error);
        errors += batch.length;
      }
    }
    
    console.log(`[EXCEL] ✅ Inserción completada: ${created} creados, ${errors} errores`);
    
    return { created, errors };
  }

  // 🔍 Verificar archivo duplicado
  async checkDuplicateFile(fileHash) {
    return await this.prisma.archivosProcesados.findUnique({
      where: { hash_archivo: fileHash }
    });
  }

  // 📝 Registrar archivo procesado
  async registerProcessedFile(data) {
    return await this.prisma.archivosProcesados.create({
      data: {
        nombre_archivo: data.filename,
        hash_archivo: data.fileHash,
        ano_detectado: data.analysis.dateInfo.año,
        meses_detectados: data.analysis.dateInfo.meses,
        total_registros: data.results.created + this.duplicateRecords + this.errorRecords,
        registros_nuevos: data.results.created,
        registros_duplicados: this.duplicateRecords,
        tiempo_procesamiento: data.processingTime,
        errores_validacion: this.validationErrors.length > 0 ? this.validationErrors : null,
        advertencias: this.warnings.length > 0 ? this.warnings : null
      }
    });
  }

  // ❌ Registrar error de procesamiento
  async registerProcessingError(filename, errorMessage) {
    try {
      await this.prisma.archivosProcesados.create({
        data: {
          nombre_archivo: filename,
          hash_archivo: crypto.createHash('sha256').update(filename + Date.now()).digest('hex'),
          ano_detectado: new Date().getFullYear(),
          meses_detectados: [],
          total_registros: 0,
          registros_nuevos: 0,
          registros_duplicados: 0,
          estado_procesamiento: 'ERROR',
          errores_validacion: [{ error: errorMessage, timestamp: new Date() }]
        }
      });
    } catch (error) {
      console.error('[EXCEL] Error registrando error de procesamiento:', error);
    }
  }

  // 📊 Generar hash del archivo
  generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

module.exports = ExcelService;