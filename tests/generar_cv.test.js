const fs = require('fs');
const path = require('path');
const { generarCv } = require('../scripts/generar_cv');

describe('generarCv', () => {
  const outDir = path.join(__dirname, '..', 'test-output');
  beforeAll(() => { if (!fs.existsSync(outDir)) fs.mkdirSync(outDir); });
  test('genera un PDF básico', async () => {
    const salida = path.join(outDir, 'cv_test.pdf');
    const datos = { nombre: 'Juan Pérez', perfil: 'Perfil de prueba', telefono: '123' };
    await generarCv(datos, salida);
    expect(fs.existsSync(salida)).toBe(true);
    const buf = fs.readFileSync(salida);
    const header = buf.slice(0, 4).toString('utf8');
    expect(header).toBe('%PDF');
  }, 10000);
});
