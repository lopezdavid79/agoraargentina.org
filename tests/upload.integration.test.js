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

const path = require('path');
const fs = require('fs');
const request = require('supertest');
const app = require('../app');
const db = require('../config/firebase');
const bcrypt = require('bcryptjs');

describe('Upload Integration', () => {
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

  // Track uploaded test files for cleanup
  const createdFiles = [];

  beforeAll(() => {
    // Ensure upload directories exist for tests
    const noticiasDir = path.join(__dirname, '..', 'public', 'images', 'noticias');
    const cursosDir = path.join(__dirname, '..', 'public', 'images', 'cursos');
    fs.mkdirSync(noticiasDir, { recursive: true });
    fs.mkdirSync(cursosDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test-uploaded files
    createdFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
  });

  beforeEach(() => {
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

  async function loginAsAdmin(agent) {
    mockGet.mockResolvedValue(adminUserSnapshot);
    bcrypt.compare.mockResolvedValue(true);
    await agent
      .post('/login')
      .send({ username: 'admin', password: 'correct-password' });
  }

  describe('POST /admin/noticias/nuevo with file', () => {
    test('accepts valid JPEG and stores imagenUrl in Firestore', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      // Mock the dashboard GET that happens after redirect
      const dashboardSnapshot = { docs: [] };
      mockGet.mockResolvedValue(dashboardSnapshot);
      mockAdd.mockResolvedValue({ id: 'new-noticia-123' });

      const res = await agent
        .post('/admin/noticias/nuevo')
        .field('titulo', 'Noticia con Imagen')
        .field('copete', 'Copete de prueba')
        .field('contenido', 'Contenido de la noticia')
        .field('slug', 'noticia-con-imagen')
        .field('alt', 'Texto alternativo')
        .attach('imagenUrl', Buffer.from('fake-image-data'), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');

      // Verify Firestore was called with the correct path
      expect(db.collection).toHaveBeenCalledWith('noticias');
      expect(mockAdd).toHaveBeenCalledTimes(1);

      const addedData = mockAdd.mock.calls[0][0];
      expect(addedData.titulo).toBe('Noticia con Imagen');
      expect(addedData.imagenUrl).toMatch(/^\/images\/noticias\/\d+-test-image\.jpg$/);
      expect(addedData.fecha).toBeInstanceOf(Date);

      // Track the file for cleanup
      const filename = addedData.imagenUrl.replace('/images/noticias/', '');
      createdFiles.push(path.join(__dirname, '..', 'public', 'images', 'noticias', filename));
    });

    test('accepts valid PNG upload', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const dashboardSnapshot = { docs: [] };
      mockGet.mockResolvedValue(dashboardSnapshot);
      mockAdd.mockResolvedValue({ id: 'new-noticia-456' });

      const res = await agent
        .post('/admin/noticias/nuevo')
        .field('titulo', 'Noticia PNG')
        .field('copete', 'Copete')
        .field('contenido', 'Contenido')
        .field('slug', 'noticia-png')
        .field('alt', 'Alt text')
        .attach('imagenUrl', Buffer.from('fake-png-data'), {
          filename: 'imagen.png',
          contentType: 'image/png'
        });

      expect(res.status).toBe(302);
      const addedData = mockAdd.mock.calls[0][0];
      expect(addedData.imagenUrl).toMatch(/^\/images\/noticias\/\d+-imagen\.png$/);
    });
  });

  describe('POST /admin/noticias/nuevo without file', () => {
    test('returns 400 when no file and no existing imagenUrl', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      // Send URL-encoded without imagenUrl field
      const res = await agent
        .post('/admin/noticias/nuevo')
        .field('titulo', 'Noticia sin imagen')
        .field('copete', 'Copete')
        .field('contenido', 'Contenido')
        .field('slug', 'noticia-sin-imagen')
        .field('alt', 'Alt');

      expect(res.status).toBe(400);
      expect(res.text).toContain('La imagen es requerida');
      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  describe('POST /admin/noticias/nuevo with oversized file', () => {
    test('returns 413 for file larger than 5MB', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB > 5MB limit

      const res = await agent
        .post('/admin/noticias/nuevo')
        .field('titulo', 'Noticia grande')
        .field('copete', 'Copete')
        .field('contenido', 'Contenido')
        .field('slug', 'noticia-grande')
        .field('alt', 'Alt')
        .attach('imagenUrl', oversizedBuffer, {
          filename: 'big-image.jpg',
          contentType: 'image/jpeg'
        });

      expect(res.status).toBe(413);
      expect(res.text).toContain('Archivo muy grande');
      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  describe('POST /admin/noticias/nuevo with invalid MIME type', () => {
    test('returns 400 for PDF file (non-image MIME)', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const res = await agent
        .post('/admin/noticias/nuevo')
        .field('titulo', 'Noticia PDF')
        .field('copete', 'Copete')
        .field('contenido', 'Contenido')
        .field('slug', 'noticia-pdf')
        .field('alt', 'Alt')
        .attach('imagenUrl', Buffer.from('%PDF-1.4 fake pdf'), {
          filename: 'document.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Tipo no permitido');
      expect(mockAdd).not.toHaveBeenCalled();
    });

    test('returns 400 for GIF file (not in allowed list)', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const res = await agent
        .post('/admin/noticias/nuevo')
        .field('titulo', 'Noticia GIF')
        .field('copete', 'Copete')
        .field('contenido', 'Contenido')
        .field('slug', 'noticia-gif')
        .field('alt', 'Alt')
        .attach('imagenUrl', Buffer.from('fake-gif-data'), {
          filename: 'animation.gif',
          contentType: 'image/gif'
        });

      expect(res.status).toBe(400);
      expect(res.text).toContain('Tipo no permitido');
      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  describe('POST /admin/cursos/nuevo with file', () => {
    test('accepts valid JPEG and stores imagen in Firestore', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      mockSet.mockResolvedValue();

      const res = await agent
        .post('/admin/cursos/nuevo')
        .field('titulo', 'Curso con Imagen')
        .field('descripcionCorta', 'Descripción')
        .field('modalidad', 'Online - Sincrónico')
        .field('duracion', '8 semanas')
        .field('slug', 'curso-con-imagen')
        .field('objetivoGeneral', 'Objetivo')
        .field('objetivos', 'Obj1\nObj2')
        .field('temario', 'Tema1\nTema2')
        .field('alt', 'Texto alt')
        .field('urlInscrip', 'https://example.com/inscribir')
        .attach('imagen', Buffer.from('fake-curso-image'), {
          filename: 'curso-image.jpg',
          contentType: 'image/jpeg'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');

      expect(db.collection).toHaveBeenCalledWith('cursos');
      expect(mockSet).toHaveBeenCalledTimes(1);

      const setData = mockSet.mock.calls[0][0];
      expect(setData.titulo).toBe('Curso con Imagen');
      expect(setData.imagen).toMatch(/^\/images\/cursos\/\d+-curso-image\.jpg$/);
    });
  });

  describe('POST /admin/cursos/nuevo without file', () => {
    test('returns 400 when no file and no existing imagen', async () => {
      const agent = request.agent(app);
      await loginAsAdmin(agent);

      const res = await agent
        .post('/admin/cursos/nuevo')
        .field('titulo', 'Curso sin imagen')
        .field('descripcionCorta', 'Desc')
        .field('modalidad', 'Online')
        .field('duracion', '4 semanas')
        .field('slug', 'curso-sin-imagen')
        .field('objetivoGeneral', 'Obj')
        .field('alt', 'Alt')
        .field('urlInscrip', 'https://example.com/inscribir')
        // No 'imagen' field at all
        ;

      expect(res.status).toBe(400);
      expect(res.text).toContain('La imagen es requerida');
      expect(mockSet).not.toHaveBeenCalled();
    });
  });
});
