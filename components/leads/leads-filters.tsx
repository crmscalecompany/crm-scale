"use client";

import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { DEAL_STATUS_STYLE, LEAD_STATUS_STYLE } from "@/lib/status-colors";
import { fieldInputClass, fieldLabelClass, secondaryButtonClass } from "@/lib/form-styles";
import type { LeadFilters } from "@/lib/actions/leads";
import type { DealStatus, LeadStatus } from "@/lib/types/database.types";
import { cn } from "@/lib/utils";

const LEAD_STATUS_OPTIONS: LeadStatus[] = ["novo", "em_atendimento", "follow_up", "reuniao_agendada", "convertido", "perdido"];
const DEAL_STATUS_OPTIONS: DealStatus[] = ["em_negociacao", "proposta_enviada", "follow_up", "fechado", "perdido"];

interface Niche {
  id: string;
  nome: string;
}

interface LeadsFiltersProps {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  niches: Niche[];
}

const activeFilterCount = (filters: LeadFilters) => Object.values(filters).filter(Boolean).length;

// Filters the leads table server-side (status/nicho) — tucked behind an
// icon button + popover (not always-on controls) to avoid cluttering the
// toolbar, same pattern as ColumnPicker. SDR has its own dedicated toolbar
// button instead (components/leads/person-filter.tsx), since a person
// picker wants an avatar per option, which doesn't fit a plain <select>.
// Applying any field restarts the list from the top via filterLeadsAction,
// since a previous "load more" cursor doesn't carry meaning against a
// different filter. Date range used to live here too (plain "Entrada de/
// até" inputs) — moved to its own always-visible MonthFilter in
// crm-workspace.tsx's toolbar (same widget the SDR/Closer pipelines already
// use), since a bare popover field defaulted to no date bound at all, which
// is exactly what let Quadro principal load thousands of leads.
//
// "Etapa" is split into two separate filters (Lead vs. Negócio) rather than
// one merged control — the table's Etapa column shows a deal's status once
// a deal exists (see lib/leads-table-columns.tsx), so filtering by
// lead.status alone would show confusing results (e.g. filtering
// "Convertido" returning rows whose visible Etapa says "Em Negociação").
export function LeadsFilters({ filters, onChange, niches }: LeadsFiltersProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = activeFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function set<K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(secondaryButtonClass, "flex items-center gap-1.5", count > 0 && "border-accent-primary/50 text-accent-light")}
      >
        <Filter size={14} />
        Filtros
        {count > 0 && <span className="rounded-full bg-accent-primary/20 px-1.5 text-xs">{count}</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-card border border-hairline bg-bg-secondary p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Filtrar leads</p>
            {count > 0 && (
              <button type="button" onClick={() => onChange({})} className="text-xs text-accent-light hover:underline">
                Limpar
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-status" className={fieldLabelClass}>
                Etapa (Lead)
              </label>
              <select
                id="filter-status"
                value={filters.status ?? ""}
                onChange={(e) => set("status", (e.target.value || undefined) as LeadStatus | undefined)}
                className={fieldInputClass}
              >
                <option value="">Todas</option>
                {LEAD_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_STYLE[s].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="filter-deal-status" className={fieldLabelClass}>
                Etapa (Negócio)
              </label>
              <select
                id="filter-deal-status"
                value={filters.deal_status ?? ""}
                onChange={(e) => set("deal_status", (e.target.value || undefined) as DealStatus | undefined)}
                className={fieldInputClass}
              >
                <option value="">Todas</option>
                {DEAL_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {DEAL_STATUS_STYLE[s].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="filter-nicho" className={fieldLabelClass}>
                Nicho
              </label>
              <select id="filter-nicho" value={filters.niche_id ?? ""} onChange={(e) => set("niche_id", e.target.value)} className={fieldInputClass}>
                <option value="">Todos</option>
                {niches.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
