/**
 * supabase-rest.js — Cliente mínimo Supabase (PostgREST + GoTrue Admin API)
 * para los scripts ETL de la migración. Usa fetch global (Node ≥ 18) y una
 * `service_role` key: solo scripts de servidor, nunca se expone al cliente.
 *
 * Uso:
 *   const { createSupabaseRestClient } = require('./supabase-rest');
 *   const client = createSupabaseRestClient({
 *     supabaseUrl: process.env.SUPABASE_URL,
 *     serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
 *   });
 */

/**
 * @param {{ supabaseUrl: string, serviceRoleKey: string, fetchFn?: Function }} opts
 *   fetchFn es inyectable para tests.
 * @returns {{ select: Function, upsert: Function, deleteAll: Function, createAuthUser: Function }}
 */
function createSupabaseRestClient({ supabaseUrl, serviceRoleKey, fetchFn = globalThis.fetch }) {
  const base = String(supabaseUrl || '').replace(/\/+$/, '');
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  async function request(path, { method = 'GET', body, extraHeaders = {} } = {}) {
    const res = await fetchFn(base + path, {
      method,
      headers: { ...headers, ...extraHeaders },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const detail = typeof res.text === 'function' ? await res.text() : '';
      throw new Error(`Supabase ${method} ${path} → ${res.status}: ${detail}`);
    }
    if (res.status === 204) return null;
    return typeof res.json === 'function' ? res.json() : null;
  }

  return {
    /**
     * GET /rest/v1/{table}?{query} (filtro PostgREST, ej. "firebase_uid=eq.abc").
     * @param {string} table
     * @param {string} [query]
     */
    select(table, query = '') {
      const suffix = query ? `?${query}` : '';
      return request(`/rest/v1/${table}${suffix}`);
    },

    /**
     * POST /rest/v1/{table} con UPSERT sobre la columna onConflict
     * (Prefer: resolution=merge-duplicates) — idempotente.
     * @param {string} table
     * @param {object[]} rows
     * @param {string} onConflict Columna(s) del conflicto, ej. "slug"
     */
    upsert(table, rows, onConflict) {
      return request(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
        method: 'POST',
        body: rows,
        extraHeaders: { Prefer: 'resolution=merge-duplicates,return=representation' },
      });
    },

    /**
     * DELETE /rest/v1/{table} — borra TODAS las filas (solo modo --force).
     * La service_role key salta RLS.
     * @param {string} table
     */
    deleteAll(table) {
      return request(`/rest/v1/${table}?select=id`, {
        method: 'DELETE',
        extraHeaders: { Prefer: 'return=representation' },
      });
    },

    /**
     * POST /auth/v1/admin/users — crea la fila auth.users ANTES que el perfil
     * (contrato CRITICAL 1: handle_new_user crea profiles.id por FK).
     * @param {{ email: string, password: string, user_metadata: object, emailConfirm: boolean }} payload
     */
    createAuthUser(payload) {
      return request('/auth/v1/admin/users', {
        method: 'POST',
        body: {
          email: payload.email,
          password: payload.password,
          email_confirm: payload.emailConfirm !== false,
          user_metadata: payload.user_metadata,
        },
      });
    },
  };
}

module.exports = { createSupabaseRestClient };
