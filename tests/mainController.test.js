// Mock firebase before requiring app (routes import firebase)
jest.mock('../config/firebase', () => ({
  collection: jest.fn()
}));

// Mock nodemailer to prevent actual email sending
jest.mock('nodemailer');

const request = require('supertest');
const app = require('../app');
const nodemailer = require('nodemailer');

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
