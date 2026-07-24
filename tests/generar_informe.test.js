const { generarPdfAccesible } = require('../scripts/pdfGenerator');
const ejs = require('ejs');
const path = require('path');

// Sample report data matching the EJS template
const sampleData = {
  nombre: 'Capacitación en Accesibilidad Web',
  duracion: '40 horas',
  modalidad: 'Presencial',
  fecha_inicio: '01/03/2026',
  fecha_fin: '30/04/2026',
  part_inicia: '15',
  part_aprueba: '13',
  mujeres: '8',
  hombres: '7',
  inst_nombre: 'María García',
  inst_dni: '28.123.456',
  inst_tel: '+54 11 5555-0101',
  inst_mail: 'maria@example.com',
  obj_general: 'Capacitar en principios de accesibilidad web (WCAG 2.2).',
  obj_especificos: 'Comprender criterios de conformidad\nAplicar técnicas ARIA\nEvaluar accesibilidad con herramientas',
  temario: 'Introducción a la accesibilidad\nWCAG 2.2: principios y criterios\nARIA: roles y propiedades',
  metodologia: 'Clases teórico-prácticas con ejercicios en laboratorio.',
  clases: ['Fundamentos de accesibilidad', 'Evaluación con Lighthouse', 'ARIA avanzado'],
  eval_teorica: '80%',
  eval_practica: '75%',
  observaciones: 'Buen compromiso del grupo.',
  recomendaciones: 'Continuar con capacitación avanzada en ARIA.',
  ciudad: 'Buenos Aires',
  fecha_firma: '15 de mayo de 2026',
  participantes: [
    { nombre: 'Ana López', puntual: 'Sí', asistencia: '100', participo: 'Sí', instrucciones: '9', interes: '10', ejercicios: '8', trabajos: '95', objetivos: 'Sí', calificacion: '9' },
    { nombre: 'Carlos Pérez', puntual: 'Sí', asistencia: '90', participo: 'Sí', instrucciones: '8', interes: '9', ejercicios: '7', trabajos: '85', objetivos: 'Sí', calificacion: '8' },
  ],
};

describe('generarPdfAccesible — integración con template EJS', () => {
  let mockPage;
  let mockBrowser;
  let puppeteer;

  beforeEach(() => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from(
        '%PDF-1.7\n1 0 obj<</Type/Catalog/StructTreeRoot 2 0 R/Lang(es-AR)>>\nendobj\n%%EOF'
      )),
    };
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    puppeteer = { launch: jest.fn().mockResolvedValue(mockBrowser) };
  });

  test('el pipeline template + pdfGenerator produce buffer con StructTreeRoot y Lang es-AR', async () => {
    const html = await ejs.renderFile(
      path.join(__dirname, '..', 'views', 'pdf', 'informe.ejs'),
      { locals: sampleData },
      {}
    );

    const buffer = await generarPdfAccesible(html, { format: 'A4' }, puppeteer);

    // Verify page.pdf was called with tagged: true
    expect(mockPage.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ tagged: true, format: 'A4' })
    );

    // Verify the PDF buffer contains accessibility markers
    const content = buffer.toString('utf8');
    expect(content).toContain('/StructTreeRoot');
    expect(content).toContain('/Lang(es-AR)');
    expect(content).toMatch(/^%PDF/);
  });

  test('el HTML renderizado contiene estructura semántica accesible', async () => {
    const html = await ejs.renderFile(
      path.join(__dirname, '..', 'views', 'pdf', 'informe.ejs'),
      { locals: sampleData },
      {}
    );

    expect(html).toMatch(/<html[^>]*lang="es-AR"/);
    expect(html).toContain('<h1>');
    expect(html).toContain('<h2>');
    expect(html).toContain('<table>');
    expect(html).toContain('<caption>');
    expect(html).toContain('<th scope=');
    expect(html).toContain('<title>');
    expect(html).toContain('<meta name="author"');
  });

  test('el HTML renderizado contiene los datos del informe', async () => {
    const html = await ejs.renderFile(
      path.join(__dirname, '..', 'views', 'pdf', 'informe.ejs'),
      { locals: sampleData },
      {}
    );

    expect(html).toContain('Capacitación en Accesibilidad Web');
    expect(html).toContain('María García');
    expect(html).toContain('Ana López');
    expect(html).toContain('Carlos Pérez');
  });

  test('maneja datos vacíos sin errores', async () => {
    const html = await ejs.renderFile(
      path.join(__dirname, '..', 'views', 'pdf', 'informe.ejs'),
      { locals: {} },
      {}
    );

    // Should render without crashing
    expect(html).toContain('<h1>INFORME DE FORMACIÓN</h1>');
    expect(html).toContain('—'); // fallback markers for empty data

    // Should still produce a valid PDF shape
    mockPage.pdf.mockResolvedValue(Buffer.from('%PDF-1.7\n/StructTreeRoot\n/Lang(es-AR)\n%%EOF'));
    const buffer = await generarPdfAccesible(html, {}, puppeteer);

    expect(buffer.toString('utf8')).toContain('/StructTreeRoot');
    expect(mockPage.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ tagged: true })
    );
  });
});
