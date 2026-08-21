"use client";

import { useState } from "react";
import { LeadsBoard } from "@/components/leads/leads-board";
import { PersonFilter } from "@/components/leads/person-filter";
import { MonthFilter } from "@/components/leads/month-filter";
import { currentMonthInBrazil, monthDateRange } from "@/lib/format";
import type { LeadFilters } from "@/lib/actions/leads";

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
  closerLostReasons: LostReason[];
  currentUserId: string | null;
  currentUserRole: string | null;
  visibleColumns: Set<string>;
  onNicheCreated: (niche: Niche) => void;
}

// Role-scoped view of the leads pipeline — same LeadsBoard every Quadro tab
// uses (full column set, inline editing, detail popup, sticky Lead column,
// grouped/kanban/tabela), just pre-filtered to one SDR's leads instead of
// origem. Used to be its own hand-rolled board (GroupedTable + a
// Lead/Empresa/Nicho/SDR/Ações row that couldn't open the detail panel or
// show most fields) — per explicit user feedback ("precisa ter tudo q o
// monday tem e ser melhor"), that gap is exactly what reusing LeadsBoard
// closes: every field, every edit, for free, and automatically inherits
// anything LeadsBoard gains later.
export function SdrPipelineBoard({
  sdrs,
  closers,
  niches,
  reasons,
  lostReasons,
  closerLostReasons,
  currentUserId,
  currentUserRole,
  visibleColumns,
  onNicheCreated,
}: SdrPipelineBoardProps) {
  const [sdrId, setSdrId] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | null>(currentMonthInBrazil);

  const range = month ? monthDateRange(month) : { from: undefined, to: undefined };
  const filters: LeadFilters = { owner_sdr_id: sdrId, criado_em_from: range.from, criado_em_to: range.to };

  return (
    <LeadsBoard
      title="Pipeline SDR"
      headerControls={
        <>
          <MonthFilter month={month} onChange={setMonth} defaultMonth={currentMonthInBrazil()} />
          <PersonFilter selectedId={sdrId} onChange={setSdrId} people={sdrs} />
        </>
      }
      initialLeads={[]}
      totalLeads={0}
      niches={niches}
      sdrs={sdrs}
      closers={closers}
      reasons={reasons}
      lostReasons={lostReasons}
      closerLostReasons={closerLostReasons}
      qualifiedLeadIds={[]}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      attributions={[]}
      deals={[]}
      filters={filters}
      visibleColumns={visibleColumns}
      onNicheCreated={onNicheCreated}
    />
  );
}
