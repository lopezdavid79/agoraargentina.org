const { validateEnv } = require('../config/validateEnv');

describe('validateEnv', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    // Set all required vars so tests explicitly override what they need to
    process.env.SESSION_SECRET = 'test-secret';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';
    process.env.EMAIL_USER = 'test@test.com';
    process.env.EMAIL_PASS = 'test-pass';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test('does not exit when all required variables are present', () => {
    const exitMock = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const errorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    validateEnv();

    expect(exitMock).not.toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();

    exitMock.mockRestore();
    errorMock.mockRestore();
  });

  test('exits with code 1 when SESSION_SECRET is missing', () => {
    delete process.env.SESSION_SECRET;
    const exitMock = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const errorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    validateEnv();

    expect(errorMock).toHaveBeenCalledWith(
      '[validateEnv] Missing required environment variable: SESSION_SECRET'
    );
    expect(exitMock).toHaveBeenCalledWith(1);

    exitMock.mockRestore();
    errorMock.mockRestore();
  });

  test('logs all missing variables before exiting', () => {
    delete process.env.SESSION_SECRET;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.EMAIL_USER;
    const exitMock = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const errorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    validateEnv();

    expect(errorMock).toHaveBeenCalledWith(
      '[validateEnv] Missing required environment variable: SESSION_SECRET'
    );
    expect(errorMock).toHaveBeenCalledWith(
      '[validateEnv] Missing required environment variable: FIREBASE_PROJECT_ID'
    );
    expect(errorMock).toHaveBeenCalledWith(
      '[validateEnv] Missing required environment variable: EMAIL_USER'
    );
    expect(errorMock).toHaveBeenCalledTimes(3);
    expect(exitMock).toHaveBeenCalledWith(1);

    exitMock.mockRestore();
    errorMock.mockRestore();
  });

  test('exits when FIREBASE_PRIVATE_KEY is missing', () => {
    delete process.env.FIREBASE_PRIVATE_KEY;
    const exitMock = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const errorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    validateEnv();

    expect(errorMock).toHaveBeenCalledWith(
      '[validateEnv] Missing required environment variable: FIREBASE_PRIVATE_KEY'
    );
    expect(exitMock).toHaveBeenCalledWith(1);

    exitMock.mockRestore();
    errorMock.mockRestore();
  });
});
