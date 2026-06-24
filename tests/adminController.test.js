// Mock firebase before requiring app (adminController imports firebase)
jest.mock('../config/firebase', () => ({
  collection: jest.fn()
}));

// Mock express-rate-limit to prevent blocking after 5 login attempts
jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

// Mock bcryptjs for login flow in authController
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

const request = require('supertest');
const app = require('../app');
const db = require('../config/firebase');
const bcrypt = require('bcryptjs');

describe('Admin Controller', () => {
  let mockGet;
  let mockOrderBy;
  let mockAdd;
  let mockSet;
  let mockDoc;
  let mockWhere;
  let mockLimit;

  beforeEach(() => {
    // Build the Firestore query chain for all patterns used:
    //   .collection('noticias').orderBy('fecha', 'desc').get()
    //   .collection('cursos').get()
    //   .collection('usuarios').where('username', '==', x).limit(1).get()
    //   .collection('noticias').add(data)
    //   .collection('cursos').doc(slug).set(data)
    //   .collection('capacitaciones').doc(slug).set(data)
    mockGet = jest.fn();
    mockOrderBy = jest.fn(() => ({ get: mockGet }));
    mockAdd = jest.fn();
    mockSet = jest.fn();
    mockLimit = jest.fn(() => ({ get: mockGet }));
    mockWhere = jest.fn(() => ({ limit: mockLimit }));
    mockDoc = jest.fn(() => ({ set: mockSet, get: mockGet }));

    db.collection.mockReturnValue({
      orderBy: mockOrderBy,
      get: mockGet,
      add: mockAdd,
      doc: mockDoc,
      where: mockWhere
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  // Helper: authenticate agent as admin user via the login endpoint
  async function loginAsAdmin(agent) {
    mockGet.mockResolvedValue(adminUserSnapshot);
    bcrypt.compare.mockResolvedValue(true);
    await agent
      .post('/login')
      .send({ username: 'admin', password: 'correct-password' });
  }

  // ──────────────────────────────────────────────
  // GET /admin/dashboard — index
  // ──────────────────────────────────────────────
  describe('GET /admin/dashboard', () => {
    test('redirects to /login when not authenticated', async () => {
      const res = await request(app).get('/admin/dashboard');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });

    test('renders dashboard when authenticated as admin', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      // Set up five snapshot responses for the five Firestore queries in index():
      //   1. noticias  → orderBy('fecha', 'desc').get()
      //   2. cursos    → .get()
      //   3. capacitaciones → .get()
      //   4. usuarios  → .get()               (only when rol === 'admin')
      //   5. informes  → orderBy('fecha', 'desc').get()
      const noticiasSnapshot = {
        docs: [
          { id: 'n1', data: () => ({ titulo: 'Noticia 1', fecha: new Date() }) },
          { id: 'n2', data: () => ({ titulo: 'Noticia 2', fecha: new Date() }) }
        ]
      };
      const cursosSnapshot = { docs: [] };
      const capacitacionesSnapshot = { docs: [] };
      const usuariosSnapshot = {
        docs: [
          { id: 'u1', data: () => ({ username: 'user1', name: 'User 1' }) }
        ]
      };
      const informesSnapshot = { docs: [] };

      mockGet
        .mockResolvedValueOnce(noticiasSnapshot)
        .mockResolvedValueOnce(cursosSnapshot)
        .mockResolvedValueOnce(capacitacionesSnapshot)
        .mockResolvedValueOnce(usuariosSnapshot)
        .mockResolvedValueOnce(informesSnapshot);

      const res = await agent.get('/admin/dashboard');

      expect(res.status).toBe(200);
      expect(res.text).toContain('Panel de Administración');
      expect(res.text).toContain('admin'); // user.rol === 'admin'
    });
  });

  // ──────────────────────────────────────────────
  // POST /admin/noticias/nuevo — store
  // ──────────────────────────────────────────────
  describe('POST /admin/noticias/nuevo', () => {
    test('creates noticia via .add() and redirects to /admin/dashboard', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockAdd.mockResolvedValue({ id: 'new-noticia-123' });

      const res = await agent
        .post('/admin/noticias/nuevo')
        .send({
          titulo: 'Nueva Noticia',
          copete: 'Copete de prueba',
          contenido: 'Contenido de la noticia',
          imagenUrl: 'https://example.com/img.jpg',
          alt: 'Imagen de prueba',
          slug: 'nueva-noticia'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');

      // Verify Firestore was called correctly
      expect(db.collection).toHaveBeenCalledWith('noticias');
      expect(mockAdd).toHaveBeenCalledTimes(1);

      const addedData = mockAdd.mock.calls[0][0];
      expect(addedData.titulo).toBe('Nueva Noticia');
      expect(addedData.copete).toBe('Copete de prueba');
      expect(addedData.contenido).toBe('Contenido de la noticia');
      expect(addedData.slug).toBe('nueva-noticia');
      expect(addedData.fecha).toBeInstanceOf(Date);
    });
  });

  // ──────────────────────────────────────────────
  // POST /admin/cursos/nuevo — storeCurso
  // ──────────────────────────────────────────────
  describe('POST /admin/cursos/nuevo', () => {
    test('creates curso via .doc(slug).set() and redirects on success', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockSet.mockResolvedValue();

      const res = await agent
        .post('/admin/cursos/nuevo')
        .send({
          titulo: 'Curso de Node.js',
          descripcionCorta: 'Aprendé Node desde cero',
          modalidad: 'Online',
          duracion: '8 semanas',
          slug: 'curso-node',
          objetivoGeneral: 'Dominar Node.js',
          objetivos: 'Fundamentos\nExpress\nBases de datos',
          temario: 'Intro\nAPI REST\nFirebase',
          imagen: 'https://example.com/node.jpg',
          alt: 'Curso Node',
          urlInscrip: 'https://example.com/inscribir'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');

      // Verify correct collection and document
      expect(db.collection).toHaveBeenCalledWith('cursos');
      expect(mockDoc).toHaveBeenCalledWith('curso-node');
      expect(mockSet).toHaveBeenCalledTimes(1);

      const setData = mockSet.mock.calls[0][0];
      expect(setData.titulo).toBe('Curso de Node.js');
      expect(setData.descripcion).toBe('Aprendé Node desde cero');
      expect(setData.objetivos).toEqual(['Fundamentos', 'Express', 'Bases de datos']);
      expect(setData.temario).toEqual(['Intro', 'API REST', 'Firebase']);
      expect(setData.fechaCreacion).toBeInstanceOf(Date);
    });

    test('returns 400 when slug is empty (validation before firestore)', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const res = await agent
        .post('/admin/cursos/nuevo')
        .send({
          titulo: 'Curso sin slug',
          slug: '   '
        });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Slug es obligatorio');
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // POST /admin/capacitaciones/nuevo — storeCapacitacion
  // ──────────────────────────────────────────────
  describe('POST /admin/capacitaciones/nuevo', () => {
    test('creates capacitacion via .doc(slug).set() and redirects on success', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockSet.mockResolvedValue();

      const res = await agent
        .post('/admin/capacitaciones/nuevo')
        .send({
          titulo: 'Fundamentos de JavaScript',
          descripcion: 'Curso intensivo de JS',
          categoria: 'Desarrollo Web',
          instructor: 'Carlos',
          privado: 'on',
          link_vivo: 'https://zoom.us/j/abc',
          slug: 'fundamentos-js',
          infoClase: 'Clase 1: Variables'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');

      // Verify correct collection
      expect(db.collection).toHaveBeenCalledWith('capacitaciones');
      expect(mockDoc).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledTimes(1);

      const setData = mockSet.mock.calls[0][0];
      expect(setData.titulo).toBe('Fundamentos de JavaScript');
      expect(setData.privado).toBe(true);
      expect(setData.estado).toBe('borrador');
      expect(setData.fecha).toBeInstanceOf(Date);
      expect(setData.creadoPor).toBe('admin123');
    });

    test('returns 400 when titulo is empty (validation before firestore)', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const res = await agent
        .post('/admin/capacitaciones/nuevo')
        .send({
          titulo: '   ',
          descripcion: 'Alguna descripción'
        });

      expect(res.status).toBe(400);
      expect(res.text).toContain('título es obligatorio');
      expect(mockSet).not.toHaveBeenCalled();
    });
  });
});
