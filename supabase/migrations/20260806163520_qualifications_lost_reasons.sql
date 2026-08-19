-- lost_reasons: categoria distinguishes SDR-stage vs Closer-stage reasons
-- ('sdr' / 'closer') so one table serves both leads.motivo_perda_id and
-- deals.motivo_perda without duplicating the concept.
create table public.lost_reasons (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  descricao text not null,
  ativo boolean not null default true
);

-- Deferred FK constraints from earlier migrations — lost_reasons didn't
-- exist yet when leads/deals were created.
alter table public.leads
  add constraint leads_motivo_perda_id_fkey foreign key (motivo_perda_id) references public.lost_reasons (id);

alter table public.deals
  add constraint deals_motivo_perda_fkey foreign key (motivo_perda) references public.lost_reasons (id);

-- qualification_reasons: admin-editable without a deploy — codigo/descricao
-- for each etapa (sdr/closer), matching the blueprint's Annex 8 draft lists.
create table public.qualification_reasons (
  id uuid primary key default gen_random_uuid(),
  etapa public.qualification_etapa not null,
  codigo text not null,
  descricao text not null,
  ativo boolean not null default true
);

create index qualification_reasons_etapa_idx on public.qualification_reasons (etapa);

-- qualifications: generic across lead (SDR stage) and deal (Closer stage)
-- so both scores can be queried side by side without duplicating the table.
-- entidade_id is polymorphic — integrity enforced by a trigger (see
-- helper_functions migration: validate_qualification_target).
create table public.qualifications (
  id uuid primary key default gen_random_uuid(),
  entidade_tipo public.qualification_entidade_tipo not null,
  entidade_id uuid not null,
  etapa public.qualification_etapa not null,
  nota int not null check (nota between 1 and 5),
  motivo_id uuid references public.qualification_reasons (id),
  comentario text,
  qualificado_por uuid references public.users (id),
  criado_em timestamptz not null default now()
);

create index qualifications_entidade_idx on public.qualifications (entidade_tipo, entidade_id);
create index qualifications_qualificado_por_idx on public.qualifications (qualificado_por);
