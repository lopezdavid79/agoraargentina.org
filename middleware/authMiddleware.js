function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

function isAdmin(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
}

function soloAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.rol === 'admin') return next();
    res.status(403).send('Acceso denegado.');
}

module.exports = { requireLogin, isAdmin, soloAdmin };