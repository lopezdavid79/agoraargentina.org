require('dotenv').config();

const { validateEnv } = require('./config/validateEnv');
const logger = require('./config/logger');
const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');

const morgan = require('morgan');

// 🔥 PRIMERO crear la app
const app = express();

// =========================================================
// 1. CONFIGURACIÓN DEL MOTOR DE VISTAS

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// 2. MIDDLEWARES GLOBALES (ORDEN IMPORTANTE)


// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
// HTTP request logging to both console and file
const fs = require('fs');
const morganStream = fs.createWriteStream(path.join(__dirname, 'logs', 'access.log'), { flags: 'a' });
app.use(morgan('dev'));
app.use(morgan('combined', { stream: morganStream }));
// Parseo de datos (🔥 clave para formularios)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Soporte PUT/DELETE
app.use(methodOverride('_method'));

// =========================================================
// 3. SESIONES
// =========================================================
app.use(session({
    secret: process.env.SESSION_SECRET,
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


// 5. HEALTH ENDPOINT (before routers — no auth, no middleware chain)
app.get('/health', (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), env: process.env.NODE_ENV || "development" });
});

// =========================================================
// 6. IMPORTAR ROUTERS

const mainRouter = require('./router/mainRouter');
const authRouter = require('./router/authRouter');
const adminRouter = require('./router/adminRouter');
const informesRouter = require('./router/informesRouter');
const cvRouter = require('./router/cvRouter');
// =========================================================
// 7. USO DE RUTAS
// =========================================================
app.use('/', authRouter);
app.use('/', mainRouter);
app.use('/', adminRouter);
app.use('/', informesRouter);
app.use('/', cvRouter);
// =========================================================
// 8. MANEJO DE ERROR 404
// =========================================================
app.use((req, res) => {
    res.status(404).render('error', { status: 404, message: 'Página no encontrada' });
});

// =========================================================
// 9. ERROR MIDDLEWARE (4-arg handler)
// =========================================================
app.use((err, req, res, next) => {
    logger.error(err.stack || err.message || err);
    const status = err.status || 500;
    const message = (process.env.NODE_ENV === 'production')
        ? 'Error interno del servidor'
        : err.message || 'Error interno del servidor';
    res.status(status).render('error', { status, message });
});

// =========================================================
// 10. VALIDAR ENTORNO E INICIAR SERVIDOR
// =========================================================
const PORT = process.env.PORT || 3000;

if (require.main === module) {
    validateEnv();

    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Server listening on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    });
}

module.exports = app;