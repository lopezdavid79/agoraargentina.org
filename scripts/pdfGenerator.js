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
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({
      tagged: true,
      format: opts.format || 'A4',
      landscape: opts.landscape || false,
    });
    return buffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generarPdfAccesible };
