"use client";

import { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { LeadsFilters } from "@/components/leads/leads-filters";
import { PersonFilter } from "@/components/leads/person-filter";
import { EventoFilter } from "@/components/leads/evento-filter";
import { MonthFilter } from "@/components/leads/month-filter";
import { ColumnPicker } from "@/components/leads/column-picker";
import { ScaleLogo } from "@/components/scale-logo";
import { LeadsBoard } from "@/components/leads/leads-board";
import { DealsBoard } from "@/components/deals/deals-board";
import { SdrPipelineBoard } from "@/components/leads/sdr-pipeline-board";
import { CloserPipelineBoard } from "@/components/deals/closer-pipeline-board";
import { CommissionsView } from "@/components/commissions/commissions-view";
import { NotifySubscribersView } from "@/components/automations/notify-subscribers-view";
import { AutomationsOverview } from "@/components/automations/automations-overview";
import { LeadsTrash } from "@/components/leads/leads-trash";
import type { LeadFilters } from "@/lib/actions/leads";
import { DEFAULT_VISIBLE_COLUMNS } from "@/lib/leads-table-columns";
import { currentMonthInBrazil, monthDateRange } from "@/lib/format";
import { useLocalStorageSet } from "@/lib/use-local-storage-set";
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
  /** "YYYY-MM-DD" values, newest first — feeds Quadro Live's "Evento"
   * filter (see lib/data/lead-attribution.ts's listDistinctEventos). */
  eventos: string[];
}

// Which `origem` values count as each lane for the Quadro Orgânico/Quadro
// de Tráfego tabs (see app-sidebar.tsx's CRM_VIEWS comment for why these
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
// Leads de LPs de live/evento (app/api/v1/webhooks/live/route.ts) — painel
// fixo e reutilizável: toda live futura que usar essa mesma origem cai aqui
// automaticamente, sem precisar de uma nova aba por evento.
const ORIGEM_LIVE = ["Site — Live"];

// The single real screen inside app/(app). AppSidebar owns both nav groups
// now (see app-sidebar.tsx): CRM_VIEWS on top switches between *views of
// the CRM product* (Quadro principal / Orgânico / Tráfego / Negócios /
// SDR's / Closer's / Lixeira), SIDEBAR_SECTIONS on the bottom switches
// between *other products* (Comissões / Atendimento / Automações). Table
// vs. Kanban is a further toggle *inside* each Quadro tab (leads-table.tsx's
// header), not a nav item. LeadsBoard/DealsBoard keep owning their own
// data/mutation state; this just decides which one is mounted and owns the
// filters/page-header controls both share.
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
  eventos,
}: CrmWorkspaceProps) {
  // Lifted to state (not just the prop) so a niche created from the leads
  // table's inline "Nicho" combobox (editable-cell.tsx) shows up
  // immediately in every mounted board's dropdown — Quadro principal/
  // Orgânico/Tráfego are separate LeadsBoard instances that all read
  // from this one list.
  const [niches, setNiches] = useState(initialNiches);
  const [activeSection, setActiveSection] = useState("crm");
  const [activeView, setActiveView] = useState("quadro_principal");
  const [filters, setFilters] = useState<LeadFilters>({});
  // Defaults to the current month, not "todos os períodos" — Quadro
  // principal/Orgânico/Tráfego were loading thousands of leads (Tráfego
  // alone is ~5,600) with no date bound at all. Kept separate from
  // `filters` (merged into it via `effectiveFilters` below) since
  // MonthFilter's month-stepper UX doesn't map cleanly onto the Filtros
  // popover's generic field-by-field shape — same reasoning the SDR/Closer
  // pipelines already applied when they got their own MonthFilter.
  const [month, setMonth] = useState<string | null>(currentMonthInBrazil);
  const effectiveFilters = useMemo<LeadFilters>(() => {
    const range = month ? monthDateRange(month) : { from: undefined, to: undefined };
    return { ...filters, criado_em_from: range.from, criado_em_to: range.to };
  }, [filters, month]);
  // Versioned key (":v2", not just "crm:leads-table:columns") — per
  // explicit, repeated user feedback that not every column was showing by
  // default. The code-level default (DEFAULT_VISIBLE_COLUMNS) was already
  // correct; a narrower set saved in localStorage from before that fix (or
  // from someone toggling the picker) silently overrode it forever, since
  // useLocalStorageSet only falls back to the default when nothing's
  // saved. Bumping the key forces everyone back to the real default once;
  // deliberate customizations after that still persist normally.
  const [visibleColumns, setVisibleColumns] = useLocalStorageSet(
    "crm:leads-table:columns:v2",
    DEFAULT_VISIBLE_COLUMNS,
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Each board (SdrPipelineBoard/CloserPipelineBoard especially) self-fetches
  // on mount. Switching views used to conditionally *mount* whichever
  // view was active, so React unmounted the previous one and every return
  // visit re-fetched from scratch — the "troca entre telas demora" the user
  // hit. Once a view has been visited, it stays mounted (just hidden via
  // CSS) instead of unmounting, so switching back is instant with no
  // re-fetch. Only visited views ever mount, so the initial page load still
  // only fetches "quadro_principal", not all five boards at once.
  const [visitedViews, setVisitedViews] = useState<Set<string>>(
    new Set(["quadro_principal"]),
  );
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
    // Sidebar's top group (CRM_VIEWS) is reachable from any section now,
    // not just while already inside "crm" — see app-sidebar.tsx.
    selectSection("crm");
    setActiveView(view);
    setVisitedViews((prev) =>
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

  // Filter controls shared by the four Quadro boards' page headers
  // (rendered inside leads-board.tsx, next to the title/search/view-toggle/
  // Novo-lead — per explicit user request, one header row per page rather
  // than a separate toolbar row above the board). Built once here since all
  // four read/write the same `filters`/`month` state this component owns.
  const headerFilters = (
    <>
      <MonthFilter month={month} onChange={setMonth} defaultMonth={currentMonthInBrazil()} />
      <LeadsFilters filters={filters} onChange={setFilters} niches={niches} />
      <PersonFilter selectedId={filters.owner_sdr_id} onChange={(id) => setFilters({ ...filters, owner_sdr_id: id })} people={sdrs} />
      {/* Only Quadro Live's board actually applies `evento` below — writes
          to the same shared `filters` state as every other header control,
          so the other three boards explicitly null it back out (see each
          board's `filters` prop). */}
      {activeView === "quadro_live" && (
        <EventoFilter selected={filters.evento} onChange={(evento) => setFilters({ ...filters, evento })} eventos={eventos} />
      )}
      <ColumnPicker visible={visibleColumns} onChange={setVisibleColumns} onReset={() => setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS))} />
    </>
  );

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        activeSection={activeSection}
        activeView={activeView}
        onSelectView={selectView}
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
              {visitedViews.has("quadro_principal") && (
                <div
                  className={
                    activeView === "quadro_principal" ? undefined : "hidden"
                  }
                >
                  <LeadsBoard
                    title="Quadro principal"
                    headerControls={headerFilters}
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
                    filters={{ ...effectiveFilters, evento: undefined }}
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
                    title="Quadro Orgânico"
                    headerControls={headerFilters}
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
                    filters={{ ...effectiveFilters, origem_in: ORIGEM_ORGANICO, evento: undefined }}
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
                    title="Quadro de Tráfego"
                    headerControls={headerFilters}
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
                    filters={{ ...effectiveFilters, origem_in: ORIGEM_TRAFEGO, evento: undefined }}
                    visibleColumns={visibleColumns}
                    onNicheCreated={handleNicheCreated}
                  />
                </div>
              )}

              {visitedViews.has("quadro_live") && (
                <div
                  className={
                    activeView === "quadro_live" ? undefined : "hidden"
                  }
                >
                  <LeadsBoard
                    title="Quadro Live"
                    headerControls={headerFilters}
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
                    filters={{ ...effectiveFilters, origem_in: ORIGEM_LIVE }}
                    visibleColumns={visibleColumns}
                    onNicheCreated={handleNicheCreated}
                  />
                </div>
              )}

              {visitedViews.has("negocios") && (
                <div className={activeView === "negocios" ? undefined : "hidden"}>
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

              {visitedViews.has("sdrs") && (
                <div className={activeView === "sdrs" ? undefined : "hidden"}>
                  <SdrPipelineBoard
                    sdrs={sdrs}
                    closers={closers}
                    niches={niches}
                    reasons={sdrReasons}
                    lostReasons={sdrLostReasons}
                    closerLostReasons={closerLostReasons}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    visibleColumns={visibleColumns}
                    onNicheCreated={handleNicheCreated}
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
              <div className="flex flex-col gap-8">
                <AutomationsOverview />
                <div className="border-t border-hairline pt-8">
                  <NotifySubscribersView currentUserRole={currentUserRole} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
