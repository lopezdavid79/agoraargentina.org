const db = require('../config/firebase');
const bcrypt = require('bcryptjs');

const authController = {
    // 1. Mostrar el formulario (GET /login)
    showLogin: (req, res) => {
        res.render('admin/login', { title: "Login | Admin" });
    },

    // 2. Procesar el ingreso (POST /login)
    login: async (req, res) => {
        const { username, password } = req.body;
        try {
            const snapshot = await db.collection('usuarios')
                                     .where('username', '==', username)
                                     .limit(1)
                                     .get();

            if (snapshot.empty) {
                return res.status(401).render('admin/login', {
                    title: 'Login | Admin',
                    errores: 'Usuario o contraseña incorrectos.'
                });
            }

            const user = snapshot.docs[0].data();
            const validPassword = await bcrypt.compare(password, user.password);

            if (validPassword) {
                req.session.user = { username: user.username, rol: user.rol };
                res.redirect('/admin/dashboard');
            } else {
                res.status(401).render('admin/login', {
                    title: 'Login | Admin',
                    errores: 'Usuario o contraseña incorrectos.'
                });
            }
        } catch (error) {
            res.status(500).render('admin/login', {
                title: 'Login | Admin',
                errores: 'Error en el servidor. Intentá nuevamente.'
            });
        }
    },

    // 3. Cerrar sesión (GET /logout)
    logout: (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    }
};

module.exports = authController;
