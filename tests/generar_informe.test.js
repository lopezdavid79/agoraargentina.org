const fs = require('fs');
const path = require('path');
const { generarPdf } = require('../scripts/generar_informe');

describe('generarPdf', () => {
  const outDir = path.join(__dirname, '..', 'test-output');
  beforeAll(() => { if (!fs.existsSync(outDir)) fs.mkdirSync(outDir); });
  test('genera un PDF de informe básico', async () => {
    const salida = path.join(outDir, 'informe_test.pdf');
    const datos = { nombre: 'Capacitación X', duracion: '4 horas', inst_nombre: 'Instructor' };
    await generarPdf(datos, salida);
    expect(fs.existsSync(salida)).toBe(true);
    const buf = fs.readFileSync(salida);
    const header = buf.slice(0, 4).toString('utf8');
    expect(header).toBe('%PDF');
  }, 10000);
});
