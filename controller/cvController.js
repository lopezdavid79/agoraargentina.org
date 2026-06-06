const fs = require('fs');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');

// ── Constantes de diseño ──────────────────────────────────────────────
const MARGEN     = 50;
const ANCHO_PAG  = 595;
const ALTO_PAG   = 842;
const COL_IZQ    = 180;   // ancho columna izquierda (sidebar)
const COL_DER    = ANCHO_PAG - COL_IZQ - MARGEN; // ancho columna derecha
const AZUL       = '#3d5a80';
const AZUL_LIGHT = '#d6e4f0';
const BLANCO     = '#ffffff';
const GRIS       = '#555555';
const GRIS_LIGHT = '#f0f4f8';

const cvController = {

    // GET /cv
    show: (req, res) => {
        res.render('cv', {
            title: 'Generador de CV | Programa Ágora',
            errores: req.query.errores || null
        });
    },

    // POST /cv/generar
    generar: async (req, res) => {
        try {
            const {
                nombre, ubicacion, telefono, email, direccion, linkedin,
                perfil, habilidades, mas_info,
                experiencias: expRaw,
                educaciones:  eduRaw,
                idiomas:      idiomasRaw
            } = req.body;

            if (!nombre || nombre.trim() === '') {
                return res.redirect('/cv?errores=' + encodeURIComponent('El nombre es obligatorio.'));
            }

            // Validaciones mínimas del servidor
            if (!perfil || String(perfil).trim() === '') {
                return res.redirect('/cv?errores=' + encodeURIComponent('El perfil profesional es obligatorio.'));
            }
            if (email && String(email).length > 200) {
                return res.redirect('/cv?errores=' + encodeURIComponent('Email demasiado largo.'));
            }

            // Parsear arrays JSON o aceptar ya-arrays si el bodyParser los convirtió
            let experiencias = [];
            let educaciones  = [];
            let idiomas      = [];
            try { experiencias = Array.isArray(expRaw) ? expRaw : JSON.parse(expRaw || '[]'); } catch (e) { experiencias = []; }
            try { educaciones = Array.isArray(eduRaw) ? eduRaw : JSON.parse(eduRaw || '[]'); } catch (e) { educaciones = []; }
            try { idiomas = Array.isArray(idiomasRaw) ? idiomasRaw : JSON.parse(idiomasRaw || '[]'); } catch (e) { idiomas = []; }

            const habilidadesArr = (habilidades || '').split('\n').map(l => l.trim()).filter(Boolean);
            const masInfoArr     = (mas_info    || '').split('\n').map(l => l.trim()).filter(Boolean);

            // Delegate PDF generation to scripts/generar_cv.js which exports generarCv(datos, salida)
            const { generarCv } = require(path.join(__dirname, '..', 'scripts', 'generar_cv'));
            const tmpPdf = path.join(os.tmpdir(), `cv_${Date.now()}_${Math.random().toString(36).slice(2,8)}.pdf`);

            try {
                await generarCv({
                    nombre, ubicacion, telefono, email, direccion, linkedin,
                    perfil, habilidades, mas_info,
                    experiencias, educaciones, idiomas
                }, tmpPdf);
            } catch (e) {
                console.error('[cvController.generar] Error generando PDF (Node):', e && e.message ? e.message : e);
                return res.redirect('/cv?errores=' + encodeURIComponent('Error al generar el PDF. Intentá nuevamente.'));
            }

            if (!fs.existsSync(tmpPdf)) {
                console.error('[cvController.generar] PDF no generado en:', tmpPdf);
                return res.redirect('/cv?errores=' + encodeURIComponent('Error al generar el PDF.'));
            }

            // Crear un nombre de archivo seguro
            function _slugifyFilename(s) {
                if (!s) return 'curriculum';
                let t = String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
                t = t.replace(/[^a-zA-Z0-9.-]+/g, '_');
                t = t.replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120) || 'curriculum';
                return t;
            }

            const safeBase = _slugifyFilename(nombre || 'curriculum');
            const nombreArchivo = `CV_${safeBase}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`);

            res.download(tmpPdf, nombreArchivo, (downloadErr) => {
                if (downloadErr) {
                    console.error('[cvController.generar] Error al enviar:', downloadErr && downloadErr.message ? downloadErr.message : downloadErr);
                }
                try { fs.unlinkSync(tmpPdf); } catch (_) {}
            });

        } catch (error) {
            console.error('[cvController.generar] Error:', error.message);
            res.redirect('/cv?errores=' + encodeURIComponent('Error al generar el PDF. Intentá nuevamente.'));
        }
    }
};

// Similar a generar pero envía el PDF con Content-Disposition inline
cvController.preview = (req, res) => {
    try {
        // Reuse the generar implementation but without piping directly to response with attachment header.
        // We'll duplicate the core generation but set disposition to inline.
        const {
            nombre, ubicacion, telefono, email, direccion, linkedin,
            perfil, habilidades, mas_info,
            experiencias: expRaw,
            educaciones:  eduRaw,
            idiomas:      idiomasRaw
        } = req.body;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ error: 'El nombre es obligatorio.' });
        }
        if (!perfil || String(perfil).trim() === '') {
            return res.status(400).json({ error: 'El perfil profesional es obligatorio.' });
        }

        let experiencias = [];
        let educaciones  = [];
        let idiomas      = [];
        try { experiencias = Array.isArray(expRaw) ? expRaw : JSON.parse(expRaw || '[]'); } catch (e) { experiencias = []; }
        try { educaciones = Array.isArray(eduRaw) ? eduRaw : JSON.parse(eduRaw || '[]'); } catch (e) { educaciones = []; }
        try { idiomas = Array.isArray(idiomasRaw) ? idiomasRaw : JSON.parse(idiomasRaw || '[]'); } catch (e) { idiomas = []; }

        function _truncate(s, n) { if (!s) return s; return String(s).slice(0, n); }
        experiencias = experiencias.map(function(x) {
            return {
                cargo:  _truncate(x.cargo, 120),
                empresa:_truncate(x.empresa, 120),
                periodo:_truncate(x.periodo, 60),
                tareas: _truncate(x.tareas, 2000)
            };
        });
        educaciones = educaciones.map(function(x) {
            return {
                institucion: _truncate(x.institucion, 150),
                titulo:      _truncate(x.titulo, 150),
                periodo:     _truncate(x.periodo, 60)
            };
        });
        idiomas = idiomas.map(function(x) {
            return { idioma: _truncate(x.idioma, 80), nivel: _truncate(x.nivel, 80) };
        });

        const habilidadesArr = (habilidades || '').split('\n').map(l => l.trim()).filter(Boolean);
        const masInfoArr     = (mas_info    || '').split('\n').map(l => l.trim()).filter(Boolean);

        const doc = new PDFDocument({ size: 'A4', margin: 0 });

        function _slugifyFilename(s) {
            if (!s) return 'curriculum';
            let t = String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
            t = t.replace(/[^a-zA-Z0-9.-]+/g, '_');
            t = t.replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120) || 'curriculum';
            return t;
        }

        const safeBase = _slugifyFilename(nombre || 'curriculum');
        const nombreArchivo = `CV_${safeBase}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        // inline para que el navegador lo muestre en lugar de forzar descarga
        res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`);
        doc.pipe(res);

        // Dibujo — reutilizamos el mismo layout que en generar
        doc.rect(0, 0, COL_IZQ, ALTO_PAG).fill(GRIS_LIGHT);
        let yIzq = 30;

        // No photo placeholder — render contact items starting near top of sidebar
        if (telefono || email || direccion || linkedin) {
            const contactos = [];
            if (telefono)  contactos.push({ label: 'Tel:', texto: telefono });
            if (email)     contactos.push({ label: 'Email:', texto: email });
            if (direccion) contactos.push({ label: 'Dirección:', texto: direccion });
            if (linkedin)  contactos.push({ label: 'LinkedIn:', texto: linkedin });

            contactos.forEach(function(c) {
                doc.fillColor(AZUL).fontSize(8).font('Helvetica-Bold')
                   .text(c.label + '  ' + c.texto, 12, yIzq, { width: COL_IZQ - 20 });
                yIzq += 20;
            });
            yIzq += 8;
        }

        if (masInfoArr.length > 0) {
            _sideSectionHeader(doc, 'Más información', yIzq, COL_IZQ, AZUL, BLANCO);
            yIzq += 22;
            masInfoArr.forEach(function(item) {
                doc.fillColor('#333333').fontSize(8).font('Helvetica')
                   .text('- ' + item, 12, yIzq, { width: COL_IZQ - 20 });
                yIzq += 14;
            });
            yIzq += 8;
        }

        if (idiomas.length > 0) {
            _sideSectionHeader(doc, 'Idiomas', yIzq, COL_IZQ, AZUL, BLANCO);
            yIzq += 22;
            idiomas.forEach(function(id) {
                if (id.idioma) {
                    doc.fillColor('#333333').fontSize(8).font('Helvetica-Bold')
                       .text(id.idioma + ':', 12, yIzq, { width: COL_IZQ - 20 });
                    yIzq += 12;
                    doc.font('Helvetica').text(id.nivel || '', 12, yIzq, { width: COL_IZQ - 20 });
                    yIzq += 16;
                }
            });
            yIzq += 4;
        }

        if (habilidadesArr.length > 0) {
            _sideSectionHeader(doc, 'Habilidades', yIzq, COL_IZQ, AZUL, BLANCO);
            yIzq += 22;
            habilidadesArr.forEach(function(h) {
                doc.fillColor('#333333').fontSize(8).font('Helvetica')
                   .text(h, 12, yIzq, { width: COL_IZQ - 20 });
                yIzq += 14;
            });
        }

        const xDer = COL_IZQ + MARGEN;
        let yDer   = 0;
        doc.rect(COL_IZQ, 0, ANCHO_PAG - COL_IZQ, 90).fill(AZUL);
        doc.fillColor(BLANCO).fontSize(26).font('Helvetica-Bold')
           .text(nombre || '', xDer, 22, { width: COL_DER });
        if (ubicacion) {
            doc.fontSize(11).font('Helvetica')
               .text(ubicacion.toUpperCase(), xDer, 58, { width: COL_DER, characterSpacing: 1 });
        }
        yDer = 105;

        if (perfil) {
            _derSectionHeader(doc, 'PERFIL PROFESIONAL', xDer, yDer, COL_DER, AZUL, BLANCO);
            yDer += 24;
            doc.fillColor('#333333').fontSize(9).font('Helvetica')
               .text(perfil, xDer, yDer, { width: COL_DER, lineGap: 3 });
            yDer = doc.y + 12;
        }

        if (experiencias.length > 0) {
            _derSectionHeader(doc, 'EXPERIENCIA LABORAL', xDer, yDer, COL_DER, AZUL, BLANCO);
            yDer += 24;
            experiencias.forEach(function(exp) {
                if (!exp.cargo && !exp.empresa) return;
                const lineaHeader = [exp.cargo, exp.empresa, exp.periodo].filter(Boolean).join(' | ');
                doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold')
                   .text(lineaHeader, xDer, yDer, { width: COL_DER });
                yDer = doc.y + 2;
                if (exp.tareas) {
                    exp.tareas.split('\n').forEach(function(tarea) {
                        if (tarea.trim()) {
                            doc.fillColor('#444444').fontSize(8.5).font('Helvetica')
                               .text('- ' + tarea.trim(), xDer, yDer, { width: COL_DER });
                            yDer = doc.y + 1;
                        }
                    });
                }
                yDer += 8;
            });
        }

        if (educaciones.length > 0) {
            _derSectionHeader(doc, 'EDUCACIÓN', xDer, yDer, COL_DER, AZUL, BLANCO);
            yDer += 24;
            educaciones.forEach(function(edu) {
                if (!edu.institucion && !edu.titulo) return;
                doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold')
                   .text(edu.institucion || '', xDer, yDer, { width: COL_DER });
                yDer = doc.y + 1;
                if (edu.titulo || edu.periodo) {
                    const linea = [edu.titulo, edu.periodo].filter(Boolean).join(' | ');
                    doc.fillColor('#555555').fontSize(8.5).font('Helvetica')
                       .text(linea, xDer, yDer, { width: COL_DER });
                    yDer = doc.y;
                }
                yDer += 10;
            });
        }

        doc.end();

    } catch (error) {
        console.error('[cvController.preview] Error:', error && error.message);
        return res.status(500).json({ error: 'Error al generar la previsualización.' });
    }
};

// ── Helpers de diseño ─────────────────────────────────────────────────
function _sideSectionHeader(doc, texto, y, anchoCol, colorBg, colorTexto) {
    doc.rect(0, y, anchoCol, 20).fill(colorBg);
    doc.fillColor(colorTexto).fontSize(8.5).font('Helvetica-Bold')
       .text(texto, 8, y + 5, { width: anchoCol - 16 });
}

function _derSectionHeader(doc, texto, x, y, ancho, colorBg, colorTexto) {
    doc.rect(x - 5, y, ancho + 5, 20).fill(colorBg);
    doc.fillColor(colorTexto).fontSize(9).font('Helvetica-Bold')
       .text(texto, x, y + 5, { width: ancho });
}

module.exports = cvController;
