-- automation_rules / automation_logs: the automation engine stores rules as
-- data (trigger event + condition + JSON action list), not scattered code —
-- this is what replaces Make/n8n. Week 1 only builds the schema and a
-- log-and-defer event emitter (see lib/automation/events.ts); no real
-- BullMQ/Upstash worker drains these logs yet.
create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  nome text,
  evento_gatilho text not null,
  condicao jsonb,
  acoes jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index automation_rules_evento_gatilho_idx on public.automation_rules (evento_gatilho) where ativo;

create table public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.automation_rules (id),
  entidade_ref uuid,
  status text not null check (status in ('pendente', 'sucesso', 'erro', 'pulado')),
  erro text,
  payload jsonb,
  executado_em timestamptz not null default now()
);

create index automation_logs_rule_id_idx on public.automation_logs (rule_id);
create index automation_logs_status_idx on public.automation_logs (status);
