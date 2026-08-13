/**
 * export-firestore.js — Exporta la colección capacitaciones + su subcolección
 * modulos a NDJSON (newline-delimited JSON), una línea por entidad con un
 * discriminador `__type` ('capacitacion' | 'modulo'). Cumple REQ-MIG-01.
 *
 * Reutiliza la config de Firebase Admin existente (config/firebase.js). Variables
 * de entorno requeridas (ver .env.example):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Uso:
 *   node scripts/export-firestore.js > data/capacitaciones-export.ndjson
 *   node scripts/export-firestore.js --out data/capacitaciones-export.ndjson
 *
 * Formato de línea:
 *   {"__type":"capacitacion", "id":<slug>, "path":..., ...data}
 *   {"__type":"modulo", "id":<autoId>, "capacitacionSlug":<slug>, "path":..., ...data}
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

/**
 * Convierte un documento de capacitación en la entidad de exportación.
 * @param {{ id: string, data: () => object }} doc Documento Firestore
 * @returns {{ __type: 'capacitacion', id: string, path: string, ...data }}
 */
function capacitacionLine(doc) {
  return { __type: 'capacitacion', id: doc.id, path: `capacitaciones/${doc.id}`, ...doc.data() };
}

/**
 * Convierte un documento de módulo en la entidad de exportación.
 * @param {{ id: string, data: () => object }} doc Documento de la subcolección modulos
 * @param {string} capacitacionSlug Slug (id) de la capacitación padre
 * @returns {{ __type: 'modulo', id: string, capacitacionSlug: string, path: string, ...data }}
 */
function moduloLine(doc, capacitacionSlug) {
  return {
    __type: 'modulo',
    id: doc.id,
    capacitacionSlug,
    path: `capacitaciones/${capacitacionSlug}/modulos/${doc.id}`,
    ...doc.data(),
  };
}

/**
 * Serializa las entidades como NDJSON (una línea JSON por entidad, \n final).
 * @param {object[]} entities
 * @returns {string}
 */
function buildNdjson(entities) {
  return entities.map((entity) => JSON.stringify(entity)).join('\n') + '\n';
}

/**
 * Recorre capacitaciones y, por cada documento, su subcolección modulos
 * (ordenada por `orden` asc). No toca Firestore directamente: recibe el
 * objeto db ya inicializado (fácil de mockear en tests).
 * @param {object} db Instancia Firestore (config/firebase.js o mock)
 * @returns {Promise<{ capacitaciones: object[], modulos: object[], count: number }>}
 */
async function collectEntities(db) {
  const capsSnapshot = await db.collection('capacitaciones').get();
  const capacitaciones = [];
  const modulos = [];

  for (const capDoc of capsSnapshot.docs) {
    capacitaciones.push(capacitacionLine(capDoc));
    const modulosSnapshot = await db
      .collection('capacitaciones')
      .doc(capDoc.id)
      .collection('modulos')
      .orderBy('orden', 'asc')
      .get();
    for (const modDoc of modulosSnapshot.docs) {
      modulos.push(moduloLine(modDoc, capDoc.id));
    }
  }

  return {
    capacitaciones,
    modulos,
    count: capacitaciones.length + modulos.length,
  };
}

async function main() {
  let db;
  try {
    db = require('../config/firebase');
  } catch (error) {
    console.error('✗ No se pudo inicializar Firebase Admin:', error.message);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const outFile = outIndex !== -1 ? args[outIndex + 1] : null;

  console.error('Exportando capacitaciones + modulos desde Firestore…');
  const { capacitaciones, modulos, count } = await collectEntities(db);

  const ndjson = buildNdjson([...capacitaciones, ...modulos]);
  console.error(`✓ ${capacitaciones.length} capacitaciones, ${modulos.length} módulos (${count} líneas)`);

  if (outFile) {
    const fs = require('fs');
    fs.writeFileSync(outFile, ndjson);
    console.error(`✓ Escrito en ${outFile}`);
  } else {
    process.stdout.write(ndjson);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('✗ Error durante la exportación:', error.message);
    process.exit(1);
  });
}

module.exports = { capacitacionLine, moduloLine, buildNdjson, collectEntities };
