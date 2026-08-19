"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createLead, updateLead, getLead, listLeads, type LeadCursor } from "@/lib/data/leads";
import { listDealsByLeadIds } from "@/lib/data/deals";
import { listAttributionByLeadIds } from "@/lib/data/lead-attribution";
import { listQualificationsFor } from "@/lib/data/qualifications";
import { monthDateRange } from "@/lib/format";
import { sendEmail } from "@/lib/mailer";
import { renderPrimeiroContatoEmail } from "@/lib/email-templates/primeiro-contato";
import type { Database, DealStatus, LeadStatus } from "@/lib/types/database.types";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export interface LeadFilters {
  /** "Etapa (Lead)" — filters by the lead's own status. */
  status?: LeadStatus;
  /** "Etapa (Negócio)" — filters by the associated deal's status; see
   * lib/data/leads.ts's ListLeadsParams.deal_status for why this is a
   * separate field from `status` rather than one merged "Etapa" filter. */
  deal_status?: DealStatus;
  niche_id?: string;
  owner_sdr_id?: string;
  criado_em_from?: string;
  criado_em_to?: string;
}

export async function createLeadAction(input: LeadInsert) {
  const db = await createClient();
  const lead = await createLead(db, input);
  revalidatePath("/crm");
  return lead;
}

export async function moveLeadAction(id: string, status: LeadStatus) {
  const db = await createClient();
  const lead = await updateLead(db, id, { status });
  revalidatePath("/crm");
  return lead;
}

// Claim (blueprint §2.2 Etapa 1, step 3): assigns the caller as owner_sdr_id
// and advances the lead out of "novo". Relies on the leads_update RLS
// policy's claim carve-out (see supabase/migrations/*_kanban_rls_adjustments.sql)
// — it fails server-side if the lead already has an owner.
export async function claimLeadAction(id: string) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const lead = await updateLead(db, id, { owner_sdr_id: user.id, status: "em_atendimento" });
  revalidatePath("/crm");
  return lead;
}

// Full-field edit from the lead detail panel (the table's row-click drawer)
// — a broader surface than moveLeadAction/claimLeadAction, which only ever
// touch status/ownership. RLS (owns_lead) still applies, same as any other
// leads update.
export async function updateLeadDetailsAction(id: string, input: LeadUpdate) {
  const db = await createClient();
  const lead = await updateLead(db, id, input);
  revalidatePath("/crm");
  return lead;
}

// Loss reason capture (Week 2.6) — see components/kanban/mark-lost-modal.tsx.
// lost_reasons/leads.motivo_perda_id have existed since Week 1 but nothing
// wrote to them until now.
export async function markLeadLostAction(id: string, motivoId: string) {
  const db = await createClient();
  const lead = await updateLead(db, id, { status: "perdido", motivo_perda_id: motivoId });
  revalidatePath("/crm");
  return lead;
}

// "Enviar e-mail de primeiro contato" — a fixed company template (see
// lib/email-templates/primeiro-contato.ts), always sent/signed as José
// Matheus regardless of which SDR clicks the button, via Gmail SMTP
// (lib/mailer.ts). Personalized only by lead-specific fields (nome,
// empresa); José's own name/WhatsApp are baked into the template itself.
export async function sendFirstContactEmailAction(leadId: string): Promise<void> {
  const db = await createClient();
  const lead = await getLead(db, leadId);
  if (!lead) throw new Error("Lead não encontrado.");
  if (!lead.email) throw new Error("Esse lead não tem e-mail cadastrado.");

  const whatsappNumber = process.env.JOSE_WHATSAPP_NUMBER;
  if (!whatsappNumber) throw new Error("JOSE_WHATSAPP_NUMBER não configurado no .env.local.");

  const primeiroNome = lead.nome.trim().split(/\s+/)[0] || lead.nome;
  const nomeEscritorio = lead.empresa || lead.nome;

  const { subject, html } = renderPrimeiroContatoEmail({ primeiroNome, nomeEscritorio, whatsappNumber });
  await sendEmail({
    to: lead.email,
    subject,
    html,
    attachments: [{ filename: "scale-icon.png", path: path.join(process.cwd(), "public/scale-icon.png"), cid: "scale-logo" }],
  });
}

// Backs the SDR's pipeline board — a specific SDR's active leads aren't
// necessarily inside the page's global recency-sorted top-200, so this
// self-fetches on demand rather than reusing the page's initial load.
// `month` ("YYYY-MM", Week 2.7 follow-up) defaults the board to the current
// month so "Novo"/"Em Atendimento" don't silently accumulate years of
// never-followed-up leads — null means no date filtering at all.
export async function fetchSdrPipelineAction(sdrId?: string, month?: string | null) {
  const db = await createClient();
  const range = month ? monthDateRange(month) : null;
  const { data: leads } = await listLeads(db, {
    owner_sdr_id: sdrId,
    limit: 300,
    criado_em_from: range?.from,
    criado_em_to: range?.to,
  });
  const qualifications = await listQualificationsFor(
    db,
    "lead",
    leads.map((l) => l.id)
  );
  return { leads, qualifiedLeadIds: qualifications.map((q) => q.entidade_id) };
}

// Shared by filterLeadsAction and loadMoreLeadsAction — fetches a page of
// leads matching `filters` plus the deals/attribution/qualifications for
// exactly those leads, so the table's Etapa/Closer/Valor columns stay
// correct for the page (see lib/leads-table-columns.tsx's deal-aware
// rendering).
async function fetchLeadsPage(filters: LeadFilters, limit: number, before?: LeadCursor) {
  const db = await createClient();
  const { data: leads, total } = await listLeads(db, { limit, before, ...filters });
  const leadIds = leads.map((l) => l.id);

  const [deals, attributions, qualifications] = await Promise.all([
    listDealsByLeadIds(db, leadIds),
    listAttributionByLeadIds(db, leadIds),
    listQualificationsFor(db, "lead", leadIds),
  ]);

  return { leads, total, deals, attributions, qualifiedLeadIds: qualifications.map((q) => q.entidade_id) };
}

// Applying/changing a filter starts the list over from the top (not a
// "load more" — the previous page's cursor doesn't make sense against a
// different filter).
export async function filterLeadsAction(filters: LeadFilters, limit = 200) {
  return fetchLeadsPage(filters, limit);
}

// Pagination for the leads table — the initial page load only fetches the
// first `limit` leads (see app/(app)/crm/page.tsx), since the Monday
// migration brought in 7000+ real leads and shipping them all in one
// Server Component payload isn't reasonable.
//
// Cursor-based (criado_em + id of the last-loaded lead), not offset-based —
// see lib/data/leads.ts's ListLeadsParams.before comment for why offset
// broke against the live Monday migration (it returned the same 200 rows
// twice). `filters` must match whatever's currently applied in the UI, or
// "load more" would silently pull in rows outside the active filter.
export async function loadMoreLeadsAction(cursor: LeadCursor, filters: LeadFilters = {}, limit = 200) {
  return fetchLeadsPage(filters, limit, cursor);
}
