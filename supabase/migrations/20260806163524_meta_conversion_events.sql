-- meta_conversion_events: tracks everything sent to the Meta Conversions API
-- (CAPI), keyed for future dedup against the browser pixel. Schema exists
-- per the blueprint; nothing writes to this table in Week 1 — sending real
-- conversion events is Phase 1.5 (see lib/adapters/meta-capi.ts stub).
create table public.meta_conversion_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id),
  deal_id uuid references public.deals (id),
  event_name public.meta_event_name not null,
  fbclid text,
  valor numeric,
  event_time timestamptz,
  enviado_em timestamptz,
  status public.meta_event_status not null default 'pendente',
  resposta_meta jsonb
);

create index meta_conversion_events_lead_id_idx on public.meta_conversion_events (lead_id);
create index meta_conversion_events_deal_id_idx on public.meta_conversion_events (deal_id);
create index meta_conversion_events_status_idx on public.meta_conversion_events (status);
