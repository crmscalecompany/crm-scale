-- RLS helper functions
--
-- All security definer + stable so they can be called from RLS policies
-- without recursive-RLS problems (a policy on `users` that queried `users`
-- directly through RLS would recurse). search_path is pinned to avoid the
-- classic security-definer search_path hijack.

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select papel from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.current_user_role() = 'admin';
$$;

-- owns_lead: used for both read and write access to a lead — admin, or the
-- SDR who owns it.
create or replace function public.owns_lead(p_lead_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.is_admin() or exists (
    select 1 from public.leads where id = p_lead_id and owner_sdr_id = auth.uid()
  );
$$;

-- owns_deal: broad "can view" check — admin, the assigned closer, or the
-- SDR whose lead originated the deal (SDRs need visibility into what
-- happened to leads they handed off, but not write access — write access is
-- enforced separately in the RLS policies via is_deal_closer(), not here).
create or replace function public.owns_deal(p_deal_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.is_admin() or exists (
    select 1
    from public.deals d
    left join public.leads l on l.id = d.lead_id
    where d.id = p_deal_id
      and (d.closer_id = auth.uid() or l.owner_sdr_id = auth.uid())
  );
$$;

-- is_deal_closer: narrow "can write" check for deals — admin or the
-- assigned closer only. Deliberately excludes the originating SDR (view
-- only), unlike owns_deal() above.
create or replace function public.is_deal_closer(p_deal_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.is_admin() or exists (
    select 1 from public.deals where id = p_deal_id and closer_id = auth.uid()
  );
$$;

-- owns_client_account: admin, the assigned AM, or the assigned advogado.
create or replace function public.owns_client_account(p_client_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.is_admin() or exists (
    select 1
    from public.client_accounts
    where id = p_client_account_id
      and (am_id = auth.uid() or advogado_id = auth.uid())
  );
$$;

-- Polymorphic reference integrity
--
-- qualifications.entidade_id and meetings.referencia_id can't carry a
-- native FK (they point at one of 2-3 different tables depending on the
-- discriminator column). These triggers are cheap insurance against silent
-- orphans — not spelled out in the blueprint's schema, but worth adding.

create or replace function public.validate_qualification_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.entidade_tipo = 'lead' then
    if not exists (select 1 from public.leads where id = new.entidade_id) then
      raise exception 'qualifications.entidade_id % does not reference an existing lead', new.entidade_id;
    end if;
  elsif new.entidade_tipo = 'deal' then
    if not exists (select 1 from public.deals where id = new.entidade_id) then
      raise exception 'qualifications.entidade_id % does not reference an existing deal', new.entidade_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger qualifications_validate_target
  before insert or update on public.qualifications
  for each row execute function public.validate_qualification_target();

create or replace function public.validate_meeting_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.referencia_tipo = 'lead' then
    if not exists (select 1 from public.leads where id = new.referencia_id) then
      raise exception 'meetings.referencia_id % does not reference an existing lead', new.referencia_id;
    end if;
  elsif new.referencia_tipo = 'deal' then
    if not exists (select 1 from public.deals where id = new.referencia_id) then
      raise exception 'meetings.referencia_id % does not reference an existing deal', new.referencia_id;
    end if;
  elsif new.referencia_tipo = 'client' then
    if not exists (select 1 from public.client_accounts where id = new.referencia_id) then
      raise exception 'meetings.referencia_id % does not reference an existing client_account', new.referencia_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger meetings_validate_target
  before insert or update on public.meetings
  for each row execute function public.validate_meeting_target();
