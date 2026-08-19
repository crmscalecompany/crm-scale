-- Two RLS gaps found while building the Week 2 kanban UI — both are real
-- funnel actions the original policies (see *_rls_policies.sql) didn't
-- account for.

-- 1. Claiming a lead (blueprint §2.2 Etapa 1, step 3): "Um SDR reivindica o
-- lead". The original leads_update policy only allowed editing a lead the
-- caller already owns (owns_lead) — which makes claiming an unowned lead
-- impossible, since you can't satisfy "you own it" before the update that's
-- supposed to make you the owner. Now also allows an SDR to update an
-- unowned lead (owner_sdr_id is null), but only if the result of that
-- update makes them the owner (with check) — so a claim always succeeds in
-- assigning the claimer, never someone else.
drop policy leads_update on public.leads;

create policy leads_update on public.leads for update
  to authenticated using (
    public.owns_lead(id) or (owner_sdr_id is null and public.current_user_role() = 'sdr')
  )
  with check (
    public.owns_lead(id) or (owner_sdr_id = auth.uid() and public.current_user_role() = 'sdr')
  );

-- 2. Creating a deal (blueprint §2.2 Etapa 1, step 5): the SDR is the one
-- who books the meeting with a closer, so the SDR — not the closer — is
-- the one creating the deals row (with the closer just named on it). The
-- original deals_insert policy only allowed the assigned closer (or admin)
-- to insert, which blocks this. Now also allows the SDR who owns the
-- parent lead to create a deal for it, regardless of which closer gets
-- assigned.
drop policy deals_insert on public.deals;

create policy deals_insert on public.deals for insert
  to authenticated with check (
    public.is_admin()
    or closer_id = auth.uid()
    or (public.current_user_role() = 'sdr' and public.owns_lead(lead_id))
  );
