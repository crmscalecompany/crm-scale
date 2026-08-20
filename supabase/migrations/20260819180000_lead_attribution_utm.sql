-- lead_attribution: generic UTM columns alongside the existing Meta Ads
-- specific ones (campanha/publico/criativo/fbclid). Those four map to Meta's
-- own campaign/adset/ad/click-id concepts and don't cleanly fit a landing
-- page sending plain utm_source/utm_medium/utm_campaign (see the "live"
-- webhook, app/api/v1/webhooks/live/route.ts) — kept as separate nullable
-- columns rather than overloading campanha/publico for two different
-- taxonomies.
alter table public.lead_attribution
  add column utm_source text,
  add column utm_medium text,
  add column utm_campaign text;
