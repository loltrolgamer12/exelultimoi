// Rate limiting middleware eficiente usando express-rate-limit

const rateLimit = require('express-rate-limit');

// Configuración: 100 peticiones por IP cada 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite por IP
  standardHeaders: true, // Devuelve info de rate limit en headers
  legacyHeaders: false, // Desactiva X-RateLimit-* headers antiguos
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiadas solicitudes desde esta IP, intenta nuevamente más tarde.'
  }
});

module.exports = limiter;
