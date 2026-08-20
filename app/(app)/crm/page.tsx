import { createClient } from "@/lib/supabase/server";
import { listLeads, listLeadsByIds } from "@/lib/data/leads";
import { listDeals, listDealsByLeadIds } from "@/lib/data/deals";
import { listNiches } from "@/lib/data/niches";
import { listUsersByRole, getCurrentUserProfile } from "@/lib/data/users";
import { listQualificationReasons } from "@/lib/data/qualification-reasons";
import { listQualificationsFor } from "@/lib/data/qualifications";
import { listLostReasons } from "@/lib/data/lost-reasons";
import { listMeetingsByDealIds } from "@/lib/data/meetings";
import { listAttributionByLeadIds, listDistinctEventos } from "@/lib/data/lead-attribution";
import { CrmWorkspace } from "@/components/crm/crm-workspace";

// The single real screen inside app/(app) — consolidates what used to be
// separate /leads and /deals pages (see plan §"Week 2.5") into one
// workspace with a sidebar-driven view switcher.
export default async function CrmPage() {
  const db = await createClient();

  const [{ data: leads, total: totalLeads }, { data: allDeals }, niches, sdrs, closers, sdrReasons, closerReasons, sdrLostReasons, closerLostReasons, profile, eventos] =
    await Promise.all([
      listLeads(db, { limit: 200, offset: 0 }),
      listDeals(db, { limit: 200, offset: 0 }),
      listNiches(db),
      listUsersByRole(db, "sdr"),
      listUsersByRole(db, "closer"),
      listQualificationReasons(db, "sdr"),
      listQualificationReasons(db, "closer"),
      listLostReasons(db, "sdr"),
      listLostReasons(db, "closer"),
      getCurrentUserProfile(db),
      listDistinctEventos(db),
    ]);

  const leadIds = leads.map((l) => l.id);
  const [leadQualifications, dealQualifications, attributions, dealsForLeads, dealLeadRefs, meetingsByDealId] = await Promise.all([
    listQualificationsFor(db, "lead", leadIds),
    listQualificationsFor(
      db,
      "deal",
      allDeals.map((d) => d.id)
    ),
    listAttributionByLeadIds(db, leadIds),
    listDealsByLeadIds(db, leadIds),
    listLeadsByIds(
      db,
      allDeals.map((d) => d.lead_id)
    ),
    listMeetingsByDealIds(
      db,
      allDeals.map((d) => d.id)
    ),
  ]);

  return (
    <CrmWorkspace
      leads={leads}
      totalLeads={totalLeads}
      deals={allDeals}
      niches={niches}
      sdrs={sdrs}
      closers={closers}
      sdrReasons={sdrReasons}
      closerReasons={closerReasons}
      sdrLostReasons={sdrLostReasons}
      closerLostReasons={closerLostReasons}
      meetingsByDealId={[...meetingsByDealId.entries()]}
      qualifiedLeadIds={leadQualifications.map((q) => q.entidade_id)}
      qualifiedDealIds={dealQualifications.map((q) => q.entidade_id)}
      currentUserId={profile?.id ?? null}
      currentUserRole={profile?.papel ?? null}
      currentUserName={profile?.nome ?? null}
      attributions={attributions}
      dealsForLeads={dealsForLeads}
      dealLeadRefs={dealLeadRefs}
      eventos={eventos}
    />
  );
}
