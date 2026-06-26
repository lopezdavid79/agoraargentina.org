# Auditoría de Calidad Web — Ágora Argentina

**Fecha:** 25/06/2026
**Alcance:** Código fuente completo (vistas, controladores, routers, assets, configuración)

---

## 1. Resumen Ejecutivo

La aplicación tiene una base sólida: buena accesibilidad, SEO funcional, arquitectura limpia y seguridad aceptable. Las mejoras propuestas son de bajo riesgo y esfuerzo moderado, enfocadas en pulir la experiencia de usuario y la mantenibilidad del código.

---

## 2. Fortalezas (mantener)

### Accesibilidad
- Aria labels y `aria-describedby` en formularios
- `aria-live="assertive"` para mensajes dinámicos
- Skip-to-content link funcional
- Foco visible con alto contraste
- HTML semántico (`<main>`, `<nav>`, `<footer>`)

### SEO
- `<html lang="es">`, charset, viewport
- Meta tags de descripción, keywords, Open Graph
- Títulos condicionales por página

### Seguridad
- CSRF en todos los formularios
- `sanitize-html` en inputs de contacto
- Rate limiting en login, contacto y rutas admin
- Sesiones con `resave: false` y `saveUninitialized: false`
- Errores de producción genéricos (sin leaks)

### Arquitectura
- Separación clara controllers / routers / middleware
- Async/await + try/catch consistente
- Routers delgados (solo definición de rutas)

### Diseño responsive
- Bootstrap grid
- Breakpoints `row-cols-*`
- `vh-100` en login

---

## 3. Hallazgos y Recomendaciones

### 🔴 Prioridad Alta

#### H1. Error handlers inconsistentes

**Archivos:** `controller/mainController.js` (líneas 44, 65, 125, 138, 150, 183), `controller/adminController.js` (línea 45)

**Problema:** Al menos 7 catch blocks usan `res.status(500).send("mensaje")` en vez de renderizar la vista `error.ejs`. El usuario recibe texto plano sin navegación ni estilo, rompiendo la experiencia.

**Solución:** Reemplazar cada `res.status(N).send(...)` por `res.status(N).render('error', { message: ..., error: {} })`.

**Esfuerzo:** Bajo (~7 líneas, dispersas en 2 archivos).

---

#### H2. Bootstrap duplicado + dos librerías de íconos

**Archivo:** `views/admin/dashboard.ejs` (línea 387), `views/partials/footer.ejs` (línea 95), `views/partials/header.ejs` (líneas 25, 28)

**Problema:**
- Dashboard carga Bootstrap JS 5.3.0 + footer carga 5.3.3 → navegador descarga ambas
- `header.ejs` carga Bootstrap Icons + Font Awesome → ~30KB extra sin uso aparente

**Solución:**
- Eliminar el `<script>` de Bootstrap 5.3.0 en dashboard.ejs (el footer ya lo incluye)
- Eliminar Font Awesome (mantener solo Bootstrap Icons que es el que se usa mayoritariamente)

**Esfuerzo:** Bajo (3 eliminaciones en 2 archivos).

---

#### H3. Middleware de autenticación duplicado

**Archivos:** `router/adminRouter.js` (líneas 25-28), `router/authRouter.js` (líneas 20-23), `router/informesRouter.js` (líneas 5-8), `middleware/authMiddleware.js`

**Problema:** Hay 4 copias inline de la misma función `isAdmin()` en 3 routers distintos, mientras que `middleware/authMiddleware.js` exporta `requireLogin` que nunca se importa.

**Solución:** Unificar en `middleware/authMiddleware.js` y eliminar las copias inline.

**Esfuerzo:** Bajo (editar 4 archivos, agregar imports donde corresponda).

---

### 🟡 Prioridad Media

#### M1. Sin cache headers para assets estáticos

**Archivo:** `app.js` (línea 26)

```js
app.use(express.static(path.join(__dirname, 'public')));
// Sin maxAge
```

**Solución:** Agregar `maxAge: '7d'` para que el navegador cachee CSS/JS/imágenes.

```js
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
```

**Esfuerzo:** Mínimo (1 línea).

---

#### M2. Sin canonical URL ni JSON-LD

**Archivo:** `views/partials/header.ejs`

**Problema:** Falta `<link rel="canonical">` y structured data (JSON-LD) para mejorar SEO y evitar contenido duplicado.

**Solución:** Agregar canonical dinámico y JSON-LD de tipo Organization/WebSite.

**Esfuerzo:** Bajo (agregar 2 bloques en header.ejs).

---

#### M3. Ruta duplicada `/admin/perfil`

**Archivos:** `router/authRouter.js` (línea 33), `router/adminRouter.js` (líneas 70-77)

**Problema:** authRouter monta GET /admin/perfil primero; la versión de adminRouter nunca se ejecuta.

**Solución:** Eliminar la ruta muerta de adminRouter.js.

**Esfuerzo:** Mínimo.

---

### 🟢 Prioridad Baja

#### B1. CSS inline en dashboard.ejs

**Archivo:** `views/admin/dashboard.ejs` (líneas 416-419)

```html
<style>
body { background-color: #f8f9fa; }
.d-flex button { min-width: 220px; }
</style>
```

**Solución:** Mover a `public/css/styles.css`.

**Esfuerzo:** Mínimo.

---

#### B2. Tres `DOMContentLoaded` en un mismo archivo JS

**Archivo:** `public/js/validacion-contacto.js` (líneas 2, 100, 111)

**Problema:** 3 listeners separados que podrían unificarse en uno solo.

**Solución:** Fusionar en un único `DOMContentLoaded`.

**Esfuerzo:** Mínimo.

---

## 4. Resumen de Esfuerzo

| # | Ítem | Prioridad | Archivos a tocar | Líneas a cambiar |
|---|---|---|---|---|
| H1 | Error handlers inconsistentes | Alta | 2 | ~7 |
| H2 | Bootstrap duplicado + íconos | Alta | 2 | ~3 |
| H3 | Auth middleware duplicado | Alta | 4 | ~4 (imports) |
| M1 | Cache headers | Media | 1 | 1 |
| M2 | Canonical + JSON-LD | Media | 1 | ~10 |
| M3 | Perfil duplicado | Media | 1 | ~8 |
| B1 | CSS inline | Baja | 2 | ~3 |
| B2 | DOMContentLoaded | Baja | 1 | ~5 |

**Total estimado:** ~40 líneas en ~7 archivos.

---

## 5. Notas

- `.env` está en `.gitignore` y no se trackea en git — no hay riesgo de fuga de secrets por este lado.
- La aplicación no tiene pipeline de build (minificación, autoprefixer, hash en assets). Con el tamaño actual del sitio no es necesario, pero si crece, considerar agregar Vite o similar.
- No hay tests E2E (Cypress). El config está respaldado como `cypress.config.js.backup` si se quiere retomar.
