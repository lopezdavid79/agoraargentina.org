// Mock firebase before requiring app (informesController imports firebase)
jest.mock('../config/firebase', () => ({
  collection: jest.fn()
}));

// Mock express-rate-limit to prevent blocking after login attempts
jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

// Mock bcryptjs for login flow in authController
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

const request = require('supertest');
const app = require('../app');
const db = require('../config/firebase');
const bcrypt = require('bcryptjs');

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

function baseInformeData(overrides = {}) {
  return {
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
      { nombre: 'Lucía Gómez', puntual: 'Sí', asistencia: '100' }
    ],
    ...overrides
  };
}

describe('GET /admin/informes/editar/:id — edit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('redirects to /login (302) when not authenticated', async () => {
    const res = await request(app).get('/admin/informes/editar/inf-1');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  test('returns 404 when informe doc does not exist', async () => {
    const agent = request.agent(app);
    await loginAsAdmin(agent);

    const docGet = jest.fn().mockResolvedValue({ exists: false });
    db.collection.mockReturnValue({ doc: jest.fn(() => ({ get: docGet })) });

    const res = await agent.get('/admin/informes/editar/inexistente');

    expect(res.status).toBe(404);
  });

  test('renders 200 with pre-filled data for valid informe (spec: valid data still renders)', async () => {
    const agent = request.agent(app);
    await loginAsAdmin(agent);

    const informeDoc = {
      exists: true,
      id: 'inf-valid',
      data: () => baseInformeData()
    };
    const docGet = jest.fn().mockResolvedValue(informeDoc);
    db.collection.mockReturnValue({ doc: jest.fn(() => ({ get: docGet })) });

    const res = await agent.get('/admin/informes/editar/inf-valid');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Editar Informe');
    // clasesText pre-fills the classes block
    expect(res.text).toContain('clasesIniciales = ["Introducción","Jest avanzado","CI/CD"]');
    // participantes array renders into partData
    expect(res.text).toContain('"nombre":"Lucía Gómez"');
    expect(res.text).toContain('input-participantes');
  });

  test('escapes </script> breakout in clases (site 2)', async () => {
    const agent = request.agent(app);
    await loginAsAdmin(agent);

    const breakout = '</script><script>alert(1)</script>';
    const informeDoc = {
      exists: true,
      id: 'inf-clases',
      data: () => baseInformeData({ clases: [breakout], participantes: [] })
    };
    const docGet = jest.fn().mockResolvedValue(informeDoc);
    db.collection.mockReturnValue({ doc: jest.fn(() => ({ get: docGet })) });

    const res = await agent.get('/admin/informes/editar/inf-clases');

    expect(res.status).toBe(200);
    // Payload sequence must NOT survive in the rendered inline script
    expect(res.text).not.toContain('</script><script>alert(1)</script>');
    // Escaped sequence MUST be present (template's own </script> tags are legit)
    expect(res.text).toContain('\\u003c/script\\u003e');
  });

  test('escapes </script> breakout in participantes (site 3)', async () => {
    const agent = request.agent(app);
    await loginAsAdmin(agent);

    const breakout = '</script><script>alert(1)</script>';
    const informeDoc = {
      exists: true,
      id: 'inf-participantes',
      data: () => baseInformeData({
        clases: ['Clase normal'],
        participantes: [{ nombre: breakout, puntual: 'Sí', asistencia: '100' }]
      })
    };
    const docGet = jest.fn().mockResolvedValue(informeDoc);
    db.collection.mockReturnValue({ doc: jest.fn(() => ({ get: docGet })) });

    const res = await agent.get('/admin/informes/editar/inf-participantes');

    expect(res.status).toBe(200);
    // Payload sequence must NOT survive in the rendered inline script
    expect(res.text).not.toContain('</script><script>alert(1)</script>');
    // Escaped sequence MUST be present (template's own </script> tags are legit)
    expect(res.text).toContain('\\u003c/script\\u003e');
  });
});
