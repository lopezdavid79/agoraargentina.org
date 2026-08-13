/**
 * transform.js — Transforma el export Firestore (NDJSON, REQ-MIG-01) en el
 * shape de Postgres/Supabase del módulo capacitaciones (REQ-MIG-02).
 *
 * Funciones puras exportadas (unit-testables sin servicios vivos):
 *   parseNdjson, mapEstado, mapCategoria, toIso, normalizeGrabaciones,
 *   buildGrabaciones, detectOrphans, transformExport
 *
 * Uso desde el loader:
 *   const { parseNdjson, transformExport } = require('./transform');
 *   const entities = parseNdjson(fs.readFileSync(exportFile, 'utf8'));
 *   const data = transformExport(entities);
 *
 * Contrato creado_por (REQ-MIG-03 + nota CRITICAL 1): el transform genera el
 * uuid del perfil por firebase_uid; el loader crea la fila auth.users primero
 * (Admin API) y re-resuelve el id real del perfil antes de insertar.
 */

const { randomUUID } = require('crypto');

const ESTADO_MAP = {
  Borrador: 'borrador',
  Activo: 'Activo',
  Terminado: 'Terminado',
};

const CATEGORIA_ENUM = [
  'Herramientas para el trabajo',
  'Accesibilidad digital',
  'Alfabetización Digital',
  'General',
];

/** firebase_uid sintético compartido para capacitaciones sin creador. */
const STUB_FIREBASE_UID = '__sin_creador__';

/**
 * Parsea NDJSON (una entidad por línea) o, como fallback (REQ-MIG-01), un
 * JSON array plano. Las líneas en blanco se ignoran; una línea malformada
 * lanza error (no perder datos en silencio).
 * @param {string} text
 * @returns {object[]}
 */
function parseNdjson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

/**
 * Mapea estado Firestore → enum estado_enum de Postgres.
 * @param {string|undefined} estado
 * @returns {'borrador'|'Activo'|'Terminado'}
 */
function mapEstado(estado) {
  return ESTADO_MAP[estado] || 'borrador';
}

/**
 * Mapea categoria Firestore → enum categoria_enum de Postgres; "General" si
 * falta o el valor no está en el enum.
 * @param {string|undefined} categoria
 * @returns {string}
 */
function mapCategoria(categoria) {
  return CATEGORIA_ENUM.includes(categoria) ? categoria : 'General';
}

/**
 * Convierte fecha Firestore (Date, Timestamp {_seconds,_nanoseconds}, string
 * ISO o epoch ms) a string ISO. Devuelve null si no es convertible.
 * @param {*} value
 * @returns {string|null}
 */
function toIso(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (value && typeof value === 'object' && Number.isFinite(value._seconds)) {
    const ms = value._seconds * 1000 + Math.round((value._nanoseconds || 0) / 1e6);
    return new Date(ms).toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

/**
 * Normaliza el array grabaciones Firestore a [{url, label}]: los strings
 * legacy pasan a {url, label:""} y los objetos se recortan. Descarta entradas
 * sin url (misma semántica que parseGrabaciones del Express actual).
 * @param {Array} grabaciones
 * @returns {{url: string, label: string}[]}
 */
function normalizeGrabaciones(grabaciones) {
  if (!Array.isArray(grabaciones)) return [];
  return grabaciones
    .map((g) => {
      if (typeof g === 'string') return { url: g.trim(), label: '' };
      return {
        url: String((g && g.url) || '').trim(),
        label: String((g && g.label) || '').trim(),
      };
    })
    .filter((g) => g.url.length > 0);
}

/**
 * Produce las filas grabaciones para un módulo: expande el array con
 * posicion = index + 1 y, si el array está vacío, usa el fallback legacy
 * claseGrabada como "Clase Grabada 1" posicion 1 (REQ-MIG-02).
 * @param {{grabaciones?: Array, claseGrabada?: string}} mod Datos del módulo Firestore
 * @returns {{url: string, label: string, posicion: number}[]}
 */
function buildGrabaciones(mod) {
  const grabaciones = normalizeGrabaciones(mod.grabaciones);
  if (grabaciones.length > 0) {
    return grabaciones.map((g, index) => ({ ...g, posicion: index + 1 }));
  }
  const legacyUrl = (mod.claseGrabada || '').trim();
  return legacyUrl ? [{ url: legacyUrl, label: 'Clase Grabada 1', posicion: 1 }] : [];
}

/**
 * Detecta módulos cuyo slug de capacitación no existe en el export
 * (huérfanos por deleteCapacitacion sin cascada, REQ-MIG-04).
 * @param {object[]} modulos Entidades modulo
 * @param {Set<string>} slugSet Slugs presentes en el export
 * @returns {{path: string, capacitacionSlug: string}[]}
 */
function detectOrphans(modulos, slugSet) {
  return modulos
    .filter((mod) => !slugSet.has(mod.capacitacionSlug))
    .map((mod) => ({ path: mod.path || `capacitaciones/${mod.capacitacionSlug}/modulos/${mod.id}`, capacitacionSlug: mod.capacitacionSlug }));
}

/**
 * Pipeline completo: entidades del export → filas Postgres + mapas de uuids.
 * Los huérfanos se reportan pero NO se incluyen en la carga (REQ-MIG-04).
 * @param {object[]} entities Entidades parseadas (__type capacitacion|modulo)
 * @param {{uuid?: () => string}} [options] Inyectable para tests
 * @returns {{
 *   capacitaciones: object[], modulos: object[], grabaciones: object[],
 *   profiles: object[], slugToUuid: object, firebaseUidToUuid: object,
 *   orphanedModulos: object[], warnings: object[]
 * }}
 */
function transformExport(entities, { uuid = randomUUID } = {}) {
  const capacitacionEntities = entities.filter((e) => e.__type === 'capacitacion');
  const moduloEntities = entities.filter((e) => e.__type === 'modulo');
  const warnings = [];

  for (const e of entities) {
    if (e.__type !== 'capacitacion' && e.__type !== 'modulo') {
      warnings.push({ type: 'tipo-desconocido', path: e.path || e.id });
    }
  }

  const slugSet = new Set(capacitacionEntities.map((c) => c.id));

  // Mapas de uuids (REQ-MIG-02/03: las FKs se resuelven con estos mapas).
  const slugToUuid = {};
  for (const cap of capacitacionEntities) slugToUuid[cap.id] = uuid();
  const moduloUuidByPath = {};
  for (const mod of moduloEntities) moduloUuidByPath[mod.path] = uuid();

  // Perfiles: un uuid por firebase_uid distinto (+ stub si falta creador).
  const firebaseUidToUuid = {};
  const profiles = [];
  const usedUids = new Set();
  const needsStub = capacitacionEntities.some((c) => !String(c.creadoPor || '').trim());

  const ensureProfile = (uid) => {
    if (!usedUids.has(uid)) {
      usedUids.add(uid);
      firebaseUidToUuid[uid] = uuid();
      profiles.push({ id: firebaseUidToUuid[uid], firebase_uid: uid, rol: 'instructor', email: null });
    }
  };

  for (const cap of capacitacionEntities) {
    const uid = String(cap.creadoPor || '').trim();
    if (uid) {
      ensureProfile(uid);
    } else {
      warnings.push({ type: 'creador-faltante', slug: cap.id, path: `capacitaciones/${cap.id}` });
    }
  }
  if (needsStub) ensureProfile(STUB_FIREBASE_UID);

  // Capacitaciones
  const capacitaciones = capacitacionEntities.map((cap) => {
    const uid = String(cap.creadoPor || '').trim();
    const row = {
      id: slugToUuid[cap.id],
      titulo: String(cap.titulo || '').trim(),
      slug: cap.id,
      descripcion: cap.descripcion ?? '',
      categoria: mapCategoria(cap.categoria),
      instructor: cap.instructor ?? '',
      privado: cap.privado === true,
      link_vivo: cap.link_vivo ?? '',
      info_clase: cap.infoClase ?? '',
      estado: mapEstado(cap.estado),
      creado_por: uid ? firebaseUidToUuid[uid] : firebaseUidToUuid[STUB_FIREBASE_UID],
    };
    const fecha = toIso(cap.fecha);
    if (fecha) row.fecha = fecha;
    const updatedAt = toIso(cap.fechaActualizacion);
    if (updatedAt) row.updated_at = updatedAt;
    return row;
  });

  // Módulos + grabaciones (los huérfanos no entran al lote)
  const modulos = [];
  const grabaciones = [];
  const orphanedModulos = [];
  for (const mod of moduloEntities) {
    if (!slugSet.has(mod.capacitacionSlug)) {
      orphanedModulos.push({
        path: mod.path || `capacitaciones/${mod.capacitacionSlug}/modulos/${mod.id}`,
        capacitacionSlug: mod.capacitacionSlug,
      });
      continue;
    }
    const orden = parseInt(mod.orden, 10);
    const moduloRow = {
      id: moduloUuidByPath[mod.path],
      capacitacion_id: slugToUuid[mod.capacitacionSlug],
      orden: Number.isFinite(orden) ? orden : 0,
      titulo: mod.tituloModulo || '',
      descripcion: mod.descripcion ?? '',
      link_material: mod.linkMaterial ?? '',
      activo: typeof mod.activo === 'boolean' ? mod.activo : true,
    };
    const createdAt = toIso(mod.fechaCreacion);
    if (createdAt) moduloRow.created_at = createdAt;
    const updatedAt = toIso(mod.fechaActualizacion);
    if (updatedAt) moduloRow.updated_at = updatedAt;
    modulos.push(moduloRow);

    for (const g of buildGrabaciones(mod)) {
      grabaciones.push({ id: uuid(), modulo_id: moduloRow.id, ...g });
    }
  }

  return {
    capacitaciones,
    modulos,
    grabaciones,
    profiles,
    slugToUuid,
    firebaseUidToUuid,
    orphanedModulos,
    warnings,
  };
}

module.exports = {
  parseNdjson,
  mapEstado,
  mapCategoria,
  toIso,
  normalizeGrabaciones,
  buildGrabaciones,
  detectOrphans,
  transformExport,
  STUB_FIREBASE_UID,
};
