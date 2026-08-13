/**
 * load-supabase.js — Carga el transform Firestore → Supabase en orden de
 * dependencias (REQ-MIG-03): profiles → capacitaciones → modulos → grabaciones.
 *
 * Contrato creado_por (CRITICAL 1, REQ-MIG-03): para cada firebase_uid se
 * crea PRIMERO la fila auth.users vía la Admin API de GoTrue (email
 * placeholder + user_metadata.firebase_uid + email_confirm: true); el trigger
 * handle_new_user crea el perfil; el loader solo rellena gaps haciendo upsert
 * del perfil por `id`. Si falta `creadoPor`, el transform apunta al stub
 * compartido y se emite una advertencia.
 *
 * Idempotencia (REQ-MIG-07): upsert por slug / (capacitacion_id,orden) /
 * (modulo_id,posicion) en modo normal; con `--force` trunca las tablas
 * objetivo (orden inverso al de carga) y recarga desde cero.
 *
 * Backups (REQ-MIG-06): pg_dump pre-carga y post-verificación (--skip-backups
 * para desactivar).
 *
 * Variables requeridas (ver .env.example):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL (solo si no se usa
 *   --skip-backups). La clave es service_role: solo scripts de servidor.
 *
 * Uso:
 *   node scripts/load-supabase.js --export data/capacitaciones-export.ndjson
 *   node scripts/load-supabase.js --force
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { transformExport, parseNdjson, STUB_FIREBASE_UID } = require('./transform');
const backup = require('./backup');
const { createSupabaseRestClient } = require('./supabase-rest');

const PLACEHOLDER_DOMAIN = 'agoraargentina.ar';

/**
 * Email placeholder para un firebase_uid legacy (el uid se sanitiza para
 * cumplir el formato del local-part del email; se conserva el caso original).
 * @param {string} uid
 * @returns {string}
 */
function buildPlaceholderEmail(uid) {
  const safe = String(uid)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `legacy-${safe}@${PLACEHOLDER_DOMAIN}`;
}

/**
 * Orden de carga por dependencias (REQ-MIG-03).
 * @returns {string[]}
 */
function buildLoadOrder() {
  return ['profiles', 'capacitaciones', 'modulos', 'grabaciones'];
}

/**
 * Orden de truncado con --force: inverso al de carga (FK-safe, REQ-MIG-07).
 * @returns {string[]}
 */
function buildForceDeletions() {
  return [...buildLoadOrder()].reverse();
}

/**
 * Sustituye el uuid de perfil generado por el transform con el id REAL del
 * perfil (que viene de auth.users, contrato CRITICAL 1).
 * @param {object[]} capacitaciones Filas del transform
 * @param {object} firebaseUidToUuid Mapa uid → uuid (transform)
 * @param {object} byUid Mapa uid → id real del perfil (ensureProfiles)
 * @returns {object[]}
 */
function applyCreadoPor(capacitaciones, firebaseUidToUuid, byUid) {
  const uidByUuid = Object.fromEntries(
    Object.entries(firebaseUidToUuid).map(([uid, uuid]) => [uuid, uid])
  );
  return capacitaciones.map((cap) => ({
    ...cap,
    creado_por: byUid[uidByUuid[cap.creado_por]],
  }));
}

/**
 * Password de una sola vez para los auth.users creados por el ETL. No se
 * persiste: las cuentas legacy se invitan/recuperan después del cutover.
 * @returns {string}
 */
function randomPassword() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Garantiza un perfil por firebase_uid. Crea auth.users PRIMERO (Admin API) y
 * deja que handle_new_user cree el perfil; upsert del perfil por `id` solo
 * para rellenar gaps (email). Devuelve el mapa firebase_uid → profile id.
 * @param {object} client Cliente Supabase (supabase-rest o mock)
 * @param {{firebase_uid: string, rol: string}[]} profiles Perfiles del transform
 * @param {{log?: object}} [options]
 * @returns {Promise<object>}
 */
async function ensureProfiles(client, profiles, { log = console } = {}) {
  const byUid = {};
  for (const profile of profiles) {
    const uid = profile.firebase_uid;
    if (byUid[uid]) continue;

    const query = `firebase_uid=eq.${encodeURIComponent(uid)}`;
    const existing = await client.select('profiles', query);
    let row = existing && existing[0];

    if (!row) {
      log.info(`Creando auth.users para firebase_uid ${uid} (Admin API)…`);
      await client.createAuthUser({
        email: buildPlaceholderEmail(uid),
        password: randomPassword(),
        user_metadata: { firebase_uid: uid },
        emailConfirm: true,
      });
      const after = await client.select('profiles', query);
      row = after && after[0];
      if (!row) {
        throw new Error(
          `handle_new_user no creó el perfil para ${uid}. Verificá el trigger on_auth_user_created.`
        );
      }
    }

    if (!row.email) {
      await client.upsert(
        'profiles',
        [{ id: row.id, firebase_uid: uid, email: buildPlaceholderEmail(uid) }],
        'id'
      );
    }
    byUid[uid] = row.id;
  }
  return byUid;
}

/**
 * Núcleo de la carga: (opcional) truncado --force, garantía de perfiles y
 * upserts en orden de dependencias. Inyectable para tests (cliente mock).
 * @param {object} client Cliente Supabase
 * @param {ReturnType<typeof transformExport>} transformed Salida del transform
 * @param {{force?: boolean, log?: object}} [options]
 * @returns {Promise<{byUid: object, counts: object}>}
 */
async function runLoad(client, transformed, { force = false, log = console } = {}) {
  if (force) {
    log.warn('--force: truncando tablas objetivo (orden inverso a la carga)…');
    for (const table of buildForceDeletions()) {
      await client.deleteAll(table);
    }
  }

  const byUid = await ensureProfiles(client, transformed.profiles, { log });
  const capacitaciones = applyCreadoPor(transformed.capacitaciones, transformed.firebaseUidToUuid, byUid);

  await client.upsert('capacitaciones', capacitaciones, 'slug');
  await client.upsert('modulos', transformed.modulos, 'capacitacion_id,orden');
  await client.upsert('grabaciones', transformed.grabaciones, 'modulo_id,posicion');

  return {
    byUid,
    counts: {
      capacitaciones: capacitaciones.length,
      modulos: transformed.modulos.length,
      grabaciones: transformed.grabaciones.length,
    },
  };
}

function argValue(args, name) {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const exportFile = argValue(args, '--export') || path.join(__dirname, '..', 'data', 'capacitaciones-export.ndjson');
  const force = args.includes('--force');
  const skipBackups = args.includes('--skip-backups');

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('✗ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (ver .env.example)');
    process.exit(1);
  }
  if (!skipBackups && !DATABASE_URL) {
    console.error('✗ Falta DATABASE_URL (necesaria para pg_dump; usá --skip-backups para omitir)');
    process.exit(1);
  }
  if (!fs.existsSync(exportFile)) {
    console.error(`✗ Export no encontrado: ${exportFile}. Corré antes scripts/export-firestore.js`);
    process.exit(1);
  }

  console.info('Paso 1: parsear + transformar export…');
  const entities = parseNdjson(fs.readFileSync(exportFile, 'utf8'));
  const transformed = transformExport(entities);

  for (const warning of transformed.warnings) {
    console.warn(`⚠ ${warning.type}: ${warning.path || warning.slug}`);
  }
  for (const orphan of transformed.orphanedModulos) {
    console.warn(`⚠ módulo huérfano (no se carga): ${orphan.path}`);
  }
  console.info(`✓ Transform: ${transformed.capacitaciones.length} capacitaciones, ` +
    `${transformed.modulos.length} módulos, ${transformed.grabaciones.length} grabaciones, ` +
    `${transformed.profiles.length} perfiles, ${transformed.orphanedModulos.length} huérfanos`);

  const backupsDir = path.join(__dirname, '..', 'data', 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  if (!skipBackups) {
    console.info('Backup pre-carga (REQ-MIG-06)…');
    await backup.runPgDump(DATABASE_URL, path.join(backupsDir, backup.buildBackupName('pre-load')));
  }

  const client = createSupabaseRestClient({
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  });

  const summary = await runLoad(client, transformed, { force });
  console.info(`✓ Cargadas: ${JSON.stringify(summary.counts)}`);

  console.info('Verificación de paridad (REQ-MIG-05)…');
  const { readTarget, verifyParity } = require('./parity-check');
  const target = await readTarget(client);
  const { ok, report } = verifyParity(entities, target);
  console.info(report);
  if (!ok) {
    console.error('✗ Paridad NO verificada. Restaurá el backup pre-carga y revisá.');
    process.exit(1);
  }
  console.info('✓ Paridad verificada');

  if (!skipBackups) {
    console.info('Backup post-carga (REQ-MIG-06)…');
    await backup.runPgDump(DATABASE_URL, path.join(backupsDir, backup.buildBackupName('post-load')));
    fs.copyFileSync(exportFile, path.join(backupsDir, 'capacitaciones-export.ndjson'));
    fs.writeFileSync(
      path.join(backupsDir, 'capacitaciones-transformed.json'),
      JSON.stringify(transformed, null, 2)
    );
  }

  console.info('✅ Migración completada.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('✗ Error durante la carga:', error.message);
    process.exit(1);
  });
}

module.exports = {
  buildPlaceholderEmail,
  buildLoadOrder,
  buildForceDeletions,
  applyCreadoPor,
  randomPassword,
  ensureProfiles,
  runLoad,
  PLACEHOLDER_DOMAIN,
  STUB_FIREBASE_UID,
};
