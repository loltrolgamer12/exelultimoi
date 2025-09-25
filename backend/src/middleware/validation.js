// 🔧 MIDDLEWARE DE VALIDACIÓN V2.0
// src/middleware/validation.js

const { body, query, param, validationResult } = require('express-validator');
const multer = require('multer');

// 📁 **VALIDACIONES DE ARCHIVOS EXCEL**

// Validar archivo Excel
const validateExcelFile = (req, res, next) => {
  console.log('[VALIDATION] 📁 Validando archivo Excel...');
  
  // Verificar que el archivo existe
  if (!req.file) {
    console.log('[VALIDATION] ❌ No se encontró archivo en la request');
    return res.status(400).json({
      success: false,
      error: 'ARCHIVO_REQUERIDO',
      message: 'Debe seleccionar un archivo Excel para cargar',
      details: 'Campo "file" requerido en FormData'
    });
  }
  
  const file = req.file;
  console.log(`[VALIDATION] 📊 Archivo recibido: ${file.originalname} (${file.size} bytes)`);
  
  // Validar extensión
  const allowedExtensions = /\.(xlsx|xls)$/i;
  if (!allowedExtensions.test(file.originalname)) {
    console.log(`[VALIDATION] ❌ Extensión inválida: ${file.originalname}`);
    return res.status(400).json({
      success: false,
      error: 'EXTENSION_INVALIDA',
      message: 'Solo se permiten archivos Excel (.xlsx, .xls)',
      allowedExtensions: ['.xlsx', '.xls'],
      receivedFile: file.originalname
    });
  }
  
  // Validar tamaño máximo
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default
  if (file.size > maxSize) {
    const sizeMB = Math.round(file.size / 1024 / 1024);
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    
    console.log(`[VALIDATION] ❌ Archivo muy grande: ${sizeMB}MB > ${maxSizeMB}MB`);
    return res.status(413).json({
      success: false,
      error: 'ARCHIVO_MUY_GRANDE',
      message: `El archivo es demasiado grande. Máximo permitido: ${maxSizeMB}MB`,
      fileSize: `${sizeMB}MB`,
      maxAllowed: `${maxSizeMB}MB`
    });
  }
  
  // Validar que el archivo no esté vacío
  if (file.size === 0) {
    console.log('[VALIDATION] ❌ Archivo vacío detectado');
    return res.status(400).json({
      success: false,
      error: 'ARCHIVO_VACIO',
      message: 'El archivo está vacío o corrupto'
    });
  }
  
  // Validar tipos MIME permitidos
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream' // Fallback para algunos navegadores
  ];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    console.log(`[VALIDATION] ⚠️ MIME type no reconocido: ${file.mimetype}, pero extensión válida - continuando`);
    // No fallar aquí, algunos navegadores envían MIME types incorrectos
  }
  
  console.log(`[VALIDATION] ✅ Archivo Excel válido: ${file.originalname}`);
  next();
};

// 📋 **VALIDACIONES DE PARÁMETROS DE BÚSQUEDA**

const validateSearchParams = [
  // Validar query de texto (opcional)
  query('q')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('La consulta de búsqueda debe tener entre 2 y 100 caracteres')
    .trim()
    .escape(),
  
  // Validar fechas (opcional)
  query('fechaInicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio debe estar en formato YYYY-MM-DD')
    .toDate(),
  
  query('fechaFin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin debe estar en formato YYYY-MM-DD')
    .toDate(),
  
  // Validar paginación
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Página debe ser un número entero entre 1 y 1000')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entero entre 1 y 100')
    .toInt(),
  
  // Validar año
  query('ano')
    .optional()
    .isInt({ min: 2020, max: new Date().getFullYear() + 1 })
    .withMessage(`Año debe estar entre 2020 y ${new Date().getFullYear() + 1}`)
    .toInt(),
  
  // Validar mes
  query('mes')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Mes debe estar entre 1 y 12')
    .toInt(),
  
  // Validar campo de ordenamiento
  query('sortBy')
    .optional()
    .isIn(['fecha', 'conductor_nombre', 'placa_vehiculo', 'estado_inspeccion', 'nivel_riesgo', 'puntaje_total'])
    .withMessage('Campo de ordenamiento no válido'),
  
  // Validar dirección de ordenamiento
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Orden debe ser "asc" o "desc"'),
  
  // Validar estado de inspección
  query('estado')
    .optional()
    .isIn(['PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_REVISION', 'ALERTA_ROJA', 'ADVERTENCIA'])
    .withMessage('Estado de inspección no válido'),
  
  // Validar nivel de riesgo
  query('nivelRiesgo')
    .optional()
    .isIn(['BAJO', 'MEDIO', 'ALTO', 'CRITICO'])
    .withMessage('Nivel de riesgo no válido'),
  
  // Validar alertas booleanas
  query('alertaRoja')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('alertaRoja debe ser "true" o "false"'),
  
  query('advertencia')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('advertencia debe ser "true" o "false"'),
  
  // Middleware para procesar errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      console.log('[VALIDATION] ❌ Errores de validación en búsqueda:', errors.array());
      
      return res.status(400).json({
        success: false,
        error: 'PARAMETROS_BUSQUEDA_INVALIDOS',
        message: 'Parámetros de búsqueda inválidos',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        })),
        validParameters: {
          q: 'Texto de búsqueda (2-100 caracteres)',
          fechaInicio: 'Fecha inicio (YYYY-MM-DD)',
          fechaFin: 'Fecha fin (YYYY-MM-DD)',
          page: 'Página (1-1000)',
          limit: 'Límite por página (1-100)',
          ano: `Año (2020-${new Date().getFullYear() + 1})`,
          mes: 'Mes (1-12)',
          sortBy: 'Campo ordenamiento',
          sortOrder: 'Dirección (asc/desc)',
          estado: 'Estado inspección',
          nivelRiesgo: 'Nivel de riesgo',
          alertaRoja: 'Filtro alerta roja (true/false)',
          advertencia: 'Filtro advertencia (true/false)'
        }
      });
    }
    
    // Validación adicional: rango de fechas coherente
    if (req.query.fechaInicio && req.query.fechaFin) {
      const inicio = new Date(req.query.fechaInicio);
      const fin = new Date(req.query.fechaFin);
      
      if (fin < inicio) {
        return res.status(400).json({
          success: false,
          error: 'RANGO_FECHAS_INVALIDO',
          message: 'La fecha de fin debe ser posterior a la fecha de inicio',
          fechaInicio: req.query.fechaInicio,
          fechaFin: req.query.fechaFin
        });
      }
      
      // Validar que el rango no sea muy amplio (máximo 2 años)
      const diffTime = Math.abs(fin - inicio);
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
      
      if (diffYears > 2) {
        return res.status(400).json({
          success: false,
          error: 'RANGO_FECHAS_MUY_AMPLIO',
          message: 'El rango de fechas no puede ser mayor a 2 años',
          rangoEnAnios: Math.round(diffYears * 100) / 100
        });
      }
    }
    
    console.log('[VALIDATION] ✅ Parámetros de búsqueda validados correctamente');
    next();
  }
];

// 📊 **VALIDACIONES DE DASHBOARD**

const validateDashboardParams = [
  query('ano')
    .optional()
    .isInt({ min: 2020, max: new Date().getFullYear() + 1 })
    .withMessage(`Año debe estar entre 2020 y ${new Date().getFullYear() + 1}`)
    .toInt(),
  
  query('mes')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Mes debe estar entre 1 y 12')
    .toInt(),
  
  query('contrato')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contrato debe tener entre 2 y 100 caracteres')
    .trim(),
  
  query('campo')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Campo debe tener entre 2 y 100 caracteres')
    .trim(),
  
  query('periodo')
    .optional()
    .isIn(['7days', '30days', '3months', '6months', '1year'])
    .withMessage('Período debe ser uno de: 7days, 30days, 3months, 6months, 1year'),
  
  query('refreshCache')
    .optional()
    .isBoolean()
    .withMessage('refreshCache debe ser true o false')
    .toBoolean(),
  
  // Middleware para procesar errores
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      console.log('[VALIDATION] ❌ Errores de validación en dashboard:', errors.array());
      
      return res.status(400).json({
        success: false,
        error: 'PARAMETROS_DASHBOARD_INVALIDOS',
        message: 'Parámetros del dashboard inválidos',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    
    console.log('[VALIDATION] ✅ Parámetros del dashboard validados correctamente');
    next();
  }
];

// 🚗 **VALIDACIONES DE PARÁMETROS DE VEHÍCULO/CONDUCTOR**

const validateDriverId = [
  param('driverId')
    .isLength({ min: 3, max: 50 })
    .withMessage('ID del conductor debe tener entre 3 y 50 caracteres')
    .trim()
    .escape(),
  
  query('includeVehicles')
    .optional()
    .isBoolean()
    .withMessage('includeVehicles debe ser true o false')
    .toBoolean(),
  
  query('timeframe')
    .optional()
    .isIn(['1week', '1month', '3months', '6months', '1year', 'all'])
    .withMessage('timeframe debe ser uno de: 1week, 1month, 3months, 6months, 1year, all'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'PARAMETROS_CONDUCTOR_INVALIDOS',
        message: 'Parámetros de consulta del conductor inválidos',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    
    next();
  }
];

const validateVehicleId = [
  param('placa')
    .isLength({ min: 3, max: 20 })
    .withMessage('Placa del vehículo debe tener entre 3 y 20 caracteres')
    .trim()
    .toUpperCase(),
  
  query('includeConductors')
    .optional()
    .isBoolean()
    .withMessage('includeConductors debe ser true o false')
    .toBoolean(),
  
  query('includePatterns')
    .optional()
    .isBoolean()
    .withMessage('includePatterns debe ser true o false')
    .toBoolean(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'PARAMETROS_VEHICULO_INVALIDOS',
        message: 'Parámetros de consulta del vehículo inválidos',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    
    next();
  }
];

// 📤 **VALIDACIONES DE REPORTES PDF**

const validatePDFReportParams = [
  query('fecha')
    .optional()
    .isISO8601()
    .withMessage('Fecha debe estar en formato YYYY-MM-DD')
    .toDate(),
  
  query('includeCharts')
    .optional()
    .isBoolean()
    .withMessage('includeCharts debe ser true o false')
    .toBoolean(),
  
  query('template')
    .optional()
    .isIn(['standard', 'executive', 'fatigue', 'custom'])
    .withMessage('template debe ser uno de: standard, executive, fatigue, custom'),
  
  query('periodo')
    .optional()
    .isIn(['1week', '1month', '3months', '6months', '1year'])
    .withMessage('periodo debe ser uno de: 1week, 1month, 3months, 6months, 1year'),
  
  query('includeComparisons')
    .optional()
    .isBoolean()
    .withMessage('includeComparisons debe ser true o false')
    .toBoolean(),
  
  query('includeProjections')
    .optional()
    .isBoolean()
    .withMessage('includeProjections debe ser true o false')
    .toBoolean(),
  
  query('logo')
    .optional()
    .isBoolean()
    .withMessage('logo debe ser true o false')
    .toBoolean(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      console.log('[VALIDATION] ❌ Errores de validación en PDF:', errors.array());
      
      return res.status(400).json({
        success: false,
        error: 'PARAMETROS_PDF_INVALIDOS',
        message: 'Parámetros para generación de PDF inválidos',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    
    console.log('[VALIDATION] ✅ Parámetros PDF validados correctamente');
    next();
  }
];

// 📋 **VALIDACIONES DE REPORTES PERSONALIZADOS**

const validateCustomReportBody = [
  body('titulo')
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage('Título debe tener entre 5 y 100 caracteres')
    .trim(),
  
  body('secciones')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos una sección')
    .custom((value) => {
      const validSections = ['stats', 'alerts', 'trends', 'fatigue', 'drivers', 'vehicles'];
      const invalidSections = value.filter(section => !validSections.includes(section));
      
      if (invalidSections.length > 0) {
        throw new Error(`Secciones inválidas: ${invalidSections.join(', ')}. Válidas: ${validSections.join(', ')}`);
      }
      
      return true;
    }),
  
  body('formato')
    .optional()
    .isIn(['standard', 'compact', 'detailed'])
    .withMessage('formato debe ser uno de: standard, compact, detailed'),
  
  body('includeCharts')
    .optional()
    .isBoolean()
    .withMessage('includeCharts debe ser true o false'),
  
  body('includeData')
    .optional()
    .isBoolean()
    .withMessage('includeData debe ser true o false'),
  
  body('filtros')
    .optional()
    .isObject()
    .withMessage('filtros debe ser un objeto'),
  
  body('filtros.fechaInicio')
    .optional()
    .isISO8601()
    .withMessage('filtros.fechaInicio debe estar en formato YYYY-MM-DD'),
  
  body('filtros.fechaFin')
    .optional()
    .isISO8601()
    .withMessage('filtros.fechaFin debe estar en formato YYYY-MM-DD'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      console.log('[VALIDATION] ❌ Errores de validación en reporte personalizado:', errors.array());
      
      return res.status(400).json({
        success: false,
        error: 'REPORTE_PERSONALIZADO_INVALIDO',
        message: 'Datos del reporte personalizado inválidos',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        })),
        validSections: ['stats', 'alerts', 'trends', 'fatigue', 'drivers', 'vehicles'],
        validFormats: ['standard', 'compact', 'detailed']
      });
    }
    
    // Validar rango de fechas si ambas están presentes
    if (req.body.filtros && req.body.filtros.fechaInicio && req.body.filtros.fechaFin) {
      const inicio = new Date(req.body.filtros.fechaInicio);
      const fin = new Date(req.body.filtros.fechaFin);
      
      if (fin < inicio) {
        return res.status(400).json({
          success: false,
          error: 'RANGO_FECHAS_INVALIDO',
          message: 'La fecha de fin debe ser posterior a la fecha de inicio en los filtros'
        });
      }
    }
    
    console.log('[VALIDATION] ✅ Reporte personalizado validado correctamente');
    next();
  }
];

// 🔧 **MANEJO DE ERRORES DE MULTER**

const handleMulterError = (error, req, res, next) => {
  console.log('[VALIDATION] 🔧 Procesando posible error de Multer...');
  
  if (error instanceof multer.MulterError) {
    console.error('[VALIDATION] ❌ Error de Multer:', error);
    
    let message = 'Error procesando el archivo';
    let code = 'MULTER_ERROR';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        const maxSizeMB = Math.round((parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024) / 1024 / 1024);
        message = `Archivo demasiado grande. Máximo permitido: ${maxSizeMB}MB`;
        code = 'ARCHIVO_MUY_GRANDE';
        break;
        
      case 'LIMIT_FILE_COUNT':
        message = 'Solo se permite cargar un archivo a la vez';
        code = 'DEMASIADOS_ARCHIVOS';
        break;
        
      case 'LIMIT_FIELD_KEY':
        message = 'Nombre del campo demasiado largo';
        code = 'CAMPO_INVALIDO';
        break;
        
      case 'LIMIT_FIELD_VALUE':
        message = 'Valor del campo demasiado largo';
        code = 'VALOR_CAMPO_LARGO';
        break;
        
      case 'LIMIT_FIELD_COUNT':
        message = 'Demasiados campos en el formulario';
        code = 'DEMASIADOS_CAMPOS';
        break;
        
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Campo de archivo inesperado';
        code = 'CAMPO_ARCHIVO_INESPERADO';
        break;
        
      case 'MISSING_FIELD_NAME':
        message = 'Falta el nombre del campo';
        code = 'NOMBRE_CAMPO_FALTANTE';
        break;
        
      default:
        message = `Error de Multer: ${error.message}`;
        code = 'MULTER_ERROR_GENERICO';
    }
    
    return res.status(400).json({
      success: false,
      error: code,
      message,
      multerCode: error.code,
      field: error.field || 'file',
      maxFileSize: process.env.MAX_FILE_SIZE ? 
        `${Math.round(parseInt(process.env.MAX_FILE_SIZE) / 1024 / 1024)}MB` : '50MB'
    });
  }
  
  // Si no es un error de Multer, pasar al siguiente middleware
  if (error) {
    console.error('[VALIDATION] ❌ Error no-Multer:', error);
    return res.status(500).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: 'Error procesando el archivo subido',
      details: error.message
    });
  }
  
  console.log('[VALIDATION] ✅ Sin errores de Multer detectados');
  next();
};

// 🧪 **VALIDACIONES DE TESTING**

const validateTestEndpoint = (req, res, next) => {
  // Middleware simple para endpoints de testing
  console.log(`[VALIDATION] 🧪 Test endpoint accedido: ${req.method} ${req.path}`);
  
  // En producción, podríamos querer deshabilitar endpoints de test
  if (process.env.NODE_ENV === 'production' && process.env.DISABLE_TEST_ENDPOINTS === 'true') {
    return res.status(404).json({
      success: false,
      error: 'ENDPOINT_NO_DISPONIBLE',
      message: 'Endpoints de testing deshabilitados en producción'
    });
  }
  
  next();
};

// 📊 **VALIDACIONES DE RANGO DE FECHAS REUTILIZABLE**

const validateDateRange = (startDateField = 'fechaInicio', endDateField = 'fechaFin') => {
  return (req, res, next) => {
    const startDate = req.query[startDateField] || req.body[startDateField];
    const endDate = req.query[endDateField] || req.body[endDateField];
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        return res.status(400).json({
          success: false,
          error: 'RANGO_FECHAS_INVALIDO',
          message: `La ${endDateField} debe ser posterior a la ${startDateField}`,
          [startDateField]: startDate,
          [endDateField]: endDate
        });
      }
      
      // Validar que el rango no sea excesivamente amplio (más de 5 años)
      const diffTime = Math.abs(end - start);
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365);
      
      if (diffYears > 5) {
        return res.status(400).json({
          success: false,
          error: 'RANGO_FECHAS_MUY_AMPLIO',
          message: 'El rango de fechas no puede ser mayor a 5 años',
          rangoEnAnios: Math.round(diffYears * 100) / 100
        });
      }
    }
    
    next();
  };
};

// 🔧 **UTILIDADES DE VALIDACIÓN**

// Sanitizar strings de entrada
const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, ''); // Remover event handlers
};

// Validar formato de placa colombiana
const validatePlacaColombia = (placa) => {
  const patrones = [
    /^[A-Z]{3}[0-9]{3}$/,     // ABC123
    /^[A-Z]{3}-[0-9]{3}$/,    // ABC-123
    /^[A-Z]{2}[0-9]{4}$/,     // AB1234
    /^[A-Z]{2}-[0-9]{4}$/     // AB-1234
  ];
  
  const placaLimpia = placa.replace(/\s+/g, '').toUpperCase();
  return patrones.some(patron => patron.test(placaLimpia));
};

// Validar formato de cédula colombiana básico
const validateCedulaColombia = (cedula) => {
  const cedulaLimpia = cedula.replace(/\D/g, '');
  return cedulaLimpia.length >= 6 && cedulaLimpia.length <= 12 && /^\d+$/.test(cedulaLimpia);
};

// 📤 **EXPORTAR TODAS LAS VALIDACIONES**

module.exports = {
  // Validaciones principales
  validateExcelFile,
  validateSearchParams,
  validateDashboardParams,
  validateDriverId,
  validateVehicleId,
  validatePDFReportParams,
  validateCustomReportBody,
  
  // Manejo de errores
  handleMulterError,
  
  // Validaciones de utilidad
  validateTestEndpoint,
  validateDateRange,
  
  // Utilidades
  sanitizeString,
  validatePlacaColombia,
  validateCedulaColombia
};