const db = require('../config/firebase');
const bcrypt = require('bcryptjs');

const authController = {
    showLogin: (req, res) => {
        res.render('admin/login', { title: 'Login | Admin' });
    },

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

            const doc = snapshot.docs[0];
            const user = doc.data();
            const validPassword = await bcrypt.compare(password, user.password);

            if (validPassword) {
                // Guardamos también el uid (id del documento en Firestore)
                // Incluir name, mail y tel para que las vistas (p.ej. perfil.ejs)
                // puedan mostrar los campos del usuario inmediatamente después del login.
                req.session.user = {
                    uid: doc.id,
                    username: user.username,
                    rol: user.rol,
                    name: user.name || '',
                    mail: user.mail || '',
                    tel: user.tel || ''
                };
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

    logout: (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    },

    showPerfil: async (req, res) => {
        // Si la sesión existe pero no contiene los campos name/mail/tel,
        // los recuperamos desde Firestore para asegurar que la vista tenga los datos.
        try {
            if (req.session && req.session.user && (!req.session.user.name || !req.session.user.mail || !req.session.user.tel)) {
                const id = req.session.user.uid || req.session.user.id;
                if (id) {
                    const doc = await db.collection('usuarios').doc(id).get();
                    if (doc.exists) {
                        const u = doc.data();
                        req.session.user = {
                            ...req.session.user,
                            name: u.name || '',
                            mail: u.mail || '',
                            tel: u.tel || ''
                        };
                    }
                }
            }
        } catch (e) {
            console.error('[showPerfil] Error fetching user data:', e.message);
            // seguimos adelante y renderizamos con lo que haya en sesión
        }

        res.render('admin/perfil', { title: 'Mi Perfil | Admin', user: req.session.user });
    },

    updatePerfil: async (req, res) => {
        const { nuevoUsername, passwordActual, passwordNueva, passwordConfirmar } = req.body;
        const { uid, username } = req.session.user;

        const renderError = (msg) => res.status(400).render('admin/perfil', {
            title: 'Mi Perfil | Admin',
            user: req.session.user,
            errores: msg
        });

        try {
            const docRef = db.collection('usuarios').doc(uid);
            const doc = await docRef.get();
            if (!doc.exists) return renderError('No se encontró el usuario.');

            const userData = doc.data();
            const updates = {};

            if (nuevoUsername && nuevoUsername.trim() !== username) {
                const existe = await db.collection('usuarios').where('username', '==', nuevoUsername.trim()).limit(1).get();
                if (!existe.empty) return renderError('Ese nombre de usuario ya está en uso.');
                updates.username = nuevoUsername.trim();
            }

            if (passwordActual || passwordNueva || passwordConfirmar) {
                if (!passwordActual) return renderError('Ingresá tu contraseña actual.');
                if (!passwordNueva)  return renderError('Ingresá la nueva contraseña.');
                if (passwordNueva.length < 6) return renderError('Mínimo 6 caracteres.');
                if (passwordNueva !== passwordConfirmar) return renderError('Las contraseñas no coinciden.');
                const valida = await bcrypt.compare(passwordActual, userData.password);
                if (!valida) return renderError('La contraseña actual es incorrecta.');
                updates.password = await bcrypt.hash(passwordNueva, 10);
            }

            if (Object.keys(updates).length === 0) {
                return res.render('admin/perfil', { title: 'Mi Perfil | Admin', user: req.session.user, exito: 'Sin cambios.' });
            }

            await docRef.update(updates);
            if (updates.username) req.session.user.username = updates.username;

            res.render('admin/perfil', { title: 'Mi Perfil | Admin', user: req.session.user, exito: 'Datos actualizados.' });
        } catch (error) {
            renderError('Error en el servidor.');
        }
    }
};

module.exports = authController;
