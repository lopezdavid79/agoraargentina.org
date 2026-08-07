// config/ejsHelpers.js
// OWASP Rule 3.1: escape JSON embedded in inline <script> blocks.
// Prevents </script> breakout stored XSS and U+2028/U+2029 JS parsing issues.
// The \uXXXX escapes are valid JSON string escapes — the client's JSON.parse()
// decodes them back to the original characters (round-trip safe).
const ESCAPE_MAP = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
};

function jsonScript(value) {
  const json = JSON.stringify(value);
  return json.replace(/[<>&\u2028\u2029]/g, ch => ESCAPE_MAP[ch]);
}

module.exports = { jsonScript };
