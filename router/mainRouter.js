const router = require("express").Router();
const rateLimit = require('express-rate-limit');

// Importación de Controladores
const mainController = require("../controller/mainController");
// Importación de Middlewares
const authMiddleware = require("../middleware/authMiddleware");

// Rate limiter para contacto: máx 10 envíos cada 15 minutos por IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render('contacto', {
      title: 'Contacto | Ágora Argentina',
      successMsg: null,
      errorMsg: 'Demasiados mensajes enviados. Esperá 15 minutos antes de reintentar.'
    });
  }
});

// =========================================================
// 1. RUTAS PÚBLICAS (Accesibles por cualquier visitante)
// =========================================================
router.get('/', mainController.home);
router.get('/quienes-somos', mainController.quienesSomos);
router.get('/servicios', mainController.servicios);
router.get('/contacto', mainController.contacto);
router.post('/contacto', contactLimiter, mainController.processContacto);
router.get('/preguntas-frecuentes', mainController.preguntasFrecuentes);

// Capacitaciones y cursos
router.get('/cursos', mainController.cursos); 
router.get('/cursos/:slug', mainController.cursoDetail); 

router.get('/capacitaciones', mainController.capacitacionesViews);
router.get('/capacitaciones/:slug', mainController.detailCapacitaciones);

// Noticias (Vista pública)
router.get('/noticias', mainController.noticias); 
router.get('/noticias/:slug', mainController.noticiaDetail);


module.exports = router;