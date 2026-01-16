const router = require("express").Router();

// Importación de Controladores
const mainController = require("../controller/mainController");
const newsController = require("../controller/newsController");

// Importación de Middlewares
const authMiddleware = require("../middleware/authMiddleware");
const uploadNews = require("../middleware/multerNews");

// =========================================================
// 1. RUTAS PÚBLICAS (Accesibles por cualquier visitante)
// =========================================================
router.get('/', mainController.home);
router.get('/quienes-somos', mainController.quienesSomos);
router.get('/servicios', mainController.servicios);
router.get('/contacto', mainController.contacto);

// Capacitaciones
router.get('/capacitaciones', mainController.capacitaciones); 
router.get('/cursos/:slug', mainController.cursoDetail); 

// Noticias (Vista pública)
router.get('/noticias', mainController.noticias); 
// Crear noticia
// Nota: 'image' debe coincidir con el name del input file en tu formulario EJS
router.get('/noticias/create',  newsController.create);

router.get('/noticias/:slug', mainController.noticiaDetail);


// =========================================================
// 2. RUTAS ADMINISTRATIVAS DE NOTICIAS (Requieren Login)
// =========================================================

// Listado administrativo (donde ves la tabla para editar o borrar)
router.get('/admin/noticias', authMiddleware, newsController.adminList);

router.post('/noticias/create', authMiddleware, uploadNews.single('image'), newsController.store);

// Editar noticia
router.get('/noticias/edit/:id', authMiddleware, newsController.edit);
router.put('/noticias/edit/:id', authMiddleware, uploadNews.single('image'), newsController.update);

// Eliminar noticia
router.delete('/noticias/delete/:id', authMiddleware, newsController.destroy);


module.exports = router;