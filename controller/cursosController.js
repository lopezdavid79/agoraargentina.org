const path = require('path');
const fs = require('fs');

// Define el caracter BOM (Byte Order Mark) para limpieza de archivos de texto
const BOM = '\ufeff'; 

// =============================================================
// FUNCIÓN AUXILIAR: Carga segura de JSON con limpieza de BOM
// =============================================================
const loadJSON = (filePath) => {
    try {
        // Lee el archivo de forma síncrona
        const data = fs.readFileSync(filePath, 'utf-8');
        
        // Elimina el BOM si existe al inicio del archivo
        const cleanData = data.startsWith(BOM) ? data.slice(1) : data;
        
        return JSON.parse(cleanData);
    } catch (error) {
        // Muestra el error en consola si falla la carga y devuelve un array vacío
        console.error(`Error al cargar ${path.basename(filePath)}:`, error.message);
        return []; 
    }
};

// =============================================================
// CARGA DE DATOS AL INICIO DE LA APLICACIÓN
// =============================================================
const allCursos = loadJSON(path.join(__dirname, '../data/cursos.json'));
const allNoticias = loadJSON(path.join(__dirname, '../data/noticias.json'));

// Preparación de datos de noticias (Ordenar y limitar para Home)
const sortedNoticias = [...allNoticias].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
const homeNoticias = sortedNoticias.slice(0, 3);

// =============================================================
// FUNCIONES AUXILIARES DE BÚSQUEDA
// =============================================================
const getCursoBySlug = (slug) => allCursos.find(curso => curso.slug === slug);
const getNoticiaBySlug = (slug) => allNoticias.find(noticia => noticia.slug === slug);


const mainController = {
    // RUTAS ESTÁTICAS Y HOME
    home: (req,res) => {
        res.render('home',{
            title:"Programa Ágora | Inicio",
            noticias: homeNoticias // Pasa solo las 3 noticias más recientes
        });
    },    
    quienesSomos: (req,res) => {
        res.render('quienes-somos',{title:"Programa Ágora | Quiénes Somos"});
    },    
    servicios: (req,res) => {
        res.render('servicios',{title:"Programa Ágora | Servicios"});
    },
    contacto: (req,res) => {
        res.render('contacto',{title:"Programa Ágora | Contacto"});
    },
    
    // RUTAS DE CAPACITACIONES
    capacitaciones: (req,res) => {
        res.render('capacitaciones',{
            title:"Programa Ágora | Capacitaciones",
            cursos: allCursos // Pasa el listado completo para la vista de capacitaciones
        });
    },

    // RUTA DINÁMICA: Detalle de Curso (router.get('/cursos/:slug'))
    cursoDetail: (req, res) => {
        const cursoEncontrado = getCursoBySlug(req.params.slug);
        
        if (!cursoEncontrado) {
            return res.status(404).send('Error 404: El curso solicitado no fue encontrado.');
        }

        res.render('cursos/detail', { 
            title: `Capacitación: ${cursoEncontrado.titulo}`,
            curso: cursoEncontrado
        });
    },

    // RUTAS DE NOTICIAS (NUEVAS)
    
    // Lista de Noticias (router.get('/noticias'))
    noticias: (req, res) => {
        // Asumiendo que existe una vista views/noticias.ejs (o views/noticias/list.ejs)
        res.render('noticias', { 
            title: "Archivo de Noticias",
            // Pasa todas las noticias ordenadas por fecha
            noticias: sortedNoticias 
        });
    },

    // RUTA DINÁMICA: Detalle de Noticia (router.get('/noticias/:slug'))
    noticiaDetail: (req, res) => {
        const noticiaEncontrada = getNoticiaBySlug(req.params.slug);
        
        if (!noticiaEncontrada) {
            return res.status(404).send('Error 404: Noticia no encontrada.');
        }

        res.render('noticias/detail', { 
            title: noticiaEncontrada.titulo,
            noticia: noticiaEncontrada // Pasa los datos de la noticia individual
        });
    }
}

module.exports = mainController;