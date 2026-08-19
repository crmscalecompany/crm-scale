"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { ALL_COLUMNS, renderColumnCell, type ColumnContext, type PersonRef } from "@/lib/leads-table-columns";
import { fieldInputClass, primaryButtonClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Deal = Database["public"]["Tables"]["deals"]["Row"];

interface LeadsTableProps {
  leads: Lead[];
  sdrById: Map<string, PersonRef>;
  nicheById: Map<string, string>;
  closerById: Map<string, PersonRef>;
  dealByLeadId: Map<string, Deal>;
  onRowClick: (lead: Lead) => void;
  visibleColumns: Set<string>;
  onNewLead: () => void;
}

const CELL_DIVIDER = "border-r border-hairline/30 last:border-r-0";

// Mirrors (and extends) the "Quadro principal" table view from the Monday
// board. Which columns show is user-configurable
// (components/leads/column-picker.tsx) — required ones (Lead, Etapa)
// always show; the rest come from `visibleColumns`, owned and persisted by
// the parent CrmWorkspace (localStorage via useLocalStorageSet) since the
// column picker button itself lives in the workspace toolbar now, next to
// Filtros. Whatever isn't shown here is still available in the row-click
// detail panel (lead-detail-panel.tsx).
//
// Filtering (LeadsFilters), column visibility (ColumnPicker), and the view
// tabs (CrmViewTabs) all live one level up, in CrmWorkspace's toolbar —
// they're not table-specific (a filter applies to the Kanban view too), so
// this component only owns what's genuinely local to the table: search,
// row selection, and "+ Novo lead" (which takes the toolbar slot the
// column picker used to occupy here).
//
// Etapa merges leads and deals visually (per the Monday board, where a
// converted lead just shows its deal's status): a lead with an associated
// deal shows the deal's status/colors; otherwise it shows the lead's own
// status. Same idea for Closer/Valor/Datas — blank until a deal exists.
//
// Row selection (checkboxes) is UI-only for now — no bulk action wired up
// yet, just the selected-count affordance.
export function LeadsTable({ leads, sdrById, nicheById, closerById, dealByLeadId, onRowClick, visibleColumns, onNewLead }: LeadsTableProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const columns = useMemo(() => ALL_COLUMNS.filter((c) => c.required || visibleColumns.has(c.key)), [visibleColumns]);
  const ctx: ColumnContext = { sdrById, nicheById, closerById, dealByLeadId };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => l.nome.toLowerCase().includes(q) || (l.empresa ?? "").toLowerCase().includes(q));
  }, [leads, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleAll() {
    setSelected(allFilteredSelected ? new Set() : new Set(filtered.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome ou empresa…"
            className={cn(fieldInputClass, "w-full pl-8")}
          />
        </div>
        {selected.size > 0 && (
          <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-light">
            {selected.size} selecionado{selected.size > 1 ? "s" : ""}
          </span>
        )}
        <div className="ml-auto">
          <button type="button" onClick={onNewLead} className={cn(primaryButtonClass, "flex items-center gap-1.5")}>
            <Plus size={14} />
            Novo lead
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-hairline">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline bg-bg-secondary/60 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className={cn("w-10 px-4 py-3", CELL_DIVIDER)}>
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label="Selecionar todos" />
              </th>
              {columns.map((col) => (
                <th key={col.key} className={cn("max-w-[200px] truncate whitespace-nowrap px-4 py-3", CELL_DIVIDER)}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} className="border-b border-hairline/60 transition hover:bg-surface-1">
                <td className={cn("px-4 py-3", CELL_DIVIDER)} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} aria-label={`Selecionar ${lead.nome}`} />
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "max-w-[200px] cursor-pointer truncate whitespace-nowrap px-4 py-3 text-secondary",
                      CELL_DIVIDER,
                      col.key === "nome" && "font-medium text-primary"
                    )}
                    onClick={() => onRowClick(lead)}
                  >
                    {renderColumnCell(col.key, lead, ctx)}
                  </td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-muted">
                  {leads.length === 0 ? "Nenhum lead ainda." : "Nenhum lead corresponde à pesquisa."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
