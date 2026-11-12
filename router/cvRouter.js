const express   = require('express');
const router    = express.Router();
const cvController = require('../controller/cvController');

// Formulario del CV (público)
router.get('/cv', cvController.show);

// Ayuda / instrucciones para completar el formulario
router.get('/cv/ayuda', cvController.ayuda);

// Generar y descargar PDF
router.post('/cv/generar', cvController.generar);

// Generar vista previa (devuelve PDF inline para mostrar en navegador)
router.post('/cv/preview', cvController.preview);

module.exports = router;
