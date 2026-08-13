/**
 * parity-check.js — Compara el export Firestore (entidades fuente) contra el
 * target Supabase/Postgres y reporta el checklist de paridad (REQ-MIG-05):
 *   - counts de capacitaciones y módulos
 *   - listas de slugs idénticas
 *   - distribución por estado
 *   - 5 muestras aleatorias (campos dentro de tolerancia)
 *   - link_vivo intactos
 *   - URLs de grabaciones intactas (incl. legacy claseGrabada preservada)
 *   - creado_por que resuelve a un perfil
 *
 * Cualquier discrepancia falla la verificación (exit 1) con el mensaje
 * "Discrepancia: N en Firestore vs M en Postgres" para los counts.
 *
 * Uso:
 *   node scripts/parity-check.js --export data/capacitaciones-export.ndjson
 * Variables requeridas: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const fs = require('fs');

const { mapEstado, mapCategoria, buildGrabaciones, parseNdjson } = require('./transform');
const { createSupabaseRestClient } = require('./supabase-rest');

/**
 * Distribución de un array por una clave derivada.
 * @param {object[]} rows
 * @param {(row: object) => string} keyFn
 * @returns {object}
 */
function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Mensaje estándar de discrepancia de counts (escenario REQ-MIG-05).
 * @param {number} firestore
 * @param {number} postgres
 * @returns {string}
 */
function countDiscrepancy(firestore, postgres) {
  return `Discrepancia: ${firestore} en Firestore vs ${postgres} en Postgres`;
}

/**
 * Toma hasta n muestras aleatorias (sin repetición) y compara campos clave
 * dentro de tolerancia. `random` es inyectable para tests deterministas.
 * @param {object[]} sourceCaps Capacitaciones fuente
 * @param {object} targetBySlug Mapa slug → fila target
 * @param {number} n Cantidad de muestras
 * @param {() => number} [random]
 * @returns {{slug: string, match: boolean, reason: string}[]}
 */
function sampleRecords(sourceCaps, targetBySlug, n, random = Math.random) {
  const pool = sourceCaps.filter((cap) => targetBySlug[cap.id]).slice();
  const samples = [];
  const total = Math.min(n, pool.length);
  while (samples.length < total && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    const cap = pool.splice(index, 1)[0];
    const target = targetBySlug[cap.id];
    const mismatches = [];
    if (String(cap.titulo || '').trim() !== String(target.titulo || '').trim()) mismatches.push('titulo');
    if (mapEstado(cap.estado) !== mapEstado(target.estado)) mismatches.push('estado');
    if (mapCategoria(cap.categoria) !== mapCategoria(target.categoria)) mismatches.push('categoria');
    if (String(cap.link_vivo || '') !== String(target.link_vivo || '')) mismatches.push('link_vivo');
    if (String(cap.infoClase || '') !== String(target.info_clase || '')) mismatches.push('info_clase');
    samples.push({
      slug: cap.id,
      match: mismatches.length === 0,
      reason: mismatches.length ? `campos distintos: ${mismatches.join(', ')}` : '',
    });
  }
  return samples;
}

/**
 * Construye la comparación completa fuente vs target.
 * @param {object[]} source Entidades del export (__type capacitacion|modulo)
 * @param {{capacitaciones: object[], modulos: object[], grabaciones: object[], profiles: object[]}} target Filas de Postgres
 * @returns {{ok: boolean, counts: object, discrepancies: object[], details: object}}
 */
function buildComparison(source, target) {
  const discrepancies = [];
  const sourceCaps = source.filter((e) => e.__type === 'capacitacion');
  const sourceMods = source.filter((e) => e.__type === 'modulo');
  const targetCaps = target.capacitaciones || [];
  const targetMods = target.modulos || [];
  const targetGrab = target.grabaciones || [];
  const targetProfiles = target.profiles || [];

  // 1. Counts
  if (sourceCaps.length !== targetCaps.length) {
    discrepancies.push({ type: 'count-capacitaciones', message: countDiscrepancy(sourceCaps.length, targetCaps.length) });
  }
  if (sourceMods.length !== targetMods.length) {
    discrepancies.push({ type: 'count-modulos', message: countDiscrepancy(sourceMods.length, targetMods.length) });
  }

  // 2. Slugs idénticos
  const sourceSlugs = sourceCaps.map((c) => c.id).sort();
  const targetSlugs = targetCaps.map((c) => c.slug).sort();
  const missingSlugs = sourceSlugs.filter((s) => !targetSlugs.includes(s));
  const extraSlugs = targetSlugs.filter((s) => !sourceSlugs.includes(s));
  if (missingSlugs.length > 0 || extraSlugs.length > 0) {
    discrepancies.push({
      type: 'slugs',
      message: `Slugs distintos: faltan ${missingSlugs.length} (${missingSlugs.join(', ')}) y sobran ${extraSlugs.length} (${extraSlugs.join(', ')})`,
    });
  }

  // 3. Distribución por estado
  const fsEstados = countBy(sourceCaps, (c) => mapEstado(c.estado));
  const pgEstados = countBy(targetCaps, (c) => c.estado);
  for (const key of new Set([...Object.keys(fsEstados), ...Object.keys(pgEstados)])) {
    if ((fsEstados[key] || 0) !== (pgEstados[key] || 0)) {
      discrepancies.push({
        type: 'estado-dist',
        message: `Distribución estado '${key}': ${fsEstados[key] || 0} en Firestore vs ${pgEstados[key] || 0} en Postgres`,
      });
    }
  }

  // 4. Muestras aleatorias
  const targetBySlug = Object.fromEntries(targetCaps.map((c) => [c.slug, c]));
  for (const sample of sampleRecords(sourceCaps, targetBySlug, 5)) {
    if (!sample.match) {
      discrepancies.push({ type: 'sample', message: `Muestra ${sample.slug}: ${sample.reason}` });
    }
  }

  // 5. link_vivo intactos
  for (const cap of sourceCaps) {
    if (String(cap.link_vivo || '').length === 0) continue;
    const target = targetBySlug[cap.id];
    if (!target || String(target.link_vivo || '') !== String(cap.link_vivo)) {
      discrepancies.push({
        type: 'link-vivo',
        message: `link_vivo distinto en '${cap.id}': Firestore '${cap.link_vivo || ''}' vs Postgres '${target ? target.link_vivo : '(sin fila)'}'`,
      });
    }
  }

  // 6. URLs de grabaciones (incl. claseGrabada legacy preservada)
  const capIdToSlug = Object.fromEntries(targetCaps.map((c) => [c.id, c.slug]));
  const sourceByKey = new Map();
  for (const mod of sourceMods) {
    const key = `${mod.capacitacionSlug}:${mod.orden}`;
    sourceByKey.set(key, buildGrabaciones(mod).map((g) => g.url));
  }
  const targetByKey = new Map();
  for (const mod of targetMods) {
    const key = `${capIdToSlug[mod.capacitacion_id]}:${mod.orden}`;
    const urls = targetGrab
      .filter((g) => g.modulo_id === mod.id)
      .sort((a, b) => a.posicion - b.posicion)
      .map((g) => g.url);
    targetByKey.set(key, urls);
  }
  for (const [key, urls] of sourceByKey) {
    const targetUrls = targetByKey.get(key);
    if (!targetUrls) {
      discrepancies.push({ type: 'grabaciones', message: `Grabaciones: módulo ${key} sin filas en Postgres` });
    } else if (JSON.stringify(urls) !== JSON.stringify(targetUrls)) {
      discrepancies.push({
        type: 'grabaciones',
        message: `Grabaciones: ${key} URLs distintas (Firestore [${urls.join(', ')}] vs Postgres [${targetUrls.join(', ')}])`,
      });
    }
  }

  // 7. creado_por resuelve a un perfil
  const profileIds = new Set(targetProfiles.map((p) => p.id));
  for (const cap of targetCaps) {
    if (!profileIds.has(cap.creado_por)) {
      discrepancies.push({
        type: 'creado-por-fk',
        message: `creado_por ${cap.creado_por} de '${cap.slug}' no resuelve a un perfil`,
      });
    }
  }

  return {
    ok: discrepancies.length === 0,
    counts: { capacitaciones: [sourceCaps.length, targetCaps.length], modulos: [sourceMods.length, targetMods.length] },
    discrepancies,
  };
}

/**
 * Renderiza el reporte legible de la comparación.
 * @param {{counts: object, discrepancies: object[]}} comparison
 * @returns {string}
 */
function formatReport(comparison) {
  const lines = ['Paridad Firestore ↔ Supabase'];
  lines.push(`  Capacitaciones: ${comparison.counts.capacitaciones[0]} vs ${comparison.counts.capacitaciones[1]}`);
  lines.push(`  Módulos: ${comparison.counts.modulos[0]} vs ${comparison.counts.modulos[1]}`);
  if (comparison.discrepancies.length === 0) {
    lines.push('  ✓ Sin discrepancias');
  } else {
    for (const d of comparison.discrepancies) lines.push(`  ✗ ${d.message}`);
  }
  return lines.join('\n');
}

/**
 * Conveniencia para el loader: verifica y devuelve { ok, report }.
 * @param {object[]} source Entidades del export
 * @param {object} target Filas de Postgres
 * @returns {{ok: boolean, report: string}}
 */
function verifyParity(source, target) {
  const comparison = buildComparison(source, target);
  return { ok: comparison.ok, report: formatReport(comparison) };
}

/**
 * Lee el target completo (todas las filas) vía el cliente REST.
 * Nota MVP: sin paginación; suficiente para el volumen de capacitaciones.
 * @param {object} client Cliente Supabase (supabase-rest o mock)
 * @returns {Promise<{capacitaciones: object[], modulos: object[], grabaciones: object[], profiles: object[]}>}
 */
async function readTarget(client) {
  const [capacitaciones, modulos, grabaciones, profiles] = await Promise.all([
    client.select('capacitaciones'),
    client.select('modulos'),
    client.select('grabaciones'),
    client.select('profiles'),
  ]);
  return {
    capacitaciones: capacitaciones || [],
    modulos: modulos || [],
    grabaciones: grabaciones || [],
    profiles: profiles || [],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const exportIndex = args.indexOf('--export');
  const exportFile = exportIndex !== -1
    ? args[exportIndex + 1]
    : path.join(__dirname, '..', 'data', 'capacitaciones-export.ndjson');

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('✗ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (ver .env.example)');
    process.exit(1);
  }
  if (!fs.existsSync(exportFile)) {
    console.error(`✗ Export no encontrado: ${exportFile}`);
    process.exit(1);
  }

  const entities = parseNdjson(fs.readFileSync(exportFile, 'utf8'));
  const client = createSupabaseRestClient({
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  });

  const target = await readTarget(client);
  const { ok, report } = verifyParity(entities, target);
  console.info(report);

  if (!ok) {
    console.error('✗ Paridad NO verificada.');
    process.exit(1);
  }
  console.info('✓ Paridad verificada.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('✗ Error durante la verificación de paridad:', error.message);
    process.exit(1);
  });
}

module.exports = {
  countBy,
  countDiscrepancy,
  sampleRecords,
  buildComparison,
  formatReport,
  verifyParity,
  readTarget,
};
