"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { CrmViewTabs } from "@/components/crm/crm-view-tabs";
import { LeadsFilters } from "@/components/leads/leads-filters";
import { PersonFilter } from "@/components/leads/person-filter";
import { ColumnPicker } from "@/components/leads/column-picker";
import { ScaleLogo } from "@/components/scale-logo";
import { LeadsBoard } from "@/components/leads/leads-board";
import { DealsBoard } from "@/components/deals/deals-board";
import { SdrPipelineBoard } from "@/components/leads/sdr-pipeline-board";
import { CloserPipelineBoard } from "@/components/deals/closer-pipeline-board";
import { CommissionsView } from "@/components/commissions/commissions-view";
import { NotifySubscribersView } from "@/components/automations/notify-subscribers-view";
import { LeadsTrash } from "@/components/leads/leads-trash";
import type { LeadFilters } from "@/lib/actions/leads";
import { DEFAULT_VISIBLE_COLUMNS } from "@/lib/leads-table-columns";
import { useLocalStorageSet } from "@/lib/use-local-storage-set";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Deal = Database["public"]["Tables"]["deals"]["Row"];
type LeadAttribution = Database["public"]["Tables"]["lead_attribution"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface QualificationReason {
  id: string;
  descricao: string;
}
interface LostReason {
  id: string;
  descricao: string;
}
interface Person {
  id: string;
  nome: string;
  foto_url: string | null;
}
interface Niche {
  id: string;
  nome: string;
}

interface CrmWorkspaceProps {
  leads: Lead[];
  totalLeads: number;
  /** All deals, up to the page's own limit — feeds the "Negócios" kanban. */
  deals: Deal[];
  /** Deals whose lead_id is among the loaded `leads` — feeds the leads
   * table's deal-aware Etapa column and the leads kanban's "Marcar reunião"
   * flow, kept separate from `deals` because the two lead sets can diverge
   * once there are more leads than the page limit. */
  dealsForLeads: Deal[];
  /** id/nome for the leads referenced by `deals` (not necessarily a subset
   * of `leads`) — resolves names on deal cards. */
  dealLeadRefs: { id: string; nome: string }[];
  niches: Niche[];
  sdrs: Person[];
  closers: Person[];
  sdrReasons: QualificationReason[];
  closerReasons: QualificationReason[];
  sdrLostReasons: LostReason[];
  closerLostReasons: LostReason[];
  /** [deal_id, meeting][] rather than a Map — server actions/RSC props
   * serialize plain arrays, not Map instances. */
  meetingsByDealId: [string, Meeting][];
  qualifiedLeadIds: string[];
  qualifiedDealIds: string[];
  currentUserId: string | null;
  currentUserRole: string | null;
  currentUserName: string | null;
  attributions: LeadAttribution[];
}

type KanbanSubView = "leads" | "negocios";

// Which `origem` values count as each lane for the Quadro Orgânico/Quadro
// de Tráfego tabs (see crm-view-tabs.tsx's CRM_VIEWS comment for why these
// exist despite the earlier "Análise Tráfego" rejection). Values must match
// exactly what writes `leads.origem` — the site's own webhooks
// (app/api/v1/webhooks/{blog,cases,contato}/route.ts) for orgânico.
// "Meta Ads" is the historical Monday-migrated value and already accounts
// for ~5,600 of the ~7,400 leads in the table — Quadro de Tráfego is NOT
// sparse, it's most of the database. LPs de tráfego aren't wired into the
// CRM yet (still deciding internal vs external API); add their real
// `origem` string here once that pipeline exists. Google Ads (~240 leads)
// and other historical sources (Outros/Recomendação/Social Selling/Evento/
// Outbound/Google Orgânico, ~1,750 leads combined) intentionally fall into
// neither board — only what the user explicitly named.
const ORIGEM_ORGANICO = ["Site — Blog", "Site — Cases", "Site — Contato"];
const ORIGEM_TRAFEGO = ["Meta Ads"];

// The single real screen inside app/(app). Two independent nav levels:
// - AppSidebar switches between *products* (CRM / Atendimento / Automações
//   — only CRM exists so far).
// - CrmViewTabs (in the toolbar below, next to the filter) switches between
//   *views of the CRM product* (Quadro principal / Kanban / future saved
//   views) — these aren't sidebar items because they're specific to this
//   one product, not top-level sections.
// LeadsBoard/DealsBoard keep owning their own data/mutation state; this
// just decides which one is mounted and owns the filter both share.
export function CrmWorkspace({
  leads,
  totalLeads,
  deals,
  dealsForLeads,
  dealLeadRefs,
  niches: initialNiches,
  sdrs,
  closers,
  sdrReasons,
  closerReasons,
  sdrLostReasons,
  closerLostReasons,
  meetingsByDealId,
  qualifiedLeadIds,
  qualifiedDealIds,
  currentUserId,
  currentUserRole,
  currentUserName,
  attributions,
}: CrmWorkspaceProps) {
  // Lifted to state (not just the prop) so a niche created from the leads
  // table's inline "Nicho" combobox (editable-cell.tsx) shows up
  // immediately in every mounted board's dropdown — Quadro principal/
  // Orgânico/Tráfego/Kanban are separate LeadsBoard instances that all
  // read from this one list.
  const [niches, setNiches] = useState(initialNiches);
  const [activeSection, setActiveSection] = useState("crm");
  const [activeView, setActiveView] = useState("quadro_principal");
  const [kanbanSubView, setKanbanSubView] = useState<KanbanSubView>("leads");
  const [filters, setFilters] = useState<LeadFilters>({});
  const [visibleColumns, setVisibleColumns] = useLocalStorageSet(
    "crm:leads-table:columns",
    DEFAULT_VISIBLE_COLUMNS,
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Each board (SdrPipelineBoard/CloserPipelineBoard especially) self-fetches
  // on mount. Switching CrmViewTabs used to conditionally *mount* whichever
  // view was active, so React unmounted the previous one and every return
  // visit re-fetched from scratch — the "troca entre telas demora" the user
  // hit. Once a view has been visited, it stays mounted (just hidden via
  // CSS) instead of unmounting, so switching back is instant with no
  // re-fetch. Only visited views ever mount, so the initial page load still
  // only fetches "quadro_principal", not all five boards at once.
  const [visitedViews, setVisitedViews] = useState<Set<string>>(
    new Set(["quadro_principal"]),
  );
  const [visitedKanbanSubViews, setVisitedKanbanSubViews] = useState<
    Set<KanbanSubView>
  >(new Set(["leads"]));
  const [visitedSections, setVisitedSections] = useState<Set<string>>(
    new Set(["crm"]),
  );

  function selectSection(section: string) {
    setActiveSection(section);
    setVisitedSections((prev) =>
      prev.has(section) ? prev : new Set(prev).add(section),
    );
  }

  function selectView(view: string) {
    setActiveView(view);
    setVisitedViews((prev) =>
      prev.has(view) ? prev : new Set(prev).add(view),
    );
  }

  function selectKanbanSubView(view: KanbanSubView) {
    setKanbanSubView(view);
    setVisitedKanbanSubViews((prev) =>
      prev.has(view) ? prev : new Set(prev).add(view),
    );
  }

  function handleNicheCreated(niche: { id: string; nome: string }) {
    setNiches((prev) =>
      prev.some((n) => n.id === niche.id)
        ? prev
        : [...prev, niche].sort((a, b) => a.nome.localeCompare(b.nome)),
    );
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        activeSection={activeSection}
        onSelectSection={selectSection}
        userName={currentUserName}
        userRole={currentUserRole}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3 md:hidden">
          <ScaleLogo />
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md border border-hairline p-2 text-secondary"
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
        </div>

        <main className="px-4 py-6 sm:px-6">
          {activeSection === "crm" && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <CrmViewTabs active={activeView} onSelect={selectView} />
                {(activeView === "quadro_principal" ||
                  activeView === "quadro_organico" ||
                  activeView === "quadro_trafego" ||
                  activeView === "kanban") && (
                  <>
                    <LeadsFilters
                      filters={filters}
                      onChange={setFilters}
                      niches={niches}
                    />
                    <PersonFilter
                      selectedId={filters.owner_sdr_id}
                      onChange={(id) =>
                        setFilters({ ...filters, owner_sdr_id: id })
                      }
                      people={sdrs}
                    />
                    <ColumnPicker
                      visible={visibleColumns}
                      onChange={setVisibleColumns}
                      onReset={() =>
                        setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS))
                      }
                    />
                  </>
                )}
              </div>

              {visitedViews.has("quadro_principal") && (
                <div
                  className={
                    activeView === "quadro_principal" ? undefined : "hidden"
                  }
                >
                  <LeadsBoard
                    view="table"
                    initialLeads={leads}
                    totalLeads={totalLeads}
                    niches={niches}
                    sdrs={sdrs}
                    closers={closers}
                    reasons={sdrReasons}
                    lostReasons={sdrLostReasons}
                    closerLostReasons={closerLostReasons}
                    qualifiedLeadIds={qualifiedLeadIds}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    attributions={attributions}
                    deals={dealsForLeads}
                    filters={filters}
                    visibleColumns={visibleColumns}
                    onNicheCreated={handleNicheCreated}
                  />
                </div>
              )}

              {visitedViews.has("quadro_organico") && (
                <div
                  className={
                    activeView === "quadro_organico" ? undefined : "hidden"
                  }
                >
                  <LeadsBoard
                    view="table"
                    initialLeads={[]}
                    totalLeads={0}
                    niches={niches}
                    sdrs={sdrs}
                    closers={closers}
                    reasons={sdrReasons}
                    lostReasons={sdrLostReasons}
                    closerLostReasons={closerLostReasons}
                    qualifiedLeadIds={[]}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    attributions={[]}
                    deals={[]}
                    filters={{ ...filters, origem_in: ORIGEM_ORGANICO }}
                    visibleColumns={visibleColumns}
                    onNicheCreated={handleNicheCreated}
                  />
                </div>
              )}

              {visitedViews.has("quadro_trafego") && (
                <div
                  className={
                    activeView === "quadro_trafego" ? undefined : "hidden"
                  }
                >
                  <LeadsBoard
                    view="table"
                    initialLeads={[]}
                    totalLeads={0}
                    niches={niches}
                    sdrs={sdrs}
                    closers={closers}
                    reasons={sdrReasons}
                    lostReasons={sdrLostReasons}
                    closerLostReasons={closerLostReasons}
                    qualifiedLeadIds={[]}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    attributions={[]}
                    deals={[]}
                    filters={{ ...filters, origem_in: ORIGEM_TRAFEGO }}
                    visibleColumns={visibleColumns}
                    onNicheCreated={handleNicheCreated}
                  />
                </div>
              )}

              {visitedViews.has("kanban") && (
                <div className={activeView === "kanban" ? undefined : "hidden"}>
                  <div className="mb-4 flex w-fit rounded-lg border border-hairline p-0.5 text-sm">
                    <button
                      type="button"
                      onClick={() => selectKanbanSubView("leads")}
                      className={cn(
                        "rounded-md px-3 py-1 transition",
                        kanbanSubView === "leads"
                          ? "bg-accent-primary/20 text-primary"
                          : "text-secondary",
                      )}
                    >
                      Leads
                    </button>
                    <button
                      type="button"
                      onClick={() => selectKanbanSubView("negocios")}
                      className={cn(
                        "rounded-md px-3 py-1 transition",
                        kanbanSubView === "negocios"
                          ? "bg-accent-primary/20 text-primary"
                          : "text-secondary",
                      )}
                    >
                      Negócios
                    </button>
                  </div>

                  {visitedKanbanSubViews.has("leads") && (
                    <div
                      className={
                        kanbanSubView === "leads" ? undefined : "hidden"
                      }
                    >
                      <LeadsBoard
                        view="kanban"
                        initialLeads={leads}
                        totalLeads={totalLeads}
                        niches={niches}
                        sdrs={sdrs}
                        closers={closers}
                        reasons={sdrReasons}
                        lostReasons={sdrLostReasons}
                        closerLostReasons={closerLostReasons}
                        qualifiedLeadIds={qualifiedLeadIds}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        attributions={attributions}
                        deals={dealsForLeads}
                        filters={filters}
                        visibleColumns={visibleColumns}
                        onNicheCreated={handleNicheCreated}
                      />
                    </div>
                  )}
                  {visitedKanbanSubViews.has("negocios") && (
                    <div
                      className={
                        kanbanSubView === "negocios" ? undefined : "hidden"
                      }
                    >
                      <DealsBoard
                        initialDeals={deals}
                        leads={dealLeadRefs}
                        closers={closers}
                        reasons={closerReasons}
                        qualifiedDealIds={qualifiedDealIds}
                        meetingsByDealId={new Map(meetingsByDealId)}
                        lostReasons={closerLostReasons}
                      />
                    </div>
                  )}
                </div>
              )}

              {visitedViews.has("sdrs") && (
                <div className={activeView === "sdrs" ? undefined : "hidden"}>
                  <SdrPipelineBoard
                    sdrs={sdrs}
                    closers={closers}
                    niches={niches}
                    reasons={sdrReasons}
                    lostReasons={sdrLostReasons}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                  />
                </div>
              )}

              {visitedViews.has("closers") && (
                <div
                  className={activeView === "closers" ? undefined : "hidden"}
                >
                  <CloserPipelineBoard
                    closers={closers}
                    leads={dealLeadRefs}
                    reasons={closerReasons}
                    lostReasons={closerLostReasons}
                  />
                </div>
              )}

              {visitedViews.has("lixeira") && (
                <div className={activeView === "lixeira" ? undefined : "hidden"}>
                  <LeadsTrash currentUserRole={currentUserRole} />
                </div>
              )}
            </>
          )}

          {visitedSections.has("comissoes") && (
            <div
              className={activeSection === "comissoes" ? undefined : "hidden"}
            >
              <CommissionsView
                closers={closers}
                currentUserRole={currentUserRole}
              />
            </div>
          )}

          {visitedSections.has("automacoes") && (
            <div
              className={activeSection === "automacoes" ? undefined : "hidden"}
            >
              <NotifySubscribersView currentUserRole={currentUserRole} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
