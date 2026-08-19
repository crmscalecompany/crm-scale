// Opens Google Calendar's own "create event" page pre-filled, instead of
// creating the event via API — a bare Service Account can't invite
// attendees at all (Google returns 403 "forbiddenForServiceAccounts"
// without Domain-Wide Delegation, which needs Google Workspace + an admin,
// and was still blocked even once configured). Letting the SDR open this
// link and hit Save in their own logged-in Google account has none of
// those restrictions — no credentials, no external dependency.
// Shared with lib/google-calendar-availability.ts, which needs the same
// duration to check whether a candidate slot is actually free.
export const MEETING_DURATION_MINUTES = 60;

function toGoogleDateFormat(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

export function buildGoogleCalendarEventUrl(params: {
  title: string;
  /** Client-visible event description — keep generic. Internal-only notes
   * (meetings.notas_internas) are never passed here. */
  description?: string;
  date: string; // "YYYY-MM-DD"
  horario: string; // "HH:mm"
  durationMinutes: number;
  attendeeEmails: string[];
}): string {
  // Brazil has had a fixed -03:00 offset since abolishing DST in 2019 —
  // same fixed-zone assumption already used elsewhere in this codebase
  // (see lib/format.ts's America/Sao_Paulo formatting).
  const start = new Date(`${params.date}T${params.horario}:00-03:00`);
  const end = new Date(start.getTime() + params.durationMinutes * 60_000);

  const url = new URL("https://calendar.google.com/calendar/u/0/r/eventedit");
  url.searchParams.set("text", params.title);
  url.searchParams.set("dates", `${toGoogleDateFormat(start)}/${toGoogleDateFormat(end)}`);
  if (params.description) url.searchParams.set("details", params.description);
  if (params.attendeeEmails.length > 0) url.searchParams.set("add", params.attendeeEmails.join(","));
  url.searchParams.set("vcon", "meet");
  url.searchParams.set("hl", "pt-BR");
  return url.toString();
}
