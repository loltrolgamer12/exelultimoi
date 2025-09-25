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
    if (header.includes('contrato') || header.includes('contract')) mappings.push('contrato');
    if (header.includes('turno') || header.includes('shift')) mappings.push('turno');
    // 🚨 NUEVOS CAMPOS DE FATIGA
    if (header.includes('medicamento') || header.includes('sustancia')) mappings.push('consumo_medicamentos');
    if (header.includes('sueño') || header.includes('dormi')) mappings.push('horas_sueno_suficientes');
    if (header.includes('fatiga') || header.includes('sintoma')) mappings.push('libre_sintomas_fatiga');
    if (header.includes('apto') || header.includes('condici')) mappings.push('condiciones_aptas');
    return mappings;
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
          // LOG de errores para depuración
          if (i < 10) {
            console.log(`[VALIDATION ERROR fila ${i + 2}]`, validation.errors, mappedRecord);
          }
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
    // Mostrar los primeros errores de validación al final del procesamiento
    if (this.validationErrors.length > 0) {
      console.log('[VALIDATION] Primeros errores:');
      this.validationErrors.slice(0, 10).forEach((err, idx) => {
        console.log(`Fila ${err.row}:`, err.errors, err.data);
      });
    } else {
      console.log('[VALIDATION] No se encontraron errores de validación.');
    }
    return mappedRecords;
  }

  // 📝 Mapear registro individual
  async mapRecord(rawRecord, analysis, rowIndex) {
    const mapped = {
      id: generateUniqueId(),
      fecha: null,
      marca_temporal: parseFloat(rawRecord['Marca temporal'] || rawRecord['MARCA TEMPORAL'] || '0'),
      nombre_inspector: cleanString(rawRecord['NOMBRE DE QUIEN REALIZA LA INSPECCIÓN '] || rawRecord['Inspector'] || rawRecord['inspector'] || ''),
      contrato: cleanString(rawRecord['CONTRATO'] || rawRecord['Contrato'] || rawRecord['contrato'] || ''),
      campo_coordinacion: cleanString(rawRecord['CAMPO/COORDINACIÓN'] || rawRecord['Campo'] || rawRecord['campo'] || ''),
      placa_vehiculo: cleanString(rawRecord['PLACA DEL VEHICULO'] || rawRecord['PLACA DEL VEHÍCULO'] || rawRecord['Placa'] || rawRecord['placa'] || ''),
      kilometraje: parseInt(rawRecord['KILOMETRAJE'] || rawRecord['Kilometraje'] || rawRecord['kilometraje'] || '0'),
      turno: cleanString(rawRecord['TURNO'] || rawRecord['Turno'] || rawRecord['turno'] || ''),
      // Validación y modelo
      frenos_funcionando: this.parseBooleanField(rawRecord['**FRENOS'] || rawRecord['Frenos Funcionando'] || rawRecord['frenos_funcionando'] || rawRecord['Frenos'] || rawRecord['frenos'], true),
      cinturones_seguros: this.parseBooleanField(rawRecord['**CINTURONES DE SEGURIDAD'] || rawRecord['Cinturones Seguros'] || rawRecord['cinturones_seguros'] || rawRecord['Cinturones'] || rawRecord['cinturones'], true),
      luces_funcionando: this.parseBooleanField(rawRecord['**DIRECCIONALES DERECHA E IZQUIERDA'] || rawRecord['Luces Funcionando'] || rawRecord['luces_funcionando'] || rawRecord['Luces'] || rawRecord['luces'], true),
      extintor_vigente: this.parseBooleanField(rawRecord['EXTINTOR VIGENTE'] || rawRecord['Extintor Vigente'] || rawRecord['extintor_vigente'] || rawRecord['Extintor'] || rawRecord['extintor'], true),
      botiquin_completo: this.parseBooleanField(rawRecord['BOTIQUÍN'] || rawRecord['Botiquin Completo'] || rawRecord['botiquin_completo'] || rawRecord['Botiquin'] || rawRecord['botiquin'], true),
      neumaticos_estado: cleanString(rawRecord['**LLANTAS - LABRADO (min 2mm DE LABRADO)'] || rawRecord['Neumáticos Estado'] || rawRecord['neumaticos_estado'] || rawRecord['Neumáticos'] || rawRecord['neumaticos'] || 'BUENO'),
      espejos_estado: cleanString(rawRecord['**ESPEJO CENTRAL Y ESPEJOS LATERALES'] || rawRecord['Espejos Estado'] || rawRecord['espejos_estado'] || rawRecord['Espejos'] || rawRecord['espejos'] || 'BUENO'),
      // Prisma
      altas_bajas: this.parseBooleanField(rawRecord['** ALTAS Y BAJAS'] || rawRecord['Altas/Bajas'] || rawRecord['altas_bajas'], false),
      direccionales: this.parseBooleanField(rawRecord['DIRECCIONALES DERECHA E IZQUIERDA'] || rawRecord['Direccionales'] || rawRecord['direccionales'], false),
      parqueo: this.parseBooleanField(rawRecord['**DE PARQUEO'] || rawRecord['Parqueo'] || rawRecord['parqueo'], false),
      freno: this.parseBooleanField(rawRecord['**DE FRENO'] || rawRecord['Freno'] || rawRecord['freno'], false),
      reversa_alarma: this.parseBooleanField(rawRecord['**DE REVERSA Y ALARMA DE RETROCESO'] || rawRecord['Reversa/Alarma'] || rawRecord['reversa_alarma'], false),
      espejos: this.parseBooleanField(rawRecord['**ESPEJO CENTRAL Y ESPEJOS LATERALES'] || rawRecord['Espejos'] || rawRecord['espejos'], false),
      vidrio_frontal: this.parseBooleanField(rawRecord['**VIDRIO FRONTAL'] || rawRecord['Vidrio Frontal'] || rawRecord['vidrio_frontal'], false),
      orden_aseo: this.parseBooleanField(rawRecord['PRESENTACIÓN DE ORDEN Y ASEO'] || rawRecord['Orden/Aseo'] || rawRecord['orden_aseo'], false),
      pito: this.parseBooleanField(rawRecord['PITO'] || rawRecord['Pito'] || rawRecord['pito'], false),
      gps: this.parseBooleanField(rawRecord['SISTEMA DE MONITOREO GPS '] || rawRecord['GPS'] || rawRecord['gps'], false),
      frenos: this.parseBooleanField(rawRecord['**FRENOS'] || rawRecord['Frenos'] || rawRecord['frenos'], false),
      freno_emergencia: this.parseBooleanField(rawRecord['**FRENOS DE EMERGENCIA O DE MANO'] || rawRecord['Freno Emergencia'] || rawRecord['freno_emergencia'], false),
      cinturones: this.parseBooleanField(rawRecord['**CINTURONES DE SEGURIDAD'] || rawRecord['Cinturones'] || rawRecord['cinturones'], false),
      puertas: this.parseBooleanField(rawRecord['PUERTAS EN BUEN ESTADO'] || rawRecord['Puertas'] || rawRecord['puertas'], false),
      vidrios: this.parseBooleanField(rawRecord['VIDRIOS EN BUEN ESTADO'] || rawRecord['Vidrios'] || rawRecord['vidrios'], false),
      limpia_brisas: this.parseBooleanField(rawRecord['**LIMPIA BRISAS'] || rawRecord['Limpia Brisas'] || rawRecord['limpia_brisas'], false),
      tapiceria: this.parseBooleanField(rawRecord['ESTADO GENERAL DE TAPICERÍA'] || rawRecord['Tapiceria'] || rawRecord['tapiceria'], false),
      indicadores: this.parseBooleanField(rawRecord['Indicadores (nivel de combustible, temperatura, velocímetro y aceite)'] || rawRecord['Indicadores'] || rawRecord['indicadores'], false),
      objetos_sueltos: this.parseBooleanField(rawRecord['**Verificar la ausencia de objetos sueltos en la cabina que puedan distraer al conductor'] || rawRecord['Objetos Sueltos'] || rawRecord['objetos_sueltos'], false),
      aceite_motor: this.parseBooleanField(rawRecord['**NIVELES DE FLUIDOS ACEITE MOTOR'] || rawRecord['Aceite Motor'] || rawRecord['aceite_motor'], false),
      fluido_frenos: this.parseBooleanField(rawRecord['**NIVELES DE FLUIDO DE FRENOS'] || rawRecord['Fluido Frenos'] || rawRecord['fluido_frenos'], false),
      fluido_direccion: this.parseBooleanField(rawRecord['**NIVELES DE FLUIDO DE DIRECCIÓN HIDRAÚLICA'] || rawRecord['Fluido Dirección'] || rawRecord['fluido_direccion'], false),
      fluido_refrigerante: this.parseBooleanField(rawRecord['**NIVELES DE FLUIDO REFRIGERANTE'] || rawRecord['Fluido Refrigerante'] || rawRecord['fluido_refrigerante'], false),
      fluido_limpia_parabrisas: this.parseBooleanField(rawRecord['NIVELES DE FLUIDO LIMPIA PARABRISAS'] || rawRecord['Fluido Limpia Parabrisas'] || rawRecord['fluido_limpia_parabrisas'], false),
      correas: this.parseBooleanField(rawRecord['ESTADO DE CORREAS'] || rawRecord['Correas'] || rawRecord['correas'], false),
      baterias: this.parseBooleanField(rawRecord['ESTADO DE BATERÍAS, CABLES, CONEXIONES'] || rawRecord['Baterias'] || rawRecord['baterias'], false),
      llantas_labrado: this.parseBooleanField(rawRecord['**LLANTAS - LABRADO (min 2mm DE LABRADO)'] || rawRecord['Llantas Labrado'] || rawRecord['llantas_labrado'], false),
      llantas_sin_cortes: this.parseBooleanField(rawRecord['**LLANTAS - SIN CORTADURAS Y SIN ABULTAMIENTOS'] || rawRecord['Llantas Sin Cortes'] || rawRecord['llantas_sin_cortes'], false),
      llanta_repuesto: this.parseBooleanField(rawRecord['LLANTA DE REPUESTO'] || rawRecord['Llanta Repuesto'] || rawRecord['llanta_repuesto'], false),
      copas_pernos_llantas: this.parseBooleanField(rawRecord['**COPAS O PERNOS DE SUJECIÓN DE LAS LLANTAS'] || rawRecord['Copas Pernos Llantas'] || rawRecord['copas_pernos_llantas'], false),
      suspension: this.parseBooleanField(rawRecord['**SUSPENSIÓN (TERMINALES)'] || rawRecord['Suspension'] || rawRecord['suspension'], false),
      direccion_terminales: this.parseBooleanField(rawRecord['**DIRECCIÓN (TERMINALES)'] || rawRecord['Direccion Terminales'] || rawRecord['direccion_terminales'], false),
      tapa_tanque: this.parseBooleanField(rawRecord['Tapa de tanque de combustible en buen estado'] || rawRecord['Tapa Tanque'] || rawRecord['tapa_tanque'], false),
      equipo_carretera: this.parseBooleanField(rawRecord['Equipo de carretera: gato, llave de pernos, herramienta básica, triángulos o conos, bloques, chaleco, señal pare-siga'] || rawRecord['Equipo Carretera'] || rawRecord['equipo_carretera'], false),
      kit_ambiental: this.parseBooleanField(rawRecord['Kit ambiental'] || rawRecord['Kit Ambiental'] || rawRecord['kit_ambiental'], false),
      documentacion: this.parseBooleanField(rawRecord['Documentación: tecnomecánica y de gases, tarjeta de propiedad, SOAT, licencia de conducción y permiso para conducir interno'] || rawRecord['Documentacion'] || rawRecord['documentacion'], false),
      observaciones: cleanString(rawRecord['OBSERVACIONES'] || rawRecord['Observaciones'] || rawRecord['observaciones'] || ''),
      horas_sueno: this.parseBooleanField(rawRecord['¿Ha dormido al menos 7 horas en las últimas 24 horas?'] || rawRecord['Horas Sueno'] || rawRecord['horas_sueno'], false),
      libre_fatiga: this.parseBooleanField(rawRecord['¿Se encuentra libre de síntomas de fatiga (Somnolencia, dolor de cabeza, irritabilidad)?'] || rawRecord['Libre Fatiga'] || rawRecord['libre_fatiga'], false),
      condiciones_aptas: this.parseBooleanField(rawRecord['¿Se siente en condiciones físicas y mentales para conducir? '] || rawRecord['Condiciones Aptas'] || rawRecord['condiciones_aptas'], false),
      consumo_medicamentos: this.parseBooleanField(rawRecord['¿Ha consumido medicamentos o sustancias que afecten su estado de alerta?*'] || rawRecord['Consumo Medicamentos'] || rawRecord['consumo_medicamentos'], false),
      placa_vehiculo_extra: cleanString(rawRecord['PLACA DEL VEHÍCULO'] || rawRecord['Placa Vehiculo Extra'] || rawRecord['placa_vehiculo_extra'] || ''),
      createdAt: new Date(),
      updatedAt: new Date(),
      // Estado calculado
      estado_inspeccion: 'PENDIENTE',
      puntaje_total: 0
    };
    
    // 📅 Procesar fecha
    try {
      let fechaValue = null;
      if (analysis && analysis.dateInfo && typeof analysis.dateInfo.columnIndex === 'number') {
        // Si el registro viene como array (sheet_to_json con header:1)
        if (Array.isArray(rawRecord)) {
          fechaValue = rawRecord[analysis.dateInfo.columnIndex];
        } else {
          // Si el registro viene como objeto, buscar el encabezado real
          const headers = analysis.headers || [];
          const fechaHeader = headers[analysis.dateInfo.columnIndex];
          fechaValue = rawRecord[fechaHeader] || rawRecord['Fecha'] || rawRecord['fecha'] || rawRecord[Object.keys(rawRecord)[0]];
        }
      }
      if (fechaValue) {
        mapped.fecha = fechaValue ? parseSpanishDate(fechaValue) : null;
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
  const uniqueKey = `${record.fecha?.toISOString().split('T')[0] || 'no-fecha'}-${record.conductor_nombre}-${record.placa_vehiculo}`;
      
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

  // 🔢 Adivinar tipo de columna
  guessColumnType(values) {
    if (values.length === 0) {
      return 'empty';
    }
    const sampleValue = values[0];
    if (typeof sampleValue === 'boolean') {
      return 'boolean';
    }
    if (typeof sampleValue === 'number') {
      return 'number';
    }
    if (sampleValue instanceof Date) {
      return 'date';
    }
    // Análisis de strings
    const str = String(sampleValue);
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
      return 'date';
    }
    if (/^\d+(\.\d+)?$/.test(str)) {
      return 'number';
    }
    if (/^(si|no|sí|true|false)$/i.test(str)) {
      return 'boolean';
    }
    return 'string';
  }
}

module.exports = ExcelService;