const db     = require('../config/firebase');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { execFile, exec } = require('child_process');

const informesController = {

    // ── Listado de informes ────────────────────────────────────────────
    index: async (req, res) => {
        try {
            const snapshot = await db.collection('informes')
                .orderBy('fecha', 'desc')
                .get();
            const informes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            res.render('admin/informes/index', {
                title: 'Informes de Formación',
                informes,
                user: req.session.user,
                exito:   req.query.exito   || null,
                errores: req.query.errores || null
            });
        } catch (error) {
            console.error('[informes.index] Error:', error.message);
            res.status(500).render('error', { message: 'Error al cargar los informes', status: 500 });
        }
    },

    // ── Formulario de creación ─────────────────────────────────────────
    create: (req, res) => {
        res.render('admin/informes/create', {
            title: 'Nuevo Informe de Formación',
            user: req.session.user
        });
    },

    // ── Guardar en Firestore ───────────────────────────────────────────
    store: async (req, res) => {
        try {
            const datos = _extraerDatos(req.body);

            if (!datos.nombre || datos.nombre.trim() === '') {
                return res.status(400).send('El nombre de la capacitación es obligatorio.');
            }

            const ref = await db.collection('informes').add({
                ...datos,
                creadoPor: req.session.user.uid,
                fecha: new Date()
            });

            console.log(`[informes.store] Guardado con ID: ${ref.id}`);
            res.redirect('/admin/informes?exito=1');

        } catch (error) {
            console.error('[informes.store] Error:', error.message);
            res.status(500).render('error', { message: 'Error al guardar el informe', status: 500 });
        }
    },

    // ── Formulario de edición ──────────────────────────────────────────
    edit: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`[informes.edit] Cargando informe ID: ${id}`);

            const doc = await db.collection('informes').doc(id).get();

            if (!doc.exists) {
                console.warn(`[informes.edit] Informe no encontrado: ${id}`);
                return res.status(404).render('error', { message: 'Informe no encontrado.', status: 404 });
            }

            const informe = doc.data();

            res.render('admin/informes/edit', {
                title: 'Editar Informe',
                user: req.session.user,
                datos: {
                    id: doc.id,
                    ...informe,
                    clasesText: (informe.clases || [])
                        .map((c, i) => `${i + 1}|${c}`)
                        .join('\n'),
                    participantesJSON: JSON.stringify(informe.participantes || [])
                }
            });
        } catch (error) {
            console.error('[informes.edit] Error:', error.message);
            res.status(500).render('error', { message: 'Error al cargar el informe', status: 500 });
        }
    },

    // ── Actualizar en Firestore ────────────────────────────────────────
    // Acepta tanto PUT (method-override) como POST directo
    update: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`[informes.update] Actualizando ID: ${id}`);
            console.log(`[informes.update] Método recibido: ${req.method}`);
            console.log(`[informes.update] _method en body: ${req.body._method}`);

            const doc = await db.collection('informes').doc(id).get();
            if (!doc.exists) {
                console.warn(`[informes.update] Informe no encontrado: ${id}`);
                return res.status(404).render('error', { message: 'Informe no encontrado.', status: 404 });
            }

            const datos = _extraerDatos(req.body);

            await db.collection('informes').doc(id).update({
                ...datos,
                fechaActualizacion: new Date()
            });

            console.log(`[informes.update] Actualizado correctamente: ${id}`);
            res.redirect('/admin/informes?exito=1');

        } catch (error) {
            console.error('[informes.update] Error:', error.message);
            res.status(500).render('error', { message: 'Error al actualizar el informe', status: 500 });
        }
    },

    // ── Eliminar ───────────────────────────────────────────────────────
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`[informes.delete] Eliminando ID: ${id}`);

            await db.collection('informes').doc(id).delete();

            console.log(`[informes.delete] Eliminado: ${id}`);
            res.redirect('/admin/informes?exito=1');

        } catch (error) {
            console.error('[informes.delete] Error:', error.message);
            res.status(500).render('error', { message: 'Error al eliminar el informe', status: 500 });
        }
    },

    // ── Generar y descargar PDF ────────────────────────────────────────
    generarPDF: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`[informes.generarPDF] Generando PDF para ID: ${id}`);

            const doc = await db.collection('informes').doc(id).get();
            if (!doc.exists) return res.status(404).render('error', { message: 'Informe no encontrado.', status: 404 });

            // Convertir Timestamps de Firestore a string
            const raw = doc.data();
            const datos = JSON.parse(JSON.stringify(raw, (key, value) => {
                if (value && typeof value === 'object' && typeof value.toDate === 'function') {
                    return value.toDate().toLocaleDateString('es-AR');
                }
                return value;
            }));
            datos.id = id;

            // Use Node implementation to generate PDF instead of Python script
            const { generarPdf } = require(path.join(__dirname, '..', 'scripts', 'generar_informe'));
            const tmpPdf = path.join(os.tmpdir(), `informe_${id}.pdf`);

            try {
                await generarPdf(datos, tmpPdf);
            } catch (e) {
                console.error('[informes.generarPDF] Error generando PDF (Node):', e && e.message ? e.message : e);
                return res.status(500).send('<h3>Error al generar el PDF en el servidor</h3><pre>' + (e && e.stack ? e.stack : String(e)) + '</pre>');
            }

            if (!fs.existsSync(tmpPdf)) {
                console.error('[informes.generarPDF] PDF no generado en:', tmpPdf);
                return res.status(500).send('No se pudo generar el PDF.');
            }

            const nombreArchivo = `informe_${(datos.nombre || 'formacion')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')}.pdf`;

            console.log(`[informes.generarPDF] Enviando: ${nombreArchivo}`);

            res.download(tmpPdf, nombreArchivo, (downloadErr) => {
                if (downloadErr) {
                    console.error('[informes.generarPDF] Error al enviar:', downloadErr.message);
                }
                try { fs.unlinkSync(tmpPdf); } catch (_) {}
            });

        } catch (error) {
            console.error('[informes.generarPDF] Error general:', error.message);
            res.status(500).render('error', { message: 'Error al procesar la solicitud', status: 500 });
        }
    }
};

// Note: Python script was replaced by a Node implementation (scripts/generar_informe.js)

// ── Helper: extrae y normaliza los datos del req.body ─────────────────
function _extraerDatos(body) {
    const {
        nombre, duracion, modalidad,
        fecha_inicio, fecha_fin,
        part_inicia, part_aprueba, mujeres, hombres,
        inst_nombre, inst_dni, inst_tel, inst_mail,
        obj_general, obj_especificos, temario, metodologia,
        eval_teorica, eval_practica,
        observaciones, recomendaciones,
        ciudad, fecha_firma,
        participantes
    } = body;

    const clases = [];
    let i = 1;
    while (body[`clase_${i}`] !== undefined) {
        clases.push(body[`clase_${i}`] || '');
        i++;
    }

    let participantesArray = [];
    try {
        participantesArray = participantes ? JSON.parse(participantes) : [];
    } catch (e) {
        console.warn('[_extraerDatos] No se pudo parsear participantes:', e.message);
    }

    return {
        nombre:          nombre          || '',
        duracion:        duracion        || '',
        modalidad:       modalidad       || '',
        fecha_inicio:    fecha_inicio    || '',
        fecha_fin:       fecha_fin       || '',
        part_inicia:     part_inicia     || '',
        part_aprueba:    part_aprueba    || '',
        mujeres:         mujeres         || '',
        hombres:         hombres         || '',
        inst_nombre:     inst_nombre     || '',
        inst_dni:        inst_dni        || '',
        inst_tel:        inst_tel        || '',
        inst_mail:       inst_mail       || '',
        obj_general:     obj_general     || '',
        obj_especificos: obj_especificos || '',
        temario:         temario         || '',
        clases,
        metodologia:     metodologia     || '',
        eval_teorica:    eval_teorica    || '',
        eval_practica:   eval_practica   || '',
        participantes:   participantesArray,
        observaciones:   observaciones   || '',
        recomendaciones: recomendaciones || '',
        ciudad:          ciudad          || '',
        fecha_firma:     fecha_firma     || ''
    };
}

module.exports = informesController;
