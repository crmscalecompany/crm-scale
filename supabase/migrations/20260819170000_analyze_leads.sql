-- Refreshes Postgres's planner statistics for `leads` — stale since the
-- Monday.com bulk migration (~7,400 rows inserted in one script run,
-- without an ANALYZE after). listLeads() now uses count="estimated"
-- (reads pg_class.reltuples) for the unbounded "Todos os períodos" query,
-- which was previously timing out under count="exact" against the whole
-- table; a stale reltuples made that estimate wildly wrong (observed: 1001
-- instead of ~7,400). ANALYZE only recomputes statistics — no data,
-- schema, or index changes — safe to run anytime, including here.
analyze public.leads;
