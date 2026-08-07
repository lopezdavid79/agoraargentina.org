const { jsonScript } = require('../config/ejsHelpers');

describe('jsonScript helper (OWASP Rule 3.1)', () => {
  test('escapes </script> breakout payload — no literal tag, escaped sequence present', () => {
    const value = '</script><script>alert(1)</script>';
    const result = jsonScript(value);

    expect(result).not.toContain('</script>');
    expect(result).toContain('\\u003c/script\\u003e');
  });

  test('escapes U+2028 and U+2029 line separators to \\u2028 and \\u2029', () => {
    const value = 'line1\u2028line2\u2029line3';
    const result = jsonScript(value);

    expect(result).not.toContain('\u2028');
    expect(result).not.toContain('\u2029');
    expect(result).toContain('\\u2028');
    expect(result).toContain('\\u2029');
  });

  test('keeps quotes, non-ASCII chars and nested structure intact in JSON output', () => {
    const value = { title: 'Café "accents" & more', tags: ['a<b', 'c>d'] };
    const result = jsonScript(value);

    expect(result).toContain('\\u0026');
    expect(result).toContain('"Café \\"accents\\" \\u0026 more"');
    expect(result).toContain('"a\\u003cb"');
    expect(result).toContain('"c\\u003ed"');
  });

  test('round-trips through JSON.parse back to the original value', () => {
    const value = {
      text: '</script><script>alert(1)</script>',
      amp: 'a & b',
      unicode: 'x\u2028y\u2029z',
      list: [1, 'two', { three: 3 }]
    };
    const result = jsonScript(value);

    expect(JSON.parse(result)).toEqual(value);
  });

  test('handles null, arrays, objects and empty string', () => {
    expect(jsonScript(null)).toBe('null');
    expect(jsonScript([])).toBe('[]');
    expect(jsonScript({})).toBe('{}');
    expect(jsonScript('')).toBe('""');
  });
});
