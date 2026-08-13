/**
 * backup.js — Backups de la base Supabase/Postgres para la migración
 * (REQ-MIG-06): pg_dump pre-carga y post-verificación con timestamp.
 *
 * Uso desde load-supabase.js:
 *   const backup = require('./backup');
 *   const file = backup.buildBackupName('pre-load');
 *   await backup.runPgDump(process.env.DATABASE_URL, `data/backups/${file}`);
 *
 * Requiere `pg_dump` disponible en el PATH y DATABASE_URL en el entorno.
 */

const { execFile } = require('child_process');

/**
 * Nombre de archivo de backup con timestamp: <label>-<YYYYMMDD-HHmmss>.sql
 * @param {string} label Por ejemplo 'pre-load' o 'post-load'
 * @param {Date} [date] Inyectable para tests
 * @returns {string}
 */
function buildBackupName(label, date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${label}-${stamp}.sql`;
}

/**
 * Ejecuta pg_dump sobre la URL de conexión y escribe el archivo.
 * @param {string} databaseUrl Cadena de conexión (DATABASE_URL)
 * @param {string} outFile Ruta del archivo .sql
 * @param {{ execFile?: Function, log?: object }} [options] Inyectable para tests
 * @returns {Promise<string>} La ruta del archivo generado
 */
function runPgDump(databaseUrl, outFile, { execFile: execFileFn = execFile, log = console } = {}) {
  return new Promise((resolve, reject) => {
    execFileFn('pg_dump', [databaseUrl, '--file', outFile, '--no-owner'], (error, stdout, stderr) => {
      if (error) {
        log.error(`✗ pg_dump falló: ${error.message}`);
        if (stderr) log.error(stderr);
        reject(error);
        return;
      }
      log.info(`✓ Backup creado: ${outFile}`);
      resolve(outFile);
    });
  });
}

module.exports = { buildBackupName, runPgDump };
