import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { emitEvent } from "@/lib/automation/events";
import { chunk } from "@/lib/utils";

// Past this many UUIDs, a single .in() query string risks the ~16KB header
// limit (see lib/utils.ts's chunk comment).
const IN_CHUNK_SIZE = 150;

type Client = SupabaseClient<Database>;
type DealInsert = Database["public"]["Tables"]["deals"]["Insert"];
type DealUpdate = Database["public"]["Tables"]["deals"]["Update"];

export interface ListDealsParams {
  status?: string;
  closer_id?: string;
  data_fechamento_from?: string;
  data_fechamento_to?: string;
  /** deals.criado_em is a timestamptz — used by the Closer's pipeline
   * board's month filter (Week 2.7 follow-up), same pattern as
   * lib/data/leads.ts's criado_em_from/to. */
  criado_em_from?: string;
  criado_em_to?: string;
  limit: number;
  offset: number;
}

export async function listDeals(db: Client, params: ListDealsParams) {
  let query = db.from("deals").select("*", { count: "exact" }).order("criado_em", { ascending: false });

  if (params.status) query = query.eq("status", params.status as Database["public"]["Tables"]["deals"]["Row"]["status"]);
  if (params.closer_id) query = query.eq("closer_id", params.closer_id);
  if (params.data_fechamento_from) query = query.gte("data_fechamento", params.data_fechamento_from);
  if (params.data_fechamento_to) query = query.lte("data_fechamento", params.data_fechamento_to);
  if (params.criado_em_from) query = query.gte("criado_em", params.criado_em_from);
  if (params.criado_em_to) {
    // criado_em_to is a plain "YYYY-MM-DD" — compare against the start of
    // the *next* day so the whole day is included (criado_em has a
    // time-of-day component, so a naive lte would cut off anything after
    // midnight on that date).
    const nextDay = new Date(`${params.criado_em_to}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    query = query.lt("criado_em", nextDay.toISOString());
  }

  query = query.range(params.offset, params.offset + params.limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function getDeal(db: Client, id: string) {
  const { data, error } = await db.from("deals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

// Batched lookup for the lead detail panel's "Negócio" section — Week 1's
// model assumes at most one deal per lead (see scripts/migrate-monday.ts),
// so this is a lead_id -> deal map, not a one-to-many list.
export async function listDealsByLeadIds(db: Client, leadIds: string[]) {
  if (leadIds.length === 0) return [];
  const pages = await Promise.all(
    chunk(leadIds, IN_CHUNK_SIZE).map(async (page) => {
      const { data, error } = await db.from("deals").select("*").in("lead_id", page);
      if (error) throw error;
      return data ?? [];
    })
  );
  return pages.flat();
}

// Batched lookup — lets the commissions view resolve
// deal_products.deal_id -> lead_id (and thus lead name) with one query.
export async function listDealsByIds(db: Client, ids: string[]) {
  if (ids.length === 0) return [];
  const pages = await Promise.all(
    chunk(ids, IN_CHUNK_SIZE).map(async (page) => {
      const { data, error } = await db.from("deals").select("*").in("id", page);
      if (error) throw error;
      return data ?? [];
    })
  );
  return pages.flat();
}

export async function createDeal(db: Client, input: DealInsert) {
  const { data, error } = await db.from("deals").insert(input).select("*").single();
  if (error) throw error;

  await emitEvent({
    type: "deal.created",
    entidade_tipo: "deal",
    entidade_id: data.id,
    payload: { deal: data },
    occurred_at: new Date().toISOString(),
  });

  return data;
}

export async function updateDeal(db: Client, id: string, input: DealUpdate) {
  const previous = await getDeal(db, id);

  const { data, error } = await db.from("deals").update(input).eq("id", id).select("*").single();
  if (error) throw error;

  if (input.status && previous && input.status !== previous.status) {
    await emitEvent({
      type: "deal.status_changed",
      entidade_tipo: "deal",
      entidade_id: data.id,
      payload: { deal: data, previous_status: previous.status, new_status: data.status },
      occurred_at: new Date().toISOString(),
    });
  }

  return data;
}
