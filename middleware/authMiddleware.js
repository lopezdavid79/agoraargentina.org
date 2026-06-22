const requireLogin = (req, res, next) => {
    // Verifica si la sesión existe y si la propiedad isLoggedIn es verdadera
    if (req.session && req.session.user) {
        // Si está logueado, permite el acceso a la siguiente función del controlador/ruta
        next(); 
    } else {
        // Si no está logueado, redirige al login
        res.redirect('/login');
    }
};

module.exports = requireLogin;