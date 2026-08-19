"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GroupedTableColumnDef {
  key: string;
  label: string;
}

interface GroupedTableProps<T extends { id: string; status: string }> {
  columns: GroupedTableColumnDef[];
  items: T[];
  /** Same contract as KanbanBoard's groupKey — defaults to `item.status`. */
  groupKey?: (item: T) => string;
  /** Header labels for the inner table (e.g. ["Lead", "Empresa", "Nicho", "Ações"]). */
  headerCells: string[];
  /** Returns a `<tr>` for one item — reuse LeadCard/DealCard's variant="row". */
  renderRow: (item: T) => React.ReactNode;
}

function CollapsibleSection({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-card border border-hairline">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-bg-secondary/40 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ChevronDown size={14} className={cn("transition-transform", !open && "-rotate-90")} />
          {label}
        </span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-secondary">{count}</span>
      </button>
      {open && <div className="border-t border-hairline">{children}</div>}
    </div>
  );
}

// The "table" alternative to KanbanBoard's side-scrolling columns — same
// grouping (columns/items/groupKey), rendered as vertically-stacked
// collapsible sections instead, each with a real compact table inside. No
// drag-and-drop here; moving an item's status still goes through its
// card/row's own action buttons (claim, qualify, mark lost, meeting
// outcome), same as the kanban view.
export function GroupedTable<T extends { id: string; status: string }>({
  columns,
  items,
  groupKey = (item) => item.status,
  headerCells,
  renderRow,
}: GroupedTableProps<T>) {
  return (
    <div className="flex flex-col gap-3">
      {columns.map((col) => {
        const colItems = items.filter((i) => groupKey(i) === col.key);
        return (
          <CollapsibleSection key={col.key} label={col.label} count={colItems.length}>
            {colItems.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted">Nenhum item.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      {headerCells.map((h) => (
                        <th key={h} className="px-3 py-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{colItems.map(renderRow)}</tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
