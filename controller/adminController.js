const db = require('../config/firebase');

const adminController = {
    // Muestra todas las noticias en una tabla para el admin
    index: async (req, res) => {
        try {
            const snapshot = await db.collection('noticias').orderBy('fecha', 'desc').get();
            const noticias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    // 2. Obtener cursos 
        const snapshotCursos = await db.collection('cursos').get();
        const cursos = snapshotCursos.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            res.render('admin/dashboard', { title: "Panel de Control",
                 noticias ,cursos});
        } catch (error) {
            res.status(500).send("Error al cargar el panel");
        }
    },

    // Muestra el formulario de creación
    create: (req, res) => {
        res.render('admin/noticias/create', { title: "Nueva Noticia" });
    },

    // Procesa el guardado en Firestore
    store: async (req, res) => {
        try {
            const { titulo, copete, contenido, imagenUrl, alt,slug } = req.body;
            await db.collection('noticias').add({
                titulo,
                copete,
                contenido,
                imagenUrl,
                alt,
                slug,
                fecha: new Date() // Guarda el timestamp actual
            });
            res.redirect('/admin/dashboard');
        } catch (error) {
            res.send("Error al guardar la noticia");
        }
    },
// controller/adminController.js

// 1. Mostrar el formulario con los datos cargados
edit: async (req, res) => {
    try {
        const doc = await db.collection('noticias').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).send("Noticia no encontrada");
        }
        res.render('admin/noticias/edit', { 
            title: "Editar Noticia", 
            noticia: { id: doc.id, ...doc.data() } 
        });
    } catch (error) {
        res.status(500).send("Error al cargar la noticia");
    }
},

// 2. Procesar la actualización (PUT)
update: async (req, res) => {
    try {
        const { titulo, copete, contenido, imagenUrl, alt,slug } = req.body;
        await db.collection('noticias').doc(req.params.id).update({
            titulo,
            copete,
            contenido,
            imagenUrl,
            alt,
            slug,
            fechaActualizacion: new Date() // Opcional: para saber cuándo se editó
        });
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.status(500).send("Error al actualizar la noticia");
    }
},    
// SECCIÓN CURSOS 
    // ==========================================

    // Listar cursos
    indexCursos: async (req, res) => {
        try {
            const snapshot = await db.collection('cursos').get();
            const cursos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.render('admin/cursos/index', { title: "Gestión de Cursos", cursos });
        } catch (error) {
            res.status(500).send("Error al cargar cursos");
        }
    },
    // Formulario de nuevo curso
    createCurso: (req, res) => {
        res.render('admin/cursos/create', { title: "Nuevo Curso" });
    },

    // Guardar curso en Firebase
    storeCurso: async (req, res) => {
    try {
        console.log("DATOS RECIBIDOS DEL FORMULARIO:", req.body); // Verifica esto en tu terminal

        const { 
            titulo, 
            descripcionCorta, 
            modalidad, 
            duracion, 
            slug, 
            objetivoGeneral, 
            objetivos, 
            temario, 
            imagen, 
            alt, 
            urlInscrip 
        } = req.body;

        // VALIDACIÓN DE EMERGENCIA
        if (!slug || slug.trim() === "") {
            console.error("ERROR: El slug está vacío. No se puede crear el documento.");
            return res.status(400).send("El campo Slug es obligatorio.");
        }

        const objetivosArray = objetivos ? objetivos.split('\n').map(i => i.trim()).filter(i => i !== "") : [];
        const temarioArray = temario ? temario.split('\n').map(i => i.trim()).filter(i => i !== "") : [];

        // GUARDADO EN FIREBASE
        await db.collection('cursos').doc(slug).set({
            titulo,
            descripcion: descripcionCorta, // Se guarda como 'descripcion' para que dashboard.ejs lo lea
            modalidad,
            duracion,
            slug,
            objetivoGeneral,
            objetivos: objetivosArray,
            temario: temarioArray,
            imagen: imagen || "",
            alt: alt || "",
            urlInscrip: urlInscrip || "",
            fechaCreacion: new Date()
        });

        console.log("¡CURSO GUARDADO EXITOSAMENTE EN FIREBASE!");
        
        // REDIRECCIÓN CORRECTA AL DASHBOARD
        res.redirect('/admin/dashboard'); 

    } catch (error) {
        console.error("ERROR DETALLADO DE FIREBASE:", error);
        res.status(500).send("Error interno del servidor al guardar en Firebase: " + error.message);
    }
},
    // Formulario de edición de curso
    editCurso: async (req, res) => {
        try {
            const doc = await db.collection('cursos').doc(req.params.id).get();
            if (!doc.exists) return res.status(404).send("Curso no encontrado");
            
            const curso = doc.data();
            
            const datosParaForm = {
                ...curso,
                id: doc.id,
                // Aseguramos que el formulario de edición reciba 'descripcionCorta' desde 'descripcion' de la DB
                descripcionCorta: curso.descripcion, 
                objetivosText: curso.objetivos ? curso.objetivos.join('\n') : "",
                temarioText: curso.temario ? curso.temario.join('\n') : ""
            };

            res.render('admin/cursos/edit', { title: "Editar Curso", curso: datosParaForm });
        } catch (error) {
            console.error("Error al cargar curso:", error);
            res.status(500).send("Error al cargar el curso");
        }
    },

    // Procesar la actualización
    updateCurso: async (req, res) => {
        try {
            const { 
                titulo, 
                descripcionCorta, 
                modalidad, 
                duracion, 
                objetivoGeneral, 
                objetivos, 
                temario, 
                imagen, 
                alt, 
                urlInscrip 
            } = req.body;
            
            const objetivosArray = objetivos ? objetivos.split('\n').map(i => i.trim()).filter(i => i !== "") : [];
            const temarioArray = temario ? temario.split('\n').map(i => i.trim()).filter(i => i !== "") : [];

            await db.collection('cursos').doc(req.params.id).update({
                titulo,
                descripcion: descripcionCorta, // Mantenemos el nombre de la DB
                modalidad,
                duracion,
                objetivoGeneral,
                objetivos: objetivosArray,
                temario: temarioArray,
                imagen,
                alt,
                urlInscrip,
                fechaActualizacion: new Date()
            });

            res.redirect('/admin/cursos');
        } catch (error) {
            console.error("Error al actualizar curso:", error);
            res.status(500).send("Error al actualizar el curso");
        }
    },

    deleteCurso: async (req, res) => {
        try {
            await db.collection('cursos').doc(req.params.id).delete();
            res.redirect('/admin/cursos');
        } catch (error) {
            console.error("Error al eliminar curso:", error);
            res.status(500).send("Error al eliminar");
        }
    }
};

module.exports = adminController;
    