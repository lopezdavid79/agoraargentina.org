const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');

function isAdmin(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
}

// Login
router.get('/login', authController.showLogin);
router.post('/login', authController.login);

// Logout
router.get('/logout', authController.logout);

// Perfil
router.get('/admin/perfil', isAdmin, authController.showPerfil);
router.put('/admin/perfil', isAdmin, authController.updatePerfil);

module.exports = router;
