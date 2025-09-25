// ⚙️ CONFIGURACIÓN DE MULTER PARA UPLOADS V2.0
// src/config/multer.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 📁 **CONFIGURACIÓN DE ALMACENAMIENTO**

// Almacenamiento en memoria para mejor rendimiento en Vercel
const memoryStorage = multer.memoryStorage();

// Almacenamiento en disco local (para desarrollo)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`[MULTER] 📁 Directorio de uploads creado: ${uploadDir}`);
    }
    
    cb(null, uploadDir);
  },
  
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filename = `${file.fieldname}-${uniqueSuffix}-${sanitizedOriginalName}`;
    
    console.log(`[MULTER] 📝 Archivo guardándose como: ${filename}`);
    cb(null, filename);
  }
});

// 🔍 **FILTROS DE ARCHIVO**

// Filtro para archivos Excel
const excelFileFilter = (req, file, cb) => {
  console.log(`[MULTER] 🔍 Validando archivo: ${file.originalname}, MIME: ${file.mimetype}`);
  
  // Extensiones permitidas
  const allowedExtensions = ['.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  // Tipos MIME permitidos
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream', // Fallback para algunos navegadores
    'application/x-ole-storage' // Otro fallback para .xls
  ];
  
  // Validar extensión
  if (!allowedExtensions.includes(fileExtension)) {
    console.log(`[MULTER] ❌ Extensión no permitida: ${fileExtension}`);
    const error = new Error(`Solo se permiten archivos Excel (.xlsx, .xls). Recibido: ${fileExtension}`);
    error.code = 'INVALID_FILE_EXTENSION';
    return cb(error, false);
  }
  
  // Validar MIME type (menos estricto)
  if (!allowedMimeTypes.includes(file.mimetype)) {
    console.log(`[MULTER] ⚠️ MIME type no reconocido: ${file.mimetype}, pero extensión válida - continuando`);
    // No rechazar aquí, algunos navegadores envían MIME types incorrectos
  }
  
  // Validar nombre de archivo
  if (file.originalname.length > 255) {
    console.log(`[MULTER] ❌ Nombre de archivo muy largo: ${file.originalname.length} caracteres`);
    const error = new Error('El nombre del archivo es demasiado largo (máximo 255 caracteres)');
    error.code = 'FILENAME_TOO_LONG';
    return cb(error, false);
  }
  
  // Validar caracteres especiales peligrosos
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.originalname)) {
    console.log(`[MULTER] ❌ Caracteres peligrosos en nombre de archivo: ${file.originalname}`);
    const error = new Error('El nombre del archivo contiene caracteres no permitidos');
    error.code = 'INVALID_FILENAME_CHARS';
    return cb(error, false);
  }
  
  console.log(`[MULTER] ✅ Archivo Excel válido: ${file.originalname}`);
  cb(null, true);
};

// Filtro genérico para imágenes (para futuras funcionalidades)
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp'
  ];
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    console.log(`[MULTER] ✅ Imagen válida: ${file.originalname}`);
    cb(null, true);
  } else {
    console.log(`[MULTER] ❌ Formato de imagen no permitido: ${file.originalname}`);
    const error = new Error('Solo se permiten imágenes (JPG, PNG, GIF, WebP)');
    error.code = 'INVALID_IMAGE_FORMAT';
    cb(error, false);
  }
};

// 📊 **CONFIGURACIONES DE LÍMITES**

// Límites para archivos Excel
const excelLimits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
  files: parseInt(process.env.MAX_FILES_COUNT) || 1, // 1 archivo por default
  fields: 20, // Máximo 20 campos en el formulario
  fieldNameSize: 100, // Máximo 100 bytes para nombres de campo
  fieldSize: 1024 * 1024, // Máximo 1MB para valores de campo
  parts: 25 // Máximo 25 partes en total
};

// Límites para imágenes (futuro)
const imageLimits = {
  fileSize: 10 * 1024 * 1024, // 10MB
  files: 5,
  fields: 10,
  fieldNameSize: 50,
  fieldSize: 1024
};

// 🔧 **CONFIGURACIONES MULTER**

// Configuración principal para archivos Excel
const excelUploadConfig = {
  storage: process.env.NODE_ENV === 'production' ? memoryStorage : diskStorage,
  fileFilter: excelFileFilter,
  limits: excelLimits,
  preservePath: false
};

// Configuración para imágenes
const imageUploadConfig = {
  storage: memoryStorage, // Siempre en memoria para imágenes
  fileFilter: imageFileFilter,
  limits: imageLimits,
  preservePath: false
};

// 🚀 **INSTANCIAS DE MULTER**

// Multer para archivos Excel
const excelUpload = multer(excelUploadConfig);

// Multer para imágenes
const imageUpload = multer(imageUploadConfig);

// 📊 **MIDDLEWARE PERSONALIZADO**

// Middleware de logging para uploads
const uploadLoggingMiddleware = (req, res, next) => {
  console.log(`[MULTER] 📤 Iniciando upload - IP: ${req.ip}, User-Agent: ${req.get('User-Agent')?.substring(0, 100)}`);
  
  // Agregar timestamp para medir tiempo de procesamiento
  req.uploadStartTime = Date.now();
  
  next();
};

// Middleware de post-procesamiento
const postUploadMiddleware = (req, res, next) => {
  if (req.file) {
    const uploadTime = Date.now() - (req.uploadStartTime || Date.now());
    
    console.log(`[MULTER] ✅ Upload completado en ${uploadTime}ms:`);
    console.log(`[MULTER] - Archivo: ${req.file.originalname}`);
    console.log(`[MULTER] - Tamaño: ${Math.round(req.file.size / 1024)}KB`);
    console.log(`[MULTER] - MIME: ${req.file.mimetype}`);
    
    // Agregar metadatos útiles al request
    req.file.uploadTime = uploadTime;
    req.file.sizeMB = Math.round(req.file.size / 1024 / 1024 * 100) / 100;
    req.file.isExcel = ['.xlsx', '.xls'].includes(path.extname(req.file.originalname).toLowerCase());
    
  } else if (req.files && Array.isArray(req.files)) {
    const uploadTime = Date.now() - (req.uploadStartTime || Date.now());
    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
    
    console.log(`[MULTER] ✅ Upload múltiple completado en ${uploadTime}ms:`);
    console.log(`[MULTER] - Archivos: ${req.files.length}`);
    console.log(`[MULTER] - Tamaño total: ${Math.round(totalSize / 1024)}KB`);
    
    // Agregar metadatos a cada archivo
    req.files.forEach(file => {
      file.uploadTime = uploadTime;
      file.sizeMB = Math.round(file.size / 1024 / 1024 * 100) / 100;
      file.isExcel = ['.xlsx', '.xls'].includes(path.extname(file.originalname).toLowerCase());
    });
  }
  
  next();
};

// 🧹 **UTILIDADES DE LIMPIEZA**

// Limpiar archivos temporales en disco
const cleanupTempFiles = async (maxAgeHours = 24) => {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  
  if (!fs.existsSync(uploadDir)) {
    return { cleaned: 0, message: 'Directorio de uploads no existe' };
  }
  
  try {
    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let cleanedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        cleanedCount++;
        console.log(`[MULTER] 🧹 Archivo temporal eliminado: ${file}`);
      }
    }
    
    return { 
      cleaned: cleanedCount, 
      message: `${cleanedCount} archivos temporales eliminados` 
    };
    
  } catch (error) {
    console.error('[MULTER] ❌ Error limpiando archivos temporales:', error);
    return { cleaned: 0, error: error.message };
  }
};

// Programar limpieza automática cada 6 horas
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_AUTO_CLEANUP !== 'false') {
  setInterval(() => {
    cleanupTempFiles(6).then(result => {
      if (result.cleaned > 0) {
        console.log(`[MULTER] 🧹 Limpieza automática: ${result.message}`);
      }
    });
  }, 6 * 60 * 60 * 1000); // 6 horas
}

// 🔧 **FUNCIONES DE CONFIGURACIÓN DINÁMICA**

// Crear configuración personalizada de Multer
const createCustomUploadConfig = (options = {}) => {
  const defaultOptions = {
    storage: memoryStorage,
    fileFilter: excelFileFilter,
    limits: excelLimits,
    preservePath: false
  };
  
  const config = { ...defaultOptions, ...options };
  
  return multer(config);
};

// Validar configuración de upload
const validateUploadConfig = (config) => {
  const requiredFields = ['storage', 'limits'];
  const issues = [];
  
  requiredFields.forEach(field => {
    if (!config[field]) {
      issues.push(`Campo requerido faltante: ${field}`);
    }
  });
  
  if (config.limits) {
    if (!config.limits.fileSize || config.limits.fileSize <= 0) {
      issues.push('limits.fileSize debe ser un número positivo');
    }
    if (config.limits.fileSize > 100 * 1024 * 1024) { // 100MB
      issues.push('limits.fileSize no debería exceder 100MB para evitar problemas de memoria');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// 📊 **ESTADÍSTICAS DE UPLOAD**

// Contadores globales de estadísticas
const uploadStats = {
  totalUploads: 0,
  totalSize: 0,
  successfulUploads: 0,
  failedUploads: 0,
  averageUploadTime: 0,
  lastReset: Date.now()
};

// Incrementar estadísticas
const incrementUploadStats = (file, uploadTime, success = true) => {
  uploadStats.totalUploads++;
  uploadStats.totalSize += file.size;
  
  if (success) {
    uploadStats.successfulUploads++;
  } else {
    uploadStats.failedUploads++;
  }
  
  // Calcular tiempo promedio
  uploadStats.averageUploadTime = (uploadStats.averageUploadTime + uploadTime) / 2;
};

// Obtener estadísticas
const getUploadStats = () => {
  const uptime = Date.now() - uploadStats.lastReset;
  
  return {
    ...uploadStats,
    uptimeMs: uptime,
    uptimeHours: Math.round(uptime / (1000 * 60 * 60) * 100) / 100,
    successRate: uploadStats.totalUploads > 0 ? 
      Math.round((uploadStats.successfulUploads / uploadStats.totalUploads) * 100 * 100) / 100 : 0,
    averageSizeMB: Math.round((uploadStats.totalSize / Math.max(uploadStats.totalUploads, 1)) / 1024 / 1024 * 100) / 100,
    totalSizeMB: Math.round(uploadStats.totalSize / 1024 / 1024 * 100) / 100
  };
};

// Reset estadísticas
const resetUploadStats = () => {
  Object.keys(uploadStats).forEach(key => {
    if (key !== 'lastReset') {
      uploadStats[key] = 0;
    }
  });
  uploadStats.lastReset = Date.now();
  
  console.log('[MULTER] 📊 Estadísticas de upload reseteadas');
};

// 🧪 **UTILIDADES DE TESTING**

// Crear archivo de prueba en memoria
const createTestFile = (filename = 'test.xlsx', size = 1024) => {
  const buffer = Buffer.alloc(size);
  buffer.fill('test data');
  
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: buffer,
    size: buffer.length
  };
};

// 📤 **EXPORTACIONES**
module.exports = {
  // Configuraciones principales
  excelUpload,
  imageUpload,
  createCustomUploadConfig,
  
  // Middleware
  uploadLoggingMiddleware,
  postUploadMiddleware,
  
  // Filtros
  excelFileFilter,
  imageFileFilter,
  
  // Configuraciones
  excelUploadConfig,
  imageUploadConfig,
  excelLimits,
  imageLimits,
  
  // Utilidades
  cleanupTempFiles,
  validateUploadConfig,
  
  // Estadísticas
  getUploadStats,
  resetUploadStats,
  incrementUploadStats,
  
  // Testing
  createTestFile,
  
  // Constantes
  memoryStorage,
  diskStorage
};