"use client";

import { LayoutGrid, Megaphone, Phone, Sprout, Table2, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CrmViewDef {
  key: string;
  label: string;
  icon: typeof Table2;
  enabled: boolean;
}

// Este Mês/Histórico/Análise Tráfego were dropped per explicit user
// feedback — they'd have been saved filters/groupings of this same table,
// which the Filtros popover and the separate analytics dashboard already
// cover. SDR's/Closer's are NOT the same kind of thing, despite looking
// similar at first — they're real role-scoped pipeline boards with their
// own grouping logic (see sdr-pipeline-board.tsx/closer-pipeline-board.tsx),
// not filtered views of the table.
//
// Quadro Orgânico/Quadro de Tráfego (added later, see crm-workspace.tsx's
// ORIGEM_ORGANICO/ORIGEM_TRAFEGO) look like the same "saved filter" shape
// that was rejected above, but the user asked for them specifically as an
// operational split, not an analytics one — Case/Artigo/Site Institucional
// leads work differently day-to-day than paid-traffic leads, so SDRs
// working one lane don't want the other cluttering the table. Note Quadro
// de Tráfego is NOT the sparse/new-pipeline board it might sound like —
// "Meta Ads" alone (the historical Monday-migrated origem) already covers
// most of the leads table, so this tab starts out showing the bulk of
// existing data, not an empty list waiting on a future integration.
export const CRM_VIEWS: CrmViewDef[] = [
  { key: "quadro_principal", label: "Quadro principal", icon: Table2, enabled: true },
  { key: "quadro_organico", label: "Quadro Orgânico", icon: Sprout, enabled: true },
  { key: "quadro_trafego", label: "Quadro de Tráfego", icon: Megaphone, enabled: true },
  { key: "kanban", label: "Kanban", icon: LayoutGrid, enabled: true },
  { key: "sdrs", label: "SDR's", icon: Phone, enabled: true },
  { key: "closers", label: "Closer's", icon: Target, enabled: true },
];

interface CrmViewTabsProps {
  active: string;
  onSelect: (key: string) => void;
}

// Sits inside the CRM workspace's toolbar, next to the filter/column
// controls — switches which "quadro" (table vs. kanban vs. future saved
// views) is showing. Distinct from the sidebar (components/app-sidebar.tsx),
// which switches between whole products (CRM / Atendimento / Automações),
// not between views inside the CRM product.
export function CrmViewTabs({ active, onSelect }: CrmViewTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-hairline p-1">
      {CRM_VIEWS.map((view) => {
        const Icon = view.icon;
        return (
          <button
            key={view.key}
            type="button"
            disabled={!view.enabled}
            onClick={() => onSelect(view.key)}
            title={!view.enabled ? `${view.label} — em breve` : view.label}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition",
              !view.enabled && "cursor-not-allowed opacity-40",
              view.enabled && active === view.key && "bg-accent-primary/20 text-primary",
              view.enabled && active !== view.key && "text-secondary hover:bg-white/5 hover:text-primary"
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
