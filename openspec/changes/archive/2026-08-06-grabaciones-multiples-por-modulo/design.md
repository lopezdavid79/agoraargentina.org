# Design: Grabaciones múltiples por módulo

## Technical Approach

Additive: new `grabaciones: string[]` field on modulo docs, legacy `claseGrabada` retained as fallback. Admin forms switch from single URL input to repeatable inputs via hidden-JSON pattern (informes `participantes` precedent). Controller parses/cleans the JSON; candidate view renders array with legacy fallback. Close `activo`-on-create gap as separate, bounded unit.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|---|---|---|---|
| Field shape | `claseGrabada: string` → `grabaciones: string[]` vs. migrate-and-delete `claseGrabada` | Add `grabaciones`, keep `claseGrabada` | Zero migration, backward-compatible; `grabaciones` wins when non-empty |
| Admin form pattern | Numbered inputs (`clase_1..N`) vs. hidden-JSON | Hidden JSON `grabaciones_json` | Survives mid-list removal without renumbering; matches informes precedent (`form_fields.ejs:298-369`) |
| JS location | External file vs. inline `<script>` in view | Inline `<script>` at bottom of each view | Project has no bundler; capacitaciones views currently have zero JS; informes precedent is inline |
| Edit pre-fill | Inject as EJS `<%= %>` vs. JS fetch | EJS `<%= JSON.stringify(modulo.grabaciones \|\| []) %>` | Simple, deterministic; data already available in `modulo` object |
| Validation | URL format check vs. trim-only | Trim whitespace, discard empty, cap 10 | Consistent with `linkMaterial`/`claseGrabada` (no URL validation today) |
| `activo` boundary | Coupled in same line vs. separate line at `add()` end | **Separate, commented line** `activo: true` at end of `add()` call | Easily revertable; touches exact same `add()` block; adds no new branch |

## Sequence Diagram — Admin creates module with recordings

```
Admin                    createModulos.ejs        adminController.storeModulo       Firestore
  │                           │                          │                              │
  ├─ POST form ──────────────►│                          │                              │
  │                           ├─ JS serializes           │                              │
  │                           │  grabaciones_json ──────►│                              │
  │                           │                          ├─ JSON.parse                  │
  │                           │                          ├─ trim, filter empty, cap 10  │
  │                           │                          ├─ modulos.add({               │
  │                           │                          │    ...fields,                │
  │                           │                          │    grabaciones: [...],       │
  │                           │                          │    activo: true  ◄── gap fix │
  │                           │                          │  }) ────────────────────────►│
  │                           │                          │                              │
  │◄──── redirect ────────────┼──────────────────────────┤                              │
```

## Data Flow — Candidate render

```
mainController.detailCapacitaciones
  │
  ├─ Firestore ──► modulo doc { grabaciones: [...], claseGrabada: "legacy" }
  │
  └─ detail.ejs:
       if (modulo.grabaciones?.length)
         ──► forEach: render "Clase Grabada" list-group link
       else if (modulo.claseGrabada)
         ──► render single "Clase Grabada" link (existing markup)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `controller/adminController.js` | Modify | `storeModulo`: parse `grabaciones_json`, add `grabaciones` + `activo: true`. `updateModulo`: same parse + keep `activo` switch. |
| `views/admin/capacitaciones/createModulos.ejs` | Modify | Replace `claseGrabada` input block (lines 52-58) with repeatable URL inputs + hidden JSON + inline JS |
| `views/admin/capacitaciones/editModulo.ejs` | Modify | Same replacement (lines 50-56), pre-filled from `modulo.grabaciones` |
| `views/capacitaciones/detail.ejs` | Modify | Replace single `claseGrabada` block (lines 70-78) with `grabaciones` loop + `claseGrabada` fallback |
| `tests/adminController.test.js` | Modify | `storeModulo`: multiple URLs, activo default, empty-URL stripping. `updateModulo`: new describe block — save with array, removal mid-list. |
| `tests/mainController.test.js` | Modify | New describe: `detailCapacitaciones` render — grabaciones array present, fallback to claseGrabada |

## Target Markup — Replace this block in both createModulos.ejs and editModulo.ejs

```html
<!-- Replaces current single claseGrabada input (lines 52-58 in create, 50-56 in edit) -->
<div class="mb-4">
  <label class="form-label fw-bold text-primary">
    <i class="fas fa-play-circle me-1"></i> Grabaciones (YouTube)
  </label>
  <div id="grabaciones-container"></div>
  <input type="hidden" name="grabaciones_json" id="grabaciones_json" value="">
  <button type="button" class="btn btn-sm btn-outline-primary mt-2" id="btn-add-grabacion"
          aria-label="Agregar grabación">
    <i class="fas fa-plus me-1"></i>Agregar Grabación
  </button>
</div>

<script>
(function() {
  var grabData = <%- JSON.stringify((typeof modulo !== 'undefined' && modulo.grabaciones) ? modulo.grabaciones : []) %>;
  var container = document.getElementById('grabaciones-container');
  var hiddenInput = document.getElementById('grabaciones_json');
  var form = hiddenInput.closest('form');

  function render() {
    if (!container) return;
    container.innerHTML = '';
    grabData.forEach(function(url, idx) {
      var div = document.createElement('div');
      div.className = 'input-group input-group-sm mb-2';
      div.innerHTML =
        '<input type="url" class="form-control border-primary-subtle" ' +
        'value="' + (url || '').replace(/"/g, '&quot;') + '" ' +
        'data-idx="' + idx + '" placeholder="https://youtube.com/..." ' +
        'aria-label="Grabación ' + (idx + 1) + '">' +
        '<button type="button" class="btn btn-outline-danger" data-idx="' + idx + '" ' +
        'aria-label="Eliminar grabación ' + (idx + 1) + '">&times;</button>';
      container.appendChild(div);
    });
    syncJSON();
    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('input').forEach(function(inp) {
      inp.addEventListener('input', function() {
        grabData[parseInt(this.dataset.idx)] = this.value;
        syncJSON();
      });
    });
    container.querySelectorAll('button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        grabData.splice(parseInt(this.dataset.idx), 1);
        render();
      });
    });
  }

  function syncJSON() { hiddenInput.value = JSON.stringify(grabData); }

  document.getElementById('btn-add-grabacion').addEventListener('click', function() {
    grabData.push('');
    render();
  });

  if (form) form.addEventListener('submit', syncJSON);
  render();
})();
</script>
```

## Controller Parsing (shared helper, extracted in adminController.js)

```
function parseGrabaciones(body) {
  try {
    const raw = JSON.parse(body.grabaciones_json || '[]');
    return raw.map(s => String(s).trim()).filter(s => s.length > 0).slice(0, 10);
  } catch { return []; }
}
```

Called in `storeModulo` and `updateModulo`.

## Candidate Render Snippet — Replaces detail.ejs lines 70-78

```ejs
<% const recordings = (modulo.grabaciones && modulo.grabaciones.length) ? modulo.grabaciones : (modulo.claseGrabada ? [modulo.claseGrabada] : []); %>
<% recordings.forEach(function(url) { %>
  <a href="<%= url %>" class="list-group-item list-group-item-action border-0 d-flex align-items-center py-3" target="_blank">
    <div class="me-3 text-danger"><i class="fas fa-play-circle fa-lg"></i></div>
    <div>
      <span class="d-block fw-bold text-dark">Clase Grabada</span>
      <small class="text-muted">Video del encuentro virtual</small>
    </div>
  </a>
<% }); %>
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (Jest) | `storeModulo` with multiple URLs, empty-string stripping, activo default | Extend existing `mockAdd.mock.calls[0][0]` assertions; add 2 cases |
| Unit (Jest) | `updateModulo` save with grabaciones, removal mid-list | New `describe` block reusing mock chain (`mockSubDoc→update`); 2-3 cases |
| Unit (Jest) | `detailCapacitaciones` render — array present, legacy fallback, no recordings | New `describe` in mainController.test.js; mock Firestore query chain; assert response text |
| Regression | Existing `storeModulo` (3), `deleteModulo` (2) | `npm test` must stay green |

## `activo` Fix Boundary

In `storeModulo`, the `add()` call currently has no `activo`. Add as **last property, own line, commented**:

```js
await db.collection('capacitaciones').doc(idCap).collection('modulos').add({
    orden: parseInt(orden),
    tituloModulo,
    descripcion: descripcion || "",
    claseGrabada: claseGrabada || "",
    linkMaterial: linkMaterial || "",
    grabaciones: parseGrabaciones(req.body),
    fechaCreacion: new Date(),
    // BEGIN activo-gap-fix (revert by removing this line)
    activo: true
    // END activo-gap-fix
});
```

No migration required. Revert: delete the two commented lines and run `npm test`.
