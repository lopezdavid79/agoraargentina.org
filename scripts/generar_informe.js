const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

// Helper: dibuja una línea horizontal
function hr(doc, y, width) {
  doc.save();
  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
  doc.restore();
}

function escribirKV(doc, label, value, x, y, labelWidth, lineHeight) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1a4b8c').text(label, x, y, {width: labelWidth});
  doc.font('Helvetica').fontSize(9).fillColor('black').text(String(value || '—'), x + labelWidth + 8, y, {width: doc.page.width - doc.page.margins.right - (x + labelWidth + 8)});
  return y + lineHeight;
}

function generarPdf(datos, salida) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({size: 'A4', margins: {top: 56, bottom: 56, left: 56, right: 56}});
      const stream = fs.createWriteStream(salida);
      doc.pipe(stream);

      const W_UTIL = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Título
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#000').text('INFORME DE FORMACIÓN', {align: 'center'});
      doc.moveDown(0.2);
      hr(doc, doc.y, W_UTIL);
      doc.moveDown(0.5);

      // 1. Resumen
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a4b8c').text('1. Resumen de la capacitación');
      doc.moveDown(0.2);

      let curY = doc.y;
      const leftX = doc.x;
      const labelWidth = 120;
      const lineHeight = 18;

      const summary = [
        ['Nombre de la capacitación', datos.nombre || ''],
        ['Duración', datos.duracion || ''],
        ['Modalidad', datos.modalidad || ''],
        ['Fecha de inicio', datos.fecha_inicio || ''],
        ['Fecha de finalización', datos.fecha_fin || ''],
        ['Participantes que inician', datos.part_inicia || ''],
        ['Participantes que aprueban', datos.part_aprueba || ''],
        ['N.º de mujeres', datos.mujeres || ''],
        ['N.º de hombres', datos.hombres || '']
      ];

      summary.forEach(([lbl, val]) => {
        curY = escribirKV(doc, lbl, val, leftX, curY, labelWidth, lineHeight);
      });

      doc.y = curY + 8;

      // 2. Instructor
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a4b8c').text('2. Datos del Instructor/a');
      doc.moveDown(0.1);
      curY = doc.y;
      [['Nombres y apellidos','inst_nombre'], ['D.I.','inst_dni'], ['Teléfono','inst_tel'], ['Mail','inst_mail']]
        .forEach(([lbl, key]) => {
          curY = escribirKV(doc, lbl, datos[key] || '', leftX, curY, labelWidth, lineHeight);
        });

      doc.y = curY + 8;

      // 3. Desarrollo
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a4b8c').text('3. Desarrollo');
      doc.moveDown(0.1);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text('Objetivo general');
      doc.font('Helvetica').fontSize(9).fillColor('black').text(datos.obj_general || '—');
      doc.moveDown(0.2);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text('Objetivos específicos');
      (String(datos.obj_especificos || '').split('\n') || []).forEach(line => {
        if (line && line.trim()) doc.text('• ' + line.trim(), {indent: 8});
      });
      doc.moveDown(0.2);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text('Temario');
      (String(datos.temario || '').split('\n') || []).forEach(line => {
        if (line && line.trim()) doc.text('• ' + line.trim(), {indent: 8});
      });
      doc.moveDown(0.2);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text('Metodología utilizada');
      doc.font('Helvetica').fontSize(9).text(datos.metodologia || '—');
      doc.moveDown(0.2);

      // Dosificación por clase
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text('Dosificación por clase');
      doc.moveDown(0.1);
      const clases = datos.clases || [];
      if (clases.length) {
        // simple two-column table
        const tableLeft = doc.x;
        const col1 = 40;
        const col2 = W_UTIL - col1;
        // header
        doc.font('Helvetica-Bold').fontSize(9).fillColor('white').rect(tableLeft, doc.y, col1, 16).fill('#1a4b8c');
        doc.fillColor('white').text('Clase', tableLeft + 4, doc.y + 3, {width: col1 - 8});
        doc.rect(tableLeft + col1, doc.y, col2, 16).fill('#eef3ff');
        doc.fillColor('black').font('Helvetica-Bold').text('Contenido desarrollado', tableLeft + col1 + 4, doc.y + 3, {width: col2 - 8});
        doc.moveDown(1);
        clases.forEach((c, i) => {
          doc.font('Helvetica').fontSize(9).fillColor('black').text(String(i+1), tableLeft + 4);
          doc.text(String(c || ''), tableLeft + col1 + 4, doc.y - 12, {width: col2 - 8});
          doc.moveDown(0.6);
        });
      } else {
        doc.font('Helvetica').fontSize(9).text('Sin contenido registrado.');
      }

      doc.moveDown(0.3);

      // 4. Evaluación
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a4b8c').text('4. Evaluación');
      doc.moveDown(0.1);
      escribirKV(doc, 'Evaluación Teórica', datos.eval_teorica || '', leftX, doc.y, labelWidth, lineHeight);
      doc.moveDown(0.1);
      escribirKV(doc, 'Evaluación Práctica', datos.eval_practica || '', leftX, doc.y, labelWidth, lineHeight);
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').fontSize(10).text('Criterios de evaluación:');
      doc.font('Helvetica').fontSize(9).text('Puntualidad y asistencia • Participación • Seguimiento de instrucciones • Comprensión de contenidos • Resolución de ejercicios. Escala: 1-10');

      doc.moveDown(0.3);

      // 5. Participantes
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a4b8c').text('5. Información de los Participantes');
      doc.moveDown(0.1);
      const participantes = datos.participantes || [];
      if (participantes && participantes.length) {
        // header row
        const cols = ['Nombre','Puntual','Asist. %','Participó','Instr.','Interés','Ejerc.','Trabajos %','Objetivos','Calif.'];
        const colWidth = (W_UTIL) / cols.length;
        cols.forEach((c, i) => {
          doc.font('Helvetica-Bold').fontSize(7).fillColor('white').rect(doc.x + i*colWidth, doc.y, colWidth, 14).fill('#1a4b8c');
          doc.fillColor('white').text(c, doc.x + i*colWidth + 2, doc.y + 3, {width: colWidth - 4, align: 'center'});
        });
        doc.moveDown(1);
        participantes.forEach(p => {
          cols.forEach((c, i) => {
            const val = {
              'Nombre': p.nombre || '', 'Puntual': p.puntual || '', 'Asist. %': p.asistencia || '', 'Participó': p.participo || '',
              'Instr.': p.instrucciones || '', 'Interés': p.interes || '', 'Ejerc.': p.ejercicios || '', 'Trabajos %': p.trabajos || '',
              'Objetivos': p.objetivos || '', 'Calif.': p.calificacion || ''
            }[c];
            doc.font('Helvetica').fontSize(7).fillColor('black').text(String(val), doc.x + i*colWidth + 2, doc.y, {width: colWidth - 4, align: 'center'});
          });
          doc.moveDown(0.9);
        });
      } else {
        doc.font('Helvetica').fontSize(9).text('Sin participantes registrados.');
      }

      doc.moveDown(0.8);

      // 6 & 7 Observaciones y Recomendaciones
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a4b8c').text('6. Observaciones');
      doc.font('Helvetica').fontSize(9).text(datos.observaciones || '—');
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a4b8c').text('7. Recomendaciones');
      doc.font('Helvetica').fontSize(9).text(datos.recomendaciones || '—');

      doc.moveDown(1.2);

      // Firma
      doc.font('Helvetica').fontSize(9).text(`Ciudad de ${datos.ciudad || ''},  ${datos.fecha_firma || ''}`);
      doc.moveDown(1.2);
      const sigX = doc.x;
      doc.moveTo(sigX, doc.y).lineTo(sigX + 120, doc.y).stroke();
      doc.moveDown(0.2);
      doc.font('Helvetica').text(datos.inst_nombre || '');
      doc.text(`D.I.: ${datos.inst_dni || ''}`);

      doc.end();

      stream.on('finish', () => resolve(salida));
      stream.on('error', (e) => reject(e));
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generarPdf };

// CLI support
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Uso: node generar_informe.js datos.json salida.pdf');
    process.exit(1);
  }
  const datosPath = path.resolve(argv[0]);
  const salidaPath = path.resolve(argv[1]);
  const datos = JSON.parse(fs.readFileSync(datosPath, 'utf8'));
  generarPdf(datos, salidaPath).then(p => console.log('PDF generado:', p)).catch(err => { console.error(err); process.exit(2); });
}
