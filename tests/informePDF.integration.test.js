// Mock firebase before requiring app
jest.mock('../config/firebase', () => ({
  collection: jest.fn()
}));

// Mock express-rate-limit to prevent blocking
jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

// Mock bcryptjs for login flow
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

// Mock pdfGenerator to avoid real Puppeteer
jest.mock('../scripts/pdfGenerator', () => ({
  generarPdfAccesible: jest.fn()
}));

const request = require('supertest');
const app = require('../app');
const db = require('../config/firebase');
const bcrypt = require('bcryptjs');
const { generarPdfAccesible } = require('../scripts/pdfGenerator');

const adminUserSnapshot = {
  empty: false,
  docs: [{
    id: 'admin123',
    data: () => ({
      username: 'admin',
      password: '$2a$10$hashed',
      rol: 'admin',
      name: 'Admin User',
      mail: 'admin@example.com',
      tel: '123456789'
    })
  }]
};

async function loginAsAdmin(agent) {
  const mockGet = jest.fn().mockResolvedValue(adminUserSnapshot);
  db.collection.mockReturnValue({
    orderBy: jest.fn(() => ({ get: mockGet })),
    get: mockGet,
    add: jest.fn(),
    doc: jest.fn(() => ({ get: mockGet, set: jest.fn(), update: jest.fn(), delete: jest.fn() })),
    where: jest.fn(() => ({ limit: jest.fn(() => ({ get: mockGet })) }))
  });
  bcrypt.compare.mockResolvedValue(true);
  await agent.post('/login').send({ username: 'admin', password: 'any' });
  return mockGet;
}

describe('GET /admin/informes/:id/pdf — integración', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('devuelve 200 con Content-Type application/pdf cuando el informe existe', async () => {
    const agent = request.agent(app);
    const mockGet = await loginAsAdmin(agent);

    // Mock Firestore to return a valid report
    const reportData = {
      nombre: 'Capacitación Testing',
      duracion: '20 horas',
      modalidad: 'Virtual',
      fecha_inicio: '01/06/2026',
      fecha_fin: '30/06/2026',
      part_inicia: '10',
      part_aprueba: '9',
      mujeres: '6',
      hombres: '4',
      inst_nombre: 'Juan Pérez',
      inst_dni: '30.123.456',
      inst_tel: '+54 11 5555-0202',
      inst_mail: 'juan@example.com',
      obj_general: 'Capacitar en testing automatizado.',
      obj_especificos: 'Escribir tests unitarios\nIntegrar CI/CD',
      temario: 'Jest básico\nMocks\nIntegración continua',
      metodologia: 'Clases virtuales sincrónicas.',
      clases: ['Introducción', 'Jest avanzado', 'CI/CD'],
      eval_teorica: '85%',
      eval_practica: '80%',
      observaciones: '',
      recomendaciones: '',
      ciudad: 'Córdoba',
      fecha_firma: '20 de junio de 2026',
      participantes: [
        { nombre: 'Lucía Gómez', puntual: 'Sí', asistencia: '100', participo: 'Sí', instrucciones: '9', interes: '10', ejercicios: '8', trabajos: '95', objetivos: 'Sí', calificacion: '9' },
      ],
    };

    // Set up Firestore mock for the report query
    const reportSnapshot = {
      exists: true,
      data: () => reportData,
    };

    // The first mockGet resolves to admin login; we need a separate mock
    // for the report query.  The controller calls:
    //   db.collection('informes').doc(id).get()
    const docGet = jest.fn().mockResolvedValue(reportSnapshot);
    db.collection.mockReturnValue({
      doc: jest.fn(() => ({ get: docGet })),
    });

    generarPdfAccesible.mockResolvedValue(Buffer.from('%PDF-1.7 tagged test data'));

    const res = await agent.get('/admin/informes/test-123/pdf');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toMatch(/^attachment;/);
    expect(Buffer.isBuffer(res.body)).toBe(true);
  });

  test('devuelve 500 cuando Firestore falla', async () => {
    const agent = request.agent(app);
    await loginAsAdmin(agent);

    // Firestore doc().get() rejects
    const docGet = jest.fn().mockRejectedValue(new Error('Firestore unavailable'));
    db.collection.mockReturnValue({
      doc: jest.fn(() => ({ get: docGet })),
    });

    const res = await agent.get('/admin/informes/id-firestore-fail/pdf');

    expect(res.status).toBe(500);
    // Verify no PDF header was leaked
    if (Buffer.isBuffer(res.body)) {
      expect(res.body.slice(0, 4).toString()).not.toBe('%PDF');
    }
  });

  test('devuelve 500 cuando el template falla', async () => {
    const agent = request.agent(app);
    const mockGet = await loginAsAdmin(agent);

    // Firestore returns valid data, but we mock pdfGenerator to reject
    const reportSnapshot = {
      exists: true,
      data: () => ({
        nombre: 'Test',
        duracion: '10h',
        modalidad: 'Virtual',
        fecha_inicio: '01/01/2026',
        fecha_fin: '10/01/2026',
        part_inicia: '5',
        part_aprueba: '5',
        mujeres: '3',
        hombres: '2',
        inst_nombre: 'Test Instructor',
        inst_dni: '00.000.000',
        inst_tel: '+54 111',
        inst_mail: 'test@test.com',
        obj_general: 'Testing.',
        obj_especificos: 'Test 1',
        temario: 'Tema 1\nTema 2',
        metodologia: 'Virtual',
        clases: ['Clase 1'],
        eval_teorica: '90%',
        eval_practica: '90%',
        observaciones: '',
        recomendaciones: '',
        ciudad: 'Bs As',
        fecha_firma: 'Enero 2026',
        participantes: [],
      }),
    };

    const docGet = jest.fn().mockResolvedValue(reportSnapshot);
    db.collection.mockReturnValue({
      doc: jest.fn(() => ({ get: docGet })),
    });

    // Template renders OK but Puppeteer fails → triggers pdfGenerator catch
    generarPdfAccesible.mockRejectedValue(new Error('Chrome crashed'));

    const res = await agent.get('/admin/informes/id-template-fail/pdf');

    expect(res.status).toBe(500);
  });
});
