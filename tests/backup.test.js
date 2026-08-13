// tests/backup.test.js
// Unit tests para scripts/backup.js (tarea 6.5, REQ-MIG-06).

const { buildBackupName, runPgDump } = require('../scripts/backup');

describe('buildBackupName (REQ-MIG-06)', () => {
  test('genera nombre con timestamp YYYYMMDD-HHmmss', () => {
    const name = buildBackupName('pre-load', new Date(2026, 7, 13, 10, 5, 7));
    expect(name).toBe('pre-load-20260813-100507.sql');
  });

  test('rellena con ceros los componentes de un dígito', () => {
    const name = buildBackupName('post-load', new Date(2026, 0, 3, 9, 0, 0));
    expect(name).toBe('post-load-20260103-090000.sql');
  });
});

describe('runPgDump', () => {
  test('ejecuta pg_dump con la URL y el archivo de salida', async () => {
    const execFile = jest.fn((cmd, args, cb) => cb(null, '', ''));
    const log = { error: jest.fn(), info: jest.fn() };

    const result = await runPgDump('postgresql://user:pass@host/db', 'data/backups/pre-load-20260813.sql', {
      execFile,
      log,
    });

    expect(execFile).toHaveBeenCalledTimes(1);
    expect(execFile.mock.calls[0][0]).toBe('pg_dump');
    expect(execFile.mock.calls[0][1]).toEqual([
      'postgresql://user:pass@host/db',
      '--file',
      'data/backups/pre-load-20260813.sql',
      '--no-owner',
    ]);
    expect(result).toBe('data/backups/pre-load-20260813.sql');
  });

  test('rechaza con error cuando pg_dump falla', async () => {
    const execFile = jest.fn((cmd, args, cb) => cb(new Error('pg_dump: connection failed'), '', 'stderr content'));
    const log = { error: jest.fn() };

    await expect(
      runPgDump('postgresql://user:pass@host/db', 'data/backups/x.sql', { execFile, log })
    ).rejects.toThrow('pg_dump: connection failed');
  });
});
