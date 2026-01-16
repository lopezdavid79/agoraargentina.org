const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');

// Ruta para mostrar el formulario de login
router.get('/login', authController.showLogin);

// Ruta para procesar el formulario de login
router.post('/login', authController.login);

// Ruta para cerrar sesión
router.get('/logout', authController.logout);

module.exports = router;