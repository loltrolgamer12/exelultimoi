// 🔧 MIDDLEWARE DE VALIDACIÓN V2.0 SIMPLIFICADO
// backend/src/middleware/validation.js

const multer = require('multer');

// 📁 **VALIDACIONES DE ARCHIVOS EXCEL SIMPLIFICADAS**

// Validar archivo Excel con verificaciones estrictas
const validateExcelFile = (req, res, next) => {
  console.log('[VALIDATION-MW] 📁 Validando archivo Excel...');
  
  // Verificar que el archivo existe
  if (!req.file) {
    console.log('[VALIDATION-MW] ❌ No se encontró archivo en la request');
    return res.status(400).json({
      success: false,
      error: 'ARCHIVO_REQUERIDO',
      message: 'Debe seleccionar un archivo Excel para cargar'
    });
  }
  
  const file = req.file;
  console.log(`[VALIDATION-MW] 📊 Archivo recibido: ${file.originalname} (${file.size} bytes)`);
  
  // ✅ VALIDACIÓN 1: Extensión del archivo
  const allowedExtensions = /\.(xlsx|xls)$/i;
  if (!allowedExtensions.test(file.originalname)) {
    console.log(`[VALIDATION-MW] ❌ Extensión inválida: ${file.originalname}`);
    return res.status(400).json({
      success: false,
      error: 'EXTENSION_INVALIDA',
      message: 'Solo se permiten archivos Excel (.xlsx, .xls)'
    });
  }
  
  // ✅ VALIDACIÓN 2: Tamaño del archivo
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default
  if (file.size > maxSize) {
    const sizeMB = Math.round(file.size / 1024 / 1024);
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    
    console.log(`[VALIDATION-MW] ❌ Archivo muy grande: ${sizeMB}MB > ${maxSizeMB}MB`);
    return res.status(413).json({
      success: false,
      error: 'ARCHIVO_MUY_GRANDE',
      message: `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`
    });
  }
  
  // ✅ VALIDACIÓN 3: Tamaño mínimo
  const minSize = 1024; // 1KB mínimo
  if (file.size < minSize) {
    console.log(`[VALIDATION-MW] ❌ Archivo muy pequeño: ${file.size} bytes`);
    return res.status(400).json({
      success: false,
      error: 'ARCHIVO_MUY_PEQUEÑO',
      message: 'El archivo parece estar vacío o dañado'
    });
  }
  
  console.log(`[VALIDATION-MW] ✅ Archivo Excel válido: ${file.originalname}`);
  next();
};

// 🔧 **MANEJO DE ERRORES DE MULTER**
const handleMulterError = (error, req, res, next) => {
  console.log('[VALIDATION-MW] 🔍 Verificando errores de Multer...');
  
  if (error instanceof multer.MulterError) {
    console.error('[VALIDATION-MW] ❌ Error de Multer:', error.code, error.message);
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          error: 'ARCHIVO_MUY_GRANDE_MULTER',
          message: 'El archivo excede el tamaño máximo permitido'
        });
        
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'DEMASIADOS_ARCHIVOS',
          message: 'Solo se permite subir un archivo a la vez'
        });
        
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'CAMPO_ARCHIVO_INESPERADO',
          message: 'Campo de archivo no esperado'
        });
        
      default:
        return res.status(400).json({
          success: false,
          error: 'ERROR_MULTER',
          message: `Error de Multer: ${error.message}`
        });
    }
  } else if (error) {
    // Error personalizado (ej. del fileFilter)
    console.error('[VALIDATION-MW] ❌ Error personalizado:', error.message);
    
    if (error.message.includes('Solo se permiten archivos Excel')) {
      return res.status(400).json({
        success: false,
        error: 'FORMATO_ARCHIVO_INVALIDO',
        message: error.message
      });
    }
    
    return res.status(400).json({
      success: false,
      error: 'ERROR_UPLOAD',
      message: error.message || 'Error procesando el archivo'
    });
  }
  
  // No hay error, continuar
  next();
};

// 📤 **EXPORTACIONES SIMPLIFICADAS**
module.exports = {
  validateExcelFile,
  handleMulterError
};