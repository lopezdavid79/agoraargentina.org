const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');

// Middleware para verificar sesión
function isAdmin(req, res, next) {
    if (req.session && req.session.user) { // Verifica la sesión corregida en app.js
        return next();
    }
    res.redirect('/login');
}

router.get('/admin/dashboard', isAdmin, adminController.index);
router.get('/admin/noticias/nuevo', isAdmin, adminController.create);
router.post('/admin/noticias/nuevo', isAdmin, adminController.store);
router.get('/admin/noticias/editar/:id', isAdmin, adminController.edit);
router.put('/admin/noticias/editar/:id', isAdmin, adminController.update);
router.delete('/admin/noticias/eliminar/:id', isAdmin, adminController.delete);
// rutas cursos
router.get('/admin/cursos/nuevo', isAdmin, adminController.createCurso);
router.post('/admin/cursos/nuevo', isAdmin, adminController.storeCurso);
router.get('/admin/cursos/editar/:id', isAdmin, adminController.editCurso);
router.put('/admin/cursos/editar/:id', isAdmin, adminController.updateCurso);
// Gestión principal de la capacitación
router.get('/admin/capacitaciones/nuevo', isAdmin, adminController.createCapacitacion);
router.post('/admin/capacitaciones/nuevo', isAdmin, adminController.storeCapacitacion);
router.get('/admin/capacitaciones/editar/:id', isAdmin, adminController.editCapacitacion);
router.put('/admin/capacitaciones/editar/:id', isAdmin, adminController.updateCapacitacion);
router.delete('/admin/capacitaciones/eliminar/:id', isAdmin, adminController.deleteCapacitacion);


router.get('/admin/capacitaciones/:id/modulos', isAdmin, adminController.createModulos);
// Agregar un nuevo módulo a la capacitación
router.post('/admin/capacitaciones/:id/modulos/nuevo', isAdmin, adminController.storeModulo);

// editar un módulo específico (requiere ID de capacitación e ID del módulo)
router.get('/admin/capacitaciones/:idCap/modulos/editar/:idModulo', adminController.editModulo);
router.post('/admin/capacitaciones/:idCap/modulos/editar/:idModulo', adminController.updateModulo);

// Eliminar un módulo específico (requiere ID de capacitación e ID del módulo)
router.delete('/admin/capacitaciones/:idCap/modulos/eliminar/:idMod', isAdmin, adminController.deleteModulo);

module.exports = router;