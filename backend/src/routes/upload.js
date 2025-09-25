// 🛣️ RUTAS DE UPLOAD V2.0
// src/routes/upload.js

const express = require('express');
const multer = require('multer');
const UploadController = require('../controllers/uploadController');
const { validateExcelFile, handleMulterError } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const uploadController = new UploadController();

// 📊 Rate limiting específico para uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 uploads por ventana de tiempo
  message: {
    error: 'UPLOAD_RATE_LIMIT',
    message: 'Demasiados uploads. Máximo 5 archivos por 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 📁 Configuración de Multer para archivos Excel
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log(`[UPLOAD-ROUTE] 📁 Archivo recibido: ${file.originalname}, tipo: ${file.mimetype}`);
  
  // Validar tipo MIME
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream' // Fallback para algunos casos
  ];
  
  // Validar extensión como backup
  const allowedExtensions = /\.(xlsx|xls)$/i;
  const hasValidExtension = allowedExtensions.test(file.originalname);
  const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
  
  if (hasValidMimeType || hasValidExtension) {
    console.log(`[UPLOAD-ROUTE] ✅ Archivo aceptado: ${file.originalname}`);
    cb(null, true);
  } else {
    console.log(`[UPLOAD-ROUTE] ❌ Archivo rechazado: ${file.originalname}, mime: ${file.mimetype}`);
    cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
    files: 1 // Solo un archivo a la vez
  }
});

// 🔍 Middleware de logging para todas las rutas de upload
router.use((req, res, next) => {
  console.log(`[UPLOAD-ROUTE] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// 📋 **RUTAS PRINCIPALES**

// 🔍 POST /api/upload/validate - Validar archivo Excel
router.post('/validate', 
  uploadLimiter,
  upload.single('file'),
  handleMulterError,
  validateExcelFile,
  uploadController.validateExcel.bind(uploadController)
);

// 🚀 POST /api/upload/excel - Procesar archivo Excel
router.post('/excel',
  uploadLimiter, 
  upload.single('file'),
  handleMulterError,
  validateExcelFile,
  uploadController.uploadExcel.bind(uploadController)
);

// 📊 GET /api/upload/history - Historial de archivos procesados
router.get('/history',
  uploadController.getUploadHistory.bind(uploadController)
);

// 🗑️ DELETE /api/upload/revert/:fileId - Revertir procesamiento
router.delete('/revert/:fileId',
  uploadController.revertUpload.bind(uploadController)
);

// 📈 GET /api/upload/stats - Estadísticas de uploads
router.get('/stats', async (req, res) => {
  try {
    console.log('[UPLOAD-ROUTE] 📈 Obteniendo estadísticas de uploads...');
    
    const { getPrismaClient } = require('../config/database');
    const prisma = getPrismaClient();
    
    const [totalArchivos, archivosPorMes, tamaniosPromedio] = await Promise.all([
      prisma.archivosProcesados.count(),
      
      prisma.archivosProcesados.groupBy({
        by: ['ano_detectado'],
        _count: { id: true },
        _sum: { 
          total_registros: true,
          registros_nuevos: true,
          registros_duplicados: true
        },
        _avg: {
          tiempo_procesamiento: true
        },
        orderBy: { ano_detectado: 'desc' }
      }),
      
      prisma.archivosProcesados.aggregate({
        _avg: {
          total_registros: true,
          tiempo_procesamiento: true
        },
        _sum: {
          total_registros: true,
          registros_nuevos: true
        }
      })
    ]);
    
    const stats = {
      resumen: {
        totalArchivos,
        registrosPromedioPorArchivo: Math.round(tamaniosPromedio._avg.total_registros || 0),
        tiempoPromedioSegundos: Math.round(tamaniosPromedio._avg.tiempo_procesamiento || 0),
        totalRegistrosProcesados: tamaniosPromedio._sum.total_registros || 0,
        totalRegistrosNuevos: tamaniosPromedio._sum.registros_nuevos || 0
      },
      distribucionPorAno: archivosPorMes.map(item => ({
        ano: item.ano_detectado,
        archivos: item._count.id,
        registros: item._sum.total_registros || 0,
        nuevos: item._sum.registros_nuevos || 0,
        duplicados: item._sum.registros_duplicados || 0,
        tiempoPromedioMinutos: item._avg.tiempo_procesamiento ? 
          Math.round(item._avg.tiempo_procesamiento / 60 * 100) / 100 : 0
      })),
      rendimiento: {
        eficienciaPromedio: tamaniosPromedio._sum.total_registros > 0 ?
          Math.round((tamaniosPromedio._sum.registros_nuevos / tamaniosPromedio._sum.total_registros) * 100 * 100) / 100 : 0,
        velocidadProcesamiento: tamaniosPromedio._avg.tiempo_procesamiento > 0 && tamaniosPromedio._avg.total_registros > 0 ?
          Math.round((tamaniosPromedio._avg.total_registros / tamaniosPromedio._avg.tiempo_procesamiento) * 100) / 100 : 0 // registros por segundo
      }
    };
    
    console.log('[UPLOAD-ROUTE] ✅ Estadísticas obtenidas:', stats.resumen);
    
    res.json({
      success: true,
      data: stats,
      message: 'Estadísticas de uploads obtenidas'
    });
    
  } catch (error) {
    console.error('[UPLOAD-ROUTE] ❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'STATS_ERROR',
      message: error.message
    });
  }
});

// 📊 GET /api/upload/templates - Obtener plantillas de Excel
router.get('/templates', (req, res) => {
  try {
    console.log('[UPLOAD-ROUTE] 📊 Enviando información de plantillas...');
    
    const templates = {
      current: {
        version: '2.0',
        name: 'Plantilla HQ-FO-40 V2.0 con Detección de Fatiga',
        description: 'Incluye nuevas preguntas sobre fatiga del conductor',
        requiredColumns: [
          'Fecha',
          'Hora', 
          'Turno',
          'Conductor',
          'Cédula',
          'Placa Vehículo',
          'Contrato',
          'Campo',
          // 🚨 NUEVAS COLUMNAS DE FATIGA
          '¿Ha consumido medicamentos o sustancias que afecten su estado de alerta?',
          '¿Ha dormido al menos 7 horas en las últimas 24 horas?',
          '¿Se encuentra libre de síntomas de fatiga (Somnolencia, dolor de cabeza, irritabilidad)?',
          '¿Se siente en condiciones físicas y mentales para conducir?',
          // Columnas de inspección vehicular
          'Luces',
          'Frenos',
          'Neumáticos',
          'Dirección',
          'Espejos',
          'Cinturones',
          'Kit Carretera',
          'Extintor',
          'Botiquín',
          'Observaciones'
        ],
        newFeatures: [
          '🚨 Detección automática de alertas rojas por medicamentos',
          '⚠️ Alertas de advertencia por problemas de fatiga',
          '📊 Análisis automático de año y meses',
          '🔄 Validación de duplicados mejorada',
          '📈 Soporte para archivos anuales completos'
        ]
      },
      legacy: {
        version: '1.0',
        name: 'Plantilla Original HQ-FO-40',
        description: 'Versión anterior sin detección de fatiga',
        status: 'deprecated',
        note: 'Se recomienda migrar a la versión 2.0'
      },
      downloadInstructions: [
        '1. Las columnas de fatiga son críticas para el funcionamiento del sistema',
        '2. Usar "SI"/"NO" para las respuestas de fatiga',
        '3. El archivo puede contener datos de todo el año',
        '4. Se detectará automáticamente el período del archivo',
        '5. Los duplicados se filtran automáticamente'
      ],
      validationRules: {
        fatigueQuestions: {
          'consumo_medicamentos': {
            question: '¿Ha consumido medicamentos o sustancias que afecten su estado de alerta?',
            criticalLevel: 'ALERTA_ROJA',
            acceptedValues: ['SI', 'NO', 'SÍ'],
            note: 'SI = Alerta Roja Automática'
          },
          'horas_sueno_suficientes': {
            question: '¿Ha dormido al menos 7 horas en las últimas 24 horas?',
            criticalLevel: 'ADVERTENCIA',
            acceptedValues: ['SI', 'NO', 'SÍ'],
            note: 'NO = Advertencia'
          },
          'libre_sintomas_fatiga': {
            question: '¿Se encuentra libre de síntomas de fatiga?',
            criticalLevel: 'ADVERTENCIA', 
            acceptedValues: ['SI', 'NO', 'SÍ'],
            note: 'NO = Advertencia'
          },
          'condiciones_aptas': {
            question: '¿Se siente en condiciones físicas y mentales para conducir?',
            criticalLevel: 'ADVERTENCIA',
            acceptedValues: ['SI', 'NO', 'SÍ'],
            note: 'NO = Advertencia'
          }
        }
      }
    };
    
    res.json({
      success: true,
      data: templates,
      message: 'Información de plantillas obtenida'
    });
    
  } catch (error) {
    console.error('[UPLOAD-ROUTE] ❌ Error obteniendo plantillas:', error);
    res.status(500).json({
      success: false,
      error: 'TEMPLATES_ERROR',
      message: error.message
    });
  }
});

// 🧪 GET /api/upload/test - Endpoint de prueba para uploads
router.get('/test', (req, res) => {
  console.log('[UPLOAD-ROUTE] 🧪 Test endpoint llamado');
  
  res.json({
    success: true,
    message: 'Upload routes funcionando correctamente',
    timestamp: new Date().toISOString(),
    config: {
      maxFileSize: `${(parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024) / 1024 / 1024}MB`,
      allowedFormats: ['.xlsx', '.xls'],
      rateLimitWindow: '15 minutos',
      maxUploadsPerWindow: 5
    },
    endpoints: [
      'POST /api/upload/validate - Validar archivo Excel',
      'POST /api/upload/excel - Procesar archivo Excel', 
      'GET /api/upload/history - Historial de uploads',
      'DELETE /api/upload/revert/:id - Revertir upload',
      'GET /api/upload/stats - Estadísticas',
      'GET /api/upload/templates - Info de plantillas'
    ]
  });
});

// 🔧 Middleware de manejo de errores específico para uploads
router.use((error, req, res, next) => {
  console.error('[UPLOAD-ROUTE] ❌ Error en ruta de upload:', error);
  
  // Error de Multer
  if (error instanceof multer.MulterError) {
    let message = 'Error procesando archivo';
    let code = 'UPLOAD_ERROR';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `Archivo demasiado grande. Máximo: ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024) / 1024 / 1024)}MB`;
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Solo se permite un archivo a la vez';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Campo de archivo no esperado';
        code = 'UNEXPECTED_FIELD';
        break;
    }
    
    return res.status(400).json({
      success: false,
      error: code,
      message,
      details: error.message
    });
  }
  
  // Error de validación de archivo
  if (error.message.includes('Solo se permiten archivos Excel')) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILE_TYPE',
      message: error.message,
      allowedTypes: ['.xlsx', '.xls']
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    error: 'UPLOAD_ROUTE_ERROR',
    message: 'Error interno en el procesamiento de uploads',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;