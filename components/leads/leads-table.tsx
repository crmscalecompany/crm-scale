"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { ALL_COLUMNS, COLUMN_EDIT, renderColumnCell, type ColumnContext, type PersonRef } from "@/lib/leads-table-columns";
import { EditableCell, type EditableOption } from "@/components/leads/editable-cell";
import { CollapsibleSection } from "@/components/kanban/grouped-table";
import { LEAD_STATUS_STYLE, DEAL_STATUS_STYLE } from "@/lib/status-colors";
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
  /** Owned by leads-board.tsx now — the search box lives in the shared
   * page header (title/search/filtros/view-toggle/Novo lead all in one
   * row) instead of a row inside this table. */
  search: string;
  /** "Agrupado" mode (leads-board.tsx's third view toggle) — collapsible
   * sections by lead.status, same grouping the SDR pipeline's own Tabela
   * view already uses (components/kanban/grouped-table.tsx), just with
   * this table's full column set/inline editing instead of that board's
   * simplified Lead/Empresa/Nicho/SDR/Ações row. No row-selection/bulk
   * delete in this mode — tracking a selection set consistently across
   * collapsible sections is more machinery than the feature's worth right
   * now, and it's still available from the flat Tabela view. */
  grouped?: boolean;
  currentUserRole: string | null;
  /** "Excluir selecionados" (row checkboxes) — admin-only, same rule as the
   * detail panel's single-lead Excluir. Resolves once the batch finishes;
   * the caller (leads-board.tsx) drops the ids from its `leads` state, this
   * component just clears its own `selected` set. */
  onBulkDelete: (ids: string[]) => Promise<void>;
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
  /** Closer's inline picker — only reachable once the row has a deal
   * (closer_id lives on deals, not leads), same precondition Valor/Modelo/
   * the other deal-derived columns already have. */
  onCloserChange: (leadId: string, dealId: string, newCloserId: string | null) => Promise<void>;
  /** "Atualizações" column — opens LeadUpdatesModal (leads-board.tsx owns
   * the modal's open/closed state, same division of labor as every other
   * modal this table's rows can trigger). */
  onOpenUpdates: (leadId: string, leadNome: string) => void;
}

const LEAD_STATUS_OPTIONS = ["novo", "em_atendimento", "follow_up", "reuniao_agendada", "convertido", "perdido"] as const;
const DEAL_STATUS_OPTIONS = ["em_negociacao", "proposta_enviada", "follow_up", "fechado", "perdido"] as const;
const LEAD_GROUPS = LEAD_STATUS_OPTIONS.map((s) => ({ key: s, label: LEAD_STATUS_STYLE[s].label }));

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
// Filtering (LeadsFilters), column visibility (ColumnPicker), search, view
// toggle, and "+ Novo lead" all live one level up now, in leads-board.tsx's
// unified page header — they're not table-specific (a filter/search applies
// to the Kanban view too). This component only owns what's genuinely local
// to the table itself: row selection and bulk delete.
//
// Etapa merges leads and deals visually (per the Monday board, where a
// converted lead just shows its deal's status): a lead with an associated
// deal shows the deal's status/colors; otherwise it shows the lead's own
// status. Same idea for Closer/Valor/Datas — blank until a deal exists.
//
// Row selection (checkboxes) backs one bulk action — "Excluir
// selecionados" (admin-only, same inline-confirm pattern as the detail
// panel's single-lead Excluir).
const COMBOBOX_FIELDS = ["origem", "direcao", "tipo"] as const;

export function LeadsTable({
  leads,
  sdrById,
  nicheById,
  closerById,
  dealByLeadId,
  onRowClick,
  visibleColumns,
  search,
  grouped = false,
  currentUserRole,
  onBulkDelete,
  onFieldSave,
  onCreateNiche,
  onEtapaChange,
  onCloserChange,
  onOpenUpdates,
}: LeadsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
    map.set(
      "closer",
      [...closerById.entries()].map(([id, ref]) => ({ id, label: ref.nome }))
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
  }, [leads, nicheById, sdrById, closerById]);

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

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await onBulkDelete([...selected]);
      setSelected(new Set());
      setConfirmingBulkDelete(false);
    } finally {
      setBulkDeleting(false);
    }
  }

  // Shared between the flat table and each "Agrupado" section — `index`
  // only drives zebra striping (meaningless/omitted in grouped mode, where
  // every row in a section already shares one status's accent color) and
  // `showCheckbox` is false in grouped mode (see the `grouped` prop doc).
  function renderRow(lead: Lead, index: number, showCheckbox: boolean) {
    // Same lead-vs-deal merge as the "Etapa" cell itself (renderColumnCell's
    // "etapa" case) — a converted lead shows its deal's stage, not its own.
    // Reused here to color the row's left edge, so the pipeline stage reads
    // at a glance down the whole table, not just from the badge text.
    const deal = dealByLeadId.get(lead.id);
    const stageStyle = deal ? DEAL_STATUS_STYLE[deal.status] : LEAD_STATUS_STYLE[lead.status];

    return (
      <tr
        key={lead.id}
        className={cn(
          "border-b border-hairline-strong border-l-4 transition hover:bg-surface-2/70",
          stageStyle.accentClassName,
          index % 2 === 1 && "bg-surface-1/35"
        )}
      >
        {showCheckbox && (
          <td className={cn("sticky left-0 z-10 w-10 bg-canvas px-4 py-3", CELL_DIVIDER)} onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} aria-label={`Selecionar ${lead.nome}`} />
          </td>
        )}
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

          if (col.key === "closer") {
            // Row-dependent like "etapa" above — closer_id lives on
            // deals, only reachable once one exists (same precondition
            // Valor/Modelo/the other deal-derived columns already have).
            // No deal yet: leave the cell exactly as it renders today,
            // plain "—", non-interactive — "Marcar reunião" stays the one
            // place a deal gets created.
            if (!deal) {
              return (
                <td key={col.key} className={cn("max-w-[200px] px-4 py-3 text-secondary", CELL_DIVIDER)}>
                  {cellContent}
                </td>
              );
            }
            return (
              <td key={col.key} className={cn("max-w-[200px] px-4 py-3 text-secondary", CELL_DIVIDER)}>
                <EditableCell
                  kind="closer_select"
                  value={deal.closer_id ?? ""}
                  display={cellContent}
                  options={editOptions.get("closer")}
                  onSave={(v) => onCloserChange(lead.id, deal.id, v)}
                />
              </td>
            );
          }

          if (col.key === "atualizacoes") {
            return (
              <td key={col.key} className={cn("max-w-[200px] px-4 py-3", CELL_DIVIDER)}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUpdates(lead.id, lead.nome);
                  }}
                  className="flex items-center gap-1.5 text-secondary transition hover:text-primary"
                >
                  {cellContent}
                </button>
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
                col.key === "nome" && "font-medium text-primary",
                // Sticky Lead column (per explicit user request — "scroll
                // lateral" shouldn't carry the row's identity out of view).
                // Needs its own opaque background since sticky positioning
                // takes it out of the row's normal paint order — bg-canvas
                // (the page's own base color) rather than trying to match
                // every dynamic row state (zebra/hover/stage accent).
                // left-[46px], not the nominal w-10 (40px) — the checkbox
                // <td> actually renders 46px wide (measured against the
                // real DOM); using 40px left a 6px sliver where scrolled
                // content behind the sticky column peeked through.
                col.key === "nome" && cn("sticky z-10 bg-canvas", showCheckbox ? "left-[46px]" : "left-0")
              )}
              onClick={() => onRowClick(lead)}
            >
              {cellContent}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!grouped && selected.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-light">
            {selected.size} selecionado{selected.size > 1 ? "s" : ""}
          </span>
          {currentUserRole === "admin" &&
            (confirmingBulkDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-status-critical">Excluir {selected.size} lead(s)?</span>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="rounded-lg border border-status-critical/50 px-3 py-1.5 text-xs font-semibold text-status-critical transition hover:bg-status-critical/10 disabled:opacity-60"
                >
                  {bulkDeleting ? "Excluindo…" : "Sim, excluir"}
                </button>
                <button type="button" onClick={() => setConfirmingBulkDelete(false)} className="text-xs text-muted hover:text-primary">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingBulkDelete(true)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted transition hover:text-status-critical"
              >
                <Trash2 size={13} />
                Excluir selecionados
              </button>
            ))}
        </div>
      )}

      {grouped ? (
        <div className="flex flex-col gap-3">
          {LEAD_GROUPS.map((group) => {
            const groupLeads = filtered.filter((l) => l.status === group.key);
            return (
              <CollapsibleSection key={group.key} label={group.label} count={groupLeads.length}>
                {groupLeads.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted">Nenhum lead.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0 text-sm">
                      <thead>
                        <tr className="border-b border-hairline-strong bg-bg-secondary text-left text-xs font-semibold uppercase tracking-wide text-secondary">
                          {columns.map((col) => (
                            <th
                              key={col.key}
                              className={cn(
                                "max-w-[200px] truncate whitespace-nowrap px-4 py-3",
                                CELL_DIVIDER,
                                col.key === "nome" && "sticky left-0 z-20 bg-bg-secondary"
                              )}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>{groupLeads.map((lead, i) => renderRow(lead, i, false))}</tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>
            );
          })}
        </div>
      ) : (
        /* rounded-lg (8px), not rounded-card (18px) — matches
           commission-rules-panel.tsx's table, which already uses the same
           smaller radius. A full 0px square clashed with the rest of the
           UI (sidebar/buttons/tabs are all rounded); this reads as
           structured/sturdy without looking like a stray rectangle. Header
           is solid (not glass/translucent) on purpose, same reasoning. */
        <div className="overflow-x-auto rounded-lg border-2 border-hairline-strong">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="border-b-2 border-hairline-strong bg-bg-secondary text-left text-xs font-semibold uppercase tracking-wide text-secondary">
                <th className={cn("sticky left-0 z-20 w-10 bg-bg-secondary px-4 py-3", CELL_DIVIDER)}>
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label="Selecionar todos" />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "max-w-[200px] truncate whitespace-nowrap px-4 py-3",
                      CELL_DIVIDER,
                      col.key === "nome" && "sticky left-[46px] z-20 bg-bg-secondary"
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => renderRow(lead, i, true))}
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
      )}
    </div>
  );
}
