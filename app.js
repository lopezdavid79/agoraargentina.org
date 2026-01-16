require('dotenv').config(); // Esto permite que las variables se carguen localmente y en la nube
const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');

// 1. IMPORTAR LOS ROUTERS
const mainRouter = require('./router/mainRouter');
const authRouter = require('./router/authRouter');
const adminRouter = require('./router/adminRouter');


const app = express();

// --- CONFIGURACIÓN DEL MOTOR DE VISTAS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES GLOBALES ---
app.use(express.static(path.join(__dirname, 'public'))); // Archivos estáticos (CSS, JS, Imágenes)
app.use(express.urlencoded({ extended: false }));       // Capturar datos de formularios
app.use(express.json());                                // Capturar datos JSON
app.use(methodOverride('_method'));                     // Soporte para PUT y DELETE (formularios)

// 2. CONFIGURACIÓN DE SESIONES (Debe ir ANTES de las rutas)
app.use(session({
    secret: "Adm@gora$", 
    resave: false,                      
    saveUninitialized: false,           
    cookie: { 
        secure: false,                  // Cambiar a true si usas HTTPS en el futuro
        maxAge: 1000 * 60 * 60 * 24     // La sesión dura 24 horas
    }
}));

// 3. MIDDLEWARE PARA PASAR DATOS DE SESIÓN A LAS VISTAS (Global)
app.use((req, res, next) => {
    // Definimos variables por defecto para que EJS no falle si no existen
    res.locals.isLogged = false;
    res.locals.user = null;

    // Si existe el usuario en la sesión, lo pasamos a res.locals
        if (req.session && req.session.user) { 
        res.locals.isLogged = true;
        res.locals.user = req.session.user;
    }
    
    next(); // Permite que la ejecución continúe hacia las rutas
});

// 4. USO DE LAS RUTAS
app.use('/', authRouter); // Rutas de /login y /logout
app.use('/', mainRouter); // Rutas de noticias, servicios, home, etc.
app.use('/', adminRouter); // Rutas de administrador

// --- GESTIÓN DE ERROR 404 (Siempre al final) ---
app.use((req, res, next) => {
        res.status(404).redirect('/'); 
});

// --- INICIO DEL SERVIDOR ---
// app.js
const PORT = process.env.PORT || 3000; // Render usará process.env.PORT automáticamente

app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});