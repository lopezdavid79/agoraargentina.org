/**
 * migrate-images.js — One-shot migration script
 *
 * Mueve imágenes de public/images/ (raíz) a subdirectorios
 * y actualiza las referencias en Firestore.
 *
 * Uso: node scripts/migrate-images.js
 *
 * Es idempotente: si el archivo origen no existe, salta ese paso.
 * Las imágenes de testing (timestamp-*.jpg) se ignoran.
 */

const fs = require('fs');
const path = require('path');

// ── Mapeo: origen → destino (relativo a public/images/) ──────────
const MAP = {
  'agora20-asaerca.png':    'logos/agora20-asaerca.png',
  'logo_Agora_rgbk.jpg':    'logos/logo_Agora_rgbk.jpg',
  'Logo_ASAERCA.jpg':       'logos/Logo_ASAERCA.jpg',
  'logo_FOAL_2022_rgb.jpg': 'logos/logo_FOAL_2022_rgb.jpg',
  'OPM-logo-positivo.png':  'logos/OPM-logo-positivo.png',
  'NVDA_INICIAL.PNG':       'noticias/NVDA_INICIAL.PNG',
};

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

// ── 1. Mover archivos a subdirectorios ──────────────────────────
function moveFiles() {
  let moved = 0;
  const subdirs = new Set();

  for (const [src, dst] of Object.entries(MAP)) {
    const srcPath = path.join(IMAGES_DIR, src);
    const dstPath = path.join(IMAGES_DIR, dst);

    if (!fs.existsSync(srcPath)) {
      console.log(`  ↦ ${src} → ya movido o inexistente, salteando`);
      continue;
    }

    const subdir = path.dirname(dstPath);
    if (!subdirs.has(subdir)) {
      fs.mkdirSync(subdir, { recursive: true });
      subdirs.add(subdir);
      console.log(`  ✓ creado subdirectorio: ${path.relative(IMAGES_DIR, subdir)}/`);
    }

    fs.renameSync(srcPath, dstPath);
    console.log(`  ✓ ${src} → ${dst}`);
    moved++;
  }

  return moved;
}

// ── 2. Actualizar Firestore ──────────────────────────────────────
async function updateFirestore() {
  let db;
  try {
    db = require('../config/firebase');
  } catch {
    console.log('  ⚠ Firestore no disponible en este entorno, salteando');
    return 0;
  }

  const oldToNew = {};
  for (const [src, dst] of Object.entries(MAP)) {
    oldToNew[`/images/${src}`] = `/images/${dst}`;
  }

  let updated = 0;

  // Actualizar noticias (campo imagenUrl)
  for (const [oldPath, newPath] of Object.entries(oldToNew)) {
    const snap = await db.collection('noticias')
      .where('imagenUrl', '==', oldPath)
      .get();

    for (const doc of snap.docs) {
      await doc.ref.update({ imagenUrl: newPath });
      console.log(`  ✓ noticia ${doc.id}: imagenUrl → ${newPath}`);
      updated++;
    }
  }

  // Actualizar cursos (campo imagen)
  for (const [oldPath, newPath] of Object.entries(oldToNew)) {
    const snap = await db.collection('cursos')
      .where('imagen', '==', oldPath)
      .get();

    for (const doc of snap.docs) {
      await doc.ref.update({ imagen: newPath });
      console.log(`  ✓ curso ${doc.id}: imagen → ${newPath}`);
      updated++;
    }
  }

  return updated;
}

// ── 3. Limpiar huérfanos (archivos no mapeados en raíz) ────────
function cleanOrphans() {
  const keep = new Set(['APPS_GOOGLE.png', 'logos', 'noticias', 'cursos']);
  let removed = 0;

  const files = fs.readdirSync(IMAGES_DIR);
  for (const file of files) {
    const fullPath = path.join(IMAGES_DIR, file);
    if (fs.statSync(fullPath).isFile() && !keep.has(file)) {
      fs.unlinkSync(fullPath);
      console.log(`  ✕ eliminado huérfano: ${file}`);
      removed++;
    }
  }

  return removed;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('Migración de imágenes\n');

  console.log('Paso 1: Mover archivos a subdirectorios');
  const moved = moveFiles();

  console.log('\nPaso 2: Actualizar Firestore');
  const firestoreUpdated = await updateFirestore();

  console.log('\nPaso 3: Limpiar huérfanos');
  const removed = cleanOrphans();

  console.log('\n── Resumen ──');
  console.log(`  Archivos movidos:     ${moved}`);
  console.log(`  Firestore actualizados: ${firestoreUpdated}`);
  console.log(`  Huérfanos eliminados: ${removed}`);

  if (moved === 0 && firestoreUpdated === 0 && removed === 0) {
    console.log('\n  ✅ Todo al día, nada que migrar.');
  } else {
    console.log('\n  ✅ Migración completada.');
  }
}

main().catch(err => {
  console.error('\n  ❌ Error durante la migración:', err.message);
  process.exit(1);
});
