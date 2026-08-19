-- meetings: generic across the SDR->Closer sales meeting and the AM's
-- follow-up meetings, so scheduling/reminder logic (Week 2+) isn't
-- duplicated. referencia_id is polymorphic (points at leads, deals, or
-- client_accounts depending on referencia_tipo) — no native FK is possible
-- across three tables, so integrity is enforced by a trigger instead (see
-- helper_functions migration: validate_meeting_target).
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  referencia_tipo public.meeting_referencia_tipo not null,
  referencia_id uuid not null,
  tipo public.meeting_tipo not null,
  responsavel_id uuid references public.users (id),
  google_event_id text,
  status public.meeting_status not null default 'marcada',
  recorrente boolean not null default false,
  cadencia text
);

create index meetings_referencia_idx on public.meetings (referencia_tipo, referencia_id);
create index meetings_responsavel_id_idx on public.meetings (responsavel_id);

-- whatsapp_groups / whatsapp_messages: schema exists for the Z-API
-- integration and in-CRM inbox (Phase 1.5) — group_jid/zapi_message_id are
-- unused placeholders in Week 1, nothing writes to these tables yet.
create table public.whatsapp_groups (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid references public.client_accounts (id),
  group_jid text,
  participantes jsonb,
  criado_em timestamptz not null default now()
);

create index whatsapp_groups_client_account_id_idx on public.whatsapp_groups (client_account_id);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id),
  client_account_id uuid references public.client_accounts (id),
  direcao public.whatsapp_direcao not null,
  remetente_id uuid references public.users (id),
  texto text,
  midia_url text,
  zapi_message_id text,
  criado_em timestamptz not null default now(),
  constraint whatsapp_messages_lead_xor_client check (
    (lead_id is not null) <> (client_account_id is not null)
  )
);

create index whatsapp_messages_lead_id_idx on public.whatsapp_messages (lead_id);
create index whatsapp_messages_client_account_id_idx on public.whatsapp_messages (client_account_id);
