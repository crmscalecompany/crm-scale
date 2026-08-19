-- Soft delete for leads ("Lixeira" — excluir + recuperar, lib/actions/
-- leads.ts). Nothing else cascades: deals/qualifications/meetings tied to
-- a deleted lead are left untouched, they just aren't in scope of this —
-- only lead-listing queries (lib/data/leads.ts's listLeads) filter
-- deleted_at is null. deleted_by is nullable/no-action-on-delete rather
-- than cascade, so a deleted user account doesn't wipe the audit trail.
alter table public.leads add column deleted_at timestamptz;
alter table public.leads add column deleted_by uuid references public.users (id);

create index leads_deleted_at_idx on public.leads (deleted_at) where deleted_at is not null;
