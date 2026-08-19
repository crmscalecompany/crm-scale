import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { emitEvent } from "@/lib/automation/events";

type Client = SupabaseClient<Database>;
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export interface LeadCursor {
  criado_em: string | null;
  id: string;
}

export interface ListLeadsParams {
  status?: string;
  /** Filters by the *deal's* status instead of the lead's own — the leads
   * table's merged Etapa column shows a deal's status once one exists (see
   * lib/leads-table-columns.tsx), so "Etapa (Negócio)" in the filter UI
   * needs to search deals, not leads.status. Implemented as a lead_id
   * lookup against deals first, then `leads.id in (...)` — a real SQL join
   * would be cleaner but Postgrest doesn't expose cross-table filters
   * without a view/RPC, and this is a low-volume, infrequent filter. */
  deal_status?: string;
  niche_id?: string;
  owner_sdr_id?: string;
  direcao?: string;
  criado_em_from?: string;
  criado_em_to?: string;
  updated_since?: string;
  limit: number;
  offset?: number;
  /** Cursor pagination — when set, returns leads strictly after this
   * position in the criado_em-desc,id-desc ordering, instead of paging by
   * `offset`. Use this for "load more" against a table under concurrent
   * writes: offset is a *position*, so rows inserted at the top since the
   * last page shift every subsequent page's contents — a fetch at
   * offset=200 can return rows already seen (this actually happened
   * against the live Monday migration, see
   * lib/actions/leads.ts::loadMoreLeadsAction). A cursor doesn't have that
   * problem: "ordered after the last row I saw" stays true no matter how
   * many new rows land above it. */
  before?: LeadCursor;
}

// Shared by both the /api/v1/leads route handlers and Server Components
// (the CRM workspace) — one place owns the query shape.
//
// Ordered by criado_em (the lead's real entry date, e.g. Monday's "Data
// Entrada") rather than inserted_at (when the row landed in *our* database)
// — during the Monday migration those two are very different, since
// migration order follows whatever order the Monday API returned items in,
// not chronological entry date. `id` is the tiebreaker both for leads
// sharing a criado_em and for leads with no criado_em at all (nulls last).
export async function listLeads(db: Client, params: ListLeadsParams) {
  let query = db
    .from("leads")
    .select("*", { count: "exact" })
    .order("criado_em", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (params.deal_status) {
    const { data: dealRows, error: dealError } = await db
      .from("deals")
      .select("lead_id")
      .eq("status", params.deal_status as Database["public"]["Tables"]["deals"]["Row"]["status"]);
    if (dealError) throw dealError;
    const leadIds = (dealRows ?? []).map((d) => d.lead_id);
    if (leadIds.length === 0) return { data: [], total: 0 };
    query = query.in("id", leadIds);
  }

  if (params.status) query = query.eq("status", params.status as Database["public"]["Tables"]["leads"]["Row"]["status"]);
  if (params.niche_id) query = query.eq("niche_id", params.niche_id);
  if (params.owner_sdr_id) query = query.eq("owner_sdr_id", params.owner_sdr_id);
  if (params.direcao) query = query.eq("direcao", params.direcao);
  if (params.criado_em_from) query = query.gte("criado_em", params.criado_em_from);
  if (params.criado_em_to) {
    // criado_em_to comes from a plain <input type="date"> ("YYYY-MM-DD").
    // Now that criado_em is a timestamptz, a naive `lte` compares against
    // that day's midnight and would exclude every lead that entered later
    // the same day — use "strictly before the next day" to include the
    // whole day instead.
    const nextDay = new Date(`${params.criado_em_to}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    query = query.lt("criado_em", nextDay.toISOString());
  }
  if (params.updated_since) query = query.gte("inserted_at", params.updated_since);

  if (params.before) {
    const { criado_em, id } = params.before;
    if (criado_em) {
      // Rows strictly after (criado_em, id) in the desc ordering: either an
      // earlier criado_em, the same criado_em with an earlier id, or (since
      // nulls sort last) any row with no criado_em at all.
      query = query.or(`criado_em.lt.${criado_em},and(criado_em.eq.${criado_em},id.lt.${id}),criado_em.is.null`);
    } else {
      // Cursor is already in the nulls-last tail — only other null rows
      // with a smaller id are "after" it.
      query = query.is("criado_em", null).lt("id", id);
    }
    query = query.limit(params.limit);
  } else {
    const offset = params.offset ?? 0;
    query = query.range(offset, offset + params.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function getLead(db: Client, id: string) {
  const { data, error } = await db.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

// Batched lookup — lets the deals board resolve deal.lead_id -> lead name
// with one query instead of one per card.
export async function listLeadsByIds(db: Client, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await db.from("leads").select("id, nome").in("id", ids);
  if (error) throw error;
  return data ?? [];
}

export async function createLead(db: Client, input: LeadInsert) {
  const { data, error } = await db
    .from("leads")
    // A lead created through the UI (not migrated) has no natural "Data
    // Entrada" — default it to now so it sorts to the top like the user
    // expects "most recent lead" to, instead of falling into the
    // nulls-last tail behind every migrated lead. Full timestamp (not just
    // the date) since criado_em also drives the "peak lead-entry hour"
    // analysis.
    .insert({ criado_em: new Date().toISOString(), ...input })
    .select("*")
    .single();
  if (error) throw error;

  await emitEvent({
    type: "lead.created",
    entidade_tipo: "lead",
    entidade_id: data.id,
    payload: { lead: data },
    occurred_at: new Date().toISOString(),
  });

  return data;
}

export async function updateLead(db: Client, id: string, input: LeadUpdate) {
  const previous = await getLead(db, id);

  const { data, error } = await db.from("leads").update(input).eq("id", id).select("*").single();
  if (error) throw error;

  if (input.status && previous && input.status !== previous.status) {
    await emitEvent({
      type: "lead.status_changed",
      entidade_tipo: "lead",
      entidade_id: data.id,
      payload: { lead: data, previous_status: previous.status, new_status: data.status },
      occurred_at: new Date().toISOString(),
    });
  }

  return data;
}
