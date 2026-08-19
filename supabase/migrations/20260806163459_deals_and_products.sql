-- deals
--
-- Additive columns beyond the blueprint's literal list (all approved):
--   modelo — TCV vs MRR, present in real Monday data, needed for revenue
--     reporting parity with the existing dashboard.
--   raw_monday — passthrough for migration (see leads.raw_monday note).
-- motivo_perda is typed as an FK to lost_reasons (not free text) since that
-- table exists specifically to normalize loss reasons for both SDR and
-- Closer stages. lost_reasons is created later (migration
-- qualifications_lost_reasons), so the FK constraint itself is added there
-- via ALTER TABLE, not inline here — same for leads.motivo_perda_id.
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id),
  closer_id uuid references public.users (id),
  status public.deal_status not null default 'em_negociacao',
  valor_bruto numeric,
  valor_liquido numeric,
  modelo text check (modelo in ('TCV', 'MRR')),
  janela_fechamento text,
  motivo_perda uuid,
  data_agendamento date,
  data_fechamento date,
  criado_em timestamptz not null default now(),
  raw_monday jsonb
);

create index deals_lead_id_idx on public.deals (lead_id);
create index deals_closer_id_idx on public.deals (closer_id);
create index deals_status_idx on public.deals (status);
create index deals_data_fechamento_idx on public.deals (data_fechamento);

-- deal_products generalizes "main product" + cross-sell/upsell in one table,
-- each row with its own seller and value — this is what a "Subelementos"
-- (Monday subitem) maps to during migration, and what commissions.deal_product_id
-- hangs off of.
create table public.deal_products (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  produto text not null,
  vendedor_id uuid references public.users (id),
  valor_bruto numeric,
  valor_liquido numeric
);

create index deal_products_deal_id_idx on public.deal_products (deal_id);
