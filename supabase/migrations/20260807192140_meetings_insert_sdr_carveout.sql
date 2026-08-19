-- Same class of gap as the Week 2 kanban_rls_adjustments migration: "Marcar
-- reunião" now also creates a meetings row (Week 2.6, activating the
-- previously-dormant meetings table), but that insert is done by the SDR
-- (auth.uid()), while responsavel_id is set to the closer being booked —
-- the original meetings_insert policy (responsavel_id = auth.uid() or
-- admin) rejects that. owns_deal() already treats the parent lead's SDR as
-- a legitimate owner (broad "can view/act on" check, same one
-- meetings_select already uses) — extending insert to match.
drop policy meetings_insert on public.meetings;

create policy meetings_insert on public.meetings for insert
  to authenticated with check (
    public.is_admin()
    or responsavel_id = auth.uid()
    or (referencia_tipo = 'deal' and public.owns_deal(referencia_id))
  );
