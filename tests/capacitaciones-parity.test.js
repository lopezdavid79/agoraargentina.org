// tests/capacitaciones-parity.test.js
// Tests de paridad (tarea 6.8, REQ-MIG-05): capturan el comportamiento ACTUAL
// de las rutas públicas de capacitaciones del Express/Firebase como baseline
// que la SPA Supabase debe replicar tras el cutover:
//   - /capacitaciones          → solo estado 'Activo' (equivalente a RLS)
//   - /capacitaciones/:slug    → 200 activa, 403 no activa, 404 desconocida
// Usa supertest con firebase mockeado (misma convención que mainController.test.js).

jest.mock('../config/firebase', () => ({
  collection: jest.fn()
}));

const request = require('supertest');
const app = require('../app');
const db = require('../config/firebase');

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /capacitaciones — listado público (baseline Express)', () => {
  test('consulta Firestore filtrando estado == Activo', async () => {
    const where = jest.fn(() => ({
      get: jest.fn(async () => ({ docs: [] }))
    }));
    db.collection.mockReturnValue({ where });

    const res = await request(app).get('/capacitaciones');

    expect(res.status).toBe(200);
    expect(where).toHaveBeenCalledWith('estado', '==', 'Activo');
  });

  test('renderiza solo las capacitaciones activas devueltas por la consulta', async () => {
    db.collection.mockReturnValue({
      where: jest.fn(() => ({
        get: jest.fn(async () => ({
          docs: [
            { id: 'cap-1', data: () => ({ slug: 'cap-1', titulo: 'Cap Activa 1', descripcion: 'D', categoria: 'General', instructor: 'Prof', estado: 'Activo' }) },
            { id: 'cap-2', data: () => ({ slug: 'cap-2', titulo: 'Cap Activa 2', descripcion: 'D', categoria: 'General', instructor: 'Prof', estado: 'Activo' }) }
          ]
        }))
      }))
    });

    const res = await request(app).get('/capacitaciones');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Cap Activa 1');
    expect(res.text).toContain('Cap Activa 2');
  });

  test('renderiza estado vacío cuando no hay capacitaciones activas', async () => {
    db.collection.mockReturnValue({
      where: jest.fn(() => ({
        get: jest.fn(async () => ({ docs: [] }))
      }))
    });

    const res = await request(app).get('/capacitaciones');

    expect(res.status).toBe(200);
    expect(res.text).toContain('No hay capacitaciones disponibles por el momento');
  });
});

describe('GET /capacitaciones/:slug — detalle público (baseline Express)', () => {
  function mockDetail({ capDoc, modulos = [] }) {
    const capGet = jest.fn(async () =>
      capDoc ? { empty: false, docs: [{ id: capDoc.id, data: () => capDoc }] } : { empty: true, docs: [] }
    );
    const modGet = jest.fn(async () => ({ docs: modulos }));
    const modulosQuery = { orderBy: jest.fn(() => ({ get: modGet })) };
    const doc = jest.fn(() => ({ get: capGet, collection: jest.fn(() => modulosQuery) }));
    db.collection.mockReturnValue({
      where: jest.fn(() => ({ limit: jest.fn(() => ({ get: capGet })) })),
      doc
    });
    return { capGet, modGet };
  }

  test('devuelve 200 y renderiza la capacitación activa con sus módulos activos', async () => {
    mockDetail({
      capDoc: {
        id: 'cap-activa',
        titulo: 'Cap Activa',
        instructor: 'Prof',
        categoria: 'General',
        estado: 'Activo',
        infoClase: 'Orientación',
        link_vivo: 'https://meet.google.com/abc'
      },
      modulos: [{
        id: 'mod1',
        data: () => ({
          orden: 1,
          tituloModulo: 'Módulo público',
          descripcion: '',
          activo: true,
          claseGrabada: 'https://vimeo.com/123',
          grabaciones: []
        })
      }]
    });

    const res = await request(app).get('/capacitaciones/cap-activa');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Cap Activa');
    expect(res.text).toContain('Módulo público');
    expect(res.text).toContain('Clase Grabada 1');
  });

  test('devuelve 403 para una capacitación no activa (no se filtra en la URL)', async () => {
    mockDetail({
      capDoc: { id: 'cap-borrador', titulo: 'Cap Borrador', estado: 'borrador' }
    });

    const res = await request(app).get('/capacitaciones/cap-borrador');

    expect(res.status).toBe(403);
    expect(res.text).toContain('Esta capacitación no está disponible.');
  });

  test('devuelve 404 para un slug desconocido', async () => {
    mockDetail({ capDoc: null });

    const res = await request(app).get('/capacitaciones/slug-inexistente');

    expect(res.status).toBe(404);
    expect(res.text).toContain('Capacitación no encontrada');
  });

  test('filtra módulos inactivos del detalle', async () => {
    const { modGet } = mockDetail({
      capDoc: { id: 'cap-activa', titulo: 'Cap Activa', estado: 'Activo' },
      modulos: [
        { id: 'm1', data: () => ({ orden: 1, tituloModulo: 'Visible', activo: true }) },
        { id: 'm2', data: () => ({ orden: 2, tituloModulo: 'Oculto', activo: false }) }
      ]
    });

    const res = await request(app).get('/capacitaciones/cap-activa');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Visible');
    expect(res.text).not.toContain('Oculto');
    expect(modGet).toHaveBeenCalledTimes(1);
  });
});
