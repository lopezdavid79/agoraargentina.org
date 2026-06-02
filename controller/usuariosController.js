const db = require('../config/firebase');
const bcrypt = require('bcryptjs');

const usuariosController = {

    // POST /admin/usuarios/nuevo
    store: async (req, res) => {
        const { name, mail, tel, username, password, rol } = req.body;

        const redirigirConError = (msg) =>
            res.redirect(`/admin/dashboard?errores=${encodeURIComponent(msg)}#usuarios`);

        if (!username || !password || !rol) return redirigirConError('Todos los campos son obligatorios.');
        if (password.length < 6) return redirigirConError('La contraseña debe tener al menos 6 caracteres.');
        if (!['admin', 'instructor'].includes(rol)) return redirigirConError('Rol inválido.');

        try {
            const existe = await db.collection('usuarios').where('username', '==', username.trim()).limit(1).get();
            if (!existe.empty) return redirigirConError('Ese nombre de usuario ya existe.');

            const hash = await bcrypt.hash(password, 10);
            await db.collection('usuarios').add({
                name:     name     || '',
                mail:     mail     || '',
                tel:      tel      || '',
                username: username.trim(),
                password: hash,
                rol
            });

            res.redirect('/admin/dashboard?exito=' + encodeURIComponent('Usuario creado correctamente.') + '#usuarios');
        } catch (e) {
            console.error('[store] Error:', e.message);
            redirigirConError('Error al crear el usuario.');
        }
    },

    // PUT /admin/usuarios/editar/:id  (desde panel admin)
    update: async (req, res) => {
        const { id } = req.params;
        const { name, mail, tel, username, password, rol } = req.body;

        const redirigirConError = (msg) =>
            res.redirect(`/admin/dashboard?errores=${encodeURIComponent(msg)}#usuarios`);

        try {
            const docRef = db.collection('usuarios').doc(id);
            const doc = await docRef.get();
            if (!doc.exists) return redirigirConError('Usuario no encontrado.');

            // Normalizamos/validamos rol para evitar enviar `undefined` a Firestore
            const allowedRoles = ['admin', 'instructor'];
            const finalRol = allowedRoles.includes(rol) ? rol : undefined;

            const updates = {
                name: name || '',
                mail: mail || '',
                tel:  tel  || ''
            };

            if (finalRol) updates.rol = finalRol;

            if (username && username.trim() !== doc.data().username) {
                const existe = await db.collection('usuarios').where('username', '==', username.trim()).limit(1).get();
                if (!existe.empty) return redirigirConError('Ese nombre de usuario ya está en uso.');
                updates.username = username.trim();
            }

            if (password) {
                if (password.length < 6) return redirigirConError('La contraseña debe tener al menos 6 caracteres.');
                updates.password = await bcrypt.hash(password, 10);
            }

            await docRef.update(updates);
            res.redirect('/admin/dashboard?exito=' + encodeURIComponent('Usuario actualizado.') + '#usuarios');
        } catch (e) {
            console.error('[update] Error:', e.message);
            redirigirConError('Error al actualizar el usuario.');
        }
    },

    // PUT /admin/perfil  — actualiza el perfil del usuario en sesión
    updatePerfil: async (req, res) => {
        const { nuevoName, nuevoMail, nuevoTel, nuevoUsername,
                passwordActual, passwordNueva, passwordConfirmar } = req.body;

        const redirigirConError = (msg) =>
            res.redirect(`/admin/perfil?errores=${encodeURIComponent(msg)}`);

        try {
            // Session may store uid (from authController) or id; support both
            const id = req.session.user.uid || req.session.user.id;
            const docRef = db.collection('usuarios').doc(id);
            const doc = await docRef.get();
            if (!doc.exists) return redirigirConError('Usuario no encontrado.');

            const updates = {
                name: nuevoName || '',
                mail: nuevoMail || '',
                tel:  nuevoTel  || ''
            };

            // Cambio de username
            if (nuevoUsername && nuevoUsername.trim() !== doc.data().username) {
                const existe = await db.collection('usuarios')
                    .where('username', '==', nuevoUsername.trim()).limit(1).get();
                if (!existe.empty) return redirigirConError('Ese nombre de usuario ya está en uso.');
                updates.username = nuevoUsername.trim();
            }

            // Cambio de contraseña
            if (passwordNueva) {
                if (!passwordActual) return redirigirConError('Ingresá tu contraseña actual para cambiarla.');
                if (passwordNueva.length < 6) return redirigirConError('La nueva contraseña debe tener al menos 6 caracteres.');
                if (passwordNueva !== passwordConfirmar) return redirigirConError('Las contraseñas no coinciden.');

                const valida = await bcrypt.compare(passwordActual, doc.data().password);
                if (!valida) return redirigirConError('La contraseña actual es incorrecta.');

                updates.password = await bcrypt.hash(passwordNueva, 10);
            }

            await docRef.update(updates);

            // Refrescar sesión con los nuevos datos
            req.session.user = {
                ...req.session.user,
                name:     updates.name,
                mail:     updates.mail,
                tel:      updates.tel,
                username: updates.username || req.session.user.username
            };

            // Al actualizar el perfil correctamente, redirigimos al dashboard
            // y mostramos la notificación de éxito allí.
            res.redirect('/admin/dashboard?exito=' + encodeURIComponent('Perfil actualizado correctamente.'));
        } catch (e) {
            console.error('[updatePerfil] Error:', e.message);
            redirigirConError('Error al actualizar el perfil.');
        }
    },

    // DELETE /admin/usuarios/eliminar/:id
    delete: async (req, res) => {
        const { id } = req.params;
        try {
            await db.collection('usuarios').doc(id).delete();
            res.redirect('/admin/dashboard?exito=' + encodeURIComponent('Usuario eliminado.') + '#usuarios');
        } catch (e) {
            res.redirect('/admin/dashboard?errores=' + encodeURIComponent('Error al eliminar el usuario.') + '#usuarios');
        }
    }
};

module.exports = usuariosController;
