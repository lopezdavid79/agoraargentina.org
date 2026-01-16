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
// rutas cursos
router.get('/admin/cursos/nuevo', isAdmin, adminController.createCurso);
router.post('/admin/cursos/nuevo', isAdmin, adminController.storeCurso);
router.get('/admin/cursos/editar/:id', isAdmin, adminController.editCurso);
router.put('/admin/cursos/editar/:id', isAdmin, adminController.updateCurso);
module.exports = router;