-- leads.email_opt_out: marketing-email opt-out for the "Avisar inscritos"
-- feature (Cases/Newsletter subscriber notifications — see
-- lib/actions/subscribers.ts). Global, not per-tipo: a lead is a person,
-- and one unsubscribe click should stop all marketing email to them, not
-- just the type they clicked from. Doesn't touch WhatsApp/CRM usage of the
-- record at all — only outbound marketing-email eligibility.
alter table public.leads add column email_opt_out boolean not null default false;

create index leads_tipo_subscribers_idx on public.leads (tipo) where email_opt_out = false and email is not null;
