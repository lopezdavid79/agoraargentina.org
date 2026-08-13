// tests/load-supabase.test.js
// Unit tests para scripts/load-supabase.js (tareas 6.3/6.6, REQ-MIG-03/07,
// contrato CRITICAL 1). El cliente Supabase se mockea: no hay servicios vivos.

const {
  buildPlaceholderEmail,
  buildLoadOrder,
  buildForceDeletions,
  applyCreadoPor,
  ensureProfiles,
  runLoad,
} = require('../scripts/load-supabase');
const { transformExport, STUB_FIREBASE_UID } = require('../scripts/transform');

describe('buildPlaceholderEmail', () => {
  test('genera email legacy con el uid de firebase', () => {
    expect(buildPlaceholderEmail('uXyZ123abc')).toBe('legacy-uXyZ123abc@agoraargentina.ar');
  });

  test('sanitiza caracteres inválidos para el email', () => {
    expect(buildPlaceholderEmail('ABC:def 123')).toBe('legacy-ABC-def-123@agoraargentina.ar');
  });

  test('el stub de creador faltante tiene su propio email estable', () => {
    expect(buildPlaceholderEmail(STUB_FIREBASE_UID)).toBe('legacy-sin-creador@agoraargentina.ar');
  });
});

describe('buildLoadOrder (REQ-MIG-03)', () => {
  test('ordena por dependencias: profiles → capacitaciones → modulos → grabaciones', () => {
    expect(buildLoadOrder()).toEqual([
      'profiles',
      'capacitaciones',
      'modulos',
      'grabaciones',
    ]);
  });
});

describe('buildForceDeletions (REQ-MIG-07)', () => {
  test('trunca en orden inverso al de carga (FK-safe)', () => {
    expect(buildForceDeletions()).toEqual([
      'grabaciones',
      'modulos',
      'capacitaciones',
      'profiles',
    ]);
  });
});

describe('applyCreadoPor', () => {
  const firebaseUidToUuid = { 'uXyZ123abc': 'uuid-a', [STUB_FIREBASE_UID]: 'uuid-stub' };
  const byUid = { 'uXyZ123abc': 'profile-real-1', [STUB_FIREBASE_UID]: 'profile-real-2' };

  test('sustituye el uuid del transform por el id real del perfil', () => {
    const rows = applyCreadoPor(
      [{ id: 'cap-1', slug: 'cap-a', creado_por: 'uuid-a' }],
      firebaseUidToUuid,
      byUid
    );
    expect(rows[0].creado_por).toBe('profile-real-1');
  });

  test('resuelve también el stub de creador faltante', () => {
    const rows = applyCreadoPor(
      [{ id: 'cap-2', slug: 'sin-creador', creado_por: 'uuid-stub' }],
      firebaseUidToUuid,
      byUid
    );
    expect(rows[0].creado_por).toBe('profile-real-2');
  });
});

// Cliente Supabase fake: registra llamadas y mantiene un mini estado de profiles.
function makeFakeClient({ existingProfiles = {} } = {}) {
  const calls = [];
  const profiles = { ...existingProfiles };
  const client = {
    calls,
    async select(table, query) {
      calls.push(['select', table, query]);
      if (table === 'profiles') {
        const uid = String(new URLSearchParams(query).get('firebase_uid') || '').replace(/^eq\./, '');
        return profiles[uid] ? [profiles[uid]] : [];
      }
      return [];
    },
    async upsert(table, rows, onConflict) {
      calls.push(['upsert', table, rows, onConflict]);
      if (table === 'profiles') {
        for (const row of rows) profiles[row.firebase_uid] = { ...(profiles[row.firebase_uid] || {}), ...row };
      }
      return rows;
    },
    async deleteAll(table) {
      calls.push(['deleteAll', table]);
      return [];
    },
    async createAuthUser(payload) {
      calls.push(['createAuthUser', payload]);
      const uid = payload.user_metadata && payload.user_metadata.firebase_uid;
      const id = 'auth-' + (uid || 'x');
      profiles[uid] = {
        id,
        firebase_uid: uid,
        email: payload.email,
        rol: 'instructor',
      };
      return { id };
    },
  };
  return client;
}

describe('ensureProfiles (contrato CRITICAL 1)', () => {
  test('crea auth.users PRIMERO vía Admin API y deja que el trigger cree el perfil', async () => {
    const client = makeFakeClient();
    const log = { warn: jest.fn(), info: jest.fn() };

    const byUid = await ensureProfiles(client, [{ firebase_uid: 'uXyZ123abc', rol: 'instructor' }], { log });

    expect(byUid['uXyZ123abc']).toBe('auth-uXyZ123abc');
    const createCall = client.calls.find((c) => c[0] === 'createAuthUser');
    expect(createCall[1]).toMatchObject({
      email: 'legacy-uXyZ123abc@agoraargentina.ar',
      emailConfirm: true,
      user_metadata: { firebase_uid: 'uXyZ123abc' },
    });
    expect(createCall[1].password).toEqual(expect.any(String));
  });

  test('si el perfil ya existe, no crea auth user y solo rellena gaps por id', async () => {
    const client = makeFakeClient({
      existingProfiles: {
        'abc123': { id: 'profile-existente', firebase_uid: 'abc123', email: null, rol: 'instructor' },
      },
    });
    const log = { warn: jest.fn(), info: jest.fn() };

    const byUid = await ensureProfiles(client, [{ firebase_uid: 'abc123', rol: 'instructor' }], { log });

    expect(byUid['abc123']).toBe('profile-existente');
    expect(client.calls.some((c) => c[0] === 'createAuthUser')).toBe(false);
    const upsert = client.calls.find((c) => c[0] === 'upsert' && c[1] === 'profiles');
    expect(upsert[3]).toBe('id');
    expect(upsert[2][0]).toEqual({
      id: 'profile-existente',
      firebase_uid: 'abc123',
      email: 'legacy-abc123@agoraargentina.ar',
    });
  });

  test('dedupe: un auth user por firebase_uid distinto', async () => {
    const client = makeFakeClient();
    const log = { warn: jest.fn(), info: jest.fn() };

    const byUid = await ensureProfiles(
      client,
      [{ firebase_uid: 'uid-1', rol: 'instructor' }, { firebase_uid: 'uid-2', rol: 'instructor' }],
      { log }
    );

    const createCalls = client.calls.filter((c) => c[0] === 'createAuthUser');
    expect(createCalls).toHaveLength(2);
    expect(byUid['uid-1']).toBe('auth-uid-1');
    expect(byUid['uid-2']).toBe('auth-uid-2');
  });
});

describe('runLoad (orden de carga e idempotencia, REQ-MIG-03/07)', () => {
  let seq;
  const deterministicUuid = () => {
    seq += 1;
    return '00000000-0000-4000-8000-' + String(seq).padStart(12, '0');
  };

  function makeTransformed() {
    const entities = [
      {
        __type: 'capacitacion',
        id: 'cap-a',
        titulo: 'Cap A',
        estado: 'Activo',
        creadoPor: 'uXyZ123abc',
      },
      {
        __type: 'modulo',
        id: 'm1',
        capacitacionSlug: 'cap-a',
        path: 'capacitaciones/cap-a/modulos/m1',
        orden: 1,
        tituloModulo: 'Módulo 1',
        grabaciones: [{ url: 'https://a.com', label: 'A' }],
      },
    ];
    return transformExport(entities, { uuid: deterministicUuid });
  }

  beforeEach(() => {
    seq = 0;
  });

  test('sin --force no borra nada y carga en orden de dependencias', async () => {
    const client = makeFakeClient();
    const log = { warn: jest.fn(), info: jest.fn() };
    const transformed = makeTransformed();

    const summary = await runLoad(client, transformed, { log });

    expect(client.calls.some((c) => c[0] === 'deleteAll')).toBe(false);

    const upsertTables = client.calls.filter((c) => c[0] === 'upsert').map((c) => c[1]);
    expect(upsertTables.indexOf('capacitaciones')).toBeLessThan(upsertTables.indexOf('modulos'));
    expect(upsertTables.indexOf('modulos')).toBeLessThan(upsertTables.indexOf('grabaciones'));

    const capUpsert = client.calls.find((c) => c[0] === 'upsert' && c[1] === 'capacitaciones');
    expect(capUpsert[3]).toBe('slug'); // idempotencia: upsert por slug
    // creado_por resuelto al id real del perfil (no al uuid del transform)
    expect(capUpsert[2][0].creado_por).toBe('auth-uXyZ123abc');

    const modUpsert = client.calls.find((c) => c[0] === 'upsert' && c[1] === 'modulos');
    expect(modUpsert[3]).toBe('capacitacion_id,orden');

    const grabUpsert = client.calls.find((c) => c[0] === 'upsert' && c[1] === 'grabaciones');
    expect(grabUpsert[3]).toBe('modulo_id,posicion');

    expect(summary.counts).toEqual({ capacitaciones: 1, modulos: 1, grabaciones: 1 });
  });

  test('con --force trunca en orden inverso antes de cargar', async () => {
    const client = makeFakeClient();
    const log = { warn: jest.fn(), info: jest.fn() };
    const transformed = makeTransformed();

    await runLoad(client, transformed, { force: true, log });

    const deletes = client.calls.filter((c) => c[0] === 'deleteAll').map((c) => c[1]);
    expect(deletes).toEqual(['grabaciones', 'modulos', 'capacitaciones', 'profiles']);
    // El truncado ocurre antes de cualquier upsert
    const firstUpsertIndex = client.calls.findIndex((c) => c[0] === 'upsert');
    const lastDeleteIndex = client.calls.findIndex((c) => c[0] === 'deleteAll');
    expect(lastDeleteIndex).toBeLessThan(firstUpsertIndex);
  });
});
