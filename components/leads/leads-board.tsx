"use client";

import { useEffect, useState } from "react";
import { KanbanBoard, type KanbanColumnDef } from "@/components/kanban/kanban-board";
import { LeadCard } from "@/components/kanban/lead-card";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadDetailPanel } from "@/components/leads/lead-detail-panel";
import { CreateLeadModal } from "@/components/kanban/create-lead-modal";
import { CreateDealModal } from "@/components/kanban/create-deal-modal";
import { QualifyModal } from "@/components/kanban/qualify-modal";
import { MarkLostModal } from "@/components/kanban/mark-lost-modal";
import {
  moveLeadAction,
  claimLeadAction,
  loadMoreLeadsAction,
  filterLeadsAction,
  sendFirstContactEmailAction,
  type LeadFilters,
} from "@/lib/actions/leads";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/form-styles";
import type { Database, LeadStatus } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadAttribution = Database["public"]["Tables"]["lead_attribution"]["Row"];
type Deal = Database["public"]["Tables"]["deals"]["Row"];

// Appends `incoming` to `existing`, dropping any row whose id is already
// present — see the "Carregar mais" comment in handleLoadMore for why this
// is needed against a table under concurrent writes.
function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const seen = new Set(existing.map((item) => item.id));
  const fresh = incoming.filter((item) => !seen.has(item.id));
  return [...existing, ...fresh];
}

const LEAD_COLUMNS: KanbanColumnDef[] = [
  { key: "novo", label: "Novo" },
  { key: "em_atendimento", label: "Em Atendimento" },
  { key: "follow_up", label: "Follow Up" },
  { key: "reuniao_agendada", label: "Reunião Agendada" },
  { key: "convertido", label: "Convertido" },
  { key: "perdido", label: "Perdido" },
];

interface QualificationReason {
  id: string;
  descricao: string;
}
interface LostReason {
  id: string;
  descricao: string;
}
interface Person {
  id: string;
  nome: string;
  foto_url: string | null;
}
interface Niche {
  id: string;
  nome: string;
}

interface LeadsBoardProps {
  view: "table" | "kanban";
  initialLeads: Lead[];
  totalLeads: number;
  niches: Niche[];
  sdrs: Person[];
  closers: Person[];
  reasons: QualificationReason[];
  lostReasons: LostReason[];
  qualifiedLeadIds: string[];
  currentUserId: string | null;
  currentUserRole: string | null;
  attributions: LeadAttribution[];
  deals: Deal[];
  /** Owned by the parent CrmWorkspace, not here — the filter toolbar lives
   * next to the view tabs (CrmViewTabs), one level up, since it applies to
   * both the table and kanban views of the same lead list. */
  filters: LeadFilters;
  /** Also owned by CrmWorkspace — the column picker button lives in the
   * workspace toolbar next to Filtros/Colunas, not inside the table. */
  visibleColumns: Set<string>;
}

// Owns all lead state (list, qualification set, the four modals) regardless
// of which view is showing — `view` is controlled by the parent
// CrmWorkspace (sidebar selection), not managed here, so switching views
// doesn't lose in-flight state or refetch anything.
//
// deals/attributions/totalLeads are local state (not just derived from
// props) because "Carregar mais" and filtering both need to replace/extend
// them — see handleLoadMore and the filters effect below.
export function LeadsBoard({
  view,
  initialLeads,
  totalLeads: initialTotalLeads,
  niches,
  sdrs,
  closers,
  reasons,
  lostReasons,
  qualifiedLeadIds,
  currentUserId,
  currentUserRole,
  attributions: initialAttributions,
  deals: initialDeals,
  filters,
  visibleColumns,
}: LeadsBoardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [totalLeads, setTotalLeads] = useState(initialTotalLeads);
  const [deals, setDeals] = useState(initialDeals);
  const [attributions, setAttributions] = useState(initialAttributions);
  const [qualifiedIds, setQualifiedIds] = useState(new Set(qualifiedLeadIds));
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [dealModalLead, setDealModalLead] = useState<Lead | null>(null);
  const [qualifyLeadId, setQualifyLeadId] = useState<string | null>(null);
  const [lostLeadId, setLostLeadId] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [sentEmailIds, setSentEmailIds] = useState<Set<string>>(new Set());

  // Re-fetches whenever the filter (owned by CrmWorkspace) changes — this
  // intentionally re-fetches on mount too (not just on change), because
  // this component can mount fresh with a non-empty `filters` (the user
  // filtered while on "Quadro principal", then switched to "Kanban": that's
  // a brand-new LeadsBoard instance whose `initialLeads` prop is still the
  // *unfiltered* page load, so it must reconcile with the active filter
  // immediately rather than only reacting to future changes).
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setFiltering(true);
      setError(null);
      try {
        const result = await filterLeadsAction(filters);
        if (cancelled) return;
        setLeads(result.leads);
        setDeals(result.deals);
        setAttributions(result.attributions);
        setTotalLeads(result.total);
        setQualifiedIds(new Set(result.qualifiedLeadIds));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao filtrar leads.");
      } finally {
        if (!cancelled) setFiltering(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const nicheById = new Map(niches.map((n) => [n.id, n.nome]));
  const sdrById = new Map(sdrs.map((s) => [s.id, { nome: s.nome, foto_url: s.foto_url }]));
  const closerById = new Map(closers.map((c) => [c.id, { nome: c.nome, foto_url: c.foto_url }]));
  const attributionByLeadId = new Map(attributions.map((a) => [a.lead_id, a]));
  const dealByLeadId = new Map(deals.map((d) => [d.lead_id, d]));

  function updateLeadLocal(id: string, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  // Moving to "Perdido" needs a reason first (see mark-lost-modal.tsx) — the
  // status write is deferred until the modal is submitted, same rule
  // applied everywhere a lead/deal can reach "Perdido".
  async function handleMove(id: string, newStatus: string) {
    if (newStatus === "perdido") {
      setLostLeadId(id);
      return;
    }
    const previous = leads.find((l) => l.id === id);
    if (!previous) return;
    updateLeadLocal(id, { status: newStatus as LeadStatus });
    try {
      await moveLeadAction(id, newStatus as LeadStatus);
    } catch (err) {
      updateLeadLocal(id, { status: previous.status });
      setError(err instanceof Error ? err.message : "Erro ao mover lead.");
    }
  }

  async function handleClaim(id: string) {
    if (!currentUserId) return;
    const previous = leads.find((l) => l.id === id);
    if (!previous) return;
    updateLeadLocal(id, { owner_sdr_id: currentUserId, status: "em_atendimento" });
    try {
      await claimLeadAction(id);
    } catch (err) {
      updateLeadLocal(id, { owner_sdr_id: previous.owner_sdr_id, status: previous.status });
      setError(err instanceof Error ? err.message : "Erro ao reivindicar lead.");
    }
  }

  async function handleSendFirstContactEmail(id: string) {
    setSendingEmailId(id);
    setError(null);
    try {
      await sendFirstContactEmailAction(id);
      setSentEmailIds((prev) => new Set(prev).add(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar e-mail.");
    } finally {
      setSendingEmailId(null);
    }
  }

  async function handleLoadMore() {
    // Leads are ordered by criado_em desc (nulls last), id desc — the last
    // element is the "oldest"/last one in that ordering, so its
    // (criado_em, id) pair is the correct cursor for "give me the next
    // batch after this" (see lib/data/leads.ts's ListLeadsParams.before).
    const last = leads[leads.length - 1];
    if (!last) return;

    setLoadingMore(true);
    setError(null);
    try {
      const more = await loadMoreLeadsAction({ criado_em: last.criado_em, id: last.id }, filters);
      // Dedupe defensively even with cursor pagination.
      setLeads((prev) => mergeById(prev, more.leads));
      setDeals((prev) => mergeById(prev, more.deals));
      setAttributions((prev) => mergeById(prev, more.attributions));
      setTotalLeads(more.total);
      setQualifiedIds((prev) => {
        const next = new Set(prev);
        for (const id of more.qualifiedLeadIds) next.add(id);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar mais leads.");
    } finally {
      setLoadingMore(false);
    }
  }

  const detailDeal = detailLead ? (dealByLeadId.get(detailLead.id) ?? null) : null;

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="underline">
            fechar
          </button>
        </div>
      )}

      {view === "kanban" && (
        <div className="mb-4 flex items-center justify-end">
          <button type="button" onClick={() => setShowCreateLead(true)} className={primaryButtonClass}>
            + Novo lead
          </button>
        </div>
      )}

      {view === "table" ? (
        <>
          <div className={filtering ? "opacity-50 transition-opacity" : "transition-opacity"}>
            <LeadsTable
              leads={leads}
              sdrById={sdrById}
              nicheById={nicheById}
              closerById={closerById}
              dealByLeadId={dealByLeadId}
              onRowClick={setDetailLead}
              visibleColumns={visibleColumns}
              onNewLead={() => setShowCreateLead(true)}
            />
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <p className="text-xs text-muted">
              Mostrando {leads.length} de {totalLeads}
            </p>
            {leads.length < totalLeads && (
              <button type="button" onClick={handleLoadMore} disabled={loadingMore} className={secondaryButtonClass}>
                {loadingMore ? "Carregando…" : "Carregar mais"}
              </button>
            )}
          </div>
        </>
      ) : (
        <KanbanBoard
          columns={LEAD_COLUMNS}
          items={leads}
          onMove={handleMove}
          renderCard={(lead) => (
            <LeadCard
              lead={lead}
              sdr={lead.owner_sdr_id ? (sdrById.get(lead.owner_sdr_id) ?? null) : null}
              nicheName={lead.niche_id ? (nicheById.get(lead.niche_id) ?? null) : null}
              isPendingQualification={lead.status !== "novo" && !qualifiedIds.has(lead.id)}
              canClaim={currentUserRole === "sdr" || currentUserRole === "admin"}
              onClaim={() => handleClaim(lead.id)}
              onQualify={() => setQualifyLeadId(lead.id)}
              onScheduleMeeting={() => setDealModalLead(lead)}
              onSendFirstContactEmail={() => handleSendFirstContactEmail(lead.id)}
              sendingFirstContactEmail={sendingEmailId === lead.id}
              firstContactEmailSent={sentEmailIds.has(lead.id)}
            />
          )}
        />
      )}

      <CreateLeadModal
        open={showCreateLead}
        onClose={() => setShowCreateLead(false)}
        niches={niches}
        onCreated={(lead) => setLeads((prev) => [lead, ...prev])}
      />

      {dealModalLead && (
        <CreateDealModal
          open={!!dealModalLead}
          onClose={() => setDealModalLead(null)}
          leadId={dealModalLead.id}
          leadNome={dealModalLead.nome}
          closers={closers}
          onCreated={() => {
            const leadId = dealModalLead.id;
            updateLeadLocal(leadId, { status: "reuniao_agendada" });
            moveLeadAction(leadId, "reuniao_agendada").catch(() => {});
          }}
        />
      )}

      {qualifyLeadId && (
        <QualifyModal
          open={!!qualifyLeadId}
          onClose={() => setQualifyLeadId(null)}
          entidadeTipo="lead"
          entidadeId={qualifyLeadId}
          etapa="sdr"
          reasons={reasons}
          onQualified={() => {
            const id = qualifyLeadId;
            setQualifiedIds((prev) => new Set(prev).add(id));
          }}
        />
      )}

      {lostLeadId && (
        <MarkLostModal
          open={!!lostLeadId}
          onClose={() => setLostLeadId(null)}
          entidadeTipo="lead"
          entidadeId={lostLeadId}
          reasons={lostReasons}
          onMarked={() => updateLeadLocal(lostLeadId, { status: "perdido" })}
        />
      )}

      <LeadDetailPanel
        key={detailLead?.id ?? "closed"}
        lead={detailLead}
        attribution={detailLead ? (attributionByLeadId.get(detailLead.id) ?? null) : null}
        deal={detailDeal}
        closer={detailDeal?.closer_id ? (closerById.get(detailDeal.closer_id) ?? null) : null}
        niches={niches}
        sdrs={sdrs}
        currentUserRole={currentUserRole}
        onClose={() => setDetailLead(null)}
        onSaved={(lead) => updateLeadLocal(lead.id, lead)}
        onDeleted={(id) => {
          setLeads((prev) => prev.filter((l) => l.id !== id));
          setTotalLeads((prev) => Math.max(0, prev - 1));
        }}
      />
    </div>
  );
}
