-- lead_attribution.lp: which specific landing page a lead came through
-- (e.g. "/scale-advogados") — a real Monday column ("LP", text_mm68ksv9)
-- that was never in the original migration's column map (MONDAY_COL) and
-- so was silently never fetched from Monday at all, not even into
-- raw_monday. Sparse (~1% of leads) but real attribution data.
alter table public.lead_attribution
  add column lp text;
