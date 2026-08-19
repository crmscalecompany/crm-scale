"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { KanbanBoard, type KanbanColumnDef } from "@/components/kanban/kanban-board";
import { GroupedTable } from "@/components/kanban/grouped-table";
import { DealCard } from "@/components/deals/deal-card";
import { QualifyModal } from "@/components/kanban/qualify-modal";
import { MarkLostModal } from "@/components/kanban/mark-lost-modal";
import { CloseDealModal } from "@/components/kanban/close-deal-modal";
import { ScheduleR2Modal } from "@/components/kanban/schedule-r2-modal";
import { PersonFilter } from "@/components/leads/person-filter";
import { MonthFilter } from "@/components/leads/month-filter";
import { moveDealAction, fetchCloserPipelineAction } from "@/lib/actions/deals";
import { updateMeetingStatusAction } from "@/lib/actions/meetings";
import { currentMonthInBrazil } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database, DealStatus, MeetingStatus } from "@/lib/types/database.types";

type Deal = Database["public"]["Tables"]["deals"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

const CLOSER_COLUMNS: KanbanColumnDef[] = [
  { key: "agendado", label: "Agendado" },
  { key: "no_show", label: "No Show" },
  { key: "em_negociacao", label: "Em Negociação" },
  { key: "proposta_enviada", label: "Proposta Enviada" },
  { key: "follow_up", label: "Follow Up" },
  { key: "fechado", label: "Fechado" },
  { key: "perdido", label: "Perdido Closer" },
];

interface Person {
  id: string;
  nome: string;
  foto_url: string | null;
}
interface LeadRef {
  id: string;
  nome: string;
}
interface QualificationReason {
  id: string;
  descricao: string;
}
interface LostReason {
  id: string;
  descricao: string;
}

interface CloserPipelineBoardProps {
  closers: Person[];
  leads: LeadRef[];
  reasons: QualificationReason[];
  lostReasons: LostReason[];
}

// Agendado/No Show/Em Negociação aren't a straight read of deal.status —
// they're all deal.status === "em_negociacao", split further by that deal's
// meeting outcome (see lib/data/meetings.ts). Everything else is a direct
// deal_status column. A deal with no meeting row at all (legacy/migrated
// data, before Week 2.6 activated the meetings table) falls into
// "Em Negociação" — the safety-net case.
function groupKeyFor(deal: Deal, meetings: Map<string, Meeting>): string {
  if (deal.status === "em_negociacao") {
    const meeting = meetings.get(deal.id);
    if (meeting?.status === "marcada" || meeting?.status === "remarcada") return "agendado";
    if (meeting?.status === "no_show") return "no_show";
    return "em_negociacao";
  }
  return deal.status;
}

// Role-scoped view of the deals pipeline (Week 2.6) — self-fetches (a
// specific closer's active deals aren't necessarily in the page's global
// top-200) and derives its columns from deal_status + meeting outcome so a
// closer can see at a glance who's scheduled, who no-showed, and who's
// still mid-negotiation.
export function CloserPipelineBoard({ closers, leads, reasons, lostReasons }: CloserPipelineBoardProps) {
  const [closerId, setCloserId] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | null>(currentMonthInBrazil);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [meetings, setMeetings] = useState<Map<string, Meeting>>(new Map());
  const [qualifiedIds, setQualifiedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualifyDealId, setQualifyDealId] = useState<string | null>(null);
  const [lostDealId, setLostDealId] = useState<string | null>(null);
  const [closeDealId, setCloseDealId] = useState<string | null>(null);
  const [r2DealId, setR2DealId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCloserPipelineAction(closerId, month);
        if (cancelled) return;
        setDeals(result.deals);
        setMeetings(new Map(result.meetings));
        setQualifiedIds(new Set(result.qualifiedDealIds));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar pipeline.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [closerId, month]);

  const leadNameById = new Map(leads.map((l) => [l.id, l.nome]));
  const closerById = new Map(closers.map((c) => [c.id, { nome: c.nome, foto_url: c.foto_url }]));

  function updateDealLocal(id: string, patch: Partial<Deal>) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function handleUpdateMeetingStatus(meetingId: string, status: MeetingStatus) {
    const dealId = [...meetings.entries()].find(([, m]) => m.id === meetingId)?.[0];
    const previous = dealId ? meetings.get(dealId) : undefined;
    if (!dealId || !previous) return;
    setMeetings((prev) => new Map(prev).set(dealId, { ...previous, status }));
    try {
      await updateMeetingStatusAction(meetingId, status);
    } catch (err) {
      setMeetings((prev) => new Map(prev).set(dealId, previous));
      setError(err instanceof Error ? err.message : "Erro ao atualizar reunião.");
    }
  }

  async function handleMove(id: string, newColumnKey: string) {
    if (newColumnKey === "perdido") {
      setLostDealId(id);
      return;
    }

    if (newColumnKey === "fechado") {
      setCloseDealId(id);
      return;
    }

    if (newColumnKey === "agendado" || newColumnKey === "no_show" || newColumnKey === "em_negociacao") {
      const meeting = meetings.get(id);
      if (!meeting) return;
      const newMeetingStatus: MeetingStatus = newColumnKey === "agendado" ? "marcada" : newColumnKey === "no_show" ? "no_show" : "realizada";
      await handleUpdateMeetingStatus(meeting.id, newMeetingStatus);
      return;
    }

    const previous = deals.find((d) => d.id === id);
    if (!previous) return;
    updateDealLocal(id, { status: newColumnKey as DealStatus });
    try {
      await moveDealAction(id, newColumnKey as DealStatus);
    } catch (err) {
      updateDealLocal(id, { status: previous.status });
      setError(err instanceof Error ? err.message : "Erro ao mover negócio.");
    }
  }

  function renderDeal(deal: Deal, variant: "card" | "row") {
    return (
      <DealCard
        key={deal.id}
        deal={deal}
        variant={variant}
        leadName={leadNameById.get(deal.lead_id) ?? "Lead"}
        closer={deal.closer_id ? (closerById.get(deal.closer_id) ?? null) : null}
        meeting={meetings.get(deal.id) ?? null}
        isPendingQualification={!qualifiedIds.has(deal.id)}
        onQualify={() => setQualifyDealId(deal.id)}
        onUpdateMeetingStatus={handleUpdateMeetingStatus}
        onScheduleR2={deal.closer_id ? () => setR2DealId(deal.id) : undefined}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-primary">Pipeline Closer</h1>
        <div className="flex flex-wrap items-center gap-3">
          <MonthFilter month={month} onChange={setMonth} defaultMonth={currentMonthInBrazil()} />
          <PersonFilter selectedId={closerId} onChange={setCloserId} people={closers} label="Closer" />
          <div className="flex rounded-lg border border-hairline p-0.5">
            <button
              type="button"
              title="Kanban"
              aria-label="Kanban"
              onClick={() => setViewMode("kanban")}
              className={cn("rounded-md p-1.5 transition", viewMode === "kanban" ? "bg-accent-primary/20 text-primary" : "text-secondary")}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              title="Tabela"
              aria-label="Tabela"
              onClick={() => setViewMode("table")}
              className={cn("rounded-md p-1.5 transition", viewMode === "table" ? "bg-accent-primary/20 text-primary" : "text-secondary")}
            >
              <Table2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="underline">
            fechar
          </button>
        </div>
      )}

      <div className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {viewMode === "kanban" ? (
          <KanbanBoard
            columns={CLOSER_COLUMNS}
            items={deals}
            groupKey={(deal) => groupKeyFor(deal, meetings)}
            onMove={handleMove}
            renderCard={(deal) => renderDeal(deal, "card")}
          />
        ) : (
          <GroupedTable
            columns={CLOSER_COLUMNS}
            items={deals}
            groupKey={(deal) => groupKeyFor(deal, meetings)}
            headerCells={["Lead", "Valor", "Closer", "Ações"]}
            renderRow={(deal) => renderDeal(deal, "row")}
          />
        )}
      </div>

      {qualifyDealId && (
        <QualifyModal
          open={!!qualifyDealId}
          onClose={() => setQualifyDealId(null)}
          entidadeTipo="deal"
          entidadeId={qualifyDealId}
          etapa="closer"
          reasons={reasons}
          onQualified={() => {
            const id = qualifyDealId;
            setQualifiedIds((prev) => new Set(prev).add(id));
          }}
        />
      )}

      {lostDealId && (
        <MarkLostModal
          open={!!lostDealId}
          onClose={() => setLostDealId(null)}
          entidadeTipo="deal"
          entidadeId={lostDealId}
          reasons={lostReasons}
          onMarked={() => updateDealLocal(lostDealId, { status: "perdido" })}
        />
      )}

      {r2DealId &&
        (() => {
          const r2Deal = deals.find((d) => d.id === r2DealId);
          const r2Closer = r2Deal?.closer_id ? closerById.get(r2Deal.closer_id) : undefined;
          if (!r2Deal?.closer_id || !r2Closer) return null;
          return (
            <ScheduleR2Modal
              open={!!r2DealId}
              onClose={() => setR2DealId(null)}
              dealId={r2Deal.id}
              closerId={r2Deal.closer_id}
              closerNome={r2Closer.nome}
              closerFotoUrl={r2Closer.foto_url}
              leadNome={leadNameById.get(r2Deal.lead_id) ?? "Lead"}
            />
          );
        })()}

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
    </div>
  );
}
