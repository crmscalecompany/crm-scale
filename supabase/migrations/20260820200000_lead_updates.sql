-- lead_updates: replaces the single leads.observacao text field (per
-- explicit user request) with an append-only history of dated notes, one
-- per author, each optionally carrying file attachments. leads.observacao
-- itself is left in place (not dropped) — safer than a destructive column
-- drop — but the app stops reading/writing it once this ships; every
-- existing non-empty value is backfilled below as that lead's first
-- history entry so nothing already written is lost.
create table public.lead_updates (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  autor_id uuid references public.users (id),
  texto text not null,
  criado_em timestamptz not null default now()
);

create index lead_updates_lead_id_idx on public.lead_updates (lead_id, criado_em desc);

create table public.lead_update_attachments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.lead_updates (id) on delete cascade,
  nome_arquivo text not null,
  storage_path text not null,
  tamanho_bytes bigint,
  criado_em timestamptz not null default now()
);

create index lead_update_attachments_update_id_idx on public.lead_update_attachments (update_id);

-- Same access model as lead_attribution (owns_lead: admin, or the SDR who
-- owns the lead) — one seam, not a new one, for who can see/add notes on a
-- lead. Append-only: no update policy, and delete is admin-only (fixing a
-- mistake), matching an activity log rather than an editable field.
alter table public.lead_updates enable row level security;

create policy lead_updates_select on public.lead_updates for select
  to authenticated using (public.owns_lead(lead_id));
create policy lead_updates_insert on public.lead_updates for insert
  to authenticated with check (public.owns_lead(lead_id));
create policy lead_updates_delete on public.lead_updates for delete
  to authenticated using (public.is_admin());

alter table public.lead_update_attachments enable row level security;

create policy lead_update_attachments_select on public.lead_update_attachments for select
  to authenticated using (
    exists (select 1 from public.lead_updates u where u.id = update_id and public.owns_lead(u.lead_id))
  );
create policy lead_update_attachments_insert on public.lead_update_attachments for insert
  to authenticated with check (
    exists (select 1 from public.lead_updates u where u.id = update_id and public.owns_lead(u.lead_id))
  );
create policy lead_update_attachments_delete on public.lead_update_attachments for delete
  to authenticated using (public.is_admin());

-- Private bucket (not public — files.get needs auth.getPublicUrl doesn't
-- apply; the app uses signed URLs instead, see lib/data/lead-updates.ts).
-- Object paths are "{lead_id}/{update_id}/{filename}" — the storage RLS
-- below parses lead_id back out of the path with owns_lead() the same way
-- every other table here does, rather than trusting the client.
insert into storage.buckets (id, name, public)
values ('lead-attachments', 'lead-attachments', false)
on conflict (id) do nothing;

create policy lead_attachments_select on storage.objects for select
  to authenticated using (
    bucket_id = 'lead-attachments' and public.owns_lead((storage.foldername(name))[1]::uuid)
  );
create policy lead_attachments_insert on storage.objects for insert
  to authenticated with check (
    bucket_id = 'lead-attachments' and public.owns_lead((storage.foldername(name))[1]::uuid)
  );
create policy lead_attachments_delete on storage.objects for delete
  to authenticated using (bucket_id = 'lead-attachments' and public.is_admin());

-- Backfill: every lead with a non-empty observacao becomes that lead's
-- first history entry, dated at the lead's own criado_em (or inserted_at
-- as a fallback for leads with no criado_em) rather than "now" — it's
-- historical, not a note written today. No autor_id — the original author
-- isn't recorded anywhere for pre-existing data.
insert into public.lead_updates (lead_id, texto, criado_em)
select id, observacao, coalesce(criado_em, inserted_at)
from public.leads
where observacao is not null and btrim(observacao) <> '';
