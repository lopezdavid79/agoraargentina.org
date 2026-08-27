/**
 * Genera un PDF accesible (tagged) a partir de un string HTML.
 *
 * @param {string} html - HTML renderizado (desde un template EJS)
 * @param {{ format?: 'A4'|'Letter', landscape?: boolean }} [opts={}]
 * @param {object} [puppeteer] - Inyección de dependencia para tests
 * @returns {Promise<Buffer>} Buffer con el contenido del PDF
 */
async function generarPdfAccesible(html, opts = {}, puppeteer) {
  if (!puppeteer) puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const raw = await page.pdf({
      tagged: true,
      format: opts.format || 'A4',
      landscape: opts.landscape || false,
    });
    // Puppeteer v20+ devuelve Uint8Array — Express solo envía Buffer correctamente
    return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  } finally {
    await browser.close();
  }
}

module.exports = { generarPdfAccesible };
