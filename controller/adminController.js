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

                    // 3. Obtenemos las capacitaciones 
            const capsSnapshot = await db.collection('capacitaciones').get();
            const capacitaciones = capsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));


            res.render('admin/dashboard', { title: "Panel de Control",
                 noticias ,cursos, capacitaciones });
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
            fecha: new Date(), 
            fechaActualizacion: new Date() // Opcional: para saber cuándo se editó
        });
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.status(500).send("Error al actualizar la noticia");
    }
},    
// Borra la noticia de Firestore
    delete: async (req, res) => {
        try {
            const id = req.params.id;
            await db.collection('noticias').doc(id).delete();
            
            // Redirigir al dashboard (asegúrate de que esta ruta sea la que muestra la tabla)
            res.redirect('/admin/dashboard'); 
        } catch (error) {
            console.error("Error al eliminar noticia:", error);
            res.status(500).send("No se pudo eliminar la noticia. Inténtalo de nuevo.");
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
    },
    // SECCIÓN CAPACITACIONES (ÁGORA)
    
    createCapacitacion: (req, res) => {
        res.render('admin/capacitaciones/create', { title: "Nueva Capacitación" });
    },

storeCapacitacion: async (req, res) => {
    try {
        console.log("--- Iniciando guardado de capacitación ---"); // Log de inicio
        const { titulo, descripcion, categoria, instructor, privado, link_vivo, slug, infoClase } = req.body;
        
        // 1. Validaciones de entrada con logs específicos
        if (!titulo || titulo.trim() === "") {
            console.error("Error de validación: El título está vacío.");
            return res.status(400).send("El título es obligatorio para crear la capacitación.");
        }

        // 2. Lógica de generación y limpieza del Slug
        let finalSlug = slug ? slug.trim() : titulo.trim();
        finalSlug = finalSlug.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
            .replace(/[^\w ]+/g, '') 
            .replace(/ +/g, '-');

        if (!finalSlug) {
            console.error("Error: El slug generado es inválido.");
            return res.status(400).send("No se pudo generar un identificador válido.");
        }

        console.log(`Intentando guardar en Firebase con ID (slug): ${finalSlug}`);

        // 3. Intento de escritura en la base de datos
        await db.collection('capacitaciones').doc(finalSlug).set({
            titulo: titulo.trim(),
            slug: finalSlug,
            descripcion: descripcion || "",
            categoria: categoria || "General",
            instructor: instructor || "",
            privado: (privado === 'on' || privado === 'true'),
            link_vivo: link_vivo || "",
            infoClase: infoClase || "",
            fecha: new Date(),
            estado: "borrador"
        });

        console.log("¡Éxito! Capacitación guardada correctamente.");
        res.redirect('/admin/dashboard');

    } catch (error) {
        // 4. Captura detallada del error para escuchar con NVDA
        console.error("--- ERROR CRÍTICO EN STORECAPACITACION ---");
        console.error("Mensaje del error:", error.message);
        
        // Verificamos si es un error de permisos o de conexión de Firebase
        if (error.code) {
            console.error("Código de error de Firebase:", error.code);
        }

        // Si el error ocurrió durante la comunicación con Firebase
        if (error.stack && error.stack.includes('google-cloud')) {
            return res.status(503).send("Error de conexión con la base de datos. Reintentá en unos segundos.");
        }

        res.status(500).send(`Error interno al crear la capacitación: ${error.message}`);
    }
},

    editCapacitacion: async (req, res) => {
        try {
            const doc = await db.collection('capacitaciones').doc(req.params.id).get();
            if (!doc.exists) return res.status(404).send("No encontrada");
            res.render('admin/capacitaciones/edit', { title: "Editar", cap: { id: doc.id, ...doc.data() } });
        } catch (error) {
            res.status(500).send("Error al cargar");
        }
    },

    updateCapacitacion: async (req, res) => {
    try {
        const id = req.params.id; // El slug que sirve como ID del documento
        console.log(`--- Iniciando actualización de capacitación: ${id} ---`); // Log para seguimiento 

        // 1. Capturamos los datos del formulario
        const { 
            titulo, 
            descripcion, 
            categoria, 
            instructor, 
            privado, 
            link_vivo, 
            estado, 
            infoClase 
        } = req.body;

        // 2. Validación preventiva
        if (!titulo || titulo.trim() === "") {
            console.error("Error de validación: El título no puede estar vacío.");
            return res.status(400).send("El título es obligatorio para actualizar.");
        }

        // 3. Ejecución de la actualización en Firebase
        await db.collection('capacitaciones').doc(id).update({
            titulo: titulo.trim(),
            descripcion: descripcion || "",
            categoria: categoria || "General",
            instructor: instructor || "",
            // Manejo seguro del checkbox (on/true) 
            privado: (privado === 'on' || privado === 'true'),
            link_vivo: link_vivo || "",
            estado: estado || "borrador",
            infoClase: infoClase || "", // Aseguramos que la variable esté definida 
            fechaActualizacion: new Date()
        });

        console.log(`¡Capacitación ${id} actualizada con éxito!`); // Confirmación en consola 
        res.redirect('/admin/dashboard');

    } catch (error) {
        // 4. Captura detallada de errores para el desarrollador
        console.error("--- ERROR CRÍTICO EN UPDATECAPACITACION ---");
        console.error("Mensaje del error:", error.message);

        // Si el error es específicamente de Firebase (ej: el documento no existe)
        if (error.code === 5 || error.message.includes('NOT_FOUND')) {
            console.error("Error: El documento que intentas editar no existe en Firebase.");
            return res.status(404).send("Error: La capacitación no existe.");
        }

        // Error general de servidor
        res.status(500).send(`Error técnico al actualizar: ${error.message}`);
    }
},
    deleteCapacitacion: async (req, res) => {
        try {
            await db.collection('capacitaciones').doc(req.params.id).delete();
            res.redirect('/admin/dashboard');
        } catch (error) {
            res.status(500).send("Error al eliminar");
        }
    },

    // ==========================================
    // GESTIÓN DE MÓDULOS (SUBCOLECCIÓN)
    // ==========================================
 createModulos: async (req, res) => {
        try {
            const idCap = req.params.id; 
            const capDoc = await db.collection('capacitaciones').doc(idCap).get();
            const snapshot = await db.collection('capacitaciones').doc(idCap).collection('modulos').orderBy('orden', 'asc').get();
            const modulos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            res.render('admin/capacitaciones/createModulos', { 
                title: `Módulos: ${capDoc.data().titulo}`,
                idCap,
                modulos 
            });
        } catch (error) {
            res.status(500).send("Error al cargar módulos");
        }
    },

    storeModulo: async (req, res) => {
    try {
        const idCap = req.params.id;
        const { orden, tituloModulo, descripcion, claseGrabada, linkMaterial } = req.body;

        // Validación simple antes de intentar guardar
        if (!tituloModulo || !orden) {
            return res.status(400).send("Faltan campos obligatorios: Título y Orden son necesarios.");
        }

        await db.collection('capacitaciones').doc(idCap).collection('modulos').add({
            orden: parseInt(orden),
            tituloModulo,
            descripcion: descripcion || "",
            claseGrabada: claseGrabada || "",
            linkMaterial: linkMaterial || "",
            fechaCreacion: new Date()
        });

        res.redirect(`/admin/capacitaciones/${idCap}/modulos`);

    } catch (error) {
        // 1. Log detallado en la terminal de VS Code (esto es lo que tú verás)
        console.error("--- ERROR AL AGREGAR MÓDULO ---");
        console.error("Mensaje:", error.message);
        console.error("Código de error:", error.code); // Útil para Firebase (ej: 'permission-denied')
        console.error("Stack Trace:", error.stack);
        console.error("-------------------------------");

        // 2. Respuesta al navegador más informativa (temporalmente para debugear)
        res.status(500).render('error', { 
            message: "Error técnico al guardar en la base de datos",
            error: error // O simplemente enviar error.message si no quieres mostrar todo
        });
    }
},

// Muestra el formulario para editar un módulo con sus datos precargados
editModulo: async (req, res) => {
    console.log("!!! HE ENTRADO AL CONTROLADOR DE EDICION !!!");
    try {
        // 1. Obtenemos los IDs de la capacitación y del módulo desde la URL
        const { idCap, idModulo } = req.params;

        // 2. Buscamos el documento del módulo en la subcolección
        const moduloDoc = await db.collection('capacitaciones')
            .doc(idCap)
            .collection('modulos')
            .doc(idModulo)
            .get();

        // 3. Verificamos si el módulo existe
        if (!moduloDoc.exists) {
            console.error("Módulo no encontrado en Firebase");
            return res.status(404).send("El módulo que intentas editar no existe.");
        }

        // 4. Renderizamos la vista pasando los datos necesarios
        res.render('admin/capacitaciones/editModulo', {
            title: "Editar Módulo - Ágora Argentina",
            idCap: idCap, // Lo necesitamos para el botón "Cancelar" y el action del form
            modulo: { 
                id: moduloDoc.id, 
                ...moduloDoc.data() 
            }
        });

    } catch (error) {
        console.error("Error al abrir formulario de edición:", error);
        res.status(500).send("Error técnico al cargar el módulo");
    }
},
updateModulo: async (req, res) => {
    try {
        // 1. CAPTURAR LOS IDS DE LA URL (Esto es lo que faltaba)
        const { idCap, idModulo } = req.params;

        // 2. CAPTURAR LOS DATOS DEL FORMULARIO
        const { orden, tituloModulo, descripcion, claseGrabada, linkMaterial ,activo} = req.body;

        // 3. EJECUTAR LA ACTUALIZACIÓN EN FIREBASE
        await db.collection('capacitaciones')
            .doc(idCap)
            .collection('modulos')
            .doc(idModulo)
            .update({
                orden: parseInt(orden),
                tituloModulo,
                descripcion: descripcion || "",
                claseGrabada: claseGrabada || "",
                linkMaterial: linkMaterial || "",
                activo: activo === "on" ? true : false, 
                fechaActualizacion: new Date()
            });

        // 4. REDIRIGIR AL LISTADO DE MÓDULOS PARA VER LOS CAMBIOS
        res.redirect(`/admin/capacitaciones/${idCap}/modulos`);

    } catch (error) {
        // Usamos console.error para que lo escuches en el CMD con NVDA
        console.error("Error detallado:", error);
        res.status(500).send("Error al actualizar: " + error.message);
    }
},

deleteModulo: async (req, res) => {
        try {
            const { idCap, idMod } = req.params;
            await db.collection('capacitaciones').doc(idCap).collection('modulos').doc(idMod).delete();
            res.redirect(`/admin/capacitaciones/${idCap}/modulos`);
        } catch (error) {
            res.status(500).send("Error al eliminar módulo");
        }
    }
};

module.exports = adminController;
    