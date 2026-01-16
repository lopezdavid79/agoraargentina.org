const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../data/user.json');

const User = {
    // Obtener todos los usuarios (para búsquedas internas)
    findAll: () => {
        const fileContent = fs.readFileSync(usersFilePath, 'utf-8');
        return JSON.parse(fileContent);
    },

    // Buscar usuario por nombre de usuario (username)
    findByUsername: (username) => {
        const users = User.findAll();
        // Buscar el usuario que coincida con el nombre de usuario
        return users.find(user => user.username === username);
    }

    // Nota: Para CRUD completo (registros), se añadirían save, update, delete.
};

module.exports = User;