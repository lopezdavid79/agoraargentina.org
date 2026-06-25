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
  let mockUpdate;
  let mockDelete;
  let mockDoc;
  let mockWhere;
  let mockLimit;
  let mockSubDoc;
  let mockDocCollection;
  let mockModOrderBy;

  beforeEach(() => {
    // Build the Firestore query chain for all patterns used:
    //   .collection('noticias').orderBy('fecha', 'desc').get()
    //   .collection('cursos').get()
    //   .collection('usuarios').where('username', '==', x).limit(1).get()
    //   .collection('noticias').add(data)
    //   .collection('cursos').doc(slug).set(data)
    //   .collection('capacitaciones').doc(slug).set(data)
    //   → NEW:  .doc(id).update(data)
    //   → NEW:  .doc(id).delete()
    //   → NEW:  .doc(id).collection('modulos').add(data)
    //   → NEW:  .doc(id).collection('modulos').doc(idMod).delete()
    mockGet = jest.fn();
    mockOrderBy = jest.fn(() => ({ get: mockGet }));
    mockAdd = jest.fn();
    mockSet = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();
    mockLimit = jest.fn(() => ({ get: mockGet }));
    mockWhere = jest.fn(() => ({ limit: mockLimit }));
    mockModOrderBy = jest.fn(() => ({ get: mockGet }));
    mockSubDoc = jest.fn(() => ({ delete: mockDelete, update: mockUpdate, get: mockGet }));
    mockDocCollection = jest.fn(() => ({
      add: mockAdd,
      doc: mockSubDoc,
      get: mockGet,
      orderBy: mockModOrderBy
    }));
    mockDoc = jest.fn(() => ({ set: mockSet, get: mockGet, update: mockUpdate, delete: mockDelete, collection: mockDocCollection }));

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

  // ──────────────────────────────────────────────
  // PUT /admin/noticias/editar/:id — update
  // ──────────────────────────────────────────────
  describe('PUT /admin/noticias/editar/:id', () => {
    test('updates noticia via .update() and redirects to /admin/dashboard', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockUpdate.mockResolvedValue();

      const res = await agent
        .put('/admin/noticias/editar/noticia123')
        .send({
          titulo: 'Noticia Actualizada',
          copete: 'Copete actualizado',
          contenido: 'Contenido actualizado',
          imagenUrl: 'https://example.com/new.jpg',
          alt: 'Nueva imagen',
          slug: 'noticia-actualizada'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');

      expect(db.collection).toHaveBeenCalledWith('noticias');
      expect(mockDoc).toHaveBeenCalledWith('noticia123');
      expect(mockUpdate).toHaveBeenCalledTimes(1);

      const updateData = mockUpdate.mock.calls[0][0];
      expect(updateData.titulo).toBe('Noticia Actualizada');
      expect(updateData.fecha).toBeInstanceOf(Date);
      expect(updateData.fechaActualizacion).toBeInstanceOf(Date);
    });

    test('returns 500 when Firebase update fails', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockUpdate.mockRejectedValue(new Error('Firebase error'));

      const res = await agent
        .put('/admin/noticias/editar/noticia123')
        .send({ titulo: 'Falla' });

      expect(res.status).toBe(500);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /admin/noticias/eliminar/:id — delete
  // ──────────────────────────────────────────────
  describe('DELETE /admin/noticias/eliminar/:id', () => {
    test('deletes noticia via .delete() and redirects to /admin/dashboard', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockDelete.mockResolvedValue();

      const res = await agent.delete('/admin/noticias/eliminar/noticia123');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');
      expect(db.collection).toHaveBeenCalledWith('noticias');
      expect(mockDoc).toHaveBeenCalledWith('noticia123');
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when Firebase delete fails', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockDelete.mockRejectedValue(new Error('Firebase error'));

      const res = await agent.delete('/admin/noticias/eliminar/noticia123');

      expect(res.status).toBe(500);
    });
  });

  // ──────────────────────────────────────────────
  // PUT /admin/cursos/editar/:id — updateCurso
  // ──────────────────────────────────────────────
  describe('PUT /admin/cursos/editar/:id', () => {
    test('updates curso and redirects to /admin/cursos', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockUpdate.mockResolvedValue();

      const res = await agent
        .put('/admin/cursos/editar/curso-uno')
        .send({
          titulo: 'Curso Actualizado',
          descripcionCorta: 'Descripción nueva',
          modalidad: 'Presencial',
          duracion: '12 semanas',
          objetivoGeneral: 'Nuevo objetivo',
          objetivos: 'Obj1\nObj2\nObj3',
          temario: 'Tema1\nTema2',
          imagen: 'https://example.com/img.jpg',
          alt: 'Imagen curso',
          urlInscrip: 'https://example.com/inscribir'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');
      expect(mockUpdate).toHaveBeenCalledTimes(1);

      const updateData = mockUpdate.mock.calls[0][0];
      expect(updateData.titulo).toBe('Curso Actualizado');
      expect(updateData.descripcion).toBe('Descripción nueva');
      expect(updateData.objetivos).toEqual(['Obj1', 'Obj2', 'Obj3']);
      expect(updateData.temario).toEqual(['Tema1', 'Tema2']);
      expect(updateData.fechaActualizacion).toBeInstanceOf(Date);
    });

    test('returns 500 when Firebase update fails', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockUpdate.mockRejectedValue(new Error('Firebase error'));

      const res = await agent
        .put('/admin/cursos/editar/curso-uno')
        .send({ titulo: 'Falla', descripcionCorta: 'x' });

      expect(res.status).toBe(500);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /admin/cursos/eliminar/:id — deleteCurso
  // ──────────────────────────────────────────────
  describe('DELETE /admin/cursos/eliminar/:id', () => {
    test('deletes curso and redirects to /admin/cursos', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockDelete.mockResolvedValue();

      const res = await agent.delete('/admin/cursos/eliminar/curso-uno');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/cursos');
      expect(db.collection).toHaveBeenCalledWith('cursos');
      expect(mockDoc).toHaveBeenCalledWith('curso-uno');
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when Firebase delete fails', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockDelete.mockRejectedValue(new Error('Firebase error'));

      const res = await agent.delete('/admin/cursos/eliminar/curso-uno');

      expect(res.status).toBe(500);
    });
  });

  // ──────────────────────────────────────────────
  // PUT /admin/capacitaciones/editar/:id — updateCapacitacion
  // ──────────────────────────────────────────────
  describe('PUT /admin/capacitaciones/editar/:id', () => {
    test('updates capacitacion and redirects to dashboard', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockUpdate.mockResolvedValue();

      const res = await agent
        .put('/admin/capacitaciones/editar/cap-uno')
        .send({
          titulo: 'Capacitación Actualizada',
          descripcion: 'Nueva descripción',
          categoria: 'Testing',
          instructor: 'María',
          privado: 'on',
          link_vivo: 'https://zoom.us/j/new',
          estado: 'publicado',
          infoClase: 'Clase especial'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');
      expect(mockUpdate).toHaveBeenCalledTimes(1);

      const updateData = mockUpdate.mock.calls[0][0];
      expect(updateData.titulo).toBe('Capacitación Actualizada');
      expect(updateData.privado).toBe(true);
      expect(updateData.estado).toBe('publicado');
      expect(updateData.fechaActualizacion).toBeInstanceOf(Date);
    });

    test('returns 400 when titulo is empty', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const res = await agent
        .put('/admin/capacitaciones/editar/cap-uno')
        .send({ titulo: '   ' });

      expect(res.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    test('returns 500 when Firebase update fails', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockUpdate.mockRejectedValue(new Error('Generic error'));

      const res = await agent
        .put('/admin/capacitaciones/editar/cap-uno')
        .send({ titulo: 'Capacitación' });

      expect(res.status).toBe(500);
    });

    test('returns 404 when Firebase reports NOT_FOUND', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const notFoundError = new Error('Document not found');
      notFoundError.code = 5;
      mockUpdate.mockRejectedValue(notFoundError);

      const res = await agent
        .put('/admin/capacitaciones/editar/cap-uno')
        .send({ titulo: 'Capacitación' });

      expect(res.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /admin/capacitaciones/eliminar/:id — deleteCapacitacion
  // ──────────────────────────────────────────────
  describe('DELETE /admin/capacitaciones/eliminar/:id', () => {
    test('deletes capacitacion and redirects to dashboard', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockDelete.mockResolvedValue();

      const res = await agent.delete('/admin/capacitaciones/eliminar/cap-uno');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');
      expect(db.collection).toHaveBeenCalledWith('capacitaciones');
      expect(mockDoc).toHaveBeenCalledWith('cap-uno');
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when Firebase delete fails', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockDelete.mockRejectedValue(new Error('Firebase error'));

      const res = await agent.delete('/admin/capacitaciones/eliminar/cap-uno');

      expect(res.status).toBe(500);
    });
  });

  // ──────────────────────────────────────────────
  // POST /admin/capacitaciones/:id/modulos/nuevo — storeModulo
  // ──────────────────────────────────────────────
  describe('POST /admin/capacitaciones/:id/modulos/nuevo', () => {
    test('creates modulo in subcollection and redirects', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockAdd.mockResolvedValue({ id: 'mod-new' });

      const res = await agent
        .post('/admin/capacitaciones/cap-uno/modulos/nuevo')
        .send({
          orden: '1',
          tituloModulo: 'Módulo 1',
          descripcion: 'Descripción del módulo',
          claseGrabada: 'https://youtube.com/embed/abc',
          linkMaterial: 'https://drive.google.com/file'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/admin\/capacitaciones\/cap-uno\/modulos/);
      expect(db.collection).toHaveBeenCalledWith('capacitaciones');
      expect(mockDoc).toHaveBeenCalledWith('cap-uno');
      expect(mockDocCollection).toHaveBeenCalledWith('modulos');
      expect(mockAdd).toHaveBeenCalledTimes(1);

      const addData = mockAdd.mock.calls[0][0];
      expect(addData.orden).toBe(1);
      expect(addData.tituloModulo).toBe('Módulo 1');
      expect(addData.fechaCreacion).toBeInstanceOf(Date);
    });

    test('returns 400 when tituloModulo or orden is missing', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const res = await agent
        .post('/admin/capacitaciones/cap-uno/modulos/nuevo')
        .send({ tituloModulo: 'Solo título' });

      expect(res.status).toBe(400);
      expect(mockAdd).not.toHaveBeenCalled();
    });

    test('returns 500 when Firebase add fails', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockAdd.mockRejectedValue(new Error('Firebase error'));

      const res = await agent
        .post('/admin/capacitaciones/cap-uno/modulos/nuevo')
        .send({ orden: '1', tituloModulo: 'Módulo' });

      expect(res.status).toBe(500);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /admin/capacitaciones/:idCap/modulos/eliminar/:idMod — deleteModulo
  // ──────────────────────────────────────────────
  describe('DELETE /admin/capacitaciones/:idCap/modulos/eliminar/:idMod', () => {
    test('deletes modulo and redirects', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockDelete.mockResolvedValue();

      const res = await agent.delete('/admin/capacitaciones/cap-uno/modulos/eliminar/mod123');

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/admin\/capacitaciones\/cap-uno\/modulos/);
      expect(db.collection).toHaveBeenCalledWith('capacitaciones');
      expect(mockDoc).toHaveBeenCalledWith('cap-uno');
      expect(mockDocCollection).toHaveBeenCalledWith('modulos');
      expect(mockSubDoc).toHaveBeenCalledWith('mod123');
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    test('returns 500 when Firebase delete fails', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockDelete.mockRejectedValue(new Error('Firebase error'));

      const res = await agent.delete('/admin/capacitaciones/cap-uno/modulos/eliminar/mod123');

      expect(res.status).toBe(500);
    });
  });
});
