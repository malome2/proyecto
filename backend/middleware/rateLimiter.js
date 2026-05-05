const rateLimit = require('express-rate-limit');

// 10 intentos / 15 min — login y registro (fuerza bruta)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' }
});

// 30 peticiones / 15 min — envío de recomendaciones y otras escrituras de usuario
const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Espera unos minutos.' }
});

// 200 peticiones / 15 min — límite global para toda la API
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones desde esta IP. Intenta de nuevo más tarde.' }
});

module.exports = { authLimiter, writeLimiter, globalLimiter };
