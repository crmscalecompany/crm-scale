-- RLS policies
--
-- Enables RLS on every table and applies the three-tier model:
--   Tier A — shared reference data: select for any authenticated staff
--     role, admin-only writes.
--   Tier B — record-owned operational data: select/update gated by the
--     relevant owns_*()/is_*_closer() helper, insert allowed for the
--     originating role, admin always allowed.
--   Tier C — financial/config/sensitive: admin-only, with a narrow
--     self-service select carve-out on commissions/commission_rules.
-- DELETE is admin-only everywhere — staff mark records lost/inactive
-- instead of deleting them; nothing in the blueprint's flow calls for
-- destructive deletes from non-admin roles.
--
-- Note: the bearer-token machine-to-machine path (see lib/api/auth.ts,
-- Week 1 §5) uses the service-role client and bypasses RLS entirely by
-- design — these policies govern the interactive session-cookie path only.

-- ===== Tier A: niches, users, lost_reasons, qualification_reasons =====

alter table public.niches enable row level security;

create policy niches_select on public.niches for select
  to authenticated using (public.current_user_role() is not null);
create policy niches_insert on public.niches for insert
  to authenticated with check (public.is_admin());
create policy niches_update on public.niches for update
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy niches_delete on public.niches for delete
  to authenticated using (public.is_admin());

alter table public.users enable row level security;

create policy users_select on public.users for select
  to authenticated using (public.current_user_role() is not null);
create policy users_insert on public.users for insert
  to authenticated with check (public.is_admin());
create policy users_update on public.users for update
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy users_delete on public.users for delete
  to authenticated using (public.is_admin());

alter table public.lost_reasons enable row level security;

create policy lost_reasons_select on public.lost_reasons for select
  to authenticated using (public.current_user_role() is not null);
create policy lost_reasons_insert on public.lost_reasons for insert
  to authenticated with check (public.is_admin());
create policy lost_reasons_update on public.lost_reasons for update
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy lost_reasons_delete on public.lost_reasons for delete
  to authenticated using (public.is_admin());

alter table public.qualification_reasons enable row level security;

create policy qualification_reasons_select on public.qualification_reasons for select
  to authenticated using (public.current_user_role() is not null);
create policy qualification_reasons_insert on public.qualification_reasons for insert
  to authenticated with check (public.is_admin());
create policy qualification_reasons_update on public.qualification_reasons for update
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy qualification_reasons_delete on public.qualification_reasons for delete
  to authenticated using (public.is_admin());

-- ===== Tier B: record-owned operational data =====

alter table public.leads enable row level security;

-- Read access also extends to the closer working a deal on this lead (not
-- just the owning SDR) — without this a closer couldn't see the contact
-- info of the lead behind their own deal, which the blueprint's funnel
-- requires at Etapa 2.
create policy leads_select on public.leads for select
  to authenticated using (
    public.owns_lead(id)
    or exists (select 1 from public.deals d where d.lead_id = leads.id and d.closer_id = auth.uid())
  );
create policy leads_insert on public.leads for insert
  to authenticated with check (public.is_admin() or public.current_user_role() = 'sdr');
create policy leads_update on public.leads for update
  to authenticated using (public.owns_lead(id)) with check (public.owns_lead(id));
create policy leads_delete on public.leads for delete
  to authenticated using (public.is_admin());

alter table public.lead_attribution enable row level security;

create policy lead_attribution_select on public.lead_attribution for select
  to authenticated using (public.owns_lead(lead_id));
create policy lead_attribution_insert on public.lead_attribution for insert
  to authenticated with check (public.owns_lead(lead_id));
create policy lead_attribution_update on public.lead_attribution for update
  to authenticated using (public.owns_lead(lead_id)) with check (public.owns_lead(lead_id));
create policy lead_attribution_delete on public.lead_attribution for delete
  to authenticated using (public.is_admin());

alter table public.deals enable row level security;

-- Select is broad (owns_deal: admin, closer, or the originating SDR —
-- read-only for the SDR case). Write is narrow (is_deal_closer: admin or
-- the assigned closer only) so an SDR can watch what happens to a deal they
-- handed off without being able to edit it.
create policy deals_select on public.deals for select
  to authenticated using (public.owns_deal(id));
create policy deals_insert on public.deals for insert
  to authenticated with check (public.is_admin() or closer_id = auth.uid());
create policy deals_update on public.deals for update
  to authenticated using (public.is_deal_closer(id))
  with check (public.is_admin() or closer_id = auth.uid());
create policy deals_delete on public.deals for delete
  to authenticated using (public.is_admin());

alter table public.deal_products enable row level security;

create policy deal_products_select on public.deal_products for select
  to authenticated using (public.owns_deal(deal_id));
create policy deal_products_insert on public.deal_products for insert
  to authenticated with check (public.is_deal_closer(deal_id));
create policy deal_products_update on public.deal_products for update
  to authenticated using (public.is_deal_closer(deal_id)) with check (public.is_deal_closer(deal_id));
create policy deal_products_delete on public.deal_products for delete
  to authenticated using (public.is_admin());

alter table public.qualifications enable row level security;

create policy qualifications_select on public.qualifications for select
  to authenticated using (
    public.is_admin()
    or (entidade_tipo = 'lead' and public.owns_lead(entidade_id))
    or (entidade_tipo = 'deal' and public.owns_deal(entidade_id))
  );
create policy qualifications_insert on public.qualifications for insert
  to authenticated with check (
    public.is_admin()
    or (etapa = 'sdr' and entidade_tipo = 'lead' and public.current_user_role() = 'sdr' and public.owns_lead(entidade_id))
    or (etapa = 'closer' and entidade_tipo = 'deal' and public.current_user_role() = 'closer' and public.is_deal_closer(entidade_id))
  );
create policy qualifications_update on public.qualifications for update
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy qualifications_delete on public.qualifications for delete
  to authenticated using (public.is_admin());

alter table public.follow_up_attempts enable row level security;

create policy follow_up_attempts_select on public.follow_up_attempts for select
  to authenticated using (
    (lead_id is not null and public.owns_lead(lead_id))
    or (deal_id is not null and public.owns_deal(deal_id))
  );
create policy follow_up_attempts_insert on public.follow_up_attempts for insert
  to authenticated with check (
    (lead_id is not null and public.owns_lead(lead_id))
    or (deal_id is not null and public.is_deal_closer(deal_id))
  );
create policy follow_up_attempts_update on public.follow_up_attempts for update
  to authenticated using (
    (lead_id is not null and public.owns_lead(lead_id))
    or (deal_id is not null and public.is_deal_closer(deal_id))
  )
  with check (
    (lead_id is not null and public.owns_lead(lead_id))
    or (deal_id is not null and public.is_deal_closer(deal_id))
  );
create policy follow_up_attempts_delete on public.follow_up_attempts for delete
  to authenticated using (public.is_admin());

alter table public.contracts enable row level security;

create policy contracts_select on public.contracts for select
  to authenticated using (public.owns_deal(deal_id));
create policy contracts_insert on public.contracts for insert
  to authenticated with check (public.is_deal_closer(deal_id));
create policy contracts_update on public.contracts for update
  to authenticated using (public.is_deal_closer(deal_id)) with check (public.is_deal_closer(deal_id));
create policy contracts_delete on public.contracts for delete
  to authenticated using (public.is_admin());

alter table public.client_accounts enable row level security;

create policy client_accounts_select on public.client_accounts for select
  to authenticated using (public.owns_client_account(id));
create policy client_accounts_insert on public.client_accounts for insert
  to authenticated with check (
    public.is_admin() or (public.current_user_role() = 'am' and am_id = auth.uid())
  );
create policy client_accounts_update on public.client_accounts for update
  to authenticated using (public.owns_client_account(id)) with check (public.owns_client_account(id));
create policy client_accounts_delete on public.client_accounts for delete
  to authenticated using (public.is_admin());

alter table public.meetings enable row level security;

-- responsavel_id = auth.uid() is included alongside the referencia-chain
-- ownership check so whoever is actually responsible for running the
-- meeting can always see/manage it, even in edge cases where they aren't
-- the record owner (e.g. a closer covering a colleague's meeting).
create policy meetings_select on public.meetings for select
  to authenticated using (
    public.is_admin()
    or responsavel_id = auth.uid()
    or (referencia_tipo = 'lead' and public.owns_lead(referencia_id))
    or (referencia_tipo = 'deal' and public.owns_deal(referencia_id))
    or (referencia_tipo = 'client' and public.owns_client_account(referencia_id))
  );
create policy meetings_insert on public.meetings for insert
  to authenticated with check (public.is_admin() or responsavel_id = auth.uid());
create policy meetings_update on public.meetings for update
  to authenticated using (public.is_admin() or responsavel_id = auth.uid())
  with check (public.is_admin() or responsavel_id = auth.uid());
create policy meetings_delete on public.meetings for delete
  to authenticated using (public.is_admin());

alter table public.whatsapp_groups enable row level security;

create policy whatsapp_groups_select on public.whatsapp_groups for select
  to authenticated using (public.owns_client_account(client_account_id));
create policy whatsapp_groups_insert on public.whatsapp_groups for insert
  to authenticated with check (public.owns_client_account(client_account_id));
create policy whatsapp_groups_update on public.whatsapp_groups for update
  to authenticated using (public.owns_client_account(client_account_id))
  with check (public.owns_client_account(client_account_id));
create policy whatsapp_groups_delete on public.whatsapp_groups for delete
  to authenticated using (public.is_admin());

alter table public.whatsapp_messages enable row level security;

create policy whatsapp_messages_select on public.whatsapp_messages for select
  to authenticated using (
    (lead_id is not null and public.owns_lead(lead_id))
    or (client_account_id is not null and public.owns_client_account(client_account_id))
  );
create policy whatsapp_messages_insert on public.whatsapp_messages for insert
  to authenticated with check (
    (lead_id is not null and public.owns_lead(lead_id))
    or (client_account_id is not null and public.owns_client_account(client_account_id))
  );
create policy whatsapp_messages_delete on public.whatsapp_messages for delete
  to authenticated using (public.is_admin());

-- ===== Tier C: financial / config / sensitive =====

alter table public.commission_rules enable row level security;

create policy commission_rules_select on public.commission_rules for select
  to authenticated using (public.is_admin() or vendedor_id = auth.uid());
create policy commission_rules_insert on public.commission_rules for insert
  to authenticated with check (public.is_admin());
create policy commission_rules_update on public.commission_rules for update
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy commission_rules_delete on public.commission_rules for delete
  to authenticated using (public.is_admin());

alter table public.commissions enable row level security;

create policy commissions_select on public.commissions for select
  to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.deal_products dp
      where dp.id = commissions.deal_product_id and dp.vendedor_id = auth.uid()
    )
  );
create policy commissions_insert on public.commissions for insert
  to authenticated with check (public.is_admin());
create policy commissions_update on public.commissions for update
  to authenticated using (public.is_admin()) with check (public.is_admin());
create policy commissions_delete on public.commissions for delete
  to authenticated using (public.is_admin());

alter table public.automation_rules enable row level security;

create policy automation_rules_all on public.automation_rules for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.automation_logs enable row level security;

create policy automation_logs_all on public.automation_logs for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.meta_conversion_events enable row level security;

create policy meta_conversion_events_all on public.meta_conversion_events for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
