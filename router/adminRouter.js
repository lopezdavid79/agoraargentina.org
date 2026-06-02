const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const usuariosController = require('../controller/usuariosController');

function isAdmin(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
}

function soloAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.rol === 'admin') return next();
    res.status(403).send('Acceso denegado.');
}

// Dashboard
router.get('/admin/dashboard', isAdmin, adminController.index);

// Noticias
router.get('/admin/noticias/nuevo', isAdmin, adminController.create);
router.post('/admin/noticias/nuevo', isAdmin, adminController.store);
router.get('/admin/noticias/editar/:id', isAdmin, adminController.edit);
router.put('/admin/noticias/editar/:id', isAdmin, adminController.update);
router.delete('/admin/noticias/eliminar/:id', isAdmin, adminController.delete);

// Cursos
router.get('/admin/cursos/nuevo', isAdmin, adminController.createCurso);
router.post('/admin/cursos/nuevo', isAdmin, adminController.storeCurso);
router.get('/admin/cursos/editar/:id', isAdmin, adminController.editCurso);
router.put('/admin/cursos/editar/:id', isAdmin, adminController.updateCurso);

// Capacitaciones
router.get('/admin/capacitaciones/nuevo', isAdmin, adminController.createCapacitacion);
router.post('/admin/capacitaciones/nuevo', isAdmin, adminController.storeCapacitacion);
router.get('/admin/capacitaciones/editar/:id', isAdmin, adminController.editCapacitacion);
router.put('/admin/capacitaciones/editar/:id', isAdmin, adminController.updateCapacitacion);
router.delete('/admin/capacitaciones/eliminar/:id', isAdmin, adminController.deleteCapacitacion);
router.get('/admin/capacitaciones/:id/modulos', isAdmin, adminController.createModulos);
router.post('/admin/capacitaciones/:id/modulos/nuevo', isAdmin, adminController.storeModulo);
router.get('/admin/capacitaciones/:idCap/modulos/editar/:idModulo', adminController.editModulo);
router.post('/admin/capacitaciones/:idCap/modulos/editar/:idModulo', adminController.updateModulo);
router.delete('/admin/capacitaciones/:idCap/modulos/eliminar/:idMod', isAdmin, adminController.deleteModulo);

// Usuarios (solo admin)
router.post('/admin/usuarios/nuevo', soloAdmin, usuariosController.store);
router.put('/admin/usuarios/editar/:id', soloAdmin, usuariosController.update);
router.delete('/admin/usuarios/eliminar/:id', soloAdmin, usuariosController.delete);

// Perfil del usuario en sesión
router.get('/admin/perfil', isAdmin, (req, res) => {
    res.render('admin/perfil', {
        title: 'Mi Perfil',
        user: req.session.user,
        exito:   req.query.exito   || null,
        errores: req.query.errores || null
    });
});
router.put('/admin/perfil',  isAdmin, usuariosController.updatePerfil);
router.post('/admin/perfil', isAdmin, usuariosController.updatePerfil); // fallback method-override


module.exports = router;
