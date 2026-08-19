"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, DollarSign, LogOut, MessageCircle, Users, Zap } from "lucide-react";
import { ScaleLogo } from "@/components/scale-logo";
import { cn } from "@/lib/utils";

export interface SidebarSectionDef {
  key: string;
  label: string;
  icon: typeof Users;
  enabled: boolean;
}

// Top-level sections of the app — CRM (leads/deals) and Comissões (regras +
// lista, components/commissions/commissions-view.tsx), plus two the user
// has already told us are coming: Atendimento (real WhatsApp conversations)
// and Automações. The CRM section's own sub-views (Quadro principal,
// Kanban, Este Mês, etc) live as tabs inside the CRM workspace itself
// (components/crm/crm-view-tabs.tsx), not here — this sidebar is for
// switching between products, not between views of one product.
export const SIDEBAR_SECTIONS: SidebarSectionDef[] = [
  { key: "crm", label: "CRM", icon: Users, enabled: true },
  { key: "comissoes", label: "Comissões", icon: DollarSign, enabled: true },
  { key: "atendimento", label: "Atendimento", icon: MessageCircle, enabled: false },
  { key: "automacoes", label: "Automações", icon: Zap, enabled: false },
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
  onSelectSection: (key: string) => void;
  userName: string | null;
  userRole: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

// Collapsible desktop sidebar (persistent, icon-only when collapsed) +
// off-canvas mobile drawer, sharing the same inner content.
export function AppSidebar({ activeSection, onSelectSection, userName, userRole, mobileOpen, onCloseMobile }: AppSidebarProps) {
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
