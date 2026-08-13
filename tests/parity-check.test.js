// tests/parity-check.test.js
// Unit tests para scripts/parity-check.js (tarea 6.4, REQ-MIG-05).
// Compara el export Firestore (entidades fuente) contra el target Postgres.

const {
  countBy,
  countDiscrepancy,
  sampleRecords,
  buildComparison,
  formatReport,
  verifyParity,
} = require('../scripts/parity-check');

describe('countBy', () => {
  test('agrupa por valor', () => {
    expect(countBy(['a', 'b', 'a', 'c'], (v) => v)).toEqual({ a: 2, b: 1, c: 1 });
  });

  test('puede agrupar por una clave derivada', () => {
    const rows = [{ estado: 'Activo' }, { estado: 'Activo' }, { estado: 'borrador' }];
    expect(countBy(rows, (r) => r.estado)).toEqual({ Activo: 2, borrador: 1 });
  });
});

describe('countDiscrepancy (escenario REQ-MIG-05)', () => {
  test('formatea el mensaje exacto de discrepancia', () => {
    expect(countDiscrepancy(42, 41)).toBe('Discrepancia: 42 en Firestore vs 41 en Postgres');
  });
});

describe('sampleRecords', () => {
  const sourceCaps = [
    { id: 'cap-a', titulo: 'Cap A', estado: 'Activo', categoria: 'General', link_vivo: '', infoClase: '' },
    { id: 'cap-b', titulo: 'Cap B', estado: 'borrador', categoria: 'General', link_vivo: '', infoClase: '' },
  ];
  const targetBySlug = {
    'cap-a': { slug: 'cap-a', titulo: 'Cap A', estado: 'Activo', categoria: 'General', link_vivo: '', info_clase: '' },
    'cap-b': { slug: 'cap-b', titulo: 'Cap B', estado: 'borrador', categoria: 'General', link_vivo: '', info_clase: '' },
  };

  test('con random inyectado selecciona muestras y las marca como coincidentes', () => {
    const samples = sampleRecords(sourceCaps, targetBySlug, 5, () => 0);
    expect(samples).toHaveLength(2);
    expect(samples.every((s) => s.match)).toBe(true);
  });

  test('detecta campos distintos en una muestra', () => {
    const broken = {
      ...targetBySlug,
      'cap-a': { ...targetBySlug['cap-a'], titulo: 'Título distinto' },
    };
    const samples = sampleRecords(sourceCaps, broken, 5, () => 0);
    const sampleA = samples.find((s) => s.slug === 'cap-a');
    expect(sampleA.match).toBe(false);
    expect(sampleA.reason).toContain('titulo');
  });
});

describe('buildComparison (REQ-MIG-05)', () => {
  const source = [
    {
      __type: 'capacitacion', id: 'cap-a', titulo: 'Cap A', estado: 'Activo',
      categoria: 'General', link_vivo: 'https://l.com/a', infoClase: 'x', creadoPor: 'u1',
    },
    {
      __type: 'modulo', id: 'm1', capacitacionSlug: 'cap-a', path: 'capacitaciones/cap-a/modulos/m1',
      orden: 1, tituloModulo: 'Módulo 1', claseGrabada: 'https://vimeo.com/123', grabaciones: [],
    },
  ];

  const target = {
    capacitaciones: [{
      id: 'uuid-cap', slug: 'cap-a', titulo: 'Cap A', estado: 'Activo',
      categoria: 'General', link_vivo: 'https://l.com/a', info_clase: 'x', creado_por: 'profile-1',
    }],
    modulos: [{
      id: 'uuid-mod', capacitacion_id: 'uuid-cap', orden: 1, titulo: 'Módulo 1',
    }],
    grabaciones: [{ id: 'g1', modulo_id: 'uuid-mod', posicion: 1, url: 'https://vimeo.com/123', label: 'Clase Grabada 1' }],
    profiles: [{ id: 'profile-1', firebase_uid: 'u1', email: null, rol: 'instructor' }],
  };

  test('paridad completa: sin discrepancias', () => {
    const comparison = buildComparison(source, target);
    expect(comparison.ok).toBe(true);
    expect(comparison.discrepancies).toEqual([]);
  });

  test('count mismatch reporta "Discrepancia: N en Firestore vs M en Postgres"', () => {
    const extraTarget = {
      ...target,
      capacitaciones: [
        ...target.capacitaciones,
        { id: 'x', slug: 'cap-extra', titulo: 'Extra', estado: 'Activo', creado_por: 'profile-1' },
      ],
    };
    const comparison = buildComparison(source, extraTarget);
    expect(comparison.ok).toBe(false);
    expect(comparison.discrepancies.some(
      (d) => d.message === 'Discrepancia: 1 en Firestore vs 2 en Postgres'
    )).toBe(true);
  });

  test('slug list distinta se reporta', () => {
    const targetWithDiffSlug = {
      ...target,
      capacitaciones: [{ ...target.capacitaciones[0], slug: 'cap-diferente' }],
    };
    const comparison = buildComparison(source, targetWithDiffSlug);
    expect(comparison.discrepancies.some((d) => d.type === 'slugs')).toBe(true);
  });

  test('distribución de estado distinta se reporta', () => {
    const targetDiffEstado = {
      ...target,
      capacitaciones: [{ ...target.capacitaciones[0], estado: 'borrador' }],
    };
    const comparison = buildComparison(source, targetDiffEstado);
    expect(comparison.discrepancies.some((d) => d.type === 'estado-dist')).toBe(true);
  });

  test('link_vivo distinto se reporta', () => {
    const targetDiffLink = {
      ...target,
      capacitaciones: [{ ...target.capacitaciones[0], link_vivo: 'https://cambiado.com' }],
    };
    const comparison = buildComparison(source, targetDiffLink);
    expect(comparison.discrepancies.some((d) => d.type === 'link-vivo')).toBe(true);
  });

  test('URLs de grabaciones (incl. legacy claseGrabada) distintas se reportan', () => {
    const targetDiffGrab = {
      ...target,
      grabaciones: [{ id: 'g1', modulo_id: 'uuid-mod', posicion: 1, url: 'https://otra.com', label: 'X' }],
    };
    const comparison = buildComparison(source, targetDiffGrab);
    expect(comparison.discrepancies.some((d) => d.type === 'grabaciones')).toBe(true);
  });

  test('creado_por sin perfil que lo resuelva se reporta', () => {
    const targetBrokenFk = {
      ...target,
      capacitaciones: [{ ...target.capacitaciones[0], creado_por: 'uuid-inexistente' }],
    };
    const comparison = buildComparison(source, targetBrokenFk);
    expect(comparison.discrepancies.some((d) => d.type === 'creado-por-fk')).toBe(true);
  });

  test('count de módulos también se compara', () => {
    const sourceWithExtraMod = [...source, {
      __type: 'modulo', id: 'm2', capacitacionSlug: 'cap-a', path: 'capacitaciones/cap-a/modulos/m2',
      orden: 2, tituloModulo: 'Módulo 2', claseGrabada: '', grabaciones: [],
    }];
    const comparison = buildComparison(sourceWithExtraMod, target);
    expect(comparison.discrepancies.some((d) => d.type === 'count-modulos')).toBe(true);
  });
});

describe('verifyParity y formatReport', () => {
  test('reporta "Sin discrepancias" cuando coincide y expone los conteos', () => {
    const source = [{ __type: 'capacitacion', id: 'a', titulo: 'A', estado: 'Activo' }];
    const target = {
      capacitaciones: [{ id: '1', slug: 'a', titulo: 'A', estado: 'Activo', creado_por: 'p1' }],
      modulos: [], grabaciones: [], profiles: [{ id: 'p1' }],
    };

    const { ok, report } = verifyParity(source, target);

    expect(ok).toBe(true);
    expect(report).toContain('Capacitaciones: 1 vs 1');
    expect(report).toContain('Sin discrepancias');
  });

  test('verifyParity falla cuando hay discrepancias', () => {
    const source = [{ __type: 'capacitacion', id: 'a', titulo: 'A', estado: 'Activo' }];
    const target = {
      capacitaciones: [],
      modulos: [], grabaciones: [], profiles: [],
    };

    const { ok } = verifyParity(source, target);

    expect(ok).toBe(false);
  });

  test('formatReport incluye cada mensaje de discrepancia', () => {
    const comparison = {
      ok: false,
      counts: { capacitaciones: [2, 1], modulos: [0, 0] },
      discrepancies: [{ type: 'count-capacitaciones', message: 'Discrepancia: 2 en Firestore vs 1 en Postgres' }],
    };
    const report = formatReport(comparison);
    expect(report).toContain('Discrepancia: 2 en Firestore vs 1 en Postgres');
  });
});
