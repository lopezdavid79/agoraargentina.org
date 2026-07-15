const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const adminController = require('../controller/adminController');
const usuariosController = require('../controller/usuariosController');
const { isAdmin, soloAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { MulterError } = require('multer');

/**
 * Middleware wrapper that handles multer errors with proper HTTP status codes.
 * Multer errors from fileFilter or limits are caught here before reaching the controller.
 */
function uploadHandler(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).send('Archivo muy grande. Máximo 5MB.');
          }
          return res.status(400).send(err.message);
        }
        // Non-multer errors (e.g., from fileFilter)
        return res.status(400).send(err.message || 'Error al subir archivo');
      }
      next();
    });
  };
}

// Rate limiter para rutas admin: máx 30 POST/PUT/DELETE cada 15 minutos por IP
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
  handler: (req, res) => {
    res.status(429).render('error', {
      message: 'Demasiadas solicitudes. Esperá 15 minutos antes de reintentar.',
      error: {}
    });
  }
});

// Apply rate limiter to all admin routes (skips GET/HEAD/OPTIONS)
router.use(adminLimiter);

// Dashboard
router.get('/admin/dashboard', isAdmin, adminController.index);

// Noticias
router.get('/admin/noticias/nuevo', isAdmin, adminController.create);
router.post('/admin/noticias/nuevo', isAdmin, uploadHandler('imagenUrl'), adminController.store);
router.get('/admin/noticias/editar/:id', isAdmin, adminController.edit);
router.put('/admin/noticias/editar/:id', isAdmin, uploadHandler('imagenUrl'), adminController.update);
router.delete('/admin/noticias/eliminar/:id', isAdmin, adminController.delete);

// Cursos
router.get('/admin/cursos/nuevo', isAdmin, adminController.createCurso);
router.post('/admin/cursos/nuevo', isAdmin, uploadHandler('imagen'), adminController.storeCurso);
router.get('/admin/cursos/editar/:id', isAdmin, adminController.editCurso);
router.put('/admin/cursos/editar/:id', isAdmin, uploadHandler('imagen'), adminController.updateCurso);
router.delete('/admin/cursos/eliminar/:id', isAdmin, adminController.deleteCurso);

// Capacitaciones
router.get('/admin/capacitaciones/nuevo', isAdmin, adminController.createCapacitacion);
router.post('/admin/capacitaciones/nuevo', isAdmin, adminController.storeCapacitacion);
router.get('/admin/capacitaciones/editar/:id', isAdmin, adminController.editCapacitacion);
router.put('/admin/capacitaciones/editar/:id', isAdmin, adminController.updateCapacitacion);
router.delete('/admin/capacitaciones/eliminar/:id', isAdmin, adminController.deleteCapacitacion);
router.get('/admin/capacitaciones/:id/modulos', isAdmin, adminController.createModulos);
router.post('/admin/capacitaciones/:id/modulos/nuevo', isAdmin, adminController.storeModulo);
router.get('/admin/capacitaciones/:idCap/modulos/editar/:idModulo', isAdmin, adminController.editModulo);
router.post('/admin/capacitaciones/:idCap/modulos/editar/:idModulo', isAdmin, adminController.updateModulo);
router.delete('/admin/capacitaciones/:idCap/modulos/eliminar/:idMod', isAdmin, adminController.deleteModulo);

// Usuarios (solo admin)
router.post('/admin/usuarios/nuevo', soloAdmin, usuariosController.store);
router.put('/admin/usuarios/editar/:id', soloAdmin, usuariosController.update);
router.delete('/admin/usuarios/eliminar/:id', soloAdmin, usuariosController.delete);

// Perfil del usuario en sesión (GET lo maneja authRouter)
router.put('/admin/perfil',  isAdmin, usuariosController.updatePerfil);
router.post('/admin/perfil', isAdmin, usuariosController.updatePerfil); // fallback method-override


module.exports = router;
