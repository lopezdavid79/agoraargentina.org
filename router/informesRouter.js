const express = require('express');
const router  = express.Router();
const informesController = require('../controller/informesController');

function isAdmin(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
}

// Listado
router.get('/admin/informes', isAdmin, informesController.index);

// Crear
router.get('/admin/informes/nuevo',  isAdmin, informesController.create);
router.post('/admin/informes/nuevo', isAdmin, informesController.store);

// Editar — acepta PUT (method-override) y POST directo como fallback
router.get('/admin/informes/editar/:id',  isAdmin, informesController.edit);
router.put('/admin/informes/editar/:id',  isAdmin, informesController.update);
router.post('/admin/informes/editar/:id', isAdmin, informesController.update); // fallback sin method-override

// Eliminar — acepta DELETE y POST como fallback
router.delete('/admin/informes/eliminar/:id', isAdmin, informesController.delete);
router.post('/admin/informes/eliminar/:id',   isAdmin, (req, res, next) => {
    // Solo procesa si viene con _method=DELETE
    if (req.body && req.body._method === 'DELETE') return informesController.delete(req, res, next);
    next();
});

// Descargar PDF
router.get('/admin/informes/:id/pdf', isAdmin, informesController.generarPDF);

module.exports = router;
