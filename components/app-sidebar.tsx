"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Handshake,
  LogOut,
  Megaphone,
  MessageCircle,
  Phone,
  Sprout,
  Table2,
  Target,
  Trash2,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { ScaleLogo } from "@/components/scale-logo";
import { cn } from "@/lib/utils";

export interface SidebarSectionDef {
  key: string;
  label: string;
  icon: typeof Users;
  enabled: boolean;
}

// Bottom group: settings/other products — Comissões (regras + lista,
// components/commissions/commissions-view.tsx), Automações ("Avisar
// inscritos", components/automations/notify-subscribers-view.tsx), and
// Atendimento (real WhatsApp conversations) still coming. No standalone
// "CRM" entry here — its sub-views are the top group (CRM_VIEWS) below,
// reachable directly instead of through an intermediate product switch.
export const SIDEBAR_SECTIONS: SidebarSectionDef[] = [
  { key: "comissoes", label: "Comissões", icon: DollarSign, enabled: true },
  { key: "atendimento", label: "Atendimento", icon: MessageCircle, enabled: false },
  { key: "automacoes", label: "Automações", icon: Zap, enabled: true },
];

export interface CrmViewDef {
  key: string;
  label: string;
  icon: typeof Table2;
  enabled: boolean;
}

// Top group: every CRM "quadro"/board, one click away instead of living
// behind a separate CrmViewTabs row inside the workspace (per explicit
// user request — menu lateral dividido em 2 partes, tabelas em cima,
// configurações embaixo). Selecting one of these also switches
// activeSection to "crm" (see crm-workspace.tsx's selectView) since they're
// reachable now even while looking at Comissões/Automações.
//
// Este Mês/Histórico/Análise Tráfego were dropped per explicit user
// feedback — they'd have been saved filters/groupings of this same table,
// which the Filtros popover and the separate analytics dashboard already
// cover. SDR's/Closer's are NOT the same kind of thing, despite looking
// similar at first — they're real role-scoped pipeline boards with their
// own grouping logic (see sdr-pipeline-board.tsx/closer-pipeline-board.tsx),
// not filtered views of the table. Quadro Orgânico/Quadro de Tráfego/Quadro
// Live are an operational split (Case/Artigo/Site Institucional vs. paid
// traffic vs. live-event signups work differently day-to-day), not an
// analytics one. There's no "Kanban" entry — it's a view toggle inside each
// Quadro's own table header (leads-table.tsx), not a peer of these.
export const CRM_VIEWS: CrmViewDef[] = [
  { key: "quadro_principal", label: "Quadro principal", icon: Table2, enabled: true },
  { key: "quadro_organico", label: "Quadro Orgânico", icon: Sprout, enabled: true },
  { key: "quadro_trafego", label: "Quadro de Tráfego", icon: Megaphone, enabled: true },
  // Leads de LPs de live/evento (origem "Site — Live", see crm-workspace.tsx's
  // ORIGEM_LIVE) — painel fixo e reutilizável, não específico de uma live só.
  { key: "quadro_live", label: "Quadro Live", icon: Video, enabled: true },
  { key: "negocios", label: "Negócios", icon: Handshake, enabled: true },
  { key: "sdrs", label: "SDR's", icon: Phone, enabled: true },
  { key: "closers", label: "Closer's", icon: Target, enabled: true },
  { key: "lixeira", label: "Lixeira", icon: Trash2, enabled: true },
];

const ROLE_LABEL: Record<string, string> = {
  sdr: "SDR",
  closer: "Closer",
  am: "Account Manager",
  advogado: "Advogado responsável",
  admin: "Admin",
};

interface AppSidebarProps {
  activeSection: string;
  activeView: string;
  onSelectView: (key: string) => void;
  onSelectSection: (key: string) => void;
  userName: string | null;
  userRole: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

// Collapsible desktop sidebar (persistent, icon-only when collapsed) +
// off-canvas mobile drawer, sharing the same inner content. Two nav groups
// now, not one: CRM_VIEWS on top (every quadro/board, one click away) and
// SIDEBAR_SECTIONS on the bottom (other products/settings).
export function AppSidebar({
  activeSection,
  activeView,
  onSelectView,
  onSelectSection,
  userName,
  userRole,
  mobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center justify-between border-b border-hairline px-4 py-4", collapsed && "justify-center px-2")}>
        {collapsed ? <span className="text-lg font-bold text-primary">S</span> : <ScaleLogo />}
        {/* Positioned here (not the footer) deliberately — the Next.js dev
            tools indicator is fixed bottom-left in development and would
            otherwise sit on top of this button. */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "hidden shrink-0 rounded-md border border-hairline p-1.5 text-secondary transition hover:border-hairline-strong hover:text-primary md:block",
            collapsed && "mt-2"
          )}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="flex flex-col gap-1">
          {CRM_VIEWS.map((view) => {
            const Icon = view.icon;
            const active = activeSection === "crm" && activeView === view.key;
            return (
              <li key={view.key}>
                <button
                  type="button"
                  disabled={!view.enabled}
                  onClick={() => {
                    onSelectView(view.key);
                    onCloseMobile();
                  }}
                  title={collapsed ? view.label : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition",
                    collapsed && "justify-center",
                    !view.enabled && "cursor-not-allowed opacity-40",
                    view.enabled && active && "bg-accent-primary/15 text-primary",
                    view.enabled && !active && "text-secondary hover:bg-white/5 hover:text-primary"
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && <span className="flex-1 text-left">{view.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div className={cn("my-3 border-t border-hairline", collapsed && "mx-1")} />

        <ul className="flex flex-col gap-1">
          {SIDEBAR_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <li key={section.key}>
                <button
                  type="button"
                  disabled={!section.enabled}
                  onClick={() => {
                    onSelectSection(section.key);
                    onCloseMobile();
                  }}
                  title={collapsed ? section.label : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition",
                    collapsed && "justify-center",
                    !section.enabled && "cursor-not-allowed opacity-40",
                    section.enabled && activeSection === section.key && "bg-accent-primary/15 text-primary",
                    section.enabled && activeSection !== section.key && "text-secondary hover:bg-white/5 hover:text-primary"
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && <span className="flex-1 text-left">{section.label}</span>}
                  {!collapsed && !section.enabled && <span className="text-[10px] text-muted">em breve</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-hairline p-3">
        {!collapsed && userName && (
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium text-primary">{userName}</p>
            <p className="text-xs text-muted">{userRole ? (ROLE_LABEL[userRole] ?? userRole) : ""}</p>
          </div>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border border-hairline text-xs text-secondary transition hover:border-hairline-strong hover:text-primary",
              "w-full px-3 py-2"
            )}
          >
            <LogOut size={14} />
            {!collapsed && "Sair"}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-hairline bg-bg-secondary/80 backdrop-blur-xl transition-[width] duration-200 md:block",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {content}
      </aside>

      {/* Mobile off-canvas drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-hairline bg-bg-secondary">{content}</aside>
        </div>
      )}
    </>
  );
}
