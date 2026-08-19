-- leads
--
-- Additive columns beyond the blueprint's literal list (all approved):
--   faturamento_medio_label — Monday has both a numeric and a text/label
--     version of "Faturamento Médio"; kept separately rather than lossily
--     collapsed into one.
--   motivo_perda_id — normalizes the SDR-side loss reason via lost_reasons
--     instead of free text.
--   criado_em (date) vs inserted_at (timestamptz) — criado_em is the
--     business entry date sourced from Monday's "Data Entrada"; inserted_at
--     is real row-insert bookkeeping. Conflating the two would break cohort
--     logic that keys off the business date.
--   monday_item_id / raw_monday — migration idempotency key + passthrough
--     for columns not cleanly mapped to a typed field (see migration script).
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  empresa text,
  cargo text,
  telefone text,
  whatsapp_txt text,
  email text,
  insta text,
  niche_id uuid references public.niches (id),
  origem text,
  direcao text,
  tipo text,
  faturamento_medio numeric,
  faturamento_medio_label text,
  qualificador text,
  observacao text,
  owner_sdr_id uuid references public.users (id),
  status public.lead_status not null default 'novo',
  motivo_perda_id uuid,
  criado_em date,
  inserted_at timestamptz not null default now(),
  monday_item_id bigint unique,
  raw_monday jsonb
);

create index leads_niche_id_idx on public.leads (niche_id);
create index leads_owner_sdr_id_idx on public.leads (owner_sdr_id);
create index leads_status_idx on public.leads (status);
create index leads_direcao_idx on public.leads (direcao);
create index leads_criado_em_idx on public.leads (criado_em);

-- lead_attribution: marketing attribution captured at lead creation
-- (Meta Ads campaign/publico/criativo/fbclid). One row per lead — kept as
-- its own table rather than columns on leads so a future re-attribution
-- event (rare, but possible) doesn't require overwriting the original.
create table public.lead_attribution (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  campanha text,
  publico text,
  criativo text,
  fbclid text,
  lead_id_ads text,
  capturado_em timestamptz not null default now()
);

create index lead_attribution_lead_id_idx on public.lead_attribution (lead_id);
create index lead_attribution_fbclid_idx on public.lead_attribution (fbclid);
