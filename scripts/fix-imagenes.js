/**
 * fix-imagenes.js — One-shot script de limpieza de datos
 *
 * Recorre cursos.imagen y noticias.imagenUrl en Firestore y reemplaza
 * cualquier valor malformado (ej. "archivo.webp,https://dominio/archivo.webp")
 * por el valor normalizado con normalizeImageUrl.
 *
 * Uso: node scripts/fix-imagenes.js
 *
 * Es idempotente: en una segunda corrida no hay valores que cambiar.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { normalizeImageUrl } = require('../config/imagen');

async function main() {
    let db;
    try {
        db = require('../config/firebase');
    } catch (e) {
        console.error('✗ Firestore no disponible en este entorno:', e.message);
        process.exit(1);
    }

    console.log('Limpieza de imágenes\n');

    // ── Cursos (campo imagen) ──────────────────────────────
    const cursosSnap = await db.collection('cursos').get();
    let cursosFixed = 0;
    for (const doc of cursosSnap.docs) {
        const data = doc.data();
        const stored = data.imagen || '';
        const clean = normalizeImageUrl(stored, '/images/cursos');
        if (clean !== stored) {
            await doc.ref.update({ imagen: clean });
            console.log(`  ✓ curso ${doc.id}: "${stored}" → "${clean}"`);
            cursosFixed++;
        }
    }

    // ── Noticias (campo imagenUrl) ─────────────────────────
    const noticiasSnap = await db.collection('noticias').get();
    let noticiasFixed = 0;
    for (const doc of noticiasSnap.docs) {
        const data = doc.data();
        const stored = data.imagenUrl || '';
        const clean = normalizeImageUrl(stored, '/images/noticias');
        if (clean !== stored) {
            await doc.ref.update({ imagenUrl: clean });
            console.log(`  ✓ noticia ${doc.id}: "${stored}" → "${clean}"`);
            noticiasFixed++;
        }
    }

    console.log('\n── Resumen ──');
    console.log(`  Cursos corregidos:  ${cursosFixed}`);
    console.log(`  Noticias corregidas: ${noticiasFixed}`);
    if (cursosFixed === 0 && noticiasFixed === 0) {
        console.log('\n  ✅ Todo al día, nada que corregir.');
    } else {
        console.log('\n  ✅ Limpieza completada.');
    }
}

main().catch(err => {
    console.error('\n  ❌ Error durante la limpieza:', err.message);
    process.exit(1);
});