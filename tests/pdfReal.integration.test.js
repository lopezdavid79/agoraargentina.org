/**
 * Real-PDF integration test: verifies tagged PDF structure using real Chromium.
 *
 * Skipped automatically if Chromium is not available or
 * SKIP_REAL_PDF_TEST=true is set.
 */

const ejs = require('ejs');
const path = require('path');

let chromiumAvailable = true;
let puppeteer;
try {
  puppeteer = require('puppeteer');
  puppeteer.executablePath(); // throws if not found
} catch {
  chromiumAvailable = false;
}

const skipReason = process.env.SKIP_REAL_PDF_TEST
  ? 'SKIP_REAL_PDF_TEST env var is set'
  : !chromiumAvailable
    ? 'Chromium not available (run: npx puppeteer browsers install chrome)'
    : null;

const { generarPdfAccesible } = require('../scripts/pdfGenerator');

const sampleData = {
  nombre: 'Capacitación en Accesibilidad Web',
  duracion: '40 horas', modalidad: 'Presencial',
  fecha_inicio: '01/03/2026', fecha_fin: '30/04/2026',
  part_inicia: '15', part_aprueba: '13', mujeres: '8', hombres: '7',
  inst_nombre: 'María García', inst_dni: '28.123.456',
  inst_tel: '+54 11 5555-0101', inst_mail: 'maria@example.com',
  obj_general: 'Capacitar en principios de accesibilidad web (WCAG 2.2).',
  obj_especificos: 'Comprender criterios de conformidad\nAplicar técnicas ARIA\nEvaluar accesibilidad con herramientas',
  temario: 'Introducción a la accesibilidad\nWCAG 2.2: principios y criterios\nARIA: roles y propiedades',
  metodologia: 'Clases teórico-prácticas con ejercicios en laboratorio.',
  clases: ['Fundamentos de accesibilidad', 'Evaluación con Lighthouse', 'ARIA avanzado'],
  eval_teorica: '80%', eval_practica: '75%',
  observaciones: 'Buen compromiso del grupo.',
  recomendaciones: 'Continuar con capacitación avanzada en ARIA.',
  ciudad: 'Buenos Aires', fecha_firma: '15 de mayo de 2026',
  participantes: [
    { nombre: 'Ana López', puntual: 'Sí', asistencia: '100', participo: 'Sí',
      instrucciones: '9', interes: '10', ejercicios: '8', trabajos: '95',
      objetivos: 'Sí', calificacion: '9' },
    { nombre: 'Carlos Pérez', puntual: 'Sí', asistencia: '90', participo: 'Sí',
      instrucciones: '8', interes: '9', ejercicios: '7', trabajos: '85',
      objetivos: 'Sí', calificacion: '8' },
  ],
};

describe('PDF real con Chromium — tagged PDF/UA', () => {
  // eslint-disable-next-line jest/no-conditional-in-test
  const testFn = skipReason ? test.skip : test;

  testFn('genera PDF con marcadores de accesibilidad reales', async () => {
    const html = await ejs.renderFile(
      path.join(__dirname, '..', 'views', 'pdf', 'informe.ejs'),
      { locals: sampleData },
      {}
    );

    const raw = await generarPdfAccesible(html, { format: 'A4' });
    // Puppeteer returns Uint8Array — convert to Buffer for readable access
    const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);

    // Verify it's a real PDF
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
    expect(buffer.length).toBeGreaterThan(1000);

    // Verify tagged PDF markers (real Chromium output, not mock)
    const content = buffer.toString('latin1');
    expect(content).toContain('/StructTreeRoot');
    expect(content).toContain('/MarkInfo');
    expect(content).toContain('/Lang');
  });

  testFn('incluye metadatos del idioma es-AR', async () => {
    const html = await ejs.renderFile(
      path.join(__dirname, '..', 'views', 'pdf', 'informe.ejs'),
      { locals: sampleData },
      {}
    );

    const raw = await generarPdfAccesible(html, { format: 'A4' });
    const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const content = buffer.toString('latin1');

    expect(content).toContain('es-AR');
  });
});
