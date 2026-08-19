import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CrmEvent } from "@/lib/automation/types";
import type { Json } from "@/lib/types/database.types";

// Week 1: "log + defer" only. Matches active automation_rules for the
// event's evento_gatilho, does a naive JSON-subset condition match, and
// writes one automation_logs row per match with status='pendente'. Nothing
// here executes a real action (send WhatsApp, create contract, etc) — that
// requires the BullMQ/Upstash worker (Phase 1.5+) draining these 'pendente'
// rows, and the typed adapters in lib/adapters/*.ts. Building this seam now
// means later weeks don't have to go find every mutation call site again.
//
// Failures here are logged, not thrown — an automation-engine hiccup
// (missing rule, bad condition shape) must never block the primary CRUD
// write that triggered the event.
function matchesCondition(condicao: unknown, payload: Record<string, unknown>): boolean {
  if (!condicao || typeof condicao !== "object") return true;
  return Object.entries(condicao as Record<string, unknown>).every(([key, expected]) => payload[key] === expected);
}

export async function emitEvent(event: CrmEvent): Promise<void> {
  try {
    const db = createAdminClient();

    const { data: rules, error } = await db
      .from("automation_rules")
      .select("id, condicao, acoes")
      .eq("evento_gatilho", event.type)
      .eq("ativo", true);

    if (error) throw error;
    if (!rules || rules.length === 0) return;

    const matched = rules.filter((rule) => matchesCondition(rule.condicao, event.payload));
    if (matched.length === 0) return;

    const logs = matched.map((rule) => ({
      rule_id: rule.id,
      entidade_ref: event.entidade_id,
      status: "pendente" as const,
      payload: { event, acoes: rule.acoes } as unknown as Json,
    }));

    const { error: insertError } = await db.from("automation_logs").insert(logs);
    if (insertError) throw insertError;
  } catch (err) {
    console.error(`[emitEvent] failed to log automation event "${event.type}"`, err);
  }
}
