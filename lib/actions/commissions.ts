"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listCommissionRules, createCommissionRule, deleteCommissionRule } from "@/lib/data/commission-rules";
import { listCommissions, updateCommissionStatus } from "@/lib/data/commissions";
import { listDealProductsByIds } from "@/lib/data/deal-products";
import { listDealsByIds } from "@/lib/data/deals";
import { listLeadsByIds } from "@/lib/data/leads";
import type { CommissionStatus, UserRole } from "@/lib/types/database.types";

export interface CommissionViewModel {
  id: string;
  status: CommissionStatus;
  calculadoEm: string;
  valorCalculado: number | null;
  percentual: number | null;
  produto: string;
  valorBruto: number | null;
  vendedorId: string | null;
  leadId: string | null;
  leadNome: string | null;
  dealId: string | null;
}

// Backs the Comissões view — combines commission_rules (for the admin
// management panel) and commissions (joined, in JS, against deal_products
// -> deals -> leads, following this codebase's usual "separate queries +
// Map lookups" convention rather than a nested PostgREST select). RLS on
// each underlying table already scopes what comes back per caller: an
// admin sees everything, a seller sees only their own rule/commissions.
export async function fetchCommissionsDataAction() {
  const db = await createClient();
  const [rules, commissions] = await Promise.all([listCommissionRules(db), listCommissions(db)]);

  const dealProductIds = [...new Set(commissions.map((c) => c.deal_product_id))];
  const dealProducts = await listDealProductsByIds(db, dealProductIds);
  const dealProductById = new Map(dealProducts.map((dp) => [dp.id, dp]));

  const dealIds = [...new Set(dealProducts.map((dp) => dp.deal_id))];
  const deals = await listDealsByIds(db, dealIds);
  const dealById = new Map(deals.map((d) => [d.id, d]));

  const leadIds = [...new Set(deals.map((d) => d.lead_id))];
  const leads = await listLeadsByIds(db, leadIds);
  const leadById = new Map(leads.map((l) => [l.id, l]));

  const ruleById = new Map(rules.map((r) => [r.id, r]));

  const viewModels: CommissionViewModel[] = commissions.map((c) => {
    const dp = dealProductById.get(c.deal_product_id);
    const deal = dp ? dealById.get(dp.deal_id) : undefined;
    const lead = deal ? leadById.get(deal.lead_id) : undefined;
    const regra = c.regra_id ? ruleById.get(c.regra_id) : undefined;
    return {
      id: c.id,
      status: c.status,
      calculadoEm: c.calculado_em,
      valorCalculado: c.valor_calculado,
      percentual: regra?.percentual ?? null,
      produto: dp?.produto ?? "—",
      valorBruto: dp?.valor_bruto ?? null,
      vendedorId: dp?.vendedor_id ?? null,
      leadId: lead?.id ?? null,
      leadNome: lead?.nome ?? null,
      dealId: deal?.id ?? null,
    };
  });

  return { rules, commissions: viewModels };
}

export async function createCommissionRuleAction(input: {
  papel?: UserRole;
  vendedorId?: string;
  percentual: number;
  vigenteDesde: string;
}) {
  const db = await createClient();
  const rule = await createCommissionRule(db, {
    papel: input.papel ?? null,
    vendedor_id: input.vendedorId ?? null,
    percentual: input.percentual,
    vigente_desde: input.vigenteDesde,
  });
  revalidatePath("/crm");
  return rule;
}

export async function deleteCommissionRuleAction(id: string) {
  const db = await createClient();
  await deleteCommissionRule(db, id);
  revalidatePath("/crm");
}

export async function markCommissionPaidAction(id: string) {
  const db = await createClient();
  await updateCommissionStatus(db, id, "pago");
  revalidatePath("/crm");
}
