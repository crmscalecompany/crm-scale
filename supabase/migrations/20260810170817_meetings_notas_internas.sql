-- Internal-only notes about the lead, captured by the SDR when booking a
-- meeting ("Marcar reunião") — never sent to Google Calendar's event
-- description, since the client is invited as an attendee on that event
-- and would see it. Visible only inside the CRM.
alter table meetings
  add column notas_internas text;
