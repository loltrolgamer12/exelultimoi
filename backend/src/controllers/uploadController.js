// 🎛️ CONTROLADOR DE UPLOAD V2.0
// src/controllers/uploadController.js

const ExcelService = require('../services/excelService');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { getPrismaClient } = require('../config/database');

class UploadController {
  constructor() {
    this.prisma = getPrismaClient();
  }

  // 🔍 Validar archivo Excel antes de procesarlo
  async validateExcel(req, res) {
    try {
      console.log('[UPLOAD] 🔍 Iniciando validación de archivo Excel...');
      
      if (!req.file) {
        return errorResponse(res, 'ARCHIVO_REQUERIDO', 'Debe seleccionar un archivo Excel', 400);
      }
      
      // Validaciones básicas del archivo
      const file = req.file;
      const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default
      
      console.log(`[UPLOAD] 📊 Archivo recibido: ${file.originalname} (${file.size} bytes)`);
      
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
      
      // Inicializar servicio Excel
      const excelService = new ExcelService();
      
      // Analizar estructura del archivo
      const analysis = await excelService.analyzeExcelFile(file.buffer, file.originalname);
      
      // Verificar si el archivo ya fue procesado
      const existingFile = await excelService.checkDuplicateFile(analysis.fileHash);
      
      const response = {
        valid: true,
        filename: file.originalname,
        fileSize: file.size,
        fileSizeMB: Math.round(file.size / 1024 / 1024 * 100) / 100,
        analysis: {
          totalRows: analysis.totalRows,
          totalColumns: analysis.totalColumns,
          headers: analysis.headers,
          dateInfo: analysis.dateInfo,
          estimatedProcessingTime: analysis.estimatedProcessingTime,
          columnAnalysis: analysis.columnAnalysis.slice(0, 10) // Primeras 10 columnas
        },
        warnings: analysis.warnings,
        isDuplicate: !!existingFile,
        duplicateInfo: existingFile ? {
          processedDate: existingFile.fecha_procesamiento,
          totalRecords: existingFile.total_registros,
          newRecords: existingFile.registros_nuevos
        } : null,
        recommendations: this.generateRecommendations(analysis),
        preview: {
          sampleData: analysis.sampleData.slice(0, 3),
          detectedPeriod: `${analysis.dateInfo.año} - Meses: ${analysis.dateInfo.meses.join(', ')}`,
          isAnnualFile: analysis.dateInfo.esArchivoAnual,
          isMonthlyFile: analysis.dateInfo.esArchivoMensual
        }
      };
      
      console.log('[UPLOAD] ✅ Validación exitosa:', {
        filename: file.originalname,
        rows: analysis.totalRows,
        period: response.preview.detectedPeriod,
        isDuplicate: response.isDuplicate
      });
      
      return successResponse(res, response, 'Archivo validado exitosamente');
      
    } catch (error) {
      console.error('[UPLOAD] ❌ Error en validación:', error);
      return errorResponse(res, 'VALIDACION_FALLIDA', error.message, 500);
    }
  }

  // 🚀 Procesar y cargar archivo Excel
  async uploadExcel(req, res) {
    try {
      console.log('[UPLOAD] 🚀 Iniciando procesamiento de archivo Excel...');
      
      if (!req.file) {
        return errorResponse(res, 'ARCHIVO_REQUERIDO', 'Debe seleccionar un archivo Excel', 400);
      }
      
      const file = req.file;
      const options = {
        forceReprocess: req.body.forceReprocess === 'true',
        skipValidation: req.body.skipValidation === 'true',
        batchSize: parseInt(req.body.batchSize) || 500
      };
      
      console.log(`[UPLOAD] 📊 Procesando archivo: ${file.originalname}`, options);
      
      // Inicializar servicio Excel
      const excelService = new ExcelService();
      
      // Procesar archivo
      const result = await excelService.processExcelFile(file.buffer, file.originalname, options);
      
      // 📊 Generar estadísticas adicionales
      const stats = await this.generateProcessingStats(result);
      
      // 🚨 Generar alertas si hay problemas críticos
      const alerts = await this.generateAlerts(result);
      
      const response = {
        success: true,
        processing: result,
        statistics: stats,
        alerts: alerts,
        summary: {
          totalProcessed: result.totalRecords,
          newRecords: result.newRecords,
          duplicateRecords: result.duplicateRecords,
          errorRecords: result.errorRecords,
          processingTime: result.processingTime,
          period: `${result.dateInfo.año} - ${result.dateInfo.meses.length} meses`,
          criticalAlerts: alerts.filter(a => a.level === 'CRITICO').length,
          warnings: alerts.filter(a => a.level === 'ADVERTENCIA').length
        },
        nextSteps: this.generateNextSteps(result, alerts)
      };
      
      console.log('[UPLOAD] ✅ Procesamiento exitoso:', response.summary);
      
      // 📧 Notificación para casos críticos (futuro)
      if (alerts.some(a => a.level === 'CRITICO')) {
        // TODO: Implementar sistema de notificaciones
        console.log('🚨 ALERTAS CRÍTICAS DETECTADAS - Se requiere notificación');
      }
      
      return successResponse(res, response, 'Archivo procesado exitosamente');
      
    } catch (error) {
      console.error('[UPLOAD] ❌ Error en procesamiento:', error);
      
      // Determinar tipo de error para respuesta apropiada
      let errorCode = 'PROCESAMIENTO_FALLIDO';
      let statusCode = 500;
      
      if (error.message.includes('archivo ya fue procesado')) {
        errorCode = 'ARCHIVO_DUPLICADO';
        statusCode = 409; // Conflict
      } else if (error.message.includes('no se encontr')) {
        errorCode = 'ESTRUCTURA_INVALIDA';
        statusCode = 400; // Bad Request
      } else if (error.message.includes('memoria') || error.message.includes('timeout')) {
        errorCode = 'ARCHIVO_MUY_GRANDE';
        statusCode = 413; // Payload Too Large
      }
      
      return errorResponse(res, errorCode, error.message, statusCode, {
        filename: req.file?.originalname,
        fileSize: req.file?.size,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 📊 Obtener historial de archivos procesados
  async getUploadHistory(req, res) {
    try {
      console.log('[UPLOAD] 📊 Obteniendo historial de archivos...');
      
      const { page = 1, limit = 20, year, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Filtros
      const where = {};
      if (year) {
        where.ano_detectado = parseInt(year);
      }
      if (status) {
        where.estado_procesamiento = status.toUpperCase();
      }
      
      // Consulta con paginación
      const [archivos, total] = await Promise.all([
        this.prisma.archivosProcesados.findMany({
          where,
          orderBy: { fecha_procesamiento: 'desc' },
          skip,
          take: parseInt(limit),
          select: {
            id: true,
            nombre_archivo: true,
            ano_detectado: true,
            meses_detectados: true,
            total_registros: true,
            registros_nuevos: true,
            registros_duplicados: true,
            estado_procesamiento: true,
            tiempo_procesamiento: true,
            fecha_procesamiento: true,
            errores_validacion: true,
            advertencias: true
          }
        }),
        this.prisma.archivosProcesados.count({ where })
      ]);
      
      // Estadísticas generales
      const stats = await this.prisma.archivosProcesados.aggregate({
        where,
        _count: true,
        _sum: {
          total_registros: true,
          registros_nuevos: true,
          registros_duplicados: true
        },
        _avg: {
          tiempo_procesamiento: true
        }
      });
      
      const response = {
        archivos: archivos.map(archivo => ({
          ...archivo,
          hasErrors: archivo.errores_validacion && archivo.errores_validacion.length > 0,
          hasWarnings: archivo.advertencias && archivo.advertencias.length > 0,
          processingTimeMins: archivo.tiempo_procesamiento ? 
            Math.round(archivo.tiempo_procesamiento / 60 * 100) / 100 : null,
          periodDescription: archivo.meses_detectados.length > 0 ?
            `${archivo.ano_detectado} - ${archivo.meses_detectados.length} meses` :
            `${archivo.ano_detectado}`
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNext: skip + parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        },
        statistics: {
          totalArchivos: stats._count,
          totalRegistros: stats._sum.total_registros || 0,
          totalNuevos: stats._sum.registros_nuevos || 0,
          totalDuplicados: stats._sum.registros_duplicados || 0,
          tiempoPromedioMinutos: stats._avg.tiempo_procesamiento ? 
            Math.round(stats._avg.tiempo_procesamiento / 60 * 100) / 100 : 0
        }
      };
      
      console.log('[UPLOAD] ✅ Historial obtenido:', {
        archivos: response.archivos.length,
        total: response.pagination.totalItems
      });
      
      return successResponse(res, response, 'Historial obtenido exitosamente');
      
    } catch (error) {
      console.error('[UPLOAD] ❌ Error obteniendo historial:', error);
      return errorResponse(res, 'HISTORIAL_ERROR', error.message, 500);
    }
  }

  // 🗑️ Revertir procesamiento de archivo
  async revertUpload(req, res) {
    try {
      const { fileId } = req.params;
      console.log(`[UPLOAD] 🗑️ Revirtiendo procesamiento de archivo: ${fileId}`);
      
      // Buscar archivo
      const archivo = await this.prisma.archivosProcesados.findUnique({
        where: { id: fileId }
      });
      
      if (!archivo) {
        return errorResponse(res, 'ARCHIVO_NO_ENCONTRADO', 'Archivo no encontrado', 404);
      }
      
      // Eliminar registros asociados al archivo
      // (Esto requeriría una relación en el esquema o un campo de tracking)
      // Por ahora, eliminar por período y fecha de procesamiento
      const fechaInicio = new Date(archivo.fecha_procesamiento);
      fechaInicio.setHours(0, 0, 0, 0);
      const fechaFin = new Date(archivo.fecha_procesamiento);
      fechaFin.setHours(23, 59, 59, 999);
      
      const deletedInspections = await this.prisma.inspeccion.deleteMany({
        where: {
          ano: archivo.ano_detectado,
          mes: { in: archivo.meses_detectados },
          createdAt: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      });
      
      // Eliminar registro del archivo
      await this.prisma.archivosProcesados.delete({
        where: { id: fileId }
      });
      
      const response = {
        success: true,
        fileName: archivo.nombre_archivo,
        deletedInspections: deletedInspections.count,
        period: `${archivo.ano_detectado} - Meses: ${archivo.meses_detectados.join(', ')}`
      };
      
      console.log('[UPLOAD] ✅ Reversión exitosa:', response);
      return successResponse(res, response, 'Archivo revertido exitosamente');
      
    } catch (error) {
      console.error('[UPLOAD] ❌ Error revirtiendo archivo:', error);
      return errorResponse(res, 'REVERSION_FALLIDA', error.message, 500);
    }
  }

  // 💡 Generar recomendaciones para el usuario
  generateRecommendations(analysis) {
    const recommendations = [];
    
    // Recomendaciones de tamaño de archivo
    if (analysis.totalRows > 10000) {
      recommendations.push({
        type: 'performance',
        level: 'info',
        message: 'Archivo grande detectado. El procesamiento puede tomar varios minutos.',
        action: 'Considere procesar durante horas de menor actividad'
      });
    }
    
    // Recomendaciones de duplicados
    if (analysis.dateInfo.esArchivoAnual) {
      recommendations.push({
        type: 'data',
        level: 'success',
        message: 'Archivo anual detectado correctamente.',
        action: `Se procesarán datos de ${analysis.dateInfo.meses.length} meses del año ${analysis.dateInfo.año}`
      });
    }
    
    // Recomendaciones de estructura
    if (analysis.columnAnalysis.some(col => col.possibleMappings.includes('consumo_medicamentos'))) {
      recommendations.push({
        type: 'feature',
        level: 'success',
        message: 'Columnas de fatiga del conductor detectadas.',
        action: 'Se aplicarán las nuevas reglas de alertas rojas y advertencias'
      });
    }
    
    return recommendations;
  }

  // 📊 Generar estadísticas de procesamiento
  async generateProcessingStats(result) {
    try {
      // Obtener estadísticas de la base de datos
      const totalInspecciones = await this.prisma.inspeccion.count();
      const alertasRojas = await this.prisma.inspeccion.count({
        where: { tiene_alerta_roja: true }
      });
      const advertencias = await this.prisma.inspeccion.count({
        where: { tiene_advertencias: true }
      });
      
      return {
        database: {
          totalInspecciones,
          alertasRojas,
          advertencias,
          porcentajeAlertasRojas: totalInspecciones > 0 ? 
            Math.round((alertasRojas / totalInspecciones) * 100 * 100) / 100 : 0
        },
        processing: {
          efficiency: result.totalRecords > 0 ? 
            Math.round((result.newRecords / result.totalRecords) * 100 * 100) / 100 : 0,
          duplicateRate: result.totalRecords > 0 ?
            Math.round((result.duplicateRecords / result.totalRecords) * 100 * 100) / 100 : 0,
          errorRate: result.totalRecords > 0 ?
            Math.round((result.errorRecords / result.totalRecords) * 100 * 100) / 100 : 0
        }
      };
    } catch (error) {
      console.error('[UPLOAD] Error generando estadísticas:', error);
      return { database: {}, processing: {} };
    }
  }

  // 🚨 Generar alertas basadas en el resultado
  async generateAlerts(result) {
    const alerts = [];
    
    // Alerta por alta tasa de errores
    if (result.errorRecords > result.newRecords * 0.1) { // Más del 10% errores
      alerts.push({
        level: 'CRITICO',
        type: 'CALIDAD_DATOS',
        message: `Alta tasa de errores: ${result.errorRecords} de ${result.totalRecords} registros`,
        action: 'Revisar formato del archivo Excel',
        priority: 1
      });
    }
    
    // Alerta por muchos duplicados
    if (result.duplicateRecords > result.totalRecords * 0.5) { // Más del 50% duplicados
      alerts.push({
        level: 'ADVERTENCIA',
        type: 'DUPLICADOS',
        message: `Alto número de duplicados: ${result.duplicateRecords} registros`,
        action: 'Verificar si el archivo ya fue procesado anteriormente',
        priority: 2
      });
    }
    
    // Alerta por período sospechoso
    if (result.dateInfo.año < new Date().getFullYear() - 2) {
      alerts.push({
        level: 'ADVERTENCIA',
        type: 'PERIODO',
        message: `Datos antiguos detectados: año ${result.dateInfo.año}`,
        action: 'Confirmar que estos datos históricos son correctos',
        priority: 3
      });
    }
    
    return alerts.sort((a, b) => a.priority - b.priority);
  }

  // ➡️ Generar próximos pasos recomendados
  generateNextSteps(result, alerts) {
    const steps = [];
    
    if (result.newRecords > 0) {
      steps.push({
        step: 1,
        action: 'Revisar Dashboard',
        description: `Se han agregado ${result.newRecords} nuevos registros. Revisar estadísticas actualizadas.`,
        url: '/dashboard'
      });
    }
    
    if (alerts.some(a => a.level === 'CRITICO')) {
      steps.push({
        step: 2,
        action: 'Resolver Alertas Críticas',
        description: 'Hay problemas críticos que requieren atención inmediata.',
        url: '/alerts'
      });
    }
    
    steps.push({
      step: steps.length + 1,
      action: 'Verificar Datos',
      description: 'Buscar y revisar algunos registros procesados para confirmar la calidad.',
      url: '/search'
    });
    
    return steps;
  }
}

module.exports = UploadController;