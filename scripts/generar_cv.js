const fs   = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ── Paleta del modelo SN ──────────────────────────────────────
const ROJO       = '#EA4E4E';   // acento principal del tema
const NEGRO      = '#1A1A1A';   // texto principal
const GRIS       = '#555555';   // texto secundario
const BLANCO     = '#FFFFFF';

// ── Layout A4 ─────────────────────────────────────────────────
const ANCHO_PAG  = 595;
const ALTO_PAG   = 842;
const COL_IZQ_W  = 175;        // ancho columna izquierda
const MARGEN_IZQ = 18;         // margen interno col izquierda
const MARGEN_DER = 22;         // margen interno col derecha
const X_DER      = COL_IZQ_W + MARGEN_DER;
const ANCHO_DER  = ANCHO_PAG - COL_IZQ_W - MARGEN_DER - 18;
const HEADER_H   = 88;         // alto del header rojo

function _truncate(s, n) { return s ? String(s).slice(0, n) : ''; }

// Dibuja título de sección: texto grande + línea roja debajo
function seccionDer(doc, texto, y) {
    doc.fillColor(NEGRO).fontSize(14).font('Helvetica-Bold')
       .text(texto, X_DER, y, { width: ANCHO_DER });
    const yLinea = doc.y + 2;
    doc.moveTo(X_DER, yLinea)
       .lineTo(ANCHO_PAG - 18, yLinea)
       .strokeColor(ROJO).lineWidth(2).stroke();
    return yLinea + 8;
}

// Título de sección columna izquierda
function seccionIzq(doc, texto, y) {
    doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold')
       .text(texto, MARGEN_IZQ, y, { width: COL_IZQ_W - MARGEN_IZQ * 2 });
    const yLinea = doc.y + 2;
    doc.moveTo(MARGEN_IZQ, yLinea)
       .lineTo(COL_IZQ_W - MARGEN_IZQ, yLinea)
       .strokeColor(ROJO).lineWidth(1.5).stroke();
    return yLinea + 8;
}

function generarCv(datos, salida) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
      const stream = fs.createWriteStream(salida);
      doc.pipe(stream);

      // ── Normalizar datos ─────────────────────────────────────
      const nombre    = datos.nombre    || '';
      const titulo    = datos.titulo    || '';
      const ubicacion = datos.ubicacion || '';
      const telefono  = datos.telefono  || '';
      const email     = datos.email     || '';
      const linkedin  = datos.linkedin  || '';
      const perfil    = datos.perfil    || '';
      const masInfo   = datos.masInfo   || datos.mas_info || '';

      const habilidadesArr = (datos.habilidades || '').split('\n').map(l => l.trim()).filter(Boolean);
      const masInfoArr     = masInfo.split('\n').map(l => l.trim()).filter(Boolean);

      let experiencias = Array.isArray(datos.experiencias) ? datos.experiencias
        : (datos.experiencias ? JSON.parse(String(datos.experiencias)) : []);
      let educaciones  = Array.isArray(datos.educaciones)  ? datos.educaciones
        : (datos.educaciones  ? JSON.parse(String(datos.educaciones))  : []);
      let idiomas      = Array.isArray(datos.idiomas)      ? datos.idiomas
        : (datos.idiomas      ? JSON.parse(String(datos.idiomas))      : []);

      experiencias = experiencias.map(x => ({
        cargo:   _truncate(x.cargo,   120),
        empresa: _truncate(x.empresa, 120),
        periodo: _truncate(x.periodo,  60),
        tareas:  _truncate(x.tareas, 2000)
      }));
      educaciones = educaciones.map(x => ({
        titulo:      _truncate(x.titulo,       150),
        institucion: _truncate(x.institucion,  150),
        periodo:     _truncate(x.periodo,       60)
      }));
      idiomas = idiomas.map(x => ({
        idioma: _truncate(x.idioma, 80),
        nivel:  _truncate(x.nivel,  80)
      }));

      // ── FONDO COLUMNA IZQUIERDA (blanco, sin fondo) ──────────
      // La col izq es blanca igual que el fondo, sin relleno

      // ── HEADER ROJO (col derecha) ─────────────────────────────
      doc.rect(COL_IZQ_W, 0, ANCHO_PAG - COL_IZQ_W, HEADER_H).fill(ROJO);

      // Nombre en blanco, mayúsculas, grande
      doc.fillColor(BLANCO).fontSize(28).font('Helvetica-Bold')
         .text(nombre.toUpperCase(), X_DER, 28, { width: ANCHO_DER, characterSpacing: 1 });
      if (titulo) {
        doc.fontSize(11).font('Helvetica')
           .text(titulo, X_DER, doc.y + 2, { width: ANCHO_DER });
      }

      // ── INICIALES EN CÍRCULO (col izquierda, superpuesto al header) ─
      const iniciales = nombre.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
      const cx = COL_IZQ_W / 2;
      const cy = HEADER_H / 2 + 4;
      const radio = 36;
      doc.circle(cx, cy, radio).lineWidth(3).strokeColor(ROJO).stroke();
      doc.fillColor(ROJO).fontSize(22).font('Helvetica-Bold')
         .text(iniciales, cx - 18, cy - 13, { width: 36, align: 'center' });

      // ── COLUMNA IZQUIERDA ─────────────────────────────────────
      let yIzq = HEADER_H + 22;

      // Perfil profesional
      if (perfil) {
        yIzq = seccionIzq(doc, 'PERFIL PROFESIONAL', yIzq);
        doc.fillColor(NEGRO).fontSize(8.5).font('Helvetica')
           .text(perfil, MARGEN_IZQ, yIzq, {
             width: COL_IZQ_W - MARGEN_IZQ * 2,
             lineGap: 2
           });
        yIzq = doc.y + 16;
      }

      // Habilidades
      if (habilidadesArr.length > 0) {
        yIzq = seccionIzq(doc, 'HABILIDADES', yIzq);
        habilidadesArr.forEach(h => {
          doc.fillColor(NEGRO).fontSize(8.5).font('Helvetica')
             .text(h, MARGEN_IZQ, yIzq, { width: COL_IZQ_W - MARGEN_IZQ * 2, lineGap: 2 });
          yIzq = doc.y + 4;
        });
        yIzq += 8;
      }

      // Idiomas
      if (idiomas.length > 0) {
        yIzq = seccionIzq(doc, 'IDIOMAS', yIzq);
        idiomas.forEach(id => {
          if (!id.idioma) return;
          doc.fillColor(NEGRO).fontSize(8.5).font('Helvetica-Bold')
             .text(id.idioma, MARGEN_IZQ, yIzq, { width: COL_IZQ_W - MARGEN_IZQ * 2 });
          yIzq = doc.y;
          if (id.nivel) {
            doc.fillColor(GRIS).fontSize(8).font('Helvetica')
               .text(id.nivel, MARGEN_IZQ, yIzq, { width: COL_IZQ_W - MARGEN_IZQ * 2 });
            yIzq = doc.y;
          }
          yIzq += 6;
        });
        yIzq += 4;
      }

      // Más información (col izquierda)
      if (masInfoArr.length > 0) {
        yIzq = seccionIzq(doc, 'INFORMACIÓN ADICIONAL', yIzq);
        masInfoArr.forEach(item => {
          doc.fillColor(NEGRO).fontSize(8.5).font('Helvetica')
             .text(item, MARGEN_IZQ, yIzq, { width: COL_IZQ_W - MARGEN_IZQ * 2, lineGap: 2 });
          yIzq = doc.y + 4;
        });
      }

      // ── COLUMNA DERECHA ───────────────────────────────────────
      let yDer = HEADER_H + 20;

      // Experiencia
      if (experiencias.length > 0) {
        yDer = seccionDer(doc, 'EXPERIENCIA', yDer);

        experiencias.forEach(exp => {
          if (!exp.cargo && !exp.empresa) return;

          // Cargo • Empresa • Periodo (en mayúsculas, pequeño)
          const encabezado = [exp.cargo, exp.empresa, exp.periodo].filter(Boolean).join(' \u2022 ');
          doc.fillColor(NEGRO).fontSize(8.5).font('Helvetica-Bold')
             .text(encabezado.toUpperCase(), X_DER, yDer, { width: ANCHO_DER });
          yDer = doc.y + 3;

          // Tareas
          if (exp.tareas) {
            exp.tareas.split('\n').forEach(tarea => {
              tarea = tarea.trim();
              if (!tarea) return;
              doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
                 .text(tarea, X_DER, yDer, { width: ANCHO_DER, lineGap: 2 });
              yDer = doc.y + 2;
            });
          }
          yDer += 10;
        });
      }

      // Educación
      if (educaciones.length > 0) {
        // Salto de página si no hay espacio
        if (yDer > ALTO_PAG - 120) { doc.addPage(); yDer = 30; }
        yDer = seccionDer(doc, 'EDUCACIÓN', yDer);

        educaciones.forEach(edu => {
          if (!edu.titulo && !edu.institucion) return;
          const encabezado = [edu.titulo, edu.periodo, edu.institucion].filter(Boolean).join(' \u2022 ');
          doc.fillColor(NEGRO).fontSize(8.5).font('Helvetica-Bold')
             .text(encabezado.toUpperCase(), X_DER, yDer, { width: ANCHO_DER });
          yDer = doc.y + 10;
        });
      }

      // ── FOOTER DE CONTACTO ────────────────────────────────────
      // Footer: línea grande centrada en mayúsculas con los datos de contacto
      const yFooter = ALTO_PAG - 52;

      const contactos = [];
      if (telefono)  contactos.push(telefono);
      if (email)     contactos.push(email);
      if (ubicacion) contactos.push(ubicacion);
      if (linkedin)  contactos.push(linkedin);

      if (contactos.length > 0) {
        doc.fillColor(NEGRO).fontSize(13).font('Helvetica-Bold')
           .text(contactos.join('  |  ').toUpperCase(), 18, yFooter,
             { width: ANCHO_PAG - 36, align: 'center' });
      }

      doc.end();
      stream.on('finish', () => resolve(salida));
      stream.on('error',  e => reject(e));
    } catch(e) {
      reject(e);
    }
  });
}

module.exports = { generarCv };

// CLI: node generar_cv.js datos.json salida.pdf
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Uso: node generar_cv.js datos.json salida.pdf');
    process.exit(1);
  }
  let datos;
  try { datos = JSON.parse(fs.readFileSync(path.resolve(argv[0]), 'utf8')); }
  catch(e) { console.error('Error leyendo JSON:', e.message); process.exit(2); }
  generarCv(datos, path.resolve(argv[1]))
    .then(p => console.log('PDF generado:', p))
    .catch(e => { console.error(e); process.exit(3); });
}
