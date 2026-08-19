import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Service-role client — bypasses RLS entirely. Used for: the bearer-token
// machine-to-machine API path (lib/api/auth.ts — the token itself is the
// trust boundary, not RLS), the Monday.com migration script, and
// scripts/seed-test-users.ts. Never import this from a component, page, or
// any client-reachable code path.
//
// Deliberately NOT using the `server-only` package here — its plain
// Node/CJS fallback throws unconditionally outside Next's bundler, which
// would break the standalone tsx scripts (migrate-monday.ts,
// seed-test-users.ts). None of these modules are ever imported from a
// Client Component — verified by grep before reintroducing the import.
let cachedAdmin: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient() {
  if (cachedAdmin) return cachedAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set to use the admin client.");
  }

  cachedAdmin = createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}
