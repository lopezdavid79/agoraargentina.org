const { generarInforme } = require('../scripts/generar_informe');
const fs = require('fs');
const os = require('os');
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

describe('generarInforme — generador PDFKit real', () => {
  let outPath;

  afterEach(() => {
    if (outPath && fs.existsSync(outPath)) {
      try { fs.unlinkSync(outPath); } catch (_) {}
    }
    outPath = null;
  });

  test('genera un PDF válido a partir del objeto de datos del informe', async () => {
    outPath = path.join(os.tmpdir(), `informe_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`);

    await generarInforme(sampleData, outPath);

    expect(fs.existsSync(outPath)).toBe(true);
    const buf = fs.readFileSync(outPath);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(500);
  });

  test('maneja datos vacíos sin lanzar error y produce un PDF válido', async () => {
    outPath = path.join(os.tmpdir(), `informe_vacio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`);

    await generarInforme({}, outPath);

    expect(fs.existsSync(outPath)).toBe(true);
    const buf = fs.readFileSync(outPath);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(500);
  });
});
