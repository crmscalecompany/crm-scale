"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { ALL_COLUMNS, COLUMN_EDIT, renderColumnCell, type ColumnContext, type PersonRef } from "@/lib/leads-table-columns";
import { EditableCell, type EditableOption } from "@/components/leads/editable-cell";
import { LEAD_STATUS_STYLE, DEAL_STATUS_STYLE } from "@/lib/status-colors";
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
  /** Inline cell editing (double-click text fields, single-click
   * selects/combos — see components/leads/editable-cell.tsx). Persists via
   * the same updateLeadDetailsAction the detail panel uses; the parent
   * (leads-board.tsx) owns optimistic update + rollback, same division of
   * labor as handleMove/handleClaim there. */
  onFieldSave: (leadId: string, field: keyof Lead, value: string | null) => Promise<void>;
  /** "Criar novo nicho" from the inline Nicho combobox. */
  onCreateNiche: (nome: string) => Promise<{ id: string; nome: string }>;
  /** Etapa's inline picker — `dealId` is null when the row has no deal yet
   * (editing leads.status), set when it does (editing deals.status). Owned
   * by leads-board.tsx since "perdido"/"fechado" open a modal instead of
   * saving directly, same branching handleMove already does for the
   * Kanban view. */
  onEtapaChange: (leadId: string, dealId: string | null, newStatus: string) => Promise<void>;
}

const LEAD_STATUS_OPTIONS = ["novo", "em_atendimento", "follow_up", "reuniao_agendada", "convertido", "perdido"] as const;
const DEAL_STATUS_OPTIONS = ["em_negociacao", "proposta_enviada", "follow_up", "fechado", "perdido"] as const;

// Deliberately solid, not translucent — the previous 30%/60%-opacity
// hairline read as "barely there" against the dark canvas (explicit user
// feedback). border-hairline-strong is the same token the rest of the app
// already reserves for hover/focus emphasis; using it at full strength
// here is what makes the grid read as a real, robust table instead of
// a loose stack of rows.
const CELL_DIVIDER = "border-r border-hairline-strong last:border-r-0";

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
const COMBOBOX_FIELDS = ["origem", "direcao", "tipo"] as const;

export function LeadsTable({
  leads,
  sdrById,
  nicheById,
  closerById,
  dealByLeadId,
  onRowClick,
  visibleColumns,
  onNewLead,
  onFieldSave,
  onCreateNiche,
  onEtapaChange,
}: LeadsTableProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const columns = useMemo(() => ALL_COLUMNS.filter((c) => c.required || visibleColumns.has(c.key)), [visibleColumns]);
  const ctx: ColumnContext = { sdrById, nicheById, closerById, dealByLeadId };

  // Dropdown/suggestion options per editable column — recomputed from
  // what's actually loaded, not a dedicated query (see editable-cell.tsx's
  // combobox: typing a value that isn't suggested here just creates it).
  const editOptions = useMemo(() => {
    const map = new Map<string, EditableOption[]>();
    map.set(
      "nicho",
      [...nicheById.entries()].map(([id, nome]) => ({ id, label: nome }))
    );
    map.set(
      "sdr",
      [...sdrById.entries()].map(([id, ref]) => ({ id, label: ref.nome }))
    );
    for (const field of COMBOBOX_FIELDS) {
      const values = new Set<string>();
      for (const lead of leads) {
        const v = lead[field];
        if (v) values.add(v);
      }
      map.set(
        field,
        [...values].sort().map((v) => ({ id: v, label: v }))
      );
    }
    return map;
  }, [leads, nicheById, sdrById]);

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

      {/* rounded-lg (8px), not rounded-card (18px) — matches
          commission-rules-panel.tsx's table, which already uses the same
          smaller radius. A full 0px square clashed with the rest of the
          UI (sidebar/buttons/tabs are all rounded); this reads as
          structured/sturdy without looking like a stray rectangle. Header
          is solid (not glass/translucent) on purpose, same reasoning. */}
      <div className="overflow-x-auto rounded-lg border-2 border-hairline-strong">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-hairline-strong bg-bg-secondary text-left text-xs font-semibold uppercase tracking-wide text-secondary">
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
            {filtered.map((lead, i) => {
              // Same lead-vs-deal merge as the "Etapa" cell itself
              // (renderColumnCell's "etapa" case) — a converted lead shows
              // its deal's stage, not its own. Reused here to color the
              // row's left edge, so the pipeline stage reads at a glance
              // down the whole table, not just from the badge text.
              const deal = dealByLeadId.get(lead.id);
              const stageStyle = deal ? DEAL_STATUS_STYLE[deal.status] : LEAD_STATUS_STYLE[lead.status];

              return (
                <tr
                  key={lead.id}
                  className={cn(
                    "border-b border-hairline-strong border-l-4 transition hover:bg-surface-2/70",
                    stageStyle.accentClassName,
                    i % 2 === 1 && "bg-surface-1/35"
                  )}
                >
                <td className={cn("px-4 py-3", CELL_DIVIDER)} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} aria-label={`Selecionar ${lead.nome}`} />
                </td>
                {columns.map((col) => {
                  const cellContent = renderColumnCell(col.key, lead, ctx);

                  if (col.key === "etapa") {
                    // Row-dependent, not column-dependent (see COLUMN_EDIT's
                    // comment in leads-table-columns.tsx) — a deal existing
                    // for this lead means Etapa edits deals.status, with
                    // deal-flavored options; otherwise it edits leads.status.
                    const isDeal = !!deal;
                    const etapaOptions = isDeal
                      ? DEAL_STATUS_OPTIONS.map((s) => ({ id: s, label: DEAL_STATUS_STYLE[s].label }))
                      : LEAD_STATUS_OPTIONS.map((s) => ({ id: s, label: LEAD_STATUS_STYLE[s].label }));
                    const etapaValue = isDeal ? deal.status : lead.status;

                    return (
                      <td key={col.key} className={cn("max-w-[200px] px-4 py-3 text-secondary", CELL_DIVIDER)}>
                        <EditableCell
                          kind="status_select"
                          value={etapaValue}
                          display={cellContent}
                          options={etapaOptions}
                          onSave={(v) => onEtapaChange(lead.id, deal?.id ?? null, v as string)}
                        />
                      </td>
                    );
                  }

                  const edit = COLUMN_EDIT[col.key];
                  if (edit) {
                    // No onClick here — EditableCell owns its own
                    // double-click (text/number) or single-click
                    // (select/combobox) interaction, and no `truncate`
                    // (its overflow:hidden would clip the dropdown
                    // popover); truncation for the closed-state display
                    // happens inside EditableCell instead.
                    return (
                      <td key={col.key} className={cn("max-w-[200px] px-4 py-3 text-secondary", CELL_DIVIDER)}>
                        <EditableCell
                          kind={edit.kind}
                          value={String(lead[edit.field] ?? "")}
                          display={cellContent}
                          options={editOptions.get(col.key)}
                          onSave={(v) => onFieldSave(lead.id, edit.field, v)}
                          onCreateOption={
                            col.key === "nicho"
                              ? async (label) => {
                                  const niche = await onCreateNiche(label);
                                  return { id: niche.id, label: niche.nome };
                                }
                              : undefined
                          }
                        />
                      </td>
                    );
                  }

                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "max-w-[200px] cursor-pointer truncate whitespace-nowrap px-4 py-3 text-secondary",
                        CELL_DIVIDER,
                        col.key === "nome" && "font-medium text-primary"
                      )}
                      onClick={() => onRowClick(lead)}
                    >
                      {cellContent}
                    </td>
                  );
                })}
                </tr>
              );
            })}
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
