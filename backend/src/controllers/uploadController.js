// 🎛️ CONTROLADOR DE UPLOAD V2.0 CORREGIDO - COMPLETO
// backend/src/controllers/uploadController.js

const ExcelService = require('../services/excelService');
const ValidationService = require('../services/validationService');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { getPrismaClient } = require('../config/database');

class UploadController {
  constructor() {
    this.prisma = getPrismaClient();
    this.excelService = new ExcelService();
    this.validationService = new ValidationService();
  }

  // 🔍 Validar archivo Excel antes de procesarlo
  async validateExcel(req, res) {
    try {
      console.log('[UPLOAD] 🔍 Iniciando validación de archivo Excel...');
      
      if (!req.file) {
        return errorResponse(res, 'ARCHIVO_REQUERIDO', 'Debe seleccionar un archivo Excel', 400);
      }
      
      const file = req.file;
      const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default
      
      console.log(`[UPLOAD] 📊 Archivo recibido: ${file.originalname} (${Math.round(file.size / 1024)}KB)`);
      
      // Validar tamaño
      if (file.size > maxSize) {
        return errorResponse(res, 'ARCHIVO_MUY_GRANDE', 
          `El archivo es demasiado grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB`, 400);
      }
      
      // Validar extensión
      if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
        return errorResponse(res, 'FORMATO_INVALIDO', 
          'Solo se permiten archivos Excel (.xlsx, .xls)', 400);
      }
      
      // Analizar estructura del archivo
      const analysis = await this.excelService.analyzeExcelFile(file.buffer, file.originalname);
      
      // ⚠️ VALIDACIÓN CRÍTICA: Verificar si el archivo es válido
      if (!analysis.isValid) {
        console.error('[UPLOAD] ❌ Archivo Excel inválido:', analysis.errors);
        return errorResponse(res, 'ARCHIVO_INVALIDO', 
          `Archivo Excel inválido: ${analysis.errors.join(', ')}`, 400);
      }
      
      // Verificar si el archivo ya fue procesado
      const existingFile = await this.checkDuplicateFile(analysis.fileHash);
      if (existingFile && !req.query.allowDuplicates) {
        return errorResponse(res, 'ARCHIVO_DUPLICADO', 
          `Este archivo ya fue procesado el ${new Date(existingFile.fecha_procesamiento).toLocaleString()}`, 409);
      }
      
      const response = {
        isValid: true,
        fileName: file.originalname,
        fileSize: file.size,
        fileHash: analysis.fileHash,
        detectedYear: analysis.dateInfo?.año,
        detectedMonths: analysis.dateInfo?.mesesNombres || [],
        estimatedRecords: analysis.totalRows,
        columnMapping: {
          found: Object.keys(analysis.columnMapping.found),
          missing: analysis.columnMapping.missing,
          missingRequired: analysis.columnMapping.missingRequired
        },
        errors: analysis.errors || [],
        warnings: analysis.warnings || [],
        recommendations: this.generateRecommendations(analysis),
        isDuplicate: !!existingFile
      };
      
      console.log('[UPLOAD] ✅ Validación exitosa:', {
        filename: file.originalname,
        rows: analysis.totalRows,
        year: response.detectedYear,
        months: response.detectedMonths.length,
        columnsFound: Object.keys(analysis.columnMapping.found).length
      });
      
      return successResponse(res, response, 'Archivo validado exitosamente');
      
    } catch (error) {
      console.error('[UPLOAD] ❌ Error en validación:', error);
      return errorResponse(res, 'VALIDACION_FALLIDA', error.message, 500);
    }
  }

  // 🚀 Procesar y cargar archivo Excel
  async uploadExcel(req, res) {
    const startTime = Date.now();
    let transaction = null;
    
    try {
      console.log('[UPLOAD] 🚀 Iniciando procesamiento de archivo Excel...');
      
      if (!req.file) {
        return errorResponse(res, 'ARCHIVO_REQUERIDO', 'Debe seleccionar un archivo Excel', 400);
      }
      
      const file = req.file;
      const options = {
        forceReprocess: req.body.forceReprocess === 'true',
        skipValidation: req.body.skipValidation === 'true',
        batchSize: parseInt(req.body.batchSize) || 500,
        allowInvalidRecords: false // ⚠️ CRÍTICO: No permitir registros inválidos
      };
      
      console.log(`[UPLOAD] 📊 Procesando archivo: ${file.originalname}`, options);
      
      // 1. Procesar archivo Excel
      const processingResult = await this.excelService.processExcelFile(file.buffer, file.originalname, options);
      
      if (!processingResult.success) {
        throw new Error(`Error procesando Excel: ${processingResult.error}`);
      }
      
      console.log(`[UPLOAD] 📊 Excel procesado: ${processingResult.totalRecords} registros`);
      
      // 2. ⚠️ VALIDACIÓN CRÍTICA: Validar TODOS los registros
      console.log('[UPLOAD] 🔍 Iniciando validación de registros...');
      const batchValidation = this.validationService.validateBatch(processingResult.records);
      
        // Si hay registros inválidos, continuar y reportar en la respuesta
        let errorDetails = [];
        if (batchValidation.invalidRecords.length > 0) {
          console.warn(`[UPLOAD] ⚠️ Se encontraron ${batchValidation.invalidRecords.length} registros inválidos, solo se insertarán los válidos.`);
          errorDetails = batchValidation.invalidRecords.slice(0, 10).map(invalid => ({
            fila: invalid.index + 1,
            placa: invalid.record.placa_vehiculo,
            errores: invalid.validation.errors.map(e => `${e.field}: ${e.message}`)
          }));
        }
      
      console.log(`[UPLOAD] ✅ Validación completada: ${batchValidation.validRecords.length} registros válidos`);
      
      // 3. Guardar registros válidos en la base de datos
      const insertResult = await this.insertRecordsIntoDatabase(
        batchValidation.validRecords.map(v => v.record),
        processingResult.fileHash,
        file.originalname,
        options
      );
      
      // 4. Guardar registro del archivo procesado
      await this.saveProcessedFileRecord(file, processingResult, insertResult);
      
      // 5. Generar estadísticas y alertas
      const stats = await this.generateProcessingStats(insertResult);
      const alerts = await this.generateAlerts(batchValidation);
      
      const response = {
        success: true,
        processing: {
          totalRecords: processingResult.totalRecords,
          validRecords: batchValidation.validRecords.length,
          invalidRecords: batchValidation.invalidRecords.length,
          insertedRecords: insertResult.insertedRecords,
          duplicateRecords: insertResult.duplicateRecords,
          processingTime: Date.now() - startTime
        },
        validation: {
          successRate: batchValidation.summary.successRate,
          totalErrors: batchValidation.totalErrors,
          totalWarnings: batchValidation.totalWarnings,
          criticalAlerts: batchValidation.criticalAlerts.length
        },
        database: {
          newRecords: insertResult.insertedRecords,
          duplicatesSkipped: insertResult.duplicateRecords,
          errorsInserting: insertResult.errorRecords || 0
        },
        fileInfo: {
          fileName: file.originalname,
          fileSize: file.size,
          fileHash: processingResult.fileHash,
          detectedYear: processingResult.dateInfo?.año,
          detectedMonths: processingResult.dateInfo?.mesesNombres || []
        },
        statistics: stats,
        alerts: alerts,
        nextSteps: this.generateNextSteps(insertResult, alerts)
      };
      
      console.log('[UPLOAD] ✅ Procesamiento exitoso:', {
        archivo: file.originalname,
        totalRegistros: response.processing.totalRecords,
        registrosInsertados: response.database.newRecords,
        tiempoProcesamiento: response.processing.processingTime + 'ms'
      });
      
      // 📧 Notificación para casos críticos
      if (alerts.some(a => a.level === 'CRITICO')) {
        console.log('🚨 ALERTAS CRÍTICAS DETECTADAS - Se requiere notificación');
        // TODO: Implementar sistema de notificaciones
      }
      
      return successResponse(res, response, 
        `Archivo procesado exitosamente. ${response.database.newRecords} registros nuevos agregados.`);
      
    } catch (error) {
      console.error('[UPLOAD] ❌ Error en procesamiento:', error);
      
      // Rollback de transacción si existe
      if (transaction) {
        try {
          await transaction.rollback();
          console.log('[UPLOAD] 🔄 Rollback de transacción completado');
        } catch (rollbackError) {
          console.error('[UPLOAD] ❌ Error en rollback:', rollbackError);
        }
      }
      
      // Determinar código de error apropiado
      const statusCode = error.message.includes('REGISTROS_INVALIDOS') ? 400 :
                        error.message.includes('DUPLICADO') ? 409 :
                        error.message.includes('ARCHIVO') ? 400 : 500;
      
      return errorResponse(res, 'PROCESAMIENTO_FALLIDO', error.message, statusCode);
    }
  }

  // 💾 Insertar registros en la base de datos
  async insertRecordsIntoDatabase(records, fileHash, fileName, options) {
    console.log(`[UPLOAD] 💾 Insertando ${records.length} registros en la base de datos...`);
    
    // ⚠️ VERIFICACIÓN CRÍTICA: Probar conexión a BD primero
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      console.log(`[UPLOAD] ✅ Conexión a BD verificada correctamente`);
    } catch (dbError) {
      console.error(`[UPLOAD] ❌ ERROR DE CONEXIÓN A BD:`, dbError);
      throw new Error(`Error de conexión a base de datos: ${dbError.message}`);
    }
    
    const result = {
      insertedRecords: 0,
      duplicateRecords: 0,
      errorRecords: 0,
      insertedIds: [],
      errors: []
    };
    
    const batchSize = options.batchSize || 500;
    const batches = [];
    
    // Dividir en lotes
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }
    
    console.log(`[UPLOAD] 📦 Procesando ${batches.length} lotes de hasta ${batchSize} registros...`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`[UPLOAD] 📦 Procesando lote ${batchIndex + 1}/${batches.length} (${batch.length} registros)...`);
      
      try {
        // ⚠️ VERIFICACIÓN FINAL: Re-validar campos críticos antes de insertar
        const validatedBatch = batch.filter((record, index) => {
          const hasRequiredFields = record.placa_vehiculo && 
                                   record.placa_vehiculo.trim() !== '' &&
                                   record.contrato && 
                                   record.contrato.trim() !== '' &&
                                   record.turno && 
                                   record.turno.trim() !== '';
          
          if (!hasRequiredFields) {
            console.error(`[UPLOAD] ❌ Registro ${index + 1} rechazado por campos vacíos:`, {
              placa: record.placa_vehiculo,
              contrato: record.contrato,
              turno: record.turno
            });
            result.errorRecords++;
          }
          
          return hasRequiredFields;
        });
        
        console.log(`[UPLOAD] 📊 Lote ${batchIndex + 1}: ${validatedBatch.length}/${batch.length} registros válidos para insertar`);
        
        if (validatedBatch.length === 0) {
          console.warn(`[UPLOAD] ⚠️ Lote ${batchIndex + 1} sin registros válidos, saltando...`);
          continue;
        }
        
        // ⚠️ INSERCIÓN UNO POR UNO CON LOGGING DETALLADO
        for (let i = 0; i < validatedBatch.length; i++) {
          const record = validatedBatch[i];
          
          try {
            console.log(`[UPLOAD] 🔄 Insertando registro ${i + 1}/${validatedBatch.length}: ${record.placa_vehiculo}`);
            
            // ⚠️ CREAR REGISTRO CON CAMPOS MÍNIMOS REQUERIDOS
            const recordToInsert = {
              id: record.id,
              fecha: record.fecha ? new Date(record.fecha) : new Date(),
              conductor_nombre: record.conductor_nombre || '',
              placa_vehiculo: record.placa_vehiculo,
              contrato: record.contrato,
              turno: record.turno,
              campo_coordinacion: record.campo_coordinacion || '',
              kilometraje: record.kilometraje || 0,
              marca_temporal: record.marca_temporal || Date.now(),
              nivel_riesgo: record.nivel_riesgo || 'BAJO',
              puntaje_total: record.puntaje_total || 0,
              observaciones: record.observaciones || '',
              
              // Campos boolean con valores por defecto
              gps: record.gps || false,
              pito: record.pito || false,
              freno: record.freno || false,
              frenos: record.frenos || false,
              correas: record.correas || false,
              espejos: record.espejos || false,
              parqueo: record.parqueo || false,
              puertas: record.puertas || false,
              vidrios: record.vidrios || false,
              baterias: record.baterias || false,
              tapiceria: record.tapiceria || false,
              cinturones: record.cinturones || false,
              orden_aseo: record.orden_aseo || false,
              suspension: record.suspension || false,
              altas_bajas: record.altas_bajas || false,
              horas_sueno: record.horas_sueno || false,
              indicadores: record.indicadores || false,
              tapa_tanque: record.tapa_tanque || false,
              aceite_motor: record.aceite_motor || false,
              libre_fatiga: record.libre_fatiga || false,
              direccionales: record.direccionales || false,
              documentacion: record.documentacion || false,
              fluido_frenos: record.fluido_frenos || false,
              kit_ambiental: record.kit_ambiental || false,
              limpia_brisas: record.limpia_brisas || false,
              espejos_estado: record.espejos_estado || 'BUENO',
              
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            // 🔍 LOG DEL REGISTRO A INSERTAR
            console.log(`[UPLOAD] 📋 Datos a insertar:`, {
              id: recordToInsert.id,
              placa_vehiculo: recordToInsert.placa_vehiculo,
              contrato: recordToInsert.contrato,
              turno: recordToInsert.turno,
              fecha: recordToInsert.fecha
            });
            
            const inserted = await this.prisma.inspecciones.create({
              data: recordToInsert
            });
            
            result.insertedIds.push(inserted.id);
            result.insertedRecords++;
            
            console.log(`[UPLOAD] ✅ Registro insertado: ${inserted.id} - ${record.placa_vehiculo}`);
            
          } catch (insertError) {
            console.error(`[UPLOAD] ❌ Error insertando registro ${i + 1}:`, insertError);
            console.error(`[UPLOAD] ❌ Registro problemático:`, {
              placa: record.placa_vehiculo,
              contrato: record.contrato,
              turno: record.turno,
              error: insertError.message,
              code: insertError.code
            });
            
            if (insertError.code === 'P2002') {
              // Duplicado detectado
              result.duplicateRecords++;
              console.log(`[UPLOAD] ⚠️ Duplicado detectado: ${record.placa_vehiculo}`);
            } else {
              result.errorRecords++;
              result.errors.push({
                record: record.placa_vehiculo,
                error: insertError.message,
                code: insertError.code
              });
            }
          }
        }
        
        console.log(`[UPLOAD] ✅ Lote ${batchIndex + 1} completado: ${result.insertedRecords} total insertados hasta ahora`);
        
      } catch (error) {
        console.error(`[UPLOAD] ❌ Error procesando lote ${batchIndex + 1}:`, error);
        result.errorRecords += batch.length;
        result.errors.push({
          batch: batchIndex + 1,
          error: error.message
        });
      }
    }
    
    console.log(`[UPLOAD] ✅ Inserción completada:`, {
      insertados: result.insertedRecords,
      duplicados: result.duplicateRecords,
      errores: result.errorRecords,
      total: records.length,
      idsInsertados: result.insertedIds.slice(0, 5) // Solo los primeros 5 IDs para el log
    });
    
    // ⚠️ VERIFICACIÓN POST-INSERCIÓN
    if (result.insertedRecords > 0) {
      try {
        const countInDB = await this.prisma.inspecciones.count({
          where: {
            id: { in: result.insertedIds.slice(0, 10) } // Verificar los primeros 10
          }
        });
        console.log(`[UPLOAD] 🔍 Verificación: ${countInDB} registros confirmados en BD`);
      } catch (verifyError) {
        console.error(`[UPLOAD] ⚠️ Error verificando inserción:`, verifyError);
      }
    }
    
    return result;
  }

  // 📊 Verificar archivo duplicado
  async checkDuplicateFile(fileHash) {
    try {
      const existing = await this.prisma.archivos_procesados.findUnique({
        where: { hash_archivo: fileHash },
        select: {
          id: true,
          nombre_archivo: true,
          fecha_procesamiento: true,
          total_registros: true,
          estado: true
        }
      });
      
      return existing;
    } catch (error) {
      console.warn('[UPLOAD] ⚠️ Error verificando archivo duplicado:', error);
      return null;
    }
  }

  // 💾 Guardar registro del archivo procesado
  async saveProcessedFileRecord(file, processingResult, insertResult) {
    try {
      await this.prisma.archivos_procesados.create({
        data: {
          nombre_archivo: file.originalname,
          hash_archivo: processingResult.fileHash,
          tamano_archivo: file.size,
          total_registros: processingResult.totalRecords,
          registros_insertados: insertResult.insertedRecords,
          registros_duplicados: insertResult.duplicateRecords,
          registros_error: insertResult.errorRecords,
          ano_detectado: processingResult.dateInfo?.año,
          tiempo_procesamiento: processingResult.processingTime,
          errores_validacion: insertResult.errors,
          estado: insertResult.errorRecords > 0 ? 'CON_ERRORES' : 'PROCESADO',
          fecha_procesamiento: new Date()
        }
      });
      
      console.log('[UPLOAD] 💾 Registro de archivo procesado guardado');
    } catch (error) {
      console.error('[UPLOAD] ⚠️ Error guardando registro de archivo procesado:', error);
    }
  }

  // 📊 Generar estadísticas del procesamiento
  async generateProcessingStats(insertResult) {
    // Implementar estadísticas específicas
    return {
      successRate: Math.round((insertResult.insertedRecords / (insertResult.insertedRecords + insertResult.errorRecords)) * 100),
      processingSpeed: insertResult.insertedRecords / (insertResult.processingTime / 1000), // registros por segundo
      errorRate: Math.round((insertResult.errorRecords / (insertResult.insertedRecords + insertResult.errorRecords)) * 100)
    };
  }

  // 🚨 Generar alertas del procesamiento
  async generateAlerts(validationResult) {
    const alerts = [];
    
    // Alerta por alta tasa de errores
    if (validationResult.summary.successRate < 80) {
      alerts.push({
        type: 'ALTA_TASA_ERRORES',
        level: 'ADVERTENCIA',
        message: `Tasa de éxito baja: ${validationResult.summary.successRate}%`,
        recommendation: 'Revisar formato del archivo Excel'
      });
    }
    
    // Alertas críticas de seguridad
    if (validationResult.criticalAlerts.length > 0) {
      alerts.push({
        type: 'ALERTAS_SEGURIDAD',
        level: 'CRITICO',
        message: `${validationResult.criticalAlerts.length} alertas críticas de seguridad detectadas`,
        recommendation: 'Revisar inspecciones marcadas como críticas'
      });
    }
    
    return alerts;
  }

  // 📋 Generar recomendaciones
  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.columnMapping.missing.length > 0) {
      recommendations.push(`Verificar nombres de columnas: ${analysis.columnMapping.missing.join(', ')}`);
    }
    
    if (analysis.totalRows > 5000) {
      recommendations.push('Archivo grande detectado - el procesamiento puede tomar varios minutos');
    }
    
    if (!analysis.dateInfo?.año) {
      recommendations.push('No se detectó año en las fechas - verificar formato de fechas');
    }
    
    return recommendations;
  }

  // 📝 Generar próximos pasos
  generateNextSteps(result, alerts) {
    const steps = [];
    
    if (result.insertedRecords > 0) {
      steps.push(`Revisar ${result.insertedRecords} registros insertados en el dashboard`);
    }
    
    if (alerts.some(a => a.level === 'CRITICO')) {
      steps.push('Atender alertas críticas de seguridad inmediatamente');
    }
    
    if (result.errorRecords > 0) {
      steps.push(`Revisar ${result.errorRecords} registros con errores`);
    }
    
    return steps;
  }

  // 📊 Resumir errores de validación
  summarizeValidationErrors(invalidRecords) {
    const errorSummary = {};
    
    invalidRecords.forEach(invalid => {
      invalid.validation.errors.forEach(error => {
        const key = `${error.field}_${error.type}`;
        if (!errorSummary[key]) {
          errorSummary[key] = {
            field: error.field,
            type: error.type,
            message: error.message,
            count: 0
          };
        }
        errorSummary[key].count++;
      });
    });
    
    return Object.values(errorSummary).sort((a, b) => b.count - a.count);
  }
}

module.exports = UploadController;