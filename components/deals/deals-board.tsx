"use client";

import { useState } from "react";
import { KanbanBoard, type KanbanColumnDef } from "@/components/kanban/kanban-board";
import { DealCard } from "@/components/deals/deal-card";
import { QualifyModal } from "@/components/kanban/qualify-modal";
import { MarkLostModal } from "@/components/kanban/mark-lost-modal";
import { CloseDealModal } from "@/components/kanban/close-deal-modal";
import { ScheduleR2Modal } from "@/components/kanban/schedule-r2-modal";
import { moveDealAction } from "@/lib/actions/deals";
import { updateMeetingStatusAction } from "@/lib/actions/meetings";
import type { Database, DealStatus, MeetingStatus } from "@/lib/types/database.types";

type Deal = Database["public"]["Tables"]["deals"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

const DEAL_COLUMNS: KanbanColumnDef[] = [
  { key: "em_negociacao", label: "Em Negociação" },
  { key: "proposta_enviada", label: "Proposta Enviada" },
  { key: "follow_up", label: "Follow Up" },
  { key: "fechado", label: "Fechado" },
  { key: "perdido", label: "Perdido" },
];

interface QualificationReason {
  id: string;
  descricao: string;
}
interface Person {
  id: string;
  nome: string;
  foto_url: string | null;
}
interface LeadRef {
  id: string;
  nome: string;
}

interface LostReason {
  id: string;
  descricao: string;
}

interface DealsBoardProps {
  initialDeals: Deal[];
  leads: LeadRef[];
  closers: Person[];
  reasons: QualificationReason[];
  qualifiedDealIds: string[];
  meetingsByDealId: Map<string, Meeting>;
  lostReasons: LostReason[];
}

export function DealsBoard({ initialDeals, leads, closers, reasons, qualifiedDealIds, meetingsByDealId, lostReasons }: DealsBoardProps) {
  const [deals, setDeals] = useState(initialDeals);
  const [meetings, setMeetings] = useState(meetingsByDealId);
  const [qualifiedIds, setQualifiedIds] = useState(new Set(qualifiedDealIds));
  const [qualifyDealId, setQualifyDealId] = useState<string | null>(null);
  const [lostDealId, setLostDealId] = useState<string | null>(null);
  const [closeDealId, setCloseDealId] = useState<string | null>(null);
  const [r2DealId, setR2DealId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leadNameById = new Map(leads.map((l) => [l.id, l.nome]));
  const closerById = new Map(closers.map((c) => [c.id, { nome: c.nome, foto_url: c.foto_url }]));

  function updateDealLocal(id: string, patch: Partial<Deal>) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  // Moving to "Perdido" needs a reason first (see mark-lost-modal.tsx) — the
  // drag visually reverts (handleMove just doesn't write the status) until
  // the modal is submitted, same rule applied everywhere a lead/deal can
  // reach "Perdido".
  async function handleMove(id: string, newStatus: string) {
    if (newStatus === "perdido") {
      setLostDealId(id);
      return;
    }
    if (newStatus === "fechado") {
      setCloseDealId(id);
      return;
    }
    const previous = deals.find((d) => d.id === id);
    if (!previous) return;
    updateDealLocal(id, { status: newStatus as DealStatus });
    try {
      await moveDealAction(id, newStatus as DealStatus);
    } catch (err) {
      updateDealLocal(id, { status: previous.status });
      setError(err instanceof Error ? err.message : "Erro ao mover negócio.");
    }
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

      <div className="mb-4">
        <h1 className="text-lg font-semibold text-primary">Negócios</h1>
      </div>

      <KanbanBoard
        columns={DEAL_COLUMNS}
        items={deals}
        onMove={handleMove}
        renderCard={(deal) => (
          <DealCard
            deal={deal}
            leadName={leadNameById.get(deal.lead_id) ?? "Lead"}
            closer={deal.closer_id ? (closerById.get(deal.closer_id) ?? null) : null}
            meeting={meetings.get(deal.id) ?? null}
            isPendingQualification={!qualifiedIds.has(deal.id)}
            onQualify={() => setQualifyDealId(deal.id)}
            onUpdateMeetingStatus={handleUpdateMeetingStatus}
            onScheduleR2={deal.closer_id ? () => setR2DealId(deal.id) : undefined}
          />
        )}
      />

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
