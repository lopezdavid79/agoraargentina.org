const db = require('../config/firebase');
const bcrypt = require('bcryptjs');

const usuariosController = {

    // GET /admin/usuarios/nuevo  (no necesaria, se usa modal)
    // POST /admin/usuarios/nuevo
    store: async (req, res) => {
        const { username, password, rol } = req.body;

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
                username: username.trim(),
                password: hash,
                rol
            });

            res.redirect('/admin/dashboard?exito=' + encodeURIComponent('Usuario creado correctamente.') + '#usuarios');
        } catch (e) {
            redirigirConError('Error al crear el usuario.');
        }
    },

    // PUT /admin/usuarios/editar/:id
    update: async (req, res) => {
        const { id } = req.params;
        const { username, password, rol } = req.body;

        const redirigirConError = (msg) =>
            res.redirect(`/admin/dashboard?errores=${encodeURIComponent(msg)}#usuarios`);

        try {
            const docRef = db.collection('usuarios').doc(id);
            const doc = await docRef.get();
            if (!doc.exists) return redirigirConError('Usuario no encontrado.');

            const updates = { rol };

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
            redirigirConError('Error al actualizar el usuario.');
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
