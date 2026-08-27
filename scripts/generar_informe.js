const fs   = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ── Paleta del informe ─────────────────────────────────────────────
const AZUL       = '#1a4b8c';   // acento de títulos y tablas
const NEGRO      = '#000000';   // texto principal
const GRIS       = '#333333';   // texto secundario
const GRIS_CLARO = '#666666';   // texto de ausencia de contenido
const BLANCO     = '#FFFFFF';

// ── Layout A4 ──────────────────────────────────────────────────────
const ANCHO_PAG = 595;
const ALTO_PAG  = 842;
const MARGEN    = 56;
const ANCHO_UTIL = ANCHO_PAG - MARGEN * 2;

const FALLBACK = '—';

// ── Normalización defensiva ───────────────────────────────────────
function val(v) {
    if (v === null || v === undefined) return FALLBACK;
    if (typeof v === 'string' && v.trim() === '') return FALLBACK;
    return String(v);
}

// Como el EJS: la firma y las celdas de participantes usan '' vacío (no '—')
function emp(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' && v.trim() === '') return '';
    return String(v);
}

function splitLines(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(s => s.trim());
    return String(v).split('\n').map(s => s.trim()).filter(s => s.trim());
}

// ── Helpers de dibujo ─────────────────────────────────────────────
function seccion(doc, texto) {
    if (doc.y > ALTO_PAG - MARGEN - 40) doc.addPage();
    doc.moveDown(0.5);
    doc.fillColor(AZUL).fontSize(13).font('Helvetica-Bold')
       .text(texto, MARGEN, doc.y, { width: ANCHO_UTIL });
    const yLinea = doc.y + 2;
    doc.moveTo(MARGEN, yLinea)
       .lineTo(ANCHO_PAG - MARGEN, yLinea)
       .strokeColor(AZUL).lineWidth(1).stroke();
    doc.moveDown(0.4);
}

function subSeccion(doc, texto) {
    if (doc.y > ALTO_PAG - MARGEN - 25) doc.addPage();
    doc.moveDown(0.2);
    doc.fillColor(GRIS).fontSize(10).font('Helvetica-Bold')
       .text(texto, MARGEN, doc.y, { width: ANCHO_UTIL });
    doc.moveDown(0.2);
}

function parrafo(doc, texto) {
    if (doc.y > ALTO_PAG - MARGEN - 30) doc.addPage();
    doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
       .text(val(texto), MARGEN, doc.y, { width: ANCHO_UTIL, lineGap: 2 });
    doc.moveDown(0.3);
}

function vacio(doc, mensaje) {
    doc.fillColor(GRIS_CLARO).fontSize(9).font('Helvetica-Oblique')
       .text(mensaje, MARGEN, doc.y, { width: ANCHO_UTIL });
    doc.moveDown(0.3);
}

function lista(doc, items) {
    if (!items || !items.length) {
        vacio(doc, 'Sin contenido registrado.');
        return;
    }
    items.forEach(item => {
        if (doc.y > ALTO_PAG - MARGEN - 18) doc.addPage();
        doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
           .text('• ' + item, MARGEN + 10, doc.y, { width: ANCHO_UTIL - 10, lineGap: 2 });
        doc.moveDown(0.15);
    });
}

// Tabla clave-valor: [etiqueta, valor]
function tablaKV(doc, filas) {
    const labelW = 150;
    const x = MARGEN;
    filas.forEach(f => {
        if (doc.y > ALTO_PAG - MARGEN - 20) doc.addPage();
        const y0 = doc.y;
        doc.fontSize(9).fillColor(AZUL).font('Helvetica-Bold')
           .text(f[0], x, y0, { width: labelW, lineGap: 2 });
        const yLabelEnd = doc.y;
        doc.fillColor(NEGRO).font('Helvetica')
           .text(val(f[1]), x + labelW, y0, { width: ANCHO_UTIL - labelW, lineGap: 2 });
        const yValorEnd = doc.y;
        const yLine = Math.max(yLabelEnd, yValorEnd) + 2;
        doc.moveTo(x, yLine)
           .lineTo(ANCHO_PAG - MARGEN, yLine)
           .strokeColor('#cccccc').lineWidth(0.5).stroke();
        doc.y = yLine + 4;
    });
}

// Tabla genérica con encabezado y filas, con saltos de página por fila
function tabla(doc, headers, rows, colWidths) {
    const startX = MARGEN;
    const cellPad = 3;
    const alturaHeader = 16;

    function header() {
        const y0 = doc.y;
        doc.fontSize(6.5).font('Helvetica-Bold');
        let x = startX;
        headers.forEach((h, i) => {
            doc.rect(x, y0, colWidths[i], alturaHeader).fill(AZUL);
            doc.fillColor(BLANCO);
            doc.text(h, x + cellPad, y0 + 4, { width: colWidths[i] - cellPad * 2, align: 'center' });
            x += colWidths[i];
        });
        doc.y = y0 + alturaHeader;
    }

    if (doc.y > ALTO_PAG - MARGEN - alturaHeader - 14) doc.addPage();
    header();

    rows.forEach(r => {
        doc.fontSize(7).font('Helvetica');
        let rowH = cellPad * 2 + 4;
        r.forEach((cell, i) => {
            const h = doc.heightOfString(val(cell), { width: colWidths[i] - cellPad * 2, fontSize: 7 });
            if (h > rowH) rowH = h;
        });

        if (doc.y + rowH > ALTO_PAG - MARGEN) {
            doc.addPage();
            header();
        }

        const y0 = doc.y;
        let x = startX;
        r.forEach((cell, i) => {
            doc.y = y0 + cellPad;
            doc.fillColor(NEGRO).font('Helvetica').fontSize(7)
               .text(val(cell), x + cellPad, y0 + cellPad, { width: colWidths[i] - cellPad * 2, align: 'center' });
            doc.rect(x, y0, colWidths[i], rowH)
               .strokeColor('#cccccc').lineWidth(0.5).stroke();
            x += colWidths[i];
        });
        doc.y = y0 + rowH;
    });
}

function generarInforme(datos, salida) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: MARGEN, autoFirstPage: true });
            const stream = fs.createWriteStream(salida);
            doc.pipe(stream);

            const d = datos || {};

            // ── Título ──────────────────────────────────────────────
            doc.fillColor(NEGRO).fontSize(16).font('Helvetica-Bold')
               .text('INFORME DE FORMACIÓN', MARGEN, MARGEN, { width: ANCHO_UTIL, align: 'center' });
            const yLinea = doc.y + 4;
            doc.moveTo(MARGEN, yLinea)
               .lineTo(ANCHO_PAG - MARGEN, yLinea)
               .strokeColor(NEGRO).lineWidth(1).stroke();
            doc.moveDown(0.5);

            // ── 1. Resumen ─────────────────────────────────────────
            seccion(doc, '1. Resumen de la capacitación');
            tablaKV(doc, [
                ['Nombre de la capacitación', d.nombre],
                ['Duración',                 d.duracion],
                ['Modalidad',                d.modalidad],
                ['Fecha de inicio',          d.fecha_inicio],
                ['Fecha de finalización',    d.fecha_fin],
                ['Participantes que inician', d.part_inicia],
                ['Participantes que aprueban', d.part_aprueba],
                ['N.º de mujeres',           d.mujeres],
                ['N.º de hombres',           d.hombres],
            ]);

            // ── 2. Datos del Instructor/a ──────────────────────────
            seccion(doc, '2. Datos del Instructor/a');
            tablaKV(doc, [
                ['Nombres y apellidos', d.inst_nombre],
                ['D.N.I.:',            d.inst_dni],
                ['Teléfono',           d.inst_tel],
                ['Mail',               d.inst_mail],
            ]);

            // ── 3. Desarrollo ──────────────────────────────────────
            seccion(doc, '3. Desarrollo');
            subSeccion(doc, 'Objetivo general');
            parrafo(doc, d.obj_general);
            subSeccion(doc, 'Objetivos específicos');
            lista(doc, splitLines(d.obj_especificos));
            subSeccion(doc, 'Temario');
            lista(doc, splitLines(d.temario));
            subSeccion(doc, 'Metodología utilizada');
            parrafo(doc, d.metodologia);
            subSeccion(doc, 'Dosificación por clase');
            const clases = Array.isArray(d.clases) ? d.clases : [];
            if (clases.length) {
                const rows = clases.map((c, i) => [i + 1, c]);
                tabla(doc, ['Clase', 'Contenido desarrollado'], rows, [50, ANCHO_UTIL - 50]);
            } else {
                vacio(doc, 'Sin contenido registrado.');
            }

            // ── 4. Evaluación ──────────────────────────────────────
            seccion(doc, '4. Evaluación');
            tablaKV(doc, [
                ['Evaluación Teórica',  d.eval_teorica],
                ['Evaluación Práctica', d.eval_practica],
            ]);
            subSeccion(doc, 'Criterios de evaluación:');
            parrafo(doc, 'Puntualidad y asistencia • Participación • Seguimiento de instrucciones • Comprensión de contenidos • Resolución de ejercicios. Escala: 1-10');

            // ── 5. Participantes ───────────────────────────────────
            seccion(doc, '5. Información de los Participantes');
            const participantes = Array.isArray(d.participantes) ? d.participantes : [];
            if (participantes.length) {
                const headers = ['Nombre', 'Puntual', 'Asist. %', 'Participó', 'Instr.', 'Interés', 'Ejerc.', 'Trabajos %', 'Objetivos', 'Calif.'];
                const widths  = [90, 38, 46, 46, 42, 40, 42, 48, 50, 41];
                const rows = participantes.map(p => [
                    emp(p.nombre), emp(p.puntual), emp(p.asistencia), emp(p.participo),
                    emp(p.instrucciones), emp(p.interes), emp(p.ejercicios),
                    emp(p.trabajos), emp(p.objetivos), emp(p.calificacion),
                ]);
                tabla(doc, headers, rows, widths);
            } else {
                vacio(doc, 'Sin participantes registrados.');
            }

            // ── 6. Observaciones ──────────────────────────────────
            seccion(doc, '6. Observaciones');
            parrafo(doc, d.observaciones);

            // ── 7. Recomendaciones ────────────────────────────────
            seccion(doc, '7. Recomendaciones');
            parrafo(doc, d.recomendaciones);

            // ── Firma ──────────────────────────────────────────────
            if (doc.y > ALTO_PAG - MARGEN - 80) doc.addPage();
            doc.moveDown(1);
            doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
               .text(`Ciudad de ${emp(d.ciudad)}, ${emp(d.fecha_firma)}`, MARGEN, doc.y, { width: ANCHO_UTIL });
            doc.moveDown(1.5);
            const lineW = 200;
            const ySig = doc.y;
            doc.moveTo(MARGEN, ySig)
               .lineTo(MARGEN + lineW, ySig)
               .strokeColor(NEGRO).lineWidth(1).stroke();
            doc.moveDown(0.3);
            doc.fontSize(9).font('Helvetica-Bold')
               .text(emp(d.inst_nombre), MARGEN, doc.y, { width: ANCHO_UTIL });
            doc.fontSize(9).font('Helvetica')
               .text(`D.N.I.: ${emp(d.inst_dni)}`, MARGEN, doc.y, { width: ANCHO_UTIL });

            doc.end();
            stream.on('finish', () => resolve(salida));
            stream.on('error', e => reject(e));
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { generarInforme };

// CLI: node generar_informe.js datos.json salida.pdf
if (require.main === module) {
    const argv = process.argv.slice(2);
    if (argv.length < 2) {
        console.error('Uso: node generar_informe.js datos.json salida.pdf');
        process.exit(1);
    }
    let datos;
    try {
        datos = JSON.parse(fs.readFileSync(path.resolve(argv[0]), 'utf8'));
    } catch (e) {
        console.error('Error leyendo JSON:', e.message);
        process.exit(2);
    }
    generarInforme(datos, path.resolve(argv[1]))
        .then(p => console.log('PDF generado:', p))
        .catch(e => { console.error(e); process.exit(3); });
}
