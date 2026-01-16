const fs = require('fs');
const path = require('path');
const newsFilePath = path.join(__dirname, '../data/noticias.json');

// Función auxiliar para leer el archivo JSON
function getNews() {
    const jsonContent = fs.readFileSync(newsFilePath, 'utf-8');
    return JSON.parse(jsonContent);
}

// Función auxiliar para guardar en el archivo JSON
function saveNews(newsArray) {
    const content = JSON.stringify(newsArray, null, 4);
    fs.writeFileSync(newsFilePath, content, 'utf-8');
}

const newsController = {
    // 1. Listado para administración (tabla con botones de editar/borrar)
    adminList: (req, res) => {
        const noticias = getNews();
        res.render('noticias/adminList', { noticias }); // Necesitarás crear esta vista
    },

    // 2. Formulario de creación
    create: (req, res) => {
        res.render('noticias/create');
    },

    // 3. Guardado de nueva noticia
    store: (req, res) => {
        const noticias = getNews();
        const newId = noticias.length > 0 ? noticias[noticias.length - 1].id + 1 : 1;
        
        const nuevaNoticia = {
            id: newId,
            title: req.body.title,
            content: req.body.content,
            date: req.body.date,
            image: req.file ? req.file.filename : 'default.jpg',
            slug: req.body.title.toLowerCase().replace(/ /g, '-') // Genera slug básico
        };

        noticias.push(nuevaNoticia);
        saveNews(noticias);
        res.redirect('/noticias');
    },

    // 4. Formulario de edición
    edit: (req, res) => {
        const noticias = getNews();
        const noticia = noticias.find(n => n.id == req.params.id);
        res.render('noticias/edit', { noticia });
    },

    // 5. Actualización
    update: (req, res) => {
        let noticias = getNews();
        const index = noticias.findIndex(n => n.id == req.params.id);
        
        if (index !== -1) {
            noticias[index] = {
                ...noticias[index],
                title: req.body.title,
                content: req.body.content,
                date: req.body.date,
                image: req.file ? req.file.filename : noticias[index].image
            };
            saveNews(noticias);
        }
        res.redirect('/noticias');
    },

    // 6. Eliminación
    destroy: (req, res) => {
        let noticias = getNews();
        const noticiaABorrar = noticias.find(n => n.id == req.params.id);
        
        // Opcional: Borrar el archivo de imagen físicamente
        if (noticiaABorrar && noticiaABorrar.image !== 'default.jpg') {
            const imagePath = path.join(__dirname, '../public/images/news/', noticiaABorrar.image);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        noticias = noticias.filter(n => n.id != req.params.id);
        saveNews(noticias);
        res.redirect('/noticias');
    }
};

module.exports = newsController;