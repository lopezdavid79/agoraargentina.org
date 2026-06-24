// Mock firebase before requiring app (authController imports firebase)
jest.mock('../config/firebase', () => ({
  collection: jest.fn()
}));

// Mock bcryptjs to avoid actual password hashing
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

const request = require('supertest');
const app = require('../app');
const db = require('../config/firebase');
const bcrypt = require('bcryptjs');

describe('Auth Controller', () => {
  let mockGet;
  let mockLimit;
  let mockWhere;
  let mockDoc;

  beforeEach(() => {
    // Build the Firestore query chain:
    //   db.collection('usuarios').where('username', '==', x).limit(1).get()
    //   db.collection('usuarios').doc(id).get()
    mockGet = jest.fn();
    mockLimit = jest.fn(() => ({ get: mockGet }));
    mockWhere = jest.fn(() => ({ limit: mockLimit }));
    mockDoc = jest.fn(() => ({ get: mockGet }));

    // collection() supports both query and direct-doc access
    db.collection.mockReturnValue({ where: mockWhere, doc: mockDoc });
  });

  // ──────────────────────────────────────────────
  // GET /login — render login page
  // ──────────────────────────────────────────────
  describe('GET /login', () => {
    test('returns 200 and renders login page', async () => {
      const res = await request(app).get('/login');

      expect(res.status).toBe(200);
      expect(res.text).toContain('Acceso de Administrador');
      expect(res.text).toContain('form action="/login"');
      expect(res.text).toContain('name="username"');
      expect(res.text).toContain('name="password"');
    });
  });

  // ──────────────────────────────────────────────
  // POST /login — authenticate user
  // ──────────────────────────────────────────────
  describe('POST /login', () => {
    const validUserSnapshot = {
      empty: false,
      docs: [{
        id: 'user123',
        data: () => ({
          username: 'admin',
          password: '$2a$10$hashedpassword',
          rol: 'admin',
          name: 'Admin User',
          mail: 'admin@example.com',
          tel: '123456789'
        })
      }]
    };

    const emptySnapshot = { empty: true, docs: [] };

    test('redirects to /admin/dashboard with valid credentials', async () => {
      mockGet.mockResolvedValue(validUserSnapshot);
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'correct-password' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');
    });

    test('returns 401 with error message when password is wrong', async () => {
      mockGet.mockResolvedValue(validUserSnapshot);
      bcrypt.compare.mockResolvedValue(false);

      const res = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.text).toContain('Usuario o contraseña incorrectos');
    });

    test('returns 401 with error message when user does not exist', async () => {
      mockGet.mockResolvedValue(emptySnapshot);

      const res = await request(app)
        .post('/login')
        .send({ username: 'unknown', password: 'any-password' });

      expect(res.status).toBe(401);
      expect(res.text).toContain('Usuario o contraseña incorrectos');
    });

    test('handles server error gracefully (firebase throws)', async () => {
      mockGet.mockRejectedValue(new Error('Firestore connection failed'));

      const res = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'irrelevant' });

      expect(res.status).toBe(500);
      expect(res.text).toContain('Error en el servidor');
    });
  });

  // ──────────────────────────────────────────────
  // GET /logout — destroy session and redirect
  // ──────────────────────────────────────────────
  describe('GET /logout', () => {
    test('destroys session and redirects to /login', async () => {
      const res = await request(app).get('/logout');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });
  });

  // ──────────────────────────────────────────────
  // GET /admin/perfil — user profile (requires auth)
  // ──────────────────────────────────────────────
  describe('GET /admin/perfil', () => {
    test('redirects to /login when not authenticated', async () => {
      const res = await request(app).get('/admin/perfil');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/login');
    });

    test('renders profile page when authenticated', async () => {
      // First — login to establish session
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'user123',
          data: () => ({
            username: 'admin',
            password: '$2a$10$hashed',
            rol: 'admin',
            name: 'Admin User',
            mail: 'admin@example.com',
            tel: '123456789'
          })
        }]
      });
      bcrypt.compare.mockResolvedValue(true);

      const agent = request.agent(app);
      await agent
        .post('/login')
        .send({ username: 'admin', password: 'correct-password' });

      // The login sets session.user with all fields, so showPerfil
      // won't hit Firestore again (no need for additional mock setup)
      const res = await agent.get('/admin/perfil');

      expect(res.status).toBe(200);
      expect(res.text).toContain('Mi Perfil');
      expect(res.text).toContain('admin');
      expect(res.text).toContain('Admin User');
    });
  });
});
