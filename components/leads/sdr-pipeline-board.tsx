"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { KanbanBoard, type KanbanColumnDef } from "@/components/kanban/kanban-board";
import { GroupedTable } from "@/components/kanban/grouped-table";
import { LeadCard } from "@/components/kanban/lead-card";
import { CreateDealModal } from "@/components/kanban/create-deal-modal";
import { QualifyModal } from "@/components/kanban/qualify-modal";
import { MarkLostModal } from "@/components/kanban/mark-lost-modal";
import { PersonFilter } from "@/components/leads/person-filter";
import { MonthFilter } from "@/components/leads/month-filter";
import { moveLeadAction, claimLeadAction, fetchSdrPipelineAction, sendFirstContactEmailAction } from "@/lib/actions/leads";
import { currentMonthInBrazil } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database, LeadStatus } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

// Novo/Em Atendimento/Follow Up/Reunião Agendada map 1:1 to lead_status.
// "Perdido SDR" == status "perdido" here — unambiguous on this board
// specifically, because a lead that never got a deal was, by definition,
// lost at the SDR stage (see the Week 2.6 plan section for why this didn't
// need a schema change). Convertido leads intentionally have no column —
// once converted, they're the Closer's board's concern, not the SDR's.
const SDR_COLUMNS: KanbanColumnDef[] = [
  { key: "novo", label: "Novo" },
  { key: "em_atendimento", label: "Em Atendimento" },
  { key: "follow_up", label: "Follow Up" },
  { key: "reuniao_agendada", label: "Reunião Agendada" },
  { key: "perdido", label: "Perdido SDR" },
];

interface Person {
  id: string;
  nome: string;
  foto_url: string | null;
}
interface Niche {
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

interface SdrPipelineBoardProps {
  sdrs: Person[];
  closers: Person[];
  niches: Niche[];
  reasons: QualificationReason[];
  lostReasons: LostReason[];
  currentUserId: string | null;
  currentUserRole: string | null;
}

// Role-scoped view of the leads pipeline (Week 2.6) — distinct from the
// generic Leads kanban (leads-board.tsx) in two ways: it self-fetches
// (a specific SDR's active leads aren't necessarily in the page's global
// top-200) and its columns are meant to answer "quem eu preciso mandar
// mensagem, quem precisa de follow-up" at a glance, not show every lead.
export function SdrPipelineBoard({ sdrs, closers, niches, reasons, lostReasons, currentUserId, currentUserRole }: SdrPipelineBoardProps) {
  const [sdrId, setSdrId] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | null>(currentMonthInBrazil);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [qualifiedIds, setQualifiedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dealModalLead, setDealModalLead] = useState<Lead | null>(null);
  const [qualifyLeadId, setQualifyLeadId] = useState<string | null>(null);
  const [lostLeadId, setLostLeadId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [sentEmailIds, setSentEmailIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchSdrPipelineAction(sdrId, month);
        if (cancelled) return;
        setLeads(result.leads);
        setQualifiedIds(new Set(result.qualifiedLeadIds));
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
  }, [sdrId, month]);

  const nicheById = new Map(niches.map((n) => [n.id, n.nome]));
  const sdrById = new Map(sdrs.map((s) => [s.id, { nome: s.nome, foto_url: s.foto_url }]));

  function updateLeadLocal(id: string, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

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

  function renderLead(lead: Lead, variant: "card" | "row") {
    return (
      <LeadCard
        key={lead.id}
        lead={lead}
        variant={variant}
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
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-primary">Pipeline SDR</h1>
        <div className="flex flex-wrap items-center gap-3">
          <MonthFilter month={month} onChange={setMonth} defaultMonth={currentMonthInBrazil()} />
          <PersonFilter selectedId={sdrId} onChange={setSdrId} people={sdrs} />
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
          <KanbanBoard columns={SDR_COLUMNS} items={leads} onMove={handleMove} renderCard={(lead) => renderLead(lead, "card")} />
        ) : (
          <GroupedTable
            columns={SDR_COLUMNS}
            items={leads}
            headerCells={["Lead", "Empresa", "Nicho", "SDR", "Ações"]}
            renderRow={(lead) => renderLead(lead, "row")}
          />
        )}
      </div>

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
    </div>
  );
}
