-- follow_up_attempts: shared cadence tracker for both the SDR stage (against
-- a lead) and the Closer stage (against a deal). Blueprint's "deal_id ou
-- lead_id" implemented as an XOR pair of nullable FKs rather than a single
-- polymorphic column, since there are only ever two possible targets here.
create table public.follow_up_attempts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id),
  deal_id uuid references public.deals (id),
  tentativa_num int not null,
  data_prevista date,
  feito_em timestamptz,
  resultado text,
  constraint follow_up_attempts_lead_xor_deal check (
    (lead_id is not null) <> (deal_id is not null)
  )
);

create index follow_up_attempts_lead_id_idx on public.follow_up_attempts (lead_id);
create index follow_up_attempts_deal_id_idx on public.follow_up_attempts (deal_id);

-- contracts: template_id/provider/doc_url are reserved for the ZapSign
-- integration (Phase 1.5+) — no real e-signature call happens in Week 1,
-- but the shape exists so contract.signed can be a real event later.
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id),
  template_id text,
  dados_preenchidos jsonb,
  status_assinatura public.contract_status_assinatura not null default 'pendente',
  provider text,
  doc_url text
);

create index contracts_deal_id_idx on public.contracts (deal_id);

-- client_accounts
--
-- Additive column beyond the blueprint's literal list (approved):
--   advogado_id — the blueprint names "Advogado responsável" as a role but
--   never gives it a column to attach to in section 3. Without this, RLS
--   has nothing to scope the advogado role's access against.
create table public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id),
  am_id uuid references public.users (id),
  advogado_id uuid references public.users (id),
  status text
);

create index client_accounts_deal_id_idx on public.client_accounts (deal_id);
create index client_accounts_am_id_idx on public.client_accounts (am_id);
create index client_accounts_advogado_id_idx on public.client_accounts (advogado_id);
