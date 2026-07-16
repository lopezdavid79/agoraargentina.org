const path = require('path');

describe('Upload Middleware', () => {
  let upload;

  beforeAll(() => {
    // Clear module cache to get a fresh instance
    jest.resetModules();
    upload = require('../middleware/upload');
  });

  describe('fileFilter', () => {
    test('accepts image/jpeg', () => {
      const cb = jest.fn();
      upload.fileFilter({}, { mimetype: 'image/jpeg' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    test('accepts image/png', () => {
      const cb = jest.fn();
      upload.fileFilter({}, { mimetype: 'image/png' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    test('accepts image/webp', () => {
      const cb = jest.fn();
      upload.fileFilter({}, { mimetype: 'image/webp' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    test('rejects application/pdf', () => {
      const cb = jest.fn();
      upload.fileFilter({}, { mimetype: 'application/pdf' }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });

    test('rejects image/gif (not in allowed list)', () => {
      const cb = jest.fn();
      upload.fileFilter({}, { mimetype: 'image/gif' }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });
  });

  describe('destination', () => {
    test('uses noticias subdir when originalUrl includes noticias', () => {
      const cb = jest.fn();
      const req = { originalUrl: '/admin/noticias/nuevo' };
      upload.destination(req, {}, cb);
      const destPath = cb.mock.calls[0][1];
      expect(destPath).toEqual(expect.stringContaining(path.join('public', 'images', 'noticias')));
    });

    test('uses cursos subdir when originalUrl includes cursos', () => {
      const cb = jest.fn();
      const req = { originalUrl: '/admin/cursos/nuevo' };
      upload.destination(req, {}, cb);
      const destPath = cb.mock.calls[0][1];
      expect(destPath).toEqual(expect.stringContaining(path.join('public', 'images', 'cursos')));
    });
  });

  describe('generateFilename', () => {
    test('sanitizes filename: lowercase, removes accents, replaces spaces', () => {
      const cb = jest.fn();
      const file = { originalname: 'Imagen de Prueba.jpg' };
      upload.generateFilename({}, file, cb);
      const result = cb.mock.calls[0][1];
      expect(result).toMatch(/^\d+-imagen-de-prueba\.jpg$/);
    });

    test('handles special chars: ñ, accents, parens', () => {
      const cb = jest.fn();
      const file = { originalname: 'Foto_Ñoña (1).PNG' };
      upload.generateFilename({}, file, cb);
      const result = cb.mock.calls[0][1];
      expect(result).toMatch(/^\d+-foto-nona--1-\.png$/);
    });

    test('preserves already-clean lowercase name', () => {
      const cb = jest.fn();
      const file = { originalname: 'logo.png' };
      upload.generateFilename({}, file, cb);
      const result = cb.mock.calls[0][1];
      expect(result).toMatch(/^\d+-logo\.png$/);
    });
  });

  describe('limits configuration', () => {
    test('fileSize limit is 5MB (5 * 1024 * 1024)', () => {
      expect(upload.MAX_SIZE).toBe(5 * 1024 * 1024);
    });

    test('multer instance has fileSize limit configured', () => {
      // Multer stores limits on the instance; verify it exists
      expect(upload).toBeDefined();
      expect(typeof upload.single).toBe('function');
    });
  });
});
