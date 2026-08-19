import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInBrazil } from "@/lib/format";

// Applies whichever commission_rules row is in effect for the seller — a
// vendor-specific override (commission_rules.vendedor_id) takes priority
// over their role-level default (commission_rules.papel), matching the
// "papel xor vendedor_id" design from Week 1. Uses the admin client (same
// reasoning as lib/automation/events.ts::emitEvent): commissions_insert is
// admin-only by RLS on purpose (Tier C, financial), but this is a system
// computation triggered by a trusted server action, not a direct user
// write — the closer only ever asserts the deal_product's valor/vendedor,
// never the commission amount itself.
//
// If no rule matches at all (nobody has configured a percentage for this
// seller/role yet), a commissions row is still created with
// regra_id/valor_calculado null, so the gap shows up as "sem regra" in the
// commissions view instead of the commission silently never existing.
export async function calculateCommissionForDealProduct(dealProductId: string, vendedorId: string, valorBase: number): Promise<void> {
  const db = createAdminClient();
  const today = todayInBrazil();

  const { data: vendedor } = await db.from("users").select("papel").eq("id", vendedorId).maybeSingle();

  const { data: personalRule } = await db
    .from("commission_rules")
    .select("id, percentual")
    .eq("vendedor_id", vendedorId)
    .lte("vigente_desde", today)
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();

  let rule = personalRule;
  if (!rule && vendedor?.papel) {
    const { data: roleRule } = await db
      .from("commission_rules")
      .select("id, percentual")
      .eq("papel", vendedor.papel)
      .lte("vigente_desde", today)
      .order("vigente_desde", { ascending: false })
      .limit(1)
      .maybeSingle();
    rule = roleRule;
  }

  // percentual is stored as a whole number (10 means 10%), so admins enter
  // the same number they'd say out loud — divide by 100 only here, at the
  // point of use.
  const { error } = await db.from("commissions").insert({
    deal_product_id: dealProductId,
    regra_id: rule?.id ?? null,
    valor_calculado: rule ? valorBase * (rule.percentual / 100) : null,
    status: "pendente",
  });
  if (error) throw error;
}
