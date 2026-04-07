require('dotenv').config();

const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');

const morgan = require('morgan');
app.use(morgan('dev')); // Esto te dirá si la ruta es 200, 404 o 500
// 🔥 PRIMERO crear la app
const app = express();

// =========================================================
// 1. CONFIGURACIÓN DEL MOTOR DE VISTAS
// =========================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =========================================================
// 2. MIDDLEWARES GLOBALES (ORDEN IMPORTANTE)
// =========================================================

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Parseo de datos (🔥 clave para formularios)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Soporte PUT/DELETE
app.use(methodOverride('_method'));

// =========================================================
// 3. SESIONES
// =========================================================
app.use(session({
    secret: process.env.SESSION_SECRET || "Adm@gora$",
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // en producción con HTTPS → true
        maxAge: 1000 * 60 * 60 * 24 
    }
}));

// =========================================================
// 4. VARIABLES GLOBALES PARA LAS VISTAS
// =========================================================
app.use((req, res, next) => {
    res.locals.successMsg = null;
    res.locals.errorMsg = null;
    res.locals.isLogged = false;
    res.locals.user = null;

    if (req.session && req.session.user) {
        res.locals.isLogged = true;
        res.locals.user = req.session.user;
    }

    next();
});

// =========================================================
// 5. IMPORTAR ROUTERS
// =========================================================
const mainRouter = require('./router/mainRouter');
const authRouter = require('./router/authRouter');
const adminRouter = require('./router/adminRouter');

// =========================================================
// 6. USO DE RUTAS
// =========================================================
app.use('/', authRouter);
app.use('/', mainRouter);
app.use('/', adminRouter);

// =========================================================
// 7. MANEJO DE ERROR 404
// =========================================================
app.use((req, res) => {
    res.status(404).redirect('/');
});

// =========================================================
// 8. INICIO DEL SERVIDOR
// =========================================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});