const db = require('../config/firebase');

const mainController = {
    // HOME: Muestra las últimas 3 noticias
    home: async (req, res) => {
        try {
            const snapshot = await db.collection('noticias')
                .orderBy('fecha', 'desc')
                .limit(3)
                .get();

            const homeNoticias = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Formateo de fecha bonita: "22 de diciembre de 2024"
                    fecha: data.fecha ? data.fecha.toDate().toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    }) : 'Fecha no disponible'
                };
            });

            res.render('home', {
                title: "Programa Ágora | Inicio",
                noticias: homeNoticias
            });
        } catch (error) {
            console.error("Error en Home:", error);
            res.render('home', { title: "Inicio", noticias: [] });
        }
    },

    // LISTADO DE TODAS LAS NOTICIAS
    noticias: async (req, res) => {
        try {
            const snapshot = await db.collection('noticias')
                .orderBy('fecha', 'desc')
                .get();

            const noticiasFirebase = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    fecha: data.fecha ? data.fecha.toDate().toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    }) : 'Fecha no disponible'
                };
            });

            res.render('noticias', {
                title: "Archivo de Noticias",
                noticias: noticiasFirebase
            });
        } catch (error) {
            console.error("Error en página noticias:", error);
            res.status(500).send("Error al cargar las noticias");
        }
    },

    // DETALLE DE UNA NOTICIA
    noticiaDetail: async (req, res) => {
        try {
            const slug = req.params.slug;
            const snapshot = await db.collection('noticias')
                .where('slug', '==', slug)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return res.status(404).send('Noticia no encontrada');
            }

            const doc = snapshot.docs[0];
            const data = doc.data();
            const noticia = {
                id: doc.id,
                ...data,
                fecha: data.fecha ? data.fecha.toDate().toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                }) : 'Fecha no disponible'
            };

            res.render('noticias/detail', {
                title: noticia.titulo,
                noticia: noticia
            });
        } catch (error) {
            console.error("Error en detalle:", error);
            res.status(500).send("Error al cargar el detalle");
        }
    },

    // RUTAS ESTÁTICAS (Asegúrate de que estos nombres coincidan con tu Router)
    quienesSomos: (req, res) => {
        res.render('quienes-somos', { title: "Programa Ágora | Quiénes Somos" });
    },

    servicios: (req, res) => {
        res.render('servicios', { title: "Programa Ágora | Servicios" });
    },

    contacto: (req, res) => {
        res.render('contacto', { title: "Programa Ágora | Contacto" });
    },
    // CAPACITACIONES: Listado completo de cursos
    capacitaciones: async (req, res) => {
        try {
            // Obtenemos todos los cursos de la colección 'cursos'
            const snapshot = await db.collection('cursos').get();

            const cursosFirebase = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            res.render('cursos', {
                title: "Capacitaciones Disponibles",
                cursos: cursosFirebase
            });
        } catch (error) {
            console.error("Error en página cursos:", error);
            res.status(500).send("Error al cargar los cursos");
        }
    },

    // DETALLE DE UN CURSO (Corregido para usar Firebase)
    cursoDetail: async (req, res) => {
        try {
            const slug = req.params.slug;
            // Buscamos el documento donde el campo slug coincida
            const snapshot = await db.collection('cursos')
                .where('slug', '==', slug)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return res.status(404).send('Curso no encontrado');
            }

            const doc = snapshot.docs[0];
            const curso = {
                id: doc.id,
                ...doc.data()
            };

            res.render('cursos/detail', { 
                title: curso.titulo,
                curso: curso 
            });
        } catch (error) {
            console.error("Error en detalle de curso:", error);
            res.status(500).send("Error al cargar el detalle del curso");
        }
    },

    // RUTAS ESTÁTICAS
    quienesSomos: (req, res) => {
        res.render('quienes-somos', { title: "Programa Ágora | Quiénes Somos" });
    },
    servicios: (req, res) => {
        res.render('servicios', { title: "Programa Ágora | Servicios" });
    },
    contacto: (req, res) => {
        res.render('contacto', { title: "Programa Ágora | Contacto" });
    }
};

module.exports = mainController;