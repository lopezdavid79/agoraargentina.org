// tests/transform.test.js
// Unit tests para scripts/transform.js (tarea 6.2, REQ-MIG-02/04/08).
// Solo lógica pura: no toca Firestore ni Postgres.

const {
  parseNdjson,
  mapEstado,
  mapCategoria,
  toIso,
  normalizeGrabaciones,
  buildGrabaciones,
  detectOrphans,
  transformExport,
  STUB_FIREBASE_UID,
} = require('../scripts/transform');

describe('parseNdjson (REQ-MIG-01)', () => {
  test('parsea cada línea y las rutea por __type', () => {
    const text = [
      JSON.stringify({ __type: 'capacitacion', id: 'cap-a', titulo: 'A' }),
      JSON.stringify({ __type: 'modulo', id: 'm1', capacitacionSlug: 'cap-a' }),
      '',
      JSON.stringify({ __type: 'capacitacion', id: 'cap-b', titulo: 'B' }),
    ].join('\n');

    const entities = parseNdjson(text);

    expect(entities).toHaveLength(3);
    expect(entities[0].__type).toBe('capacitacion');
    expect(entities[1].__type).toBe('modulo');
    expect(entities[2].__type).toBe('capacitacion');
  });

  test('acepta un JSON array plano como fallback (formato legacy)', () => {
    const text = JSON.stringify([
      { __type: 'capacitacion', id: 'cap-a' },
      { __type: 'modulo', id: 'm1', capacitacionSlug: 'cap-a' },
    ]);

    const entities = parseNdjson(text);

    expect(entities).toHaveLength(2);
    expect(entities[0].id).toBe('cap-a');
    expect(entities[1].capacitacionSlug).toBe('cap-a');
  });

  test('lanza error ante una línea malformada (no perder datos en silencio)', () => {
    expect(() => parseNdjson('{not json}\n{"__type":"capacitacion","id":"ok"}')).toThrow();
  });
});

describe('mapEstado (REQ-MIG-02)', () => {
  test.each([
    ['Borrador', 'borrador'],
    ['Activo', 'Activo'],
    ['Terminado', 'Terminado'],
    [undefined, 'borrador'],
    ['ValorRaro', 'borrador'],
  ])('mapea %p → %p', (input, expected) => {
    expect(mapEstado(input)).toBe(expected);
  });
});

describe('mapCategoria (REQ-MIG-02)', () => {
  test('preserva las categorías conocidas del enum', () => {
    expect(mapCategoria('Herramientas para el trabajo')).toBe('Herramientas para el trabajo');
    expect(mapCategoria('Accesibilidad digital')).toBe('Accesibilidad digital');
    expect(mapCategoria('Alfabetización Digital')).toBe('Alfabetización Digital');
    expect(mapCategoria('General')).toBe('General');
  });

  test('default "General" cuando falta o el valor no está en el enum', () => {
    expect(mapCategoria(undefined)).toBe('General');
    expect(mapCategoria('Tecnología')).toBe('General');
    expect(mapCategoria('')).toBe('General');
  });
});

describe('toIso (fecha → ISO, REQ-MIG-02)', () => {
  test('convierte un Date a ISO', () => {
    const d = new Date('2026-03-15T14:30:00.000Z');
    expect(toIso(d)).toBe('2026-03-15T14:30:00.000Z');
  });

  test('convierte un Timestamp Firestore {_seconds,_nanoseconds} a ISO', () => {
    const ts = { _seconds: 0, _nanoseconds: 0 };
    expect(toIso(ts)).toBe('1970-01-01T00:00:00.000Z');
  });

  test('pasa a través un string ISO ya válido', () => {
    expect(toIso('2026-03-15T14:30:00.000Z')).toBe('2026-03-15T14:30:00.000Z');
  });

  test('devuelve null para valores no convertibles', () => {
    expect(toIso('no-es-una-fecha')).toBeNull();
    expect(toIso(undefined)).toBeNull();
    expect(toIso(null)).toBeNull();
  });
});

describe('normalizeGrabaciones', () => {
  test('preserva objetos {url,label} y recorta espacios', () => {
    const result = normalizeGrabaciones([
      { url: ' https://a.com ', label: ' A ' },
      { url: 'https://b.com', label: '' },
    ]);
    expect(result).toEqual([
      { url: 'https://a.com', label: 'A' },
      { url: 'https://b.com', label: '' },
    ]);
  });

  test('normaliza strings legacy a {url, label:""}', () => {
    expect(normalizeGrabaciones(['https://a.com', 'https://b.com'])).toEqual([
      { url: 'https://a.com', label: '' },
      { url: 'https://b.com', label: '' },
    ]);
  });

  test('descarta entradas sin url', () => {
    expect(normalizeGrabaciones([{ url: '', label: 'x' }, { url: 'https://ok.com', label: '' }]))
      .toEqual([{ url: 'https://ok.com', label: '' }]);
  });
});

describe('buildGrabaciones (fallback legacy claseGrabada, REQ-MIG-02)', () => {
  test('crea "Clase Grabada 1" posicion 1 cuando grabaciones está vacío y existe claseGrabada', () => {
    const rows = buildGrabaciones({
      claseGrabada: 'https://vimeo.com/123',
      grabaciones: [],
    });
    expect(rows).toEqual([
      { url: 'https://vimeo.com/123', label: 'Clase Grabada 1', posicion: 1 },
    ]);
  });

  test('expande el array grabaciones con posicion = index + 1', () => {
    const rows = buildGrabaciones({
      claseGrabada: 'https://vimeo.com/legacy',
      grabaciones: [
        { url: 'https://a.com', label: 'A' },
        { url: 'https://b.com', label: 'B' },
      ],
    });
    expect(rows).toEqual([
      { url: 'https://a.com', label: 'A', posicion: 1 },
      { url: 'https://b.com', label: 'B', posicion: 2 },
    ]);
  });

  test('grabaciones presentes gana sobre claseGrabada legacy', () => {
    const rows = buildGrabaciones({
      claseGrabada: 'https://vimeo.com/legacy',
      grabaciones: [{ url: 'https://nueva.com', label: 'Nueva' }],
    });
    expect(rows.map((r) => r.url)).toEqual(['https://nueva.com']);
  });

  test('devuelve [] sin grabaciones ni claseGrabada', () => {
    expect(buildGrabaciones({ grabaciones: [], claseGrabada: '' })).toEqual([]);
  });
});

describe('detectOrphans (REQ-MIG-04)', () => {
  test('detecta módulos cuyo slug de capacitación no existe en el export', () => {
    const modulos = [
      { __type: 'modulo', id: 'm1', capacitacionSlug: 'cap-existente', path: 'capacitaciones/cap-existente/modulos/m1' },
      { __type: 'modulo', id: 'm2', capacitacionSlug: 'slug-borrado', path: 'capacitaciones/slug-borrado/modulos/m2' },
    ];
    const slugs = new Set(['cap-existente']);

    const orphans = detectOrphans(modulos, slugs);

    expect(orphans).toHaveLength(1);
    expect(orphans[0].capacitacionSlug).toBe('slug-borrado');
    expect(orphans[0].path).toBe('capacitaciones/slug-borrado/modulos/m2');
  });

  test('sin huérfanos devuelve lista vacía', () => {
    const modulos = [
      { __type: 'modulo', id: 'm1', capacitacionSlug: 'cap-a' },
      { __type: 'modulo', id: 'm2', capacitacionSlug: 'cap-b' },
    ];
    expect(detectOrphans(modulos, new Set(['cap-a', 'cap-b']))).toEqual([]);
  });
});

describe('transformExport (pipeline completo, REQ-MIG-02/03/04/08)', () => {
  let seq;
  const deterministicUuid = () => {
    seq += 1;
    return '00000000-0000-4000-8000-' + String(seq).padStart(12, '0');
  };

  beforeEach(() => {
    seq = 0;
  });

  const entities = [
    {
      __type: 'capacitacion',
      id: 'introduccion-a-la-accesibilidad-web',
      titulo: ' Introducción a la Accesibilidad Web ',
      descripcion: 'Fundamentos de WCAG',
      categoria: 'Accesibilidad digital',
      instructor: 'María Gómez',
      privado: false,
      link_vivo: 'https://meet.google.com/abc',
      infoClase: 'Martes 18:00',
      fecha: { _seconds: 1773561000, _nanoseconds: 0 },
      estado: 'Activo',
      creadoPor: 'uXyZ123abc',
    },
    {
      __type: 'capacitacion',
      id: 'sin-creador',
      titulo: 'Capacitación sin creador',
      estado: 'borrador',
    },
    {
      __type: 'modulo',
      id: 'mod1',
      capacitacionSlug: 'introduccion-a-la-accesibilidad-web',
      path: 'capacitaciones/introduccion-a-la-accesibilidad-web/modulos/mod1',
      orden: '1',
      tituloModulo: 'Principios POUR',
      descripcion: 'Perceptible, Operable, Comprensible y Robusto.',
      linkMaterial: 'https://drive.google.com/file/d/xyz',
      claseGrabada: 'https://vimeo.com/123',
      grabaciones: [],
      activo: true,
    },
    {
      __type: 'modulo',
      id: 'mod2',
      capacitacionSlug: 'introduccion-a-la-accesibilidad-web',
      path: 'capacitaciones/introduccion-a-la-accesibilidad-web/modulos/mod2',
      orden: '2',
      tituloModulo: 'Módulo moderno',
      claseGrabada: 'https://vimeo.com/legacy',
      grabaciones: [
        { url: 'https://a.com', label: 'A' },
        { url: 'https://b.com', label: 'B' },
      ],
    },
    {
      __type: 'modulo',
      id: 'mod-huerfano',
      capacitacionSlug: 'slug-eliminado',
      path: 'capacitaciones/slug-eliminado/modulos/mod-huerfano',
      orden: 1,
      tituloModulo: 'Huérfano',
    },
  ];

  test('mapea campos, resuelve FKs con uuids y excluye huérfanos', () => {
    const result = transformExport(entities, { uuid: deterministicUuid });

    // Capacitaciones
    expect(result.capacitaciones).toHaveLength(2);
    const cap = result.capacitaciones.find((c) => c.slug === 'introduccion-a-la-accesibilidad-web');
    expect(cap.titulo).toBe('Introducción a la Accesibilidad Web'); // trim
    expect(cap.categoria).toBe('Accesibilidad digital');
    expect(cap.info_clase).toBe('Martes 18:00'); // infoClase → info_clase
    expect(cap.estado).toBe('Activo');
    expect(cap.privado).toBe(false);
    expect(cap.fecha).toBe(new Date(1773561000 * 1000).toISOString());
    // creado_por = uuid del perfil del firebase_uid
    expect(cap.creado_por).toBe(result.firebaseUidToUuid['uXyZ123abc']);
    // slug → uuid biyectivo
    expect(result.slugToUuid[cap.slug]).toBe(cap.id);

    // Módulos (el huérfano queda afuera)
    expect(result.modulos).toHaveLength(2);
    const mod1 = result.modulos.find((m) => m.titulo === 'Principios POUR');
    expect(mod1.orden).toBe(1); // parseInt
    expect(mod1.titulo).toBe('Principios POUR'); // tituloModulo → titulo
    expect(mod1.link_material).toBe('https://drive.google.com/file/d/xyz');
    expect(mod1.capacitacion_id).toBe(result.slugToUuid['introduccion-a-la-accesibilidad-web']);
    expect(mod1.activo).toBe(true);

    // Grabaciones: fallback legacy en mod1 y array moderno en mod2
    const legacy = result.grabaciones.filter((g) => g.modulo_id === mod1.id);
    expect(legacy).toEqual([{
      id: expect.any(String),
      modulo_id: mod1.id,
      url: 'https://vimeo.com/123',
      label: 'Clase Grabada 1',
      posicion: 1,
    }]);
    const modern = result.grabaciones.filter((g) => g.modulo_id !== mod1.id);
    expect(modern).toHaveLength(2);
    expect(modern.map((g) => g.posicion)).toEqual([1, 2]);
    expect(modern.map((g) => g.url)).toEqual(['https://a.com', 'https://b.com']);

    // Perfiles: dedupe por firebase_uid + stub para creador faltante
    expect(result.profiles.map((p) => p.firebase_uid).sort())
      .toEqual([STUB_FIREBASE_UID, 'uXyZ123abc'].sort());
    expect(result.profiles.every((p) => p.rol === 'instructor')).toBe(true);

    // Huérfanos reportados con su path
    expect(result.orphanedModulos).toHaveLength(1);
    expect(result.orphanedModulos[0].path).toBe('capacitaciones/slug-eliminado/modulos/mod-huerfano');

    // Warning por creador faltante
    expect(result.warnings.some((w) => w.type === 'creador-faltante' && w.slug === 'sin-creador')).toBe(true);
  });

  test('la capacitación sin creador apunta al stub compartido', () => {
    const result = transformExport(entities, { uuid: deterministicUuid });
    const sinCreador = result.capacitaciones.find((c) => c.slug === 'sin-creador');
    expect(sinCreador.creado_por).toBe(result.firebaseUidToUuid[STUB_FIREBASE_UID]);
  });
});
