import "server-only";
import type { NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export class ApiAuthError extends Error {}

export type ApiAuth =
  // Machine-to-machine (dashboard, future automations): Authorization:
  // Bearer $CRM_API_TOKEN, same mechanism the dashboard itself uses for its
  // own CRON_SECRET. The token IS the trust boundary here, so this path
  // uses the service-role client and RLS is intentionally bypassed — same
  // reasoning the dashboard already applies to lib/supabase/admin.ts.
  | { mode: "bearer"; db: SupabaseClient<Database> }
  // Interactive: Supabase session cookie. Uses the SSR client so RLS
  // applies naturally and per-role access is enforced by the database, not
  // re-implemented here.
  | { mode: "session"; db: SupabaseClient<Database>; user: User };

export async function resolveApiAuth(request: NextRequest): Promise<ApiAuth> {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRM_API_TOKEN;

  if (expectedToken && authHeader === `Bearer ${expectedToken}`) {
    return { mode: "bearer", db: createAdminClient() };
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return { mode: "session", db: supabase, user };
  }

  throw new ApiAuthError("Não autenticado. Envie um bearer token válido ou uma sessão autenticada.");
}
