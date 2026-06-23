require('dotenv').config();

const { validateEnv } = require('./config/validateEnv');

// Run environment validation early when the app is started directly.
// This prevents creating middleware (like express-session) that would
// crash later with an unclear 500 if required env vars are missing.
if (require.main === module) {
    validateEnv();
}
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
app.use(morgan('dev')); // Esto te dirá si la ruta es 200, 404 o 500
// Parseo de datos (🔥 clave para formularios)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Soporte PUT/DELETE
app.use(methodOverride('_method'));

// =========================================================
// 3. HEALTH ENDPOINT (antes de session — responde aunque falle la sesión)
// =========================================================
app.get('/health', (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), env: process.env.NODE_ENV || "development" });
});

// =========================================================
// 4. SESIONES (antes: 3, desplazado por health endpoint)
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
// 5. VARIABLES GLOBALES PARA LAS VISTAS
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
// 6. IMPORTAR ROUTERS

const mainRouter = require('./router/mainRouter');
const authRouter = require('./router/authRouter');
const adminRouter = require('./router/adminRouter');
const informesRouter = require('./router/informesRouter');
const cvRouter = require('./router/cvRouter');
app.use('/', cvRouter);
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
    console.error('[error]', err.stack || err.message || err);
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
    // Startup diagnostics — log presence of critical env vars (not values)
    console.log(`[server] SESSION_SECRET is ${process.env.SESSION_SECRET ? 'SET' : 'MISSING'}`);
    console.log(`[server] NODE_ENV=${process.env.NODE_ENV || 'development'}`);

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[server] listening on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    });
}

module.exports = app;
