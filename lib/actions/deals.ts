"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createDeal, updateDeal, listDeals, getDeal } from "@/lib/data/deals";
import { createMeeting, listMeetingsByDealIds } from "@/lib/data/meetings";
import { listQualificationsFor } from "@/lib/data/qualifications";
import { getLead } from "@/lib/data/leads";
import { getUserEmail } from "@/lib/data/users";
import { createDealProduct } from "@/lib/data/deal-products";
import { calculateCommissionForDealProduct } from "@/lib/commissions/calculate";
import { buildGoogleCalendarEventUrl, MEETING_DURATION_MINUTES } from "@/lib/google-calendar-link";
import { getFreeSlots } from "@/lib/google-calendar-availability";
import { monthDateRange, todayInBrazil } from "@/lib/format";
import type { Database, DealStatus } from "@/lib/types/database.types";

type DealInsert = Database["public"]["Tables"]["deals"]["Insert"];

// Creating a deal is how a lead moves from the SDR stage into the Closer
// stage (blueprint §2.2 Etapa 1, step 5 — "SDR liga e tenta marcar reunião
// com um closer"). Relies on the deals_insert RLS policy's SDR carve-out
// (see supabase/migrations/*_kanban_rls_adjustments.sql). Also creates the
// paired meetings row (Week 2.6) — "Marcar reunião" should actually mark
// one, not just create a deal; the Closer's board's Agendado/No Show
// columns are derived from this row's status (see closer-pipeline-board.tsx).
//
// `horario` (optional, "HH:mm") + `notasInternas` come from the SDR at
// booking time, not from `input` — a real time-of-day and the internal-only
// lead notes aren't deal fields, they're meeting fields. When a closer +
// date + time are all present, this also returns a pre-filled Google
// Calendar link (lib/google-calendar-link.ts) — CreateDealModal opens it in
// a new tab so the SDR creates the real event from their own logged-in
// Google account. Not done via API: a bare Service Account can't invite
// attendees at all (confirmed against the real Calendar API — 403
// "forbiddenForServiceAccounts"), and fixing that needs Domain-Wide
// Delegation, which requires Google Workspace + admin setup neither side
// has done. The link needs no credentials and has none of that
// restriction. `notasInternas` is deliberately NEVER put in the link
// (it becomes the client-visible event description); it's saved on
// meetings.notas_internas instead, CRM-internal only.
export async function createDealAction(input: DealInsert, meetingDetails?: { horario?: string; notasInternas?: string }) {
  const db = await createClient();
  const deal = await createDeal(db, input);
  let googleCalendarUrl: string | null = null;

  if (deal.closer_id) {
    if (deal.data_agendamento && meetingDetails?.horario) {
      const [lead, closerEmail] = await Promise.all([getLead(db, deal.lead_id), getUserEmail(deal.closer_id)]);
      const attendeeEmails = [closerEmail, lead?.email].filter((email): email is string => !!email);

      googleCalendarUrl = buildGoogleCalendarEventUrl({
        title: `Reunião com ${lead?.nome ?? "lead"}`,
        date: deal.data_agendamento,
        horario: meetingDetails.horario,
        durationMinutes: MEETING_DURATION_MINUTES,
        attendeeEmails,
      });
    }

    await createMeeting(db, {
      referencia_tipo: "deal",
      referencia_id: deal.id,
      tipo: "venda",
      responsavel_id: deal.closer_id,
      status: "marcada",
      notas_internas: meetingDetails?.notasInternas || null,
    });
  }

  revalidatePath("/crm");
  return { deal, googleCalendarUrl };
}

// Suggested time slots for "Marcar reunião" (Week 2.7) — reads the
// closer's real Google Calendar (free/busy only, no event creation), so
// the SDR isn't guessing a time blind. Requires the closer to have shared
// their calendar with the service account first; returns null (silently,
// no error surfaced) until they have — see lib/google-calendar-availability.ts.
export async function getCloserAvailabilityAction(closerId: string, date: string): Promise<string[] | null> {
  const closerEmail = await getUserEmail(closerId);
  return getFreeSlots(closerEmail, date);
}

// Same lookup as above, batched across every closer at once — lets
// CreateDealModal show each closer's free slots upfront (so the SDR picks
// *who to book* based on who's actually free, instead of picking a closer
// blind and only then finding out their calendar) rather than one
// request per closer selection.
export async function getAllClosersAvailabilityAction(closerIds: string[], date: string): Promise<Record<string, string[] | null>> {
  const entries = await Promise.all(closerIds.map(async (id) => [id, await getCloserAvailabilityAction(id, date)] as const));
  return Object.fromEntries(entries);
}

// "Marcar R2" — a follow-up meeting on a deal already in negotiation,
// booked by the closer themselves (not the SDR, and not the deal's first
// meeting created by createDealAction above). Deliberately doesn't touch
// `deals`/`meetings` at all: this codebase's meetings model assumes at
// most one meetings row per deal (see lib/data/meetings.ts), which already
// represents the R1 booked via "Marcar reunião" — recording a second,
// distinctly-tracked meeting would need a real schema change (multiple
// meetings per deal), which is out of scope here. This is purely a
// scheduling shortcut: look up the deal's lead/closer, build the same kind
// of pre-filled Google Calendar link "Marcar reunião" uses, and hand it
// back for the closer to open and save themselves.
export async function scheduleR2Action(dealId: string, date: string, horario: string): Promise<string | null> {
  const db = await createClient();
  const deal = await getDeal(db, dealId);
  if (!deal?.closer_id) return null;

  const [lead, closerEmail] = await Promise.all([getLead(db, deal.lead_id), getUserEmail(deal.closer_id)]);
  const attendeeEmails = [closerEmail, lead?.email].filter((email): email is string => !!email);

  return buildGoogleCalendarEventUrl({
    title: `R2 com ${lead?.nome ?? "lead"}`,
    date,
    horario,
    durationMinutes: MEETING_DURATION_MINUTES,
    attendeeEmails,
  });
}

export async function moveDealAction(id: string, status: DealStatus) {
  const db = await createClient();
  const deal = await updateDeal(db, id, { status });
  revalidatePath("/crm");
  return deal;
}

// Closer's inline picker (leads-table.tsx, per explicit user request —
// "closer tem que ser selecionável tbm") — closer_id lives on deals, not
// leads, so this bypasses updateLeadDetailsAction (leads-only) the same
// way moveDealAction does for status. Only reachable for a lead that
// already has a deal (same precondition Valor/Modelo/etc. already have).
export async function updateDealCloserAction(id: string, closerId: string | null) {
  const db = await createClient();
  const deal = await updateDeal(db, id, { closer_id: closerId });
  revalidatePath("/crm");
  return deal;
}

// Opened instead of a direct status write whenever a deal moves to
// "Fechado" (see the handleMove branch in deals-board.tsx and
// closer-pipeline-board.tsx) — captures the closed value and which seller
// gets credit, which is what commissions.deal_product_id ultimately keys
// off. Three writes: the deal itself (status + valor_bruto, so the existing
// Valor column in the leads table/DealCard populates), a deal_products row
// (the level vendedor_id actually lives at), and the resulting commission
// (lib/commissions/calculate.ts, applying whatever rule is in effect).
export async function closeDealAction(id: string, input: { valorBruto: number; vendedorId: string }) {
  const db = await createClient();
  const deal = await updateDeal(db, id, {
    status: "fechado",
    valor_bruto: input.valorBruto,
    data_fechamento: todayInBrazil(),
  });
  const dealProduct = await createDealProduct(db, {
    deal_id: id,
    produto: "Fechamento",
    valor_bruto: input.valorBruto,
    vendedor_id: input.vendedorId,
  });
  await calculateCommissionForDealProduct(dealProduct.id, input.vendedorId, input.valorBruto);
  revalidatePath("/crm");
  return deal;
}

// Loss reason capture (Week 2.6) — see components/kanban/mark-lost-modal.tsx.
// lost_reasons/deals.motivo_perda have existed since Week 1 but nothing
// wrote to them until now.
export async function markDealLostAction(id: string, motivoId: string) {
  const db = await createClient();
  const deal = await updateDeal(db, id, { status: "perdido", motivo_perda: motivoId });
  revalidatePath("/crm");
  return deal;
}

// Backs the Closer's pipeline board — a specific closer's active deals
// aren't necessarily inside the page's global recency-sorted top-200, so
// this self-fetches on demand rather than reusing the page's initial load
// (same reasoning as fetchSdrPipelineAction in lib/actions/leads.ts).
// `month` ("YYYY-MM", Week 2.7 follow-up) defaults the board to the current
// month — null means no date filtering at all.
export async function fetchCloserPipelineAction(closerId?: string, month?: string | null) {
  const db = await createClient();
  const range = month ? monthDateRange(month) : null;
  const { data: deals } = await listDeals(db, {
    closer_id: closerId,
    limit: 300,
    offset: 0,
    criado_em_from: range?.from,
    criado_em_to: range?.to,
  });
  const dealIds = deals.map((d) => d.id);
  const [qualifications, meetings] = await Promise.all([listQualificationsFor(db, "deal", dealIds), listMeetingsByDealIds(db, dealIds)]);
  return { deals, qualifiedDealIds: qualifications.map((q) => q.entidade_id), meetings: [...meetings.entries()] };
}
