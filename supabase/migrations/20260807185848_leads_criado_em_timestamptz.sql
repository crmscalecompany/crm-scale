-- criado_em ("Data de Entrada") gains a time-of-day component so peak
-- lead-entry hours can be analyzed later — was `date`, becomes `timestamptz`.
-- Existing rows (all date-only, from the Monday migration) cast to midnight
-- UTC; new rows get a real timestamp going forward.
alter table leads
  alter column criado_em type timestamptz using criado_em::timestamptz;
