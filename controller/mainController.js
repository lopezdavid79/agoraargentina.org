const nodemailer = require('nodemailer');
const sanitizeHtml = require('sanitize-html');
const logger = require('../config/logger');
const db = require('../config/firebase');

const mainController = {
    home: async (req, res) => {
        try {
            const snapshot = await db.collection('noticias')
                .orderBy('fecha', 'desc').limit(3).get();

            const homeNoticias = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id, ...data,
                    fecha: data.fecha ? data.fecha.toDate().toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    }) : 'Fecha no disponible'
                };
            });

            res.render('home', { title: "Inicio", noticias: homeNoticias });
        } catch (error) {
            logger.error("Error en Home:", error);
            res.render('home', { title: "Inicio", noticias: [] });
        }
    },

    noticias: async (req, res) => {
        try {
            const snapshot = await db.collection('noticias').orderBy('fecha', 'desc').get();
            const noticiasFirebase = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id, ...data,
                    fecha: data.fecha ? data.fecha.toDate().toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    }) : 'Fecha no disponible'
                };
            });
            res.render('noticias', { title: "Archivo de Noticias", noticias: noticiasFirebase });
        } catch (error) {
            logger.error("Error en página noticias:", error);
            res.status(500).send("Error al cargar las noticias");
        }
    },

    noticiaDetail: async (req, res) => {
        try {
            const snapshot = await db.collection('noticias')
                .where('slug', '==', req.params.slug).limit(1).get();
            if (snapshot.empty) return res.status(404).send('Noticia no encontrada');

            const doc = snapshot.docs[0];
            const data = doc.data();
            const noticia = {
                id: doc.id, ...data,
                fecha: data.fecha ? data.fecha.toDate().toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'long', year: 'numeric'
                }) : 'Fecha no disponible'
            };
            res.render('noticias/detail', { title: noticia.titulo, noticia });
        } catch (error) {
            logger.error("Error en detalle:", error);
            res.status(500).send("Error al cargar el detalle");
        }
    },

    quienesSomos: (req, res) => res.render('quienes-somos', { title: "Quiénes Somos" }),
    servicios:    (req, res) => res.render('servicios',      { title: "Servicios" }),
    preguntasFrecuentes: (req, res) => res.render('preguntas-frecuentes', { title: "Preguntas Frecuentes" }),
    contacto: (req, res) => res.render('contacto', { title: "Programa Ágora | Contacto" }),

    processContacto: async (req, res) => {
        const sanitizeOptions = { allowedTags: [], allowedAttributes: {} };
        const nombre  = sanitizeHtml(req.body.nombre  || '', sanitizeOptions);
        const email   = sanitizeHtml(req.body.email   || '', sanitizeOptions);
        const telefono = sanitizeHtml(req.body.telefono || '', sanitizeOptions);
        const asunto  = sanitizeHtml(req.body.asunto  || '', sanitizeOptions);
        const mensaje = sanitizeHtml(req.body.mensaje || '', sanitizeOptions);
        const transporter = nodemailer.createTransport({
            host: "mail.agoraargentina.ar",
            port: 465,
            secure: true,
            auth: { user: "info@agoraargentina.ar", pass: process.env.EMAIL_PASS }
        });
        try {
            // verify connection configuration before sending
            await transporter.verify();
            logger.info('SMTP connection verified successfully');

            await transporter.sendMail({
                from: `"Web Ágora" <info@agoraargentina.ar>`,
                to: "info@agoraargentina.ar",
                replyTo: email,
                subject: `Nueva Consulta: ${asunto}`,
                html: `
                    <h3>Mensaje desde la web agoraargentina.ar</h3>
                    <p><strong>Nombre:</strong> ${nombre}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Teléfono:</strong> ${telefono || 'No informado'}</p>
                    <p><strong>Mensaje:</strong> ${mensaje}</p>
                `
            });
            res.render('contacto', { title: "Contacto", successMsg: "Mensaje enviado con éxito! Estaremos en contacto pronto." });
        } catch (error) {
            logger.error('Error al enviar mail:', {
                message: error.message,
                code: error.code,
                command: error.command,
                response: error.response,
                responseCode: error.responseCode
            });
            res.render('contacto', { title: "Contacto", errorMsg: "Hubo un error al enviar el mensaje. Intenta más tarde." });
        }
    },

    cursos: async (req, res) => {
        try {
            const snapshot = await db.collection('cursos').get();
            const cursosFirebase = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.render('cursos', { title: "Capacitaciones Disponibles", cursos: cursosFirebase });
        } catch (error) {
            logger.error("Error en página cursos:", error);
            res.status(500).send("Error al cargar los cursos");
        }
    },

    cursoDetail: async (req, res) => {
        try {
            const snapshot = await db.collection('cursos')
                .where('slug', '==', req.params.slug).limit(1).get();
            if (snapshot.empty) return res.status(404).send('Curso no encontrado');
            const doc = snapshot.docs[0];
            res.render('cursos/detail', { title: doc.data().titulo, curso: { id: doc.id, ...doc.data() } });
        } catch (error) {
            logger.error("Error en detalle de curso:", error);
            res.status(500).send("Error al cargar el detalle del curso");
        }
    },

    // LISTADO: solo muestra capacitaciones con estado 'Activo'
    capacitacionesViews: async (req, res) => {
        try {
            const snapshot = await db.collection('capacitaciones')
                .where('estado', '==', 'Activo').get();
            const capacitaciones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.render('capacitaciones/index', { title: "Capacitaciones Virtuales 2026", capacitaciones });
        } catch (error) {
            res.status(500).send("Error al cargar capacitaciones");
        }
    },

    // DETALLE: bloquea acceso si el estado no es 'Activo'
    detailCapacitaciones: async (req, res) => {
        try {
            const { slug } = req.params;
            const capQuery = await db.collection('capacitaciones')
                .where('slug', '==', slug).limit(1).get();

            if (capQuery.empty) {
                return res.status(404).render('error', { message: "Capacitación no encontrada" });
            }

            const capDoc = capQuery.docs[0];
            const capacitacion = { id: capDoc.id, ...capDoc.data() };

            // Bloquear si no está activa
            if (capacitacion.estado !== 'Activo') {
                return res.status(403).render('error', { message: "Esta capacitación no está disponible." });
            }

            const modulosSnapshot = await db.collection('capacitaciones')
                .doc(capDoc.id).collection('modulos')
                .orderBy('orden', 'asc').get();

            const modulos = modulosSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(modulo => modulo.activo === true);

            res.render('capacitaciones/detail', { title: capacitacion.titulo, capacitaciones: capacitacion, modulos });
        } catch (error) {
            res.status(500).send("Error al cargar el detalle");
        }
    }
};

module.exports = mainController;
