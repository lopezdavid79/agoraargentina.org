const fs = require('fs');
const path = require('path');

const noticiasFilePath = path.join(__dirname, '../data/noticias.json');

const News = {
    // 1. Obtener todas las noticias
    findAll: () => {
        const fileContent = fs.readFileSync(noticiasFilePath, 'utf-8');
        return JSON.parse(fileContent);
    },

    // 2. Guardar una nueva noticia
    save: (newNoticia) => {
        const noticias = News.findAll();
        
        // Asignar un ID (usar el ID más alto + 1)
        const lastId = noticias.length > 0 ? Math.max(...noticias.map(n => n.id)) : 0;
        newNoticia.id = lastId + 1;
        
        noticias.push(newNoticia);
        
        // Sobreescribir el archivo JSON
        fs.writeFileSync(noticiasFilePath, JSON.stringify(noticias, null, 4));
    }

    // Nota: Aquí irían las funciones findById, update y delete.
};

module.exports = News;