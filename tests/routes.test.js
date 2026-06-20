// Mock firebase before requiring app (routes import firebase)
jest.mock('../config/firebase', () => ({
  collection: jest.fn()
}));

const request = require('supertest');
const app = require('../app');

describe('GET /health', () => {
  test('returns 200 with status, uptime, and env', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('uptime');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body).toHaveProperty('env');
  });

  test('returns env matching NODE_ENV', async () => {
    const res = await request(app).get('/health');

    expect(res.body.env).toBe('test');
  });
});

describe('404 handler', () => {
  test('returns 404 and renders error view for unknown routes', async () => {
    const res = await request(app).get('/nonexistent-route');

    expect(res.status).toBe(404);
    expect(res.text).toContain('Página no encontrada');
    expect(res.text).toContain('Volver al inicio');
  });

  test('error view renders with correct status code in HTML', async () => {
    const res = await request(app).get('/this-does-not-exist');

    expect(res.status).toBe(404);
    // The status code should be visible in the rendered error view
    expect(res.text).toContain('404');
  });
});

describe('error middleware', () => {
  test('calls next(err) triggers error middleware with correct status', () => {
    // Direct unit test of the error middleware behavior
    // We verify the error view renders correctly by checking 404 first
    // which proves the view engine and error template work
    const express = require('express');
    const testApp = express();
    testApp.set('view engine', 'ejs');
    testApp.set('views', require('path').join(__dirname, '..', 'views'));

    // Add a route that throws
    testApp.get('/trigger-error', (req, res, next) => {
      const err = new Error('Test error');
      err.status = 500;
      next(err);
    });

    // Copy the error middleware from app.js
    testApp.use((err, req, res, next) => {
      const status = err.status || 500;
      const message = err.message || 'Error interno del servidor';
      res.status(status).render('error', { status, message });
    });

    return request(testApp)
      .get('/trigger-error')
      .expect(500)
      .then((res) => {
        expect(res.text).toContain('500');
        expect(res.text).toContain('Test error');
        expect(res.text).toContain('Volver al inicio');
      });
  });
});
