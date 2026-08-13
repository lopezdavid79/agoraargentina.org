# Runbook de Cutover: Express/Firebase → SPA React + Supabase (Capacitaciones)

> Documento operativo de la migración del módulo Capacitaciones. Acompaña a
> `scripts/` (ETL del PR6) y al blueprint de la SPA
> (`openspec/changes/react-supabase-capacitaciones/design.md` del repo SPA).
> Estado: listo para ejecutar cuando exista el export Firestore (precondición
> HARD — ver sección 2).

## 1. Actores y entornos

| Entorno | Dónde | Qué corre |
|---------|-------|-----------|
| Firestore (origen) | Firebase del sitio actual | Express/Firebase en cPanel (`public_html` principal) |
| Supabase (destino) | Supabase Cloud | Postgres + Auth + RLS, esquema de `supabase/migrations/` (PR1) |
| SPA | cPanel (`app.agoraargentina.ar` o `/nueva`) | Build estático Vite de `agora-capacitaciones-react` |

Variables de entorno del ETL (ver `.env.example` del repo ORIGIN):

| Variable | Uso |
|----------|-----|
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Export Firestore (Admin SDK) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Carga y paridad (service_role: solo scripts de servidor, NUNCA en la SPA) |
| `DATABASE_URL` | `pg_dump` pre/post carga |

## 2. Precondición HARD

1. Exportar Firestore `capacitaciones` + subcolección `modulos` (ver sección 3).
2. Esquema Supabase aplicado (`supabase db push` con las migraciones PR1) y
   RLS activo en las 4 tablas.
3. `pg_dump` disponible en la máquina del ETL y `DATABASE_URL` con permisos.

Sin el export real **no** se ejecuta la carga (nada de la sección 4–6 debe
correrse contra producción a ciegas).

## 3. ETL paso a paso

```bash
# 0. Precondiciones y entorno
cd C:\Users\DAVID\repo\agoraargentina.org
npm install                  # dependencias existentes (sin nuevas)
# completar .env con FIREBASE_*, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL

# 1. Export Firestore → NDJSON (una línea por entidad, __type capacitacion|modulo)
node scripts/export-firestore.js --out data/capacitaciones-export.ndjson

# 2. Validar el transform en seco (no toca nada): revisar warnings de
#    creador-faltante y módulos huérfanos (REQ-MIG-04)
node -e "const fs=require('fs');const t=require('./scripts/transform');const e=t.parseNdjson(fs.readFileSync('data/capacitaciones-export.ndjson','utf8'));const r=t.transformExport(e);console.log(r.stats||'');console.log(JSON.stringify({counts:{caps:r.capacitaciones.length,mods:r.modulos.length,grabs:r.grabaciones.length,profs:r.profiles.length},orphans:r.orphanedModulos,warnings:r.warnings},null,2))"

# 3. Carga con backup pre-carga automático (REQ-MIG-06) y paridad post-carga
#    (REQ-MIG-05). Falla (exit 1) si la paridad no verifica.
node scripts/load-supabase.js --export data/capacitaciones-export.ndjson

# 4. Re-ejecución / reparación tras fallo parcial (REQ-MIG-07): trunca y recarga
node scripts/load-supabase.js --export data/capacitaciones-export.ndjson --force
```

Los backups quedan en `data/backups/` (gitignored): `pre-load-<ts>.sql`,
`post-load-<ts>.sql`, más copia del export y del JSON transformado.

### Verificación manual de paridad (alternativa al paso 3)

```bash
node scripts/parity-check.js --export data/capacitaciones-export.ndjson
```

Salida esperada: `✓ Sin discrepancias` y counts coincidentes; en caso de
diferencia de counts aparece `Discrepancia: N en Firestore vs M en Postgres`.

### Restauración de un backup

```bash
# El dump es lógico (pg_dump --no-owner): restaurar en la misma instancia
psql "$DATABASE_URL" -f data/backups/pre-load-<ts>.sql
```

## 4. Ventana en paralelo (24–48 h)

1. Publicar la SPA en `app.agoraargentina.ar` (o `/nueva`) en el MISMO hosting
   cPanel. Detalles del deploy estático (`.htaccess`, build con
   `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, AutoSSL): tarea 6.10 de la SPA.
2. Configurar en Supabase Cloud (Auth → URL Configuration): `site_url` y la
   lista de redirects con el origen de producción (nunca hardcodear en el repo
   — advertencia WARNING 4 del design.md).
3. Mantener el Express/Firebase corriendo en el dominio principal.
4. Smoke tests sobre la SPA (sección 6) comparando contra el comportamiento
   baseline capturado en `tests/capacitaciones-parity.test.js`.

> Los usuarios legacy NO tienen cuenta Supabase. El ETL crea `auth.users` con
> email placeholder (`legacy-<uid>@agoraargentina.ar`,
> `user_metadata.firebase_uid`) — contrato CRITICAL 1 (REQ-MIG-03): la fila
> `auth.users` se crea PRIMERO vía Admin API y `handle_new_user` crea el
> perfil; el loader solo rellena gaps. Esos usuarios deben recuperar su acceso
> con el flujo de reset/invitación de la SPA (página `/reset-password`) antes
> o durante la ventana paralela.

## 5. Corte del dominio (document-root switch) y monitoreo

1. Verificar paridad (sección 3) y smoke tests (sección 6).
2. Cambiar el document root de `agoraargentina.ar` a la carpeta `dist/` de la
   SPA (cPanel → Domains → Document Root, o apuntar el virtual host).
3. Monitorear 24 h: errores de Auth/RLS en los logs de Supabase, 404s en
   Apache, y el formulario de contacto/informes que QUEDA en Express (no
   migrado): el switch solo cubre el módulo Capacitaciones según el alcance.
4. Pasados 7 días estables: archivar Express/Firebase (no borrar).

### Rollback (rápido y reversible)

1. Revertir el document root al Express/Firebase (mismo paso de cPanel).
2. Los datos ya cargados en Supabase NO se pierden; si se necesita volver a un
   estado anterior, restaurar `pre-load-<ts>.sql` con `psql`.
3. Mantener `data/backups/` y el export NDJSON como fuente de re-ejecución
   (`--force` es idempotente, REQ-MIG-07).

## 6. Smoke tests post-corte (SPA vs baseline Express)

| Comportamiento | Express (baseline) | SPA/Supabase esperado |
|----------------|--------------------|-----------------------|
| Listado público | solo `estado == "Activo"` | RLS `estado = 'Activo'` + filtro hook |
| Detalle activa | 200 | 200, nested modulos+grabaciones |
| Detalle no activa | 403 | 404/oculto (nunca expone datos) |
| Detalle slug desconocido | 404 | "Capacitación no encontrada" |
| Módulos inactivos | ocultos en detalle | `activo = true` en consulta pública |
| Grabación legacy | "Clase Grabada N" | fallback "Clase Grabada N" en la SPA |
| Perfil de creador | `creadoPor` (uid Firebase) | `profiles.id` vía `firebase_uid` (FK resuelto) |

Los tests automatizados de este baseline viven en
`tests/capacitaciones-parity.test.js` (supertest) y el checklist completo de
paridad en `scripts/parity-check.js`.

## 7. Limpieza post-cutover (pendientes conocidos)

- [ ] Reemplazar los emails placeholder `legacy-*@agoraargentina.ar` por los
      reales (flujo de reset de la SPA) y marcar `email_confirm` en Supabase.
- [ ] Corregir las capacitaciones con `creadoPor` faltante: hoy apuntan al
      perfil stub `__sin_creador__` (`legacy-sin-creador@agoraargentina.ar`).
- [ ] Decidir el destino de los módulos huérfanos (logeados y NO migrados,
      REQ-MIG-04).
- [ ] Archivar el Express/Firebase sin borrarlo (7 días después del corte).
