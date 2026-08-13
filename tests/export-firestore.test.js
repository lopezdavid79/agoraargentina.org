// tests/export-firestore.test.js
// Unit tests para scripts/export-firestore.js (tarea 6.1, REQ-MIG-01).
// Solo lógica pura + colección mockeada: no toca Firestore real.

const {
  capacitacionLine,
  moduloLine,
  buildNdjson,
  collectEntities,
} = require('../scripts/export-firestore');

describe('capacitacionLine', () => {
  test('emite discriminador __type capacitacion con id y datos', () => {
    const doc = {
      id: 'herramientas-para-el-trabajo',
      data: () => ({
        titulo: 'Herramientas para el Trabajo',
        estado: 'Activo',
        creadoPor: 'uXyZ123abc',
      }),
    };

    const line = capacitacionLine(doc);

    expect(line.__type).toBe('capacitacion');
    expect(line.id).toBe('herramientas-para-el-trabajo');
    expect(line.titulo).toBe('Herramientas para el Trabajo');
    expect(line.estado).toBe('Activo');
    expect(line.creadoPor).toBe('uXyZ123abc');
  });

  test('incluye la ruta Firestore del documento', () => {
    const doc = { id: 'slug-uno', data: () => ({}) };
    expect(capacitacionLine(doc).path).toBe('capacitaciones/slug-uno');
  });
});

describe('moduloLine', () => {
  test('emite discriminador __type modulo con slug del padre', () => {
    const doc = {
      id: 'autoId123',
      data: () => ({
        orden: 1,
        tituloModulo: 'Principios POUR',
        activo: true,
      }),
    };

    const line = moduloLine(doc, 'introduccion-a-la-accesibilidad-web');

    expect(line.__type).toBe('modulo');
    expect(line.id).toBe('autoId123');
    expect(line.capacitacionSlug).toBe('introduccion-a-la-accesibilidad-web');
    expect(line.orden).toBe(1);
    expect(line.tituloModulo).toBe('Principios POUR');
    expect(line.path).toBe(
      'capacitaciones/introduccion-a-la-accesibilidad-web/modulos/autoId123'
    );
  });
});

describe('buildNdjson', () => {
  test('serializa una línea JSON por entidad con salto de línea final', () => {
    const entities = [
      { __type: 'capacitacion', id: 'a' },
      { __type: 'modulo', id: 'm1', capacitacionSlug: 'a' },
    ];

    const ndjson = buildNdjson(entities);

    const lines = ndjson.trimEnd().split('\n');
    expect(lines).toHaveLength(2);
    expect(ndjson.endsWith('\n')).toBe(true);
    expect(JSON.parse(lines[0]).__type).toBe('capacitacion');
    expect(JSON.parse(lines[0]).id).toBe('a');
    expect(JSON.parse(lines[1]).__type).toBe('modulo');
    expect(JSON.parse(lines[1]).capacitacionSlug).toBe('a');
  });
});

describe('collectEntities', () => {
  // Fake db que imita la cadena:
  //   db.collection('capacitaciones').get()
  //   db.collection('capacitaciones').doc(id).collection('modulos').orderBy('orden','asc').get()
  function makeFakeDb(capacitacionDocs, modulosBySlug) {
    const modulosQuery = {
      get: jest.fn(async () => ({ docs: modulosBySlug.current || [] })),
    };
    const docRef = {
      collection: jest.fn((sub) => {
        if (sub !== 'modulos') throw new Error(`subcolección inesperada: ${sub}`);
        return { orderBy: jest.fn((field, dir) => {
          expect(field).toBe('orden');
          expect(dir).toBe('asc');
          return modulosQuery;
        }) };
      }),
    };
    const capsQuery = {
      get: jest.fn(async () => ({ docs: capacitacionDocs })),
      doc: jest.fn((id) => {
        modulosBySlug.current = modulosBySlug[id] || [];
        return docRef;
      }),
    };
    return {
      collection: jest.fn((name) => {
        if (name !== 'capacitaciones') throw new Error(`colección inesperada: ${name}`);
        return capsQuery;
      }),
      _capsQuery: capsQuery,
      _modulosQuery: modulosQuery,
    };
  }

  test('recorre capacitaciones y su subcolección modulos por documento', async () => {
    const capDocs = [
      { id: 'cap-a', data: () => ({ titulo: 'A' }) },
      { id: 'cap-b', data: () => ({ titulo: 'B' }) },
    ];
    const db = makeFakeDb(capDocs, {
      'cap-a': [{ id: 'm1', data: () => ({ orden: 1 }) }],
      'cap-b': [],
    });

    const result = await collectEntities(db);

    expect(result.count).toBe(3); // 2 capacitaciones + 1 módulo
    expect(result.capacitaciones).toHaveLength(2);
    expect(result.modulos).toHaveLength(1);
    expect(result.modulos[0].capacitacionSlug).toBe('cap-a');
    expect(db._capsQuery.doc).toHaveBeenCalledTimes(2);
  });

  test('sin módulos devuelve lista vacía pero conserva las capacitaciones', async () => {
    const capDocs = [{ id: 'cap-sola', data: () => ({ titulo: 'Sola' }) }];
    const db = makeFakeDb(capDocs, { 'cap-sola': [] });

    const result = await collectEntities(db);

    expect(result.count).toBe(1);
    expect(result.capacitaciones).toHaveLength(1);
    expect(result.modulos).toHaveLength(0);
  });
});
