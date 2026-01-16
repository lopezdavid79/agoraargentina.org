const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Guarda las imágenes en public/images/noticias
        cb(null, path.resolve(__dirname, '../public/images/noticias')); 
    },
    filename: (req, file, cb) => {
        // Renombra el archivo para evitar conflictos (ej: noticia-1678886400000.jpg)
        const uniqueSuffix = Date.now() + '-' + path.extname(file.originalname);
        cb(null, 'noticia-' + uniqueSuffix); 
    }
});

const uploadFile = multer({ storage });

module.exports = uploadFile;