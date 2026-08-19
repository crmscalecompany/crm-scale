import "server-only";
import { google } from "googleapis";
import { MEETING_DURATION_MINUTES } from "@/lib/google-calendar-link";

// A closer's own primary Google Calendar id is just their email address
// (standard Google behavior) — so no extra data is needed to know which
// calendar to query, only that the closer has shared it (free/busy is
// enough) with GOOGLE_SERVICE_ACCOUNT_EMAIL. That sharing is what grants
// access here — deliberately NOT using domain-wide delegation (`subject`)
// like the abandoned write-path attempt did: delegation impersonates users
// who haven't explicitly shared anything, which isn't needed (or wanted)
// for a calendar the closer already opted into sharing.
const SLOT_STARTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function toUtcDate(date: string, time: string): Date {
  // Fixed -03:00 offset — same America/Sao_Paulo assumption already made
  // elsewhere in this codebase (Brazil has had no DST since 2019).
  return new Date(`${date}T${time}:00-03:00`);
}

// Returns free "HH:mm" slot starts for `closerEmail` on `date`, or null if
// the lookup couldn't be done at all (calendar not shared yet, no email,
// API error) — callers treat null as "no suggestions," never as an error
// to surface, since sharing is an opt-in per-closer step that may not have
// happened yet.
export async function getFreeSlots(closerEmail: string | null, date: string): Promise<string[] | null> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!closerEmail || !clientEmail || !privateKey) return null;

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
    });
    const calendar = google.calendar({ version: "v3", auth });

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: toUtcDate(date, "09:00").toISOString(),
        timeMax: toUtcDate(date, "18:00").toISOString(),
        items: [{ id: closerEmail }],
      },
    });

    const busy = data.calendars?.[closerEmail]?.busy ?? [];
    if (data.calendars?.[closerEmail]?.errors?.length) return null;

    const now = new Date();

    return SLOT_STARTS.filter((slot) => {
      const slotStart = toUtcDate(date, slot);
      // No point suggesting a slot that's already passed — matters only
      // for today (a future date's slots are never <= now).
      if (slotStart <= now) return false;
      const slotEnd = new Date(slotStart.getTime() + MEETING_DURATION_MINUTES * 60_000);
      return !busy.some((period) => {
        if (!period.start || !period.end) return false;
        const busyStart = new Date(period.start);
        const busyEnd = new Date(period.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });
    });
  } catch (err) {
    console.error(`Falha ao consultar disponibilidade de ${closerEmail}:`, err);
    return null;
  }
}
