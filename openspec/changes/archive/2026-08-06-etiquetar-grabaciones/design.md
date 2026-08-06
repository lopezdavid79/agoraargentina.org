# Design: Etiquetar grabaciones

## Technical Approach

Evolve `grabaciones` from `string[]` to `[{url, label}]`. Single `parseGrabaciones` rewrite normalizes both shapes on write; inline EJS normalization on render tolerates the 1 live string-array module. Forms use two-input rows (label + URL) per the participantes `data-idx`/`data-campo` precedent. Edit prefill auto-generates default labels for legacy/string data; object data preserves existing labels. No migration — render normalizer handles all data shapes.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|---|---|---|---|
| Normalizer structure | Single helper vs. write/render split | Single `parseGrabaciones` for write; inline EJS norm for render | Write path already centralized; render path is 2 lines — named helper is ceremony |
| Default labels on edit | Server (EJS) vs. controller vs. JS | EJS template at line 87 computes `initialGrabaciones` before JS injection | Controller stays passive (raw `moduloDoc.data()`); EJS already owns the normalization spot |
| Renumber on row removal | JS render re-generates vs. save vs. render-only | Render-only fallback: `"Clase Grabada " + (idx+1)` when label empty | Stored labels are user data — JS must not overwrite them. Spec scenario uses empty labels → auto-renumber by position |
| Row field order | Label first vs. URL first | Label first, then URL | Label is the visible text. ARIA: "Etiqueta grabación N" / "URL grabación N" |
| Missing `url` in object | Error vs. treat as empty | Same as empty/trim→discard | `String(undefined)`→`"undefined"`→trim→filter empty — caught naturally |
| Escaping | `<%= %>` auto-HTML-escape for link text; `replace(/"/g,'&quot;')` for JS value injection | Same as existing pattern | `<%= %>` escapes HTML entities; inline JS needs explicit `"` escape. Consistent |

## Data Flow

```
Admin submit  →  parseGrabaciones  →  Firestore {url,label}[]  →  detail.ejs
  grabaciones_json      │                                       normalize string→object
  [{url,label}]    trim url, drop empty,                    linkText = label.trim()
                   cap 10, try/catch→[]                     || "Clase Grabada "+(idx+1)
```

Edit prefill flow:
```
Firestore doc → editModulo.ejs → EJS normalizes → JS grabData → form rows
  strings or     line 87:          string→{url,label}   [{url,label}]  two inputs/row
  objects        rawGrabaciones    object→preserved                     data-campo binding
                 .map(...)         legacy→"Clase Grabada N"
```

## File Changes

| File | Action | Description |
|---|---|---|
| `controller/adminController.js:7-12` | Modify | Rewrite `parseGrabaciones`: string→`{url,label}`, object preserve, discard empty-url, cap 10 |
| `views/admin/capacitaciones/createModulos.ejs` | Modify | Two-input rows (label+URL) with `data-campo`; `grabData` becomes `[{url,label}]`; `syncJSON` unchanged |
| `views/admin/capacitaciones/editModulo.ejs` | Modify | Same two-input rows + EJS normalization: strings get default labels, objects preserved |
| `views/capacitaciones/detail.ejs:70-79` | Modify | Inline normalizer: string→object; link text = label or positional fallback |
| `tests/adminController.test.js` | Modify | ~6 tests RED-first: object assertions + new (legacy-seed, string-seed, mixed input) |
| `tests/mainController.test.js` | Modify | ~3 tests RED-first: dynamic link text + new (string fallback, mixed labels) |

## Key Patterns

### parseGrabaciones rewrite
String element → `{url: trimmed, label: ""}`. Object element → `{url: String(e.url||"").trim(), label: String(e.label||"").trim()}`. Filter `url.length > 0`. Cap 10. `try/catch` → `[]`.

### Two-input row (both forms, replaces current single-input innerHTML)
Each row: text input (`data-campo="label"`, placeholder "Etiqueta (opcional)") + url input (`data-campo="url"`) + remove button. All in one `input-group-sm`. Listeners use `data-idx`+`data-campo` to write `grabData[i][campo] = value` (exact participantes pattern). `grabData` seeded as `[]` on create, normalized `[{url,label}]` on edit. Add button pushes `{url:'', label:''}`.

### Edit prefill EJS (editModulo.ejs line 87)
```ejs
const initialGrabaciones = rawGrabaciones.map(function(r, i) {
  if (typeof r === 'string') return { url: r, label: 'Clase Grabada ' + (i+1) };
  return { url: (r.url||''), label: (r.label||'') };
});
```
Legacy `claseGrabada` auto-seeds `grabaciones[0]` (existing logic untouched, now wrapped as `{url, label}`).

### Render (detail.ejs)
```ejs
const r = typeof rec === 'string' ? { url: rec, label: '' } : rec;
const linkText = (r.label && r.label.trim()) ? r.label.trim() : 'Clase Grabada ' + (idx+1);
```
Fallback numbering is 1-based over the final recordings list. Sub-line "Video del encuentro virtual" retained.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `parseGrabaciones`: normalize mixed shapes, empty discard, cap 10, error→`[]` | New describe block, direct function call |
| Unit | `storeModulo`/`updateModulo`: object grabaciones saved, mid-list removal | Rewrite 4 tests RED-first (string→object assertions) |
| Unit | `editModulo` render: legacy seed, string-array seed, object preserved | Rewrite 1 test + 2 new |
| Unit | `detailCapacitaciones`: mixed labels, string fallback, legacy, renumbering | Rewrite 2 tests + 3 new |

**RED-first sequence**: change `parseGrabaciones` → 10 tests fail → rewrite assertions → all GREEN.

## Migration / Rollout

No migration. Rollback: revert `parseGrabaciones` to string-only, single-input forms, static labels — keep render normalizer so object docs still render.
