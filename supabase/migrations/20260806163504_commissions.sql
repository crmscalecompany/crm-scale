-- commission_rules: exactly one of "role-level default" (papel) or
-- "person-specific override" (vendedor_id) applies per rule — never both,
-- never neither.
create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  papel public.user_role,
  vendedor_id uuid references public.users (id),
  percentual numeric not null,
  vigente_desde date not null,
  constraint commission_rules_papel_xor_vendedor check (
    (papel is not null) <> (vendedor_id is not null)
  )
);

create index commission_rules_vendedor_id_idx on public.commission_rules (vendedor_id);

-- commissions: one row per deal_product, computed from the value net of
-- deductions (deal_products.valor_liquido) using whichever commission_rules
-- row applies. Nothing populates this table automatically yet — no
-- commission_rules exist until the admin enters real percentages (see
-- blueprint §7, open decision), and Week 1 doesn't wire the calculation.
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  deal_product_id uuid not null references public.deal_products (id),
  regra_id uuid references public.commission_rules (id),
  valor_calculado numeric,
  status public.commission_status not null default 'pendente',
  calculado_em timestamptz not null default now()
);

create index commissions_deal_product_id_idx on public.commissions (deal_product_id);
