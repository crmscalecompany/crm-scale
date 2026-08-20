-- lead_attribution.evento: which specific live/event a lead signed up for
-- (e.g. "2026-08-31"), so Quadro Live (crm-workspace.tsx's ORIGEM_LIVE) can
-- filter/group leads by event date. Kept separate from utm_campaign — a
-- lead can carry both an ad-campaign UTM *and* a specific live date, and
-- the two answer different questions.
alter table public.lead_attribution
  add column evento text;

create index lead_attribution_evento_idx on public.lead_attribution (evento);
