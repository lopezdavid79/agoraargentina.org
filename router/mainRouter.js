const router = require("express").Router();

// Importación de Controladores
const mainController = require("../controller/mainController");
// Importación de Middlewares
const authMiddleware = require("../middleware/authMiddleware");

// =========================================================
// 1. RUTAS PÚBLICAS (Accesibles por cualquier visitante)
// =========================================================
router.get('/', mainController.home);
router.get('/quienes-somos', mainController.quienesSomos);
router.get('/servicios', mainController.servicios);
router.get('/contacto', mainController.contacto);
router.post('/contacto', mainController.processContacto);
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