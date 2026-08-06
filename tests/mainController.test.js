// Mock firebase before requiring app (routes import firebase)
jest.mock('../config/firebase', () => ({
  collection: jest.fn()
}));

// Mock nodemailer to prevent actual email sending
jest.mock('nodemailer');

const request = require('supertest');
const app = require('../app');
const nodemailer = require('nodemailer');
const db = require('../config/firebase');

describe('POST /contacto — processContacto', () => {
  let sendMailMock;

  beforeEach(() => {
    sendMailMock = jest.fn().mockResolvedValue({});
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
      verify: jest.fn().mockResolvedValue(true)
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('envía email y renderiza contacto con mensaje de éxito', async () => {
    const res = await request(app)
      .post('/contacto')
      .send({
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '123456789',
        asunto: 'Consulta',
        mensaje: 'Hola, quiero información.'
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Mensaje enviado con éxito');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailArg = sendMailMock.mock.calls[0][0];
    expect(mailArg.html).toContain('Juan Pérez');
    expect(mailArg.html).toContain('juan@example.com');
    expect(mailArg.html).toContain('Hola, quiero información.');
  });

  test('sanitiza HTML tags de nombre, email, telefono, asunto y mensaje', async () => {
    const res = await request(app)
      .post('/contacto')
      .send({
        nombre: '<script>alert("xss")</script>Juan',
        email: 'test@test.com',
        telefono: '<b>123456789</b>',
        asunto: 'Test <a href="evil">link</a>',
        mensaje: '<script>alert("xss")</script>Mensaje de prueba'
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Mensaje enviado con éxito');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailArg = sendMailMock.mock.calls[0][0];

    // Los tags HTML deben estar removidos del body del email
    expect(mailArg.html).not.toContain('<script>');
    expect(mailArg.html).not.toContain('<b>');
    expect(mailArg.html).not.toContain('</b>');
    expect(mailArg.html).not.toContain('<a href');
    expect(mailArg.html).not.toContain('</a>');

    // Pero el texto plano debe conservarse
    expect(mailArg.html).toContain('Juan');
    expect(mailArg.html).toContain('123456789');
    expect(mailArg.html).toContain('Mensaje de prueba');
    // asunto va en el subject, no en html
    expect(mailArg.subject).toBe('Nueva Consulta: Test link');
    expect(mailArg.subject).not.toContain('<a href');
  });

  test('maneja teléfono vacío con valor por defecto', async () => {
    const res = await request(app)
      .post('/contacto')
      .send({
        nombre: 'María',
        email: 'maria@example.com',
        telefono: '',
        asunto: 'Consulta',
        mensaje: 'Mensaje sin teléfono'
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Mensaje enviado con éxito');

    const mailArg = sendMailMock.mock.calls[0][0];
    expect(mailArg.html).toContain('No informado');
  });

  test('renderiza error cuando el envío de email falla', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP error'));

    const res = await request(app)
      .post('/contacto')
      .send({
        nombre: 'Juan',
        email: 'juan@test.com',
        telefono: '123',
        asunto: 'Error',
        mensaje: 'Test error'
      });

    expect(res.status).toBe(200); // renderiza la misma vista con error
    expect(res.text).toContain('Hubo un error al enviar el mensaje');
  });
});

describe('GET /capacitaciones/:slug — detailCapacitaciones', () => {
  let mockGet;
  let mockWhere;
  let mockLimit;
  let mockOrderBy;
  let mockDoc;
  let mockDocCollection;

  beforeEach(() => {
    // Firestore query chain for detailCapacitaciones:
    //   .collection('capacitaciones').where('slug','==',slug).limit(1).get()
    //   .collection('capacitaciones').doc(id).collection('modulos').orderBy('orden','asc').get()
    mockGet = jest.fn();
    mockWhere = jest.fn(() => ({ limit: mockLimit }));
    mockLimit = jest.fn(() => ({ get: mockGet }));
    mockOrderBy = jest.fn(() => ({ get: mockGet }));
    mockDoc = jest.fn(() => ({ get: mockGet, collection: mockDocCollection }));
    mockDocCollection = jest.fn(() => ({ orderBy: mockOrderBy }));

    db.collection.mockReturnValue({
      where: mockWhere,
      doc: mockDoc
    });
  });

  const capSnapshot = {
    empty: false,
    docs: [{
      id: 'cap-uno',
      data: () => ({
        titulo: 'Capacitación Uno',
        instructor: 'Profesor',
        categoria: 'Tecnología',
        estado: 'Activo',
        infoClase: 'Orientación',
        link_vivo: ''
      })
    }]
  };

  test('renders one "Clase Grabada" link per grabacion (3 links), legacy claseGrabada not used (spec: "Module with three recordings")', async () => {
    mockGet
      .mockResolvedValueOnce(capSnapshot)
      .mockResolvedValueOnce({
        docs: [{
          id: 'mod1',
          data: () => ({
            orden: 1,
            tituloModulo: 'Módulo con tres grabaciones',
            descripcion: 'Desc',
            activo: true,
            grabaciones: ['https://youtube.com/a', 'https://youtube.com/b', 'https://youtube.com/c'],
            claseGrabada: 'https://youtube.com/legacy'
          })
        }]
      });

    const res = await request(app).get('/capacitaciones/cap-uno');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Módulo con tres grabaciones');
    expect(res.text).toContain('https://youtube.com/a');
    expect(res.text).toContain('https://youtube.com/b');
    expect(res.text).toContain('https://youtube.com/c');
    expect(res.text.match(/Clase Grabada/g)).toHaveLength(3);
    expect(res.text).not.toContain('https://youtube.com/legacy');
  });

  test('renders single "Clase Grabada" link from legacy claseGrabada when grabaciones absent (spec: "Legacy module")', async () => {
    mockGet
      .mockResolvedValueOnce(capSnapshot)
      .mockResolvedValueOnce({
        docs: [{
          id: 'mod2',
          data: () => ({
            orden: 1,
            tituloModulo: 'Módulo legacy',
            descripcion: '',
            activo: true,
            claseGrabada: 'https://youtube.com/legacy-x'
          })
        }]
      });

    const res = await request(app).get('/capacitaciones/cap-uno');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Módulo legacy');
    expect(res.text.match(/Clase Grabada/g)).toHaveLength(1);
    expect(res.text).toContain('https://youtube.com/legacy-x');
  });

  test('renders zero "Clase Grabada" links when module has no recordings', async () => {
    mockGet
      .mockResolvedValueOnce(capSnapshot)
      .mockResolvedValueOnce({
        docs: [{
          id: 'mod3',
          data: () => ({
            orden: 1,
            tituloModulo: 'Módulo sin grabaciones',
            descripcion: '',
            activo: true
          })
        }]
      });

    const res = await request(app).get('/capacitaciones/cap-uno');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Módulo sin grabaciones');
    expect(res.text.match(/Clase Grabada/g)).toBeNull();
    expect(res.text).not.toContain('Video del encuentro virtual');
  });
});
