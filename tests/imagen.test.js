const { normalizeImageUrl } = require('../config/imagen');

describe('normalizeImageUrl', () => {
  test('devuelve cadena vacía para valores vacíos', () => {
    expect(normalizeImageUrl(null)).toBe('');
    expect(normalizeImageUrl(undefined)).toBe('');
    expect(normalizeImageUrl('')).toBe('');
    expect(normalizeImageUrl('   ')).toBe('');
  });

  test('limpia el valor con coma tomando la URL absoluta', () => {
    expect(normalizeImageUrl('curso-documentos-accesibles.webp,https://agoraargentina.ar/curso-documentos-accesibles.webp'))
      .toBe('https://agoraargentina.ar/curso-documentos-accesibles.webp');
  });

  test('con coma y sin absoluta, toma el último segmento no vacío', () => {
    expect(normalizeImageUrl('a.webp,b.webp')).toBe('b.webp');
  });

  test('deja intactas URLs absolutas', () => {
    expect(normalizeImageUrl('https://via.placeholder.com/400x250?text=Test'))
      .toBe('https://via.placeholder.com/400x250?text=Test');
  });

  test('deja intactas rutas relativas', () => {
    expect(normalizeImageUrl('/images/cursos/123-curso-image.jpg'))
      .toBe('/images/cursos/123-curso-image.jpg');
  });

  test('prefija nombres sueltos con el prefijo indicado', () => {
    expect(normalizeImageUrl('curso-documentos-accesibles.webp', '/images/cursos'))
      .toBe('/images/cursos/curso-documentos-accesibles.webp');
  });

  test('no duplica el slash cuando el prefijo ya termina en /', () => {
    expect(normalizeImageUrl('foto.png', '/images/noticias/'))
      .toBe('/images/noticias/foto.png');
  });
});