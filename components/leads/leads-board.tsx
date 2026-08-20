"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Layers, Table2 } from "lucide-react";
import { KanbanBoard, type KanbanColumnDef } from "@/components/kanban/kanban-board";
import { LeadCard } from "@/components/kanban/lead-card";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadDetailPanel } from "@/components/leads/lead-detail-panel";
import { CreateLeadModal } from "@/components/kanban/create-lead-modal";
import { CreateDealModal } from "@/components/kanban/create-deal-modal";
import { CloseDealModal } from "@/components/kanban/close-deal-modal";
import { QualifyModal } from "@/components/kanban/qualify-modal";
import { MarkLostModal } from "@/components/kanban/mark-lost-modal";
import {
  moveLeadAction,
  claimLeadAction,
  loadMoreLeadsAction,
  filterLeadsAction,
  sendFirstContactEmailAction,
  updateLeadDetailsAction,
  bulkDeleteLeadsAction,
  type LeadFilters,
} from "@/lib/actions/leads";
import { moveDealAction } from "@/lib/actions/deals";
import { createNicheAction } from "@/lib/actions/niches";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import type { Database, LeadStatus, DealStatus } from "@/lib/types/database.types";

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
  initialLeads: Lead[];
  totalLeads: number;
  niches: Niche[];
  sdrs: Person[];
  closers: Person[];
  reasons: QualificationReason[];
  lostReasons: LostReason[];
  /** Closer-side loss reasons — needed here (not just deals-board.tsx)
   * because Etapa's inline picker (leads-table.tsx) can mark a *deal* lost
   * too, once a row has one. */
  closerLostReasons: LostReason[];
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
  /** A niche created from the table's inline "Nicho" combobox bubbles up
   * to CrmWorkspace, which owns the `niches` list as state precisely so
   * every mounted board (Quadro principal/Orgânico/Tráfego are separate
   * LeadsBoard instances) sees the new option immediately, without a full
   * page reload. */
  onNicheCreated: (niche: Niche) => void;
}

// Owns all lead state (list, qualification set, the four modals) regardless
// of which view is showing. `view` (table vs. kanban) is now local state,
// not a prop — each Quadro tab is its own LeadsBoard instance with its own
// already-filtered lead list (see crm-workspace.tsx's ORIGEM_ORGANICO/
// ORIGEM_TRAFEGO), so a per-instance toggle is what makes "see Quadro
// Orgânico as a kanban" show *orgânico* leads instead of the whole table,
// which a single global "Kanban" tab couldn't do. Switching views
// doesn't lose in-flight state or refetch anything.
//
// deals/attributions/totalLeads are local state (not just derived from
// props) because "Carregar mais" and filtering both need to replace/extend
// them — see handleLoadMore and the filters effect below.
export function LeadsBoard({
  initialLeads,
  totalLeads: initialTotalLeads,
  niches,
  sdrs,
  closers,
  reasons,
  lostReasons,
  closerLostReasons,
  qualifiedLeadIds,
  currentUserId,
  currentUserRole,
  attributions: initialAttributions,
  deals: initialDeals,
  filters,
  visibleColumns,
  onNicheCreated,
}: LeadsBoardProps) {
  const [view, setView] = useState<"table" | "grouped" | "kanban">("table");
  const [leads, setLeads] = useState(initialLeads);
  const [totalLeads, setTotalLeads] = useState(initialTotalLeads);
  const [deals, setDeals] = useState(initialDeals);
  const [attributions, setAttributions] = useState(initialAttributions);
  const [qualifiedIds, setQualifiedIds] = useState(new Set(qualifiedLeadIds));
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [dealModalLead, setDealModalLead] = useState<Lead | null>(null);
  const [qualifyLeadId, setQualifyLeadId] = useState<string | null>(null);
  const [lostLeadId, setLostLeadId] = useState<string | null>(null);
  const [lostDealId, setLostDealId] = useState<string | null>(null);
  const [closeDealId, setCloseDealId] = useState<string | null>(null);
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
        // A date-bounded fetch (Quadro tabs' MonthFilter sets criado_em_from)
        // is safe to load in full — some months run 400+ leads, but
        // lib/data/*'s batched deal/attribution/qualification lookups now
        // chunk their .in() queries (see lib/utils.ts's chunk) so that
        // stopped being the limiting factor — so it skips the 200-row
        // "Carregar mais" cap entirely instead of making the user click
        // through an already-bounded month. Unbounded ("todos os períodos")
        // keeps the smaller default; that's the genuinely large case
        // pagination exists for.
        const limit = filters.criado_em_from ? 1000 : 200;
        const result = await filterLeadsAction(filters, limit);
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

  function updateDealLocal(id: string, patch: Partial<Deal>) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
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

  // Inline table edits (components/leads/editable-cell.tsx) — one field at
  // a time, same optimistic-update-then-rollback shape as handleMove/
  // handleClaim above. Reuses updateLeadDetailsAction (the same call the
  // full detail panel's Save button makes) rather than a dedicated action,
  // since a single-field patch is already exactly what that action expects.
  async function handleFieldSave(id: string, field: keyof Lead, value: string | null) {
    const previous = leads.find((l) => l.id === id);
    if (!previous) return;
    const numericField = field === "faturamento_medio";
    const patch = { [field]: numericField && value ? Number(value) : value } as Partial<Lead>;
    updateLeadLocal(id, patch);
    try {
      await updateLeadDetailsAction(id, patch);
    } catch (err) {
      updateLeadLocal(id, { [field]: previous[field] } as Partial<Lead>);
      setError(err instanceof Error ? err.message : "Erro ao salvar campo.");
    }
  }

  // Etapa's inline picker (leads-table.tsx) — a row with no deal edits
  // leads.status via the exact same path as the Kanban drag (handleMove
  // above, "perdido" included). A row *with* a deal edits deals.status
  // instead, mirroring deals-board.tsx's own handleMove: "perdido" opens
  // MarkLostModal (entidadeTipo="deal"), "fechado" opens CloseDealModal
  // (needs valor + vendedor, can't be a bare status write), anything else
  // is a direct optimistic moveDealAction.
  async function handleEtapaChange(leadId: string, dealId: string | null, newStatus: string) {
    if (!dealId) {
      await handleMove(leadId, newStatus);
      return;
    }
    if (newStatus === "perdido") {
      setLostDealId(dealId);
      return;
    }
    if (newStatus === "fechado") {
      setCloseDealId(dealId);
      return;
    }
    const previous = deals.find((d) => d.id === dealId);
    if (!previous) return;
    updateDealLocal(dealId, { status: newStatus as DealStatus });
    try {
      await moveDealAction(dealId, newStatus as DealStatus);
    } catch (err) {
      updateDealLocal(dealId, { status: previous.status });
      setError(err instanceof Error ? err.message : "Erro ao mover negócio.");
    }
  }

  // "Excluir selecionados" (leads-table.tsx's row checkboxes). Doesn't
  // optimistically update-then-rollback like the single-field edits above —
  // a batch of N leads failing partway through is rare enough, and the
  // "did it work" signal (leads disappearing from the list) only needs to
  // land once the server confirms, not before.
  async function handleBulkDelete(ids: string[]) {
    try {
      await bulkDeleteLeadsAction(ids);
      const idSet = new Set(ids);
      setLeads((prev) => prev.filter((l) => !idSet.has(l.id)));
      setTotalLeads((prev) => Math.max(0, prev - ids.length));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir leads.");
    }
  }

  async function handleCreateNiche(nome: string) {
    const niche = await createNicheAction(nome);
    onNicheCreated(niche);
    return niche;
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
      const limit = filters.criado_em_from ? 1000 : 200;
      const more = await loadMoreLeadsAction({ criado_em: last.criado_em, id: last.id }, filters, limit);
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

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex w-fit rounded-lg border border-hairline p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setView("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 transition",
              view === "table" ? "bg-accent-primary/20 text-primary" : "text-secondary"
            )}
          >
            <Table2 size={14} />
            Tabela
          </button>
          <button
            type="button"
            onClick={() => setView("grouped")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 transition",
              view === "grouped" ? "bg-accent-primary/20 text-primary" : "text-secondary"
            )}
          >
            <Layers size={14} />
            Agrupado
          </button>
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 transition",
              view === "kanban" ? "bg-accent-primary/20 text-primary" : "text-secondary"
            )}
          >
            <LayoutGrid size={14} />
            Kanban
          </button>
        </div>

        {view === "kanban" && (
          <button type="button" onClick={() => setShowCreateLead(true)} className={primaryButtonClass}>
            + Novo lead
          </button>
        )}
      </div>

      {view !== "kanban" ? (
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
              grouped={view === "grouped"}
              currentUserRole={currentUserRole}
              onBulkDelete={handleBulkDelete}
              onFieldSave={handleFieldSave}
              onCreateNiche={handleCreateNiche}
              onEtapaChange={handleEtapaChange}
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

      {lostDealId && (
        <MarkLostModal
          open={!!lostDealId}
          onClose={() => setLostDealId(null)}
          entidadeTipo="deal"
          entidadeId={lostDealId}
          reasons={closerLostReasons}
          onMarked={() => updateDealLocal(lostDealId, { status: "perdido" })}
        />
      )}

      {closeDealId && (
        <CloseDealModal
          open={!!closeDealId}
          onClose={() => setCloseDealId(null)}
          dealId={closeDealId}
          closers={closers}
          defaultVendedorId={deals.find((d) => d.id === closeDealId)?.closer_id ?? undefined}
          onClosed={(valorBruto) => updateDealLocal(closeDealId, { status: "fechado", valor_bruto: valorBruto })}
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
