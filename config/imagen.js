/**
 * Normaliza un valor de imagen (campo `imagen` de cursos / `imagenUrl` de
 * noticias) a una única URL válida para usar en <img src>.
 *
 * - Vacío -> ''
 * - Valor con coma (dato legacy inválido: "relativo,absoluta") -> se queda con
 *   el segmento absoluto (http/https) si existe; si no, con el último segmento
 *   no vacío.
 * - Absoluto (http/https) o relativo (/...) -> se devuelve tal cual.
 * - Nombre suelto (sin / ni esquema) -> se prefija con `defaultPrefix`
 *   (ej. '/images/cursos') para que sea una ruta servible.
 *
 * @param {*} value - valor almacenado (puede ser null/undefined)
 * @param {string} [defaultPrefix] - ej. '/images/cursos' o '/images/noticias'
 * @returns {string}
 */
function normalizeImageUrl(value, defaultPrefix) {
  if (value === null || value === undefined) return '';
  let v = String(value).trim();
  if (!v) return '';

  // Dato legacy malformado: "archivo.webp,https://dominio/archivo.webp"
  if (v.includes(',')) {
    const parts = v.split(',').map(s => s.trim()).filter(Boolean);
    v = parts.find(p => /^https?:\/\//i.test(p)) || parts[parts.length - 1] || '';
  }

  if (!v) return '';
  if (/^https?:\/\//i.test(v) || v.startsWith('/')) return v;

  if (defaultPrefix) {
    return `${String(defaultPrefix).replace(/\/+$/, '')}/${v.replace(/^\/+/, '')}`;
  }
  return v;
}

module.exports = { normalizeImageUrl };