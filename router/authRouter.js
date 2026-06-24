const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controller/authController');

// Rate limiter para login: máx 5 intentos cada 15 minutos por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render('admin/login', {
      title: 'Login | Admin',
      errores: 'Demasiados intentos. Esperá 15 minutos antes de reintentar.'
    });
  }
});

function isAdmin(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
}

// Login
router.get('/login', authController.showLogin);
router.post('/login', loginLimiter, authController.login);

// Logout
router.get('/logout', authController.logout);

// Perfil
router.get('/admin/perfil', isAdmin, authController.showPerfil);
// Nota: la ruta PUT /admin/perfil la maneja usuariosController en adminRouter.js
// para centralizar la lógica de edición de usuarios. Evitamos definirla aquí
// para no crear rutas duplicadas que interfieran entre controladores.

module.exports = router;
