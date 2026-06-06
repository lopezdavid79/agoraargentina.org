const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
// Export helper for tests: allow injecting a writable stream factory (optional)

// Layout constants (match controller)
const MARGEN     = 50;
const ANCHO_PAG  = 595;
const ALTO_PAG   = 842;
const COL_IZQ    = 180;
const COL_DER    = ANCHO_PAG - COL_IZQ - MARGEN;
const AZUL       = '#3d5a80';
const AZUL_LIGHT = '#d6e4f0';
const BLANCO     = '#ffffff';
const GRIS       = '#555555';
const GRIS_LIGHT = '#f0f4f8';

function _truncate(s, n) { if (!s) return s; return String(s).slice(0, n); }

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

// Generate a CV PDF from a plain object and write to `salida` path.
function generarCv(datos, salida) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const stream = fs.createWriteStream(salida);
      doc.pipe(stream);

      // Parse and normalize incoming fields
      const nombre = datos.nombre || '';
      const ubicacion = datos.ubicacion || '';
      const telefono = datos.telefono || '';
      const email = datos.email || '';
      const direccion = datos.direccion || '';
      const linkedin = datos.linkedin || '';
      const perfil = datos.perfil || '';
      const habilidadesArr = (datos.habilidades || '').split('\n').map(l => l.trim()).filter(Boolean);
      const masInfoArr = (datos.mas_info || datos.masInfo || '').split('\n').map(l => l.trim()).filter(Boolean);

      let experiencias = Array.isArray(datos.experiencias) ? datos.experiencias : (datos.experiencias ? JSON.parse(String(datos.experiencias)) : []);
      let educaciones  = Array.isArray(datos.educaciones)  ? datos.educaciones  : (datos.educaciones  ? JSON.parse(String(datos.educaciones))  : []);
      let idiomas      = Array.isArray(datos.idiomas)      ? datos.idiomas      : (datos.idiomas      ? JSON.parse(String(datos.idiomas))      : []);

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

      // SIDEBAR
      doc.rect(0, 0, COL_IZQ, ALTO_PAG).fill(GRIS_LIGHT);
      let yIzq = 30;
      // Photo placeholder removed — start sidebar content at the top (yIzq remains 30)

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

      // RIGHT COLUMN
      const xDer = COL_IZQ + MARGEN;
      let yDer = 0;
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

      stream.on('finish', () => resolve(salida));
      stream.on('error', (e) => reject(e));
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generarCv };

// CLI support: node scripts/generar_cv.js datos.json salida.pdf
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Uso: node scripts/generar_cv.js datos.json salida.pdf');
    process.exit(1);
  }
  const datosPath = path.resolve(argv[0]);
  const salidaPath = path.resolve(argv[1]);
  let datos;
  try { datos = JSON.parse(fs.readFileSync(datosPath, 'utf8')); } catch (e) { console.error('Error leyendo datos JSON:', e && e.message); process.exit(2); }
  generarCv(datos, salidaPath).then(p => console.log('PDF generado:', p)).catch(err => { console.error(err); process.exit(3); });
}
