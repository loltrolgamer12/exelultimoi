// 🛣️ RUTAS DE UPLOAD V2.0 SIMPLIFICADO
// backend/src/routes/upload.js

const express = require('express');
const multer = require('multer');
const UploadController = require('../controllers/uploadController');
const { 
  validateExcelFile, 
  handleMulterError
} = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const uploadController = new UploadController();

// 📊 Rate limiting específico para uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: {
    success: false,
    error: 'UPLOAD_RATE_LIMIT',
    message: 'Demasiados uploads. Máximo 10 archivos por 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 📁 Configuración de Multer para archivos Excel
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    console.log(`[UPLOAD-ROUTE] 📁 Archivo: ${file.originalname}, tipo: ${file.mimetype}`);
    
    const allowedExtensions = /\.(xlsx|xls)$/i;
    const hasValidExtension = allowedExtensions.test(file.originalname);
    
    if (hasValidExtension) {
      console.log(`[UPLOAD-ROUTE] ✅ Archivo aceptado: ${file.originalname}`);
      cb(null, true);
    } else {
      console.log(`[UPLOAD-ROUTE] ❌ Archivo rechazado: ${file.originalname}`);
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  }
});

// 🔍 Middleware de logging
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
  (req, res) => uploadController.validateExcel(req, res)
);

// 🚀 POST /api/upload/process - Procesar archivo Excel
router.post('/process', 
  uploadLimiter,
  upload.single('file'),
  handleMulterError,
  validateExcelFile,
  (req, res) => uploadController.uploadExcel(req, res)
);

// 📊 GET /api/upload/history - Obtener historial
router.get('/history', (req, res) => uploadController.getUploadHistory(req, res));

// 📊 GET /api/upload/stats - Obtener estadísticas
router.get('/stats', (req, res) => uploadController.getUploadStats(req, res));

// 📋 GET /api/upload/template - Obtener plantilla
router.get('/template', (req, res) => uploadController.getExcelTemplate(req, res));

// 🔍 GET /api/upload/:uploadId - Obtener detalles de upload
router.get('/:uploadId', (req, res) => uploadController.getUploadDetails(req, res));

// 🗑️ POST /api/upload/:uploadId/revert - Revertir upload
router.post('/:uploadId/revert', 
  uploadLimiter,
  (req, res) => uploadController.revertUpload(req, res)
);

// 🔧 **MIDDLEWARE DE MANEJO DE ERRORES**
router.use((error, req, res, next) => {
  console.error('[UPLOAD-ROUTE] ❌ Error:', error);
  
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: 'MULTER_ERROR',
      message: `Error de upload: ${error.message}`
    });
  }
  
  if (error.message && error.message.includes('Solo se permiten archivos Excel')) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FILE_TYPE',
      message: error.message
    });
  }
  
  return res.status(500).json({
    success: false,
    error: 'UPLOAD_ERROR',
    message: error.message || 'Error interno del servidor'
  });
});

module.exports = router;