const fs = require('fs');
const path = require('path');
const { generarCv } = require('../scripts/generar_cv');

describe('generarCv', () => {
  const outDir = path.join(__dirname, '..', 'test-output');
  beforeAll(() => { if (!fs.existsSync(outDir)) fs.mkdirSync(outDir); });
  test('genera un PDF básico (todos los campos)', async () => {
    const salida = path.join(outDir, 'cv_test_full.pdf');
    const datos = {
      nombre: 'Juana Martínez',
      titulo: 'Ingeniera de Software',
      ubicacion: 'Buenos Aires, Argentina',
      telefono: '+54 9 11 1234 5678',
      email: 'juana@example.com',
      linkedin: 'https://www.linkedin.com/in/juana-martinez',
      perfil: 'Profesional con 5 años de experiencia en desarrollo full-stack. Apasionada por la accesibilidad y buenas prácticas.',
      masInfo: 'Disponibilidad: inmediata\nPermiso de trabajo: Sí',
      habilidades: 'JavaScript\nNode.js\nReact\nSQL\nTesting',
      experiencias: [
        {
          cargo: 'Desarrolladora Full-Stack',
          empresa: 'Acme Tech',
          periodo: '2020 - Presente',
          tareas: 'Desarrollo de APIs en Node.js.\nImplementación de interfaces en React.\nLiderazgo técnico de equipo pequeño.'
        },
        {
          cargo: 'Desarrolladora Junior',
          empresa: 'Startup XYZ',
          periodo: '2018 - 2020',
          tareas: 'Mantenimiento de plataforma web. Automatización de pruebas.'
        }
      ],
      educaciones: [
        { titulo: 'Lic. en Sistemas', institucion: 'Universidad Nacional', periodo: '2014 - 2018' }
      ],
      idiomas: [
        { idioma: 'Español', nivel: 'Nativo' },
        { idioma: 'Inglés', nivel: 'Avanzado' }
      ]
    };
    await generarCv(datos, salida);
    expect(fs.existsSync(salida)).toBe(true);
    const buf = fs.readFileSync(salida);
    const header = buf.slice(0, 4).toString('utf8');
    expect(header).toBe('%PDF');
  }, 10000);
});
